import { Skeleton } from "./ui/skeleton";

export function DashboardLayoutSkeleton() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="relative hidden w-[232px] shrink-0 border-r border-border/50 bg-sidebar p-2 md:block">
        <div className="flex h-12 items-center gap-2 border-b border-border/40 px-1">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="space-y-4 py-3">
          {[0, 1, 2].map(section => (
            <div key={section} className="space-y-1">
              <Skeleton className="ml-2 h-3 w-14" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <div className="absolute bottom-2 left-2 right-2 space-y-2 border-t border-border/40 pt-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <div className="flex items-center gap-2 p-1.5">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2 w-12" />
            </div>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-14 items-center justify-between border-b border-border/50 px-3 sm:px-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="hidden h-2 w-20 lg:block" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="hidden h-9 w-28 rounded-lg md:block" />
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-5 lg:p-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </main>
      </div>
    </div>
  );
}
