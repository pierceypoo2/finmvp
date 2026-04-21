import { Suspense } from "react";
import ComingSoonClient from "./ComingSoonClient";

export default function ComingSoonPage() {
  return (
    <Suspense>
      <ComingSoonClient />
    </Suspense>
  );
}

