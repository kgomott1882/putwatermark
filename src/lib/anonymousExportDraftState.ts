import type { EditorPanelId } from "../../components/watermark/ToolIconRail";
import type { BlurBrushSize, BlurStroke } from "./blurBrush";
import type { ImageEffectSettings } from "./imageEffects";
import type { SerializedPdfPageFillMap } from "./pdfPageFillFields";
import type { SerializedPdfPageSignatureMap } from "./pdfPageSignatures";
import type { SignatureKind } from "./signatureValidation";
import type { WatermarkLayerSnapshot } from "./watermarkLayers";

export const ANONYMOUS_DRAFT_STATE_VERSION = 6 as const;

export const LEGACY_ANONYMOUS_DRAFT_STATE_VERSION = 4 as const;

export type AnonymousDraftMediaKind = "image" | "pdf" | "video";

export type AnonymousDraftCropRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type AnonymousDraftCanvasSize = {
  height: number;
  width: number;
};

export type AnonymousDraftSavedSignature = {
  id: string;
  kind?: SignatureKind;
  label: string;
  previewSrc: string;
  source: "draw" | "type";
  typedText?: string | null;
};

export type AnonymousDraftImageTools = {
  blurBrushSize: BlurBrushSize;
  blurStrokes: BlurStroke[];
  cropRect: AnonymousDraftCropRect | null;
  imageEffectSettings: ImageEffectSettings;
  resizeHeight: number;
  resizeWidth: number;
  rotationAngle: number;
  uploadedImageSize: AnonymousDraftCanvasSize | null;
};

export type AnonymousDraftBatchEntry = AnonymousDraftImageTools & {
  fileKey: string;
  fileName: string;
  id: string;
};

export type AnonymousExportDraftState = {
  version: typeof ANONYMOUS_DRAFT_STATE_VERSION;
  mediaKind: AnonymousDraftMediaKind;
  fileName: string;
  watermarkType: "text" | "logo" | "signature";
  watermarkMode: "single" | "tile";
  tileDensity: "sparse" | "medium" | "dense";
  tileGap: number;
  tileAngle: 0 | 45 | 90 | 180;
  activeTextLayerId: string;
  activeLogoLayerId: string;
  textLayers: Extract<WatermarkLayerSnapshot, { type: "text" }>[];
  logoLayers: Extract<WatermarkLayerSnapshot, { type: "logo" }>[];
  activeLogoTemplate?: string | null;
  activeTemplate: string | null;
  activeEditorPanel: EditorPanelId | null;
  activeSignatureId: string | null;
  savedSignatures: AnonymousDraftSavedSignature[];
  imageTools?: AnonymousDraftImageTools;
  imageBatch?: AnonymousDraftBatchEntry[];
  activeBatchImageId?: string | null;
  activePdfPageId?: string | null;
  pdfPageCount?: number;
  pdfPageFillMap?: SerializedPdfPageFillMap;
  pdfPageSignatures?: SerializedPdfPageSignatureMap;
  pdfDocumentTool?: "signature" | "fill";
  videoDuration?: number;
  videoFileSize?: number;
  videoSize?: AnonymousDraftCanvasSize | null;
};

export type AnonymousDraftUploadDescriptor = {
  contentType: string;
  fileKey: string;
  fileName: string;
  sizeBytes: number;
};

export function isValidAnonymousSessionId(sessionId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    sessionId.trim(),
  );
}

export function isAnonymousExportDraftState(
  value: unknown,
): value is AnonymousExportDraftState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as AnonymousExportDraftState;
  return (
    (state.version === ANONYMOUS_DRAFT_STATE_VERSION ||
      state.version === LEGACY_ANONYMOUS_DRAFT_STATE_VERSION ||
      state.version === 5) &&
    (state.mediaKind === "image" ||
      state.mediaKind === "pdf" ||
      state.mediaKind === "video") &&
    typeof state.fileName === "string"
  );
}
