"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export function FlashMessage({ notice, error }: { notice?: string; error?: string }) {
  const message = notice || error;
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    setVisible(Boolean(message));
    if (!message) return;
    const timeout = window.setTimeout(() => setVisible(false), 4200);
    return () => window.clearTimeout(timeout);
  }, [message]);

  if (!message || !visible) return null;

  const isError = Boolean(error);
  const Icon = isError ? XCircle : CheckCircle2;

  return (
    <div className="fixed left-3 right-3 top-4 z-50 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="flex items-start gap-3">
        <span className={isError ? "text-rose-600" : "text-emerald-600"}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">{isError ? "Action failed" : "Done"}</p>
          <p className="mt-0.5 text-sm text-slate-600">{message}</p>
        </div>
      </div>
    </div>
  );
}
