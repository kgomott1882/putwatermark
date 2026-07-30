"use client";

import { Plus, Trash2 } from "lucide-react";
import type { PdfFillTextField } from "../../src/lib/pdfPageFillFields";

type FillDocumentControlsProps = {
  activeFieldId: string | null;
  fields: PdfFillTextField[];
  onAddField: () => void;
  onFieldSelect: (fieldId: string) => void;
  onRemoveField: (fieldId: string) => void;
  onUpdateField: (
    fieldId: string,
    patch: Partial<Pick<PdfFillTextField, "fontSize" | "text">>,
  ) => void;
  pdfPageLabel: string | null;
};

export function FillDocumentControls({
  activeFieldId,
  fields,
  onAddField,
  onFieldSelect,
  onRemoveField,
  onUpdateField,
  pdfPageLabel,
}: FillDocumentControlsProps) {
  const activeField =
    fields.find((field) => field.id === activeFieldId) ?? fields[0] ?? null;

  return (
    <div className="space-y-2">
      {pdfPageLabel ? (
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ed-fg">
          {pdfPageLabel}
        </p>
      ) : null}

      <button
        className="editor-secondary-button inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-ed-fg hover:border-signal/50"
        onClick={onAddField}
        type="button"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        Add text field
      </button>

      {fields.length ? (
        <div className="space-y-1.5">
          {fields.map((field, index) => {
            const isActive = field.id === activeField?.id;

            return (
              <div
                className={`flex items-center gap-1 rounded-xl border px-1 py-1 transition shadow-sm ${
                  isActive
                    ? "border-2 border-signal bg-signal/10 ring-2 ring-signal/25"
                    : "editor-secondary-button border-ed-border bg-ed-bg hover:border-signal/40"
                }`}
                key={field.id}
              >
                <button
                  className="min-w-0 flex-1 truncate px-2 text-left text-[11px] font-semibold text-ed-fg-muted"
                  onClick={() => onFieldSelect(field.id)}
                  type="button"
                >
                  Field {index + 1}
                  {field.text.trim() ? `: ${field.text.trim()}` : ""}
                </button>
                <button
                  aria-label={`Remove field ${index + 1}`}
                  className="rounded-md p-1 text-ed-fg-muted transition hover:bg-ed-fg/5 hover:text-signal"
                  onClick={() => onRemoveField(field.id)}
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] leading-4 text-ed-fg-muted/80">
          Add a text field, then drag and resize it on the page preview.
        </p>
      )}

      {activeField ? (
        <div className="space-y-2 rounded-xl border border-ed-border bg-ed-bg-card px-3 py-3">
          <label
            className="block text-[10px] font-bold uppercase tracking-[0.12em] text-ed-fg"
            htmlFor="fill-field-text"
          >
            Text
          </label>
          <textarea
            className="editor-field min-h-[4.5rem] py-2 text-sm"
            id="fill-field-text"
            onChange={(event) =>
              onUpdateField(activeField.id, { text: event.target.value })
            }
            placeholder="Enter text for this field"
            value={activeField.text}
          />

          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ed-fg">
                Size
              </span>
              <span className="text-[11px] font-semibold tabular-nums text-ed-fg">
                {activeField.fontSize}px
              </span>
            </div>
            <input
              className="mt-0.5 h-1 w-full cursor-pointer appearance-none rounded-full bg-ed-bg-card accent-signal"
              max={48}
              min={10}
              onChange={(event) =>
                onUpdateField(activeField.id, {
                  fontSize: Number(event.target.value),
                })
              }
              step={1}
              type="range"
              value={activeField.fontSize}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
