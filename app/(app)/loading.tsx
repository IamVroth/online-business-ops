import { Card, CardContent, CardHeader } from "@/components/ui/card";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

export default function AppLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <SkeletonBlock className="h-8 w-48" />
          <SkeletonBlock className="h-4 w-72 max-w-full" />
        </div>
        <Card className="w-full lg:w-[520px]">
          <CardContent className="grid min-h-[92px] gap-3 p-4 sm:grid-cols-3">
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-10" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-4 md:gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-8 w-8" />
            </div>
            <SkeletonBlock className="mt-4 h-7 w-24" />
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <SkeletonBlock className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-10" />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <SkeletonBlock className="h-5 w-64 max-w-full" />
          </CardHeader>
          <CardContent>
            <SkeletonBlock className="h-[280px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <SkeletonBlock className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <SkeletonBlock className="h-[260px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <SkeletonBlock className="h-5 w-44" />
          </CardHeader>
          <CardContent>
            <SkeletonBlock className="h-[260px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
