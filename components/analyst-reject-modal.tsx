"use client";

import { useEffect, useRef, useState } from "react";
import { rejectAnalystApplicationAction } from "@/lib/analyst-actions";
import { Button } from "@/components/ui/button";

export function AnalystRejectModal({ applicationId }: { applicationId: string }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} type="button">
        Reject
      </Button>

      <dialog
        className="w-[min(92vw,32rem)] rounded-2xl border border-white/10 bg-background p-0 text-ink shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop:bg-black/60"
        onClose={() => setOpen(false)}
        ref={dialogRef}
      >
        <form action={rejectAnalystApplicationAction} className="grid gap-4 p-5">
          <input name="application_id" type="hidden" value={applicationId} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Reject application
            </p>
            <h3 className="mt-2 text-lg font-semibold text-ink">Enter rejection reason</h3>
          </div>
          <textarea
            className="min-h-32 w-full rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            name="rejection_reason"
            placeholder="Explain why the application was rejected."
            required
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setOpen(false)} type="button" variant="secondary">
              Cancel
            </Button>
            <Button type="submit">Confirm reject</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
