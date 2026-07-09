import { Suspense } from "react";
import { FeaturesPageClient } from "../../../components/features/FeaturesPageClient";

export default function FeaturesPage() {
  return (
    <Suspense fallback={null}>
      <FeaturesPageClient />
    </Suspense>
  );
}
