import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Skeleton } from "@/components/ui/skeleton";

export default function ManualLoading() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <Skeleton className="mb-6 h-40 rounded-[1.6rem]" />
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)_220px]">
          <div className="hidden rounded-[1.35rem] border border-border/70 bg-card/80 p-4 lg:block">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="mt-6 h-4 w-40" />
            <Skeleton className="mt-4 h-9 w-full" />
            <Skeleton className="mt-2 h-9 w-10/12" />
          </div>
          <div className="rounded-[1.35rem] border border-border/70 bg-card/80 p-5 sm:p-6 lg:p-8">
            <Skeleton className="h-4 w-72" />
            <Skeleton className="mt-5 h-9 w-full max-w-xl" />
            <Skeleton className="mt-4 h-5 w-full max-w-2xl" />
            <Skeleton className="mt-8 h-36 w-full" />
          </div>
          <div className="hidden rounded-[1.35rem] border border-border/70 bg-card/80 p-4 lg:block">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-7 w-full" />
            <Skeleton className="mt-2 h-7 w-9/12" />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
