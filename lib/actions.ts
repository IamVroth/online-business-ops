"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";

type UserRole = "admin" | "manager" | "staff" | "report_viewer";

const userRoles = new Set<UserRole>(["admin", "manager", "staff", "report_viewer"]);

async function requireUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (error || profile?.role !== "admin") throw new Error("Admin access required");
  return { supabase, user };
}

function parseUserRole(value: FormDataEntryValue | string | null): UserRole {
  const role = String(value || "staff") as UserRole;
  if (!userRoles.has(role)) throw new Error("Invalid role");
  return role;
}

function usersNotice(message: string): never {
  redirect(`/settings/users?notice=${encodeURIComponent(message)}`);
}

function usersError(message: string): never {
  redirect(`/settings/users?error=${encodeURIComponent(message)}`);
}

// ============ PRODUCTS ============
export async function createProduct(formData: FormData) {
  const { supabase, user } = await requireUser();
  const payload = {
    name: String(formData.get("name") || "").trim(),
    sku: (formData.get("sku") as string) || null,
    price: Number(formData.get("price") || 0),
    category: (formData.get("category") as string) || null,
    created_by: user.id,
  };
  if (!payload.name) throw new Error("Name is required");
  const { error } = await supabase.from("products").insert(payload);
  if (error) throw error;
  revalidatePath("/products");
}

export async function updateProduct(id: string, formData: FormData) {
  const { supabase } = await requireUser();
  const payload = {
    name: String(formData.get("name") || "").trim(),
    sku: (formData.get("sku") as string) || null,
    price: Number(formData.get("price") || 0),
    category: (formData.get("category") as string) || null,
    active: formData.get("active") === "on",
  };
  const { error } = await supabase.from("products").update(payload).eq("id", id);
  if (error) throw error;
  revalidatePath("/products");
}

export async function deleteProduct(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/products");
}

// ============ SALES ============
export async function createSale(input: {
  sale_date: string;
  customer_name?: string;
  channel?: string;
  discount?: number;
  payment_status?: string;
  note?: string;
  items: { product_id?: string | null; product_name: string; qty: number; unit_price: number }[];
}) {
  const { supabase, user } = await requireUser();
  const subtotal = input.items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const total = Math.max(0, subtotal - (input.discount || 0));

  const { data: sale, error } = await supabase
    .from("sales")
    .insert({
      sale_date: input.sale_date,
      customer_name: input.customer_name || null,
      channel: input.channel || null,
      discount: input.discount || 0,
      total,
      payment_status: input.payment_status || "paid",
      note: input.note || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !sale) throw error || new Error("Failed to create sale");

  const items = input.items.map((i) => ({
    sale_id: sale.id,
    product_id: i.product_id || null,
    product_name: i.product_name,
    qty: i.qty,
    unit_price: i.unit_price,
    subtotal: i.qty * i.unit_price,
  }));
  const { error: e2 } = await supabase.from("sale_items").insert(items);
  if (e2) throw e2;

  revalidatePath("/sales");
  revalidatePath("/");
  return sale.id;
}

export async function deleteSale(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("sales").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/sales");
}

// ============ EXPENSES ============
export async function createExpense(formData: FormData) {
  const { supabase, user } = await requireUser();
  const receiptFile = formData.get("receipt") as File | null;
  let receipt_url: string | null = null;

  if (receiptFile && receiptFile.size > 0) {
    const path = `${user.id}/${Date.now()}-${receiptFile.name}`;
    const { error: upErr } = await supabase.storage.from("receipts").upload(path, receiptFile);
    if (upErr) throw upErr;
    receipt_url = path;
  }

  const payload = {
    expense_date: String(formData.get("expense_date") || new Date().toISOString().slice(0, 10)),
    category_id: (formData.get("category_id") as string) || null,
    vendor: (formData.get("vendor") as string) || null,
    amount: Number(formData.get("amount") || 0),
    note: (formData.get("note") as string) || null,
    is_recurring: formData.get("is_recurring") === "on",
    receipt_url,
    created_by: user.id,
  };
  const { error } = await supabase.from("expenses").insert(payload);
  if (error) throw error;
  revalidatePath("/expenses");
  revalidatePath("/");
}

export async function deleteExpense(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/expenses");
}

// ============ FB INSIGHTS ============
export async function bulkInsertFbInsights(rows: {
  campaign_name?: string;
  date: string;
  date_end?: string;
  spend?: number;
  reach?: number;
  impressions?: number;
  clicks?: number;
  leads?: number;
}[]) {
  const { supabase, user } = await requireUser();
  const clean = rows
    .filter((r) => r.date)
    .map((r) => ({
      campaign_name: r.campaign_name || null,
      date: r.date,
      date_end: r.date_end || null,
      spend: Number(r.spend || 0),
      reach: Number(r.reach || 0),
      impressions: Number(r.impressions || 0),
      clicks: Number(r.clicks || 0),
      leads: Number(r.leads || 0),
      source: "manual" as const,
      created_by: user.id,
    }));
  if (clean.length === 0) return 0;
  const { error } = await supabase.from("fb_ad_insights").insert(clean);
  if (error) throw error;
  revalidatePath("/facebook");
  revalidatePath("/");
  return clean.length;
}

export async function bulkInsertFbContentMetrics(rows: {
  page_name?: string;
  content_title?: string;
  content_url?: string;
  content_type?: string;
  date: string;
  reach?: number | string;
  impressions?: number | string;
  engagements?: number | string;
  reactions?: number | string;
  comments?: number | string;
  shares?: number | string;
  clicks?: number | string;
  video_views?: number | string;
}[]) {
  const { supabase, user } = await requireUser();
  const toNumber = (value: number | string | undefined) => {
    if (typeof value === "number") return value;
    return Number(String(value || "0").replace(/[$,%\s,]/g, "")) || 0;
  };
  const isISODate = (value: string | undefined) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

  const clean = rows
    .filter((r) => isISODate(r.date) && r.page_name)
    .map((r) => ({
      page_name: String(r.page_name || "").trim(),
      content_title: r.content_title ? String(r.content_title).trim() : null,
      content_url: r.content_url ? String(r.content_url).trim() : null,
      content_type: r.content_type ? String(r.content_type).trim() : null,
      date: r.date,
      reach: toNumber(r.reach),
      impressions: toNumber(r.impressions),
      engagements: toNumber(r.engagements),
      reactions: toNumber(r.reactions),
      comments: toNumber(r.comments),
      shares: toNumber(r.shares),
      clicks: toNumber(r.clicks),
      video_views: toNumber(r.video_views),
      source: "manual" as const,
      created_by: user.id,
    }));
  if (clean.length === 0) return 0;
  const { error } = await supabase.from("fb_page_content_metrics").insert(clean);
  if (error) throw error;
  revalidatePath("/facebook");
  revalidatePath("/");
  return clean.length;
}

// ============ ADMIN USERS ============
export async function createUserByAdmin(formData: FormData) {
  const { supabase } = await requireAdmin();
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = parseUserRole(formData.get("role"));

  if (!email) usersError("Email is required.");
  if (password.length < 6) usersError("Password must be at least 6 characters.");

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || email },
  });
  if (error) usersError(error.message);
  if (!data.user) usersError("Failed to create user.");

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: data.user.id,
    full_name: fullName || email,
    role,
    active: true,
  });
  if (profileError) usersError(profileError.message);

  revalidatePath("/settings/users");
  usersNotice("User created successfully.");
}

export async function updateUserRole(userId: string, role: UserRole, active: boolean) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("profiles").update({ role, active }).eq("id", userId);
  if (error) usersError(error.message);
  revalidatePath("/settings/users");
  usersNotice(active ? "User role updated." : "User status updated.");
}

export async function resetUserPassword(userId: string, formData: FormData) {
  await requireAdmin();
  const password = String(formData.get("password") || "");
  if (password.length < 6) usersError("Password must be at least 6 characters.");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) usersError(error.message);
  revalidatePath("/settings/users");
  usersNotice("Password reset successfully.");
}

// ============ CATEGORIES ============
export async function createExpenseCategory(formData: FormData) {
  const { supabase } = await requireUser();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name required");
  const { error } = await supabase.from("expense_categories").insert({ name });
  if (error) throw error;
  revalidatePath("/settings/categories");
}

export async function deleteExpenseCategory(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("expense_categories").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/settings/categories");
}
