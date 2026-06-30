"use client";
import { useRef, useState } from "react";
import { Attachment } from "@/types";

interface Props {
  dealId: string;
  attachments: Attachment[];
  onUpload: (file: File, dealId: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentSection({ dealId, attachments, onUpload, onDelete }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setError("Maksimal ukuran file 20 MB."); return; }
    setError("");
    setUploading(true);
    try {
      await onUpload(file, dealId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal upload file.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="attachment-section">
      <div className="attachment-upload">
        <input ref={fileRef} type="file" style={{ display: "none" }} onChange={handleFile} />
        <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? "Mengupload…" : "+ Upload File"}
        </button>
        <span style={{ fontSize: 11, color: "var(--ink-soft)", marginLeft: 8 }}>Maks. 20 MB. PDF, Word, Excel, gambar.</span>
      </div>
      {error && <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 6 }}>{error}</div>}

      {!attachments.length ? (
        <div className="empty-state" style={{ padding: "16px 0" }}>Belum ada file terupload.</div>
      ) : (
        <div className="attachment-list">
          {attachments.map(a => (
            <div key={a.id} className="attachment-row">
              <div className="attachment-icon">📄</div>
              <div className="attachment-info">
                <a href={a.file_url} target="_blank" rel="noreferrer" className="attachment-name">{a.file_name}</a>
                <div className="attachment-meta">{fmtSize(a.file_size)}</div>
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => { if (confirm(`Hapus file "${a.file_name}"?`)) onDelete(a.id); }}
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
