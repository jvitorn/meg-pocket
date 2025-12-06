import { Suspense } from "react";
import { LoadingSpinner } from "@/components/loadingSpinner";
import ClasseClient from "@/components/classe/classeClient";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

type Props = { params: { id: string } };

export default function ClassePage({ params }: Props) {
  return (
    <>
      <Navbar />
      <Suspense fallback={<LoadingSpinner />}>
       <ClasseClient />
      </Suspense>

      <Footer />
    </>
  );
}
