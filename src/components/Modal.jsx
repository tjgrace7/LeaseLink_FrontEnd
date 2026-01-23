import { Key } from "lucide-react"
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

export const ShowModal = ({ OnClose, selectedSource }) => {
  console.log(selectedSource)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4">
      <div className="relative w-full max-w-6xl h-[90vh] my-6 sm:my-10 overflow-hidden rounded-2xl bg-white text-black shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6 flex-none">
          <h2 className="text-base sm:text-lg font-semibold truncate pr-4">
            Document Excerpt
          </h2>
          <button
            className="flex-none rounded-md p-1 text-2xl leading-none text-gray-500 hover:text-black hover:bg-gray-100"
            onClick={OnClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedSource.highlight_text && (
            <div className="px-4 py-3 sm:px-6 sm:py-4 overflow-y-auto max-h-[25%]">
              <p className="whitespace-pre-wrap text-sm sm:text-base text-gray-800 break-words">
                {selectedSource.highlight_text}
              </p>
            </div>
          )}
          <div className="flex-1 px-4 sm:px-6 pb-4">
            <div className="w-full h-full overflow-hidden rounded-md border">
              <iframe
                src={selectedSource.viewer_url}
                title="Document Viewer"
                className="w-full h-full"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const EmailModal = ({ Email, OnClose }) => {
  console.log("Email", Email)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4">
      <div className="relative w-full max-w-6xl h-[90vh] my-6 sm:my-10 overflow-hidden rounded-2xl bg-white text-black shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6 flex-none">
          <h2 className="text-base sm:text-lg font-semibold truncate pr-4">
            Document Excerpt
          </h2>
          <button
            className="flex-none rounded-md p-1 text-2xl leading-none text-gray-500 hover:text-black hover:bg-gray-100"
            onClick={OnClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-3 sm:px-6 sm:py-4 overflow-y-auto max-h-[25%]">
            <h2>Sender:</h2>
            <p className="whitespace-pre-wrap text-sm sm:text-base text-gray-800 break-words">
              {Email.Sender_Name}
            </p>
          </div>
          <div className="px-4 py-3 sm:px-6 sm:py-4 overflow-y-auto max-h-[25%]">
            <h2>Subject:</h2>
            <p className="whitespace-pre-wrap text-sm sm:text-base text-gray-800 break-words">
              {Email.subject}
            </p>
          </div>

          <div className="px-4 py-3 sm:px-6 sm:py-4 overflow-y-auto max-h-[25%]">
            <h2>Body:</h2>
            <p className="whitespace-pre-wrap text-sm sm:text-base text-gray-800 break-words">
              {Email.body}
            </p>
          </div>

          <div className="flex-1 px-4 sm:px-6 pb-4">
          </div>
        </div>
      </div>
    </div>
  )
}
export const ExtractionModal = ({
  label,
  aiConfidence,
  aiReason,
  aiFuture,
  aiValue,
  requiresReview,
  signedUrl,
  onClose,
  onSave, // (finalValue, meta) => void
  tenant_id,
}) => {
  const initialAiValue = useMemo(() => aiValue ?? "", [aiValue]);

  const isEmptyAI = useMemo(() => {
    return aiValue == null || String(aiValue).trim() === "" || aiValue === "Null";
  }, [aiValue]);

  const [draftValue, setDraftValue] = useState(initialAiValue);
  const [decision, setDecision] = useState(null); // "approve" | "edit" | "create" | null

  const [leases, setLeases] = useState([]);
  const [selectedLease, setSelectedLease] = useState(null);

  // reset when field changes
  useEffect(() => {
    setDraftValue(aiValue ?? "");
    setSelectedLease(null);

    if (isEmptyAI) setDecision("create");
    else setDecision(null);
  }, [aiValue, label, isEmptyAI]);

  // fetch leases only when we enter "create"
  useEffect(() => {
    if (decision !== "create") return;

    let cancelled = false;

    const loadLeases = async () => {
      const lease_res = await supabase
        .from("lease_documents")
        .select("*")
        .eq("tenant_id", tenant_id);

      if (!cancelled) {
        setLeases(lease_res.data ?? []);
      }
    };

    loadLeases();

    return () => {
      cancelled = true;
    };
  }, [decision, tenant_id]);

  const hasChangedFromAI = useMemo(() => {
    return (draftValue ?? "").trim() !== (initialAiValue ?? "").trim();
  }, [draftValue, initialAiValue]);

  const canSave = useMemo(() => {
    if (requiresReview && !decision) return false;
    if (decision === "create" && (draftValue ?? "").trim() === "") return false;

    // if they are creating (AI was empty) and there's no PDF signedUrl,
    // require a lease selection so you can store a source_doc
    if (decision === "create" && !signedUrl && !selectedLease?.lease_file_path) return false;

    return decision === "approve" || decision === "edit" || decision === "create";
  }, [decision, requiresReview, draftValue, signedUrl, selectedLease]);

  const handleDraftChange = (e) => {
    const next = e.target.value;
    setDraftValue(next);

    if (!isEmptyAI) setDecision("edit");
    // if isEmptyAI, keep decision as "create"
  };

  const handleSaveWithValue = (value, forcedMeta) => {
    const finalValue = (value ?? "").trim();

    const inferredDecision =
      forcedMeta?.decision ?? (isEmptyAI ? "create" : (decision ?? "edit"));

    const meta = {
      decision: inferredDecision,
      approved_ai: requiresReview ? inferredDecision === "approve" : false,
      source_doc: selectedLease?.lease_file_path ?? null,
      selected_lease_id: selectedLease?.lease_id ?? selectedLease?.id ?? null,
      ...(forcedMeta ?? {}),
    };

    onSave?.(finalValue, meta);
  };

  const handleSave = (forcedMeta) => {
    handleSaveWithValue(draftValue, forcedMeta);
  };

  const handleApproveAI = () => {
    setDraftValue(initialAiValue);
    setDecision("approve");

    // save using the actual approved value (not stale draftValue)
    handleSaveWithValue(initialAiValue, { decision: "approve", approved_ai: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4">
      <div className="relative w-full max-w-6xl h-[90vh] my-6 sm:my-10 overflow-hidden rounded-2xl bg-white text-black shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6 flex-none">
          <h2 className="text-base sm:text-lg font-semibold truncate pr-4">
            {label}
          </h2>
          <button
            className="flex-none rounded-md p-1 text-2xl leading-none text-gray-500 hover:text-black hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close modal"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Body — single scroll container */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 sm:px-6 sm:py-4 space-y-4">
            <div className="space-y-3">
              {/* Value */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="underline text-md">Extracted Term</h3>

                  {requiresReview && (
                    <div className="flex items-center gap-2">
                      {initialAiValue.trim() !== "" && (
                        <button
                          type="button"
                          onClick={handleApproveAI}
                          className={`text-xs rounded-md px-2 py-1 border hover:bg-gray-50 ${
                            decision === "approve" ? "border-black" : "border-gray-300"
                          }`}
                        >
                          Approve AI value
                        </button>
                      )}
                      <span className="text-xs text-gray-500">
                        {decision
                          ? decision === "approve"
                            ? "Approved"
                            : decision === "create"
                              ? "Creating"
                              : "Edited"
                          : "Choose approve or edit"}
                      </span>
                    </div>
                  )}
                </div>

                <textarea
                  value={draftValue}
                  onChange={handleDraftChange}
                  rows={2}
                  className={`w-full rounded-md border px-3 py-2 text-sm sm:text-base outline-none focus:ring-2 focus:ring-ring ${
                    requiresReview && !decision ? "bg-red-500 text-white" : "bg-gray-500 text-white"
                  }`}
                  placeholder="Enter value..."
                />

                {requiresReview && !decision && (
                  <div className="text-xs text-red-600">
                    This field requires review — approve the AI value or edit it before saving.
                  </div>
                )}

                {requiresReview && decision === "edit" && !hasChangedFromAI && (
                  <div className="text-xs text-gray-600">
                    You selected “edit” but the value is still the same as AI. That’s okay — you can still save.
                  </div>
                )}
              </div>

              {/* Future */}
              {aiFuture && aiFuture !== "Null" && (
                <div>
                  <h3 className="underline text-md">Future Values</h3>
                  <p className="whitespace-pre-wrap text-sm sm:text-base text-gray-800 break-words">
                    {aiFuture}
                  </p>
                </div>
              )}

              {/* Confidence */}
              <div>
                <h3 className="underline text-md">AI Confidence Score</h3>
                <p className="text-sm sm:text-base text-gray-800 break-words">
                  {typeof aiConfidence === "number"
                    ? `${Math.round(aiConfidence * 100)}%`
                    : "—"}
                </p>
              </div>

              {/* Reason */}
              <div>
                <h3 className="underline text-md">AI Justification</h3>
                <p className="whitespace-pre-wrap text-sm sm:text-base text-gray-800 break-words">
                  {aiReason || "—"}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={!canSave}
                  className="rounded-md px-3 py-2 text-sm text-white bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>

            {/* PDF Viewer */}
            {signedUrl != null && (
              <div className="rounded-md border overflow-hidden">
                <iframe
                  src={signedUrl}
                  title="Document Viewer"
                  className="w-full h-[70vh]"
                  loading="lazy"
                />
              </div>
            )}

            {/* Lease selector when there is no PDF and we're creating */}
            {signedUrl == null && decision === "create" && (
              <div className="space-y-2">
                <h2 className="font-semibold">
                  Select document where this value came from (or is impacted)
                </h2>

                {!selectedLease?.lease_file_path && (
                  <div className="text-xs text-amber-700">
                    Required: pick a source document before saving.
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {leases.map((lease) => {
                    const filename = (lease.lease_file_path ?? "").split("/").pop();
                    const shortPath = filename ? `/${filename}` : "(unknown file)";

                    const isSelected =
                      selectedLease?.lease_file_path === lease.lease_file_path;

                    return (
                      <button
                        key={lease.id ?? lease.lease_id ?? lease.lease_file_path}
                        type="button"
                        onClick={() => setSelectedLease(lease)}
                        className={`rounded-md px-3 py-2 text-sm border ${
                          isSelected
                            ? "bg-black text-white border-black"
                            : "bg-white text-black border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {shortPath}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};