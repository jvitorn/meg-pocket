import { Suspense } from "react";
import ClasseClient from "@/components/classe/classeClient";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ClasseDetailSkeleton } from "@/components/skeletons/classe-detail.skeleton";

export default function ClassePage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<ClasseDetailSkeleton />}>
       <ClasseClient />
      </Suspense>

      <Footer />
    </>
  );
}
