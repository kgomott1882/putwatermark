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
  EditorCard,
  EditorPill,
  EditorSegment,
} from "./EditorToolPanel";

export type SavedSignature = {
  id: string;
  image: HTMLImageElement;
  label: string;
  previewSrc: string;
  source: "draw" | "type";
};

type SignatureInputMode = "draw" | "type";

type SignaturePlacement = {
  xPercent: number;
  yPercent: number;
};

type SignatureControlsProps = {
  activeSignatureId: string | null;
  hasDocument: boolean;
  onActiveSignatureChange: (signature: SavedSignature | null) => void;
  onPlaceSignature: (
    signature: SavedSignature,
    position?: SignaturePlacement,
  ) => void;
  onSignaturesChange: (signatures: SavedSignature[]) => void;
  savedSignatures: SavedSignature[];
};

const padWidth = 360;
const padHeight = 120;
const defaultPlacement: SignaturePlacement = {
  xPercent: 0.72,
  yPercent: 0.84,
};

export function SignatureControls({
  activeSignatureId,
  hasDocument,
  onActiveSignatureChange,
  onPlaceSignature,
  onSignaturesChange,
  savedSignatures,
}: SignatureControlsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [isAddingSignature, setIsAddingSignature] = useState(false);
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
    context.strokeStyle = "#111111";
    context.lineWidth = 2.5;
    setHasDrawn(false);
  }, []);

  useEffect(() => {
    if (!isAddingSignature || inputMode !== "draw") {
      return;
    }

    setupDrawCanvas();
  }, [inputMode, isAddingSignature, setupDrawCanvas]);

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
    setSignatureError("");

    let signatureCanvas: HTMLCanvasElement | null = null;
    let label = "";
    let source: SignatureInputMode = inputMode;

    if (inputMode === "draw") {
      const canvas = canvasRef.current;

      if (!canvas || !hasDrawn) {
        setSignatureError("Draw your signature before saving.");
        return;
      }

      signatureCanvas = trimCanvasToContent(canvas);
      label = `Signature ${savedSignatures.length + 1}`;
    } else {
      const trimmedName = typedName.trim();

      if (!trimmedName) {
        setSignatureError("Type your name before saving.");
        return;
      }

      signatureCanvas = renderTypedSignatureCanvas(
        trimmedName,
        SIGNATURE_SCRIPT_FONT,
      );
      label = trimmedName;
      source = "type";
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
        label,
        previewSrc: image.src,
        source,
      };
      const nextSignatures = [...savedSignatures, nextSignature];

      onSignaturesChange(nextSignatures);
      onActiveSignatureChange(nextSignature);

      if (hasDocument) {
        onPlaceSignature(nextSignature, defaultPlacement);
      }

      setIsAddingSignature(false);
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

  function openAddSignature() {
    setIsAddingSignature(true);
    setInputMode("draw");
    setTypedName("");
    setSignatureError("");
    resetPad();
  }

  return (
    <div className="space-y-2">
      {savedSignatures.length ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-beige-dim">
              Saved signatures
            </p>
            {hasDocument ? (
              <p className="text-[10px] text-beige-dim/80">Drag to document</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            {savedSignatures.map((signature) => {
              const isActive = signature.id === activeSignatureId;

              return (
                <div
                  className={`group flex items-center gap-1 rounded-xl border px-1 py-1 transition ${
                    isActive
                      ? "border-signal bg-signal/10"
                      : "border-beige/10 bg-night-card hover:border-signal/40"
                  }`}
                  key={signature.id}
                >
                  <span
                    aria-hidden
                    className="px-0.5 text-beige-dim/70"
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
                      className="flex h-9 w-16 shrink-0 cursor-grab items-center justify-center overflow-hidden rounded-md border border-beige/10 bg-night-card active:cursor-grabbing"
                      style={{
                        backgroundImage:
                          "linear-gradient(45deg, #DCDCDD 25%, transparent 25%), linear-gradient(-45deg, #DCDCDD 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #DCDCDD 75%), linear-gradient(-45deg, transparent 75%, #DCDCDD 75%)",
                        backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0",
                        backgroundSize: "12px 12px",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt=""
                        className="pointer-events-none max-h-8 max-w-[3.75rem] object-contain"
                        draggable={false}
                        src={signature.previewSrc}
                      />
                    </span>
                    <span className="min-w-0 truncate text-[11px] font-semibold text-beige-dim">
                      {signature.label}
                    </span>
                  </button>

                  <button
                    aria-label={`Place ${signature.label} on document`}
                    className="rounded-md p-1 text-beige-dim transition hover:bg-beige/5 hover:text-signal disabled:cursor-not-allowed disabled:opacity-40"
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
                    className="rounded-md p-1 text-beige-dim opacity-70 transition hover:bg-beige/5 hover:text-signal group-hover:opacity-100"
                    onClick={() => deleteSignature(signature.id)}
                    type="button"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              );
            })}
          </div>

          {hasDocument ? (
            <p className="text-[11px] leading-4 text-beige-dim/80">
              Drag a saved signature onto the preview, click the place icon, or
              drag the signature on the canvas to reposition it.
            </p>
          ) : (
            <p className="text-[11px] leading-4 text-beige-dim/80">
              Upload a document, then drag a signature onto it or use the place
              icon.
            </p>
          )}
        </div>
      ) : null}

      {isAddingSignature ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 8 }}
        >
          <EditorCard>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-night-card/60 p-1">
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

            {inputMode === "draw" ? (
              <div className="mt-2 space-y-2">
                <div className="overflow-hidden rounded-xl border border-beige/10 bg-night-card">
                  <canvas
                    className="block h-[7.5rem] w-full touch-none cursor-crosshair"
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
                  className="block text-[10px] font-bold uppercase tracking-[0.12em] text-beige-dim"
                  htmlFor="signature-name"
                >
                  Your name
                </label>
                <input
                  className="w-full rounded-xl border border-beige/10 bg-night-card px-3 py-2.5 text-sm text-beige outline-none transition placeholder:text-beige-dim/70 focus:border-signal focus:ring-2 focus:ring-signal/20"
                  id="signature-name"
                  onChange={(event) => setTypedName(event.target.value)}
                  placeholder="Type your signature"
                  type="text"
                  value={typedName}
                />
                <div
                  className="flex min-h-[4.5rem] items-center justify-center overflow-hidden rounded-xl border border-beige/10 bg-night-card px-3 py-2"
                  style={{
                    fontFamily: SIGNATURE_SCRIPT_FONT,
                    fontSize: "2rem",
                    lineHeight: 1.1,
                  }}
                >
                  <span className="truncate text-beige">
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
                Save signature
              </button>
              <button
                className="rounded-lg border border-beige/10 px-2.5 py-1.5 text-xs font-semibold text-beige-dim transition hover:text-beige"
                onClick={() => {
                  setIsAddingSignature(false);
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
        <button
          className="w-full rounded-xl border border border-beige/20 bg-beige/5 px-4 py-3 text-center transition hover:border-sand hover:bg-beige/10"
          onClick={openAddSignature}
          type="button"
        >
          <span className="block text-sm font-semibold text-beige">
            Add signature
          </span>
          <span className="mt-1 block text-xs text-beige-dim">
            Draw with mouse or touch, or type in script handwriting.
          </span>
        </button>
      )}
    </div>
  );
}
