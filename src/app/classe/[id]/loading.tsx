import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { ClasseDetailSkeleton } from "@/components/skeletons/classe-detail.skeleton";

export default function Loading() {
  return (
    <>
      <Navbar />
      <ClasseDetailSkeleton />
      <Footer />
    </>
  );
}
