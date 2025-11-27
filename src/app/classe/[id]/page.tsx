import { Suspense } from "react";
import { LoadingSpinner } from "@/components/loadingSpinner";
import ClasseClient from "@/components/classe/classeClient";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function ClassePage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<LoadingSpinner />}>
        <ClasseClient
          params={{
            id: "",
          }}
        />
      </Suspense>

      <Footer />
    </>
  );
}
