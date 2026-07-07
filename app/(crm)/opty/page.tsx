"use client";
import { useCRMData } from "@/contexts/CRMDataContext";
import Opty from "@/components/Opty";

// First view fully migrated off LegacyViewSwitch (Phase 1 of the route
// migration) — no deep-link props, so no useSearchParams/Suspense needed.
export default function OptyPage() {
  const {
    data, currentProfile, isViewer, ro,
    upsertDeal, deleteDeal,
    upsertDocument, deleteDocument,
    uploadAttachment, deleteAttachment,
    upsertActivity, deleteActivity,
  } = useCRMData();

  return (
    <Opty
      data={data} currentUserName={currentProfile?.name ?? ""} isViewer={isViewer}
      onSaveDeal={ro(upsertDeal)} onDeleteDeal={ro(deleteDeal)}
      onAddDocument={ro(upsertDocument)} onDeleteDocument={ro(deleteDocument)}
      onUploadAttachment={ro(uploadAttachment)} onDeleteAttachment={ro(deleteAttachment)}
      onAddActivity={ro(upsertActivity)} onDeleteActivity={ro(deleteActivity)}
    />
  );
}
