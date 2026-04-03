import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { DashboardSkeleton } from "@/components/skeletons/dashboard.skeleton";

export default function Loading() {
  return (
    <>
      <Navbar />
      <DashboardSkeleton />
      <Footer />
    </>
  );
}
