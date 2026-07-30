"use client";

import { motion } from "framer-motion";
import { GripVertical, MousePointerClick, PenLine, Type, X } from "lucide-react";
import {
  type DragEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  createSignatureId,
  loadImageFromCanvas,
  renderTypedSignatureCanvas,
  SIGNATURE_DRAG_MIME,
  SIGNATURE_SCRIPT_FONT,
  trimCanvasToContent,
} from "../../src/lib/signatureImage";
import {
  FULL_SIGNATURE_TYPED_MAX_LENGTH,
  INITIALS_MAX_LENGTH,
  validateSignatureManifestEntry,
  type SignatureKind,
} from "../../src/lib/signatureValidation";
import {
  EditorCard,
  EditorPill,
  EditorSegment,
} from "./EditorToolPanel";

export type SavedSignature = {
  id: string;
  image: HTMLImageElement;
  kind: SignatureKind;
  label: string;
  previewSrc: string;
  source: "draw" | "type";
  typedText?: string | null;
};

type SignatureInputMode = "draw" | "type";

type SignaturePlacement = {
  xPercent: number;
  yPercent: number;
};

type SignatureControlsProps = {
  activeSignatureId: string | null;
  hasDocument: boolean;
  hasSignatureOnPage?: boolean;
  onActiveSignatureChange: (signature: SavedSignature | null) => void;
  onPlaceSignature: (
    signature: SavedSignature,
    position?: SignaturePlacement,
  ) => void;
  onRemoveFromPage?: () => void;
  onSignaturesChange: (signatures: SavedSignature[]) => void;
  pdfPageLabel?: string | null;
  savedSignatures: SavedSignature[];
};

const padWidth = 360;
const padHeight = 120;
const signaturePadBackground = "#faf6f0";
const defaultPlacement: SignaturePlacement = {
  xPercent: 0.72,
  yPercent: 0.84,
};

export function SignatureControls({
  activeSignatureId,
  hasDocument,
  hasSignatureOnPage = false,
  onActiveSignatureChange,
  onPlaceSignature,
  onRemoveFromPage,
  onSignaturesChange,
  pdfPageLabel = null,
  savedSignatures,
}: SignatureControlsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [addingKind, setAddingKind] = useState<SignatureKind | null>(null);
  const [inputMode, setInputMode] = useState<SignatureInputMode>("draw");
  const [typedName, setTypedName] = useState("");
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signatureError, setSignatureError] = useState("");

  const resetPad = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setSignatureError("");
  }, []);

  const setupDrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    canvas.width = padWidth;
    canvas.height = padHeight;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#000000";
    context.lineWidth = 2.75;
    setHasDrawn(false);
  }, []);

  useEffect(() => {
    if (!addingKind || addingKind !== "full" || inputMode !== "draw") {
      return;
    }

    setupDrawCanvas();
  }, [addingKind, inputMode, setupDrawCanvas]);

  function getCanvasPoint(
    event: PointerEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement,
  ) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function handleDrawPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    event.preventDefault();
    isDrawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    lastPointRef.current = getCanvasPoint(event, canvas);
  }

  function handleDrawPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const lastPoint = lastPointRef.current;

    if (!canvas || !context || !lastPoint) {
      return;
    }

    event.preventDefault();
    const point = getCanvasPoint(event, canvas);

    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    lastPointRef.current = point;
    setHasDrawn(true);
  }

  function handleDrawPointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) {
      return;
    }

    event.preventDefault();
    isDrawingRef.current = false;
    lastPointRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleSignatureDragStart(
    event: DragEvent<HTMLButtonElement>,
    signature: SavedSignature,
  ) {
    event.dataTransfer.setData(SIGNATURE_DRAG_MIME, signature.id);
    event.dataTransfer.effectAllowed = "copy";

    const preview = event.currentTarget.querySelector("img");

    if (preview instanceof HTMLImageElement) {
      event.dataTransfer.setDragImage(preview, preview.width / 2, preview.height / 2);
    }
  }

  async function saveSignature() {
    if (!addingKind) {
      return;
    }

    setSignatureError("");

    let signatureCanvas: HTMLCanvasElement | null = null;
    let label = "";
    let source: SignatureInputMode = inputMode;
    let typedText: string | null = null;

    if (addingKind === "initials") {
      const trimmedInitials = typedName.trim();

      if (!trimmedInitials) {
        setSignatureError("Type your initials before saving.");
        return;
      }

      if (trimmedInitials.length > INITIALS_MAX_LENGTH) {
        setSignatureError(`Initials must be ${INITIALS_MAX_LENGTH} characters or fewer.`);
        return;
      }

      signatureCanvas = renderTypedSignatureCanvas(
        trimmedInitials,
        SIGNATURE_SCRIPT_FONT,
      );
      label = trimmedInitials;
      source = "type";
      typedText = trimmedInitials;
    } else if (inputMode === "draw") {
      const canvas = canvasRef.current;

      if (!canvas || !hasDrawn) {
        setSignatureError("Draw your signature before saving.");
        return;
      }

      signatureCanvas = trimCanvasToContent(canvas);
      label = `Signature ${savedSignatures.filter((entry) => entry.kind === "full").length + 1}`;
      source = "draw";
    } else {
      const trimmedName = typedName.trim();

      if (!trimmedName) {
        setSignatureError("Type your signature before saving.");
        return;
      }

      if (trimmedName.length > FULL_SIGNATURE_TYPED_MAX_LENGTH) {
        setSignatureError(
          `Signature text must be ${FULL_SIGNATURE_TYPED_MAX_LENGTH} characters or fewer.`,
        );
        return;
      }

      signatureCanvas = renderTypedSignatureCanvas(
        trimmedName,
        SIGNATURE_SCRIPT_FONT,
      );
      label = trimmedName;
      source = "type";
      typedText = trimmedName;
    }

    const manifestError = validateSignatureManifestEntry({
      id: "pending",
      kind: addingKind,
      label,
      source,
      typedText,
    });

    if (manifestError) {
      setSignatureError(manifestError);
      return;
    }

    if (
      !signatureCanvas ||
      signatureCanvas.width === 0 ||
      signatureCanvas.height === 0
    ) {
      setSignatureError("Could not create that signature. Please try again.");
      return;
    }

    try {
      const image = await loadImageFromCanvas(signatureCanvas);
      const nextSignature: SavedSignature = {
        id: createSignatureId(),
        image,
        kind: addingKind,
        label,
        previewSrc: image.src,
        source,
        typedText,
      };
      const nextSignatures = [...savedSignatures, nextSignature];

      onSignaturesChange(nextSignatures);
      onActiveSignatureChange(nextSignature);

      if (hasDocument) {
        onPlaceSignature(nextSignature, defaultPlacement);
      }

      setAddingKind(null);
      setTypedName("");
      resetPad();
    } catch {
      setSignatureError("Could not save that signature. Please try again.");
    }
  }

  function deleteSignature(id: string) {
    const nextSignatures = savedSignatures.filter(
      (signature) => signature.id !== id,
    );

    onSignaturesChange(nextSignatures);

    if (activeSignatureId === id) {
      onActiveSignatureChange(nextSignatures[0] ?? null);
    }
  }

  function openAddSignature(kind: SignatureKind) {
    setAddingKind(kind);
    setInputMode(kind === "initials" ? "type" : "draw");
    setTypedName("");
    setSignatureError("");
    resetPad();
  }

  const typedMaxLength =
    addingKind === "initials"
      ? INITIALS_MAX_LENGTH
      : FULL_SIGNATURE_TYPED_MAX_LENGTH;

  return (
    <div className="space-y-2">
      {pdfPageLabel ? (
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ed-fg">
          {pdfPageLabel}
        </p>
      ) : null}

      {hasSignatureOnPage && onRemoveFromPage ? (
        <button
          className="editor-secondary-button w-full rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-ed-fg-muted hover:text-ed-fg"
          onClick={onRemoveFromPage}
          type="button"
        >
          Remove signature from this page
        </button>
      ) : null}

      {savedSignatures.length ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ed-fg">
              Saved signatures
            </p>
            {hasDocument ? (
              <p className="text-[10px] text-ed-fg-muted/80">
                {pdfPageLabel ? "Drag to this page" : "Drag to document"}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            {savedSignatures.map((signature) => {
              const isActive = signature.id === activeSignatureId;

              return (
                <div
                  className={`group flex items-center gap-1 rounded-xl border px-1 py-1 transition shadow-sm ${
                    isActive
                      ? "border-2 border-[#e8dfd1] bg-[#faf6f0] ring-2 ring-[#e8dfd1]/50"
                      : "editor-secondary-button border-ed-border bg-ed-bg hover:border-[#e8dfd1]"
                  }`}
                  key={signature.id}
                >
                  <span
                    aria-hidden
                    className="px-0.5 text-ed-fg-muted/70"
                    title="Drag onto the document"
                  >
                    <GripVertical className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>

                  <button
                    className="flex min-w-0 flex-1 items-center gap-1.5"
                    draggable={hasDocument}
                    onClick={() => onActiveSignatureChange(signature)}
                    onDragStart={(event) =>
                      handleSignatureDragStart(event, signature)
                    }
                    title={
                      hasDocument
                        ? "Drag onto the document to place this signature"
                        : signature.label
                    }
                    type="button"
                  >
                    <span
                      className="flex h-9 w-16 shrink-0 cursor-grab items-center justify-center overflow-hidden rounded-md border border-[#e8dfd1] bg-transparent active:cursor-grabbing"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt=""
                        className="pointer-events-none max-h-8 max-w-[3.75rem] object-contain"
                        draggable={false}
                        src={signature.previewSrc}
                      />
                    </span>
                    <span className="min-w-0 truncate text-[11px] font-semibold text-ed-fg-muted">
                      {signature.kind === "initials" ? "Initials: " : ""}
                      {signature.label}
                    </span>
                  </button>

                  <button
                    aria-label={`Place ${signature.label} on document`}
                    className="rounded-md p-1 text-ed-fg-muted transition hover:bg-ed-fg/5 hover:text-signal disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!hasDocument}
                    onClick={() => onPlaceSignature(signature, defaultPlacement)}
                    title={
                      hasDocument
                        ? "Place on document"
                        : "Upload a document first"
                    }
                    type="button"
                  >
                    <MousePointerClick className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>

                  <button
                    aria-label={`Remove ${signature.label}`}
                    className="rounded-md p-1 text-ed-fg-muted opacity-70 transition hover:bg-ed-fg/5 hover:text-signal group-hover:opacity-100"
                    onClick={() => deleteSignature(signature.id)}
                    type="button"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {addingKind ? (
        <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 8 }}>
          <EditorCard>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ed-fg">
              {addingKind === "initials" ? "Add initials" : "Add signature"}
            </p>

            {addingKind === "full" ? (
              <div className="editor-segment-track mt-2 grid grid-cols-2 gap-2">
                <EditorSegment
                  active={inputMode === "draw"}
                  groupId="signature-input-mode"
                  onClick={() => {
                    setInputMode("draw");
                    setSignatureError("");
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    <PenLine className="h-3.5 w-3.5" strokeWidth={2} />
                    Draw
                  </span>
                </EditorSegment>
                <EditorSegment
                  active={inputMode === "type"}
                  groupId="signature-input-mode"
                  onClick={() => {
                    setInputMode("type");
                    setSignatureError("");
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    <Type className="h-3.5 w-3.5" strokeWidth={2} />
                    Type
                  </span>
                </EditorSegment>
              </div>
            ) : null}

            {addingKind === "full" && inputMode === "draw" ? (
              <div className="mt-2 space-y-2">
                <div className="overflow-hidden rounded-xl border border-[#e8dfd1] bg-[#faf6f0]">
                  <canvas
                    className="block h-[7.5rem] w-full touch-none cursor-crosshair bg-[#faf6f0]"
                    onPointerCancel={handleDrawPointerUp}
                    onPointerDown={handleDrawPointerDown}
                    onPointerMove={handleDrawPointerMove}
                    onPointerUp={handleDrawPointerUp}
                    ref={canvasRef}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <EditorPill active={false} onClick={resetPad}>
                    Clear
                  </EditorPill>
                </div>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <label
                  className="block text-[10px] font-bold uppercase tracking-[0.12em] text-ed-fg"
                  htmlFor="signature-name"
                >
                  {addingKind === "initials" ? "Your initials" : "Your signature"}
                </label>
                <input
                  className="editor-field mt-2 py-2.5 text-sm"
                  id="signature-name"
                  maxLength={typedMaxLength}
                  onChange={(event) => setTypedName(event.target.value)}
                  placeholder={
                    addingKind === "initials" ? "e.g. JD" : "Type your signature"
                  }
                  type="text"
                  value={typedName}
                />
                <div
                  className="flex min-h-[4.5rem] items-center justify-center overflow-hidden rounded-xl border-2 border-ed-border bg-ed-bg px-3 py-2 shadow-sm"
                  style={{
                    fontFamily: SIGNATURE_SCRIPT_FONT,
                    fontSize: "2rem",
                    lineHeight: 1.1,
                  }}
                >
                  <span className="truncate text-ed-fg">
                    {typedName.trim() || "Preview"}
                  </span>
                </div>
              </div>
            )}

            {signatureError ? (
              <p className="mt-2 text-xs text-signal">{signatureError}</p>
            ) : null}

            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <button
                className="rounded-lg bg-signal px-2.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-105"
                onClick={() => void saveSignature()}
                type="button"
              >
                Save
              </button>
              <button
                className="rounded-lg border border-ed-border px-2.5 py-1.5 text-xs font-semibold text-ed-fg-muted transition hover:text-ed-fg"
                onClick={() => {
                  setAddingKind(null);
                  setSignatureError("");
                  setTypedName("");
                  resetPad();
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          </EditorCard>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          <button
            className="w-full rounded-xl border border border-ed-border bg-ed-fg/5 px-4 py-3 text-center transition hover:border-sand hover:bg-ed-fg/10"
            onClick={() => openAddSignature("full")}
            type="button"
          >
            <span className="block text-sm font-semibold text-ed-fg">
              Add signature
            </span>
            <span className="mt-1 block text-xs text-ed-fg-muted">
              Draw or type up to {FULL_SIGNATURE_TYPED_MAX_LENGTH} characters.
            </span>
          </button>
          <button
            className="w-full rounded-xl border border border-ed-border bg-ed-fg/5 px-4 py-3 text-center transition hover:border-sand hover:bg-ed-fg/10"
            onClick={() => openAddSignature("initials")}
            type="button"
          >
            <span className="block text-sm font-semibold text-ed-fg">
              Add initials
            </span>
            <span className="mt-1 block text-xs text-ed-fg-muted">
              Type only, up to {INITIALS_MAX_LENGTH} characters.
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
