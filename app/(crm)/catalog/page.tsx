"use client";
import { useCRMData } from "@/contexts/CRMDataContext";
import ProductsView from "@/components/ProductsView";

// Fully migrated off LegacyViewSwitch (Phase 1 of the route migration) — no
// deep-link props, so no useSearchParams/Suspense needed.
export default function CatalogPage() {
  const { data, isViewer, ro, upsertProduct, deleteProduct } = useCRMData();
  return (
    <ProductsView data={data} isViewer={isViewer} onSaveProduct={ro(upsertProduct)} onDeleteProduct={ro(deleteProduct)} />
  );
}
