import type { EditorPanelId } from "../../components/watermark/ToolIconRail";
import type { SavedSignature } from "../../components/watermark/SignatureControls";
import type { BlurBrushSize, BlurStroke } from "./blurBrush";
import type { ImageEffectSettings } from "./imageEffects";
import {
  deserializeLogoLayer,
  deserializeTextLayer,
  serializeLogoLayer,
  serializeTextLayer,
  type LogoWatermarkLayer,
  type TextWatermarkLayer,
} from "./watermarkLayers";
import {
  ANONYMOUS_DRAFT_STATE_VERSION,
  type AnonymousDraftBatchEntry,
  type AnonymousDraftImageTools,
  type AnonymousDraftMediaKind,
  type AnonymousDraftUploadDescriptor,
  type AnonymousExportDraftState,
} from "./anonymousExportDraftState";
import {
  serializePdfPageFillMap,
  type PdfPageFillMap,
} from "./pdfPageFillFields";
import {
  serializePdfPageSignatureMap,
  type PdfPageSignatureMap,
} from "./pdfPageSignatures";

export type EditorDraftBatchEntryInput = {
  blurBrushSize: BlurBrushSize;
  blurStrokes: BlurStroke[];
  fileKey: string;
  fileName: string;
  id: string;
  imageEffectSettings: ImageEffectSettings;
  resizeHeight: number;
  resizeWidth: number;
  rotationAngle: number;
  uploadedImageSize: { height: number; width: number } | null;
};

export type BuildAnonymousExportDraftInput = {
  activeBatchImageId: string | null;
  activeEditorPanel: EditorPanelId | null;
  activeLogoLayerId: string;
  activePdfPageId: string | null;
  activeSignatureId: string | null;
  activeLogoTemplate: string | null;
  activeTemplate: string | null;
  activeTextLayerId: string;
  fileName: string;
  imageBatch?: EditorDraftBatchEntryInput[];
  imageTools?: AnonymousDraftImageTools;
  logoLayers: LogoWatermarkLayer[];
  mediaKind: AnonymousDraftMediaKind;
  pdfDocumentTool?: "signature" | "fill";
  pdfPageCount?: number;
  pdfPageFillMap?: PdfPageFillMap;
  pdfPageSignatures?: PdfPageSignatureMap;
  savedSignatures: SavedSignature[];
  textLayers: TextWatermarkLayer[];
  tileAngle: 0 | 45 | 90 | 180;
  tileDensity: "sparse" | "medium" | "dense";
  tileGap: number;
  videoDuration?: number;
  videoFileSize?: number;
  videoSize?: { height: number; width: number } | null;
  watermarkMode: "single" | "tile";
  watermarkType: "text" | "logo" | "signature";
};

export async function buildAnonymousExportDraftState(
  input: BuildAnonymousExportDraftInput,
): Promise<AnonymousExportDraftState> {
  const textLayers = await Promise.all(input.textLayers.map(serializeTextLayer));
  const logoLayers = await Promise.all(input.logoLayers.map(serializeLogoLayer));

  return {
    version: ANONYMOUS_DRAFT_STATE_VERSION,
    mediaKind: input.mediaKind,
    fileName: input.fileName,
    watermarkType: input.watermarkType,
    watermarkMode: input.watermarkMode,
    tileDensity: input.tileDensity,
    tileGap: input.tileGap,
    tileAngle: input.tileAngle,
    activeTextLayerId: input.activeTextLayerId,
    activeLogoLayerId: input.activeLogoLayerId,
    textLayers,
    logoLayers,
    activeLogoTemplate: input.activeLogoTemplate,
    activeTemplate: input.activeTemplate,
    activeEditorPanel: input.activeEditorPanel,
    activeSignatureId: input.activeSignatureId,
    savedSignatures: input.savedSignatures.map((signature) => ({
      id: signature.id,
      label: signature.label,
      previewSrc: signature.previewSrc,
      source: signature.source,
    })),
    imageTools: input.imageTools,
    imageBatch: input.imageBatch?.map((entry) => ({
      blurBrushSize: entry.blurBrushSize,
      blurStrokes: entry.blurStrokes,
      cropRect: null,
      fileKey: entry.fileKey,
      fileName: entry.fileName,
      id: entry.id,
      imageEffectSettings: entry.imageEffectSettings,
      resizeHeight: entry.resizeHeight,
      resizeWidth: entry.resizeWidth,
      rotationAngle: entry.rotationAngle,
      uploadedImageSize: entry.uploadedImageSize,
    })),
    activeBatchImageId: input.activeBatchImageId,
    activePdfPageId: input.activePdfPageId,
    pdfDocumentTool: input.pdfDocumentTool,
    pdfPageCount: input.pdfPageCount,
    pdfPageFillMap: input.pdfPageFillMap
      ? serializePdfPageFillMap(input.pdfPageFillMap)
      : undefined,
    pdfPageSignatures: input.pdfPageSignatures
      ? serializePdfPageSignatureMap(input.pdfPageSignatures)
      : undefined,
    videoDuration: input.videoDuration,
    videoFileSize: input.videoFileSize,
    videoSize: input.videoSize,
  };
}

export function buildAnonymousDraftUploadDescriptors(
  input: BuildAnonymousExportDraftInput,
): AnonymousDraftUploadDescriptor[] {
  if (input.imageBatch?.length) {
    return input.imageBatch.map((entry) => ({
      contentType: "image/jpeg",
      fileKey: entry.fileKey,
      fileName: entry.fileName,
      sizeBytes: 1,
    }));
  }

  return [
    {
      contentType:
        input.mediaKind === "pdf"
          ? "application/pdf"
          : input.mediaKind === "video"
            ? "video/mp4"
            : "image/jpeg",
      fileKey: "source",
      fileName: input.fileName,
      sizeBytes: input.videoFileSize ?? 1,
    },
  ];
}

export async function deserializeDraftWatermarkLayers(state: AnonymousExportDraftState) {
  const textLayers = await Promise.all(state.textLayers.map(deserializeTextLayer));
  const logoLayers = await Promise.all(state.logoLayers.map(deserializeLogoLayer));
  return { logoLayers, textLayers };
}

export type RestoredAnonymousDraftBatchEntry = EditorDraftBatchEntryInput;

export function mapDraftBatchEntry(
  entry: AnonymousDraftBatchEntry,
): RestoredAnonymousDraftBatchEntry {
  return {
    blurBrushSize: entry.blurBrushSize,
    blurStrokes: entry.blurStrokes,
    fileKey: entry.fileKey,
    fileName: entry.fileName,
    id: entry.id,
    imageEffectSettings: entry.imageEffectSettings,
    resizeHeight: entry.resizeHeight,
    resizeWidth: entry.resizeWidth,
    rotationAngle: entry.rotationAngle,
    uploadedImageSize: entry.uploadedImageSize,
  };
}
