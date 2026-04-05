import { Suspense } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { RacaDetailSkeleton } from "@/components/skeletons/raca-detail.skeleton";
import RacaClient from "@/components/raca/racaClient";

export default function RacaPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<RacaDetailSkeleton />}>
        <RacaClient />
      </Suspense>
      <Footer />
    </>
  );
}

