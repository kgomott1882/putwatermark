"use client";

import { motion } from "framer-motion";
import { GripVertical, MousePointerClick, PenLine, Type, X } from "lucide-react";
import {
  type DragEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createSignatureId,
  DEFAULT_SIGNATURE_STROKE_WIDTH,
  loadImageFromCanvas,
  MAX_SIGNATURE_STROKE_WIDTH,
  MIN_SIGNATURE_STROKE_WIDTH,
  regenerateSignatureImage,
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
  baseStrokeWidth?: number;
  id: string;
  image: HTMLImageElement;
  kind: SignatureKind;
  label: string;
  previewSrc: string;
  source: "draw" | "type";
  sourceDataUrl?: string | null;
  strokeWidth: number;
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

function SignatureStrokeSlider({
  id,
  onChange,
  value,
}: {
  id: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <div className="min-w-0 px-1 pb-1">
      <div className="flex items-center justify-between gap-2">
        <label
          className="text-[10px] font-bold uppercase tracking-[0.08em] text-ed-fg"
          htmlFor={id}
        >
          Line thickness
        </label>
        <span className="text-[11px] font-semibold tabular-nums text-ed-fg">
          {value.toFixed(1)}px
        </span>
      </div>
      <input
        className="editor-range mt-1 touch-manipulation"
        id={id}
        max={MAX_SIGNATURE_STROKE_WIDTH}
        min={MIN_SIGNATURE_STROKE_WIDTH}
        onChange={(event) => onChange(Number(event.target.value))}
        step={0.25}
        type="range"
        value={value}
      />
    </div>
  );
}

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
  const [draftStrokeWidth, setDraftStrokeWidth] = useState(
    DEFAULT_SIGNATURE_STROKE_WIDTH,
  );
  const [updatingSignatureId, setUpdatingSignatureId] = useState<string | null>(
    null,
  );
  const strokeUpdateTimeoutRef = useRef<number | null>(null);
  const savedSignaturesRef = useRef(savedSignatures);
  const savedSignatureUpdateVersionRef = useRef(0);

  savedSignaturesRef.current = savedSignatures;

  useEffect(() => {
    return () => {
      if (strokeUpdateTimeoutRef.current !== null) {
        window.clearTimeout(strokeUpdateTimeoutRef.current);
      }
    };
  }, []);

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
    context.lineWidth = draftStrokeWidth;
    setHasDrawn(false);
  }, [draftStrokeWidth]);

  useEffect(() => {
    if (!addingKind || inputMode !== "draw") {
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

    if (inputMode === "draw") {
      const canvas = canvasRef.current;

      if (!canvas || !hasDrawn) {
        setSignatureError(
          addingKind === "initials"
            ? "Draw your initials before saving."
            : "Draw your signature before saving.",
        );
        return;
      }

      signatureCanvas = trimCanvasToContent(canvas);
      label =
        addingKind === "initials"
          ? String(
              savedSignatures.filter((entry) => entry.kind === "initials").length +
                1,
            )
          : `Signature ${savedSignatures.filter((entry) => entry.kind === "full").length + 1}`;
      source = "draw";
    } else {
      const trimmedName = typedName.trim();

      if (!trimmedName) {
        setSignatureError(
          addingKind === "initials"
            ? "Type your initials before saving."
            : "Type your signature before saving.",
        );
        return;
      }

      if (addingKind === "initials") {
        if (trimmedName.length > INITIALS_MAX_LENGTH) {
          setSignatureError(
            `Initials must be ${INITIALS_MAX_LENGTH} characters or fewer.`,
          );
          return;
        }
      } else if (trimmedName.length > FULL_SIGNATURE_TYPED_MAX_LENGTH) {
        setSignatureError(
          `Signature text must be ${FULL_SIGNATURE_TYPED_MAX_LENGTH} characters or fewer.`,
        );
        return;
      }

      signatureCanvas = renderTypedSignatureCanvas(
        trimmedName,
        SIGNATURE_SCRIPT_FONT,
        draftStrokeWidth,
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
      const sourceDataUrl =
        signatureCanvas.toDataURL("image/png");
      const nextSignature: SavedSignature = {
        baseStrokeWidth: draftStrokeWidth,
        id: createSignatureId(),
        image,
        kind: addingKind,
        label,
        previewSrc: image.src,
        source,
        sourceDataUrl,
        strokeWidth: draftStrokeWidth,
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
    setInputMode("draw");
    setTypedName("");
    setSignatureError("");
    setDraftStrokeWidth(DEFAULT_SIGNATURE_STROKE_WIDTH);
    resetPad();
  }

  function scheduleSavedSignatureStrokeWidthUpdate(
    signatureId: string,
    strokeWidth: number,
  ) {
    onSignaturesChange(
      savedSignaturesRef.current.map((entry) =>
        entry.id === signatureId ? { ...entry, strokeWidth } : entry,
      ),
    );

    if (strokeUpdateTimeoutRef.current !== null) {
      window.clearTimeout(strokeUpdateTimeoutRef.current);
    }

    strokeUpdateTimeoutRef.current = window.setTimeout(() => {
      void updateSavedSignatureStrokeWidth(signatureId, strokeWidth);
    }, 150);
  }

  async function updateSavedSignatureStrokeWidth(
    signatureId: string,
    strokeWidth: number,
  ) {
    const signature = savedSignaturesRef.current.find(
      (entry) => entry.id === signatureId,
    );

    if (!signature) {
      return;
    }

    const updateVersion = ++savedSignatureUpdateVersionRef.current;

    setUpdatingSignatureId(signatureId);
    setSignatureError("");

    try {
      const regenerated = await regenerateSignatureImage({
        baseStrokeWidth: signature.baseStrokeWidth ?? signature.strokeWidth,
        kind: signature.kind,
        label: signature.label,
        previewSrc: signature.previewSrc,
        source: signature.source,
        sourceDataUrl: signature.sourceDataUrl ?? signature.previewSrc,
        strokeWidth,
        typedText: signature.typedText,
      });

      if (updateVersion !== savedSignatureUpdateVersionRef.current) {
        return;
      }

      const nextSignatures = savedSignaturesRef.current.map((entry) =>
        entry.id === signatureId
          ? {
              ...entry,
              image: regenerated.image,
              previewSrc: regenerated.previewSrc,
              strokeWidth,
            }
          : entry,
      );

      onSignaturesChange(nextSignatures);

      if (activeSignatureId === signatureId) {
        onActiveSignatureChange(
          nextSignatures.find((entry) => entry.id === signatureId) ?? null,
        );
      }
    } catch {
      setSignatureError("Could not update that signature thickness.");
    } finally {
      if (updateVersion === savedSignatureUpdateVersionRef.current) {
        setUpdatingSignatureId(null);
      }
    }
  }

  const typedMaxLength =
    addingKind === "initials"
      ? INITIALS_MAX_LENGTH
      : FULL_SIGNATURE_TYPED_MAX_LENGTH;
  const typedPreviewSrc = useMemo(() => {
    if (!addingKind || inputMode === "draw") {
      return null;
    }

    return renderTypedSignatureCanvas(
      typedName.trim() || "Preview",
      SIGNATURE_SCRIPT_FONT,
      draftStrokeWidth,
    ).toDataURL("image/png");
  }, [addingKind, draftStrokeWidth, inputMode, typedName]);

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

      {signatureError ? (
        <p className="rounded-lg border border-ed-accent/30 bg-ed-accent/10 px-2.5 py-2 text-xs text-ed-fg">
          {signatureError}
        </p>
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
              const isUpdating = updatingSignatureId === signature.id;

              return (
                <div
                  className={`group flex flex-col gap-1 rounded-xl border px-1 py-1 transition shadow-sm ${
                    isActive
                      ? "border-2 border-[#e8dfd1] bg-[#faf6f0] ring-2 ring-[#e8dfd1]/50"
                      : "editor-secondary-button border-ed-border bg-ed-bg hover:border-[#e8dfd1]"
                  }`}
                  key={signature.id}
                >
                  <div className="flex items-center gap-1">
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
                        key={`${signature.id}-${signature.previewSrc}`}
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

                  {isActive ? (
                    <SignatureStrokeSlider
                      id={`signature-stroke-${signature.id}`}
                      onChange={(value) => {
                        scheduleSavedSignatureStrokeWidthUpdate(signature.id, value);
                      }}
                      value={
                        signature.strokeWidth ?? DEFAULT_SIGNATURE_STROKE_WIDTH
                      }
                    />
                  ) : null}
                  {isUpdating ? (
                    <p className="px-1 pb-1 text-[10px] text-ed-fg-muted">
                      Updating thickness…
                    </p>
                  ) : null}
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

            <div className="editor-segment-track mt-2 grid grid-cols-2 gap-2">
              <EditorSegment
                active={inputMode === "draw"}
                groupId={
                  addingKind === "initials"
                    ? "initials-input-mode"
                    : "signature-input-mode"
                }
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
                groupId={
                  addingKind === "initials"
                    ? "initials-input-mode"
                    : "signature-input-mode"
                }
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

            {inputMode === "draw" ? (
              <div className="mt-2 space-y-2">
                <p className="text-[11px] text-ed-fg-muted">
                  {addingKind === "initials"
                    ? "Draw your initials with the same pad and line thickness as your signature."
                    : "Draw your signature on the pad below."}
                </p>
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
                <SignatureStrokeSlider
                  id={
                    addingKind === "initials"
                      ? "initials-draw-stroke"
                      : "signature-draw-stroke"
                  }
                  onChange={setDraftStrokeWidth}
                  value={draftStrokeWidth}
                />
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
                    addingKind === "initials" ? "e.g. TT" : "Type your signature"
                  }
                  type="text"
                  value={typedName}
                />
                <SignatureStrokeSlider
                  id={
                    addingKind === "initials"
                      ? "initials-type-stroke"
                      : "signature-type-stroke"
                  }
                  onChange={setDraftStrokeWidth}
                  value={draftStrokeWidth}
                />
                <div
                  className="flex min-h-[4.5rem] items-center justify-center overflow-hidden rounded-xl border-2 border-ed-border bg-ed-bg px-3 py-2 shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    className="max-h-16 max-w-full object-contain"
                    src={typedPreviewSrc ?? undefined}
                  />
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
              Draw or type, up to {INITIALS_MAX_LENGTH} characters.
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
