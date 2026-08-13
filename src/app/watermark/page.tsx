"use client";

import {
  VideoExportCancelledError,
  VideoExportFailedError,
  VideoExportTimeoutError,
  cancelVideoExportWorker,
  exportVideoWithOverlay,
  getVideoExportFileName,
  getVideoExportRejectionMessage,
  getVideoExportRoute,
  isAnyVideoExportEligible,
  isServerSideVideoExportRoute,
  type VideoOverlayPass,
} from "../../lib/watermarkVideoExport";
import {
  exportLongVideoOnServer,
  exportVideoOnServer,
  type ServerVideoExportStage,
} from "../../lib/serverVideoExportClient";
import {
  applyBlurStrokes,
  areBlurStrokesEqual,
  cloneBlurStrokes,
  getBlurBrushRadius,
  type BlurBrushSize,
  type BlurStroke,
} from "../../lib/blurBrush";
import {
  clearStoredWatermarkSettings,
  getDefaultStoredWatermarkSettings,
  readStoredWatermarkSettings,
  storedSettingsFromSnapshot,
  writeStoredWatermarkSettings,
} from "../../lib/watermarkSettingsStorage";
import {
  exportWatermarkedPdf,
  getPdfExportFileName,
  getPdfWatermarkExportScale,
  type PdfTilePatternWatermark,
} from "../../lib/pdfExport";
import { computePdfTileCenters, getOrientedTileUnitBounds } from "../../lib/pdfTileWatermarkLayout";
import {
  applyExportBillingToUi,
  completeCleanExportBilling,
  createExportId,
  ExportAuthorizationRequiredError,
  ExportCreditCheckError,
  isCleanExportTier,
  resolveExportAuthorization,
  resolveExportAuthorizationStrict,
  resolveVideoExportAuthorization,
  type ExportAuthorizationContext,
} from "../../lib/exportClient";
import {
  buildAnonymousExportDraftState,
  type BuildAnonymousExportDraftInput,
  deserializeDraftWatermarkLayers,
} from "../../lib/anonymousExportDraftEditor";
import {
  deleteAnonymousExportDraft,
  downloadDraftFiles,
  loadAnonymousExportDraft,
  saveAnonymousExportDraft,
} from "../../lib/anonymousExportDraftClient";
import {
  clearPendingExportAfterLogin,
  getOrCreateAnonymousSessionId,
  hasPendingExportAfterLogin,
  markPendingExportAfterLogin,
} from "../../lib/anonymousExportDraftSession";
import type { AnonymousExportDraftState } from "../../lib/anonymousExportDraftState";
import type { ExportFileMeta } from "../../lib/exportCost";
import { getVideoServerCostEstimate } from "../../lib/exportCost";
import { buildFillManifestDocument } from "../../lib/fillManifest";
import {
  getPdfBillingMode,
  hasPdfWatermarkExportContent,
} from "../../lib/pdfExportBilling";
import { buildSignaturePlacementManifestDocument } from "../../lib/signaturePlacementManifest";
import {
  applyFillFieldResize,
  getFillFieldRect,
  getFillFrameActionAtPoint,
  getFillResizeCursor,
  getFillResizeHandleAtPoint,
  paintFillFields,
  paintFillFieldsForPdfExport,
  type FillFieldBounds,
  type FillFrameAction,
  type FillResizeHandle,
} from "../../lib/fillFieldRender";
import {
  applyCenteredPlacementResize,
  drawPlacementFrameActions,
  drawPlacementSelectionFrame,
  getPlacementFrameActionAtPoint,
  getPlacementResizeCursor,
  getPlacementResizeHandleAtPoint,
  type PlacementFrameAction,
  type PlacementResizeHandle,
} from "../../lib/placementSelectionFrame";
import {
  countFillPages,
  createDefaultFillField,
  createEmptyPdfPageFillMap,
  deserializePdfPageFillMap,
  hasAnyFillFields,
  persistPdfPageFillFields,
  serializePdfPageFillMap,
  type PdfFillTextField,
  type PdfPageFillMap,
} from "../../lib/pdfPageFillFields";
import { buildSignatureManifestFromSavedSignatures } from "../../lib/signatureManifestClient";
import { normalizeSignatureKind } from "../../lib/signatureValidation";
import {
  applyForcedTileWatermarkSettings,
  ensureForcedTilePatternFontLoaded,
  FORCED_TILE_LAYER_ID,
  FORCED_TILE_PATTERN_SETTINGS,
  FORCED_TILE_SITE_TEXT,
  getExportFileType,
  hasForcedWatermarkOverlay,
  loadForcedTileLogoImage,
  uploadFillManifestForExportAuthorization,
  uploadPdfForExportAuthorization,
  uploadSignaturePlacementManifestForExportAuthorization,
} from "../../lib/forcedTileExport";
import {
  estimateClientExportCost,
  shouldShowWatermarkedExportUpsell,
  shouldRequireCreditsBeforeExport,
  wouldReceiveWatermarkedExport,
  type WatermarkedExportUpsellContext,
} from "../../lib/exportUpsellEligibility";
import {
  loadClientVideoFreeExportStampImage,
  paintClientVideoFreeExportStamp,
} from "../../lib/clientVideoFreeExportStamp";
import {
  fetchUserCreditBalance,
  formatCreditBalance,
} from "../../lib/creditBalance";
import { fetchUserProfileDisplayName } from "../../lib/profileDisplayName";
import {
  downloadBlob,
  downloadImageBlob,
  ensureBlobMimeType,
  sanitizeDownloadFileName,
} from "../../lib/downloadBlob";
import {
  applyHighQualityCanvasDefaults,
  getImageExportOutputScale,
  getImageWatermarkExportScale,
  IMAGE_EXPORT_JPEG_QUALITY,
} from "../../lib/imageWatermarkExport";
import {
  acceptedImageInputTypes,
  acceptedMediaInputTypes,
  acceptedPdfInputTypes,
  acceptedVideoInputTypes,
  isImageFile,
  isPdfFile,
  isVideoFile,
  validateMediaFiles,
} from "../../lib/mediaFiles";
import { consumeEditorHandoffFiles } from "../../lib/editorFileHandoff";
import {
  blobToStoredSessionFile,
  clearEditorSession,
  persistEditorSession,
  readEditorSession,
  storedSessionFilesToFiles,
  type StoredEditorSessionMeta,
  type StoredSessionFile,
} from "../../lib/editorSessionStorage";
import { SIGNATURE_DRAG_MIME, createImageFromDataUrl } from "../../lib/signatureImage";
import {
  drawBaseImageWithEffect,
  type EffectBorderColor,
  type EffectBorderWidth,
  type ImageEffectId,
  type ImageEffectSettings,
} from "../../lib/imageEffects";
import {
  appendPdfPageSignaturePlacement,
  buildPdfPageId,
  countSignedPdfPages,
  createEmptyPdfPageSignatureMap,
  createPdfPageSignaturePlacement,
  deserializePdfPageSignatureMap,
  PDF_SIGNATURE_DEFAULT_OPACITY,
  removePdfPageSignaturePlacement,
  removeSignatureFromPdfPageMap,
  serializePdfPageSignatureMap,
  upsertPdfPageSignaturePlacement,
  type PdfPageSignatureMap,
  type PdfPageSignaturePlacement,
} from "../../lib/pdfPageSignatures";
import {
  buildPdfPageThumbnails,
  loadPdfDocumentFromBytes,
  renderPdfPagePreview,
  type PdfPageThumbnail,
} from "../../lib/pdfPreview";
import JSZip from "jszip";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Images,
  RefreshCw,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { CropControlsPanel } from "../../../components/watermark/CropControlsPanel";
import { EditorBottomBar } from "../../../components/watermark/EditorBottomBar";
import {
  clampPreviewZoom,
  formatPreviewZoomLabel,
  PREVIEW_ZOOM_DEFAULT,
  PREVIEW_ZOOM_MAX,
  PREVIEW_ZOOM_MIN,
  PREVIEW_ZOOM_STEP,
  PreviewCanvasZoomControls,
  PreviewCanvasMediaControls,
  previewControlButtonClassName,
} from "../../../components/watermark/PreviewZoomControls";
import {
  ResizeControlsPanel,
  type ResizeScaleMode,
  type ResizeUnit,
} from "../../../components/watermark/ResizeControlsPanel";
import { LoadingIndicator } from "../../../components/LoadingIndicator";
import { ProcessingOverlay } from "../../../components/ProcessingOverlay";
import { SiteNavClient } from "../../../components/SiteNavClient";
import { ImageEffectsPanel } from "../../../components/watermark/ImageEffectsPanel";
import {
  EditorApplyButton,
  EditorCard,
  EditorPanelSection,
  EditorPill,
  EditorSegment,
  EditorToggleRow,
  EditorToolPanel,
} from "../../../components/watermark/EditorToolPanel";
import { FillDocumentControls } from "../../../components/watermark/FillDocumentControls";
import { SignFillCreditsRequiredModal } from "../../../components/watermark/SignFillCreditsRequiredModal";
import {
  SignatureControls,
  type SavedSignature,
} from "../../../components/watermark/SignatureControls";
import { WatermarkLayersPanel } from "../../../components/watermark/WatermarkLayersPanel";
import {
  WatermarkToolRail,
  type WatermarkToolId,
} from "../../../components/watermark/WatermarkToolRail";
import {
  VideoToolRail,
  type VideoToolId,
} from "../../../components/watermark/VideoToolRail";
import {
  PhotosToolRail,
  type PhotoToolId,
} from "../../../components/watermark/PhotosToolRail";
import {
  PdfDocsToolRail,
} from "../../../components/watermark/PdfDocsToolRail";
import { PdfMergePanel } from "../../../components/watermark/PdfMergePanel";
import {
  PdfCompressPanel,
  type PdfCompressStats,
} from "../../../components/watermark/PdfCompressPanel";
import type { PdfDocToolId } from "../../../components/watermark/pdfDocTools";
import { VideoTrimPanel } from "../../../components/watermark/VideoTrimPanel";
import { VideoMergePanel } from "../../../components/watermark/VideoMergePanel";
import { VideoBlurPanel } from "../../../components/watermark/VideoBlurPanel";
import { VideoOverviewPanel } from "../../../components/watermark/VideoOverviewPanel";
import { VideoOverviewPlayer } from "../../../components/watermark/VideoOverviewPlayer";
import { WatermarkAdjustSliders } from "../../../components/watermark/WatermarkAdjustSliders";
import { WatermarkMobileBar } from "../../../components/watermark/WatermarkMobileBar";
import {
  type QuickTemplateIcon,
  WatermarkPresetControls,
  WatermarkQuickTemplates,
} from "../../../components/watermark/WatermarkTemplatesPresets";
import { VideoVisibilityTimeline } from "../../../components/watermark/VideoVisibilityTimeline";
import { WatermarkFontLoader } from "../../../components/watermark/WatermarkFontLoader";
import { WatermarkStyleControls } from "../../../components/watermark/WatermarkStyleControls";
import { WatermarkedExportUpsellModal } from "../../../components/watermark/WatermarkedExportUpsellModal";
import { UnsignedPdfExportConfirmModal } from "../../../components/watermark/UnsignedPdfExportConfirmModal";
import {
  ExportLoginGateModal,
  type ExportLoginGatePhase,
} from "../../../components/watermark/ExportLoginGateModal";
import { VideoServerProcessingPanel } from "../../../components/watermark/VideoServerProcessingPanel";
import { EditorExitConfirmModal } from "../../../components/watermark/EditorExitConfirmModal";
import {
  EditorFormatUploadModal,
  type EditorFormatUploadKind,
} from "../../../components/watermark/EditorFormatUploadModal";
import {
  DEFAULT_WATERMARK_FONT_FAMILY,
  loadWatermarkFont,
  watermarkFontFamilies,
  watermarkFontFamilyGroups,
} from "../../lib/watermarkFonts";
import {
  createDefaultLogoLayer,
  createDefaultTextLayer,
  DEFAULT_TILE_ANGLE,
  DEFAULT_TILE_DENSITY,
  DEFAULT_TILE_GAP,
  legacySnapshotToLogoLayer,
  legacySnapshotToTextLayer,
  revokeLogoLayerUrls,
  SINGLE_TEXT_WATERMARK_DEFAULTS,
  TILE_TEXT_WATERMARK_DEFAULTS,
  type LogoWatermarkLayer,
  type TextWatermarkLayer,
} from "../../lib/watermarkLayers";
import {
  DEFAULT_TEXT_SHADOW_ENABLED,
  DEFAULT_TEXT_WATERMARK_COLOR,
  DEFAULT_TEXT_WATERMARK_FONT_WEIGHT,
  resolveTextWatermarkPaint,
  type TextWatermarkFontWeight,
} from "../../lib/watermarkTextStyle";
import {
  countVideoVisibilityRanges,
  hasVideoVisibilityRange,
  isElementVisibleAt,
  resolveVideoVisibilityRange,
} from "../../lib/videoWatermarkVisibility";
import { createClient } from "../../../utils/supabase/client";
import {
  createDefaultVideoCaptionLayer,
  createInitialVideoCaptionLayers,
  drawVideoCaption,
  drawVideoCaptions,
  getTimedCaptionLayers,
  getUntimedCaptionLayers,
  isCaptionLayerActive,
  type CaptionVerticalPosition,
  type VideoCaptionLayer,
} from "../../lib/videoCaptions";
import {
  appendVideoBlurRegionPasses,
  createDefaultVideoBlurRegion,
  drawVideoBlurPreview,
  updateVideoBlurRegionTiming,
  type VideoBlurRegion,
} from "../../lib/videoBlurRegions";
import {
  getMediaFitPreviewSize,
  getVideoDisplayFrame,
  getVideoElementFrameInCanvas,
  getVideoNaturalDimensions,
  mapClientPointToVideoNatural,
} from "../../lib/videoDisplayFrame";
import {
  clampVideoPreviewTimeToTrim,
  getVideoTrimDuration,
  areVideoTrimRangesEqual,
  isVideoTrimActive,
  resolveVideoTrimEnd,
  resolveVideoTrimRange,
  shiftTimedVisibilityAfterTrim,
} from "../../lib/videoTrim";
import {
  mergeVideoBlobs,
  trimVideoBlob,
} from "../../lib/clientVideoEdit";
import {
  type BatchVideoEntry,
  createBatchVideoEntryFromFile,
  createVideoBatchId,
  revokeBatchVideoObjectUrls,
} from "../../lib/videoBatch";
import {
  buildMergedPdfFileName,
  createPdfMergeEntryFromFile,
  createPdfMergeEntryFromLoadedDocument,
  LOADED_PDF_MERGE_ENTRY_ID,
  mergePdfFiles,
  type PdfMergeEntry,
} from "../../lib/pdfMergeBatch";
import {
  buildCompressedPdfFileName,
  compressPdfBytes,
} from "../../lib/pdfCompress";
import {
  areVideoShortenSnapshotsEqual,
  cloneVideoShortenSnapshot,
  type VideoShortenSnapshot,
} from "../../lib/videoShortenHistory";
import { isClientVideoExportEligible } from "../../lib/videoExportLimits";
import { VideoCaptionHeadlinePanel } from "../../../components/watermark/VideoCaptionHeadlinePanel";
import { VideoCaptionPanel } from "../../../components/watermark/VideoCaptionPanel";
import {
  type EditorPanelId,
  ToolIconRail,
} from "../../../components/watermark/ToolIconRail";
import {
  type DragEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";

const imageExportMimeType = "image/jpeg";
const imageExportQuality = IMAGE_EXPORT_JPEG_QUALITY;

function traceEditorBootstrap(
  message: string,
  details?: Record<string, unknown>,
) {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[editor-bootstrap]", message, details);
  }
}

type WatermarkType = "text" | "logo" | "signature";

type MediaKind = "image" | "video" | "pdf";

type WatermarkPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

type WatermarkMode = "single" | "tile";

type TileDensity = "sparse" | "medium" | "dense";

type TileAngle = 0 | 45 | 90 | 180;

type ImageTool = "blur" | "crop" | "resize" | "rotate";

type CropDragMode =
  | "move"
  | "new"
  | "resize-bottom"
  | "resize-bottom-left"
  | "resize-bottom-right"
  | "resize-left"
  | "resize-right"
  | "resize-top"
  | "resize-top-left"
  | "resize-top-right";

type WatermarkTemplateId =
  | "protect-dense"
  | "protect-light"
  | "subtle-corner";

type LogoWatermarkTemplateId =
  | "logo-corner"
  | "logo-protect-dense"
  | "logo-protect-light";

type CanvasSize = {
  height: number;
  width: number;
};

type PreviewCanvasSize = {
  height: number;
  pixelRatio: number;
  width: number;
};

type CustomPosition = {
  xPercent: number;
  yPercent: number;
};

type CropRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type ImageFrame = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type TextBounds = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

type BatchImageEntry = {
  blurStrokes: BlurStroke[];
  fileName: string;
  id: string;
  image: HTMLImageElement;
  objectUrl: string;
  resizeHeight: number;
  resizeWidth: number;
  rotationAngle: number;
  uploadedImageSize: CanvasSize;
};

type RgbaColor = {
  a: number;
  b: number;
  g: number;
  r: number;
};

type WatermarkSettingsSnapshot = {
  activeLogoLayerId?: string;
  activeTextLayerId?: string;
  backgroundRemovedLogoImage: HTMLImageElement | null;
  blurBrushSize: BlurBrushSize;
  blurStrokes: BlurStroke[];
  customPosition: CustomPosition | null;
  fontFamily: string;
  fontSizeScale: number;
  fontWeight?: TextWatermarkFontWeight;
  isLogoBackgroundRemoved: boolean;
  logoFileName: string;
  logoImage: HTMLImageElement | null;
  logoLayers?: LogoWatermarkLayer[];
  originalLogoImage: HTMLImageElement | null;
  textColor?: string;
  textLayers?: TextWatermarkLayer[];
  textShadowEnabled?: boolean;
  tileAngle: TileAngle;
  tileDensity: TileDensity;
  tileGap: number;
  watermarkMode: WatermarkMode;
  watermarkOpacity: number;
  watermarkPosition: WatermarkPosition;
  watermarkText: string;
  watermarkType: WatermarkType;
  pdfDocumentTool?: "signature" | "fill";
  pdfPageFillMap?: ReturnType<typeof serializePdfPageFillMap>;
  pdfPageSignatures?: ReturnType<typeof serializePdfPageSignatureMap>;
};

type SavedWatermarkPreset = {
  id: string;
  name: string;
  snapshot: WatermarkSettingsSnapshot;
};

type WatermarkTemplate = {
  density: TileDensity;
  fontFamily: string;
  fontSizeScale: number;
  icon: "center" | "corner" | "dense" | "signature" | "sparse";
  id: WatermarkTemplateId;
  label: string;
  mode: WatermarkMode;
  opacity: number;
  position: WatermarkPosition;
  tileAngle: TileAngle;
  tileGap: number;
};

type LogoWatermarkTemplate = {
  density: TileDensity;
  fontSizeScale: number;
  icon: "center" | "corner" | "dense" | "signature" | "sparse";
  id: LogoWatermarkTemplateId;
  label: string;
  mode: WatermarkMode;
  opacity: number;
  position: WatermarkPosition;
  tileAngle: TileAngle;
  tileGap: number;
};

type DrawableWatermark =
  | {
      fontFamily: string;
      fontSize: number;
      fontWeight: TextWatermarkFontWeight;
      height: number;
      kind: "text";
      text: string;
      textColor: string;
      textShadowEnabled: boolean;
      width: number;
    }
  | {
      height: number;
      image: HTMLImageElement;
      kind: "logo";
      width: number;
    };

const watermarkTypes: { label: string; value: WatermarkType }[] = [
  { label: "Text", value: "text" },
  { label: "Logo", value: "logo" },
  { label: "Signature", value: "signature" },
];

function isImageWatermarkType(watermarkType: WatermarkType) {
  return watermarkType === "logo" || watermarkType === "signature";
}

function getWatermarkTypeSegmentLabel(
  value: WatermarkType,
  mediaKind: MediaKind | null,
) {
  if (value === "signature" && mediaKind === "pdf") {
    return "Sign & Fill";
  }

  return watermarkTypes.find((entry) => entry.value === value)?.label ?? value;
}

const watermarkPositions: { label: string; value: WatermarkPosition }[] = [
  { label: "Top left", value: "top-left" },
  { label: "Top center", value: "top-center" },
  { label: "Top right", value: "top-right" },
  { label: "Center left", value: "center-left" },
  { label: "Center", value: "center" },
  { label: "Center right", value: "center-right" },
  { label: "Bottom left", value: "bottom-left" },
  { label: "Bottom center", value: "bottom-center" },
  { label: "Bottom right", value: "bottom-right" },
];

const watermarkModes: { label: string; value: WatermarkMode }[] = [
  { label: "Single", value: "single" },
  { label: "Tile", value: "tile" },
];

const tileDensities: {
  label: string;
  repetitionsAcross: number;
  value: TileDensity;
}[] = [
  { label: "Sparse", repetitionsAcross: 4.5, value: "sparse" },
  { label: "Medium", repetitionsAcross: 6.5, value: "medium" },
  { label: "Dense", repetitionsAcross: 9.5, value: "dense" },
];

const tileAngles: { label: string; value: TileAngle }[] = [
  { label: "0°", value: 0 },
  { label: "45°", value: 45 },
  { label: "90°", value: 90 },
  { label: "180°", value: 180 },
];

const defaultFontFamily = DEFAULT_WATERMARK_FONT_FAMILY;

const watermarkTemplates: WatermarkTemplate[] = [
  {
    density: "medium",
    fontFamily: defaultFontFamily,
    fontSizeScale: 25,
    icon: "corner",
    id: "subtle-corner",
    label: "Subtle corner",
    mode: "single",
    opacity: 55,
    position: "bottom-right",
    tileAngle: 45,
    tileGap: 120,
  },
  {
    density: "dense",
    fontFamily: defaultFontFamily,
    fontSizeScale: 20,
    icon: "dense",
    id: "protect-dense",
    label: "Protect (dense)",
    mode: "tile",
    opacity: 40,
    position: "bottom-right",
    tileAngle: 45,
    tileGap: 130,
  },
  {
    density: "sparse",
    fontFamily: defaultFontFamily,
    fontSizeScale: 20,
    icon: "sparse",
    id: "protect-light",
    label: "Protect (light)",
    mode: "tile",
    opacity: 40,
    position: "bottom-right",
    tileAngle: 45,
    tileGap: 130,
  },
];

const logoWatermarkTemplates: LogoWatermarkTemplate[] = [
  {
    density: "medium",
    fontSizeScale: 35,
    icon: "corner",
    id: "logo-corner",
    label: "Subtle corner",
    mode: "single",
    opacity: 60,
    position: "bottom-right",
    tileAngle: 45,
    tileGap: 120,
  },
  {
    density: "dense",
    fontSizeScale: 28,
    icon: "dense",
    id: "logo-protect-dense",
    label: "Protect (dense)",
    mode: "tile",
    opacity: 45,
    position: "bottom-right",
    tileAngle: 45,
    tileGap: 130,
  },
  {
    density: "sparse",
    fontSizeScale: 28,
    icon: "sparse",
    id: "logo-protect-light",
    label: "Protect (light)",
    mode: "tile",
    opacity: 45,
    position: "bottom-right",
    tileAngle: 45,
    tileGap: 130,
  },
];

function isEditorToolsReady(input: {
  image: HTMLImageElement | null;
  isPdfLoading: boolean;
  mediaKind: MediaKind | null;
  pdfPageCount: number;
  videoUrl: string;
}) {
  if (input.isPdfLoading) {
    return false;
  }

  if (input.mediaKind === "video") {
    return Boolean(input.videoUrl);
  }

  if (input.mediaKind === "pdf") {
    return input.pdfPageCount > 0 && Boolean(input.image);
  }

  if (input.mediaKind === "image") {
    return Boolean(input.image);
  }

  return false;
}

function isMainEditorTabAllowed(
  panel: EditorPanelId,
  kind: MediaKind | null,
) {
  if (!kind) {
    return true;
  }

  if (panel === "video") {
    return kind === "video";
  }

  if (panel === "pdfDocs" || panel === "signFill") {
    return kind === "pdf";
  }

  if (
    panel === "photos" ||
    panel === "watermark" ||
    panel === "effects" ||
    panel === "blur" ||
    panel === "crop" ||
    panel === "resize" ||
    panel === "rotate"
  ) {
    return kind === "image";
  }

  return true;
}

function normalizeRestoredEditorPanel(
  panel: EditorPanelId | null,
  mediaKind: MediaKind | null,
  watermarkType: WatermarkType,
): EditorPanelId | null {
  const rawPanel = panel as string | null;
  const resolvedPanel =
    rawPanel === "templates" || rawPanel === "watermark"
      ? mediaKind === "pdf"
        ? "pdfDocs"
        : "photos"
      : rawPanel === "effects" ||
          rawPanel === "blur" ||
          rawPanel === "crop" ||
          rawPanel === "resize" ||
          rawPanel === "rotate"
        ? "photos"
        : rawPanel === "signFill"
          ? "pdfDocs"
          : rawPanel === "caption"
            ? "video"
            : panel;

  if (mediaKind === "pdf" && watermarkType === "signature") {
    return "pdfDocs";
  }

  return resolvedPanel;
}

function normalizeRestoredPhotoTool(
  panel: EditorPanelId | string | null,
): PhotoToolId {
  if (panel === "effects") {
    return "filters";
  }

  if (
    panel === "blur" ||
    panel === "crop" ||
    panel === "resize" ||
    panel === "rotate"
  ) {
    return panel;
  }

  return "watermark";
}

function normalizeRestoredPdfTool(
  panel: EditorPanelId | string | null,
): PdfDocToolId {
  if (panel === "watermark" || panel === "templates") {
    return "watermark";
  }

  if (panel === "merge") {
    return "merge";
  }

  if (panel === "compress") {
    return "compress";
  }

  return "signFill";
}

function isPhotoImageTool(tool: PhotoToolId): tool is ImageTool {
  return (
    tool === "blur" ||
    tool === "crop" ||
    tool === "resize" ||
    tool === "rotate"
  );
}

const REAL_VIDEO_EXPORT_LOG = "[real-video-export]";

function logRealVideoExport(step: string, data?: Record<string, unknown>) {
  if (data) {
    console.log(`${REAL_VIDEO_EXPORT_LOG} ${step}`, data);
    return;
  }

  console.log(`${REAL_VIDEO_EXPORT_LOG} ${step}`);
}

function summarizeLogoLayersForExportLog(logoLayers: LogoWatermarkLayer[] | undefined) {
  return (logoLayers ?? []).map((layer) => ({
    customPosition: layer.customPosition,
    hasLogoImage: Boolean(layer.logoImage),
    id: layer.id,
    isForcedLayer: layer.id === FORCED_TILE_LAYER_ID,
    naturalHeight: layer.logoImage?.naturalHeight ?? null,
    naturalWidth: layer.logoImage?.naturalWidth ?? null,
    opacity: layer.opacity,
  }));
}

function summarizeTextLayersForExportLog(textLayers: TextWatermarkLayer[] | undefined) {
  return (textLayers ?? []).map((layer) => ({
    id: layer.id,
    text: layer.text,
    textPreview: layer.text.slice(0, 80),
  }));
}

function summarizeWatermarkSettingsForExportLog(settings: {
  logoLayers?: LogoWatermarkLayer[];
  textLayers?: TextWatermarkLayer[];
  watermarkType: string;
}) {
  const logoLayers = settings.logoLayers ?? [];

  return {
    forcedLayerPresent: logoLayers.some((layer) => layer.id === FORCED_TILE_LAYER_ID),
    forcedLayerSummary: logoLayers.find((layer) => layer.id === FORCED_TILE_LAYER_ID)
      ? summarizeLogoLayersForExportLog(logoLayers).find(
          (layer) => layer.isForcedLayer,
        )
      : null,
    hasForcedWatermarkOverlay: hasForcedWatermarkOverlay({ logoLayers }),
    logoLayerCount: logoLayers.length,
    logoLayers: summarizeLogoLayersForExportLog(logoLayers),
    textLayerCount: settings.textLayers?.length ?? 0,
    textLayers: summarizeTextLayersForExportLog(settings.textLayers),
    watermarkType: settings.watermarkType,
  };
}

async function sampleOverlayPngBytesCenter(
  overlayPngBytes: Uint8Array,
  width: number,
  height: number,
) {
  const blob = new Blob([new Uint8Array(overlayPngBytes)], { type: "image/png" });
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const context = canvas.getContext("2d");

  if (!context) {
    return {
      centerAlpha: null,
      centerRgb: null,
      decodeError: "Could not create sampling canvas.",
    };
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const centerX = Math.floor(canvas.width / 2);
  const centerY = Math.floor(canvas.height / 2);
  const sample = context.getImageData(centerX, centerY, 1, 1).data;

  return {
    centerAlpha: sample[3] ?? null,
    centerRgb: [sample[0] ?? 0, sample[1] ?? 0, sample[2] ?? 0],
    overlayPngByteLength: overlayPngBytes.byteLength,
    sampleHeight: canvas.height,
    sampleWidth: canvas.width,
  };
}

export default function WatermarkPage() {
  const pathname = usePathname();
  const router = useRouter();
  const isEditorRoute =
    pathname === "/watermark" || pathname.startsWith("/watermark/");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCheckerboardRef = useRef<HTMLDivElement>(null);
  const previewPanDragRef = useRef<{
    pointerId: number;
    scrollLeft: number;
    scrollTop: number;
    startX: number;
    startY: number;
  } | null>(null);
  const videoOverlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoPreviewRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formatPhotosInputRef = useRef<HTMLInputElement>(null);
  const formatPdfInputRef = useRef<HTMLInputElement>(null);
  const formatVideoInputRef = useRef<HTMLInputElement>(null);
  const appendImagesInputRef = useRef<HTMLInputElement>(null);
  const appendVideosInputRef = useRef<HTMLInputElement>(null);
  const appendPdfsInputRef = useRef<HTMLInputElement>(null);
  const pendingMergedVideoPreviewRef = useRef(false);
  const videoShortenOriginalRef = useRef<VideoShortenSnapshot | null>(null);
  const videoShortenUndoRef = useRef<VideoShortenSnapshot[]>([]);
  const videoShortenRedoRef = useRef<VideoShortenSnapshot[]>([]);
  const filePickerIntentRef = useRef<"append" | "replace">("replace");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const logoObjectUrlRef = useRef<string | null>(null);
  const textBoundsRef = useRef<TextBounds | null>(null);
  const layerBoundsRef = useRef<Map<string, TextBounds>>(new Map());
  const imageFrameRef = useRef<ImageFrame | null>(null);
  const isDraggingRef = useRef(false);
  const draggingLayerIdRef = useRef<string | null>(null);
  const watermarkDragOverrideRef = useRef<{
    customPosition: CustomPosition;
    layerId: string;
  } | null>(null);
  const watermarkDragRafRef = useRef<number | null>(null);
  const isDraggingCaptionRef = useRef(false);
  const draggingCaptionLayerIdRef = useRef<string | null>(null);
  const captionBoundsRef = useRef<Map<string, TextBounds>>(new Map());
  const settingsHistoryRef = useRef<WatermarkSettingsSnapshot[]>([]);
  const settingsHistoryIndexRef = useRef(0);
  const settingsHistoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isApplyingSettingsHistoryRef = useRef(false);
  const shouldIgnoreManualSettingsRef = useRef(false);
  const manualSettingsGuardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const videoExportCancelRef = useRef(false);
  const videoExportAbortControllerRef = useRef<AbortController | null>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const pdfBytesRef = useRef<Uint8Array | null>(null);
  const sessionRestoreRef = useRef<StoredEditorSessionMeta | null>(null);
  const isRestoringSessionRef = useRef(false);
  const sessionSaveRef = useRef<(() => Promise<void>) | null>(null);
  const mediaLoadGenerationRef = useRef(0);
  const hasBootstrappedEditorRef = useRef(false);
  const resetAnonymousEditorEntryRef = useRef<() => void>(() => {});
  const cropDragRef = useRef<{
    aspectRatio?: number;
    mode: CropDragMode;
    origin: { x: number; y: number };
    rect: CropRect;
  } | null>(null);
  const resizeDragRef = useRef<{
    mode: CropDragMode;
    origin: { x: number; y: number };
    startHeight: number;
    startWidth: number;
  } | null>(null);
  const blurDragRef = useRef<{ strokeId: string } | null>(null);
  const fillFieldBoundsRef = useRef<Record<string, FillFieldBounds>>({});
  const fillDragRef = useRef<{
    fieldId: string;
    mode: "move" | "resize";
    origin: { x: number; y: number };
    resizeHandle?: FillResizeHandle;
    startField: PdfFillTextField;
  } | null>(null);
  const signatureDragRef = useRef<{
    mode: "move" | "resize";
    origin: { x: number; y: number };
    placementId: string;
    resizeHandle?: PlacementResizeHandle;
    startBounds: TextBounds;
    startCustomPosition: { xPercent: number; yPercent: number };
    startFontSizeScale: number;
  } | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageBatch, setImageBatch] = useState<BatchImageEntry[]>([]);
  const [activeBatchImageId, setActiveBatchImageId] = useState<string | null>(
    null,
  );
  const [videoBatch, setVideoBatch] = useState<BatchVideoEntry[]>([]);
  const [activeBatchVideoId, setActiveBatchVideoId] = useState<string | null>(
    null,
  );
  const [isVideoEditProcessing, setIsVideoEditProcessing] = useState(false);
  const [videoShortenHistoryTick, setVideoShortenHistoryTick] = useState(0);
  const [mediaKind, setMediaKind] = useState<MediaKind | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfPages, setPdfPages] = useState<PdfPageThumbnail[]>([]);
  const [activePdfPageId, setActivePdfPageId] = useState<string | null>(null);
  const [pdfPageSignatures, setPdfPageSignatures] = useState<PdfPageSignatureMap>({});
  const [pdfPageFillMap, setPdfPageFillMap] = useState<PdfPageFillMap>({});
  const [pdfDocumentTool, setPdfDocumentTool] = useState<"signature" | "fill">(
    "signature",
  );
  const [activeFillFieldId, setActiveFillFieldId] = useState<string | null>(null);
  const [showServerVideoCreditGate, setShowServerVideoCreditGate] =
    useState(false);
  const [isFillFieldHovering, setIsFillFieldHovering] = useState(false);
  const [fillHoverResizeHandle, setFillHoverResizeHandle] =
    useState<FillResizeHandle | null>(null);
  const [fillHoverFrameAction, setFillHoverFrameAction] =
    useState<FillFrameAction | null>(null);
  const [signatureHoverResizeHandle, setSignatureHoverResizeHandle] =
    useState<PlacementResizeHandle | null>(null);
  const [signatureHoverFrameAction, setSignatureHoverFrameAction] =
    useState<PlacementFrameAction | null>(null);
  const [isSignaturePlacementHovering, setIsSignaturePlacementHovering] =
    useState(false);
  const [showUnsignedPdfExportConfirm, setShowUnsignedPdfExportConfirm] =
    useState(false);
  const [showEditorExitConfirm, setShowEditorExitConfirm] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfExportProgress, setPdfExportProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [fileName, setFileName] = useState("");
  const [batchExportProgress, setBatchExportProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoSize, setVideoSize] = useState<CanvasSize | null>(null);
  const [videoFileSize, setVideoFileSize] = useState(0);
  const [videoOverlaySize, setVideoOverlaySize] = useState<CanvasSize>({
    height: 0,
    width: 0,
  });
  const [videoPreviewTime, setVideoPreviewTime] = useState(0);
  const [videoTrimStartSeconds, setVideoTrimStartSeconds] = useState(0);
  const [videoTrimEndSeconds, setVideoTrimEndSeconds] = useState(0);
  const [videoTrimAppliedStartSeconds, setVideoTrimAppliedStartSeconds] =
    useState(0);
  const [videoTrimAppliedEndSeconds, setVideoTrimAppliedEndSeconds] = useState(0);
  const [videoCropSavedNotice, setVideoCropSavedNotice] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [activeImageTool, setActiveImageTool] = useState<ImageTool | null>(null);
  const [blurBrushSize, setBlurBrushSize] = useState<BlurBrushSize>("medium");
  const [blurStrokes, setBlurStrokes] = useState<BlurStroke[]>([]);
  const [uploadedImageSize, setUploadedImageSize] = useState<CanvasSize | null>(
    null,
  );
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [resizeWidth, setResizeWidth] = useState(0);
  const [resizeHeight, setResizeHeight] = useState(0);
  const [isAspectRatioLocked, setIsAspectRatioLocked] = useState(true);
  const [isCropAspectRatioLocked, setIsCropAspectRatioLocked] = useState(false);
  const [resizeUnit, setResizeUnit] = useState<ResizeUnit>("px");
  const [resizeScaleMode, setResizeScaleMode] =
    useState<ResizeScaleMode>("contain");
  const [resizeWarning, setResizeWarning] = useState("");
  const [rotationAngle, setRotationAngle] = useState(0);
  const [activeImageEffect, setActiveImageEffect] =
    useState<ImageEffectId>("none");
  const [effectBorderWidth, setEffectBorderWidth] =
    useState<EffectBorderWidth>("medium");
  const [effectBorderColor, setEffectBorderColor] =
    useState<EffectBorderColor>("ink");
  const [effectExposure, setEffectExposure] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportPreparing, setIsExportPreparing] = useState(false);
  const [isRestoringAnonymousDraft, setIsRestoringAnonymousDraft] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportError, setExportError] = useState("");
  const [exportNotice, setExportNotice] = useState("");
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEmailConfirmed, setIsEmailConfirmed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [showWatermarkedExportUpsell, setShowWatermarkedExportUpsell] =
    useState(false);
  const [showExportLoginGate, setShowExportLoginGate] = useState(false);
  const [loginGatePhase, setLoginGatePhase] = useState<ExportLoginGatePhase>("saving");
  const [loginGateError, setLoginGateError] = useState("");
  const pendingExportRef = useRef<(() => void) | null>(null);
  const resumeExportAfterLoginRef = useRef(false);
  const anonymousDraftRestoreRef = useRef<AnonymousExportDraftState | null>(null);
  const pendingDraftRestoreResolverRef = useRef<(() => void) | null>(null);
  const [exportServerStage, setExportServerStage] =
    useState<ServerVideoExportStage | null>(null);
  const [longVideoProcessingDetail, setLongVideoProcessingDetail] = useState<
    string | null
  >(null);
  const [isServerVideoExport, setIsServerVideoExport] = useState(false);
  const [watermarkType, setWatermarkType] = useState<WatermarkType>("text");
  const initialTextLayer = createDefaultTextLayer();
  const initialLogoLayer = createDefaultLogoLayer();
  const [textLayers, setTextLayers] = useState<TextWatermarkLayer[]>([
    initialTextLayer,
  ]);
  const [logoLayers, setLogoLayers] = useState<LogoWatermarkLayer[]>([
    initialLogoLayer,
  ]);
  const [activeTextLayerId, setActiveTextLayerId] = useState(initialTextLayer.id);
  const [activeLogoLayerId, setActiveLogoLayerId] = useState(initialLogoLayer.id);
  const [watermarkText, setWatermarkText] = useState("");
  const [originalLogoImage, setOriginalLogoImage] =
    useState<HTMLImageElement | null>(null);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [backgroundRemovedLogoImage, setBackgroundRemovedLogoImage] =
    useState<HTMLImageElement | null>(null);
  const [logoFileName, setLogoFileName] = useState("");
  const [isLogoBackgroundRemoved, setIsLogoBackgroundRemoved] = useState(false);
  const [logoBackgroundMessage, setLogoBackgroundMessage] = useState("");
  const [activeTextTemplate, setActiveTextTemplate] =
    useState<WatermarkTemplateId | null>(null);
  const [activeLogoTemplate, setActiveLogoTemplate] =
    useState<LogoWatermarkTemplateId | null>(null);
  const [watermarkMode, setWatermarkMode] = useState<WatermarkMode>("single");
  const [watermarkPosition, setWatermarkPosition] =
    useState<WatermarkPosition>("top-left");
  const [customPosition, setCustomPosition] = useState<CustomPosition | null>(
    initialTextLayer.customPosition
      ? { ...initialTextLayer.customPosition }
      : null,
  );
  const [tileDensity, setTileDensity] = useState<TileDensity>("medium");
  const [tileGap, setTileGap] = useState(120);
  const [tileAngle, setTileAngle] = useState<TileAngle>(45);
  const [watermarkOpacity, setWatermarkOpacity] = useState(
    initialTextLayer.opacity,
  );
  const [fontSizeScale, setFontSizeScale] = useState(
    initialTextLayer.fontSizeScale,
  );
  const [fontFamily, setFontFamily] = useState(initialTextLayer.fontFamily);
  const [fontWeight, setFontWeight] = useState<TextWatermarkFontWeight>(
    initialTextLayer.fontWeight,
  );
  const [textColor, setTextColor] = useState(DEFAULT_TEXT_WATERMARK_COLOR);
  const [textShadowEnabled, setTextShadowEnabled] = useState(
    DEFAULT_TEXT_SHADOW_ENABLED,
  );
  const [uploadError, setUploadError] = useState("");
  const [logoError, setLogoError] = useState("");
  const [isDraggingWatermark, setIsDraggingWatermark] = useState(false);
  const [, setWatermarkDragFrame] = useState(0);
  const [isWatermarkHovering, setIsWatermarkHovering] = useState(false);
  const [isDraggingCaption, setIsDraggingCaption] = useState(false);
  const [isCaptionHovering, setIsCaptionHovering] = useState(false);
  const [showWatermarkDragHint, setShowWatermarkDragHint] = useState(false);
  const [watermarkDragHintPos, setWatermarkDragHintPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [settingsHistoryLength, setSettingsHistoryLength] = useState(0);
  const [settingsHistoryIndex, setSettingsHistoryIndex] = useState(0);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [savedPresets, setSavedPresets] = useState<SavedWatermarkPreset[]>([]);
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([]);
  const [activeSignatureId, setActiveSignatureId] = useState<string | null>(
    null,
  );
  const [activeSignaturePlacementId, setActiveSignaturePlacementId] = useState<
    string | null
  >(null);
  const [isSignatureDropTarget, setIsSignatureDropTarget] = useState(false);
  const [previewBaseSize, setPreviewBaseSize] = useState<PreviewCanvasSize>({
    height: 600,
    pixelRatio: 1,
    width: 900,
  });
  const [activeEditorPanel, setActiveEditorPanel] =
    useState<EditorPanelId | null>(null);
  const [formatUploadPrompt, setFormatUploadPrompt] =
    useState<EditorFormatUploadKind | null>(null);
  const [activePhotoTool, setActivePhotoTool] = useState<PhotoToolId>("watermark");
  const [activePdfTool, setActivePdfTool] = useState<PdfDocToolId>("signFill");
  const [pdfMergeBatch, setPdfMergeBatch] = useState<PdfMergeEntry[]>([]);
  const [isPdfMergeProcessing, setIsPdfMergeProcessing] = useState(false);
  const [isPdfCompressProcessing, setIsPdfCompressProcessing] = useState(false);
  const [lastPdfCompressResult, setLastPdfCompressResult] =
    useState<PdfCompressStats | null>(null);
  const [previewZoomPercent, setPreviewZoomPercent] = useState(PREVIEW_ZOOM_DEFAULT);
  const [mobileControlsExpanded, setMobileControlsExpanded] = useState(false);

  useEffect(() => {
    if (mediaKind) {
      setMobileControlsExpanded(false);
    }
  }, [mediaKind]);
  const previewZoomScale = previewZoomPercent / 100;
  const canvasSize: PreviewCanvasSize = {
    height: Math.max(240, Math.floor(previewBaseSize.height * previewZoomScale)),
    pixelRatio: previewBaseSize.pixelRatio,
    width: Math.max(240, Math.floor(previewBaseSize.width * previewZoomScale)),
  };
  const [isPreviewPanning, setIsPreviewPanning] = useState(false);
  const [activeWatermarkTool, setActiveWatermarkTool] =
    useState<WatermarkToolId>("text");
  const [activeVideoTool, setActiveVideoTool] = useState<VideoToolId>("overview");
  const [videoCaptionLayers, setVideoCaptionLayers] = useState<VideoCaptionLayer[]>(
    createInitialVideoCaptionLayers,
  );
  const [activeVideoCaptionLayerId, setActiveVideoCaptionLayerId] = useState(
    () => createInitialVideoCaptionLayers()[0]!.id,
  );
  const [videoBlurRegions, setVideoBlurRegions] = useState<VideoBlurRegion[]>(
    [],
  );
  const [activeVideoBlurRegionId, setActiveVideoBlurRegionId] = useState<
    string | null
  >(null);
  const [videoBlurBrushSize, setVideoBlurBrushSize] =
    useState<BlurBrushSize>("medium");
  const videoBlurDragRef = useRef<{ strokeId: string } | null>(null);
  const [captionsMasterEnabled, setCaptionsMasterEnabled] = useState(true);

  async function finalizeCleanExportBilling(auth: ExportAuthorizationContext) {
    const billing = await completeCleanExportBilling({ auth });
    applyExportBillingToUi({
      auth,
      billing,
      setCreditBalance,
      setExportNotice,
    });
  }

  function applyAuthorizeNotice(auth: ExportAuthorizationContext) {
    if (auth.costNotice) {
      setExportNotice(auth.costNotice);
    } else if (auth.authorizeNotice) {
      setExportNotice(auth.authorizeNotice);
    }

    if (typeof auth.balance === "number") {
      setCreditBalance(auth.balance);
    }
  }

  function getVideoExportFileMeta(): ExportFileMeta {
    return {
      durationSeconds: getVideoTrimDuration(
        videoTrimAppliedStartSeconds,
        videoTrimAppliedEndSeconds,
        videoDuration,
      ),
      fileSizeBytes: videoFileSize,
      height: videoSize?.height,
      width: videoSize?.width,
    };
  }

  function seekVideoPreview(seconds: number, respectTrim = false) {
    const clamped = respectTrim
      ? clampVideoPreviewTimeToTrim(
          seconds,
          videoTrimStartSeconds,
          videoTrimEndSeconds,
          videoDuration,
        )
      : Math.min(
          videoDuration,
          Math.max(0, Number.isFinite(seconds) ? seconds : 0),
        );
    const video = videoElementRef.current;

    if (video) {
      video.currentTime = clamped;
    }

    setVideoPreviewTime(clamped);
  }

  function clearVideoShortenHistory() {
    videoShortenOriginalRef.current = null;
    videoShortenUndoRef.current = [];
    videoShortenRedoRef.current = [];
    setVideoShortenHistoryTick((tick) => tick + 1);
  }

  function captureVideoShortenSnapshot(): VideoShortenSnapshot | null {
    const activeEntry =
      videoBatch.find((entry) => entry.id === activeBatchVideoId) ??
      videoBatch[0];

    if (!activeEntry) {
      return null;
    }

    return {
      captionLayers: videoCaptionLayers.map((layer) => ({ ...layer })),
      entry: {
        duration: activeEntry.duration,
        file: activeEntry.file,
        fileName: activeEntry.fileName,
        fileSize: activeEntry.fileSize,
        height: activeEntry.height,
        id: activeEntry.id,
        width: activeEntry.width,
      },
      textLayers: textLayers.map((layer) => ({ ...layer })),
    };
  }

  function setVideoShortenOriginalFromEntry(entry: BatchVideoEntry) {
    videoShortenOriginalRef.current = {
      captionLayers: videoCaptionLayers.map((layer) => ({ ...layer })),
      entry: {
        duration: entry.duration,
        file: entry.file,
        fileName: entry.fileName,
        fileSize: entry.fileSize,
        height: entry.height,
        id: entry.id,
        width: entry.width,
      },
      textLayers: textLayers.map((layer) => ({ ...layer })),
    };
    videoShortenUndoRef.current = [];
    videoShortenRedoRef.current = [];
    setVideoShortenHistoryTick((tick) => tick + 1);
  }

  async function restoreVideoShortenSnapshot(snapshot: VideoShortenSnapshot) {
    const previousUrls = videoBatch.map((entry) => entry.objectUrl);
    const entry = await createBatchVideoEntryFromFile(
      snapshot.entry.file,
      snapshot.entry.id,
      {
        height: snapshot.entry.height,
        width: snapshot.entry.width,
      },
    );

    for (const url of previousUrls) {
      if (url !== entry.objectUrl) {
        URL.revokeObjectURL(url);
      }
    }

    setTextLayers(snapshot.textLayers.map((layer) => ({ ...layer })));
    setVideoCaptionLayers(snapshot.captionLayers.map((layer) => ({ ...layer })));
    setVideoBatch([entry]);
    applyActiveBatchVideoEntry(entry);
    setVideoCropSavedNotice(true);
    pendingMergedVideoPreviewRef.current = true;
    setVideoPreviewTime(0);
    setVideoShortenHistoryTick((tick) => tick + 1);
  }

  function pushVideoShortenUndoSnapshot() {
    const snapshot = captureVideoShortenSnapshot();

    if (!snapshot) {
      return;
    }

    videoShortenUndoRef.current.push(cloneVideoShortenSnapshot(snapshot));
    videoShortenRedoRef.current = [];
    setVideoShortenHistoryTick((tick) => tick + 1);
  }

  async function undoVideoShorten() {
    if (!videoShortenUndoRef.current.length) {
      return;
    }

    const currentSnapshot = captureVideoShortenSnapshot();

    if (currentSnapshot) {
      videoShortenRedoRef.current.push(cloneVideoShortenSnapshot(currentSnapshot));
    }

    const previousSnapshot = videoShortenUndoRef.current.pop()!;

    try {
      await restoreVideoShortenSnapshot(previousSnapshot);
      setExportNotice("Restored the previous shortened clip.");
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Could not undo the last shorten.",
      );
    }
  }

  async function redoVideoShorten() {
    if (!videoShortenRedoRef.current.length) {
      return;
    }

    const currentSnapshot = captureVideoShortenSnapshot();

    if (currentSnapshot) {
      videoShortenUndoRef.current.push(cloneVideoShortenSnapshot(currentSnapshot));
    }

    const nextSnapshot = videoShortenRedoRef.current.pop()!;

    try {
      await restoreVideoShortenSnapshot(nextSnapshot);
      setExportNotice("Restored the next shortened clip.");
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Could not redo the shorten step.",
      );
    }
  }

  async function restoreOriginalVideoLength() {
    const originalSnapshot = videoShortenOriginalRef.current;

    if (!originalSnapshot) {
      resetVideoTrim();
      return;
    }

    const currentSnapshot = captureVideoShortenSnapshot();

    if (
      currentSnapshot &&
      !areVideoShortenSnapshotsEqual(currentSnapshot, originalSnapshot)
    ) {
      videoShortenUndoRef.current.push(cloneVideoShortenSnapshot(currentSnapshot));
      videoShortenRedoRef.current = [];
    }

    try {
      await restoreVideoShortenSnapshot(originalSnapshot);
      setExportNotice("Restored the original full length video.");
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Could not restore the original video.",
      );
    }
  }

  function resetVideoTrim() {
    const endSeconds = resolveVideoTrimEnd(undefined, videoDuration);
    setVideoTrimStartSeconds(0);
    setVideoTrimEndSeconds(endSeconds);
    setVideoCropSavedNotice(false);
    seekVideoPreview(videoPreviewTime, true);
  }

  function beginReshortenSession() {
    setActiveEditorPanel("video");
    setActiveVideoTool("trim");
    setVideoCropSavedNotice(false);

    const endSeconds = resolveVideoTrimEnd(undefined, videoDuration);
    setVideoTrimStartSeconds(0);
    setVideoTrimEndSeconds(endSeconds);
    setVideoTrimAppliedStartSeconds(0);
    setVideoTrimAppliedEndSeconds(endSeconds);
    seekVideoPreview(0, false);
    setExportNotice("Drag the timeline handles, then apply shorten.");
  }

  function saveVideoCrop() {
    void applyVideoShorten();
  }

  function shiftVideoEditorTimingsAfterTrim(
    trimStart: number,
    trimEnd: number,
  ) {
    setTextLayers((current) =>
      current.flatMap((layer) => {
        const shifted = shiftTimedVisibilityAfterTrim(layer, trimStart, trimEnd);
        return shifted ? [shifted] : [];
      }),
    );
    setVideoCaptionLayers((current) =>
      current.flatMap((layer) => {
        const shifted = shiftTimedVisibilityAfterTrim(layer, trimStart, trimEnd);
        return shifted ? [shifted] : [];
      }),
    );
    setVideoBlurRegions((current) =>
      current.flatMap((region) => {
        const shifted = shiftTimedVisibilityAfterTrim(region, trimStart, trimEnd);
        return shifted ? [shifted] : [];
      }),
    );
  }

  function initializeVideoBlurState(durationSeconds: number) {
    const firstRegion = createDefaultVideoBlurRegion(durationSeconds, 0);
    setVideoBlurRegions([firstRegion]);
    setActiveVideoBlurRegionId(firstRegion.id);
    videoBlurDragRef.current = null;
  }

  function getActiveVideoBlurRegion() {
    return (
      videoBlurRegions.find((region) => region.id === activeVideoBlurRegionId) ??
      videoBlurRegions[0] ??
      null
    );
  }

  function updateActiveVideoBlurRegion(
    patch: Partial<VideoBlurRegion> | ((region: VideoBlurRegion) => VideoBlurRegion),
  ) {
    const activeRegion = getActiveVideoBlurRegion();

    if (!activeRegion) {
      return;
    }

    setVideoBlurRegions((current) =>
      current.map((region) => {
        if (region.id !== activeRegion.id) {
          return region;
        }

        return typeof patch === "function"
          ? patch(region)
          : { ...region, ...patch };
      }),
    );
  }

  function updateVideoBlurRegionStrokes(
    regionId: string,
    updater: (strokes: BlurStroke[]) => BlurStroke[],
  ) {
    setVideoBlurRegions((current) =>
      current.map((region) =>
        region.id === regionId
          ? { ...region, strokes: updater(region.strokes) }
          : region,
      ),
    );
  }

  function ensureVideoBlurRegionsInitialized() {
    if (videoDuration <= 0 || videoBlurRegions.length > 0) {
      return;
    }

    initializeVideoBlurState(videoDuration);
  }

  function addVideoBlurRegion() {
    const nextRegion = createDefaultVideoBlurRegion(
      videoDuration,
      videoBlurRegions.length,
    );
    setVideoBlurRegions((current) => [...current, nextRegion]);
    setActiveVideoBlurRegionId(nextRegion.id);
  }

  function removeVideoBlurRegion(regionId: string) {
    if (videoBlurRegions.length <= 1) {
      return;
    }

    const remaining = videoBlurRegions.filter((region) => region.id !== regionId);
    setVideoBlurRegions(remaining);

    if (activeVideoBlurRegionId === regionId) {
      setActiveVideoBlurRegionId(remaining[0]!.id);
    }
  }

  function isVideoBlurInteractionActive() {
    return (
      mediaKind === "video" &&
      activeEditorPanel === "video" &&
      activeVideoTool === "blur" &&
      Boolean(videoUrl)
    );
  }

  function isVideoWatermarkInteractionActive() {
    return (
      mediaKind === "video" &&
      activeEditorPanel === "video" &&
      activeVideoTool === "watermark" &&
      Boolean(videoUrl)
    );
  }

  function shouldPaintVideoWatermarkPreview() {
    return isVideoWatermarkInteractionActive();
  }

  function isVideoCanvasInteractionActive() {
    return (
      isVideoCaptionInteractionActive() ||
      isVideoBlurInteractionActive() ||
      isVideoWatermarkInteractionActive()
    );
  }

  function getVideoPoint(
    event: PointerEvent<HTMLCanvasElement>,
    options: { requireInside?: boolean } = {},
  ) {
    const video = videoElementRef.current;

    if (!video || !videoSize) {
      return null;
    }

    const { height: naturalHeight, width: naturalWidth } =
      getVideoNaturalDimensions(video, videoSize.width, videoSize.height);
    const mapped = mapClientPointToVideoNatural(
      event.clientX,
      event.clientY,
      video,
      naturalWidth,
      naturalHeight,
    );

    if (!mapped) {
      return null;
    }

    if (options.requireInside && !mapped.inside) {
      return null;
    }

    return {
      x: mapped.x,
      y: mapped.y,
    };
  }

  function handleVideoBlurPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const point = getVideoPoint(event, { requireInside: true });
    const activeRegion = getActiveVideoBlurRegion();

    if (!point || !activeRegion || !videoSize) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const strokeId = crypto.randomUUID();
    videoBlurDragRef.current = { strokeId };

    updateVideoBlurRegionStrokes(activeRegion.id, (current) => [
      ...current,
      {
        brushSize: videoBlurBrushSize,
        id: strokeId,
        points: [point],
      },
    ]);

    if (activeRegion.strokes.length === 0) {
      updateActiveVideoBlurRegion((region) => ({
        ...region,
        visibleFromSeconds: Math.min(region.visibleFromSeconds, videoPreviewTime),
        visibleUntilSeconds: Math.max(
          region.visibleUntilSeconds,
          videoPreviewTime + 0.25,
        ),
      }));
    }
  }

  function handleVideoBlurPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const drag = videoBlurDragRef.current;
    const point = getVideoPoint(event);
    const activeRegion = getActiveVideoBlurRegion();

    if (!drag || !point || !activeRegion || !videoSize) {
      return;
    }

    event.preventDefault();

    updateVideoBlurRegionStrokes(activeRegion.id, (current) =>
      current.map((stroke) => {
        if (stroke.id !== drag.strokeId) {
          return stroke;
        }

        const lastPoint = stroke.points[stroke.points.length - 1];

        if (lastPoint) {
          const deltaX = point.x - lastPoint.x;
          const deltaY = point.y - lastPoint.y;
          const minDistance =
            getBlurBrushRadius(
              stroke.brushSize,
              videoSize.width,
              videoSize.height,
            ) * 0.15;

          if (deltaX * deltaX + deltaY * deltaY < minDistance * minDistance) {
            return stroke;
          }
        }

        return {
          ...stroke,
          points: [...stroke.points, point],
        };
      }),
    );
  }

  function handleVideoBlurPointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (!videoBlurDragRef.current) {
      return;
    }

    videoBlurDragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function hasVideoBlurToExport() {
    return videoBlurRegions.some((region) => region.strokes.length > 0);
  }

  async function applyVideoShorten() {
    const range = resolveVideoTrimRange(
      videoTrimStartSeconds,
      videoTrimEndSeconds,
      videoDuration,
    );

    if (
      !isVideoTrimActive(
        range.startSeconds,
        range.endSeconds,
        videoDuration,
      )
    ) {
      setVideoTrimAppliedStartSeconds(range.startSeconds);
      setVideoTrimAppliedEndSeconds(range.endSeconds);
      setVideoCropSavedNotice(true);
      return;
    }

    const activeEntry =
      videoBatch.find((entry) => entry.id === activeBatchVideoId) ??
      videoBatch[0];

    if (!activeEntry) {
      setUploadError("Load a video before shortening.");
      return;
    }

    pushVideoShortenUndoSnapshot();

    setIsVideoEditProcessing(true);
    setUploadError("");
    setExportNotice("");

    try {
      let trimmedBlob: Blob;

      if (
        isClientVideoExportEligible(
          activeEntry.duration,
          activeEntry.width,
          activeEntry.height,
        )
      ) {
        trimmedBlob = await trimVideoBlob({
          endSeconds: range.endSeconds,
          fileName: activeEntry.fileName,
          startSeconds: range.startSeconds,
          videoBlob: activeEntry.file,
        });
      } else {
        const response = await fetch("/api/watermark/video/edit", {
          body: JSON.stringify({
            action: "trim",
            endSeconds: range.endSeconds,
            fileName: activeEntry.fileName,
            startSeconds: range.startSeconds,
            videoBase64: await blobToBase64(activeEntry.file),
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const payload = (await response.json()) as {
          error?: string;
          fileName?: string;
          videoBase64?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Video shorten failed.");
        }

        trimmedBlob = base64ToVideoFile(
          payload.videoBase64!,
          payload.fileName ??
            activeEntry.fileName.replace(/(\.[^.]+)?$/, "-shortened.mp4"),
        );
      }

      shiftVideoEditorTimingsAfterTrim(range.startSeconds, range.endSeconds);

      const trimmedFileName = activeEntry.fileName.replace(
        /(\.[^.]+)?$/,
        "-shortened.mp4",
      );
      const trimmedEntry = await createBatchVideoEntryFromFile(
        new File([trimmedBlob], trimmedFileName, { type: trimmedBlob.type }),
        createVideoBatchId(),
        {
          height: activeEntry.height,
          width: activeEntry.width,
        },
      );

      const nextBatch = videoBatch.map((entry) =>
        entry.id === activeEntry.id ? trimmedEntry : entry,
      );
      setVideoBatch(nextBatch);
      applyActiveBatchVideoEntry(trimmedEntry);
      setVideoCropSavedNotice(true);
      pendingMergedVideoPreviewRef.current = true;
      setVideoPreviewTime(0);
      setExportNotice(
        "Video shortened. Adjust the timeline and apply again if you need it shorter.",
      );
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Video shorten failed. Please try again.",
      );
    } finally {
      setIsVideoEditProcessing(false);
    }
  }

  function initializeVideoTrimState(durationSeconds: number) {
    const endSeconds = resolveVideoTrimEnd(undefined, durationSeconds);
    setVideoTrimStartSeconds(0);
    setVideoTrimEndSeconds(endSeconds);
    setVideoTrimAppliedStartSeconds(0);
    setVideoTrimAppliedEndSeconds(endSeconds);
    setVideoCropSavedNotice(false);
  }

  function getWatermarkedExportUpsellContext(
    overrides?: Partial<WatermarkedExportUpsellContext>,
  ) {
    const fileType = overrides?.fileType ?? getCurrentExportFileType();
    const photoCount =
      mediaKind === "image" && imageBatch.length >= 2 ? imageBatch.length : 1;
    const exportSignatureMap = getPdfPageSignaturesWithActivePersisted();
    const exportFillMap = getPdfPageFillMapWithActivePersisted();

    const videoFileMeta =
      mediaKind === "video" && videoSize && videoFileSize > 0
        ? getVideoExportFileMeta()
        : undefined;
    const videoExportRoute =
      mediaKind === "video" && videoSize
        ? getVideoExportRoute(
            exportVideoDuration,
            videoSize.width,
            videoSize.height,
            videoFileSize > 0 ? videoFileSize : Number.MAX_SAFE_INTEGER,
          )
        : null;

    return {
      creditBalance: overrides?.creditBalance ?? creditBalance,
      estimatedExportCost:
        overrides?.estimatedExportCost ??
        estimateClientExportCost(fileType, {
          fillMap: mediaKind === "pdf" ? exportFillMap : undefined,
          fillPageCount:
            mediaKind === "pdf" ? countFillPages(exportFillMap) : undefined,
          pdfBillingMode:
            mediaKind === "pdf"
              ? getPdfBillingMode(getPdfWatermarkSettings())
              : undefined,
          pdfPageCount,
          photoCount,
          signatureMap: mediaKind === "pdf" ? exportSignatureMap : undefined,
          videoFileMeta,
        }),
      fileType,
      isAuthenticated:
        overrides?.isAuthenticated ?? (isAuthenticated && isEmailConfirmed),
      videoServerRouted:
        overrides?.videoServerRouted ??
        (videoExportRoute ? isServerSideVideoExportRoute(videoExportRoute) : false),
    };
  }

  function isPdfSignFillMode() {
    return (
      mediaKind === "pdf" &&
      activeEditorPanel === "pdfDocs" &&
      activePdfTool === "signFill"
    );
  }

  function isPdfWatermarkMode() {
    return (
      mediaKind === "pdf" &&
      activeEditorPanel === "pdfDocs" &&
      activePdfTool === "watermark"
    );
  }

  async function collectAnonymousExportDraftPayload() {
    if (!mediaKind) {
      throw new Error("Load a file before exporting.");
    }

    const blobsByKey: Record<string, Blob> = {};
    const files: Array<{
      contentType: string;
      fileKey: string;
      fileName: string;
      sizeBytes: number;
    }> = [];

    let draftInput: BuildAnonymousExportDraftInput;

    if (mediaKind === "image" && imageBatch.length >= 2) {
      const nextBatch = persistActiveBatchEntry(imageBatch, activeBatchImageId);
      const batchEntries = nextBatch.map((entry) => {
        const fileKey = entry.id;
        return {
          blurBrushSize,
          blurStrokes: cloneBlurStrokes(entry.blurStrokes),
          fileKey,
          fileName: entry.fileName,
          id: entry.id,
          imageEffectSettings: getImageEffectSettings(),
          resizeHeight: entry.resizeHeight,
          resizeWidth: entry.resizeWidth,
          rotationAngle: entry.rotationAngle,
          uploadedImageSize: entry.uploadedImageSize,
        };
      });

      for (const entry of nextBatch) {
        const blob = await fetch(entry.objectUrl).then((response) => response.blob());
        blobsByKey[entry.id] = blob;
        files.push({
          contentType: blob.type || "image/jpeg",
          fileKey: entry.id,
          fileName: entry.fileName,
          sizeBytes: blob.size,
        });
      }

      draftInput = {
        activeBatchImageId,
        activeEditorPanel,
        activeLogoLayerId,
        activePdfPageId,
        activeSignatureId,
        activeLogoTemplate,
        activeTemplate: activeTextTemplate,
        activeTextLayerId,
        fileName,
        imageBatch: batchEntries,
        logoLayers,
        mediaKind: "image",
        savedSignatures,
        textLayers,
        tileAngle,
        tileDensity,
        tileGap,
        watermarkMode,
        watermarkType,
      };
    } else if (mediaKind === "pdf") {
      if (!pdfBytesRef.current) {
        throw new Error("Reload the PDF before exporting.");
      }

      const pdfBlob = new Blob([new Uint8Array(pdfBytesRef.current)], {
        type: "application/pdf",
      });
      blobsByKey.source = pdfBlob;
      files.push({
        contentType: "application/pdf",
        fileKey: "source",
        fileName,
        sizeBytes: pdfBlob.size,
      });

      draftInput = {
        activeBatchImageId,
        activeEditorPanel,
        activeLogoLayerId,
        activePdfPageId,
        activeSignatureId,
        activeLogoTemplate,
        activeTemplate: activeTextTemplate,
        activeTextLayerId,
        fileName,
        logoLayers,
        mediaKind: "pdf",
        pdfPageCount,
        pdfDocumentTool,
        pdfPageFillMap: getPdfPageFillMapWithActivePersisted(),
        pdfPageSignatures: getPdfPageSignaturesWithActivePersisted(),
        savedSignatures,
        textLayers,
        tileAngle,
        tileDensity,
        tileGap,
        watermarkMode,
        watermarkType,
      };
    } else if (mediaKind === "video") {
      if (!videoUrl) {
        throw new Error("Reload the video before exporting.");
      }

      const videoBlob = await fetch(videoUrl).then((response) => response.blob());
      blobsByKey.source = videoBlob;
      files.push({
        contentType: videoBlob.type || "video/mp4",
        fileKey: "source",
        fileName,
        sizeBytes: videoBlob.size,
      });

      draftInput = {
        activeBatchImageId,
        activeEditorPanel,
        activeLogoLayerId,
        activePdfPageId,
        activeSignatureId,
        activeLogoTemplate,
        activeTemplate: activeTextTemplate,
        activeTextLayerId,
        fileName,
        logoLayers,
        mediaKind: "video",
        savedSignatures,
        textLayers,
        tileAngle,
        tileDensity,
        tileGap,
        videoDuration,
        videoFileSize,
        videoSize,
        watermarkMode,
        watermarkType,
      };
    } else {
      if (!objectUrlRef.current || !image) {
        throw new Error("Reload the image before exporting.");
      }

      const imageBlob = await fetch(objectUrlRef.current).then((response) =>
        response.blob(),
      );
      blobsByKey.source = imageBlob;
      files.push({
        contentType: imageBlob.type || "image/jpeg",
        fileKey: "source",
        fileName,
        sizeBytes: imageBlob.size,
      });

      draftInput = {
        activeBatchImageId,
        activeEditorPanel,
        activeLogoLayerId,
        activePdfPageId,
        activeSignatureId,
        activeLogoTemplate,
        activeTemplate: activeTextTemplate,
        activeTextLayerId,
        fileName,
        imageTools: {
          blurBrushSize,
          blurStrokes: cloneBlurStrokes(blurStrokes),
          cropRect,
          imageEffectSettings: getImageEffectSettings(),
          resizeHeight,
          resizeWidth,
          rotationAngle,
          uploadedImageSize,
        },
        logoLayers,
        mediaKind: "image",
        savedSignatures,
        textLayers,
        tileAngle,
        tileDensity,
        tileGap,
        watermarkMode,
        watermarkType,
      };
    }

    const state = await buildAnonymousExportDraftState(draftInput);
    return { blobsByKey, files, mediaKind, state };
  }

  async function saveDraftForLoginGate() {
    const payload = await collectAnonymousExportDraftPayload();
    await saveAnonymousExportDraft(payload);
    markPendingExportAfterLogin();
  }

  async function applyAnonymousDraftState(state: AnonymousExportDraftState) {
    const { logoLayers: restoredLogoLayers, textLayers: restoredTextLayers } =
      await deserializeDraftWatermarkLayers(state);

    setTextLayers(restoredTextLayers);
    setLogoLayers(restoredLogoLayers);
    setActiveTextLayerId(state.activeTextLayerId);
    setActiveLogoLayerId(state.activeLogoLayerId);
    setWatermarkType(state.watermarkType);
    setWatermarkMode(state.watermarkMode);
    setTileDensity(state.tileDensity);
    setTileGap(state.tileGap);
    setTileAngle(state.tileAngle);
    setActiveTextTemplate(state.activeTemplate as WatermarkTemplateId | null);
    setActiveLogoTemplate(
      (state.activeLogoTemplate ?? null) as LogoWatermarkTemplateId | null,
    );
    const restoredPanel = normalizeRestoredEditorPanel(
      state.activeEditorPanel,
      state.mediaKind,
      state.watermarkType,
    );
    setActiveEditorPanel(restoredPanel);
    if (restoredPanel === "photos") {
      setActivePhotoTool(normalizeRestoredPhotoTool(state.activeEditorPanel));
    } else if (restoredPanel === "pdfDocs") {
      setActivePdfTool(normalizeRestoredPdfTool(state.activeEditorPanel));
    }
    setActiveSignatureId(state.activeSignatureId);

    const activeTextLayer =
      restoredTextLayers.find((layer) => layer.id === state.activeTextLayerId) ??
      restoredTextLayers[0];
    const activeLogoLayer =
      restoredLogoLayers.find((layer) => layer.id === state.activeLogoLayerId) ??
      restoredLogoLayers[0];

    if (activeTextLayer) {
      syncLegacyFromTextLayer(activeTextLayer);
    }

    if (activeLogoLayer) {
      syncLegacyFromLogoLayer(activeLogoLayer);
    }

    const restoredSignatures = await Promise.all(
      state.savedSignatures.map(async (entry) => ({
        ...entry,
        image: await createImageFromDataUrl(entry.previewSrc),
        kind: normalizeSignatureKind(entry.kind),
        typedText: entry.typedText ?? null,
      })),
    );
    setSavedSignatures(restoredSignatures);

    if (state.mediaKind === "pdf") {
      const restoredMap = state.pdfPageSignatures
        ? deserializePdfPageSignatureMap(state.pdfPageSignatures)
        : createEmptyPdfPageSignatureMap(state.pdfPageCount ?? 0);
      setPdfPageSignatures(restoredMap);

      const restoredFillMap = state.pdfPageFillMap
        ? deserializePdfPageFillMap(state.pdfPageFillMap)
        : createEmptyPdfPageFillMap(state.pdfPageCount ?? 0);
      setPdfPageFillMap(restoredFillMap);
      setPdfDocumentTool(state.pdfDocumentTool ?? "signature");

      if (state.watermarkType === "signature") {
        const pageId = state.activePdfPageId ?? buildPdfPageId(1);
        const pagePlacements = restoredMap[pageId] ?? [];
        applyPdfPageSignaturePlacementToEditor(
          pagePlacements[pagePlacements.length - 1] ?? null,
        );
      }

      if (state.pdfDocumentTool === "fill") {
        const pageId = state.activePdfPageId ?? buildPdfPageId(1);
        applyPdfPageFillFieldsToEditor(restoredFillMap[pageId] ?? []);
      }
    }

    if (state.imageTools) {
      setBlurBrushSize(state.imageTools.blurBrushSize);
      setBlurStrokes(cloneBlurStrokes(state.imageTools.blurStrokes));
      setCropRect(state.imageTools.cropRect);
      setResizeWidth(state.imageTools.resizeWidth);
      setResizeHeight(state.imageTools.resizeHeight);
      setRotationAngle(state.imageTools.rotationAngle);
      setUploadedImageSize(state.imageTools.uploadedImageSize);
      setActiveImageEffect(state.imageTools.imageEffectSettings.activeEffect);
      setEffectBorderColor(state.imageTools.imageEffectSettings.borderColor);
      setEffectBorderWidth(state.imageTools.imageEffectSettings.borderWidth);
      setEffectExposure(state.imageTools.imageEffectSettings.exposure);
    }
  }

  function resolvePendingDraftRestore() {
    pendingDraftRestoreResolverRef.current?.();
    pendingDraftRestoreResolverRef.current = null;
  }

  async function finalizeAnonymousDraftRestore() {
    const state = anonymousDraftRestoreRef.current;

    if (!state) {
      resolvePendingDraftRestore();
      return;
    }

    try {
      await applyAnonymousDraftState(state);
      if (state.mediaKind === "pdf" && state.activePdfPageId) {
        void selectPdfPage(state.activePdfPageId);
      }
      await deleteAnonymousExportDraft(getOrCreateAnonymousSessionId());
      clearPendingExportAfterLogin();
    } finally {
      anonymousDraftRestoreRef.current = null;
      isRestoringSessionRef.current = false;
      resolvePendingDraftRestore();
    }
  }

  function waitForAnonymousDraftRestore() {
    return new Promise<void>((resolve) => {
      pendingDraftRestoreResolverRef.current = resolve;
    });
  }

  async function restoreAnonymousDraftIntoEditor() {
    const sessionId = getOrCreateAnonymousSessionId();
    const draft = await loadAnonymousExportDraft(sessionId);
    const files = await downloadDraftFiles(draft.downloads);

    anonymousDraftRestoreRef.current = draft.state;
    isRestoringSessionRef.current = true;
    const restorePromise = waitForAnonymousDraftRestore();
    loadMediaFiles(files);
    await restorePromise;
  }

  function continueExportFlow(
    upsellOverrides?: Partial<WatermarkedExportUpsellContext>,
  ) {
    const upsellContext = getWatermarkedExportUpsellContext(upsellOverrides);

    logRealVideoExport("STEP 4/15: continueExportFlow()", {
      creditBalance: upsellContext.creditBalance,
      estimatedExportCost: upsellContext.estimatedExportCost,
      fileType: upsellContext.fileType,
      isAuthenticated: upsellContext.isAuthenticated,
      mediaKind,
      requiresCreditsBeforeExport: shouldRequireCreditsBeforeExport(upsellContext),
      showsWatermarkedUpsell: shouldShowWatermarkedExportUpsell(upsellContext),
      videoServerRouted: upsellContext.videoServerRouted,
    });

    if (shouldRequireCreditsBeforeExport(upsellContext)) {
      pendingExportRef.current = null;
      setShowServerVideoCreditGate(true);
      logRealVideoExport("STEP 4/15: blocked by server-video credit gate modal");
      return;
    }

    if (shouldShowWatermarkedExportUpsell(upsellContext)) {
      pendingExportRef.current = proceedWithExport;
      setShowWatermarkedExportUpsell(true);
      logRealVideoExport("STEP 4/15: showing watermarked-export upsell modal");
      return;
    }

    proceedWithExport();
  }

  function handleDismissServerVideoCreditGate() {
    setShowServerVideoCreditGate(false);
    pendingExportRef.current = null;
  }

  async function beginExportWithLoginGate() {
    logRealVideoExport("STEP 3/15: beginExportWithLoginGate()", {
      isAuthenticated,
      isEmailConfirmed,
      mediaKind,
    });

    if (isAuthenticated && isEmailConfirmed) {
      continueExportFlow();
      return;
    }

    if (isAuthenticated && !isEmailConfirmed) {
      setExportNotice("");
      setLoginGateError("");
      setLoginGatePhase("verify-email");
      setShowExportLoginGate(true);
      return;
    }

    setLoginGateError("");
    setLoginGatePhase("saving");
    setShowExportLoginGate(true);
    resumeExportAfterLoginRef.current = true;

    try {
      await saveDraftForLoginGate();
      setLoginGatePhase("auth");
    } catch (error) {
      setLoginGateError(
        error instanceof Error
          ? error.message
          : "Could not save your work before sign in.",
      );
      setShowExportLoginGate(false);
      resumeExportAfterLoginRef.current = false;
    }
  }

  async function handleLoginGateAuthenticated() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email_confirmed_at) {
      setLoginGatePhase("verify-email");
      return;
    }

    setIsAuthenticated(true);
    setIsEmailConfirmed(true);
    setUserEmail(user.email ?? null);
    setUserDisplayName(
      (await fetchUserProfileDisplayName(supabase, user.id, user.email)) || null,
    );
    setShowExportLoginGate(false);

    const balance = await fetchUserCreditBalance(supabase, user.id);
    setCreditBalance(balance);

    setIsRestoringAnonymousDraft(true);

    try {
      await restoreAnonymousDraftIntoEditor();

      if (resumeExportAfterLoginRef.current) {
        continueExportFlow({
          creditBalance: balance,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : "Could not restore your saved draft after sign in.",
      );
    } finally {
      setIsRestoringAnonymousDraft(false);
      resumeExportAfterLoginRef.current = false;
    }
  }

  function handleDismissExportLoginGate() {
    setShowExportLoginGate(false);
    setLoginGateError("");
    resumeExportAfterLoginRef.current = false;
  }

  function proceedWithExport() {
    logRealVideoExport("STEP 5/15: proceedWithExport()", {
      isExporting,
      mediaKind,
    });

    if (isExporting) {
      return;
    }

    if (mediaKind === "image" && imageBatch.length >= 2) {
      void handleExportAll();
      return;
    }

    setUploadError("");
    setExportError("");

    if (mediaKind === "video") {
      void handleVideoExport();
      return;
    }

    if (mediaKind === "pdf") {
      void handlePdfExport();
      return;
    }

    if (!image) {
      return;
    }

    void handleSingleImageExport();
  }

  function handleContinueWithWatermarkedExport() {
    logRealVideoExport("STEP 4b/15: watermarked-export upsell confirmed");
    setShowWatermarkedExportUpsell(false);
    const runExport = pendingExportRef.current;
    pendingExportRef.current = null;
    runExport?.();
  }

  function handleDismissWatermarkedExportUpsell() {
    setShowWatermarkedExportUpsell(false);
    pendingExportRef.current = null;
  }

  function getCurrentExportFileType(): ReturnType<typeof getExportFileType> {
    return getExportFileType({
      hasFillFields: hasAnyFillFields(getPdfPageFillMapWithActivePersisted()),
      mediaKind,
      watermarkType,
    });
  }

  function getPdfWatermarkSettings() {
    return {
      activeLogoLayerId,
      activeTextLayerId,
      customPosition,
      fontFamily,
      fontSizeScale,
      logoImage,
      logoLayers,
      textLayers,
      tileAngle,
      tileDensity,
      tileGap,
      watermarkMode,
      watermarkOpacity,
      watermarkPosition,
      watermarkText,
      watermarkType,
    };
  }

  function getVideoWatermarkSettings() {
    return {
      activeLogoLayerId,
      activeTextLayerId,
      customPosition,
      fontFamily,
      fontSizeScale,
      fontWeight,
      logoImage,
      logoLayers,
      textColor,
      textLayers,
      textShadowEnabled,
      tileAngle,
      tileDensity,
      tileGap,
      watermarkMode,
      watermarkOpacity,
      watermarkPosition,
      watermarkText,
      watermarkType,
    };
  }

  async function getExportRenderInputForAuth(
    imageElement: HTMLImageElement,
    entryResizeWidth: number,
    entryResizeHeight: number,
    entryRotationAngle: number,
    useResizePreview: boolean,
    auth: ExportAuthorizationContext,
    entryBlurStrokes: BlurStroke[] = blurStrokes,
    entryReferenceImageSize?: CanvasSize,
  ) {
    const input = getWatermarkExportInput(
      imageElement,
      entryResizeWidth,
      entryResizeHeight,
      entryRotationAngle,
      useResizePreview,
      entryBlurStrokes,
      entryReferenceImageSize,
    );

    if (isCleanExportTier(auth.tier)) {
      return input;
    }

    await ensureForcedTilePatternFontLoaded();
    return applyForcedTileWatermarkSettings(input, { iconOnlyCenterStamp: true });
  }

  async function resolvePdfExportAuthorization(exportId: string) {
    const fileType = getCurrentExportFileType();
    const exportFillMap = getPdfPageFillMapWithActivePersisted();
    const exportSignatureMap = getPdfPageSignaturesWithActivePersisted();
    const hasFillFields = hasAnyFillFields(exportFillMap);
    const hasSignaturePlacements =
      countSignedPdfPages(exportSignatureMap) > 0;
    const signatureManifest = buildSignatureManifestForExport();
    const pdfBillingMode = getPdfBillingMode(getPdfWatermarkSettings());

    if (!pdfBytesRef.current) {
      throw new ExportCreditCheckError(
        "Reload the PDF before exporting sign and fill content.",
      );
    }

    try {
      let fileMeta: ExportFileMeta = await uploadPdfForExportAuthorization({
        exportId,
        fileName,
        pdfBytes: pdfBytesRef.current,
      });

      fileMeta = {
        ...fileMeta,
        pdfBillingMode,
        signatureManifest,
      };

      if (hasSignaturePlacements) {
        const signaturePlacementMeta =
          await uploadSignaturePlacementManifestForExportAuthorization({
            exportId,
            manifestJson: JSON.stringify(
              buildSignaturePlacementManifestDocument(
                serializePdfPageSignatureMap(exportSignatureMap),
              ),
            ),
          });
        fileMeta = { ...fileMeta, ...signaturePlacementMeta };
      }

      if (hasFillFields) {
        const fillMeta = await uploadFillManifestForExportAuthorization({
          exportId,
          manifestJson: JSON.stringify(
            buildFillManifestDocument(serializePdfPageFillMap(exportFillMap)),
          ),
        });
        fileMeta = { ...fileMeta, ...fillMeta };
      }

      return resolveExportAuthorizationStrict({
        exportId,
        fileMeta,
        fileType,
      });
    } catch (error) {
      if (
        error instanceof ExportCreditCheckError ||
        error instanceof ExportAuthorizationRequiredError
      ) {
        throw error;
      }

      throw new ExportCreditCheckError(
        error instanceof Error
          ? error.message
          : "Could not verify credits for PDF export. Please try again.",
      );
    }
  }

  useEffect(() => {
    void loadForcedTileLogoImage().catch(() => {
      // Forced tile exports will retry loading at export time.
    });
    void loadClientVideoFreeExportStampImage().catch(() => {
      // Client video free export stamp retries at export time.
    });
  }, []);

  useEffect(() => {
    if (watermarkType !== "signature") {
      return;
    }

    setWatermarkType("text");
  }, [watermarkType]);

  useEffect(() => {
    if (!isEditorRoute) {
      return;
    }

    hasBootstrappedEditorRef.current = false;
    const supabase = createClient();
    let cancelled = false;

    async function bootstrapEditorSession(isAuthenticated: boolean) {
      const loadGeneration = ++mediaLoadGenerationRef.current;

      traceEditorBootstrap("bootstrap start", {
        authChecked: true,
        isAuthenticated,
        pathname,
      });

      const shouldPreserveAnonymousDraft =
        anonymousDraftRestoreRef.current !== null ||
        resumeExportAfterLoginRef.current;

      if (!isAuthenticated && !shouldPreserveAnonymousDraft) {
        traceEditorBootstrap("clearing anonymous editor media state");
        resetAnonymousEditorEntryRef.current();
      }

      const handoffFiles = await consumeEditorHandoffFiles();

      if (loadGeneration !== mediaLoadGenerationRef.current || cancelled) {
        traceEditorBootstrap("bootstrap aborted after handoff read", {
          loadGeneration,
        });
        return;
      }

      if (handoffFiles?.length) {
        traceEditorBootstrap("loading editor handoff files", {
          count: handoffFiles.length,
        });
        loadMediaFiles(handoffFiles);
        return;
      }

      if (!isAuthenticated) {
        traceEditorBootstrap("skipping IndexedDB restore for anonymous user");
        return;
      }

      traceEditorBootstrap("reading IndexedDB editor session");
      const session = await readEditorSession();

      if (loadGeneration !== mediaLoadGenerationRef.current || cancelled) {
        traceEditorBootstrap("bootstrap aborted after session read", {
          loadGeneration,
        });
        return;
      }

      if (!session) {
        traceEditorBootstrap("no IndexedDB session to restore");
        return;
      }

      traceEditorBootstrap("restoring IndexedDB editor session", {
        fileName: session.meta.fileName,
        mediaKind: session.meta.mediaKind,
      });
      isRestoringSessionRef.current = true;
      sessionRestoreRef.current = session.meta;
      loadMediaFiles(storedSessionFilesToFiles(session.files));
    }

    async function syncAuthState() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      const authenticated = Boolean(user);

      setIsAuthenticated(authenticated);
      setIsEmailConfirmed(Boolean(user?.email_confirmed_at));
      setUserEmail(user?.email ?? null);

      if (!user) {
        setUserDisplayName(null);
        setAuthChecked(true);

        if (!hasBootstrappedEditorRef.current) {
          hasBootstrappedEditorRef.current = true;
          void bootstrapEditorSession(false);
        }

        return;
      }

      const [balance, displayName] = await Promise.all([
        fetchUserCreditBalance(supabase, user.id),
        fetchUserProfileDisplayName(supabase, user.id, user.email),
      ]);

      if (cancelled) {
        return;
      }

      setCreditBalance(balance);
      setUserDisplayName(displayName || null);
      setAuthChecked(true);

      if (!hasBootstrappedEditorRef.current) {
        hasBootstrappedEditorRef.current = true;
        void bootstrapEditorSession(true);
      }

      if (
        user.email_confirmed_at &&
        hasPendingExportAfterLogin() &&
        resumeExportAfterLoginRef.current
      ) {
        setIsRestoringAnonymousDraft(true);

        try {
          await restoreAnonymousDraftIntoEditor();
          continueExportFlow({
            creditBalance: balance,
            isAuthenticated: true,
          });
        } catch (error) {
          setExportError(
            error instanceof Error
              ? error.message
              : "Could not restore your saved draft after sign in.",
          );
        } finally {
          setIsRestoringAnonymousDraft(false);
          resumeExportAfterLoginRef.current = false;
        }
      }
    }

    void syncAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setIsAuthenticated(Boolean(user));
      setIsEmailConfirmed(Boolean(user?.email_confirmed_at));
      setUserEmail(user?.email ?? null);

      if (user) {
        void Promise.all([
          fetchUserCreditBalance(supabase, user.id).then(setCreditBalance),
          fetchUserProfileDisplayName(supabase, user.id, user.email).then((name) =>
            setUserDisplayName(name || null),
          ),
        ]);
      } else {
        setCreditBalance(null);
        setUserDisplayName(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      mediaLoadGenerationRef.current += 1;
      setIsPdfLoading(false);
    };
  }, [isEditorRoute, pathname]);

  function commitSettingsHistorySnapshot(snapshot: WatermarkSettingsSnapshot) {
    const history = settingsHistoryRef.current;
    const currentSnapshot = history[settingsHistoryIndexRef.current];

    if (currentSnapshot && areWatermarkSnapshotsEqual(currentSnapshot, snapshot)) {
      return;
    }

    const nextHistory = [
      ...history.slice(0, settingsHistoryIndexRef.current + 1),
      snapshot,
    ].slice(-50);
    const nextIndex = nextHistory.length - 1;

    settingsHistoryRef.current = nextHistory;
    settingsHistoryIndexRef.current = nextIndex;
    setSettingsHistoryLength(nextHistory.length);
    setSettingsHistoryIndex(nextIndex);
  }

  useEffect(() => {
    const panel = previewCheckerboardRef.current ?? previewPanelRef.current;

    if (!panel) {
      return;
    }

    function updateCanvasSize() {
      const sizeNode = previewCheckerboardRef.current ?? previewPanelRef.current;

      if (!sizeNode) {
        return;
      }

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2.5);
      const styles = window.getComputedStyle(sizeNode);
      const paddingX =
        parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const paddingY =
        parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
      const baseWidth = Math.max(
        240,
        Math.floor(sizeNode.clientWidth - paddingX),
      );
      const baseHeight = Math.max(
        240,
        Math.floor(sizeNode.clientHeight - paddingY),
      );
      const isMobilePreview = window.matchMedia("(max-width: 767px)").matches;
      let nextWidth = baseWidth;
      let nextHeight = baseHeight;

      if (isMobilePreview) {
        if (mediaKind === "video" && videoSize) {
          const fitSize = getMediaFitPreviewSize(
            baseWidth,
            baseHeight,
            videoSize.width,
            videoSize.height,
          );
          nextWidth = fitSize.width;
          nextHeight = fitSize.height;
        } else if (
          (mediaKind === "image" || mediaKind === "pdf") &&
          uploadedImageSize
        ) {
          const fitSize = getMediaFitPreviewSize(
            baseWidth,
            baseHeight,
            uploadedImageSize.width,
            uploadedImageSize.height,
          );
          nextWidth = fitSize.width;
          nextHeight = fitSize.height;
        }
      }

      setPreviewBaseSize((current) => {
        const next = {
          height: nextHeight,
          pixelRatio,
          width: nextWidth,
        };

        if (
          Math.abs(current.width - next.width) <= 1 &&
          Math.abs(current.height - next.height) <= 1 &&
          current.pixelRatio === next.pixelRatio
        ) {
          return current;
        }

        return next;
      });
    }

    updateCanvasSize();

    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(panel);

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    activeEditorPanel,
    mediaKind,
    mobileControlsExpanded,
    uploadedImageSize,
    videoSize,
  ]);

  useEffect(() => {
    const preview = videoPreviewRef.current;

    if (mediaKind !== "video" || !preview) {
      return;
    }

    function updateVideoOverlaySize() {
      if (!preview) {
        return;
      }

      setVideoOverlaySize({
        height: Math.max(1, Math.floor(preview.clientHeight)),
        width: Math.max(1, Math.floor(preview.clientWidth)),
      });
    }

    updateVideoOverlaySize();

    const resizeObserver = new ResizeObserver(updateVideoOverlaySize);
    resizeObserver.observe(preview);

    return () => {
      resizeObserver.disconnect();
    };
  }, [mediaKind, previewZoomPercent, videoUrl]);

  useEffect(() => {
    if (mediaKind !== "video") {
      setVideoPreviewTime(0);
      return;
    }

    const video = videoElementRef.current;

    if (!video) {
      return;
    }

    const shouldClampPreviewToTrim =
      activeEditorPanel === "video" && activeVideoTool === "trim";

    let lastSyncMs = 0;

    const syncPreviewTime = (force = false) => {
      const now = Date.now();

      if (!force && now - lastSyncMs < 250) {
        return;
      }

      lastSyncMs = now;
      const nextTime = shouldClampPreviewToTrim
        ? clampVideoPreviewTimeToTrim(
            video.currentTime,
            videoTrimStartSeconds,
            videoTrimEndSeconds,
            videoDuration,
          )
        : video.currentTime;

      if (
        shouldClampPreviewToTrim &&
        Math.abs(video.currentTime - nextTime) > 0.05
      ) {
        video.currentTime = nextTime;
      }

      setVideoPreviewTime(nextTime);
    };

    const handleTimeUpdate = () => syncPreviewTime(false);
    const handleSeeked = () => syncPreviewTime(true);
    const handleLoadedMetadata = () => syncPreviewTime(true);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    syncPreviewTime(true);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [
    activeEditorPanel,
    activeVideoTool,
    mediaKind,
    videoDuration,
    videoTrimEndSeconds,
    videoTrimStartSeconds,
    videoUrl,
  ]);

  useEffect(() => {
    if (mediaKind !== "video" || videoDuration <= 0) {
      return;
    }

    setVideoTrimEndSeconds((current) => {
      if (current <= 0) {
        return videoDuration;
      }

      return Math.min(current, videoDuration);
    });
  }, [mediaKind, videoDuration]);

  useEffect(() => {
    if (mediaKind !== "video") {
      setIsVideoPlaying(false);
      return;
    }

    const video = videoElementRef.current;

    if (!video) {
      return;
    }

    const syncPlaying = () => setIsVideoPlaying(!video.paused);

    syncPlaying();
    video.addEventListener("play", syncPlaying);
    video.addEventListener("pause", syncPlaying);
    video.addEventListener("ended", syncPlaying);

    return () => {
      video.removeEventListener("play", syncPlaying);
      video.removeEventListener("pause", syncPlaying);
      video.removeEventListener("ended", syncPlaying);
    };
  }, [mediaKind, videoUrl]);

  useEffect(() => {
    if (mediaKind !== "video" || !videoUrl) {
      return;
    }

    const video = videoElementRef.current;

    if (!video) {
      return;
    }

    const syncVideoSizeFromElement = () => {
      if (video.videoWidth <= 0 || video.videoHeight <= 0) {
        return;
      }

      setVideoSize((current) => {
        if (
          current?.width === video.videoWidth &&
          current?.height === video.videoHeight
        ) {
          return current;
        }

        return {
          height: video.videoHeight,
          width: video.videoWidth,
        };
      });
    };

    video.addEventListener("loadedmetadata", syncVideoSizeFromElement);
    video.addEventListener("loadeddata", syncVideoSizeFromElement);

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      syncVideoSizeFromElement();
    }

    return () => {
      video.removeEventListener("loadedmetadata", syncVideoSizeFromElement);
      video.removeEventListener("loadeddata", syncVideoSizeFromElement);
    };
  }, [mediaKind, videoUrl]);

  useEffect(() => {
    if (mediaKind !== "video" || !videoUrl || !pendingMergedVideoPreviewRef.current) {
      return;
    }

    const video = videoElementRef.current;

    if (!video) {
      return;
    }

    const resetMergedPreview = () => {
      if (!pendingMergedVideoPreviewRef.current) {
        return;
      }

      pendingMergedVideoPreviewRef.current = false;
      video.pause();
      video.currentTime = 0;
      setVideoPreviewTime(0);
    };

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      resetMergedPreview();
      return;
    }

    video.addEventListener("loadedmetadata", resetMergedPreview, { once: true });

    return () => {
      video.removeEventListener("loadedmetadata", resetMergedPreview);
    };
  }, [mediaKind, videoUrl]);

  useEffect(() => {
    return () => {
      void sessionSaveRef.current?.();

      if (pdfDocRef.current) {
        void pdfDocRef.current.cleanup();
        pdfDocRef.current = null;
      }

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      if (logoObjectUrlRef.current) {
        URL.revokeObjectURL(logoObjectUrlRef.current);
      }

      if (manualSettingsGuardTimerRef.current) {
        clearTimeout(manualSettingsGuardTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      for (const entry of imageBatch) {
        if (entry.objectUrl !== objectUrlRef.current) {
          URL.revokeObjectURL(entry.objectUrl);
        }
      }
    };
  }, [imageBatch]);

  useEffect(() => {
    const snapshot = getWatermarkSettingsSnapshot();

    if (!settingsHistoryRef.current.length) {
      commitSettingsHistorySnapshot(snapshot);
      return;
    }

    if (isApplyingSettingsHistoryRef.current) {
      isApplyingSettingsHistoryRef.current = false;
      return;
    }

    if (settingsHistoryTimerRef.current) {
      clearTimeout(settingsHistoryTimerRef.current);
    }

    settingsHistoryTimerRef.current = setTimeout(() => {
      commitSettingsHistorySnapshot(snapshot);
      writeStoredWatermarkSettings(storedSettingsFromSnapshot(snapshot));
    }, 400);

    return () => {
      if (settingsHistoryTimerRef.current) {
        clearTimeout(settingsHistoryTimerRef.current);
      }
    };
  }, [
    activeLogoLayerId,
    activeTextLayerId,
    blurBrushSize,
    blurStrokes,
    logoLayers,
    textLayers,
    tileAngle,
    tileDensity,
    tileGap,
    watermarkMode,
    watermarkType,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    applyHighQualityCanvasDefaults(context);

    const logicalWidth = canvasSize.width;
    const logicalHeight = canvasSize.height;
    const pixelRatio = canvasSize.pixelRatio || 1;

    canvas.width = Math.max(1, Math.floor(logicalWidth * pixelRatio));
    canvas.height = Math.max(1, Math.floor(logicalHeight * pixelRatio));
    canvas.style.width = `${logicalWidth}px`;
    canvas.style.height = `${logicalHeight}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, logicalWidth, logicalHeight);
    context.fillStyle = "#DCDCDD";
    context.fillRect(0, 0, logicalWidth, logicalHeight);

    if (!image) {
      imageFrameRef.current = null;
      return;
    }

    const referenceSize = uploadedImageSize ?? {
      height: image.naturalHeight,
      width: image.naturalWidth,
    };
    const previewImageWidth =
      activeImageTool === "resize" && resizeWidth > 0
        ? resizeWidth
        : image.naturalWidth;
    const previewImageHeight =
      activeImageTool === "resize" && resizeHeight > 0
        ? resizeHeight
        : image.naturalHeight;
    const rotatedPreviewBounds = getRotatedBounds(
      previewImageWidth,
      previewImageHeight,
      rotationAngle,
    );
    const baseFitScale = Math.min(
      previewBaseSize.width /
        Math.max(referenceSize.width, rotatedPreviewBounds.width),
      previewBaseSize.height /
        Math.max(referenceSize.height, rotatedPreviewBounds.height),
    );
    const imageScale = baseFitScale * previewZoomScale;
    const sourceImageWidth = previewImageWidth * imageScale;
    const sourceImageHeight = previewImageHeight * imageScale;
    const imageWidth = rotatedPreviewBounds.width * imageScale;
    const imageHeight = rotatedPreviewBounds.height * imageScale;
    const imageX = (logicalWidth - imageWidth) / 2;
    const imageY = (logicalHeight - imageHeight) / 2;
    const imageFrame = {
      height: imageHeight,
      width: imageWidth,
      x: imageX,
      y: imageY,
    };

    imageFrameRef.current = imageFrame;

    context.save();
    context.translate(imageX + imageWidth / 2, imageY + imageHeight / 2);
    context.rotate((rotationAngle * Math.PI) / 180);
    const effectedCanvas = document.createElement("canvas");
    effectedCanvas.width = previewImageWidth;
    effectedCanvas.height = previewImageHeight;
    const effectedContext = effectedCanvas.getContext("2d");

    if (effectedContext) {
      if (activeImageTool === "resize") {
        drawResizeTargetImage(
          effectedContext,
          image,
          previewImageWidth,
          previewImageHeight,
          resizeScaleMode,
          getImageEffectSettings(),
        );
      } else {
        drawBaseImageWithEffect(
          effectedContext,
          image,
          0,
          0,
          previewImageWidth,
          previewImageHeight,
          getImageEffectSettings(),
        );
      }
      context.drawImage(
        effectedCanvas,
        -sourceImageWidth / 2,
        -sourceImageHeight / 2,
        sourceImageWidth,
        sourceImageHeight,
      );
      applyBlurStrokes(context, {
        destHeight: sourceImageHeight,
        destWidth: sourceImageWidth,
        destX: -sourceImageWidth / 2,
        destY: -sourceImageHeight / 2,
        source: effectedCanvas,
        sourceHeight: previewImageHeight,
        sourceWidth: previewImageWidth,
        strokes: blurStrokes,
      });
    } else {
      drawBaseImageWithEffect(
        context,
        image,
        -sourceImageWidth / 2,
        -sourceImageHeight / 2,
        sourceImageWidth,
        sourceImageHeight,
        getImageEffectSettings(),
      );
    }
    context.restore();

    const pdfSignaturePlacements =
      mediaKind === "pdf" && activePdfPageId
        ? getPdfPageSignaturePlacementsForPaint()
        : [];
    const showPdfSignatureChrome =
      isPdfSignFillMode() && pdfDocumentTool === "signature";
    const shouldPaintPdfWatermarks =
      mediaKind !== "pdf" || isPdfWatermarkMode();

    let combinedBoundsByLayer = new Map<string, TextBounds>();
    let combinedActiveBounds: TextBounds | null = null;

    if (pdfSignaturePlacements.length > 0) {
      const signaturePaint = paintWatermarkLayers({
        activeLayerId: showPdfSignatureChrome
          ? (activeSignaturePlacementId ?? "")
          : "",
        canvasHeight: logicalHeight,
        canvasWidth: logicalWidth,
        context,
        imageHeight,
        imageWidth,
        imageX,
        imageY,
        logoLayers: [],
        signatureFontSizeScale: fontSizeScale,
        signatureImage: null,
        signatureOpacity: watermarkOpacity,
        signaturePlacements: pdfSignaturePlacements.map((placement) => ({
          ...placement,
          isActive: showPdfSignatureChrome ? placement.isActive : false,
        })),
        signaturePosition: watermarkPosition,
        signatureCustomPosition: customPosition,
        textLayers: [],
        tileAngle,
        tileDensity,
        tileGap,
        watermarkMode: "single",
        watermarkReferenceWidth: imageWidth,
        watermarkType: "signature",
      });

      combinedBoundsByLayer = signaturePaint.boundsByLayer;
      combinedActiveBounds = signaturePaint.activeBounds;
    }

    if (shouldPaintPdfWatermarks) {
      const watermarkPaint = paintWatermarkLayers({
        activeLayerId:
          watermarkType === "text"
            ? (activeTextLayerId ?? "")
            : watermarkType === "logo"
              ? (activeLogoLayerId ?? "")
              : (activeTextLayerId ?? ""),
        canvasHeight: logicalHeight,
        canvasWidth: logicalWidth,
        context,
        imageHeight,
        imageWidth,
        imageX,
        imageY,
        logoLayers: getLogoLayersForPaint(),
        signatureFontSizeScale: fontSizeScale,
        signatureImage:
          watermarkType === "signature" ? logoImage : null,
        signatureOpacity: watermarkOpacity,
        signaturePosition: watermarkPosition,
        signatureCustomPosition: customPosition,
        signaturePlacements: undefined,
        textLayers: getTextLayersForPaint(),
        tileAngle,
        tileDensity,
        tileGap,
        watermarkMode,
        watermarkReferenceWidth: imageWidth,
        watermarkType,
      });

      for (const [layerId, bounds] of watermarkPaint.boundsByLayer) {
        combinedBoundsByLayer.set(layerId, bounds);
      }

      if (watermarkPaint.activeBounds) {
        combinedActiveBounds = watermarkPaint.activeBounds;
      }
    }

    layerBoundsRef.current = combinedBoundsByLayer;
    textBoundsRef.current = combinedActiveBounds;

    if (
      mediaKind === "pdf" &&
      activePdfPageId &&
      isPdfSignFillMode() &&
      pdfDocumentTool === "fill"
    ) {
      fillFieldBoundsRef.current = paintFillFields({
        activeFieldId:
          pdfDocumentTool === "fill" ? activeFillFieldId : null,
        canvasHeight: logicalHeight,
        canvasWidth: logicalWidth,
        context,
        fields: getActivePdfPageFillFields(),
      });
    } else {
      fillFieldBoundsRef.current = {};
    }

    drawCropOverlay({
      context,
      cropRect,
      frame: imageFrame,
      image,
      isActive: activeImageTool === "crop",
    });
    drawResizeOverlay({
      context,
      frame: imageFrame,
      isActive: activeImageTool === "resize",
      resizeHeight,
      resizeWidth,
    });
  });

  useEffect(() => {
    paintVideoOverlayCanvas();
  }, [
    activeEditorPanel,
    activeVideoBlurRegionId,
    activeVideoTool,
    captionsMasterEnabled,
    customPosition,
    fontFamily,
    fontSizeScale,
    fontWeight,
    logoImage,
    logoLayers,
    mediaKind,
    previewZoomPercent,
    textColor,
    textLayers,
    textShadowEnabled,
    tileAngle,
    tileDensity,
    tileGap,
    videoBlurRegions,
    videoCaptionLayers,
    videoDuration,
    videoOverlaySize.height,
    videoOverlaySize.width,
    videoPreviewTime,
    videoSize,
    watermarkMode,
    watermarkOpacity,
    watermarkPosition,
    watermarkType,
  ]);

  function getImageEffectSettings(): ImageEffectSettings {
    return {
      activeEffect: activeImageEffect,
      borderColor: effectBorderColor,
      borderWidth: effectBorderWidth,
      exposure: effectExposure,
    };
  }

  function openFilePicker() {
    filePickerIntentRef.current = "replace";
    fileInputRef.current?.click();
  }

  function openFormatUploadPicker(kind: EditorFormatUploadKind) {
    if (kind === "photos") {
      formatPhotosInputRef.current?.click();
      return;
    }

    if (kind === "pdfDocs") {
      formatPdfInputRef.current?.click();
      return;
    }

    formatVideoInputRef.current?.click();
  }

  function handleFormatUploadFiles(
    files: File[],
    kind: EditorFormatUploadKind,
  ) {
    if (!files.length) {
      return;
    }

    if (kind === "photos") {
      const imageFiles = files.filter(isImageFile);

      if (!imageFiles.length) {
        setUploadError("Please choose JPG, PNG, or WebP images.");
        return;
      }

      setFormatUploadPrompt(null);
      loadMediaFiles(imageFiles);
      return;
    }

    if (kind === "pdfDocs") {
      const pdfFile = files.find(isPdfFile);

      if (!pdfFile) {
        setUploadError("Please choose a PDF document.");
        return;
      }

      setFormatUploadPrompt(null);
      loadMediaFiles([pdfFile]);
      return;
    }

    const videoFile = files.find(isVideoFile);

    if (!videoFile) {
      setUploadError("Please choose an MP4, MOV, or WebM video.");
      return;
    }

    setFormatUploadPrompt(null);
    loadMediaFiles([videoFile]);
  }

  function requestFormatUploadPrompt(kind: EditorFormatUploadKind) {
    if (formatUploadPrompt === kind) {
      setFormatUploadPrompt(null);
      return;
    }

    setFormatUploadPrompt(kind);
  }

  function openBatchImagePicker() {
    filePickerIntentRef.current = "append";
    fileInputRef.current?.click();
  }

  function openReplaceMediaPicker() {
    openFilePicker();
  }

  function openAddMoreImagesPicker() {
    appendImagesInputRef.current?.click();
  }

  function openAddMoreVideosPicker() {
    appendVideosInputRef.current?.click();
  }

  function openAddMorePdfsPicker() {
    appendPdfsInputRef.current?.click();
  }

  function clearPdfMergeBatch() {
    setPdfMergeBatch([]);
  }

  function syncLoadedPdfIntoMergeBatch() {
    if (activeEditorPanel !== "pdfDocs" || activePdfTool !== "merge") {
      return;
    }

    if (
      mediaKind !== "pdf" ||
      !pdfBytesRef.current ||
      pdfPageCount <= 0 ||
      !fileName
    ) {
      setPdfMergeBatch((current) =>
        current.filter((entry) => entry.id !== LOADED_PDF_MERGE_ENTRY_ID),
      );
      return;
    }

    const loadedEntry = createPdfMergeEntryFromLoadedDocument(
      pdfBytesRef.current,
      fileName,
      pdfPageCount,
    );

    setPdfMergeBatch((current) => {
      const addedEntries = current.filter(
        (entry) => entry.id !== LOADED_PDF_MERGE_ENTRY_ID,
      );
      return [loadedEntry, ...addedEntries];
    });
  }

  async function appendPdfMergeBatchFiles(files: File[]) {
    const pdfFiles = files.filter(isPdfFile);

    if (!pdfFiles.length) {
      setUploadError("Please choose PDF files.");
      return;
    }

    setUploadError("");

    try {
      const entries = await Promise.all(
        pdfFiles.map((file) => createPdfMergeEntryFromFile(file)),
      );
      setPdfMergeBatch((current) => {
        const existing = new Set(
          current.map((entry) => `${entry.fileName}:${entry.fileSize}`),
        );
        const novelEntries = entries.filter(
          (entry) => !existing.has(`${entry.fileName}:${entry.fileSize}`),
        );

        return [...current, ...novelEntries];
      });
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "We could not read one of those PDF files.",
      );
    }
  }

  function removePdfMergeEntry(id: string) {
    if (id === LOADED_PDF_MERGE_ENTRY_ID) {
      return;
    }

    setPdfMergeBatch((current) => current.filter((entry) => entry.id !== id));
  }

  function movePdfMergeEntry(id: string, direction: "down" | "up") {
    if (id === LOADED_PDF_MERGE_ENTRY_ID) {
      return;
    }

    setPdfMergeBatch((current) => {
      const index = current.findIndex((entry) => entry.id === id);

      if (index < 0) {
        return current;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      if (current[targetIndex]?.id === LOADED_PDF_MERGE_ENTRY_ID) {
        return current;
      }

      const next = [...current];
      const [entry] = next.splice(index, 1);
      next.splice(targetIndex, 0, entry!);
      return next;
    });
  }

  async function mergePdfBatchDocuments() {
    if (pdfMergeBatch.length < 2) {
      setUploadError("Add at least two PDF files to merge.");
      return;
    }

    setIsPdfMergeProcessing(true);
    setUploadError("");

    try {
      const mergedBlob = await mergePdfFiles(
        pdfMergeBatch.map((entry) => entry.file),
      );
      const mergedFile = new File(
        [mergedBlob],
        buildMergedPdfFileName(pdfMergeBatch),
        { type: "application/pdf" },
      );

      clearPdfMergeBatch();
      await loadPdfFile(mergedFile);
      setActiveEditorPanel("pdfDocs");
      setActivePdfTool("merge");
      syncLoadedPdfIntoMergeBatch();
      setExportNotice("PDFs merged successfully. Your combined document is ready.");
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "PDF merge failed. Please try again.",
      );
    } finally {
      setIsPdfMergeProcessing(false);
    }
  }

  async function compressLoadedPdf() {
    if (!pdfBytesRef.current || pdfPageCount === 0) {
      setUploadError("Upload a PDF to compress.");
      return;
    }

    setIsPdfCompressProcessing(true);
    setUploadError("");
    setLastPdfCompressResult(null);

    try {
      const result = await compressPdfBytes(pdfBytesRef.current);
      const compressedFile = new File(
        [result.blob],
        buildCompressedPdfFileName(fileName ?? "document.pdf"),
        { type: "application/pdf" },
      );

      await loadPdfFile(compressedFile);
      setActiveEditorPanel("pdfDocs");
      setActivePdfTool("compress");
      setLastPdfCompressResult({
        compressedSize: result.compressedSize,
        originalSize: result.originalSize,
        savedBytes: result.savedBytes,
        savedPercent: result.savedPercent,
      });

      if (result.savedBytes > 0) {
        setExportNotice(
          `PDF compressed successfully (${result.savedPercent.toFixed(1)}% smaller).`,
        );
      } else {
        setExportNotice("PDF optimized. File size was already minimal.");
      }
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "PDF compression failed. Please try again.",
      );
    } finally {
      setIsPdfCompressProcessing(false);
    }
  }

  function clearVideoBatch() {
    revokeBatchVideoObjectUrls(videoBatch);
    setVideoBatch([]);
    setActiveBatchVideoId(null);
    clearVideoShortenHistory();
  }

  function applyActiveBatchVideoEntry(entry: BatchVideoEntry) {
    if (objectUrlRef.current && objectUrlRef.current !== entry.objectUrl) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    objectUrlRef.current = entry.objectUrl;
    setActiveBatchVideoId(entry.id);
    setVideoUrl(entry.objectUrl);
    setVideoDuration(entry.duration);
    initializeVideoTrimState(entry.duration);
    setVideoSize({
      height: entry.height,
      width: entry.width,
    });
    setFileName(entry.fileName);
    setVideoFileSize(entry.fileSize);
    initializeVideoBlurState(entry.duration);
  }

  async function appendVideoBatchFiles(files: File[]) {
    const videoFiles = files.filter(isVideoFile);

    if (!videoFiles.length) {
      setUploadError("Please choose MP4, MOV, or WebM videos.");
      return;
    }

    if (mediaKind !== "video" || videoBatch.length === 0) {
      setUploadError("Load a video before adding more.");
      return;
    }

    setUploadError("");

    try {
      const loadedEntries = await Promise.all(
        videoFiles.map((file) => createBatchVideoEntryFromFile(file)),
      );
      const nextBatch = [...videoBatch, ...loadedEntries];
      setMediaKind("video");
      clearImageBatch();
      clearPdfState();
      setImage(null);
      setVideoBatch(nextBatch);
      applyActiveBatchVideoEntry(loadedEntries[loadedEntries.length - 1]!);
      finishMediaLoad("video");
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "We could not load those videos. Please try again.",
      );
    }
  }

  async function blobToBase64(blob: Blob) {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";

    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]!);
    }

    return btoa(binary);
  }

  function base64ToVideoFile(base64: string, fileName: string) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new File([bytes], fileName, { type: "video/mp4" });
  }

  async function mergeVideoBatchClips() {
    if (videoBatch.length < 2) {
      setUploadError("Add at least two videos before merging.");
      return;
    }

    setIsVideoEditProcessing(true);
    setUploadError("");
    setExportNotice("");

    try {
      const canUseClient = videoBatch.every((entry) =>
        isClientVideoExportEligible(entry.duration, entry.width, entry.height),
      );
      let mergedBlob: Blob;

      if (canUseClient) {
        mergedBlob = await mergeVideoBlobs({
          videos: videoBatch.map((entry) => ({
            blob: entry.file,
            fileName: entry.fileName,
          })),
        });
      } else {
        const response = await fetch("/api/watermark/video/edit", {
          body: JSON.stringify({
            action: "merge",
            videos: await Promise.all(
              videoBatch.map(async (entry) => ({
                fileName: entry.fileName,
                videoBase64: await blobToBase64(entry.file),
              })),
            ),
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const payload = (await response.json()) as {
          error?: string;
          fileName?: string;
          videoBase64?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Video merge failed.");
        }

        mergedBlob = base64ToVideoFile(
          payload.videoBase64!,
          payload.fileName ?? "merged-video.mp4",
        );
      }

      revokeBatchVideoObjectUrls(videoBatch);
      const mergedEntry = await createBatchVideoEntryFromFile(
        new File([mergedBlob], "merged-video.mp4", { type: mergedBlob.type }),
      );
      setVideoBatch([mergedEntry]);
      applyActiveBatchVideoEntry(mergedEntry);
      pendingMergedVideoPreviewRef.current = true;
      setActiveEditorPanel("video");
      setActiveVideoTool("trim");
      setVideoPreviewTime(0);
      setExportNotice("Videos merged into one clip. Trim the result on the timeline.");
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Video merge failed. Please try again.",
      );
    } finally {
      setIsVideoEditProcessing(false);
    }
  }

  function selectBatchVideo(id: string) {
    const entry = videoBatch.find((item) => item.id === id);

    if (!entry) {
      return;
    }

    applyActiveBatchVideoEntry(entry);
  }

  function removeBatchVideo(id: string) {
    const nextBatch = videoBatch.filter((entry) => entry.id !== id);
    const removed = videoBatch.find((entry) => entry.id === id);

    if (removed) {
      URL.revokeObjectURL(removed.objectUrl);
    }

    if (nextBatch.length === 0) {
      clearVideoBatch();
      removeLoadedMedia();
      return;
    }

    setVideoBatch(nextBatch);

    if (activeBatchVideoId === id) {
      applyActiveBatchVideoEntry(nextBatch[nextBatch.length - 1]!);
    }
  }

  function createBatchImageId() {
    return crypto.randomUUID();
  }

  function revokeBatchObjectUrls(entries: BatchImageEntry[]) {
    for (const entry of entries) {
      if (entry.objectUrl !== objectUrlRef.current) {
        URL.revokeObjectURL(entry.objectUrl);
      }
    }
  }

  function createBatchImageEntry(
    file: File,
    imageElement: HTMLImageElement,
    objectUrl: string,
    id = createBatchImageId(),
  ): BatchImageEntry {
    return {
      blurStrokes: [],
      fileName: file.name,
      id,
      image: imageElement,
      objectUrl,
      resizeHeight: imageElement.naturalHeight,
      resizeWidth: imageElement.naturalWidth,
      rotationAngle: 0,
      uploadedImageSize: {
        height: imageElement.naturalHeight,
        width: imageElement.naturalWidth,
      },
    };
  }

  function loadImageElementFromFile(file: File) {
    return new Promise<{
      file: File;
      image: HTMLImageElement;
      objectUrl: string;
    }>((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const nextImage = new Image();

      nextImage.onload = () => {
        resolve({ file, image: nextImage, objectUrl });
      };
      nextImage.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("We could not load that image. Please try another file."));
      };
      nextImage.src = objectUrl;
    });
  }

  function persistActiveBatchEntry(
    batch: BatchImageEntry[],
    activeId: string | null,
  ) {
    if (!activeId || !image || !uploadedImageSize || mediaKind !== "image") {
      return batch;
    }

    return batch.map((entry) =>
      entry.id === activeId
        ? {
            ...entry,
            blurStrokes: cloneBlurStrokes(blurStrokes),
            image,
            resizeHeight,
            resizeWidth,
            rotationAngle,
            uploadedImageSize,
          }
        : entry,
    );
  }

  function updateBlurStrokes(
    updater: (current: BlurStroke[]) => BlurStroke[],
  ) {
    setBlurStrokes((current) => {
      const next = updater(current);

      if (activeBatchImageId) {
        setImageBatch((batch) =>
          batch.map((entry) =>
            entry.id === activeBatchImageId
              ? { ...entry, blurStrokes: cloneBlurStrokes(next) }
              : entry,
          ),
        );
      }

      return next;
    });
  }

  function applyActiveBatchEntry(entry: BatchImageEntry) {
    objectUrlRef.current = entry.objectUrl;
    setActiveBatchImageId(entry.id);
    setImage(entry.image);
    setFileName(entry.fileName);
    setUploadedImageSize(entry.uploadedImageSize);
    setResizeWidth(entry.resizeWidth);
    setResizeHeight(entry.resizeHeight);
    setRotationAngle(entry.rotationAngle);
    setBlurStrokes(cloneBlurStrokes(entry.blurStrokes));
    setResizeWarning("");
    setActiveImageTool(null);
    setCropRect(null);
    setIsWatermarkHovering(false);
  }

  function clearPdfState() {
    if (pdfDocRef.current) {
      void pdfDocRef.current.cleanup();
      pdfDocRef.current = null;
    }

    pdfBytesRef.current = null;
    setPdfPages([]);
    setPdfPageCount(0);
    setActivePdfPageId(null);
    setPdfPageSignatures({});
    setPdfPageFillMap({});
    setPdfDocumentTool("signature");
    setActiveFillFieldId(null);
    setActiveSignaturePlacementId(null);
    setLastPdfCompressResult(null);
  }

  function getActivePdfPageSignatureWorkingState(): PdfPageSignaturePlacement | null {
    if (mediaKind !== "pdf" || !activePdfPageId || !activeSignaturePlacementId) {
      return null;
    }

    const existing = pdfPageSignatures[activePdfPageId]?.find(
      (placement) => placement.id === activeSignaturePlacementId,
    );

    if (!existing) {
      return null;
    }

    return {
      ...existing,
      customPosition: customPosition ? { ...customPosition } : null,
      fontSizeScale,
      opacity: watermarkOpacity,
      watermarkPosition,
    };
  }

  function getPdfPageSignaturesWithActivePersisted(): PdfPageSignatureMap {
    const workingState = getActivePdfPageSignatureWorkingState();

    if (!workingState || !activePdfPageId) {
      return pdfPageSignatures;
    }

    return upsertPdfPageSignaturePlacement(
      pdfPageSignatures,
      activePdfPageId,
      workingState,
    );
  }

  function getPdfPageSignaturePlacementsForPaint() {
    if (mediaKind !== "pdf" || !activePdfPageId) {
      return [];
    }

    const placements =
      getPdfPageSignaturesWithActivePersisted()[activePdfPageId] ?? [];

    return placements.flatMap((placement) => {
      const signature = savedSignatures.find(
        (entry) => entry.id === placement.signatureId,
      );

      if (!signature?.image) {
        return [];
      }

      const isActive =
        pdfDocumentTool === "signature" &&
        placement.id === activeSignaturePlacementId;

      return [
        {
          customPosition:
            isActive && customPosition
              ? { ...customPosition }
              : placement.customPosition,
          fontSizeScale: isActive ? fontSizeScale : placement.fontSizeScale,
          id: placement.id,
          image: signature.image,
          isActive,
          opacity: isActive ? watermarkOpacity : placement.opacity,
          watermarkPosition: isActive
            ? watermarkPosition
            : placement.watermarkPosition,
        },
      ];
    });
  }

  function applyPdfPageSignaturePlacementToEditor(
    placement: PdfPageSignaturePlacement | null | undefined,
  ) {
    if (!placement) {
      setActiveSignaturePlacementId(null);
      setActiveSignatureId(null);
      if (!isPdfWatermarkMode()) {
        setLogoImage(null);
      }
      setCustomPosition(null);
      setWatermarkPosition("bottom-right");
      setFontSizeScale(100);
      setWatermarkOpacity(70);
      setIsWatermarkHovering(false);
      return;
    }

    const signature = savedSignatures.find(
      (entry) => entry.id === placement.signatureId,
    );

    setActiveSignaturePlacementId(placement.id);
    setActiveSignatureId(placement.signatureId);
    if (isPdfSignFillMode()) {
      setLogoImage(signature?.image ?? null);
      setCustomPosition(
        placement.customPosition ? { ...placement.customPosition } : null,
      );
      setWatermarkPosition(placement.watermarkPosition);
      setFontSizeScale(placement.fontSizeScale);
      setWatermarkOpacity(placement.opacity);
    }
    setIsWatermarkHovering(false);
  }

  function syncActivePdfPageSignature(
    updater: (current: PdfPageSignaturePlacement) => PdfPageSignaturePlacement,
  ) {
    if (mediaKind !== "pdf" || !activePdfPageId || !activeSignaturePlacementId) {
      return;
    }

    setPdfPageSignatures((currentMap) => {
      const placements = currentMap[activePdfPageId] ?? [];
      const index = placements.findIndex(
        (placement) => placement.id === activeSignaturePlacementId,
      );

      if (index === -1) {
        return currentMap;
      }

      return upsertPdfPageSignaturePlacement(
        currentMap,
        activePdfPageId,
        updater(placements[index]),
      );
    });
  }

  function getActivePdfPageFillFields(): PdfFillTextField[] {
    if (mediaKind !== "pdf" || !activePdfPageId) {
      return [];
    }

    return pdfPageFillMap[activePdfPageId] ?? [];
  }

  function getPdfPageFillMapWithActivePersisted(): PdfPageFillMap {
    return pdfPageFillMap;
  }

  function persistActivePdfPageFillFields(
    map: PdfPageFillMap,
    pageId: string,
    fields: PdfFillTextField[],
  ): PdfPageFillMap {
    return persistPdfPageFillFields(map, pageId, fields);
  }

  function applyPdfPageFillFieldsToEditor(fields: PdfFillTextField[]) {
    setActiveFillFieldId(fields[0]?.id ?? null);
  }

  function syncActivePdfPageFillFields(
    updater: (current: PdfFillTextField[]) => PdfFillTextField[],
  ) {
    if (mediaKind !== "pdf" || !activePdfPageId) {
      return;
    }

    setPdfPageFillMap((currentMap) =>
      persistPdfPageFillFields(
        currentMap,
        activePdfPageId,
        updater(currentMap[activePdfPageId] ?? []),
      ),
    );
  }

  function buildSignatureManifestForExport() {
    return buildSignatureManifestFromSavedSignatures(savedSignatures);
  }

  async function handleAddTextClick() {
    setActiveEditorPanel("pdfDocs");
    setActivePdfTool("signFill");
    setPdfDocumentTool("fill");
    applyPdfPageFillFieldsToEditor(getActivePdfPageFillFields());
  }

  function getCustomPositionFromBounds(
    bounds: TextBounds,
    canvas: HTMLCanvasElement,
  ) {
    const { width, height } = getCanvasLogicalSize(canvas);

    return {
      xPercent: (bounds.left + bounds.right) / 2 / width,
      yPercent: (bounds.top + bounds.bottom) / 2 / height,
    };
  }

  function deselectActiveFillField() {
    setActiveFillFieldId(null);
    setFillHoverResizeHandle(null);
    setFillHoverFrameAction(null);
    setIsFillFieldHovering(false);
  }

  function deselectActiveSignaturePlacement() {
    applyPdfPageSignaturePlacementToEditor(null);
    setSignatureHoverResizeHandle(null);
    setSignatureHoverFrameAction(null);
    setIsSignaturePlacementHovering(false);
  }

  function removeFillFieldFromPage(fieldId: string) {
    syncActivePdfPageFillFields((fields) =>
      fields.filter((field) => field.id !== fieldId),
    );
    setActiveFillFieldId((currentId) => (currentId === fieldId ? null : currentId));
    setFillHoverResizeHandle(null);
    setFillHoverFrameAction(null);
    setIsFillFieldHovering(false);
  }

  function removeSignaturePlacementFromPage(placementId: string) {
    if (!activePdfPageId) {
      return;
    }

    setPdfPageSignatures((currentMap) => {
      const nextMap = removePdfPageSignaturePlacement(
        currentMap,
        activePdfPageId,
        placementId,
      );
      const remaining = nextMap[activePdfPageId] ?? [];

      if (placementId === activeSignaturePlacementId) {
        applyPdfPageSignaturePlacementToEditor(
          remaining[remaining.length - 1] ?? null,
        );
      }

      return nextMap;
    });
    setSignatureHoverResizeHandle(null);
    setSignatureHoverFrameAction(null);
    setIsSignaturePlacementHovering(false);
  }

  function handleFillFrameAction(action: FillFrameAction, fieldId: string) {
    if (action === "done") {
      deselectActiveFillField();
      return;
    }

    removeFillFieldFromPage(fieldId);
  }

  function handleSignatureFrameAction(
    action: PlacementFrameAction,
    placementId: string,
  ) {
    if (action === "done") {
      deselectActiveSignaturePlacement();
      return;
    }

    removeSignaturePlacementFromPage(placementId);
  }

  function handleSignaturePlacementPointerDown(
    event: PointerEvent<HTMLCanvasElement>,
  ) {
    previewPanDragRef.current = null;
    setIsPreviewPanning(false);

    const point = getCanvasPoint(event);
    const canvas = event.currentTarget;
    const boundsMap = layerBoundsRef.current;

    if (!point || !activePdfPageId) {
      return;
    }

    if (activeSignaturePlacementId) {
      const activeBounds = boundsMap.get(activeSignaturePlacementId);

      if (activeBounds) {
        const frameAction = getPlacementFrameActionAtPoint(point, activeBounds);

        if (frameAction) {
          event.preventDefault();
          handleSignatureFrameAction(frameAction, activeSignaturePlacementId);
          return;
        }

        const resizeHandle = getPlacementResizeHandleAtPoint(point, activeBounds);

        if (resizeHandle) {
          const workingState = getActivePdfPageSignatureWorkingState();
          const placement =
            workingState ??
            pdfPageSignatures[activePdfPageId]?.find(
              (entry) => entry.id === activeSignaturePlacementId,
            );

          if (!placement) {
            return;
          }

          event.preventDefault();
          signatureDragRef.current = {
            mode: "resize",
            origin: point,
            placementId: activeSignaturePlacementId,
            resizeHandle,
            startBounds: { ...activeBounds },
            startCustomPosition: placement.customPosition
              ? { ...placement.customPosition }
              : getCustomPositionFromBounds(activeBounds, canvas),
            startFontSizeScale: placement.fontSizeScale,
          };
          setSignatureHoverResizeHandle(resizeHandle);
          event.currentTarget.setPointerCapture(event.pointerId);
          return;
        }
      }
    }

    const placements =
      getPdfPageSignaturesWithActivePersisted()[activePdfPageId] ?? [];

    for (let index = placements.length - 1; index >= 0; index -= 1) {
      const placement = placements[index];
      const bounds = boundsMap.get(placement.id);

      if (!bounds || !isPointInBounds(point, bounds)) {
        continue;
      }

      if (placement.id !== activeSignaturePlacementId) {
        applyPdfPageSignaturePlacementToEditor(placement);
      }

      event.preventDefault();
      signatureDragRef.current = {
        mode: "move",
        origin: point,
        placementId: placement.id,
        startBounds: { ...bounds },
        startCustomPosition: placement.customPosition
          ? { ...placement.customPosition }
          : getCustomPositionFromBounds(bounds, canvas),
        startFontSizeScale: placement.fontSizeScale,
      };
      setIsSignaturePlacementHovering(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    deselectActiveSignaturePlacement();
    setIsSignaturePlacementHovering(false);
    setSignatureHoverResizeHandle(null);
    setSignatureHoverFrameAction(null);
  }

  function handleSignaturePlacementPointerMove(
    event: PointerEvent<HTMLCanvasElement>,
  ) {
    const point = getCanvasPoint(event);
    const canvas = event.currentTarget;
    const boundsMap = layerBoundsRef.current;

    if (!signatureDragRef.current) {
      if (!point || !activePdfPageId) {
        setIsSignaturePlacementHovering(false);
        setSignatureHoverResizeHandle(null);
        setSignatureHoverFrameAction(null);
        return;
      }

      if (activeSignaturePlacementId) {
        const activeBounds = boundsMap.get(activeSignaturePlacementId);

        if (activeBounds) {
          const frameAction = getPlacementFrameActionAtPoint(point, activeBounds);

          if (frameAction) {
            setSignatureHoverFrameAction(frameAction);
            setSignatureHoverResizeHandle(null);
            setIsSignaturePlacementHovering(false);
            return;
          }

          const resizeHandle = getPlacementResizeHandleAtPoint(point, activeBounds);

          if (resizeHandle) {
            setSignatureHoverResizeHandle(resizeHandle);
            setSignatureHoverFrameAction(null);
            setIsSignaturePlacementHovering(false);
            return;
          }
        }
      }

      const placements =
        getPdfPageSignaturesWithActivePersisted()[activePdfPageId] ?? [];
      let hovering = false;

      for (const placement of placements) {
        const bounds = boundsMap.get(placement.id);

        if (bounds && isPointInBounds(point, bounds)) {
          hovering = true;
          break;
        }
      }

      setIsSignaturePlacementHovering(hovering);
      setSignatureHoverResizeHandle(null);
      setSignatureHoverFrameAction(null);
      return;
    }

    if (!point) {
      return;
    }

    event.preventDefault();

    const drag = signatureDragRef.current;
    const logicalCanvasSize = getCanvasLogicalSize(canvas);
    const dx = (point.x - drag.origin.x) / logicalCanvasSize.width;
    const dy = (point.y - drag.origin.y) / logicalCanvasSize.height;

    if (drag.mode === "move") {
      const nextCustomPosition = {
        xPercent: Math.min(1, Math.max(0, drag.startCustomPosition.xPercent + dx)),
        yPercent: Math.min(1, Math.max(0, drag.startCustomPosition.yPercent + dy)),
      };

      setCustomPosition(nextCustomPosition);
      setPdfPageSignatures((currentMap) => {
        if (!activePdfPageId) {
          return currentMap;
        }

        const placements = currentMap[activePdfPageId] ?? [];
        const existing = placements.find((entry) => entry.id === drag.placementId);

        if (!existing) {
          return currentMap;
        }

        return upsertPdfPageSignaturePlacement(currentMap, activePdfPageId, {
          ...existing,
          customPosition: nextCustomPosition,
        });
      });
      return;
    }

    if (!drag.resizeHandle) {
      return;
    }

    const resized = applyCenteredPlacementResize({
      canvasHeight: logicalCanvasSize.height,
      canvasWidth: logicalCanvasSize.width,
      handle: drag.resizeHandle,
      pointer: point,
      startBounds: drag.startBounds,
      startFontSizeScale: drag.startFontSizeScale,
    });

    setCustomPosition(resized.customPosition);
    setFontSizeScale(resized.fontSizeScale);
    setPdfPageSignatures((currentMap) => {
      if (!activePdfPageId) {
        return currentMap;
      }

      const placements = currentMap[activePdfPageId] ?? [];
      const existing = placements.find((entry) => entry.id === drag.placementId);

      if (!existing) {
        return currentMap;
      }

      return upsertPdfPageSignaturePlacement(currentMap, activePdfPageId, {
        ...existing,
        customPosition: resized.customPosition,
        fontSizeScale: resized.fontSizeScale,
        watermarkPosition: "center",
      });
    });
  }

  function handleSignaturePlacementPointerUp(
    event: PointerEvent<HTMLCanvasElement>,
  ) {
    if (!signatureDragRef.current) {
      return;
    }

    event.preventDefault();
    signatureDragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleFillFieldPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    previewPanDragRef.current = null;
    setIsPreviewPanning(false);

    const point = getCanvasPoint(event);

    if (!point) {
      return;
    }

    if (activeFillFieldId) {
      const activeBounds = fillFieldBoundsRef.current[activeFillFieldId];

      if (activeBounds) {
        const frameAction = getFillFrameActionAtPoint(point, activeBounds);

        if (frameAction) {
          event.preventDefault();
          handleFillFrameAction(frameAction, activeFillFieldId);
          return;
        }

        const resizeHandle = getFillResizeHandleAtPoint(point, activeBounds);

        if (resizeHandle) {
          const field = getActivePdfPageFillFields().find(
            (entry) => entry.id === activeFillFieldId,
          );

          if (!field) {
            return;
          }

          event.preventDefault();
          fillDragRef.current = {
            fieldId: field.id,
            mode: "resize",
            origin: point,
            resizeHandle,
            startField: { ...field },
          };
          setFillHoverResizeHandle(resizeHandle);
          event.currentTarget.setPointerCapture(event.pointerId);
          return;
        }
      }
    }

    const fields = getActivePdfPageFillFields();

    for (let index = fields.length - 1; index >= 0; index -= 1) {
      const field = fields[index];
      const bounds = fillFieldBoundsRef.current[field.id];

      if (!bounds || !field.text.trim()) {
        continue;
      }

      if (isPointInBounds(point, bounds)) {
        event.preventDefault();
        fillDragRef.current = {
          fieldId: field.id,
          mode: "move",
          origin: point,
          startField: { ...field },
        };
        setActiveFillFieldId(field.id);
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }
    }

    deselectActiveFillField();
    setIsFillFieldHovering(false);
    setFillHoverResizeHandle(null);
    setFillHoverFrameAction(null);
  }

  function handleFillFieldPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const point = getCanvasPoint(event);
    const canvas = event.currentTarget;

    if (!fillDragRef.current) {
      if (!point) {
        setIsFillFieldHovering(false);
        setFillHoverResizeHandle(null);
        setFillHoverFrameAction(null);
        return;
      }

      if (activeFillFieldId) {
        const activeBounds = fillFieldBoundsRef.current[activeFillFieldId];

        if (activeBounds) {
          const frameAction = getFillFrameActionAtPoint(point, activeBounds);

          if (frameAction) {
            setFillHoverFrameAction(frameAction);
            setFillHoverResizeHandle(null);
            setIsFillFieldHovering(false);
            return;
          }

          const resizeHandle = getFillResizeHandleAtPoint(point, activeBounds);

          if (resizeHandle) {
            setFillHoverResizeHandle(resizeHandle);
            setFillHoverFrameAction(null);
            setIsFillFieldHovering(false);
            return;
          }
        }
      }

      let hovering = false;
      let hoverHandle: FillResizeHandle | null = null;

      for (const field of getActivePdfPageFillFields()) {
        const bounds = fillFieldBoundsRef.current[field.id];

        if (!bounds || !field.text.trim()) {
          continue;
        }

        if (isPointInBounds(point, bounds)) {
          hovering = true;
          break;
        }
      }

      setIsFillFieldHovering(hovering);
      setFillHoverResizeHandle(hoverHandle);
      setFillHoverFrameAction(null);
      return;
    }

    if (!point) {
      return;
    }

    event.preventDefault();

    const drag = fillDragRef.current;
    const { width, height } = getCanvasLogicalSize(canvas);
    const dx = (point.x - drag.origin.x) / width;
    const dy = (point.y - drag.origin.y) / height;

    syncActivePdfPageFillFields((fields) =>
      fields.map((field) => {
        if (field.id !== drag.fieldId) {
          return field;
        }

        if (drag.mode === "move") {
          return {
            ...field,
            xPercent: Math.min(
              1 - field.widthPercent,
              Math.max(0, drag.startField.xPercent + dx),
            ),
            yPercent: Math.min(
              1 - field.heightPercent,
              Math.max(0, drag.startField.yPercent + dy),
            ),
          };
        }

        if (!drag.resizeHandle) {
          return field;
        }

        const startRect = getFillFieldRect(
          drag.startField,
          canvas.width,
          canvas.height,
        );

        return applyFillFieldResize({
          canvasHeight: canvas.height,
          canvasWidth: canvas.width,
          handle: drag.resizeHandle,
          pointer: point,
          startField: drag.startField,
          startRect,
        });
      }),
    );
  }

  function handleFillFieldPointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (!fillDragRef.current) {
      return;
    }

    event.preventDefault();
    fillDragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function removeSignatureFromActivePdfPage() {
    if (
      mediaKind !== "pdf" ||
      !activePdfPageId ||
      !activeSignaturePlacementId
    ) {
      return;
    }

    setPdfPageSignatures((currentMap) => {
      const nextMap = removePdfPageSignaturePlacement(
        currentMap,
        activePdfPageId,
        activeSignaturePlacementId,
      );
      const remaining = nextMap[activePdfPageId] ?? [];
      applyPdfPageSignaturePlacementToEditor(
        remaining[remaining.length - 1] ?? null,
      );
      return nextMap;
    });
  }

  function handleSavedSignaturesChange(nextSignatures: SavedSignature[]) {
    const removedIds = savedSignatures
      .filter(
        (signature) =>
          !nextSignatures.some((entry) => entry.id === signature.id),
      )
      .map((signature) => signature.id);

    setSavedSignatures(nextSignatures);

    if (!removedIds.length || mediaKind !== "pdf") {
      return;
    }

    setPdfPageSignatures((currentMap) => {
      let nextMap = currentMap;

      for (const removedId of removedIds) {
        nextMap = removeSignatureFromPdfPageMap(nextMap, removedId);
      }

      if (activePdfPageId) {
        const remaining = nextMap[activePdfPageId] ?? [];
        const stillSelected = remaining.find(
          (placement) => placement.id === activeSignaturePlacementId,
        );
        applyPdfPageSignaturePlacementToEditor(
          stillSelected ?? remaining[remaining.length - 1] ?? null,
        );
      }

      return nextMap;
    });
  }

  function clearImageBatch() {
    revokeBatchObjectUrls(imageBatch);
    setImageBatch((previousBatch) => (previousBatch.length === 0 ? previousBatch : []));
    setActiveBatchImageId((previousId) => (previousId === null ? previousId : null));
  }

  function selectBatchImage(id: string) {
    if (id === activeBatchImageId) {
      return;
    }

    const nextBatch = persistActiveBatchEntry(imageBatch, activeBatchImageId);
    const nextEntry = nextBatch.find((entry) => entry.id === id);

    if (!nextEntry) {
      return;
    }

    setImageBatch(nextBatch);
    applyActiveBatchEntry(nextEntry);
  }

  function removeBatchImage(id: string) {
    const nextBatch = persistActiveBatchEntry(imageBatch, activeBatchImageId);
    const removedEntry = nextBatch.find((entry) => entry.id === id);

    if (!removedEntry) {
      return;
    }

    if (removedEntry.objectUrl !== objectUrlRef.current) {
      URL.revokeObjectURL(removedEntry.objectUrl);
    }

    const remainingBatch = nextBatch.filter((entry) => entry.id !== id);

    if (remainingBatch.length === 0) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      setImage(null);
      setImageBatch([]);
      setActiveBatchImageId(null);
      setMediaKind(null);
      setFileName("");
      setUploadedImageSize(null);
      setResizeWidth(0);
      setResizeHeight(0);
      setRotationAngle(0);
      setCropRect(null);
      setActiveImageTool(null);
      return;
    }

    setImageBatch(remainingBatch);

    if (id === activeBatchImageId) {
      applyActiveBatchEntry(remainingBatch[0]);
      return;
    }
  }

  async function selectPdfPage(id: string) {
    if (id === activePdfPageId || !pdfDocRef.current) {
      return;
    }

    const entry = pdfPages.find((page) => page.id === id);

    if (!entry) {
      return;
    }

    let nextMap = pdfPageSignatures;
    let nextFillMap = pdfPageFillMap;

    if (mediaKind === "pdf" && activePdfPageId && activeSignaturePlacementId) {
      const workingState = getActivePdfPageSignatureWorkingState();

      if (workingState) {
        nextMap = upsertPdfPageSignaturePlacement(
          pdfPageSignatures,
          activePdfPageId,
          workingState,
        );
        setPdfPageSignatures(nextMap);
      }
    }

    if (mediaKind === "pdf" && activePdfPageId && pdfDocumentTool === "fill") {
      nextFillMap = persistActivePdfPageFillFields(
        pdfPageFillMap,
        activePdfPageId,
        getActivePdfPageFillFields(),
      );
      setPdfPageFillMap(nextFillMap);
    }

    setActivePdfPageId(id);

    try {
      const rendered = await renderPdfPagePreview(
        pdfDocRef.current,
        entry.pageNumber,
      );

      setImage(rendered.image);
      setUploadedImageSize({
        height: rendered.height,
        width: rendered.width,
      });
      setResizeWidth(rendered.width);
      setResizeHeight(rendered.height);

      if (mediaKind === "pdf") {
        const pagePlacements = nextMap[id] ?? [];

        if (isPdfSignFillMode()) {
          applyPdfPageSignaturePlacementToEditor(
            pagePlacements[pagePlacements.length - 1] ?? null,
          );

          if (pdfDocumentTool === "fill") {
            applyPdfPageFillFieldsToEditor(nextFillMap[id] ?? []);
          }
        } else if (isPdfWatermarkMode()) {
          deselectActiveSignaturePlacement();
        }
      }
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "We could not render that PDF page.",
      );
    }
  }

  async function loadPdfFile(file: File) {
    if (!isPdfFile(file)) {
      setUploadError("Please choose a PDF file.");
      return;
    }

    const loadGeneration = ++mediaLoadGenerationRef.current;

    setUploadError("");
    setIsPdfLoading(true);
    setPreviewZoomPercent(PREVIEW_ZOOM_DEFAULT);
    setFileName(file.name);
    setMediaKind("pdf");

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    clearImageBatch();
    clearVideoBatch();
    clearPdfState();
    setImage(null);
    setVideoUrl("");
    setVideoDuration(0);
    setVideoTrimStartSeconds(0);
    setVideoTrimEndSeconds(0);
    setVideoTrimAppliedStartSeconds(0);
    setVideoTrimAppliedEndSeconds(0);
    setVideoCropSavedNotice(false);
    setVideoSize(null);
    setVideoFileSize(0);
    setPdfPages([]);
    setPdfPageCount(0);
    setActivePdfPageId(null);
    pdfDocRef.current = null;
    pdfBytesRef.current = null;

    try {
      const pdfBytes = new Uint8Array(await file.arrayBuffer());

      if (loadGeneration !== mediaLoadGenerationRef.current) {
        return;
      }

      const pdfDocument = await loadPdfDocumentFromBytes(pdfBytes);

      if (loadGeneration !== mediaLoadGenerationRef.current) {
        return;
      }

      pdfBytesRef.current = pdfBytes;
      pdfDocRef.current = pdfDocument;
      setMediaKind("pdf");
      setFileName(file.name);
      setPdfPageCount(pdfDocument.numPages);
      setPdfPageSignatures(createEmptyPdfPageSignatureMap(pdfDocument.numPages));
      setPdfPageFillMap(createEmptyPdfPageFillMap(pdfDocument.numPages));
      setPdfDocumentTool("signature");
      setActiveFillFieldId(null);
      setActiveSignaturePlacementId(null);
      setActivePdfPageId("pdf-page-1");
      applyPdfPageSignaturePlacementToEditor(null);

      const firstPage = await renderPdfPagePreview(pdfDocument, 1);

      if (loadGeneration !== mediaLoadGenerationRef.current) {
        return;
      }

      setImage(firstPage.image);
      setUploadedImageSize({
        height: firstPage.height,
        width: firstPage.width,
      });
      setResizeWidth(firstPage.width);
      setResizeHeight(firstPage.height);
      setRotationAngle(0);
      setResizeWarning("");
      setActiveImageTool(null);
      setCropRect(null);
      setIsWatermarkHovering(false);
      finishMediaLoad("pdf");

      void buildPdfPageThumbnails(pdfDocument)
        .then((pages) => {
          if (loadGeneration !== mediaLoadGenerationRef.current) {
            return;
          }

          setPdfPages(pages);
        })
        .catch((error) => {
          if (loadGeneration !== mediaLoadGenerationRef.current) {
            return;
          }

          setUploadError(
            error instanceof Error
              ? error.message
              : "We could not build PDF page previews.",
          );
        });
    } catch (error) {
      if (loadGeneration !== mediaLoadGenerationRef.current) {
        return;
      }

      clearPdfState();
      setMediaKind(null);
      setFileName("");
      setImage(null);
      setUploadedImageSize(null);
      setUploadError(
        error instanceof Error
          ? error.message
          : "We could not load that PDF. Please try another file.",
      );
    } finally {
      if (loadGeneration === mediaLoadGenerationRef.current) {
        setIsPdfLoading(false);
      }
    }
  }

  async function appendImageBatchFiles(files: File[]) {
    const imageFiles = files.filter(isImageFile);

    if (!imageFiles.length) {
      setUploadError("Please choose JPG, PNG, or WebP images.");
      return;
    }

    setUploadError("");

    try {
      const loadedEntries = await Promise.all(
        imageFiles.map(async (file) => {
          const loaded = await loadImageElementFromFile(file);
          return createBatchImageEntry(
            loaded.file,
            loaded.image,
            loaded.objectUrl,
          );
        }),
      );
      let baseBatch = persistActiveBatchEntry(imageBatch, activeBatchImageId);

      if (
        baseBatch.length === 0 &&
        mediaKind === "image" &&
        image &&
        objectUrlRef.current &&
        uploadedImageSize
      ) {
        const currentEntry: BatchImageEntry = {
          blurStrokes: cloneBlurStrokes(blurStrokes),
          fileName,
          id: createBatchImageId(),
          image,
          objectUrl: objectUrlRef.current,
          resizeHeight,
          resizeWidth,
          rotationAngle,
          uploadedImageSize,
        };

        baseBatch = [currentEntry];
        setActiveBatchImageId(currentEntry.id);
      }

      const nextBatch = [...baseBatch, ...loadedEntries];

      setMediaKind("image");
      setVideoUrl("");
      setVideoDuration(0);
      setVideoSize(null);
      setVideoFileSize(0);
      setImageBatch(nextBatch);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "We could not load those images. Please try again.",
      );
    }
  }

  function getWatermarkExportInput(
    imageElement: HTMLImageElement,
    entryResizeWidth: number,
    entryResizeHeight: number,
    entryRotationAngle: number,
    useResizePreview: boolean,
    entryBlurStrokes: BlurStroke[] = blurStrokes,
    entryReferenceImageSize?: CanvasSize,
  ): ExportRenderInput {
    return {
      activeLogoLayerId,
      activeTextLayerId,
      blurStrokes: cloneBlurStrokes(entryBlurStrokes),
      customPosition,
      fontFamily,
      fontSizeScale,
      image: imageElement,
      imageEffectSettings: getImageEffectSettings(),
      logoImage,
      logoLayers,
      previewCanvasSize: previewBaseSize,
      referenceImageSize: entryReferenceImageSize ??
        uploadedImageSize ?? {
          height: imageElement.naturalHeight,
          width: imageElement.naturalWidth,
        },
      resizeHeight: entryResizeHeight,
      resizeWidth: entryResizeWidth,
      rotationAngle: entryRotationAngle,
      textLayers,
      tileAngle,
      tileDensity,
      tileGap,
      useResizePreview,
      watermarkMode,
      watermarkOpacity,
      watermarkPosition,
      watermarkText,
      watermarkType,
    };
  }

  function exportImageToBlob(input: ExportRenderInput) {
    return new Promise<Blob>((resolve, reject) => {
      try {
        const exportCanvas = renderExportCanvas(input);

        exportCanvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(ensureBlobMimeType(blob, imageExportMimeType));
              return;
            }

            try {
              const dataUrl = exportCanvas.toDataURL(
                imageExportMimeType,
                imageExportQuality,
              );
              const [header, base64Data] = dataUrl.split(",");

              if (!base64Data) {
                reject(new Error("We could not export that image. Please try again."));
                return;
              }

              const mimeType =
                header.match(/data:(.*?);/)?.[1] ?? imageExportMimeType;
              const binary = atob(base64Data);
              const bytes = new Uint8Array(binary.length);

              for (let index = 0; index < binary.length; index += 1) {
                bytes[index] = binary.charCodeAt(index);
              }

              resolve(new Blob([bytes], { type: mimeType }));
            } catch {
              reject(new Error("We could not export that image. Please try again."));
            }
          },
          imageExportMimeType,
          imageExportQuality,
        );
      } catch {
        reject(new Error("We could not export that image. Please try again."));
      }
    });
  }

  function getUniqueZipEntryName(fileName: string, usedNames: Set<string>) {
    const exportName = getExportFileName(fileName);
    let candidate = exportName;
    let duplicateIndex = 2;

    while (usedNames.has(candidate)) {
      const extensionIndex = exportName.lastIndexOf(".");
      const baseName =
        extensionIndex >= 0 ? exportName.slice(0, extensionIndex) : exportName;
      const extension =
        extensionIndex >= 0 ? exportName.slice(extensionIndex) : "";
      candidate = `${baseName}-${duplicateIndex}${extension}`;
      duplicateIndex += 1;
    }

    usedNames.add(candidate);
    return candidate;
  }

  async function handleExportAll() {
    if (isExporting || imageBatch.length < 2) {
      return;
    }

    setUploadError("");
    setExportError("");
    setIsExporting(true);
    setIsExportPreparing(true);
    setBatchExportProgress({ current: 0, total: imageBatch.length });

    const exportId = createExportId();
    const fileType = getCurrentExportFileType();

    try {
      const nextBatch = persistActiveBatchEntry(imageBatch, activeBatchImageId);
      setImageBatch(nextBatch);

      const auth = await resolveExportAuthorization({
        exportId,
        fileMeta: { photoCount: nextBatch.length },
        fileType,
      });
      applyAuthorizeNotice(auth);
      setIsExportPreparing(false);

      const zip = new JSZip();
      const usedNames = new Set<string>();

      for (const [index, entry] of nextBatch.entries()) {
        setBatchExportProgress({
          current: index + 1,
          total: nextBatch.length,
        });

        const blob = await exportImageToBlob(
          await getExportRenderInputForAuth(
            entry.image,
            entry.resizeWidth,
            entry.resizeHeight,
            entry.rotationAngle,
            false,
            auth,
            entry.blurStrokes,
            entry.uploadedImageSize,
          ),
        );

        zip.file(
          getUniqueZipEntryName(entry.fileName, usedNames),
          ensureBlobMimeType(blob, imageExportMimeType),
        );
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, "watermarked-images.zip");

      if (isCleanExportTier(auth.tier)) {
        await finalizeCleanExportBilling(auth);
      }
    } catch {
      setUploadError("We could not export those images. Please try again.");
    } finally {
      setIsExporting(false);
      setIsExportPreparing(false);
      setBatchExportProgress(null);
    }
  }

  function openLogoPicker() {
    logoInputRef.current?.click();
  }

  function handleWatermarkOpacityChange(value: number) {
    if (shouldIgnoreManualSettingsChange()) {
      return;
    }

    if (watermarkType === "text") {
      clearActiveTextTemplate();
    } else if (watermarkType === "logo") {
      clearActiveLogoTemplate();
    } else {
      clearActiveTemplates();
    }

    setWatermarkOpacity(value);
    syncActivePdfPageSignature((current) => ({
      ...current,
      opacity: value,
    }));
  }

  function handleFontSizeScaleChange(value: number) {
    if (shouldIgnoreManualSettingsChange()) {
      return;
    }

    if (watermarkType === "text") {
      clearActiveTextTemplate();
    } else if (watermarkType === "logo") {
      clearActiveLogoTemplate();
    } else {
      clearActiveTemplates();
    }

    setFontSizeScale(value);
    syncActivePdfPageSignature((current) => ({
      ...current,
      fontSizeScale: value,
    }));
  }

  function handleFontFamilyChange(value: string) {
    if (shouldIgnoreManualSettingsChange()) {
      return;
    }

    clearActiveTextTemplate();
    setFontFamily(value);
    void loadWatermarkFont(value, fontWeight);
  }

  function handleFontWeightChange(value: TextWatermarkFontWeight) {
    if (shouldIgnoreManualSettingsChange()) {
      return;
    }

    clearActiveTextTemplate();
    setFontWeight(value);
    void loadWatermarkFont(fontFamily, value);
  }

  function handleTextColorChange(value: string) {
    if (shouldIgnoreManualSettingsChange()) {
      return;
    }

    clearActiveTextTemplate();
    setTextColor(value);
  }

  function clearActiveTextTemplate() {
    setActiveTextTemplate(null);
  }

  function clearActiveLogoTemplate() {
    setActiveLogoTemplate(null);
  }

  function clearActiveTemplates() {
    clearActiveTextTemplate();
    clearActiveLogoTemplate();
  }

  function shouldIgnoreManualSettingsChange() {
    return shouldIgnoreManualSettingsRef.current;
  }

  const activeTextLayer =
    textLayers.find((layer) => layer.id === activeTextLayerId) ?? textLayers[0];
  const activeLogoLayer =
    logoLayers.find((layer) => layer.id === activeLogoLayerId) ?? logoLayers[0];
  const activePlacementSignatureKind =
    mediaKind === "pdf" &&
    activePdfPageId &&
    activeSignaturePlacementId
      ? (savedSignatures.find(
          (signature) =>
            signature.id ===
            pdfPageSignatures[activePdfPageId]?.find(
              (placement) => placement.id === activeSignaturePlacementId,
            )?.signatureId,
        )?.kind ?? null)
      : null;

  function syncLegacyFromTextLayer(layer: TextWatermarkLayer) {
    setWatermarkText(layer.text);
    setWatermarkOpacity(layer.opacity);
    setFontFamily(layer.fontFamily);
    setFontSizeScale(layer.fontSizeScale);
    setFontWeight(layer.fontWeight ?? DEFAULT_TEXT_WATERMARK_FONT_WEIGHT);
    setTextColor(layer.textColor ?? DEFAULT_TEXT_WATERMARK_COLOR);
    setTextShadowEnabled(layer.textShadowEnabled ?? DEFAULT_TEXT_SHADOW_ENABLED);
    setWatermarkPosition(layer.watermarkPosition);
    setCustomPosition(
      layer.customPosition ? { ...layer.customPosition } : null,
    );
  }

  function handleTextWatermarkChange(value: string) {
    const patch: Partial<TextWatermarkLayer> = { text: value };

    if (
      mediaKind === "video" &&
      watermarkMode === "single" &&
      value.trim() &&
      !activeTextLayer.text.trim()
    ) {
      patch.customPosition = null;
      patch.watermarkPosition = "top-left";
    }

    updateTextLayer(activeTextLayerId, patch);
    setWatermarkText(value);

    if (patch.watermarkPosition) {
      setWatermarkPosition(patch.watermarkPosition);
      setCustomPosition(null);
    }
  }

  function syncLegacyFromLogoLayer(layer: LogoWatermarkLayer) {
    setLogoImage(layer.logoImage);
    setOriginalLogoImage(layer.originalLogoImage);
    setBackgroundRemovedLogoImage(layer.backgroundRemovedLogoImage);
    setLogoFileName(layer.logoFileName);
    setIsLogoBackgroundRemoved(layer.isLogoBackgroundRemoved);
    setWatermarkOpacity(layer.opacity);
    setFontSizeScale(layer.fontSizeScale);
    setWatermarkPosition(layer.watermarkPosition);
    setCustomPosition(
      layer.customPosition ? { ...layer.customPosition } : null,
    );
  }

  function getTextLayersForPaint() {
    const override = watermarkDragOverrideRef.current;

    if (!override || watermarkType !== "text") {
      return textLayers;
    }

    return textLayers.map((layer) =>
      layer.id === override.layerId
        ? { ...layer, customPosition: override.customPosition }
        : layer,
    );
  }

  function getLogoLayersForPaint() {
    const override = watermarkDragOverrideRef.current;

    if (!override || watermarkType !== "logo") {
      return logoLayers;
    }

    return logoLayers.map((layer) =>
      layer.id === override.layerId
        ? { ...layer, customPosition: override.customPosition }
        : layer,
    );
  }

  function paintVideoOverlayCanvas() {
    if (mediaKind !== "video") {
      return;
    }

    const canvas = videoOverlayCanvasRef.current;

    if (!canvas || !videoOverlaySize.width || !videoOverlaySize.height) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    canvas.width = videoOverlaySize.width;
    canvas.height = videoOverlaySize.height;
    context.clearRect(0, 0, canvas.width, canvas.height);

    const paintTextLayers = getTextLayersForPaint();
    const paintLogoLayers = getLogoLayersForPaint();

    if (shouldPaintVideoWatermarkPreview() && videoSize) {
      const video = videoElementRef.current;
      const frame =
        video && video.readyState >= 2
          ? getVideoElementFrameInCanvas(canvas, video)
          : getVideoDisplayFrame(
              canvas.width,
              canvas.height,
              videoSize.width,
              videoSize.height,
            );
      const { activeBounds, boundsByLayer } = paintWatermarkLayers({
        activeLayerId:
          watermarkType === "text"
            ? activeTextLayerId
            : watermarkType === "logo"
              ? activeLogoLayerId
              : activeTextLayerId,
        canvasHeight: canvas.height,
        canvasWidth: canvas.width,
        context,
        imageHeight: frame.height,
        imageWidth: frame.width,
        imageX: frame.x,
        imageY: frame.y,
        logoLayers: paintLogoLayers,
        resolveCustomPosition: (position) => ({
          textAlign: "center",
          textBaseline: "middle",
          x: frame.x + position.xPercent * frame.width,
          y: frame.y + position.yPercent * frame.height,
        }),
        signatureFontSizeScale: fontSizeScale,
        signatureImage: watermarkType === "signature" ? logoImage : null,
        signatureOpacity: watermarkOpacity,
        signaturePosition: watermarkPosition,
        signatureCustomPosition: customPosition,
        textLayers: paintTextLayers,
        tileAngle,
        tileDensity,
        tileGap,
        videoDurationSeconds: videoDuration,
        videoPreviewTimeSeconds: videoPreviewTime,
        watermarkMode,
        watermarkReferenceWidth: frame.width,
        watermarkType,
      });

      layerBoundsRef.current = boundsByLayer;
      textBoundsRef.current = activeBounds;
    } else {
      layerBoundsRef.current = new Map();
      textBoundsRef.current = null;
    }

    if (
      captionsMasterEnabled &&
      videoCaptionLayers.some((layer) => isCaptionLayerActive(layer))
    ) {
      captionBoundsRef.current = drawVideoCaptions(
        context,
        canvas.width,
        canvas.height,
        videoCaptionLayers,
        videoPreviewTime,
        videoDuration,
        {
          highlightLayerId:
            activeEditorPanel === "video" && activeVideoTool === "caption"
              ? activeVideoCaptionLayerId
              : undefined,
        },
      );
    } else {
      captionBoundsRef.current = new Map();
    }

    const video = videoElementRef.current;

    if (video && videoSize && activeVideoTool === "blur") {
      drawVideoBlurPreview(
        context,
        canvas,
        video,
        videoBlurRegions,
        videoPreviewTime,
        videoSize.width,
        videoSize.height,
        true,
      );
    }
  }

  function scheduleWatermarkDragRepaint() {
    if (watermarkDragRafRef.current !== null) {
      return;
    }

    watermarkDragRafRef.current = window.requestAnimationFrame(() => {
      watermarkDragRafRef.current = null;

      if (mediaKind === "video") {
        paintVideoOverlayCanvas();
        return;
      }

      if (mediaKind === "image" || mediaKind === "pdf") {
        setWatermarkDragFrame((frame) => frame + 1);
      }
    });
  }

  function applyWatermarkDragPosition(
    layerId: string,
    canvas: HTMLCanvasElement,
    point: { x: number; y: number },
  ) {
    watermarkDragOverrideRef.current = {
      customPosition: canvasPointToPercent(canvas, point),
      layerId,
    };
    scheduleWatermarkDragRepaint();
  }

  function commitWatermarkDragPosition() {
    const override = watermarkDragOverrideRef.current;
    watermarkDragOverrideRef.current = null;

    if (!override) {
      return;
    }

    if (watermarkType === "text") {
      updateTextLayer(override.layerId, {
        customPosition: override.customPosition,
      });
      syncLegacyFromTextLayer({
        ...activeTextLayer,
        customPosition: override.customPosition,
      });
      return;
    }

    if (watermarkType === "logo") {
      updateLogoLayer(override.layerId, {
        customPosition: override.customPosition,
      });
      syncLegacyFromLogoLayer({
        ...activeLogoLayer,
        customPosition: override.customPosition,
      });
      return;
    }

    setCustomPosition(override.customPosition);
    syncActivePdfPageSignature((current) => ({
      ...current,
      customPosition: override.customPosition,
    }));
  }

  function discardWatermarkDragPosition() {
    watermarkDragOverrideRef.current = null;
    cancelWatermarkDragRepaint();

    if (mediaKind === "video") {
      paintVideoOverlayCanvas();
      return;
    }

    if (mediaKind === "image" || mediaKind === "pdf") {
      setWatermarkDragFrame((frame) => frame + 1);
    }
  }

  function cancelWatermarkDragRepaint() {
    if (watermarkDragRafRef.current !== null) {
      window.cancelAnimationFrame(watermarkDragRafRef.current);
      watermarkDragRafRef.current = null;
    }
  }

  function setLayerCustomPosition(
    layerId: string,
    canvas: HTMLCanvasElement,
    point: { x: number; y: number },
  ) {
    const position = canvasPointToPercent(canvas, point);

    if (watermarkType === "text") {
      updateTextLayer(layerId, { customPosition: position });
      syncLegacyFromTextLayer({
        ...activeTextLayer,
        customPosition: position,
      });
      return;
    }

    if (watermarkType === "logo") {
      updateLogoLayer(layerId, { customPosition: position });
      syncLegacyFromLogoLayer({
        ...activeLogoLayer,
        customPosition: position,
      });
      return;
    }

    setCustomPosition(position);
    syncActivePdfPageSignature((current) => ({
      ...current,
      customPosition: position,
    }));
  }

  function updateTextLayer(
    layerId: string,
    patch: Partial<TextWatermarkLayer>,
  ) {
    clearActiveTextTemplate();
    const isAssigningVisibility =
      typeof patch.visibleFromSeconds === "number" ||
      typeof patch.visibleUntilSeconds === "number";

    setTextLayers((layers) =>
      layers.map((layer) => {
        if (layer.id === layerId) {
          return { ...layer, ...patch };
        }

        if (isAssigningVisibility) {
          return {
            ...layer,
            visibleFromSeconds: undefined,
            visibleUntilSeconds: undefined,
          };
        }

        return layer;
      }),
    );
  }

  function updateLogoLayer(
    layerId: string,
    patch: Partial<LogoWatermarkLayer>,
  ) {
    clearActiveLogoTemplate();
    setLogoLayers((layers) =>
      layers.map((layer) =>
        layer.id === layerId ? { ...layer, ...patch } : layer,
      ),
    );
  }

  function addTextLayer() {
    if (watermarkMode !== "single") {
      return;
    }

    const nextLayer = createDefaultTextLayer();
    setTextLayers((layers) => [...layers, nextLayer]);
    setActiveTextLayerId(nextLayer.id);
    syncLegacyFromTextLayer(nextLayer);
    setIsWatermarkHovering(false);
  }

  function addLogoLayer() {
    if (watermarkMode !== "single") {
      return;
    }

    const nextLayer = createDefaultLogoLayer();
    setLogoLayers((layers) => [...layers, nextLayer]);
    setActiveLogoLayerId(nextLayer.id);
    setIsWatermarkHovering(false);
  }

  function removeTextLayer(layerId: string) {
    if (textLayers.length <= 1) {
      return;
    }

    const removed = textLayers.find((layer) => layer.id === layerId);

    if (removed) {
      // no-op placeholder for future cleanup
    }

    const remaining = textLayers.filter((layer) => layer.id !== layerId);
    setTextLayers(remaining);

    if (activeTextLayerId === layerId) {
      setActiveTextLayerId(remaining[0]?.id ?? activeTextLayerId);
    }
  }

  function removeLogoLayer(layerId: string) {
    if (logoLayers.length <= 1) {
      return;
    }

    const removed = logoLayers.find((layer) => layer.id === layerId);

    if (removed) {
      revokeLogoLayerUrls(removed);
    }

    const remaining = logoLayers.filter((layer) => layer.id !== layerId);
    setLogoLayers(remaining);

    if (activeLogoLayerId === layerId) {
      setActiveLogoLayerId(remaining[0]?.id ?? activeLogoLayerId);
    }
  }

  function getWatermarkSettingsSnapshot(): WatermarkSettingsSnapshot {
    return {
      activeLogoLayerId,
      activeTextLayerId,
      backgroundRemovedLogoImage: activeLogoLayer.backgroundRemovedLogoImage,
      blurBrushSize,
      blurStrokes: cloneBlurStrokes(blurStrokes),
      customPosition: activeTextLayer.customPosition
        ? { ...activeTextLayer.customPosition }
        : null,
      fontFamily: activeTextLayer.fontFamily,
      fontSizeScale: activeTextLayer.fontSizeScale,
      isLogoBackgroundRemoved: activeLogoLayer.isLogoBackgroundRemoved,
      logoFileName: activeLogoLayer.logoFileName,
      logoImage: activeLogoLayer.logoImage,
      logoLayers: logoLayers.map((layer) => ({ ...layer })),
      originalLogoImage: activeLogoLayer.originalLogoImage,
      pdfDocumentTool: mediaKind === "pdf" ? pdfDocumentTool : undefined,
      pdfPageFillMap:
        mediaKind === "pdf"
          ? serializePdfPageFillMap(getPdfPageFillMapWithActivePersisted())
          : undefined,
      pdfPageSignatures:
        mediaKind === "pdf"
          ? serializePdfPageSignatureMap(getPdfPageSignaturesWithActivePersisted())
          : undefined,
      textLayers: textLayers.map((layer) => ({ ...layer })),
      tileAngle,
      tileDensity,
      tileGap,
      watermarkMode,
      watermarkOpacity: activeTextLayer.opacity,
      watermarkPosition: activeTextLayer.watermarkPosition,
      watermarkText: activeTextLayer.text,
      watermarkType,
    };
  }

  function applyWatermarkSettingsSnapshot(
    snapshot: WatermarkSettingsSnapshot,
    options: { suppressHistory?: boolean } = {},
  ) {
    if (options.suppressHistory) {
      isApplyingSettingsHistoryRef.current = true;
    }

    const nextTextLayers = snapshot.textLayers?.length
      ? snapshot.textLayers.map((layer) => ({ ...layer }))
      : [
          legacySnapshotToTextLayer({
            customPosition: snapshot.customPosition,
            fontFamily: snapshot.fontFamily,
            fontSizeScale: snapshot.fontSizeScale,
            watermarkOpacity: snapshot.watermarkOpacity,
            watermarkPosition: snapshot.watermarkPosition,
            watermarkText: snapshot.watermarkText,
          }),
        ];
    const nextLogoLayers = snapshot.logoLayers?.length
      ? snapshot.logoLayers.map((layer) => ({ ...layer }))
      : [
          legacySnapshotToLogoLayer({
            backgroundRemovedLogoImage: snapshot.backgroundRemovedLogoImage,
            customPosition: snapshot.customPosition,
            fontSizeScale: snapshot.fontSizeScale,
            isLogoBackgroundRemoved: snapshot.isLogoBackgroundRemoved,
            logoFileName: snapshot.logoFileName,
            logoImage: snapshot.logoImage,
            originalLogoImage: snapshot.originalLogoImage,
            watermarkOpacity: snapshot.watermarkOpacity,
            watermarkPosition: snapshot.watermarkPosition,
          }),
        ];

    setTextLayers(nextTextLayers);
    setLogoLayers(nextLogoLayers);
    setActiveTextLayerId(
      snapshot.activeTextLayerId ?? nextTextLayers[0]?.id ?? activeTextLayerId,
    );
    setActiveLogoLayerId(
      snapshot.activeLogoLayerId ?? nextLogoLayers[0]?.id ?? activeLogoLayerId,
    );

    const primaryTextLayer = nextTextLayers[0];
    const primaryLogoLayer = nextLogoLayers[0];

    setOriginalLogoImage(primaryLogoLayer.originalLogoImage);
    setLogoImage(primaryLogoLayer.logoImage);
    setBackgroundRemovedLogoImage(primaryLogoLayer.backgroundRemovedLogoImage);
    setLogoFileName(primaryLogoLayer.logoFileName);
    setIsLogoBackgroundRemoved(primaryLogoLayer.isLogoBackgroundRemoved);
    setLogoBackgroundMessage("");
    setWatermarkType(snapshot.watermarkType);
    setWatermarkText(primaryTextLayer.text);
    setWatermarkMode(snapshot.watermarkMode);
    setWatermarkPosition(primaryTextLayer.watermarkPosition);
    setCustomPosition(
      primaryTextLayer.customPosition ? { ...primaryTextLayer.customPosition } : null,
    );
    setTileDensity(snapshot.tileDensity);
    setTileGap(snapshot.tileGap);
    setTileAngle(snapshot.tileAngle);
    setWatermarkOpacity(primaryTextLayer.opacity);
    setFontSizeScale(primaryTextLayer.fontSizeScale);
    setFontFamily(primaryTextLayer.fontFamily);
    setFontWeight(
      primaryTextLayer.fontWeight ?? DEFAULT_TEXT_WATERMARK_FONT_WEIGHT,
    );
    setTextColor(primaryTextLayer.textColor ?? DEFAULT_TEXT_WATERMARK_COLOR);
    setTextShadowEnabled(
      primaryTextLayer.textShadowEnabled ?? DEFAULT_TEXT_SHADOW_ENABLED,
    );
    setBlurBrushSize(snapshot.blurBrushSize ?? "medium");
    setBlurStrokes(cloneBlurStrokes(snapshot.blurStrokes ?? []));
    setIsWatermarkHovering(false);

    if (snapshot.pdfPageSignatures) {
      const restoredMap = deserializePdfPageSignatureMap(snapshot.pdfPageSignatures);
      setPdfPageSignatures(restoredMap);

      if (mediaKind === "pdf" && activePdfPageId) {
        const pagePlacements = restoredMap[activePdfPageId] ?? [];
        applyPdfPageSignaturePlacementToEditor(
          pagePlacements[pagePlacements.length - 1] ?? null,
        );
      }
    }

    if (snapshot.pdfPageFillMap) {
      const restoredFillMap = deserializePdfPageFillMap(snapshot.pdfPageFillMap);
      setPdfPageFillMap(restoredFillMap);

      if (
        mediaKind === "pdf" &&
        activePdfPageId &&
        snapshot.pdfDocumentTool === "fill"
      ) {
        applyPdfPageFillFieldsToEditor(restoredFillMap[activePdfPageId] ?? []);
      }
    }

    if (snapshot.pdfDocumentTool) {
      setPdfDocumentTool(snapshot.pdfDocumentTool);
    }
  }

  function applyStoredWatermarkSettingsOnMediaLoad() {
    const stored = readStoredWatermarkSettings();

    if (!stored) {
      return false;
    }

    applyWatermarkSettingsSnapshot(
      {
        ...stored,
        backgroundRemovedLogoImage: null,
        blurBrushSize: "medium",
        blurStrokes: [],
        logoImage: null,
        originalLogoImage: null,
      },
      { suppressHistory: true },
    );
    setActiveTextTemplate(null);
    setActiveLogoTemplate(null);
    return true;
  }

  function openEditorPanelForMediaKind(kind: MediaKind) {
    if (kind === "image") {
      setActiveEditorPanel("photos");
      setActivePhotoTool("watermark");
      setActiveWatermarkTool("text");
      return;
    }

    if (kind === "pdf") {
      setActiveEditorPanel("pdfDocs");
      setActivePdfTool((current) =>
        current === "merge" || current === "compress" ? current : "signFill",
      );
      return;
    }

    setActiveEditorPanel("video");
    setActiveVideoTool("overview");
  }

  function finishMediaLoad(openPanelForKind?: MediaKind) {
    if (sessionRestoreRef.current) {
      void finalizeSessionRestore();
      return;
    }

    if (anonymousDraftRestoreRef.current) {
      void finalizeAnonymousDraftRestore();
      return;
    }

    applyStoredWatermarkSettingsOnMediaLoad();

    if (openPanelForKind) {
      setFormatUploadPrompt(null);
      openEditorPanelForMediaKind(openPanelForKind);
    }
  }

  async function finalizeSessionRestore() {
    const meta = sessionRestoreRef.current;

    if (!meta) {
      return;
    }

    sessionRestoreRef.current = null;
    isRestoringSessionRef.current = false;

    try {
      const restoredSignatures = await Promise.all(
        meta.savedSignatures.map(async (entry) => ({
          ...entry,
          image: await createImageFromDataUrl(entry.previewSrc),
          kind: normalizeSignatureKind(entry.kind),
          typedText: entry.typedText ?? null,
        })),
      );
      setSavedSignatures(restoredSignatures);
      setActiveSignatureId(meta.activeSignatureId);

      let originalLogo: HTMLImageElement | null = null;
      let backgroundRemovedLogo: HTMLImageElement | null = null;

      if (meta.logoDataUrl) {
        originalLogo = await createImageFromDataUrl(meta.logoDataUrl);
      }

      if (meta.backgroundRemovedLogoDataUrl) {
        backgroundRemovedLogo = await createImageFromDataUrl(
          meta.backgroundRemovedLogoDataUrl,
        );
      }

      const activeSignature = restoredSignatures.find(
        (signature) => signature.id === meta.activeSignatureId,
      );

      applyWatermarkSettingsSnapshot(
        {
          backgroundRemovedLogoImage: backgroundRemovedLogo,
          blurBrushSize: "medium",
          blurStrokes: [],
          customPosition: meta.customPosition,
          fontFamily: meta.watermarkSettings.fontFamily,
          fontSizeScale: meta.watermarkSettings.fontSizeScale,
          isLogoBackgroundRemoved: meta.watermarkSettings.isLogoBackgroundRemoved,
          logoFileName: meta.logoFileName,
          logoImage:
            meta.watermarkSettings.watermarkType === "signature"
              ? (activeSignature?.image ?? null)
              : meta.watermarkSettings.isLogoBackgroundRemoved &&
                  backgroundRemovedLogo
                ? backgroundRemovedLogo
                : originalLogo,
          originalLogoImage: originalLogo,
          pdfDocumentTool: meta.pdfDocumentTool,
          pdfPageFillMap: meta.pdfPageFillMap,
          pdfPageSignatures: meta.pdfPageSignatures,
          tileAngle: meta.watermarkSettings.tileAngle,
          tileDensity: meta.watermarkSettings.tileDensity,
          tileGap: meta.watermarkSettings.tileGap,
          watermarkMode: meta.watermarkSettings.watermarkMode,
          watermarkOpacity: meta.watermarkSettings.watermarkOpacity,
          watermarkPosition: meta.watermarkSettings.watermarkPosition,
          watermarkText: meta.watermarkSettings.watermarkText,
          watermarkType: meta.watermarkSettings.watermarkType,
        },
        { suppressHistory: true },
      );

      setActiveTextTemplate(
        meta.activeTemplate as WatermarkTemplateId | null,
      );
      setActiveLogoTemplate(
        (meta.activeLogoTemplate ?? null) as LogoWatermarkTemplateId | null,
      );
      const restoredPanel = normalizeRestoredEditorPanel(
        meta.activeEditorPanel,
        meta.mediaKind,
        meta.watermarkSettings.watermarkType,
      );
      setActiveEditorPanel(restoredPanel);
      if (restoredPanel === "photos") {
        setActivePhotoTool(normalizeRestoredPhotoTool(meta.activeEditorPanel));
      } else if (restoredPanel === "pdfDocs") {
        setActivePdfTool(normalizeRestoredPdfTool(meta.activeEditorPanel));
      }

      if (meta.activeBatchImageId) {
        setActiveBatchImageId(meta.activeBatchImageId);
      }

      if (meta.activePdfPageId) {
        void selectPdfPage(meta.activePdfPageId);
      }
    } catch {
      finishMediaLoad();
    }
  }

  sessionSaveRef.current = async () => {
    if (!mediaKind || isRestoringSessionRef.current) {
      return;
    }

    try {
      const files: StoredSessionFile[] = [];

      if (mediaKind === "pdf" && pdfBytesRef.current) {
        files.push(
          await blobToStoredSessionFile(
            new Blob([new Uint8Array(pdfBytesRef.current)]),
            fileName,
            "application/pdf",
          ),
        );
      } else if (mediaKind === "video" && videoUrl) {
        const blob = await fetch(videoUrl).then((response) => response.blob());

        files.push(
          await blobToStoredSessionFile(blob, fileName, blob.type || "video/mp4"),
        );
      } else if (mediaKind === "image") {
        const entries =
          imageBatch.length >= 2
            ? imageBatch
            : objectUrlRef.current && image
              ? [
                  {
                    fileName,
                    id: activeBatchImageId ?? "single-image",
                    objectUrl: objectUrlRef.current,
                  },
                ]
              : [];

        for (const entry of entries) {
          const blob = await fetch(entry.objectUrl).then((response) =>
            response.blob(),
          );

          files.push(
            await blobToStoredSessionFile(
              blob,
              entry.fileName,
              blob.type || "image/jpeg",
            ),
          );
        }
      }

      if (!files.length) {
        return;
      }

      const logoDataUrl = originalLogoImage
        ? await imageElementToDataUrl(originalLogoImage)
        : null;
      const backgroundRemovedLogoDataUrl = backgroundRemovedLogoImage
        ? await imageElementToDataUrl(backgroundRemovedLogoImage)
        : null;
      const savedSignaturesMeta = await Promise.all(
        savedSignatures.map(async (signature) => ({
          id: signature.id,
          kind: normalizeSignatureKind(signature.kind),
          label: signature.label,
          previewSrc: signature.previewSrc.startsWith("data:")
            ? signature.previewSrc
            : await imageElementToDataUrl(signature.image),
          source: signature.source,
          typedText: signature.typedText ?? null,
        })),
      );

      const meta: StoredEditorSessionMeta = {
        activeBatchImageId,
        activeEditorPanel,
        activePdfPageId,
        activeSignatureId,
        activeLogoTemplate,
        activeTemplate: activeTextTemplate,
        backgroundRemovedLogoDataUrl,
        batchEntryIds: imageBatch.map((entry) => entry.id),
        batchFileNames: imageBatch.map((entry) => entry.fileName),
        customPosition: customPosition ? { ...customPosition } : null,
        fileName,
        logoDataUrl,
        logoFileName,
        mediaKind,
        pdfDocumentTool: mediaKind === "pdf" ? pdfDocumentTool : undefined,
        pdfPageFillMap:
          mediaKind === "pdf"
            ? serializePdfPageFillMap(getPdfPageFillMapWithActivePersisted())
            : undefined,
        pdfPageSignatures:
          mediaKind === "pdf"
            ? serializePdfPageSignatureMap(getPdfPageSignaturesWithActivePersisted())
            : undefined,
        savedSignatures: savedSignaturesMeta,
        version: 1,
        videoDuration,
        videoFileSize,
        videoSize,
        watermarkSettings: storedSettingsFromSnapshot(
          getWatermarkSettingsSnapshot(),
        ),
      };

      await persistEditorSession(files, meta);
    } catch {
      // Ignore session persistence errors.
    }
  };

  function resetWatermarkSettingsToDefaults() {
    clearStoredWatermarkSettings();
    const defaults = getDefaultStoredWatermarkSettings();

    applyWatermarkSettingsSnapshot(
      {
        ...defaults,
        backgroundRemovedLogoImage: null,
        blurBrushSize: "medium",
        blurStrokes: [],
        logoImage: null,
        originalLogoImage: null,
      },
      { suppressHistory: true },
    );
    setActiveTextTemplate(null);
    setActiveLogoTemplate(null);
    setExportNotice("");
    setExportError("");

    if (mediaKind === "pdf" && pdfPageCount > 0) {
      setPdfPageSignatures(createEmptyPdfPageSignatureMap(pdfPageCount));
      setPdfPageFillMap(createEmptyPdfPageFillMap(pdfPageCount));
      setPdfDocumentTool("signature");
      setActiveFillFieldId(null);
      applyPdfPageSignaturePlacementToEditor(null);
    }

    commitSettingsHistorySnapshot({
      ...defaults,
      backgroundRemovedLogoImage: null,
      blurBrushSize: "medium",
      blurStrokes: [],
      logoImage: null,
      originalLogoImage: null,
    });
  }

  function undoWatermarkSettings() {
    if (settingsHistoryIndexRef.current <= 0) {
      return;
    }

    const nextIndex = settingsHistoryIndexRef.current - 1;
    const snapshot = settingsHistoryRef.current[nextIndex];

    settingsHistoryIndexRef.current = nextIndex;
    setSettingsHistoryIndex(nextIndex);
    applyWatermarkSettingsSnapshot(snapshot, { suppressHistory: true });
  }

  function redoWatermarkSettings() {
    if (
      settingsHistoryIndexRef.current >=
      settingsHistoryRef.current.length - 1
    ) {
      return;
    }

    const nextIndex = settingsHistoryIndexRef.current + 1;
    const snapshot = settingsHistoryRef.current[nextIndex];

    settingsHistoryIndexRef.current = nextIndex;
    setSettingsHistoryIndex(nextIndex);
    applyWatermarkSettingsSnapshot(snapshot, { suppressHistory: true });
  }

  function saveCurrentPreset() {
    const trimmedName = presetName.trim();

    if (!trimmedName) {
      return;
    }

    setSavedPresets((presets) => [
      ...presets,
      {
        id: `${Date.now()}-${presets.length}`,
        name: trimmedName,
        snapshot: getWatermarkSettingsSnapshot(),
      },
    ]);
    setPresetName("");
    setIsSavingPreset(false);
  }

  function applyTextTemplate(template: WatermarkTemplate) {
    if (settingsHistoryTimerRef.current) {
      clearTimeout(settingsHistoryTimerRef.current);
      settingsHistoryTimerRef.current = null;
    }

    shouldIgnoreManualSettingsRef.current = true;

    if (manualSettingsGuardTimerRef.current) {
      clearTimeout(manualSettingsGuardTimerRef.current);
    }

    manualSettingsGuardTimerRef.current = setTimeout(() => {
      shouldIgnoreManualSettingsRef.current = false;
      manualSettingsGuardTimerRef.current = null;
    }, 500);

    const currentSnapshot = getWatermarkSettingsSnapshot();
    const templateSnapshot: WatermarkSettingsSnapshot = {
      ...currentSnapshot,
      customPosition: null,
      fontFamily: template.fontFamily,
      fontSizeScale: template.fontSizeScale,
      textLayers: currentSnapshot.textLayers?.map((layer) =>
        layer.id === currentSnapshot.activeTextLayerId
          ? {
              ...layer,
              customPosition: null,
              fontFamily: template.fontFamily,
              fontSizeScale: template.fontSizeScale,
              opacity: template.opacity,
              watermarkPosition: template.position,
            }
          : layer,
      ),
      tileAngle: template.tileAngle,
      tileDensity: template.density,
      tileGap: template.tileGap,
      watermarkMode: template.mode,
      watermarkOpacity: template.opacity,
      watermarkPosition: template.position,
      watermarkType: "text",
    };

    commitSettingsHistorySnapshot(currentSnapshot);
    applyWatermarkSettingsSnapshot(templateSnapshot, { suppressHistory: true });
    commitSettingsHistorySnapshot(templateSnapshot);
    isApplyingSettingsHistoryRef.current = false;
    setActiveTextTemplate(template.id);
    setIsWatermarkHovering(false);
  }

  function applyLogoTemplate(template: LogoWatermarkTemplate) {
    if (settingsHistoryTimerRef.current) {
      clearTimeout(settingsHistoryTimerRef.current);
      settingsHistoryTimerRef.current = null;
    }

    shouldIgnoreManualSettingsRef.current = true;

    if (manualSettingsGuardTimerRef.current) {
      clearTimeout(manualSettingsGuardTimerRef.current);
    }

    manualSettingsGuardTimerRef.current = setTimeout(() => {
      shouldIgnoreManualSettingsRef.current = false;
      manualSettingsGuardTimerRef.current = null;
    }, 500);

    const currentSnapshot = getWatermarkSettingsSnapshot();
    const templateSnapshot: WatermarkSettingsSnapshot = {
      ...currentSnapshot,
      customPosition: null,
      fontSizeScale: template.fontSizeScale,
      logoLayers: currentSnapshot.logoLayers?.map((layer) =>
        layer.id === currentSnapshot.activeLogoLayerId
          ? {
              ...layer,
              customPosition: null,
              fontSizeScale: template.fontSizeScale,
              opacity: template.opacity,
              watermarkPosition: template.position,
            }
          : layer,
      ),
      tileAngle: template.tileAngle,
      tileDensity: template.density,
      tileGap: template.tileGap,
      watermarkMode: template.mode,
      watermarkOpacity: template.opacity,
      watermarkPosition: template.position,
      watermarkType: "logo",
    };

    commitSettingsHistorySnapshot(currentSnapshot);
    applyWatermarkSettingsSnapshot(templateSnapshot, { suppressHistory: true });
    commitSettingsHistorySnapshot(templateSnapshot);
    isApplyingSettingsHistoryRef.current = false;

    const updatedLogoLayer =
      templateSnapshot.logoLayers?.find(
        (layer) => layer.id === templateSnapshot.activeLogoLayerId,
      ) ?? templateSnapshot.logoLayers?.[0];

    if (updatedLogoLayer) {
      syncLegacyFromLogoLayer(updatedLogoLayer);
    }

    setActiveLogoTemplate(template.id);
    setIsWatermarkHovering(false);
  }

  async function handleSingleImageExport() {
    if (!image) {
      return;
    }

    setIsExporting(true);
    setIsExportPreparing(true);
    setExportProgress(null);

    const exportId = createExportId();
    const fileType = getCurrentExportFileType();

    try {
      const auth = await resolveExportAuthorization({
        exportId,
        fileMeta: { photoCount: 1 },
        fileType,
      });
      applyAuthorizeNotice(auth);
      setIsExportPreparing(false);

      const blob = await exportImageToBlob(
        await getExportRenderInputForAuth(
          image,
          resizeWidth,
          resizeHeight,
          rotationAngle,
          activeImageTool === "resize",
          auth,
        ),
      );

      downloadImageBlob(blob, getExportFileName(fileName), imageExportMimeType);

      if (isCleanExportTier(auth.tier)) {
        await finalizeCleanExportBilling(auth);
      }
    } catch {
      setUploadError("We could not export that image. Please try again.");
    } finally {
      setIsExporting(false);
      setIsExportPreparing(false);
    }
  }

  function handleExport() {
    logRealVideoExport("STEP 2/15: handleExport() called", {
      isExporting,
      mediaKind,
    });

    if (isExporting) {
      return;
    }

    void beginExportWithLoginGate();
  }

  async function handlePdfExport(skipUnsignedConfirm = false) {
    if (!pdfBytesRef.current || pdfPageCount === 0) {
      setExportError("Reload the PDF before exporting.");
      return;
    }

    if (
      watermarkType === "text" &&
      !textLayers.some((layer) => layer.text.trim()) &&
      watermarkMode === "single"
    ) {
      setExportError("Add watermark text before exporting.");
      return;
    }

    if (
      watermarkType === "text" &&
      watermarkMode === "tile" &&
      !activeTextLayer.text.trim()
    ) {
      setExportError("Add watermark text before exporting.");
      return;
    }

    if (watermarkType === "logo" && !logoLayers.some((layer) => layer.logoImage)) {
      setExportError("Upload a logo before exporting.");
      return;
    }

    const exportSignatureMapPreview = getPdfPageSignaturesWithActivePersisted();
    const exportFillMapPreview = getPdfPageFillMapWithActivePersisted();
    const signedCount = countSignedPdfPages(exportSignatureMapPreview);
    const hasFillContent = hasAnyFillFields(exportFillMapPreview);
    const hasWatermarkContent = hasPdfWatermarkExportContent(
      getPdfWatermarkSettings(),
    );

    if (
      !hasWatermarkContent &&
      !hasFillContent &&
      signedCount === 0 &&
      !skipUnsignedConfirm
    ) {
      setShowUnsignedPdfExportConfirm(true);
      return;
    }

    setUploadError("");
    setExportError("");
    setIsExporting(true);
    setIsExportPreparing(true);
    setPdfExportProgress({ current: 0, total: pdfPageCount });

    const exportId = createExportId();
    const exportSignatureMap = getPdfPageSignaturesWithActivePersisted();
    const exportFillMap = getPdfPageFillMapWithActivePersisted();

    try {
      const auth = await resolvePdfExportAuthorization(exportId);

      if (
        (hasFillContent ||
          signedCount > 0 ||
          hasWatermarkContent) &&
        !isCleanExportTier(auth.tier)
      ) {
        throw new ExportCreditCheckError(
          "This PDF export requires sufficient credits. Add credits or remove paid sign and fill content, then try again.",
        );
      }

      applyAuthorizeNotice(auth);
      setIsExportPreparing(false);

      const watermarkInput = isCleanExportTier(auth.tier)
        ? getPdfWatermarkSettings()
        : await applyForcedTileWatermarkSettings(getPdfWatermarkSettings());

      const exportedBytes = await exportWatermarkedPdf(
        pdfBytesRef.current,
        async (pageIndex, pageWidth, pageHeight) => {
          const pageId = buildPdfPageId(pageIndex + 1);
          const pagePlacements = exportSignatureMap[pageId] ?? [];
          const pageFillFields = exportFillMap[pageId] ?? [];
          const hasPageFillContent = pageFillFields.some((field) =>
            field.text.trim(),
          );
          const pageSignatures = pagePlacements.flatMap((pagePlacement) => {
            const signature = savedSignatures.find(
              (entry) => entry.id === pagePlacement.signatureId,
            );

            if (!signature) {
              return [];
            }

            return [
              {
                customPosition: pagePlacement.customPosition,
                fontSizeScale: pagePlacement.fontSizeScale,
                id: pagePlacement.id,
                image: signature.image,
                opacity: pagePlacement.opacity,
                watermarkPosition: pagePlacement.watermarkPosition,
              },
            ];
          });

          if (
            watermarkInput.watermarkMode === "tile" &&
            !hasPageFillContent &&
            !hasForcedWatermarkOverlay(watermarkInput)
          ) {
            return buildPdfTilePageWatermark(
              pageWidth,
              pageHeight,
              watermarkInput,
              previewBaseSize,
            );
          }

          const overlayCanvas = renderWatermarkOverlayForPdfPage({
            canvasSize: previewBaseSize,
            pageFillFields,
            pageHeight,
            pageWidth,
            pageSignatures,
            ...watermarkInput,
          });

          return {
            kind: "fullOverlay",
            pngBytes: await canvasToPngBytes(overlayCanvas),
          };
        },
        (current, total) => {
          setPdfExportProgress({ current, total });
        },
      );

      const blob = new Blob([new Uint8Array(exportedBytes)], {
        type: "application/pdf",
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = getPdfExportFileName(fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);

      if (isCleanExportTier(auth.tier)) {
        await finalizeCleanExportBilling(auth);
      }
    } catch (error) {
      if (error instanceof ExportCreditCheckError) {
        setExportError(error.message);
      } else if (error instanceof ExportAuthorizationRequiredError) {
        setExportError(error.message);
      } else {
        setExportError("We could not export that PDF. Please try again.");
      }
    } finally {
      setIsExporting(false);
      setIsExportPreparing(false);
      setPdfExportProgress(null);
    }
  }

  function handleCancelExport() {
    videoExportCancelRef.current = true;
    videoExportAbortControllerRef.current?.abort();
    cancelVideoExportWorker();
    setIsExporting(false);
    setExportProgress(null);
    setExportServerStage(null);
    setIsServerVideoExport(false);
    setExportError("");
    setExportNotice("Export cancelled.");
  }

  async function handleVideoExport() {
    logRealVideoExport("STEP 6/15: handleVideoExport() entered", {
      creditBalance,
      exportVideoDuration,
      fileName,
      videoDuration,
      videoFileSize,
      videoSize,
      watermarkType,
    });

    if (!videoUrl || !videoSize) {
      setExportError("Reload the video before exporting.");
      return;
    }

    if (
      !hasVideoBlurToExport() &&
      watermarkType === "text" &&
      !textLayers.some((layer) => layer.text.trim()) &&
      watermarkMode === "single"
    ) {
      setExportError("Add watermark text before exporting.");
      return;
    }

    if (
      !hasVideoBlurToExport() &&
      watermarkType === "text" &&
      watermarkMode === "tile" &&
      !activeTextLayer.text.trim()
    ) {
      setExportError("Add watermark text before exporting.");
      return;
    }

    if (
      !hasVideoBlurToExport() &&
      watermarkType === "logo" &&
      !logoLayers.some((layer) => layer.logoImage)
    ) {
      setExportError("Upload a logo before exporting.");
      return;
    }

    if (
      !hasVideoBlurToExport() &&
      watermarkType === "signature" &&
      !logoImage
    ) {
      setExportError("Add a signature before exporting.");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportError("");
    setExportNotice("");
    setExportServerStage(null);
    setIsServerVideoExport(false);
    videoExportCancelRef.current = false;
    videoExportAbortControllerRef.current?.abort();
    videoExportAbortControllerRef.current = new AbortController();
    const abortSignal = videoExportAbortControllerRef.current.signal;

    const exportId = createExportId();
    const fileMeta = getVideoExportFileMeta();

    try {
      const videoResponse = await fetch(videoUrl);

      if (!videoResponse.ok) {
        throw new VideoExportFailedError(
          "We could not read the loaded video. Please reload it and try again.",
        );
      }

      const videoBlob = await videoResponse.blob();
      const effectiveFileSize = videoFileSize || videoBlob.size;
      const exportRoute = getVideoExportRoute(
        exportVideoDuration,
        videoSize.width,
        videoSize.height,
        effectiveFileSize,
      );

      logRealVideoExport("STEP 7/15: export route computed", {
        effectiveFileSize,
        exportRoute,
        exportVideoDuration,
        height: videoSize.height,
        width: videoSize.width,
      });

      if (exportRoute === "reject") {
        throw new VideoExportFailedError(getVideoExportRejectionMessage());
      }

      const auth = await resolveVideoExportAuthorization({
        exportId,
        exportRoute,
        fileMeta: {
          ...fileMeta,
          fileSizeBytes: effectiveFileSize,
        },
      });
      applyAuthorizeNotice(auth);

      logRealVideoExport("STEP 8/15: export authorization resolved", {
        authBalance: auth.balance ?? null,
        authCost: auth.cost ?? null,
        authReason: auth.reason ?? null,
        authTier: auth.tier,
        creditBalanceState: creditBalance,
        exportRoute,
        isCleanExportTier: isCleanExportTier(auth.tier),
      });

      const applyStaticFreeExportStamp =
        exportRoute === "client" && !isCleanExportTier(auth.tier);

      if (applyStaticFreeExportStamp) {
        await ensureForcedTilePatternFontLoaded();
      }

      const watermarkSettings = getVideoWatermarkSettings();

      logRealVideoExport("STEP 9/15: watermark settings prepared for overlay", {
        applyStaticFreeExportStamp,
        settings: summarizeWatermarkSettingsForExportLog(watermarkSettings),
      });

      if (exportVideoDuration <= 0) {
        throw new VideoExportFailedError(
          "Set a valid export length on the trim timeline.",
        );
      }

      if (
        !areVideoTrimRangesEqual(
          videoTrimStartSeconds,
          videoTrimEndSeconds,
          videoTrimAppliedStartSeconds,
          videoTrimAppliedEndSeconds,
          videoDuration,
        )
      ) {
        throw new VideoExportFailedError(
          "Apply your shorten on the timeline before exporting the video.",
        );
      }

      if (
        exportRoute === "long-server" &&
        (resolvedAppliedVideoTrim.startSeconds > 0 ||
          resolvedAppliedVideoTrim.endSeconds < videoDuration - 0.05)
      ) {
        throw new VideoExportFailedError(
          "Trim is not supported yet for long server exports. Export a shorter source video or use the full length.",
        );
      }

      const timedLayerCount = countVideoVisibilityRanges(
        watermarkSettings.textLayers,
      );

      if (timedLayerCount > 1) {
        throw new VideoExportFailedError(
          "Only one text watermark can have a visibility time range per export.",
        );
      }

      if (timedLayerCount > 0 && exportRoute !== "client") {
        throw new VideoExportFailedError(
          "Timed text watermarks are available for in browser export on videos up to 60 seconds. Server export support is coming soon.",
        );
      }

      if (hasVideoBlurToExport() && exportRoute !== "client") {
        throw new VideoExportFailedError(
          "Timed video blur is available for in browser export on videos up to 60 seconds. Server export support is coming soon.",
        );
      }

      logRealVideoExport("STEP 10/15: building client overlay passes", {
        durationSeconds: videoDuration,
        height: videoSize.height,
        settings: summarizeWatermarkSettingsForExportLog(watermarkSettings),
        width: videoSize.width,
      });

      const videoPreviewFrame =
        videoOverlaySize.width > 0 && videoSize
          ? getVideoDisplayFrame(
              videoOverlaySize.width,
              videoOverlaySize.height,
              videoSize.width,
              videoSize.height,
            )
          : { height: videoSize.height, width: videoSize.width, x: 0, y: 0 };

      const clientOverlayPasses = await buildClientVideoOverlayPasses({
        applyStaticFreeExportStamp,
        durationSeconds: videoDuration,
        height: videoSize.height,
        settings: watermarkSettings,
        videoBlurRegions,
        videoCaptionLayers: captionsMasterEnabled
          ? videoCaptionLayers
          : undefined,
        videoElement: videoElementRef.current,
        watermarkReferenceWidth: videoPreviewFrame.width,
        width: videoSize.width,
      });
      const overlayPngBytes = clientOverlayPasses[0]?.overlayPngBytes;

      logRealVideoExport("STEP 12/15: overlay passes built", {
        overlayPassSummaries: await Promise.all(
          clientOverlayPasses.map(async (pass, index) => ({
            index,
            overlayPngByteLength: pass.overlayPngBytes.byteLength,
            overlaySample: await sampleOverlayPngBytesCenter(
              pass.overlayPngBytes,
              videoSize.width,
              videoSize.height,
            ),
            visibleFromSeconds: pass.visibleFromSeconds ?? null,
            visibleUntilSeconds: pass.visibleUntilSeconds ?? null,
          })),
        ),
        passCount: clientOverlayPasses.length,
        settings: summarizeWatermarkSettingsForExportLog(watermarkSettings),
      });

      if (!overlayPngBytes) {
        throw new VideoExportFailedError(
          "Could not prepare the watermark overlay for export.",
        );
      }

      setIsServerVideoExport(isServerSideVideoExportRoute(exportRoute));
      setLongVideoProcessingDetail(null);

      const overlaySampleBeforeEncode = await sampleOverlayPngBytesCenter(
        overlayPngBytes,
        videoSize.width,
        videoSize.height,
      );

      logRealVideoExport("STEP 13/15: overlay PNG sampled immediately before encode", {
        overlaySampleBeforeEncode,
        settings: summarizeWatermarkSettingsForExportLog(watermarkSettings),
      });

      const encodePath =
        exportRoute === "long-server"
          ? "long-server"
          : exportRoute === "server"
            ? "server"
            : "client-ffmpeg";

      logRealVideoExport("STEP 14/15: starting video encode", {
        encodePath,
        exportRoute,
        overlayPassCount: clientOverlayPasses.length,
        primaryOverlayPngByteLength: overlayPngBytes.byteLength,
        settings: summarizeWatermarkSettingsForExportLog(watermarkSettings),
      });

      const exportedBlob =
        exportRoute === "long-server"
          ? await exportLongVideoOnServer({
              abortSignal,
              duration: videoDuration,
              exportId,
              fileSizeBytes: effectiveFileSize,
              height: videoSize.height,
              inputFileName: fileName,
              onProcessingDetailChange: setLongVideoProcessingDetail,
              onProgress: setExportProgress,
              onStageChange: setExportServerStage,
              overlayPngBytes,
              shouldCancel: () => videoExportCancelRef.current,
              videoBlob,
              width: videoSize.width,
            })
          : exportRoute === "server"
          ? await exportVideoOnServer({
              abortSignal,
              duration: exportVideoDuration,
              exportId,
              fileSizeBytes: effectiveFileSize,
              height: videoSize.height,
              inputFileName: fileName,
              onProgress: setExportProgress,
              onStageChange: setExportServerStage,
              overlayPngBytes,
              shouldCancel: () => videoExportCancelRef.current,
              trimEndSeconds: resolvedAppliedVideoTrim.endSeconds,
              trimStartSeconds: resolvedAppliedVideoTrim.startSeconds,
              videoBlob,
              width: videoSize.width,
            })
          : await exportVideoWithOverlay({
              inputFileName: fileName,
              onProgress: setExportProgress,
              overlayPasses: clientOverlayPasses,
              shouldCancel: () => videoExportCancelRef.current,
              trimEndSeconds: resolvedAppliedVideoTrim.endSeconds,
              trimStartSeconds: resolvedAppliedVideoTrim.startSeconds,
              videoSource: videoBlob,
            });

      if (videoExportCancelRef.current) {
        return;
      }

      const objectUrl = URL.createObjectURL(exportedBlob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = getVideoExportFileName(fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setExportProgress(100);

      logRealVideoExport("STEP 15/15: video encode finished and download triggered", {
        encodePath,
        exportedBlobByteLength: exportedBlob.size,
        exportedBlobType: exportedBlob.type,
      });

      if (isCleanExportTier(auth.tier)) {
        await finalizeCleanExportBilling(auth);
      }
    } catch (error) {
      logRealVideoExport("STEP ERROR: handleVideoExport() failed", {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : typeof error,
      });

      if (videoExportCancelRef.current || error instanceof VideoExportCancelledError) {
        setExportError("");
        setExportNotice((current) => current || "Export cancelled.");
      } else if (error instanceof ExportCreditCheckError) {
        setExportError(error.message);
      } else if (error instanceof VideoExportTimeoutError) {
        setExportError(error.message);
      } else if (error instanceof VideoExportFailedError) {
        setExportError(error.message);
      } else {
        setExportError(
          "Video export failed. Please try again with a shorter clip.",
        );
      }
    } finally {
      setIsExporting(false);
      setExportProgress(null);
      setExportServerStage(null);
      setLongVideoProcessingDetail(null);
      setIsServerVideoExport(false);
      videoExportCancelRef.current = false;
      videoExportAbortControllerRef.current = null;
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    loadMediaFiles(Array.from(event.dataTransfer.files));
  }

  function loadMediaFiles(files: File[]) {
    const validation = validateMediaFiles(files);

    if (!validation.ok) {
      setUploadError(validation.error);
      resolvePendingDraftRestore();
      return;
    }

    const imageFiles = validation.files.filter(isImageFile);
    const videoFiles = validation.files.filter(isVideoFile);
    const pdfFiles = validation.files.filter(isPdfFile);

    if (pdfFiles.length) {
      void loadPdfFile(pdfFiles[0]);
      return;
    }

    if (videoFiles.length) {
      loadVideoFile(videoFiles[0]);
      return;
    }

    if (imageFiles.length > 1) {
      void loadImageBatchFiles(imageFiles);
      return;
    }

    if (imageFiles.length === 1) {
      loadImageFile(imageFiles[0]);
    }
  }

  function loadMediaFile(file: File) {
    loadMediaFiles([file]);
  }

  function isVideoCaptionInteractionActive() {
    return (
      mediaKind === "video" &&
      activeEditorPanel === "video" &&
      activeVideoTool === "caption" &&
      captionsMasterEnabled
    );
  }

  function setCaptionLayerCustomPosition(
    layerId: string,
    canvas: HTMLCanvasElement,
    point: { x: number; y: number },
  ) {
    updateVideoCaptionLayer(layerId, {
      customPosition: canvasPointToPercent(canvas, point),
    });
  }

  function findCaptionLayerAtPoint(point: { x: number; y: number }) {
    const boundsMap = captionBoundsRef.current;
    const activeBounds = boundsMap.get(activeVideoCaptionLayerId);

    if (activeBounds && isPointInBounds(point, activeBounds)) {
      return activeVideoCaptionLayerId;
    }

    for (const layer of [...videoCaptionLayers].reverse()) {
      if (layer.id === activeVideoCaptionLayerId) {
        continue;
      }

      const bounds = boundsMap.get(layer.id);

      if (bounds && isPointInBounds(point, bounds)) {
        return layer.id;
      }
    }

    return null;
  }

  function isPointerOverCaption(point: { x: number; y: number } | null) {
    if (!point) {
      return false;
    }

    return findCaptionLayerAtPoint(point) !== null;
  }

  function handleCanvasPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (isVideoBlurInteractionActive()) {
      handleVideoBlurPointerDown(event);
      return;
    }

    if (isVideoCaptionInteractionActive()) {
      const point = getCanvasPoint(event);
      const hitLayerId = point ? findCaptionLayerAtPoint(point) : null;

      if (hitLayerId && point) {
        event.preventDefault();
        isDraggingCaptionRef.current = true;
        draggingCaptionLayerIdRef.current = hitLayerId;
        setIsDraggingCaption(true);
        setIsCaptionHovering(true);

        if (hitLayerId !== activeVideoCaptionLayerId) {
          setActiveVideoCaptionLayerId(hitLayerId);
        }

        event.currentTarget.setPointerCapture(event.pointerId);
        setCaptionLayerCustomPosition(hitLayerId, event.currentTarget, point);
        return;
      }

      setIsCaptionHovering(false);

      if (tryBeginPreviewPan(event)) {
        return;
      }

      if (mediaKind === "video") {
        forwardPointerEventToElementBelow(event);
      }

      return;
    }

    if (mediaKind === "pdf" && pdfDocumentTool === "fill" && isPdfSignFillMode()) {
      handleFillFieldPointerDown(event);
      return;
    }

    if (
      mediaKind === "pdf" &&
      pdfDocumentTool === "signature" &&
      isPdfSignFillMode()
    ) {
      handleSignaturePlacementPointerDown(event);
      return;
    }

    if (activeImageTool === "crop") {
      handleCropPointerDown(event);
      return;
    }

    if (activeImageTool === "resize") {
      handleResizePointerDown(event);
      return;
    }

    if (activeImageTool === "blur") {
      handleBlurPointerDown(event);
      return;
    }

    if (
      mediaKind === "video" &&
      activeEditorPanel === "video" &&
      !isVideoWatermarkInteractionActive()
    ) {
      if (tryBeginPreviewPan(event)) {
        return;
      }

      forwardPointerEventToElementBelow(event);
      return;
    }

    if (watermarkMode === "tile") {
      if (tryBeginPreviewPan(event)) {
        return;
      }

      setIsWatermarkHovering(false);
      if (mediaKind === "video") {
        forwardPointerEventToElementBelow(event);
      }
      return;
    }

    const point = getCanvasPoint(event);
    const boundsMap = layerBoundsRef.current;
    const layerOrder =
      watermarkType === "text"
        ? [...textLayers].reverse()
        : watermarkType === "logo"
          ? [...logoLayers].reverse()
          : [];

    for (const layer of layerOrder) {
      const bounds = boundsMap.get(layer.id);

      if (point && bounds && isPointInBounds(point, bounds)) {
        event.preventDefault();
        isDraggingRef.current = true;
        draggingLayerIdRef.current = layer.id;
        if (watermarkType === "text") {
          clearActiveTextTemplate();
        } else if (watermarkType === "logo") {
          clearActiveLogoTemplate();
        }
        setIsDraggingWatermark(true);
        setIsWatermarkHovering(true);
        setShowWatermarkDragHint(false);
        event.currentTarget.setPointerCapture(event.pointerId);

        if (watermarkType === "text" && layer.id !== activeTextLayerId) {
          setActiveTextLayerId(layer.id);
          if (layer.type === "text") {
            syncLegacyFromTextLayer(layer);
          }
        } else if (watermarkType === "logo" && layer.id !== activeLogoLayerId) {
          setActiveLogoLayerId(layer.id);
          if (layer.type === "logo") {
            syncLegacyFromLogoLayer(layer);
          }
        }

        applyWatermarkDragPosition(layer.id, event.currentTarget, point);
        return;
      }
    }

    const bounds = textBoundsRef.current;

    if (!point || !bounds || !isPointInBounds(point, bounds)) {
      if (tryBeginPreviewPan(event)) {
        return;
      }

      setIsWatermarkHovering(false);
      if (mediaKind === "video") {
        forwardPointerEventToElementBelow(event);
      }
      return;
    }

    event.preventDefault();
    isDraggingRef.current = true;
    draggingLayerIdRef.current =
      watermarkType === "text"
        ? activeTextLayerId
        : watermarkType === "logo"
          ? activeLogoLayerId
          : null;
    if (watermarkType === "text") {
      clearActiveTextTemplate();
    } else if (watermarkType === "logo") {
      clearActiveLogoTemplate();
    }
    setIsDraggingWatermark(true);
    setIsWatermarkHovering(true);
    setShowWatermarkDragHint(false);
    event.currentTarget.setPointerCapture(event.pointerId);
    applyWatermarkDragPosition(
      draggingLayerIdRef.current ?? activeTextLayerId,
      event.currentTarget,
      point,
    );
  }

  function handleCanvasPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (isVideoBlurInteractionActive()) {
      handleVideoBlurPointerMove(event);
      return;
    }

    if (
      mediaKind === "pdf" &&
      pdfDocumentTool === "fill" &&
      isPdfSignFillMode()
    ) {
      handleFillFieldPointerMove(event);
      return;
    }

    if (
      mediaKind === "pdf" &&
      pdfDocumentTool === "signature" &&
      isPdfSignFillMode()
    ) {
      handleSignaturePlacementPointerMove(event);
      return;
    }

    if (updatePreviewPan(event)) {
      return;
    }

    if (isDraggingCaptionRef.current) {
      const point = getCanvasPoint(event);

      if (!point || !draggingCaptionLayerIdRef.current) {
        return;
      }

      event.preventDefault();
      setCaptionLayerCustomPosition(
        draggingCaptionLayerIdRef.current,
        event.currentTarget,
        point,
      );
      return;
    }

    if (isVideoCaptionInteractionActive()) {
      const point = getCanvasPoint(event);
      setIsCaptionHovering(isPointerOverCaption(point));
      return;
    }

    if (activeImageTool === "crop") {
      handleCropPointerMove(event);
      return;
    }

    if (activeImageTool === "resize") {
      handleResizePointerMove(event);
      return;
    }

    if (activeImageTool === "blur") {
      handleBlurPointerMove(event);
      return;
    }

    const point = getCanvasPoint(event);

    if (!isDraggingRef.current) {
      const hovering = isPointerOverWatermark(point, watermarkMode);
      setIsWatermarkHovering(hovering);
      updateWatermarkDragHint(
        point,
        event.currentTarget,
      );
      return;
    }

    if (!point) {
      return;
    }

    event.preventDefault();
    applyWatermarkDragPosition(
      draggingLayerIdRef.current ??
        (watermarkType === "text"
          ? activeTextLayerId
          : watermarkType === "logo"
            ? activeLogoLayerId
            : activeTextLayerId),
      event.currentTarget,
      point,
    );
  }

  function handleCanvasPointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (
      mediaKind === "pdf" &&
      pdfDocumentTool === "fill" &&
      isPdfSignFillMode()
    ) {
      handleFillFieldPointerUp(event);
      return;
    }

    if (
      mediaKind === "pdf" &&
      pdfDocumentTool === "signature" &&
      isPdfSignFillMode()
    ) {
      handleSignaturePlacementPointerUp(event);
      return;
    }

    if (endPreviewPan(event)) {
      return;
    }

    if (isDraggingCaptionRef.current) {
      event.preventDefault();
      isDraggingCaptionRef.current = false;
      draggingCaptionLayerIdRef.current = null;
      setIsDraggingCaption(false);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      setIsCaptionHovering(
        isPointerOverCaption(getCanvasPoint(event)),
      );
      return;
    }

    if (activeImageTool === "crop") {
      handleCropPointerUp(event);
      return;
    }

    if (activeImageTool === "resize") {
      handleResizePointerUp(event);
      return;
    }

    if (activeImageTool === "blur") {
      handleBlurPointerUp(event);
      return;
    }

    if (isVideoBlurInteractionActive()) {
      handleVideoBlurPointerUp(event);
      return;
    }

    if (!isDraggingRef.current) {
      return;
    }

    event.preventDefault();
    commitWatermarkDragPosition();
    isDraggingRef.current = false;
    draggingLayerIdRef.current = null;
    setIsDraggingWatermark(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setIsWatermarkHovering(
      isPointerOverWatermark(getCanvasPoint(event), watermarkMode),
    );
    updateWatermarkDragHint(
      getCanvasPoint(event),
      event.currentTarget,
    );
  }

  function handleCanvasPointerLeave() {
    if (mediaKind === "pdf" && pdfDocumentTool === "fill") {
      if (!fillDragRef.current) {
        setIsFillFieldHovering(false);
        setFillHoverResizeHandle(null);
        setFillHoverFrameAction(null);
      }

      return;
    }

    if (
      mediaKind === "pdf" &&
      pdfDocumentTool === "signature" &&
      isPdfSignFillMode()
    ) {
      if (!signatureDragRef.current) {
        setIsSignaturePlacementHovering(false);
        setSignatureHoverResizeHandle(null);
        setSignatureHoverFrameAction(null);
      }

      return;
    }

    if (
      activeImageTool === "crop" ||
      activeImageTool === "resize" ||
      activeImageTool === "blur" ||
      isVideoBlurInteractionActive()
    ) {
      return;
    }

    if (!isDraggingRef.current) {
      setIsWatermarkHovering(false);
      setShowWatermarkDragHint(false);
      setWatermarkDragHintPos(null);

      if (isVideoCaptionInteractionActive()) {
        setIsCaptionHovering(false);
      }
    }
  }

  function handleCanvasPointerCancel(event: PointerEvent<HTMLCanvasElement>) {
    cropDragRef.current = null;
    resizeDragRef.current = null;
    blurDragRef.current = null;
    videoBlurDragRef.current = null;
    fillDragRef.current = null;
    signatureDragRef.current = null;
    isDraggingRef.current = false;
    draggingLayerIdRef.current = null;
    discardWatermarkDragPosition();
    isDraggingCaptionRef.current = false;
    draggingCaptionLayerIdRef.current = null;
    setIsDraggingWatermark(false);
    setIsDraggingCaption(false);
    setIsFillFieldHovering(false);
    setFillHoverFrameAction(null);
    setFillHoverResizeHandle(null);
    setIsSignaturePlacementHovering(false);
    setSignatureHoverFrameAction(null);
    setSignatureHoverResizeHandle(null);
    setIsWatermarkHovering(false);
    setIsCaptionHovering(false);
    setShowWatermarkDragHint(false);
    setWatermarkDragHintPos(null);
    previewPanDragRef.current = null;
    setIsPreviewPanning(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function hasDraggableWatermarkContent() {
    if (watermarkType === "text") {
      return textLayers.some((layer) => layer.text.trim());
    }

    if (watermarkType === "logo") {
      return logoLayers.some((layer) => layer.logoImage);
    }

    return Boolean(logoImage);
  }

  function getActiveWatermarkBoundsNearPoint(
    point: { x: number; y: number } | null,
    proximity = 32,
  ) {
    if (!point) {
      return null;
    }

    const fromLayers = getWatermarkBoundsNearPoint(
      point,
      layerBoundsRef.current,
      proximity,
    );

    if (fromLayers) {
      return fromLayers;
    }

    const bounds = textBoundsRef.current;

    if (bounds && isPointInBounds(point, expandBounds(bounds, proximity))) {
      return bounds;
    }

    return null;
  }

  function updateWatermarkDragHint(
    point: { x: number; y: number } | null,
    canvas: HTMLCanvasElement | null,
  ) {
    if (
      activeImageTool === "crop" ||
      activeImageTool === "blur" ||
      watermarkMode !== "single" ||
      !hasMedia ||
      !hasDraggableWatermarkContent() ||
      isDraggingWatermark ||
      !canvas ||
      !previewPanelRef.current
    ) {
      setShowWatermarkDragHint(false);
      setWatermarkDragHintPos(null);
      return;
    }

    const bounds = getActiveWatermarkBoundsNearPoint(point);

    if (!bounds) {
      setShowWatermarkDragHint(false);
      setWatermarkDragHintPos(null);
      return;
    }

    setShowWatermarkDragHint(true);
    setWatermarkDragHintPos(
      getCanvasHintPosition(canvas, bounds, previewPanelRef.current),
    );
  }

  function isPointerOverWatermark(
    point: { x: number; y: number } | null,
    mode: WatermarkMode,
  ) {
    if (mode !== "single" || !point) {
      return false;
    }

    for (const bounds of layerBoundsRef.current.values()) {
      if (isPointInBounds(point, bounds)) {
        return true;
      }
    }

    const bounds = textBoundsRef.current;
    return Boolean(bounds && isPointInBounds(point, bounds));
  }

  function handleCropPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const point = getImagePoint(event, { requireInside: true });

    if (!point || !image) {
      return;
    }

    event.preventDefault();
    setIsWatermarkHovering(false);
    event.currentTarget.setPointerCapture(event.pointerId);

    const handle = cropRect ? getCropHandleAtPoint(point, cropRect, image) : null;
    const isMoving =
      cropRect &&
      !handle &&
      point.x >= cropRect.x &&
      point.x <= cropRect.x + cropRect.width &&
      point.y >= cropRect.y &&
      point.y <= cropRect.y + cropRect.height;
    const nextRect = cropRect ?? {
      height: 1,
      width: 1,
      x: point.x,
      y: point.y,
    };

    cropDragRef.current = {
      aspectRatio:
        isCropAspectRatioLocked && nextRect.height > 0
          ? nextRect.width / nextRect.height
          : undefined,
      mode: handle ?? (isMoving ? "move" : "new"),
      origin: point,
      rect: nextRect,
    };

    if (!cropRect || (!handle && !isMoving)) {
      setCropRect(nextRect);
    }
  }

  function handleCropPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const drag = cropDragRef.current;
    const point = getImagePoint(event);

    if (!drag || !point || !image) {
      return;
    }

    event.preventDefault();
    setCropRect(getNextCropRect({ drag, image, point }));
  }

  function handleCropPointerUp(event: PointerEvent<HTMLCanvasElement>) {
    cropDragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleBlurPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const point = getImagePoint(event, { requireInside: true });

    if (!point || !image) {
      return;
    }

    event.preventDefault();
    setIsWatermarkHovering(false);
    event.currentTarget.setPointerCapture(event.pointerId);

    const strokeId = crypto.randomUUID();
    blurDragRef.current = { strokeId };

    updateBlurStrokes((current) => [
      ...current,
      {
        brushSize: blurBrushSize,
        id: strokeId,
        points: [point],
      },
    ]);
  }

  function handleBlurPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const drag = blurDragRef.current;
    const point = getImagePoint(event);

    if (!drag || !point || !image) {
      return;
    }

    event.preventDefault();

    updateBlurStrokes((current) =>
      current.map((stroke) => {
        if (stroke.id !== drag.strokeId) {
          return stroke;
        }

        const lastPoint = stroke.points[stroke.points.length - 1];

        if (lastPoint) {
          const deltaX = point.x - lastPoint.x;
          const deltaY = point.y - lastPoint.y;
          const minDistance =
            getBlurBrushRadius(
              stroke.brushSize,
              image.naturalWidth,
              image.naturalHeight,
            ) * 0.15;

          if (deltaX * deltaX + deltaY * deltaY < minDistance * minDistance) {
            return stroke;
          }
        }

        return {
          ...stroke,
          points: [...stroke.points, point],
        };
      }),
    );
  }

  function handleBlurPointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (!blurDragRef.current) {
      return;
    }

    blurDragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    commitSettingsHistorySnapshot(getWatermarkSettingsSnapshot());
  }

  function handleResizePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const point = getResizePoint(event);

    if (!point || !image || !resizeWidth || !resizeHeight) {
      return;
    }

    const handle = getResizeHandleAtPoint(point, resizeWidth, resizeHeight);

    if (!handle) {
      return;
    }

    event.preventDefault();
    setIsWatermarkHovering(false);
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeDragRef.current = {
      mode: handle,
      origin: point,
      startHeight: resizeHeight,
      startWidth: resizeWidth,
    };
  }

  function handleResizePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const drag = resizeDragRef.current;
    const point = getResizePoint(event);

    if (!drag || !point || !image) {
      return;
    }

    event.preventDefault();

    const nextDimensions = getNextResizeDimensions({
      drag,
      isAspectRatioLocked,
      image,
      point,
    });

    setResizeWidth(nextDimensions.width);
    setResizeHeight(nextDimensions.height);
    updateResizeWarning(nextDimensions.width, nextDimensions.height);
  }

  function handleResizePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    resizeDragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function getResizePoint(
    event: PointerEvent<HTMLCanvasElement>,
    options: { requireInside?: boolean } = {},
  ) {
    const point = getCanvasPoint(event);
    const frame = imageFrameRef.current;

    if (!point || !frame || !resizeWidth || !resizeHeight) {
      return null;
    }

    const isInsideFrame =
      point.x >= frame.x &&
      point.x <= frame.x + frame.width &&
      point.y >= frame.y &&
      point.y <= frame.y + frame.height;

    if (options.requireInside && !isInsideFrame) {
      return null;
    }

    const scaleX = frame.width / resizeWidth;
    const scaleY = frame.height / resizeHeight;

    return {
      x: (point.x - frame.x) / scaleX,
      y: (point.y - frame.y) / scaleY,
    };
  }

  function getImagePoint(
    event: PointerEvent<HTMLCanvasElement>,
    options: { requireInside?: boolean } = {},
  ) {
    const point = getCanvasPoint(event);
    const frame = imageFrameRef.current;

    if (!point || !frame || !image) {
      return null;
    }

    const isInsideFrame =
      point.x >= frame.x &&
      point.x <= frame.x + frame.width &&
      point.y >= frame.y &&
      point.y <= frame.y + frame.height;

    if (options.requireInside && !isInsideFrame) {
      return null;
    }

    return {
      x: clamp(
        ((point.x - frame.x) / frame.width) * image.naturalWidth,
        0,
        image.naturalWidth,
      ),
      y: clamp(
        ((point.y - frame.y) / frame.height) * image.naturalHeight,
        0,
        image.naturalHeight,
      ),
    };
  }

  async function handleImageToolSelect(tool: ImageTool) {
    if (activeImageTool === tool) {
      setActiveImageTool(null);
      return;
    }

    if (tool !== "rotate") {
      await materializeRotationIfNeeded();
    }

    setActiveImageTool(tool);
    setIsWatermarkHovering(false);

    if (tool !== "crop") {
      setCropRect(null);
      cropDragRef.current = null;
    }

    if (tool !== "resize") {
      resizeDragRef.current = null;
    }

    if (tool !== "blur") {
      blurDragRef.current = null;
    }

    if (tool === "resize" && image) {
      setResizeWidth((currentWidth) =>
        currentWidth > 0 ? currentWidth : image.naturalWidth,
      );
      setResizeHeight((currentHeight) =>
        currentHeight > 0 ? currentHeight : image.naturalHeight,
      );
    }
  }

  async function openPhotoImageTool(tool: ImageTool) {
    if (mediaKind !== "image") {
      return;
    }

    if (tool !== "rotate") {
      await materializeRotationIfNeeded();
    }

    setActiveEditorPanel("photos");
    setActivePhotoTool(tool);
    setActiveImageTool(tool);
    setIsWatermarkHovering(false);

    if (tool !== "crop") {
      setCropRect(null);
      cropDragRef.current = null;
    }

    if (tool !== "resize") {
      resizeDragRef.current = null;
    }

    if (tool !== "blur") {
      blurDragRef.current = null;
    }

    if (tool === "resize" && image) {
      setResizeWidth((currentWidth) =>
        currentWidth > 0 ? currentWidth : image.naturalWidth,
      );
      setResizeHeight((currentHeight) =>
        currentHeight > 0 ? currentHeight : image.naturalHeight,
      );
    }

    if (tool === "crop" && image) {
      setCropRect((current) => current ?? createDefaultCropRect(image));
    }
  }

  function expandMobileControls() {
    setMobileControlsExpanded(true);
  }

  function toggleMobileControls() {
    setMobileControlsExpanded((current) => !current);
  }

  function handlePhotoToolSelect(tool: PhotoToolId) {
    if (tool !== "watermark" && !imageToolsEnabled) {
      return;
    }

    if (isPhotoImageTool(tool)) {
      expandMobileControls();
      void openPhotoImageTool(tool);
      return;
    }

    setActiveEditorPanel("photos");
    setActivePhotoTool(tool);
    setActiveImageTool(null);
    setIsWatermarkHovering(false);
    setCropRect(null);
    cropDragRef.current = null;
    resizeDragRef.current = null;
    blurDragRef.current = null;
    expandMobileControls();
  }

  function applyTextWatermarkModeDefaults(mode: WatermarkMode) {
    const defaults =
      mode === "single"
        ? SINGLE_TEXT_WATERMARK_DEFAULTS
        : TILE_TEXT_WATERMARK_DEFAULTS;

    clearActiveTextTemplate();
    setWatermarkMode(mode);
    setActiveTextTemplate(null);

    updateTextLayer(activeTextLayerId, {
      customPosition: defaults.customPosition
        ? { ...defaults.customPosition }
        : null,
      fontFamily: defaults.fontFamily,
      fontSizeScale: defaults.fontSizeScale,
      fontWeight: defaults.fontWeight,
      opacity: defaults.opacity,
      textColor: defaults.textColor,
      watermarkPosition: defaults.watermarkPosition,
    });

    setFontFamily(defaults.fontFamily);
    setFontSizeScale(defaults.fontSizeScale);
    setFontWeight(defaults.fontWeight);
    setWatermarkOpacity(defaults.opacity);
    setTextColor(defaults.textColor);
    setCustomPosition(
      defaults.customPosition ? { ...defaults.customPosition } : null,
    );
    setWatermarkPosition(defaults.watermarkPosition);

    if (mode === "tile") {
      setTileAngle(DEFAULT_TILE_ANGLE);
      setTileDensity(DEFAULT_TILE_DENSITY);
      setTileGap(DEFAULT_TILE_GAP);
    }

    setIsWatermarkHovering(false);
  }

  function handleWatermarkToolSelect(tool: WatermarkToolId) {
    setActiveWatermarkTool(tool);
    expandMobileControls();

    if (tool === "text") {
      const shouldApplySingleDefaults =
        watermarkType === "logo" || activeWatermarkTool === "logo";

      handleWatermarkTypeChange("text");

      if (shouldApplySingleDefaults) {
        applyTextWatermarkModeDefaults("single");
      }

      return;
    }

    if (tool === "logo") {
      handleWatermarkTypeChange("logo");
    }
  }

  function handlePdfDocToolSelect(tool: PdfDocToolId) {
    setActiveEditorPanel("pdfDocs");
    setActivePdfTool(tool);
    setActiveImageTool(null);
    setCropRect(null);
    cropDragRef.current = null;
    resizeDragRef.current = null;
    blurDragRef.current = null;

    if (tool === "watermark") {
      deselectActiveSignaturePlacement();
      setActiveWatermarkTool("text");
      if (watermarkType === "signature") {
        setWatermarkType("text");
        syncLegacyFromTextLayer(activeTextLayer);
      }
    } else if (tool === "signFill") {
      setPdfDocumentTool("signature");
      deselectActiveSignaturePlacement();
    }

    if (tool === "merge") {
      setFormatUploadPrompt(null);
      syncLoadedPdfIntoMergeBatch();
    }

    if (tool === "compress") {
      setFormatUploadPrompt(null);
      setLastPdfCompressResult(null);
    }

    expandMobileControls();
  }

  function clearImageEditToolState() {
    setActiveImageTool(null);
    setCropRect(null);
    cropDragRef.current = null;
    resizeDragRef.current = null;
    blurDragRef.current = null;
  }

  function handleVideoToolSelect(tool: VideoToolId) {
    setActiveEditorPanel("video");
    setActiveVideoTool(tool);
    clearImageEditToolState();

    if (tool === "blur") {
      ensureVideoBlurRegionsInitialized();
    }

    if (tool === "watermark") {
      setActiveWatermarkTool("text");
      if (watermarkType === "signature") {
        setWatermarkType("text");
        syncLegacyFromTextLayer(activeTextLayer);
      }
    }

    expandMobileControls();
  }

  function handleEditorPanelSelect(panel: EditorPanelId) {
    if (!isMainEditorTabAllowed(panel, mediaKind)) {
      return;
    }

    const editorReady = isEditorToolsReady({
      image,
      isPdfLoading,
      mediaKind,
      pdfPageCount,
      videoUrl,
    });

    if (!editorReady) {
      if (
        panel === "pdfDocs" ||
        panel === "signFill"
      ) {
        setActiveEditorPanel("pdfDocs");

        if (activePdfTool !== "merge" && activePdfTool !== "compress") {
          requestFormatUploadPrompt("pdfDocs");
        }

        return;
      }

      if (panel === "video") {
        requestFormatUploadPrompt("video");
        return;
      }

      if (
        panel === "photos" ||
        panel === "watermark" ||
        panel === "effects" ||
        panel === "blur" ||
        panel === "crop" ||
        panel === "resize" ||
        panel === "rotate"
      ) {
        requestFormatUploadPrompt("photos");
      }

      return;
    }

    setFormatUploadPrompt(null);

    if (panel === "pdfDocs" || panel === "signFill") {
      if (activeEditorPanel === "pdfDocs") {
        setActiveEditorPanel(null);
        return;
      }

      setActiveEditorPanel("pdfDocs");
      setActivePdfTool("signFill");
      clearImageEditToolState();
      return;
    }

    if (panel === "video") {
      if (activeEditorPanel === "video") {
        setActiveEditorPanel(null);
        return;
      }

      setActiveEditorPanel("video");
      clearImageEditToolState();
      return;
    }

    if (
      panel === "photos" ||
      panel === "watermark" ||
      panel === "effects"
    ) {
      if (panel === "photos" && activeEditorPanel === "photos") {
        setActiveEditorPanel(null);
        return;
      }

      if (panel === "effects") {
        if (!imageToolsEnabled) {
          return;
        }

        setActivePhotoTool("filters");
      } else if (panel === "watermark") {
        if (mediaKind === "pdf") {
          setActiveEditorPanel("pdfDocs");
          setActivePdfTool("watermark");
          deselectActiveSignaturePlacement();
          setActiveWatermarkTool("text");
          if (watermarkType === "signature") {
            setWatermarkType("text");
            syncLegacyFromTextLayer(activeTextLayer);
          }
          clearImageEditToolState();
          return;
        }

        setActivePhotoTool("watermark");
      } else if (panel === "photos") {
        setActivePhotoTool("watermark");
      }

      setActiveEditorPanel("photos");
      clearImageEditToolState();
      return;
    }

    if (
      panel === "blur" ||
      panel === "crop" ||
      panel === "resize" ||
      panel === "rotate"
    ) {
      void openPhotoImageTool(panel);
    }
  }

  function removeLoadedMedia() {
    mediaLoadGenerationRef.current += 1;
    setIsPdfLoading(false);
    clearAllMedia();
  }

  function handlePreviewMediaRemove() {
    const confirmed = window.confirm(
      "Remove this file and return to the upload screen? Your current edits will be cleared.",
    );

    if (confirmed) {
      removeLoadedMedia();
    }
  }

  function resetEditorMediaStateWithoutPersistence() {
    mediaLoadGenerationRef.current += 1;
    setIsPdfLoading(false);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    clearImageBatch();
    clearVideoBatch();
    clearPdfMergeBatch();
    clearPdfState();
    setImage(null);
    setVideoUrl("");
    setVideoDuration(0);
    setVideoTrimStartSeconds(0);
    setVideoTrimEndSeconds(0);
    setVideoTrimAppliedStartSeconds(0);
    setVideoTrimAppliedEndSeconds(0);
    setVideoCropSavedNotice(false);
    setVideoSize(null);
    setVideoFileSize(0);
    setMediaKind(null);
    setFileName("");
    setUploadedImageSize(null);
    setResizeWidth(0);
    setResizeHeight(0);
    setRotationAngle(0);
    setResizeWarning("");
    setBlurStrokes([]);
    setBlurBrushSize("medium");
    blurDragRef.current = null;
    setActiveImageTool(null);
    setCropRect(null);
    setActiveImageEffect("none");
    setEffectBorderWidth("medium");
    setEffectBorderColor("ink");
    setEffectExposure(0);
    setUploadError("");
    setExportError("");
    setExportNotice("");
    setActiveEditorPanel(null);
    setFormatUploadPrompt(null);
    setActivePhotoTool("watermark");
    setActivePdfTool("signFill");
    const initialCaptionLayers = createInitialVideoCaptionLayers();
    setVideoCaptionLayers(initialCaptionLayers);
    setActiveVideoCaptionLayerId(initialCaptionLayers[0]!.id);
    setCaptionsMasterEnabled(true);
    setPreviewZoomPercent(PREVIEW_ZOOM_DEFAULT);
    resetPreviewPanPosition();
    sessionRestoreRef.current = null;
    isRestoringSessionRef.current = false;
  }

  resetAnonymousEditorEntryRef.current = resetEditorMediaStateWithoutPersistence;

  function clearAllMedia() {
    resetEditorMediaStateWithoutPersistence();
    void clearEditorSession();
  }

  function handleEditorExitRequest() {
    setShowEditorExitConfirm(true);
  }

  function handleEditorExitConfirm() {
    setShowEditorExitConfirm(false);
    clearAllMedia();
    router.push("/");
  }

  async function materializeRotationIfNeeded() {
    if (!image || rotationAngle === 0) {
      return;
    }

    const nextImage = await createRotatedImage(image, rotationAngle);

    replaceWorkingImage(nextImage);
    setRotationAngle(0);
  }

  function replaceWorkingImage(nextImage: HTMLImageElement) {
    setImage(nextImage);
    setResizeWidth(nextImage.naturalWidth);
    setResizeHeight(nextImage.naturalHeight);
    setCustomPosition((position) =>
      position
        ? {
            xPercent: clamp(position.xPercent, 0.02, 0.98),
            yPercent: clamp(position.yPercent, 0.02, 0.98),
          }
        : null,
    );
    setIsWatermarkHovering(false);
    setCropRect(null);
    cropDragRef.current = null;
    setBlurStrokes([]);
    blurDragRef.current = null;

    if (activeBatchImageId && uploadedImageSize) {
      setImageBatch((currentBatch) =>
        currentBatch.map((entry) =>
          entry.id === activeBatchImageId
            ? {
                ...entry,
                blurStrokes: [],
                image: nextImage,
                resizeHeight: nextImage.naturalHeight,
                resizeWidth: nextImage.naturalWidth,
                uploadedImageSize: {
                  height: nextImage.naturalHeight,
                  width: nextImage.naturalWidth,
                },
              }
            : entry,
        ),
      );
      setUploadedImageSize({
        height: nextImage.naturalHeight,
        width: nextImage.naturalWidth,
      });
    }
  }

  function rotateBaseImage(direction: "left" | "right") {
    setRotationAngle((angle) =>
      normalizeDegrees(angle + (direction === "right" ? 90 : -90)),
    );
  }

  async function applyCrop() {
    if (!image || !cropRect || cropRect.width < 4 || cropRect.height < 4) {
      return;
    }

    const nextImage = await createCroppedImage(image, cropRect);

    replaceWorkingImage(nextImage);
    setActiveImageTool(null);
    setCropRect(createDefaultCropRect(nextImage));
  }

  function cancelCrop() {
    setCropRect(null);
    cropDragRef.current = null;
    setActiveImageTool(null);
  }

  function handleEditorPanelClose() {
    if (activeEditorPanel === "photos") {
      if (activePhotoTool === "crop") {
        cancelCrop();
      } else if (activePhotoTool === "resize") {
        resizeDragRef.current = null;
        setActiveImageTool(null);
      } else if (activePhotoTool === "blur") {
        blurDragRef.current = null;
        setActiveImageTool(null);
      } else if (activePhotoTool === "rotate") {
        setActiveImageTool(null);
      }
    }

    setActiveEditorPanel(null);
  }

  function handleCropWidthChange(value: number) {
    if (!image || !cropRect) {
      return;
    }

    const nextWidth = clamp(
      Math.round(value),
      1,
      image.naturalWidth - cropRect.x,
    );
    let nextHeight = cropRect.height;

    if (isCropAspectRatioLocked && cropRect.height > 0) {
      const ratio = cropRect.width / cropRect.height;
      nextHeight = clamp(
        Math.round(nextWidth / ratio),
        1,
        image.naturalHeight - cropRect.y,
      );
    }

    setCropRect({
      ...cropRect,
      height: nextHeight,
      width: nextWidth,
    });
  }

  function handleCropHeightChange(value: number) {
    if (!image || !cropRect) {
      return;
    }

    const nextHeight = clamp(
      Math.round(value),
      1,
      image.naturalHeight - cropRect.y,
    );
    let nextWidth = cropRect.width;

    if (isCropAspectRatioLocked && cropRect.width > 0) {
      const ratio = cropRect.width / cropRect.height;
      nextWidth = clamp(
        Math.round(nextHeight * ratio),
        1,
        image.naturalWidth - cropRect.x,
      );
    }

    setCropRect({
      ...cropRect,
      height: nextHeight,
      width: nextWidth,
    });
  }

  function handleResizeWidthChange(value: number) {
    const nextWidth =
      resizeUnit === "percent" && image
        ? Math.max(1, Math.round((value / 100) * image.naturalWidth))
        : Math.max(1, Math.round(value));
    const nextHeight =
      isAspectRatioLocked && image
        ? Math.max(1, Math.round(nextWidth / getImageAspectRatio(image)))
        : resizeHeight;

    setResizeWidth(nextWidth);

    if (isAspectRatioLocked) {
      setResizeHeight(nextHeight);
    }

    updateResizeWarning(nextWidth, nextHeight);
  }

  function handleResizeHeightChange(value: number) {
    const nextHeight =
      resizeUnit === "percent" && image
        ? Math.max(1, Math.round((value / 100) * image.naturalHeight))
        : Math.max(1, Math.round(value));
    const nextWidth =
      isAspectRatioLocked && image
        ? Math.max(1, Math.round(nextHeight * getImageAspectRatio(image)))
        : resizeWidth;

    setResizeHeight(nextHeight);

    if (isAspectRatioLocked) {
      setResizeWidth(nextWidth);
    }

    updateResizeWarning(nextWidth, nextHeight);
  }

  function updateResizeWarning(width: number, height: number) {
    if (image && (width > image.naturalWidth || height > image.naturalHeight)) {
      setResizeWarning("Enlarging may reduce quality.");
      return;
    }

    if (
      uploadedImageSize &&
      (width > uploadedImageSize.width || height > uploadedImageSize.height)
    ) {
      setResizeWarning("Enlarging may reduce quality.");
      return;
    }

    setResizeWarning("");
  }

  async function applyResize() {
    if (!image || !resizeWidth || !resizeHeight) {
      return;
    }

    const nextImage = await createResizedImage(
      image,
      resizeWidth,
      resizeHeight,
      resizeScaleMode,
    );

    replaceWorkingImage(nextImage);
    updateResizeWarning(nextImage.naturalWidth, nextImage.naturalHeight);
  }

  async function loadImageBatchFiles(files: File[]) {
    const imageFiles = files.filter(isImageFile);

    if (!imageFiles.length) {
      setUploadError("Please choose JPG, PNG, or WebP images.");
      return;
    }

    setUploadError("");

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    clearImageBatch();
    clearVideoBatch();
    clearPdfMergeBatch();
    clearPdfState();

    try {
      const draftState = anonymousDraftRestoreRef.current;
      const preservedIds =
        draftState?.imageBatch?.map((entry) => entry.id) ??
        sessionRestoreRef.current?.batchEntryIds ??
        [];
      const loadedEntries = await Promise.all(
        imageFiles.map(async (file, index) => {
          const fileKey = file.name.replace(/\.[^.]+$/, "");
          const preservedId = preservedIds[index] ?? fileKey;
          const loaded = await loadImageElementFromFile(file);
          const saved = draftState?.imageBatch?.find(
            (entry) => entry.id === preservedId || entry.fileKey === preservedId,
          );
          const entry = createBatchImageEntry(
            loaded.file,
            loaded.image,
            loaded.objectUrl,
            preservedId,
          );

          if (!saved) {
            return entry;
          }

          return {
            ...entry,
            blurStrokes: cloneBlurStrokes(saved.blurStrokes),
            fileName: saved.fileName,
            resizeHeight: saved.resizeHeight,
            resizeWidth: saved.resizeWidth,
            rotationAngle: saved.rotationAngle,
            uploadedImageSize: saved.uploadedImageSize ?? entry.uploadedImageSize,
          };
        }),
      );

      setMediaKind("image");
      setVideoUrl("");
      setVideoDuration(0);
      setVideoSize(null);
      setVideoFileSize(0);
      setImageBatch(loadedEntries);

      const initialEntry =
        loadedEntries.find(
          (entry) =>
            entry.id === draftState?.activeBatchImageId ||
            entry.id === sessionRestoreRef.current?.activeBatchImageId,
        ) ?? loadedEntries[0];

      applyActiveBatchEntry(initialEntry);
      finishMediaLoad("image");
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "We could not load those images. Please try again.",
      );
      resolvePendingDraftRestore();
    }
  }

  function loadImageFile(file: File) {
    if (!isImageFile(file)) {
      setUploadError("Please choose a JPG, PNG, or WebP image.");
      return;
    }

    setUploadError("");

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    setPreviewZoomPercent(PREVIEW_ZOOM_DEFAULT);
    clearImageBatch();
    clearVideoBatch();
    clearPdfMergeBatch();
    clearPdfState();

    const objectUrl = URL.createObjectURL(file);
    const nextImage = new Image();

    objectUrlRef.current = objectUrl;
    nextImage.onload = () => {
      const entry = createBatchImageEntry(file, nextImage, objectUrl);

      setMediaKind("image");
      setImageBatch([entry]);
      setActiveBatchImageId(entry.id);
      setImage(nextImage);
      setVideoUrl("");
      setVideoDuration(0);
      setVideoSize(null);
      setVideoFileSize(0);
      setFileName(file.name);
      setUploadedImageSize({
        height: nextImage.naturalHeight,
        width: nextImage.naturalWidth,
      });
      setResizeWidth(nextImage.naturalWidth);
      setResizeHeight(nextImage.naturalHeight);
      setResizeWarning("");
      setActiveImageTool(null);
      setCropRect(null);
      setIsWatermarkHovering(false);
      finishMediaLoad("image");
    };
    nextImage.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      objectUrlRef.current = null;
      setUploadError("We could not load that image. Please try another file.");
    };
    nextImage.src = objectUrl;
  }

  async function loadVideoFile(file: File) {
    if (!isVideoFile(file)) {
      setUploadError("Please choose an MP4, MOV, or WebM video.");
      return;
    }

    setUploadError("");

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setPreviewZoomPercent(PREVIEW_ZOOM_DEFAULT);
    clearImageBatch();
    clearVideoBatch();
    clearPdfMergeBatch();
    clearPdfState();

    try {
      const entry = await createBatchVideoEntryFromFile(file);
      objectUrlRef.current = entry.objectUrl;
      setMediaKind("video");
      setImage(null);
      setActiveBatchImageId(null);
      setVideoBatch([entry]);
      applyActiveBatchVideoEntry(entry);
      setVideoShortenOriginalFromEntry(entry);
      setUploadError("");
      setResizeWarning("");
      setActiveImageTool(null);
      setCropRect(null);
      setIsWatermarkHovering(false);
      finishMediaLoad("video");
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "We could not load that video. Please try another file.",
      );
    }
  }

  function loadLogoFile(file: File) {
    if (!isImageFile(file)) {
      setLogoError("Please choose a PNG, JPG, or WebP logo image.");
      return;
    }

    setLogoError("");

    const activeLayer =
      logoLayers.find((layer) => layer.id === activeLogoLayerId) ?? activeLogoLayer;

    if (activeLayer.logoObjectUrl) {
      URL.revokeObjectURL(activeLayer.logoObjectUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    const nextLogo = new Image();

    nextLogo.onload = () => {
      updateLogoLayer(activeLogoLayerId, {
        backgroundRemovedLogoImage: null,
        customPosition: null,
        isLogoBackgroundRemoved: false,
        logoFileName: file.name,
        logoImage: nextLogo,
        logoObjectUrl: objectUrl,
        originalLogoImage: nextLogo,
      });
      setOriginalLogoImage(nextLogo);
      setLogoImage(nextLogo);
      setBackgroundRemovedLogoImage(null);
      setLogoFileName(file.name);
      setIsLogoBackgroundRemoved(false);
      setLogoBackgroundMessage("");
      setCustomPosition(null);
      setIsWatermarkHovering(false);
    };
    nextLogo.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setLogoError("We could not load that logo. Please try another file.");
    };
    nextLogo.src = objectUrl;
  }

  function handleLogoBackgroundToggle() {
    const activeLayer =
      logoLayers.find((layer) => layer.id === activeLogoLayerId) ?? activeLogoLayer;
    const originalLogoImageForLayer = activeLayer.originalLogoImage;

    if (!originalLogoImageForLayer) {
      return;
    }

    if (activeLayer.isLogoBackgroundRemoved) {
      updateLogoLayer(activeLogoLayerId, {
        isLogoBackgroundRemoved: false,
        logoImage: originalLogoImageForLayer,
      });
      setLogoImage(originalLogoImageForLayer);
      setIsLogoBackgroundRemoved(false);
      setLogoBackgroundMessage("");
      return;
    }

    if (activeLayer.backgroundRemovedLogoImage) {
      updateLogoLayer(activeLogoLayerId, {
        isLogoBackgroundRemoved: true,
        logoImage: activeLayer.backgroundRemovedLogoImage,
      });
      setLogoImage(activeLayer.backgroundRemovedLogoImage);
      setIsLogoBackgroundRemoved(true);
      setLogoBackgroundMessage("Best effort background removal is on.");
      return;
    }

    const result = createBackgroundRemovedLogo(originalLogoImageForLayer);

    if (!result) {
      setLogoBackgroundMessage(
        "Couldn't detect a plain background. Try a logo with a solid color background, or use a PNG with transparency already applied",
      );
      return;
    }

    if (result.alreadyTransparent) {
      updateLogoLayer(activeLogoLayerId, {
        backgroundRemovedLogoImage: originalLogoImageForLayer,
        isLogoBackgroundRemoved: true,
        logoImage: originalLogoImageForLayer,
      });
      setLogoImage(originalLogoImageForLayer);
      setBackgroundRemovedLogoImage(originalLogoImageForLayer);
      setIsLogoBackgroundRemoved(true);
      setLogoBackgroundMessage("This logo already appears to have transparent corners.");
      return;
    }

    const cleanedLogo = new Image();

    cleanedLogo.onload = () => {
      updateLogoLayer(activeLogoLayerId, {
        backgroundRemovedLogoImage: cleanedLogo,
        isLogoBackgroundRemoved: true,
        logoImage: cleanedLogo,
      });
      setBackgroundRemovedLogoImage(cleanedLogo);
      setLogoImage(cleanedLogo);
      setIsLogoBackgroundRemoved(true);
      setLogoBackgroundMessage("Best effort background removal is on.");
    };
    cleanedLogo.onerror = () => {
      setLogoBackgroundMessage(
        "We could not process that logo background. Please try another file.",
      );
    };
    cleanedLogo.src = result.dataUrl;
  }

  function removeLogo() {
    const activeLayer =
      logoLayers.find((layer) => layer.id === activeLogoLayerId) ?? activeLogoLayer;

    if (activeLayer.logoObjectUrl) {
      revokeLogoLayerUrls(activeLayer);
    }

    updateLogoLayer(activeLogoLayerId, {
      backgroundRemovedLogoImage: null,
      customPosition: null,
      isLogoBackgroundRemoved: false,
      logoFileName: "",
      logoImage: null,
      logoObjectUrl: null,
      originalLogoImage: null,
    });
    setOriginalLogoImage(null);
    setLogoImage(null);
    setBackgroundRemovedLogoImage(null);
    setLogoFileName("");
    setIsLogoBackgroundRemoved(false);
    setLogoBackgroundMessage("");
    setLogoError("");
    setIsWatermarkHovering(false);
  }

  function handleWatermarkTypeChange(nextType: WatermarkType) {
    if (nextType === "signature") {
      if (watermarkMode === "tile") {
        setWatermarkMode("single");
      }

      if (mediaKind === "pdf" && activePdfPageId) {
        const pagePlacements = pdfPageSignatures[activePdfPageId] ?? [];
        const selected =
          (activeSignaturePlacementId
            ? pagePlacements.find(
                (placement) => placement.id === activeSignaturePlacementId,
              )
            : null) ?? pagePlacements[pagePlacements.length - 1];
        applyPdfPageSignaturePlacementToEditor(selected ?? null);
      } else {
        const activeSignature = savedSignatures.find(
          (signature) => signature.id === activeSignatureId,
        );

        setLogoImage(activeSignature?.image ?? null);
      }
    } else if (nextType === "logo") {
      syncLegacyFromLogoLayer(activeLogoLayer);
    } else if (nextType === "text") {
      syncLegacyFromTextLayer(activeTextLayer);
    }

    setWatermarkType(nextType);
    setIsWatermarkHovering(false);
  }

  function handleActiveSignatureChange(signature: SavedSignature | null) {
    setActiveSignatureId(signature?.id ?? null);

    if (mediaKind === "pdf") {
      setIsWatermarkHovering(false);
      return;
    }

    if (watermarkType === "signature") {
      setLogoImage(signature?.image ?? null);
      setIsWatermarkHovering(false);
    }
  }

  function placeSignatureOnDocument(
    signature: SavedSignature,
    position?: { xPercent: number; yPercent: number },
  ) {
    clearActiveTemplates();

    if (mediaKind === "pdf" && activePdfPageId) {
      setActiveEditorPanel("pdfDocs");
      setActivePdfTool("signFill");
      setPdfDocumentTool("signature");

      const defaultScale = signature.kind === "initials" ? 45 : fontSizeScale;
      const placement = createPdfPageSignaturePlacement(signature.id, {
        customPosition: position ?? null,
        fontSizeScale: defaultScale,
        opacity: PDF_SIGNATURE_DEFAULT_OPACITY,
        watermarkPosition,
      });

      setPdfPageSignatures((currentMap) =>
        appendPdfPageSignaturePlacement(currentMap, activePdfPageId, placement),
      );
      applyPdfPageSignaturePlacementToEditor(placement);
      return;
    }

    if (watermarkType !== "signature") {
      setWatermarkType("signature");
    }

    if (watermarkMode !== "single") {
      setWatermarkMode("single");
    }

    setActiveSignatureId(signature.id);
    setLogoImage(signature.image);
    setCustomPosition(position ?? null);
    setIsWatermarkHovering(false);
  }

  function handleSignatureDragOver(event: DragEvent<HTMLCanvasElement>) {
    if (!event.dataTransfer.types.includes(SIGNATURE_DRAG_MIME)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsSignatureDropTarget(true);
  }

  function handleSignatureDragLeave(event: DragEvent<HTMLCanvasElement>) {
    const nextTarget = event.relatedTarget;

    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return;
    }

    setIsSignatureDropTarget(false);
  }

  function handleSignatureDrop(event: DragEvent<HTMLCanvasElement>) {
    setIsSignatureDropTarget(false);

    const signatureId = event.dataTransfer.getData(SIGNATURE_DRAG_MIME);

    if (!signatureId) {
      return;
    }

    const signature = savedSignatures.find((entry) => entry.id === signatureId);

    if (!signature) {
      return;
    }

    event.preventDefault();

    const placement = getCanvasPlacementFromDrag(event, event.currentTarget);

    if (!placement) {
      return;
    }

    placeSignatureOnDocument(signature, placement);
  }

  const hasMedia = Boolean(
    image ||
      videoUrl ||
      isPdfLoading ||
      (mediaKind === "pdf" && pdfPageCount > 0),
  );
  const hasPreviewContent =
    !isPdfLoading &&
    Boolean(
      ((mediaKind === "image" || mediaKind === "pdf") && image) ||
        (mediaKind === "video" && videoUrl),
    );
  const previewZoomInDisabled = previewZoomPercent >= PREVIEW_ZOOM_MAX;
  const previewZoomOutDisabled = previewZoomPercent <= PREVIEW_ZOOM_MIN;
  const previewZoomResetDisabled =
    previewZoomPercent === PREVIEW_ZOOM_DEFAULT;

  function handlePreviewZoomIn() {
    setPreviewZoomPercent((current) =>
      clampPreviewZoom(current + PREVIEW_ZOOM_STEP),
    );
  }

  function handlePreviewZoomOut() {
    setPreviewZoomPercent((current) =>
      clampPreviewZoom(current - PREVIEW_ZOOM_STEP),
    );
  }

  function handlePreviewZoomReset() {
    setPreviewZoomPercent(PREVIEW_ZOOM_DEFAULT);
    resetPreviewPanPosition();
  }

  function resetPreviewPanPosition() {
    const container = previewCheckerboardRef.current;

    if (container) {
      container.scrollLeft = 0;
      container.scrollTop = 0;
    }

    previewPanDragRef.current = null;
    setIsPreviewPanning(false);
  }

  function shouldEnablePreviewPan() {
    return (
      previewZoomPercent > PREVIEW_ZOOM_DEFAULT &&
      !activeImageTool &&
      !(
        mediaKind === "pdf" &&
        isPdfSignFillMode() &&
        (pdfDocumentTool === "fill" || pdfDocumentTool === "signature")
      )
    );
  }

  function tryBeginPreviewPan(event: PointerEvent<HTMLElement>) {
    if (!shouldEnablePreviewPan()) {
      return false;
    }

    const container = previewCheckerboardRef.current;

    if (!container) {
      return false;
    }

    previewPanDragRef.current = {
      pointerId: event.pointerId,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
      startX: event.clientX,
      startY: event.clientY,
    };
    setIsPreviewPanning(true);
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    return true;
  }

  function updatePreviewPan(event: PointerEvent<HTMLElement>) {
    const drag = previewPanDragRef.current;
    const container = previewCheckerboardRef.current;

    if (!drag || drag.pointerId !== event.pointerId || !container) {
      return false;
    }

    container.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
    container.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
    event.preventDefault();
    return true;
  }

  function endPreviewPan(event: PointerEvent<HTMLElement>) {
    const drag = previewPanDragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return false;
    }

    previewPanDragRef.current = null;
    setIsPreviewPanning(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    return true;
  }

  function handlePreviewSurfacePointerDown(event: PointerEvent<HTMLElement>) {
    tryBeginPreviewPan(event);
  }

  function handlePreviewSurfacePointerMove(event: PointerEvent<HTMLElement>) {
    updatePreviewPan(event);
  }

  function handlePreviewSurfacePointerUp(event: PointerEvent<HTMLElement>) {
    endPreviewPan(event);
  }

  function handlePreviewSurfacePointerCancel(event: PointerEvent<HTMLElement>) {
    endPreviewPan(event);
  }

  useEffect(() => {
    const container = previewCheckerboardRef.current;

    if (!container) {
      return;
    }

    if (previewZoomPercent === PREVIEW_ZOOM_DEFAULT) {
      resetPreviewPanPosition();
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      container.scrollLeft = Math.max(
        0,
        (container.scrollWidth - container.clientWidth) / 2,
      );
      container.scrollTop = Math.max(
        0,
        (container.scrollHeight - container.clientHeight) / 2,
      );
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [canvasSize.height, canvasSize.width, previewZoomPercent]);

  useEffect(() => {
    const node = previewCheckerboardRef.current;

    if (!node || !hasPreviewContent) {
      return;
    }

    function handlePreviewWheelZoom(event: WheelEvent) {
      if (!event.altKey || event.deltaY === 0) {
        return;
      }

      event.preventDefault();

      setPreviewZoomPercent((current) =>
        clampPreviewZoom(
          current + (event.deltaY < 0 ? PREVIEW_ZOOM_STEP : -PREVIEW_ZOOM_STEP),
        ),
      );
    }

    node.addEventListener("wheel", handlePreviewWheelZoom, { passive: false });

    return () => {
      node.removeEventListener("wheel", handlePreviewWheelZoom);
    };
  }, [hasPreviewContent]);

  const isBatchImageMode = mediaKind === "image" && imageBatch.length >= 2;
  const isBatchVideoMode = mediaKind === "video" && videoBatch.length >= 2;
  const imageToolsEnabled = mediaKind === "image";
  const videoToolsEnabled = mediaKind === "video" && Boolean(videoUrl);
  const visibleWatermarkTypes = watermarkTypes.filter(
    (entry) => entry.value !== "signature",
  );
  const loadedMediaDetails =
    mediaKind === "video" && videoSize
      ? `${formatDuration(videoDuration)} · ${videoSize.width}x${videoSize.height}`
      : mediaKind === "pdf" && pdfPageCount > 0
        ? `· ${pdfPageCount} ${pdfPageCount === 1 ? "page" : "pages"}`
        : null;
  const resolvedVideoTrim = resolveVideoTrimRange(
    videoTrimStartSeconds,
    videoTrimEndSeconds,
    videoDuration,
  );
  const resolvedAppliedVideoTrim = resolveVideoTrimRange(
    videoTrimAppliedStartSeconds,
    videoTrimAppliedEndSeconds,
    videoDuration,
  );
  const exportVideoDuration = getVideoTrimDuration(
    videoTrimAppliedStartSeconds,
    videoTrimAppliedEndSeconds,
    videoDuration,
  );
  const draftExportVideoDuration = getVideoTrimDuration(
    videoTrimStartSeconds,
    videoTrimEndSeconds,
    videoDuration,
  );
  const hasUnsavedVideoCrop = !areVideoTrimRangesEqual(
    videoTrimStartSeconds,
    videoTrimEndSeconds,
    videoTrimAppliedStartSeconds,
    videoTrimAppliedEndSeconds,
    videoDuration,
  );
  const showReshortenVideoAction =
    videoToolsEnabled &&
    activeVideoTool === "trim" &&
    !hasUnsavedVideoCrop &&
    videoCropSavedNotice &&
    videoDuration > 0;
  void videoShortenHistoryTick;
  const currentVideoShortenSnapshot = captureVideoShortenSnapshot();
  const canUndoVideoShorten = videoShortenUndoRef.current.length > 0;
  const canRedoVideoShorten = videoShortenRedoRef.current.length > 0;
  const canRestoreOriginalVideo =
    videoShortenOriginalRef.current !== null &&
    !areVideoShortenSnapshotsEqual(
      currentVideoShortenSnapshot,
      videoShortenOriginalRef.current,
    );
  const showWatermarkHistoryInFooter = !(
    activeEditorPanel === "video" && activeVideoTool === "trim"
  );
  const canUndoSettings = settingsHistoryIndex > 0;
  const canRedoSettings = settingsHistoryIndex < settingsHistoryLength - 1;
  const canExportVideo =
    mediaKind === "video" &&
    videoSize !== null &&
    exportVideoDuration > 0 &&
    (videoFileSize > 0
      ? isAnyVideoExportEligible(
          exportVideoDuration,
          videoSize.width,
          videoSize.height,
          videoFileSize,
        )
      : getVideoExportRoute(
          exportVideoDuration,
          videoSize.width,
          videoSize.height,
          Number.MAX_SAFE_INTEGER,
        ) !== "reject");
  const videoExportDisabledReason =
    mediaKind === "video" && !canExportVideo
      ? videoFileSize > 0
        ? getVideoExportRejectionMessage()
        : "Reload the video before exporting."
      : undefined;
  const exportDisabledReason = videoExportDisabledReason;
  const videoServerCostEstimate =
    mediaKind === "video" && videoSize && videoFileSize > 0
      ? getVideoServerCostEstimate(getVideoExportFileMeta())
      : null;
  const currentVideoExportRoute =
    mediaKind === "video" && videoSize
      ? getVideoExportRoute(
          exportVideoDuration,
          videoSize.width,
          videoSize.height,
          videoFileSize > 0 ? videoFileSize : Number.MAX_SAFE_INTEGER,
        )
      : "reject";
  const showVideoServerProcessingPanel =
    mediaKind === "video" &&
    videoServerCostEstimate !== null &&
    isServerSideVideoExportRoute(currentVideoExportRoute);
  const videoExportStageLabel =
    exportServerStage === "preparing"
      ? "Preparing server export..."
      : exportServerStage === "uploading"
        ? "Uploading video..."
        : exportServerStage === "processing"
          ? longVideoProcessingDetail ??
            (currentVideoExportRoute === "long-server"
              ? "Processing long video on our servers. Keep this tab open"
              : "Processing on our servers. This may take longer")
          : exportServerStage === "downloading"
            ? "Downloading processed video..."
            : "Export progress";
  const exportButtonLabel =
    mediaKind === "video"
      ? isExporting
        ? "Exporting..."
        : "Export MP4"
      : mediaKind === "pdf"
        ? isExporting
          ? "Exporting..."
          : "Export PDF"
        : isBatchImageMode
          ? isExporting
            ? "Exporting..."
            : "Export all"
          : isExporting
            ? "Exporting..."
            : "Export JPEG";
  const isExportDisabled =
    isExporting ||
    isRestoringAnonymousDraft ||
    isPdfLoading ||
    (mediaKind === "video"
      ? !canExportVideo
      : mediaKind === "pdf"
        ? pdfPageCount === 0
        : !image);
  const canvasCursor =
    activeImageTool === "crop" ||
    activeImageTool === "resize" ||
    activeImageTool === "blur" ||
    isVideoBlurInteractionActive()
      ? "crosshair"
      : mediaKind === "pdf" &&
          pdfDocumentTool === "signature" &&
          isPdfSignFillMode()
        ? signatureDragRef.current?.mode === "resize" &&
          signatureDragRef.current.resizeHandle
          ? getPlacementResizeCursor(signatureDragRef.current.resizeHandle)
          : signatureHoverFrameAction
            ? "pointer"
            : signatureHoverResizeHandle
              ? getPlacementResizeCursor(signatureHoverResizeHandle)
              : signatureDragRef.current
                ? "grabbing"
                : isSignaturePlacementHovering
                  ? "grab"
                  : "auto"
        : mediaKind === "pdf" && pdfDocumentTool === "fill"
        ? fillDragRef.current?.mode === "resize" && fillDragRef.current.resizeHandle
          ? getFillResizeCursor(fillDragRef.current.resizeHandle)
          : fillHoverFrameAction
            ? "pointer"
            : fillHoverResizeHandle
              ? getFillResizeCursor(fillHoverResizeHandle)
              : fillDragRef.current
                ? "grabbing"
                : isFillFieldHovering
                  ? "grab"
                  : "auto"
      : mediaKind === "video" &&
          activeEditorPanel === "video" &&
          activeVideoTool === "caption" &&
          captionsMasterEnabled
        ? isDraggingCaption
          ? "grabbing"
          : isCaptionHovering
            ? "grab"
            : "auto"
      : watermarkMode === "single"
      ? isDraggingWatermark
        ? "grabbing"
        : isWatermarkHovering
          ? "grab"
          : "auto"
      : "auto";
  const resolvedCanvasCursor =
    canvasCursor === "auto" && shouldEnablePreviewPan()
      ? isPreviewPanning
        ? "grabbing"
        : "grab"
      : canvasCursor;

  useEffect(() => {
    if (mediaKind !== "pdf" && activeEditorPanel === "pdfDocs") {
      setActiveEditorPanel(null);
    }
  }, [activeEditorPanel, mediaKind]);

  useEffect(() => {
    if (mediaKind !== "video" && activeEditorPanel === "video") {
      setActiveEditorPanel(null);
    }
  }, [activeEditorPanel, mediaKind]);

  useEffect(() => {
    syncLoadedPdfIntoMergeBatch();
  }, [activeEditorPanel, activePdfTool, mediaKind, fileName, pdfPageCount]);

  useEffect(() => {
    if (!hasMedia || isRestoringSessionRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      void sessionSaveRef.current?.();
    }, 1200);

    return () => {
      clearTimeout(timer);
    };
  }, [
    activeEditorPanel,
    activeBatchImageId,
    activeFillFieldId,
    activePdfPageId,
    activeSignatureId,
    activeSignaturePlacementId,
    activeLogoTemplate,
    activeTextTemplate,
    customPosition,
    fileName,
    fontSizeScale,
    hasMedia,
    imageBatch,
    mediaKind,
    pdfDocumentTool,
    pdfPageFillMap,
    pdfPageSignatures,
    savedSignatures,
    videoUrl,
    watermarkMode,
    watermarkOpacity,
    watermarkType,
  ]);

  useEffect(() => {
    if (mediaKind !== "video" || activeVideoTool !== "overview") {
      return;
    }

    if (window.matchMedia("(max-width: 767px)").matches) {
      handleVideoToolSelect("watermark");
    }
  }, [activeVideoTool, mediaKind]);

  function renderWatermarkAdjustSliders(layerType: "text" | "logo") {
    const layer = layerType === "text" ? activeTextLayer : activeLogoLayer;
    const layerId =
      layerType === "text" ? activeTextLayerId : activeLogoLayerId;

    return (
      <EditorPanelSection title="Adjust">
        <div className="mb-3 grid grid-cols-2 gap-0.5 editor-segment-track">
          {watermarkModes.map(({ label, value }) => (
            <EditorSegment
              active={watermarkMode === value}
              groupId={`watermark-mode-${layerType}`}
              key={value}
              onClick={() => {
                if (layerType === "text") {
                  applyTextWatermarkModeDefaults(value);
                  return;
                }

                clearActiveTemplates();
                setWatermarkMode(value);
                setIsWatermarkHovering(false);
              }}
            >
              {label}
            </EditorSegment>
          ))}
        </div>
        <WatermarkAdjustSliders
          fontSizeScale={layer.fontSizeScale}
          mode={watermarkMode}
          onFontSizeScaleChange={(value) => {
            if (shouldIgnoreManualSettingsChange()) {
              return;
            }

            if (layerType === "text") {
              clearActiveTextTemplate();
            } else {
              clearActiveLogoTemplate();
            }

            if (layerType === "text") {
              updateTextLayer(layerId, { fontSizeScale: value });
            } else {
              updateLogoLayer(layerId, { fontSizeScale: value });
            }

            handleFontSizeScaleChange(value);
          }}
          onTileAngleChange={(value) => {
            if (shouldIgnoreManualSettingsChange()) {
              return;
            }

            if (layerType === "text") {
              clearActiveTextTemplate();
            } else {
              clearActiveLogoTemplate();
            }
            setTileAngle(value);
          }}
          onTileDensityChange={(value) => {
            if (shouldIgnoreManualSettingsChange()) {
              return;
            }

            if (layerType === "text") {
              clearActiveTextTemplate();
            } else {
              clearActiveLogoTemplate();
            }
            setTileDensity(value);
          }}
          onTileGapChange={(value) => {
            if (shouldIgnoreManualSettingsChange()) {
              return;
            }

            if (layerType === "text") {
              clearActiveTextTemplate();
            } else {
              clearActiveLogoTemplate();
            }
            setTileGap(value);
          }}
          onWatermarkOpacityChange={(value) => {
            if (shouldIgnoreManualSettingsChange()) {
              return;
            }

            if (layerType === "text") {
              clearActiveTextTemplate();
            } else {
              clearActiveLogoTemplate();
            }

            if (layerType === "text") {
              updateTextLayer(layerId, { opacity: value });
            } else {
              updateLogoLayer(layerId, { opacity: value });
            }

            handleWatermarkOpacityChange(value);
          }}
          tileAngle={tileAngle}
          tileDensity={tileDensity}
          tileGap={tileGap}
          watermarkOpacity={layer.opacity}
          watermarkType={layerType}
        />
      </EditorPanelSection>
    );
  }

  function renderWatermarkPreviewAside() {
    const presetNameInputId =
      watermarkAdjustLayerType === "logo"
        ? "logo-preset-name"
        : "text-preset-name";

    return (
      <>
        {renderWatermarkAdjustSliders(watermarkAdjustLayerType)}
        {renderPresetControls(presetNameInputId)}
      </>
    );
  }

  function renderPresetControls(presetNameInputId: string) {
    return (
      <WatermarkPresetControls
        isSavingPreset={isSavingPreset}
        onApplyPreset={(presetId) => {
          const preset = savedPresets.find((entry) => entry.id === presetId);

          if (preset) {
            applyWatermarkSettingsSnapshot(preset.snapshot);
          }
        }}
        onReset={resetWatermarkSettingsToDefaults}
        onSavePreset={saveCurrentPreset}
        presetName={presetName}
        presetNameInputId={presetNameInputId}
        presets={savedPresets}
        setIsSavingPreset={setIsSavingPreset}
        setPresetName={setPresetName}
      />
    );
  }

  function renderQuickTemplates<T extends { icon: QuickTemplateIcon; id: string; label: string }>(
    layoutId: string,
    templates: readonly T[],
    activeTemplateId: string | null,
    onApply: (template: T) => void,
    compact = false,
  ) {
    return (
      <WatermarkQuickTemplates
        activeTemplate={activeTemplateId}
        compact={compact}
        layoutId={layoutId}
        onApplyTemplate={(templateId) => {
          const template = templates.find((entry) => entry.id === templateId);

          if (template) {
            onApply(template);
          }
        }}
        quickTemplates={templates}
      />
    );
  }

  const editorToolsReady = isEditorToolsReady({
    image,
    isPdfLoading,
    mediaKind,
    pdfPageCount,
    videoUrl,
  });
  const showEditorPanel =
    activeEditorPanel !== null &&
    (editorToolsReady || activeEditorPanel === "pdfDocs");
  const editorPanelTitle =
    activeEditorPanel === "photos"
      ? "Photos"
      : activeEditorPanel === "pdfDocs"
        ? "Pdf Docs"
        : activeEditorPanel === "video"
          ? "Videos"
          : "";
  const editorPanelIcon =
    activeEditorPanel === "photos" ? (
      <Images className="h-4 w-4" strokeWidth={2} />
    ) : activeEditorPanel === "pdfDocs" ? (
      <FileText className="h-4 w-4" strokeWidth={2} />
    ) : activeEditorPanel === "video" ? (
      <Video className="h-4 w-4" strokeWidth={2} />
    ) : null;
  const canvasMetaLabel =
    fileName && uploadedImageSize
      ? `${fileName} · ${uploadedImageSize.width}x${uploadedImageSize.height}`
      : fileName
        ? `${fileName}${loadedMediaDetails ?? ""}`
        : null;
  const activeVideoCaptionLayer =
    videoCaptionLayers.find((layer) => layer.id === activeVideoCaptionLayerId) ??
    videoCaptionLayers[0];
  const showCaptionTimelineDock =
    activeEditorPanel === "video" &&
    activeVideoTool === "caption" &&
    captionsMasterEnabled &&
    activeVideoCaptionLayer &&
    isCaptionLayerActive(activeVideoCaptionLayer) &&
    videoDuration > 0;
  const isPhotosWatermarkActive =
    activeEditorPanel === "photos" && activePhotoTool === "watermark";
  const isPdfDocsWatermarkActive =
    activeEditorPanel === "pdfDocs" && activePdfTool === "watermark";
  const isVideoWatermarkActive =
    activeEditorPanel === "video" && activeVideoTool === "watermark";
  const isWatermarkPanelActive =
    isPhotosWatermarkActive ||
    isPdfDocsWatermarkActive ||
    isVideoWatermarkActive;
  const showWatermarkTimelineDock =
    isWatermarkPanelActive &&
    watermarkType === "text" &&
    videoDuration > 0;
  const showVideoOverviewPreview =
    activeEditorPanel === "video" &&
    activeVideoTool === "overview" &&
    videoToolsEnabled &&
    videoDuration > 0;
  const showVideoTrimDock =
    activeEditorPanel === "video" &&
    activeVideoTool === "trim" &&
    videoToolsEnabled &&
    videoDuration > 0;
  const activeVideoBlurRegion = getActiveVideoBlurRegion();
  const showVideoBlurTimelineDock =
    activeEditorPanel === "video" &&
    activeVideoTool === "blur" &&
    videoToolsEnabled &&
    activeVideoBlurRegion &&
    videoDuration > 0;
  const showVideoTimelineDock =
    showVideoTrimDock ||
    showCaptionTimelineDock ||
    showWatermarkTimelineDock ||
    showVideoBlurTimelineDock;
  const videoPreviewDisplayFrame =
    mediaKind === "video" && videoSize
      ? getVideoDisplayFrame(
          canvasSize.width,
          canvasSize.height,
          videoSize.width,
          videoSize.height,
        )
      : {
          height: canvasSize.height,
          width: canvasSize.width,
          x: 0,
          y: 0,
        };
  const showWatermarkAdjustAside =
    isWatermarkPanelActive &&
    hasMedia &&
    (activeWatermarkTool === "text" || activeWatermarkTool === "logo");
  const showCaptionHeadlineAside =
    activeEditorPanel === "video" &&
    activeVideoTool === "caption" &&
    videoToolsEnabled;
  const showPreviewSplitAside =
    showWatermarkAdjustAside || showCaptionHeadlineAside;
  const watermarkAdjustLayerType =
    activeWatermarkTool === "logo" ? "logo" : "text";

  function updateVideoCaptionLayer(
    layerId: string,
    patch: Partial<VideoCaptionLayer>,
  ) {
    setVideoCaptionLayers((current) =>
      current.map((layer) =>
        layer.id === layerId ? { ...layer, ...patch } : layer,
      ),
    );
  }

  function updateActiveVideoCaptionLayer(patch: Partial<VideoCaptionLayer>) {
    updateVideoCaptionLayer(activeVideoCaptionLayerId, patch);
  }

  function addVideoCaptionLayer() {
    const positions: CaptionVerticalPosition[] = ["bottom", "center", "top"];
    const nextPosition = positions[videoCaptionLayers.length % 3];
    const nextLayer = createDefaultVideoCaptionLayer({
      customPosition: {
        xPercent: 0.5,
        yPercent:
          nextPosition === "top"
            ? 0.15
            : nextPosition === "center"
              ? 0.5
              : 0.85,
      },
      enabled: true,
      presetId: "karaoke",
      text: `Caption ${videoCaptionLayers.length + 1}`,
      verticalPosition: nextPosition,
    });

    setVideoCaptionLayers((current) => [...current, nextLayer]);
    setActiveVideoCaptionLayerId(nextLayer.id);
  }

  function removeVideoCaptionLayer(layerId: string) {
    if (videoCaptionLayers.length <= 1) {
      return;
    }

    const remaining = videoCaptionLayers.filter((layer) => layer.id !== layerId);
    setVideoCaptionLayers(remaining);

    if (activeVideoCaptionLayerId === layerId) {
      setActiveVideoCaptionLayerId(remaining[0]!.id);
    }
  }

  const highlightedEditorPanel =
    showEditorPanel && activeEditorPanel
      ? activeEditorPanel
      : formatUploadPrompt === "photos"
        ? "photos"
        : formatUploadPrompt === "pdfDocs"
          ? "pdfDocs"
          : formatUploadPrompt === "video"
            ? "video"
            : null;
  const showMobileBottomDock = hasMedia && showEditorPanel;
  const showMobileFormatToolRail = showEditorPanel && hasMedia;
  const showMobilePreviewTopRail = showEditorPanel && (!hasMedia || showMobileFormatToolRail);
  const mobileEditorChromeInset = showMobileBottomDock
    ? "max-md:pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
    : "";
  const videoTimelineDock = showVideoTimelineDock ? (
    <>
      {showVideoTrimDock ? (
        <VideoVisibilityTimeline
          currentTimeSeconds={videoPreviewTime}
          durationSeconds={videoDuration}
          isPlaying={isVideoPlaying}
          layout="dock"
          onPauseVideo={() => {
            videoElementRef.current?.pause();
          }}
          onResetRange={resetVideoTrim}
          onSeek={(seconds) => seekVideoPreview(seconds, true)}
          onTogglePlay={() => {
            const video = videoElementRef.current;

            if (!video) {
              return;
            }

            if (video.paused) {
              if (video.currentTime >= resolvedVideoTrim.endSeconds - 0.05) {
                video.currentTime = resolvedVideoTrim.startSeconds;
              }

              void video.play();
            } else {
              video.pause();
            }
          }}
          onVisibleFromChange={(value) => {
            setVideoCropSavedNotice(false);
            setVideoTrimStartSeconds(value ?? 0);
          }}
          onVisibleUntilChange={(value) => {
            setVideoCropSavedNotice(false);
            setVideoTrimEndSeconds(value ?? videoDuration);
          }}
          variant="trim"
          videoUrl={videoUrl}
          visibleFromSeconds={resolvedVideoTrim.startSeconds}
          visibleUntilSeconds={resolvedVideoTrim.endSeconds}
        />
      ) : null}
      {showCaptionTimelineDock ||
      showWatermarkTimelineDock ||
      showVideoBlurTimelineDock ? (
        <VideoVisibilityTimeline
          currentTimeSeconds={videoPreviewTime}
          durationSeconds={videoDuration}
          isPlaying={isVideoPlaying}
          layerLabel={
            showCaptionTimelineDock
              ? activeVideoCaptionLayer?.text.trim() || "Caption"
              : showVideoBlurTimelineDock
                ? activeVideoBlurRegion?.label || "Blur"
                : activeTextLayer.text.trim() || "Text watermark"
          }
          layout="dock"
          onPauseVideo={() => {
            videoElementRef.current?.pause();
          }}
          onSeek={seekVideoPreview}
          onTogglePlay={() => {
            const video = videoElementRef.current;

            if (!video) {
              return;
            }

            if (video.paused) {
              void video.play();
            } else {
              video.pause();
            }
          }}
          onVisibleFromChange={(value) => {
            if (showCaptionTimelineDock) {
              updateActiveVideoCaptionLayer({
                visibleFromSeconds: value,
              });
              return;
            }

            if (showVideoBlurTimelineDock && activeVideoBlurRegion) {
              updateActiveVideoBlurRegion((region) =>
                updateVideoBlurRegionTiming(
                  region,
                  { visibleFromSeconds: value },
                  videoDuration,
                ),
              );
              return;
            }

            updateTextLayer(activeTextLayerId, {
              visibleFromSeconds: value,
            });
          }}
          onVisibleUntilChange={(value) => {
            if (showCaptionTimelineDock) {
              updateActiveVideoCaptionLayer({
                visibleUntilSeconds: value,
              });
              return;
            }

            if (showVideoBlurTimelineDock && activeVideoBlurRegion) {
              updateActiveVideoBlurRegion((region) =>
                updateVideoBlurRegionTiming(
                  region,
                  { visibleUntilSeconds: value },
                  videoDuration,
                ),
              );
              return;
            }

            updateTextLayer(activeTextLayerId, {
              visibleUntilSeconds: value,
            });
          }}
          videoUrl={videoUrl}
          visibleFromSeconds={
            showCaptionTimelineDock
              ? activeVideoCaptionLayer?.visibleFromSeconds
              : showVideoBlurTimelineDock
                ? activeVideoBlurRegion?.visibleFromSeconds
                : activeTextLayer.visibleFromSeconds
          }
          visibleUntilSeconds={
            showCaptionTimelineDock
              ? activeVideoCaptionLayer?.visibleUntilSeconds
              : showVideoBlurTimelineDock
                ? activeVideoBlurRegion?.visibleUntilSeconds
                : activeTextLayer.visibleUntilSeconds
          }
        />
      ) : null}
    </>
  ) : null;

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] md:h-[100svh] md:pt-0 md:pb-0">
      {authChecked && isAuthenticated ? (
        <div className="hidden shrink-0 md:block">
          <SiteNavClient
            editorAccount={{
              creditBalance,
              userDisplayName,
            }}
            isLoggedIn
            showInEditor
          />
        </div>
      ) : null}
      <main className="editor-theme relative flex min-h-0 flex-1 w-full flex-col overflow-hidden">
      <WatermarkFontLoader />
      <motion.div
        className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[auto_minmax(0,1fr)]"
        initial={false}
      >
        <div
          className={`editor-mobile-controls-sheet order-2 flex min-h-0 min-w-0 flex-col overflow-hidden border-t border-ed-border bg-ed-panel shadow-[0_-8px_32px_rgba(43,43,43,0.08)] md:order-none md:relative md:bottom-auto md:h-full md:max-h-full md:flex-row md:border-t-0 md:border-r md:shadow-none ${
            mobileControlsExpanded
              ? "editor-mobile-controls-sheet-expanded"
              : "editor-mobile-controls-sheet-collapsed"
          } ${
            showMobileBottomDock ? "" : "max-md:hidden"
          }`}
        >
          <input
            accept={acceptedMediaInputTypes}
            className="hidden"
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);

              if (files.length) {
                if (
                  filePickerIntentRef.current === "append" ||
                  (isBatchImageMode && files.every(isImageFile))
                ) {
                  void appendImageBatchFiles(files);
                } else {
                  loadMediaFiles(files);
                }
              }

              filePickerIntentRef.current = "replace";
              event.target.value = "";
            }}
            ref={fileInputRef}
            type="file"
          />
          <input
            accept={acceptedImageInputTypes}
            className="hidden"
            multiple
            onChange={(event) => {
              handleFormatUploadFiles(
                Array.from(event.target.files ?? []),
                "photos",
              );
              event.target.value = "";
            }}
            ref={formatPhotosInputRef}
            type="file"
          />
          <input
            accept={acceptedPdfInputTypes}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.item(0);

              if (file) {
                handleFormatUploadFiles([file], "pdfDocs");
              }

              event.target.value = "";
            }}
            ref={formatPdfInputRef}
            type="file"
          />
          <input
            accept={acceptedVideoInputTypes}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.item(0);

              if (file) {
                handleFormatUploadFiles([file], "video");
              }

              event.target.value = "";
            }}
            ref={formatVideoInputRef}
            type="file"
          />
          <input
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);

              if (files.length) {
                void appendImageBatchFiles(files);
              }

              event.target.value = "";
            }}
            ref={appendImagesInputRef}
            type="file"
          />
          <input
            accept="video/mp4,video/quicktime,video/webm,.mov,.mp4,.webm"
            className="hidden"
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);

              if (files.length) {
                void appendVideoBatchFiles(files);
              }

              event.target.value = "";
            }}
            ref={appendVideosInputRef}
            type="file"
          />
          <input
            accept={acceptedPdfInputTypes}
            className="hidden"
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);

              if (files.length) {
                void appendPdfMergeBatchFiles(files);
              }

              event.target.value = "";
            }}
            ref={appendPdfsInputRef}
            type="file"
          />
          <input
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.item(0);

              if (file) {
                loadLogoFile(file);
              }
            }}
            ref={logoInputRef}
            type="file"
          />

          <div className="hidden md:contents">
            <ToolIconRail
              activePanel={highlightedEditorPanel}
              mediaKind={mediaKind}
              onSelectPanel={handleEditorPanelSelect}
            />
          </div>

          {showEditorPanel ? (
            <>
              {mobileControlsExpanded && videoTimelineDock ? (
                <div className="shrink-0 overflow-hidden border-b border-ed-border md:hidden">
                  {videoTimelineDock}
                </div>
              ) : null}
            <EditorToolPanel
              icon={editorPanelIcon}
              instant
              mobileControlsCollapsed={!mobileControlsExpanded}
              onClose={handleEditorPanelClose}
              onToggleMobileControls={toggleMobileControls}
              title={editorPanelTitle}
              toolRail={
                activeEditorPanel === "photos" ? (
                  <div className="flex shrink-0 flex-col md:flex-row">
                    <div className="hidden md:contents">
                      <PhotosToolRail
                        activeTool={activePhotoTool}
                        imageToolsEnabled={imageToolsEnabled}
                        onSelectTool={handlePhotoToolSelect}
                      />
                    </div>
                    {activePhotoTool === "watermark" ? (
                      <WatermarkToolRail
                        activeTool={activeWatermarkTool}
                        hasMedia={hasMedia}
                        onSelectTool={handleWatermarkToolSelect}
                      />
                    ) : null}
                  </div>
                ) : activeEditorPanel === "pdfDocs" ? (
                  <div className="flex shrink-0 flex-col md:flex-row">
                    <div className="hidden md:contents">
                      <PdfDocsToolRail
                        activeTool={activePdfTool}
                        onSelectTool={handlePdfDocToolSelect}
                      />
                    </div>
                    {activePdfTool === "watermark" ? (
                      <WatermarkToolRail
                        activeTool={activeWatermarkTool}
                        hasMedia={hasMedia}
                        onSelectTool={handleWatermarkToolSelect}
                      />
                    ) : null}
                  </div>
                ) : activeEditorPanel === "video" ? (
                  <div className="flex shrink-0 flex-col md:flex-row">
                    <div className="hidden md:contents">
                      <VideoToolRail
                        activeTool={activeVideoTool}
                        hasVideo={videoToolsEnabled}
                        hideOverviewOnMobile
                        onReshortenVideo={beginReshortenSession}
                        onSelectTool={handleVideoToolSelect}
                        showReshortenOnTrim={showReshortenVideoAction}
                      />
                    </div>
                    {activeVideoTool === "watermark" ? (
                      <WatermarkToolRail
                        activeTool={activeWatermarkTool}
                        hasMedia={hasMedia}
                        onSelectTool={handleWatermarkToolSelect}
                      />
                    ) : null}
                  </div>
                ) : undefined
              }
            >
          {isWatermarkPanelActive ? (
            <div className="space-y-2">
              {!hasMedia ? (
                <EditorCard>
                  <p className="text-sm leading-6 text-ed-fg-muted">
                    Upload an image, PDF, or video to start watermarking.
                  </p>
                  <button
                    className="editor-secondary-button mt-3 w-full rounded-xl border-dashed px-4 py-3 text-sm font-semibold text-ed-fg hover:border-signal/50"
                    onClick={openFilePicker}
                    type="button"
                  >
                    Choose file
                  </button>
                </EditorCard>
              ) : null}

              {hasMedia &&
              !isBatchImageMode &&
              mediaKind === "pdf" &&
              (isPdfLoading || pdfPages.length === 0) ? (
                <div className="flex justify-end rounded-lg border border-ed-border bg-ed-bg-card px-2 py-1.5">
                  <EditorMediaActionButtons
                    isPdfLoading={isPdfLoading}
                    mediaKind={mediaKind}
                    onAddMoreImages={openAddMoreImagesPicker}
                    onRemove={removeLoadedMedia}
                    onReplace={openReplaceMediaPicker}
                  />
                </div>
              ) : null}

              {hasMedia &&
              !isBatchImageMode &&
              !isBatchVideoMode &&
              mediaKind !== "pdf" &&
              !isPdfLoading ? (
                <div className="flex justify-end rounded-lg border border-ed-border bg-ed-bg-card px-2 py-1.5">
                  <EditorMediaActionButtons
                    isPdfLoading={false}
                    mediaKind={mediaKind}
                    onAddMoreImages={openAddMoreImagesPicker}
                    onAddMoreVideos={openAddMoreVideosPicker}
                    onRemove={removeLoadedMedia}
                    onReplace={openReplaceMediaPicker}
                  />
                </div>
              ) : null}

              {isBatchImageMode ? (
                <ImageBatchStrip
                  activeId={activeBatchImageId}
                  entries={imageBatch}
                  headerActions={
                    hasMedia ? (
                      <EditorMediaActionButtons
                        isPdfLoading={false}
                        mediaKind={mediaKind}
                        onAddMoreImages={openAddMoreImagesPicker}
                        onAddMoreVideos={openAddMoreVideosPicker}
                        onRemove={removeLoadedMedia}
                        onReplace={openReplaceMediaPicker}
                      />
                    ) : null
                  }
                  onRemove={removeBatchImage}
                  onSelect={selectBatchImage}
                />
              ) : null}

              {isBatchVideoMode ? (
                <VideoBatchStrip
                  activeId={activeBatchVideoId}
                  entries={videoBatch}
                  headerActions={
                    hasMedia ? (
                      <EditorMediaActionButtons
                        isPdfLoading={false}
                        mediaKind={mediaKind}
                        onAddMoreImages={openAddMoreImagesPicker}
                        onAddMoreVideos={openAddMoreVideosPicker}
                        onRemove={removeLoadedMedia}
                        onReplace={openReplaceMediaPicker}
                      />
                    ) : null
                  }
                  onRemove={removeBatchVideo}
                  onSelect={selectBatchVideo}
                />
              ) : null}

              {mediaKind === "pdf" && pdfPages.length > 0 ? (
                <PdfPageStrip
                  activeId={activePdfPageId}
                  headerActions={
                    hasMedia && !isPdfLoading ? (
                      <EditorMediaActionButtons
                        isPdfLoading={isPdfLoading}
                        mediaKind={mediaKind}
                        onAddMoreImages={openAddMoreImagesPicker}
                        onRemove={removeLoadedMedia}
                        onReplace={openReplaceMediaPicker}
                      />
                    ) : null
                  }
                  onSelect={(id) => {
                    void selectPdfPage(id);
                  }}
                  pages={pdfPages}
                />
              ) : null}

              {showVideoServerProcessingPanel && videoServerCostEstimate ? (
                <VideoServerProcessingPanel estimate={videoServerCostEstimate} />
              ) : null}

              {isExporting && isExportPreparing ? (
                <LoadingIndicator label="Preparing export..." size="sm" />
              ) : null}

              {isExporting &&
              !isExportPreparing &&
              isBatchImageMode &&
              batchExportProgress ? (
                <div className="rounded-lg border border-ed-border bg-ed-bg-card px-2.5 py-2">
                  <p className="text-xs font-medium text-ed-fg-muted">
                    Processing {batchExportProgress.current} of{" "}
                    {batchExportProgress.total}...
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ed-fg/10">
                    <div
                      className="h-full rounded-full bg-ed-accent transition-[width] duration-200"
                      style={{
                        width: `${
                          (batchExportProgress.current /
                            batchExportProgress.total) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}

              {isExporting &&
              !isExportPreparing &&
              mediaKind === "pdf" &&
              pdfExportProgress ? (
                <div className="rounded-lg border border-ed-border bg-ed-bg-card px-2.5 py-2">
                  <p className="text-xs font-medium text-ed-fg-muted">
                    Processing page {pdfExportProgress.current} of{" "}
                    {pdfExportProgress.total}...
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ed-fg/10">
                    <div
                      className="h-full rounded-full bg-ed-accent transition-[width] duration-200"
                      style={{
                        width: `${
                          (pdfExportProgress.current /
                            pdfExportProgress.total) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}

              {isExporting && mediaKind === "video" && exportProgress !== null ? (
                <div className="rounded-lg border border-ed-border bg-ed-bg-card px-2.5 py-2">
                  {isServerVideoExport ? (
                    <p className="text-xs font-medium text-ed-fg-muted">
                      {videoExportStageLabel}
                    </p>
                  ) : null}
                  <div
                    className={`flex items-center justify-between gap-2 text-xs ${
                      isServerVideoExport ? "mt-1.5" : ""
                    }`}
                  >
                    <span className="font-medium text-ed-fg-muted">
                      {isServerVideoExport ? "Estimated progress" : "Export progress"}
                    </span>
                    <span className="font-semibold text-ed-fg">{exportProgress}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ed-fg/10">
                    <div
                      className={`h-full rounded-full bg-ed-accent transition-[width] duration-200 ${
                        isServerVideoExport && exportServerStage === "processing"
                          ? "animate-pulse"
                          : ""
                      }`}
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                  <button
                    className="editor-secondary-button mt-2 w-full rounded-full border-signal/30 px-3 py-2 text-xs font-semibold text-signal hover:bg-signal/5"
                    onClick={handleCancelExport}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              ) : null}

              {creditBalance !== null && !(authChecked && isAuthenticated) ? (
                <div className="rounded-lg border border-ed-border bg-ed-fg/5 px-2.5 py-2 text-xs text-ed-fg-muted">
                  Credits: {formatCreditBalance(creditBalance)}
                </div>
              ) : null}

              {exportNotice ? (
                <div className="rounded-lg border border-ed-border bg-ed-fg/5 px-2.5 py-2 text-xs text-ed-fg">
                  <div className="flex items-center justify-between gap-2">
                    <p>{exportNotice}</p>
                    <button
                      className="shrink-0 font-medium text-ed-fg-muted transition hover:text-ed-fg"
                      onClick={() => setExportNotice("")}
                      type="button"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : null}

              {exportError ? (
                <div className="rounded-lg border border-ed-accent/30 bg-ed-accent/10 px-2.5 py-2 text-xs text-ed-fg">
                  <p>{exportError}</p>
                  <div className="mt-2 flex items-center gap-3">
                    {mediaKind === "video" && canExportVideo ? (
                      <button
                        className="font-medium text-signal transition hover:text-ed-fg"
                        onClick={() => {
                          logRealVideoExport(
                            "STEP 1/15: Retry export button clicked (video)",
                          );
                          setExportError("");
                          void handleVideoExport();
                        }}
                        type="button"
                      >
                        Retry export
                      </button>
                    ) : null}
                    {mediaKind === "pdf" && pdfPageCount > 0 ? (
                      <button
                        className="font-medium text-signal transition hover:text-ed-fg"
                        onClick={() => {
                          setExportError("");
                          void handlePdfExport();
                        }}
                        type="button"
                      >
                        Retry export
                      </button>
                    ) : null}
                    <button
                      className="font-medium text-ed-fg-muted transition hover:text-ed-fg"
                      onClick={() => setExportError("")}
                      type="button"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : null}

              {activeWatermarkTool === "text" ? (
                hasMedia ? (
                <>
                <div className="hidden space-y-2 md:block">
                {renderQuickTemplates(
                  "text-template-selection",
                  watermarkTemplates,
                  activeTextTemplate,
                  applyTextTemplate,
                )}
                <WatermarkLayersPanel
                  activeLayerId={activeTextLayerId}
                      fontFamilyGroups={watermarkFontFamilyGroups}
                      layer={activeTextLayer}
                      layerCount={textLayers.length}
                      layerIds={textLayers.map((layer) => layer.id)}
                      mode={watermarkMode}
                      onAddLayer={addTextLayer}
                      onFontFamilyChange={(value) => {
                        if (shouldIgnoreManualSettingsChange()) {
                          return;
                        }

                        updateTextLayer(activeTextLayerId, { fontFamily: value });
                        handleFontFamilyChange(value);
                      }}
                      onFontSizeScaleChange={(value) => {
                        if (shouldIgnoreManualSettingsChange()) {
                          return;
                        }

                        updateTextLayer(activeTextLayerId, { fontSizeScale: value });
                        handleFontSizeScaleChange(value);
                      }}
                      onFontWeightChange={(value) => {
                        if (shouldIgnoreManualSettingsChange()) {
                          return;
                        }

                        updateTextLayer(activeTextLayerId, { fontWeight: value });
                        handleFontWeightChange(value);
                      }}
                      onLayerSelect={(id) => {
                        setActiveTextLayerId(id);
                        const layer = textLayers.find((entry) => entry.id === id);

                        if (layer) {
                          syncLegacyFromTextLayer(layer);
                        }

                        setIsWatermarkHovering(false);
                      }}
                      onRemoveLayer={removeTextLayer}
                      onTextChange={handleTextWatermarkChange}
                      onTextColorChange={(value) => {
                        if (shouldIgnoreManualSettingsChange()) {
                          return;
                        }

                        updateTextLayer(activeTextLayerId, { textColor: value });
                        handleTextColorChange(value);
                      }}
                      onTileAngleChange={(value) => {
                        if (shouldIgnoreManualSettingsChange()) {
                          return;
                        }

                        clearActiveTextTemplate();
                        setTileAngle(value);
                      }}
                      onTileDensityChange={(value) => {
                        if (shouldIgnoreManualSettingsChange()) {
                          return;
                        }

                        clearActiveTextTemplate();
                        setTileDensity(value);
                      }}
                      onTileGapChange={(value) => {
                        if (shouldIgnoreManualSettingsChange()) {
                          return;
                        }

                        clearActiveTextTemplate();
                        setTileGap(value);
                      }}
                      onWatermarkOpacityChange={(value) => {
                        updateTextLayer(activeTextLayerId, { opacity: value });
                        handleWatermarkOpacityChange(value);
                      }}
                      onVisibleFromSecondsChange={(value) => {
                        updateTextLayer(activeTextLayerId, {
                          visibleFromSeconds: value,
                        });
                      }}
                      onVisibleUntilSecondsChange={(value) => {
                        updateTextLayer(activeTextLayerId, {
                          visibleUntilSeconds: value,
                        });
                      }}
                      showVideoVisibilityControls={mediaKind === "video"}
                      tileAngle={tileAngle}
                      tileDensity={tileDensity}
                      tileGap={tileGap}
                      videoDurationSeconds={videoDuration}
                  type="text"
                />
                </div>
                <div className="md:hidden">
                  <WatermarkMobileBar
                    activeLayerId={activeTextLayerId}
                    fontFamilyGroups={watermarkFontFamilyGroups}
                    fontSizeScale={activeTextLayer.fontSizeScale}
                    layer={activeTextLayer}
                    layerCount={textLayers.length}
                    layerIds={textLayers.map((layer) => layer.id)}
                    mode={watermarkMode}
                    onAddLayer={addTextLayer}
                    onFontFamilyChange={(value) => {
                      if (shouldIgnoreManualSettingsChange()) {
                        return;
                      }

                      updateTextLayer(activeTextLayerId, { fontFamily: value });
                      handleFontFamilyChange(value);
                    }}
                    onFontSizeScaleChange={(value) => {
                      if (shouldIgnoreManualSettingsChange()) {
                        return;
                      }

                      updateTextLayer(activeTextLayerId, { fontSizeScale: value });
                      handleFontSizeScaleChange(value);
                    }}
                    onFontWeightChange={(value) => {
                      if (shouldIgnoreManualSettingsChange()) {
                        return;
                      }

                      updateTextLayer(activeTextLayerId, { fontWeight: value });
                      handleFontWeightChange(value);
                    }}
                    onLayerSelect={(id) => {
                      setActiveTextLayerId(id);
                      const layer = textLayers.find((entry) => entry.id === id);

                      if (layer) {
                        syncLegacyFromTextLayer(layer);
                      }

                      setIsWatermarkHovering(false);
                    }}
                    onModeChange={(value) => {
                      applyTextWatermarkModeDefaults(value);
                    }}
                    onRemoveLayer={removeTextLayer}
                    onTextChange={handleTextWatermarkChange}
                    onTextColorChange={(value) => {
                      if (shouldIgnoreManualSettingsChange()) {
                        return;
                      }

                      updateTextLayer(activeTextLayerId, { textColor: value });
                      handleTextColorChange(value);
                    }}
                    onTileAngleChange={(value) => {
                      if (shouldIgnoreManualSettingsChange()) {
                        return;
                      }

                      clearActiveTextTemplate();
                      setTileAngle(value);
                    }}
                    onTileDensityChange={(value) => {
                      if (shouldIgnoreManualSettingsChange()) {
                        return;
                      }

                      clearActiveTextTemplate();
                      setTileDensity(value);
                    }}
                    onTileGapChange={(value) => {
                      if (shouldIgnoreManualSettingsChange()) {
                        return;
                      }

                      clearActiveTextTemplate();
                      setTileGap(value);
                    }}
                    onWatermarkOpacityChange={(value) => {
                      updateTextLayer(activeTextLayerId, { opacity: value });
                      handleWatermarkOpacityChange(value);
                    }}
                    tileAngle={tileAngle}
                    tileDensity={tileDensity}
                    tileGap={tileGap}
                    tileQuickTemplates={renderQuickTemplates(
                      "text-template-selection-mobile",
                      watermarkTemplates,
                      activeTextTemplate,
                      applyTextTemplate,
                      true,
                    )}
                    type="text"
                    watermarkOpacity={activeTextLayer.opacity}
                  />
                </div>
                </>
                ) : null
              ) : null}

              {activeWatermarkTool === "logo" ? (
                hasMedia ? (
                <>
                <div className="hidden space-y-2 md:block">
                {renderQuickTemplates(
                  "logo-template-selection",
                  logoWatermarkTemplates,
                  activeLogoTemplate,
                  applyLogoTemplate,
                )}
                <WatermarkLayersPanel
                  activeLayerId={activeLogoLayerId}
                      fontFamilyGroups={watermarkFontFamilyGroups}
                      layer={activeLogoLayer}
                      layerCount={logoLayers.length}
                      layerIds={logoLayers.map((layer) => layer.id)}
                      logoBackgroundMessage={logoBackgroundMessage}
                      logoError={logoError}
                      mode={watermarkMode}
                      onAddLayer={addLogoLayer}
                      onFontFamilyChange={() => undefined}
                      onFontSizeScaleChange={(value) => {
                        if (shouldIgnoreManualSettingsChange()) {
                          return;
                        }

                        updateLogoLayer(activeLogoLayerId, { fontSizeScale: value });
                        handleFontSizeScaleChange(value);
                      }}
                      onLayerSelect={(id) => {
                        setActiveLogoLayerId(id);
                        const layer = logoLayers.find((entry) => entry.id === id);

                        if (layer) {
                          syncLegacyFromLogoLayer(layer);
                        }

                        setIsWatermarkHovering(false);
                      }}
                      onLogoBackgroundToggle={handleLogoBackgroundToggle}
                      onLogoPick={openLogoPicker}
                      onLogoRemove={removeLogo}
                      onRemoveLayer={removeLogoLayer}
                      onTextChange={() => undefined}
                      onTileAngleChange={(value) => {
                        if (shouldIgnoreManualSettingsChange()) {
                          return;
                        }

                        clearActiveLogoTemplate();
                        setTileAngle(value);
                      }}
                      onTileDensityChange={(value) => {
                        if (shouldIgnoreManualSettingsChange()) {
                          return;
                        }

                        clearActiveLogoTemplate();
                        setTileDensity(value);
                      }}
                      onTileGapChange={(value) => {
                        if (shouldIgnoreManualSettingsChange()) {
                          return;
                        }

                        clearActiveLogoTemplate();
                        setTileGap(value);
                      }}
                      onWatermarkOpacityChange={(value) => {
                        updateLogoLayer(activeLogoLayerId, { opacity: value });
                        handleWatermarkOpacityChange(value);
                      }}
                      tileAngle={tileAngle}
                      tileDensity={tileDensity}
                      tileGap={tileGap}
                  type="logo"
                />
                </div>
                <div className="md:hidden">
                  <WatermarkMobileBar
                    activeLayerId={activeLogoLayerId}
                    fontSizeScale={activeLogoLayer.fontSizeScale}
                    layer={activeLogoLayer}
                    layerCount={logoLayers.length}
                    layerIds={logoLayers.map((layer) => layer.id)}
                    logoError={logoError}
                    mode={watermarkMode}
                    onAddLayer={addLogoLayer}
                    onFontSizeScaleChange={(value) => {
                      if (shouldIgnoreManualSettingsChange()) {
                        return;
                      }

                      updateLogoLayer(activeLogoLayerId, { fontSizeScale: value });
                      handleFontSizeScaleChange(value);
                    }}
                    onLayerSelect={(id) => {
                      setActiveLogoLayerId(id);
                      const layer = logoLayers.find((entry) => entry.id === id);

                      if (layer) {
                        syncLegacyFromLogoLayer(layer);
                      }

                      setIsWatermarkHovering(false);
                    }}
                    onLogoPick={openLogoPicker}
                    onModeChange={(value) => {
                      clearActiveTemplates();
                      setWatermarkMode(value);
                      setIsWatermarkHovering(false);
                    }}
                    onRemoveLayer={removeLogoLayer}
                    onTileAngleChange={(value) => {
                      if (shouldIgnoreManualSettingsChange()) {
                        return;
                      }

                      clearActiveLogoTemplate();
                      setTileAngle(value);
                    }}
                    onTileDensityChange={(value) => {
                      if (shouldIgnoreManualSettingsChange()) {
                        return;
                      }

                      clearActiveLogoTemplate();
                      setTileDensity(value);
                    }}
                    onTileGapChange={(value) => {
                      if (shouldIgnoreManualSettingsChange()) {
                        return;
                      }

                      clearActiveLogoTemplate();
                      setTileGap(value);
                    }}
                    onWatermarkOpacityChange={(value) => {
                      updateLogoLayer(activeLogoLayerId, { opacity: value });
                      handleWatermarkOpacityChange(value);
                    }}
                    tileAngle={tileAngle}
                    tileDensity={tileDensity}
                    tileGap={tileGap}
                    tileQuickTemplates={renderQuickTemplates(
                      "logo-template-selection-mobile",
                      logoWatermarkTemplates,
                      activeLogoTemplate,
                      applyLogoTemplate,
                      true,
                    )}
                    type="logo"
                    watermarkOpacity={activeLogoLayer.opacity}
                  />
                </div>
                </>
                ) : null
              ) : null}

            </div>
          ) : null}

          {activeEditorPanel === "pdfDocs" && activePdfTool === "signFill" ? (
            <div className="space-y-2">
              {mediaKind !== "pdf" || pdfPageCount === 0 ? (
                <EditorCard>
                  <p className="text-sm leading-6 text-ed-fg-muted">
                    Sign & Fill is available for PDF documents. Upload a PDF to
                    get started.
                  </p>
                  <button
                    className="editor-secondary-button mt-3 w-full rounded-xl border-dashed px-4 py-3 text-sm font-semibold text-ed-fg hover:border-signal/50"
                    onClick={openFilePicker}
                    type="button"
                  >
                    Choose PDF
                  </button>
                </EditorCard>
              ) : (
                <>
                  {mediaKind === "pdf" && pdfPages.length > 0 ? (
                    <PdfPageStrip
                      activeId={activePdfPageId}
                      onSelect={(id) => {
                        void selectPdfPage(id);
                      }}
                      pages={pdfPages}
                    />
                  ) : null}

                  {pdfDocumentTool === "fill" ? (
                    <>
                      <button
                        className="editor-secondary-button inline-flex w-full items-center justify-center px-3 py-2 text-xs font-semibold text-ed-fg hover:border-signal/50"
                        onClick={() => setPdfDocumentTool("signature")}
                        type="button"
                      >
                        Back to Sign & Fill
                      </button>
                      <FillDocumentControls
                        activeFieldId={activeFillFieldId}
                        fields={getActivePdfPageFillFields()}
                        onAddField={() => {
                          const newField = createDefaultFillField();
                          syncActivePdfPageFillFields((fields) => [
                            ...fields,
                            newField,
                          ]);
                          setActiveFillFieldId(newField.id);
                        }}
                        onFieldSelect={setActiveFillFieldId}
                        onRemoveField={(fieldId) => {
                          syncActivePdfPageFillFields((fields) =>
                            fields.filter((field) => field.id !== fieldId),
                          );
                          setActiveFillFieldId((currentId) =>
                            currentId === fieldId ? null : currentId,
                          );
                        }}
                        onUpdateField={(fieldId, patch) => {
                          syncActivePdfPageFillFields((fields) =>
                            fields.map((field) =>
                              field.id === fieldId ? { ...field, ...patch } : field,
                            ),
                          );
                        }}
                        pdfPageLabel={
                          activePdfPageId && pdfPageCount > 0
                            ? `Page ${
                                pdfPages.find((page) => page.id === activePdfPageId)
                                  ?.pageNumber ?? 1
                              } of ${pdfPageCount}`
                            : null
                        }
                      />
                    </>
                  ) : (
                    <>
                      <SignatureControls
                        activeSignatureId={activeSignatureId}
                        hasDocument={hasMedia}
                        hasSignatureOnPage={Boolean(
                          activePdfPageId &&
                            (pdfPageSignatures[activePdfPageId]?.length ?? 0) > 0,
                        )}
                        onActiveSignatureChange={handleActiveSignatureChange}
                        onPlaceSignature={placeSignatureOnDocument}
                        onRemoveFromPage={removeSignatureFromActivePdfPage}
                        onSignaturesChange={handleSavedSignaturesChange}
                        pdfPageLabel={
                          activePdfPageId && pdfPageCount > 0
                            ? `Page ${
                                pdfPages.find((page) => page.id === activePdfPageId)
                                  ?.pageNumber ?? 1
                              } of ${pdfPageCount}`
                            : null
                        }
                        savedSignatures={savedSignatures}
                      />
                      <button
                        className="editor-secondary-button inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-ed-fg hover:border-signal/50"
                        onClick={() => {
                          void handleAddTextClick();
                        }}
                        type="button"
                      >
                        Add Text
                      </button>
                    </>
                  )}

                  {pdfDocumentTool !== "fill" ? (
                    <p className="text-[9px] leading-3 text-ed-fg-muted/80">
                      Each page can hold multiple signatures, initials, and
                      fill text fields. Select a placement to resize it, use Done
                      when finished, or × to remove one instance.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {activeEditorPanel === "pdfDocs" && activePdfTool === "merge" ? (
            <div className="space-y-2">
              {mediaKind === "pdf" && pdfPages.length > 0 ? (
                <PdfPageStrip
                  activeId={activePdfPageId}
                  onSelect={(id) => {
                    void selectPdfPage(id);
                  }}
                  pages={pdfPages}
                />
              ) : mediaKind === "pdf" && isPdfLoading ? (
                <EditorCard>
                  <p className="text-sm text-ed-fg-muted">Loading PDF pages…</p>
                </EditorCard>
              ) : null}

              <PdfMergePanel
                entries={pdfMergeBatch}
                hasLoadedPdf={mediaKind === "pdf" && pdfPageCount > 0}
                isProcessing={isPdfMergeProcessing}
                onAddPdfs={openAddMorePdfsPicker}
                onMergePdfs={() => {
                  void mergePdfBatchDocuments();
                }}
                onMoveEntry={movePdfMergeEntry}
                onRemoveEntry={removePdfMergeEntry}
                onUploadPdf={openFilePicker}
              />
            </div>
          ) : null}

          {activeEditorPanel === "pdfDocs" && activePdfTool === "compress" ? (
            <div className="space-y-2">
              {mediaKind === "pdf" && pdfPages.length > 0 ? (
                <PdfPageStrip
                  activeId={activePdfPageId}
                  onSelect={(id) => {
                    void selectPdfPage(id);
                  }}
                  pages={pdfPages}
                />
              ) : mediaKind === "pdf" && isPdfLoading ? (
                <EditorCard>
                  <p className="text-sm text-ed-fg-muted">Loading PDF pages…</p>
                </EditorCard>
              ) : null}

              <PdfCompressPanel
                fileName={fileName}
                fileSize={pdfBytesRef.current?.byteLength ?? 0}
                hasLoadedPdf={mediaKind === "pdf" && pdfPageCount > 0}
                isProcessing={isPdfCompressProcessing}
                lastResult={lastPdfCompressResult}
                onCompress={() => {
                  void compressLoadedPdf();
                }}
                onUploadPdf={openFilePicker}
                pageCount={pdfPageCount}
              />
            </div>
          ) : null}

          {activeEditorPanel === "photos" && activePhotoTool === "crop" ? (
            <div className="space-y-3">
              {mediaKind !== "image" ? (
                <EditorCard>
                  <p className="text-sm text-ed-fg-muted">
                    Crop is not available for video or PDF yet.
                  </p>
                </EditorCard>
              ) : (
                <CropControlsPanel
                  cropHeight={Math.round(cropRect?.height ?? 0)}
                  cropWidth={Math.round(cropRect?.width ?? 0)}
                  disabled={
                    !cropRect || cropRect.width < 4 || cropRect.height < 4
                  }
                  isAspectRatioLocked={isCropAspectRatioLocked}
                  onApply={() => void applyCrop()}
                  onAspectRatioChange={() =>
                    setIsCropAspectRatioLocked((value) => !value)
                  }
                  onHeightChange={handleCropHeightChange}
                  onWidthChange={handleCropWidthChange}
                />
              )}
            </div>
          ) : null}

          {activeEditorPanel === "photos" && activePhotoTool === "resize" ? (
            <div className="space-y-3">
              {mediaKind !== "image" ? (
                <EditorCard>
                  <p className="text-sm text-ed-fg-muted">
                    Resize is not available for video or PDF yet.
                  </p>
                </EditorCard>
              ) : (
                <ResizeControlsPanel
                  disabled={!resizeWidth || !resizeHeight}
                  displayHeight={
                    resizeUnit === "percent" && image
                      ? Math.max(
                          1,
                          Math.round(
                            (resizeHeight / image.naturalHeight) * 100,
                          ),
                        )
                      : resizeHeight
                  }
                  displayWidth={
                    resizeUnit === "percent" && image
                      ? Math.max(
                          1,
                          Math.round((resizeWidth / image.naturalWidth) * 100),
                        )
                      : resizeWidth
                  }
                  isAspectRatioLocked={isAspectRatioLocked}
                  onApply={() => void applyResize()}
                  onAspectRatioChange={() =>
                    setIsAspectRatioLocked((value) => !value)
                  }
                  onHeightChange={handleResizeHeightChange}
                  onScaleModeChange={setResizeScaleMode}
                  onUnitChange={setResizeUnit}
                  onWidthChange={handleResizeWidthChange}
                  scaleMode={resizeScaleMode}
                  unit={resizeUnit}
                  warning={resizeWarning}
                />
              )}
            </div>
          ) : null}

          {activeEditorPanel === "photos" && activePhotoTool === "rotate" ? (
            <div className="space-y-3">
              {mediaKind !== "image" ? (
                <EditorCard>
                  <p className="text-sm text-ed-fg-muted">
                    Rotate is not available for video or PDF yet.
                  </p>
                </EditorCard>
              ) : (
                <>
                  <EditorCard>
                    <p className="text-sm leading-6 text-ed-fg-muted">
                      Rotate the base image. Watermark settings stay unchanged.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        className="editor-secondary-button rounded-xl px-3 py-2 text-xs font-semibold text-ed-fg hover:border-signal/50"
                        onClick={() => rotateBaseImage("left")}
                        type="button"
                      >
                        90° left
                      </button>
                      <button
                        className="editor-secondary-button rounded-xl px-3 py-2 text-xs font-semibold text-ed-fg hover:border-signal/50"
                        onClick={() => rotateBaseImage("right")}
                        type="button"
                      >
                        90° right
                      </button>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between gap-3">
                        <label
                          className="text-xs font-medium text-ed-fg"
                          htmlFor="base-rotation"
                        >
                          Manual angle
                        </label>
                        <input
                          className="editor-field-sm w-16 text-right"
                          id="base-rotation-value"
                          max={360}
                          min={0}
                          onChange={(event) =>
                            setRotationAngle(
                              normalizeDegrees(Number(event.target.value)),
                            )
                          }
                          type="number"
                          value={rotationAngle}
                        />
                      </div>
                      <input
                        className="editor-range mt-2"
                        id="base-rotation"
                        max={360}
                        min={0}
                        onChange={(event) =>
                          setRotationAngle(Number(event.target.value))
                        }
                        step={1}
                        type="range"
                        value={rotationAngle}
                      />
                    </div>
                  </EditorCard>
                  <EditorApplyButton onClick={() => void materializeRotationIfNeeded()}>
                    Apply rotation
                  </EditorApplyButton>
                </>
              )}
            </div>
          ) : null}

          {activeEditorPanel === "photos" && activePhotoTool === "blur" ? (
            <div className="space-y-3">
              {mediaKind !== "image" ? (
                <EditorCard>
                  <p className="text-sm text-ed-fg-muted">
                    Blur Brush is available for photos only.
                  </p>
                </EditorCard>
              ) : (
                <>
                  <EditorCard>
                    <p className="text-sm leading-6 text-ed-fg-muted">
                      Click and drag on the photo to pixelate faces or other
                      sensitive areas with a mosaic redaction effect. Each stroke
                      is saved to your edit history.
                    </p>
                  </EditorCard>
                  <EditorPanelSection title="Brush size">
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: "small", label: "Small" },
                          { id: "medium", label: "Medium" },
                          { id: "large", label: "Large" },
                        ] as const
                      ).map((option) => (
                        <button
                          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition shadow-sm ${
                            blurBrushSize === option.id
                              ? "border-2 border-signal bg-signal/15 text-ed-fg ring-2 ring-signal/30"
                              : "editor-secondary-button border-ed-border bg-ed-bg text-ed-fg-muted hover:text-ed-fg"
                          }`}
                          key={option.id}
                          onClick={() => setBlurBrushSize(option.id)}
                          type="button"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </EditorPanelSection>
                  {blurStrokes.length > 0 ? (
                    <button
                      className="editor-secondary-button w-full rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-ed-fg-muted hover:text-ed-fg"
                      onClick={() => updateBlurStrokes(() => [])}
                      type="button"
                    >
                      Clear all pixelation
                    </button>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {activeEditorPanel === "photos" && activePhotoTool === "filters" ? (
            <div className="space-y-3">
              {mediaKind !== "image" ? (
                <EditorCard>
                  <p className="text-sm text-ed-fg-muted">
                    Filters are not available for video or PDF yet.
                  </p>
                </EditorCard>
              ) : (
                <ImageEffectsPanel
                  activeEffect={activeImageEffect}
                  borderColor={effectBorderColor}
                  borderWidth={effectBorderWidth}
                  exposure={effectExposure}
                  image={image}
                  onBorderColorChange={setEffectBorderColor}
                  onBorderWidthChange={setEffectBorderWidth}
                  onEffectChange={setActiveImageEffect}
                  onExposureChange={setEffectExposure}
                />
              )}
            </div>
          ) : null}

          {activeEditorPanel === "video" ? (
            <div className="space-y-2">
              {!videoToolsEnabled ? (
                <EditorCard>
                  <p className="text-sm leading-6 text-ed-fg-muted">
                    Upload a video to open the video editor. Add captions, trim
                    length on the timeline, and export your clip.
                  </p>
                  <button
                    className="editor-secondary-button mt-3 w-full rounded-xl border-dashed px-4 py-3 text-sm font-semibold text-ed-fg hover:border-signal/50"
                    onClick={openFilePicker}
                    type="button"
                  >
                    Choose video
                  </button>
                </EditorCard>
              ) : activeVideoTool === "overview" ? (
                <VideoOverviewPanel
                  durationSeconds={videoDuration}
                  fileName={fileName}
                  fileSizeBytes={videoFileSize}
                  height={videoSize?.height}
                  width={videoSize?.width}
                />
              ) : activeVideoTool === "caption" ? (
                <>
                  <VideoCaptionPanel
                    activeLayerId={activeVideoCaptionLayerId}
                    captionsEnabled={captionsMasterEnabled}
                    fontFamilyGroups={watermarkFontFamilyGroups}
                    headlineControls={
                      activeVideoCaptionLayer ? (
                        <VideoCaptionHeadlinePanel
                          caption={activeVideoCaptionLayer}
                          onCaptionChange={(patch) => {
                            updateActiveVideoCaptionLayer(patch);
                          }}
                        />
                      ) : null
                    }
                    layers={videoCaptionLayers}
                    onActiveLayerSelect={setActiveVideoCaptionLayerId}
                    onAddLayer={addVideoCaptionLayer}
                    onCaptionsEnabledChange={setCaptionsMasterEnabled}
                    onLayerChange={(layerId, patch) => {
                      updateVideoCaptionLayer(layerId, patch);

                      if (patch.fontFamily) {
                        void loadWatermarkFont(patch.fontFamily, 700);
                      }
                    }}
                    onRemoveLayer={removeVideoCaptionLayer}
                    videoDurationSeconds={videoDuration}
                  />
                </>
              ) : activeVideoTool === "trim" ? (
                <VideoTrimPanel
                  canRedoVideoShorten={canRedoVideoShorten}
                  canRestoreOriginal={canRestoreOriginalVideo}
                  canUndoVideoShorten={canUndoVideoShorten}
                  durationSeconds={videoDuration}
                  exportDurationSeconds={draftExportVideoDuration}
                  hasUnsavedCrop={hasUnsavedVideoCrop}
                  isProcessing={isVideoEditProcessing}
                  onApplyShorten={saveVideoCrop}
                  onRedoVideoShorten={() => {
                    void redoVideoShorten();
                  }}
                  onReshorten={beginReshortenSession}
                  onRestoreOriginal={() => {
                    void restoreOriginalVideoLength();
                  }}
                  onUndoVideoShorten={() => {
                    void undoVideoShorten();
                  }}
                  savedExportDurationSeconds={exportVideoDuration}
                  showReshortenAction={showReshortenVideoAction}
                  showSavedConfirmation={
                    videoCropSavedNotice && !hasUnsavedVideoCrop
                  }
                  trimEndSeconds={resolvedVideoTrim.endSeconds}
                  trimStartSeconds={resolvedVideoTrim.startSeconds}
                />
              ) : activeVideoTool === "blur" ? (
                <VideoBlurPanel
                  activeRegionId={activeVideoBlurRegionId}
                  brushSize={videoBlurBrushSize}
                  durationSeconds={videoDuration}
                  onActiveRegionSelect={setActiveVideoBlurRegionId}
                  onAddRegion={addVideoBlurRegion}
                  onBrushSizeChange={setVideoBlurBrushSize}
                  onClearRegionStrokes={(regionId) => {
                    updateVideoBlurRegionStrokes(regionId, () => []);
                  }}
                  onRemoveRegion={removeVideoBlurRegion}
                  regions={videoBlurRegions}
                />
              ) : activeVideoTool === "merge" ? (
                <VideoMergePanel
                  entries={videoBatch}
                  isProcessing={isVideoEditProcessing}
                  onAddVideos={openAddMoreVideosPicker}
                  onMergeVideos={() => {
                    void mergeVideoBatchClips();
                  }}
                />
              ) : null}
            </div>
          ) : null}

            </EditorToolPanel>
            </>
          ) : null}

          {uploadError ? (
            <div className="absolute bottom-20 left-2 z-10 max-w-[calc(100%-1rem)] rounded-xl border border-ed-accent/30 bg-ed-accent/10 px-4 py-3 text-sm text-ed-fg md:left-[5rem] md:max-w-xs">
              {uploadError}
            </div>
          ) : null}
        </div>

        <section
          className="relative order-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:order-none"
          ref={previewPanelRef}
        >
          {isRestoringAnonymousDraft ? (
            <ProcessingOverlay label="Restoring your saved work…" />
          ) : null}

          {isVideoEditProcessing ? (
            <ProcessingOverlay label="Processing video…" />
          ) : null}

          {isPdfMergeProcessing ? (
            <ProcessingOverlay label="Merging PDFs…" />
          ) : null}

          {isPdfCompressProcessing ? (
            <ProcessingOverlay label="Compressing PDF…" />
          ) : null}

          <div
            className={`flex min-h-0 min-w-0 flex-1 flex-col ${
              showPreviewSplitAside ? "md:flex-row" : ""
            }`}
          >
            <div
              className={`flex min-h-0 min-w-0 flex-1 flex-col ${
                showVideoTimelineDock ? "overflow-hidden" : ""
              }`}
            >
              <div className="editor-mobile-preview-overlay-rail shrink-0 border-b border-ed-border bg-ed-panel md:hidden">
                {!hasMedia ? (
                  <ToolIconRail
                    activePanel={highlightedEditorPanel}
                    mediaKind={mediaKind}
                    onMobileExit={handleEditorExitRequest}
                    onSelectPanel={handleEditorPanelSelect}
                    showBuyCredits={false}
                  />
                ) : null}
              </div>
              {showMobileFormatToolRail ? (
                <div className="editor-mobile-preview-overlay-rail shrink-0 border-b border-ed-border bg-ed-panel md:hidden md:relative">
                  {activeEditorPanel === "photos" ? (
                    <PhotosToolRail
                      activeTool={activePhotoTool}
                      imageToolsEnabled={imageToolsEnabled}
                      onMobileExit={handleEditorExitRequest}
                      onSelectTool={handlePhotoToolSelect}
                    />
                  ) : activeEditorPanel === "pdfDocs" ? (
                    <PdfDocsToolRail
                      activeTool={activePdfTool}
                      onMobileExit={handleEditorExitRequest}
                      onSelectTool={handlePdfDocToolSelect}
                    />
                  ) : activeEditorPanel === "video" ? (
                    <VideoToolRail
                      activeTool={activeVideoTool}
                      hasVideo={videoToolsEnabled}
                      hideOverviewOnMobile
                      onMobileExit={handleEditorExitRequest}
                      onReshortenVideo={beginReshortenSession}
                      onSelectTool={handleVideoToolSelect}
                      showReshortenOnTrim={showReshortenVideoAction}
                    />
                  ) : null}
                </div>
              ) : null}
              <div className="relative min-h-0 flex-1 max-md:absolute max-md:inset-0">
              <div
                ref={previewCheckerboardRef}
                className={`editor-checkerboard group absolute inset-0 ${
                  showMobilePreviewTopRail ? "max-md:pt-11" : ""
                } ${
                  showVideoTimelineDock
                    ? previewZoomPercent > PREVIEW_ZOOM_DEFAULT && hasPreviewContent
                      ? "overflow-auto p-0 md:p-6"
                      : "overflow-hidden p-0 md:p-6"
                    : hasPreviewContent
                      ? "overflow-auto p-0 md:p-6"
                      : "overflow-hidden p-4 md:p-6"
                } ${canvasMetaLabel && !showVideoTimelineDock ? "max-md:pb-8" : ""} ${mobileEditorChromeInset}`}
              >
            {isPdfLoading ? (
              <div className="flex min-h-full min-w-full items-center justify-center text-center">
                <div>
                <p className="text-lg font-semibold text-ed-fg">Loading PDF...</p>
                <p className="mt-2 text-sm text-ed-fg-muted">
                  Rendering pages in your browser.
                </p>
                </div>
              </div>
            ) : hasPreviewContent ? (
              <div className="flex min-h-full min-w-full items-center justify-center max-md:min-h-0 max-md:flex-1">
                <div
                  className="relative flex shrink-0 items-center justify-center max-md:max-h-full max-md:max-w-full"
                  style={{
                    height: canvasSize.height,
                    width: canvasSize.width,
                  }}
                >
            {(mediaKind === "image" || mediaKind === "pdf") && image ? (
              <canvas
                className={`block h-full w-full touch-none shadow-lg ${
                  isSignatureDropTarget ? "ring-2 ring-signal ring-offset-2" : ""
                }`}
                onDragLeave={handleSignatureDragLeave}
                onDragOver={handleSignatureDragOver}
                onDrop={handleSignatureDrop}
                onPointerCancel={handleCanvasPointerCancel}
                onPointerDown={handleCanvasPointerDown}
                onPointerLeave={handleCanvasPointerLeave}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                ref={canvasRef}
                style={{ cursor: resolvedCanvasCursor }}
              />
            ) : mediaKind === "video" && videoUrl ? (
              showVideoOverviewPreview ? (
                <div
                  className="flex touch-none"
                  onPointerCancel={handlePreviewSurfacePointerCancel}
                  onPointerDown={handlePreviewSurfacePointerDown}
                  onPointerMove={handlePreviewSurfacePointerMove}
                  onPointerUp={handlePreviewSurfacePointerUp}
                  ref={videoPreviewRef}
                  style={{
                    cursor:
                      resolvedCanvasCursor === "auto" ? undefined : resolvedCanvasCursor,
                    height: videoPreviewDisplayFrame.height,
                    width: videoPreviewDisplayFrame.width,
                  }}
                >
                  <VideoOverviewPlayer
                    currentTimeSeconds={videoPreviewTime}
                    durationSeconds={videoDuration}
                    isPlaying={isVideoPlaying}
                    onPause={() => {
                      videoElementRef.current?.pause();
                    }}
                    onSeek={seekVideoPreview}
                    onTogglePlay={() => {
                      const video = videoElementRef.current;

                      if (!video) {
                        return;
                      }

                      if (video.paused) {
                        void video.play();
                      } else {
                        video.pause();
                      }
                    }}
                  >
                    <video
                      className="block h-full max-h-full w-full max-w-full object-contain"
                      controls={false}
                      key={videoUrl}
                      playsInline
                      ref={videoElementRef}
                      src={videoUrl}
                    />
                  </VideoOverviewPlayer>
                </div>
              ) : (
              <div
                className="relative touch-none shadow-lg"
                ref={videoPreviewRef}
                style={{
                  height: videoPreviewDisplayFrame.height,
                  width: videoPreviewDisplayFrame.width,
                }}
              >
                <video
                  className="block h-full w-full object-contain"
                  controls={watermarkType !== "text"}
                  key={videoUrl}
                  playsInline
                  ref={videoElementRef}
                  src={videoUrl}
                />
                <canvas
                  className={`absolute inset-0 h-full w-full touch-none ${
                    mediaKind === "video" && !isVideoCanvasInteractionActive()
                      ? "pointer-events-none"
                      : ""
                  } ${
                    isSignatureDropTarget
                      ? "ring-2 ring-inset ring-signal"
                      : ""
                  }`}
                  onDragLeave={handleSignatureDragLeave}
                  onDragOver={handleSignatureDragOver}
                  onDrop={handleSignatureDrop}
                  onPointerCancel={handleCanvasPointerCancel}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerLeave={handleCanvasPointerLeave}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  ref={videoOverlayCanvasRef}
                  style={{ cursor: resolvedCanvasCursor }}
                />
              </div>
              )
            ) : null}
                </div>
              </div>
            ) : (
              <div className="flex min-h-full min-w-full items-center justify-center px-2">
              <div className="w-full max-w-sm md:max-w-xl">
                <UploadZone
                  onClick={openFilePicker}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />
              </div>
              </div>
            )}
              </div>
              {hasPreviewContent && !isPdfLoading ? (
                <div className="pointer-events-none absolute inset-0 z-30 p-2 md:p-6">
                  <PreviewCanvasZoomControls
                    className="pointer-events-auto absolute top-2 right-2 md:top-6 md:right-6"
                    onReset={handlePreviewZoomReset}
                    onZoomIn={handlePreviewZoomIn}
                    onZoomOut={handlePreviewZoomOut}
                    resetDisabled={previewZoomResetDisabled}
                    zoomInDisabled={previewZoomInDisabled}
                    zoomOutDisabled={previewZoomOutDisabled}
                  />
                  <PreviewCanvasMediaControls
                    className={`pointer-events-auto absolute left-2 md:bottom-6 md:left-6 ${
                      showMobileBottomDock
                        ? "bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))]"
                        : "bottom-14"
                    }`}
                    mediaKind={mediaKind}
                    onAddMoreVideos={openAddMoreVideosPicker}
                    onRemove={handlePreviewMediaRemove}
                    onReplace={openReplaceMediaPicker}
                  />
                </div>
              ) : null}
              </div>

              {videoTimelineDock ? (
              <div className="hidden shrink-0 border-t border-ed-border bg-ed-panel md:block md:relative md:h-auto">
              {videoTimelineDock}
              </div>
              ) : null}
            </div>

            {showWatermarkAdjustAside ? (
              <aside className="hidden h-full w-[17rem] shrink-0 flex-col overflow-y-auto border-l border-ed-border bg-ed-panel px-2.5 py-2 md:flex">
                <div className="space-y-2">{renderWatermarkPreviewAside()}</div>
              </aside>
            ) : null}

            {showCaptionHeadlineAside ? (
              <aside className="hidden h-full w-[17rem] shrink-0 flex-col overflow-y-auto border-l border-ed-border bg-ed-panel px-2.5 py-2 md:flex">
                <VideoCaptionHeadlinePanel
                  caption={activeVideoCaptionLayer!}
                  onCaptionChange={(patch) => {
                    updateActiveVideoCaptionLayer(patch);
                  }}
                />
              </aside>
            ) : null}
          </div>

          {showWatermarkDragHint && watermarkDragHintPos ? (
            <div
              className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+0.5rem)] rounded-md border border-ed-border bg-ed-fg/90 px-2 py-1 text-[10px] font-medium text-ed-bg shadow-md backdrop-blur-sm"
              style={{
                left: watermarkDragHintPos.x,
                top: watermarkDragHintPos.y,
              }}
            >
              Drag to position of your choice
            </div>
          ) : null}

          {canvasMetaLabel ? (
            <p
              className={`border-t border-ed-border bg-ed-bg-card py-2 text-center text-xs text-ed-fg-muted ${
                showVideoTimelineDock
                  ? "max-md:hidden"
                  : "editor-mobile-preview-meta md:relative md:border-t md:bg-ed-bg-card md:py-2 md:text-xs"
              }`}
            >
              {canvasMetaLabel}
            </p>
          ) : null}
        </section>
      </motion.div>

      <EditorBottomBar
        canRedo={canRedoSettings}
        canUndo={canUndoSettings}
        className="editor-mobile-footer"
        exportDisabled={isExportDisabled}
        exportLabel={exportButtonLabel}
        exportTitle={exportDisabledReason}
        onExit={handleEditorExitRequest}
        onExport={handleExport}
        onRedo={redoWatermarkSettings}
        onUndo={undoWatermarkSettings}
        onZoomIn={hasPreviewContent ? handlePreviewZoomIn : undefined}
        onZoomOut={hasPreviewContent ? handlePreviewZoomOut : undefined}
        showHistoryControls={showWatermarkHistoryInFooter}
        zoomInDisabled={previewZoomInDisabled}
        zoomLabel={formatPreviewZoomLabel(previewZoomPercent)}
        zoomOutDisabled={previewZoomOutDisabled}
      />

      <WatermarkedExportUpsellModal
        onClose={handleDismissWatermarkedExportUpsell}
        onContinue={handleContinueWithWatermarkedExport}
        open={showWatermarkedExportUpsell}
      />

      {showEditorExitConfirm ? (
        <EditorExitConfirmModal
          onCancel={() => setShowEditorExitConfirm(false)}
          onConfirm={handleEditorExitConfirm}
        />
      ) : null}

      {showUnsignedPdfExportConfirm ? (
        <UnsignedPdfExportConfirmModal
          onCancel={() => setShowUnsignedPdfExportConfirm(false)}
          onConfirm={() => {
            setShowUnsignedPdfExportConfirm(false);
            void handlePdfExport(true);
          }}
          pageCount={pdfPageCount}
        />
      ) : null}

      <ExportLoginGateModal
        errorMessage={loginGateError}
        onAuthenticated={() => {
          void handleLoginGateAuthenticated();
        }}
        onClose={handleDismissExportLoginGate}
        open={showExportLoginGate}
        phase={loginGatePhase}
        verificationEmail={userEmail ?? ""}
      />

      <SignFillCreditsRequiredModal
        description="Videos over 60 seconds, above 1080p, or processed on our servers require credits. Buy credits to export, or use a shorter clip within in browser limits for a free watermarked export."
        onClose={handleDismissServerVideoCreditGate}
        open={showServerVideoCreditGate}
        title="Server video export requires credits"
      />

      {formatUploadPrompt ? (
        <EditorFormatUploadModal
          kind={formatUploadPrompt}
          onClose={() => setFormatUploadPrompt(null)}
          onUploadClick={() => {
            const kind = formatUploadPrompt;
            setFormatUploadPrompt(null);
            openFormatUploadPicker(kind);
          }}
        />
      ) : null}
    </main>
    </div>
  );
}

type UploadZoneProps = {
  onClick: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
};

type ImageBatchStripProps = {
  activeId: string | null;
  entries: BatchImageEntry[];
  headerActions?: ReactNode;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
};

const stripVisibleCount = 3;

type PaginatedThreeColumnStripProps<T> = {
  activeId: string | null;
  getItemId: (item: T) => string;
  items: readonly T[];
  renderItem: (item: T) => ReactNode;
};

function PaginatedThreeColumnStrip<T>({
  activeId,
  getItemId,
  items,
  renderItem,
}: PaginatedThreeColumnStripProps<T>) {
  const [startIndex, setStartIndex] = useState(0);
  const maxStartIndex = Math.max(0, items.length - stripVisibleCount);
  const safeStartIndex = Math.min(startIndex, maxStartIndex);
  const visibleItems = items.slice(
    safeStartIndex,
    safeStartIndex + stripVisibleCount,
  );
  const canGoLeft = safeStartIndex > 0;
  const canGoRight = safeStartIndex + stripVisibleCount < items.length;
  const showNavigation = items.length > stripVisibleCount;

  useEffect(() => {
    if (!activeId) {
      return;
    }

    const activeIndex = items.findIndex((item) => getItemId(item) === activeId);

    if (activeIndex === -1) {
      return;
    }

    setStartIndex((previousStart) => {
      if (activeIndex < previousStart) {
        return activeIndex;
      }

      if (activeIndex >= previousStart + stripVisibleCount) {
        return activeIndex - stripVisibleCount + 1;
      }

      return previousStart;
    });
  }, [activeId, getItemId, items]);

  useEffect(() => {
    setStartIndex((previousStart) => Math.min(previousStart, maxStartIndex));
  }, [maxStartIndex]);

  return (
    <>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {visibleItems.map((item) => (
          <div className="min-w-0" key={getItemId(item)}>
            {renderItem(item)}
          </div>
        ))}
      </div>

      {showNavigation ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            aria-label="Show previous items"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ed-border bg-ed-bg-card text-ed-fg-muted transition hover:border-sand/40 hover:text-ed-fg disabled:cursor-not-allowed disabled:opacity-35"
            disabled={!canGoLeft}
            onClick={() => setStartIndex((index) => Math.max(0, index - 1))}
            type="button"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>

          <p className="text-center text-[10px] font-medium tabular-nums text-ed-fg-muted">
            {safeStartIndex + 1} to{" "}
            {Math.min(safeStartIndex + stripVisibleCount, items.length)} of{" "}
            {items.length}
          </p>

          <button
            aria-label="Show next items"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ed-border bg-ed-bg-card text-ed-fg-muted transition hover:border-sand/40 hover:text-ed-fg disabled:cursor-not-allowed disabled:opacity-35"
            disabled={!canGoRight}
            onClick={() =>
              setStartIndex((index) => Math.min(maxStartIndex, index + 1))
            }
            type="button"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      ) : null}
    </>
  );
}

function ImageBatchStrip({
  activeId,
  entries,
  headerActions,
  onRemove,
  onSelect,
}: ImageBatchStripProps) {
  return (
    <div className="rounded-lg border border-ed-border bg-ed-bg-card p-2">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ed-fg">
          Batch images
        </p>
        {headerActions}
      </div>
      <PaginatedThreeColumnStrip
        activeId={activeId}
        getItemId={(entry) => entry.id}
        items={entries}
        renderItem={(entry) => {
          const isActive = entry.id === activeId;

          return (
            <div className="relative">
              <button
                className={`group relative block w-full overflow-hidden rounded-lg border transition ${
                  isActive
                    ? "border-2 border-signal ring-2 ring-signal/35"
                    : "border-ed-border hover:border-signal/50"
                }`}
                onClick={() => onSelect(entry.id)}
                title={entry.fileName}
                type="button"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={entry.fileName}
                  className="aspect-square w-full object-cover"
                  src={entry.objectUrl}
                />
                <span className="block truncate px-1 py-1 text-[10px] text-ed-fg-muted">
                  {entry.fileName}
                </span>
              </button>
              <button
                aria-label={`Remove ${entry.fileName}`}
                className="absolute right-1 top-1 rounded-full bg-ed-bg-card/90 p-0.5 text-ed-fg-muted shadow-sm transition hover:bg-signal hover:text-white"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(entry.id);
                }}
                type="button"
              >
                <X size={12} />
              </button>
            </div>
          );
        }}
      />
    </div>
  );
}

type VideoBatchStripProps = {
  activeId: string | null;
  entries: BatchVideoEntry[];
  headerActions?: ReactNode;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
};

function VideoBatchStrip({
  activeId,
  entries,
  headerActions,
  onRemove,
  onSelect,
}: VideoBatchStripProps) {
  return (
    <div className="rounded-lg border border-ed-border bg-ed-bg-card p-2">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ed-fg">
          Video batch
        </p>
        {headerActions}
      </div>
      <PaginatedThreeColumnStrip
        activeId={activeId}
        getItemId={(entry) => entry.id}
        items={entries}
        renderItem={(entry) => {
          const isActive = entry.id === activeId;

          return (
            <div className="relative">
              <button
                className={`group relative block w-full overflow-hidden rounded-lg border transition ${
                  isActive
                    ? "border-2 border-signal ring-2 ring-signal/35"
                    : "border-ed-border hover:border-signal/50"
                }`}
                onClick={() => onSelect(entry.id)}
                title={entry.fileName}
                type="button"
              >
                <div className="flex aspect-square w-full items-center justify-center bg-ed-bg">
                  <Video className="h-8 w-8 text-signal/80" strokeWidth={1.75} />
                </div>
                <span className="block truncate px-1 py-1 text-[10px] text-ed-fg-muted">
                  {entry.fileName}
                </span>
              </button>
              <button
                aria-label={`Remove ${entry.fileName}`}
                className="absolute right-1 top-1 rounded-full bg-ed-bg-card/90 p-0.5 text-ed-fg-muted shadow-sm transition hover:bg-signal hover:text-white"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(entry.id);
                }}
                type="button"
              >
                <X size={12} />
              </button>
            </div>
          );
        }}
      />
    </div>
  );
}

type PdfPageStripProps = {
  activeId: string | null;
  headerActions?: ReactNode;
  onSelect: (id: string) => void;
  pages: PdfPageThumbnail[];
};

function PdfPageStrip({
  activeId,
  headerActions,
  onSelect,
  pages,
}: PdfPageStripProps) {
  return (
    <div className="rounded-lg border border-ed-border bg-ed-bg-card p-2">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ed-fg">
          PDF pages
        </p>
        {headerActions}
      </div>
      <PaginatedThreeColumnStrip
        activeId={activeId}
        getItemId={(page) => page.id}
        items={pages}
        renderItem={(page) => {
          const isActive = page.id === activeId;

          return (
            <button
              className={`block w-full overflow-hidden rounded-lg border transition shadow-sm ${
                isActive
                  ? "border-2 border-signal ring-2 ring-signal/35"
                  : "border-ed-border hover:border-signal/50"
              }`}
              onClick={() => onSelect(page.id)}
              title={`Page ${page.pageNumber}`}
              type="button"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`Page ${page.pageNumber}`}
                className="aspect-[3/4] w-full bg-ed-bg-muted object-contain"
                src={page.thumbnailUrl}
              />
              <span className="block truncate px-1 py-1 text-[10px] text-ed-fg-muted">
                Page {page.pageNumber}
              </span>
            </button>
          );
        }}
      />
    </div>
  );
}

type EditorMediaActionButtonsProps = {
  isPdfLoading: boolean;
  mediaKind: MediaKind | null;
  onAddMoreImages: () => void;
  onAddMoreVideos?: () => void;
  onRemove: () => void;
  onReplace: () => void;
};

function EditorMediaActionButtons({
  isPdfLoading,
  mediaKind,
  onAddMoreImages,
  onAddMoreVideos,
  onRemove,
  onReplace,
}: EditorMediaActionButtonsProps) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {!isPdfLoading ? (
        <>
          <button
            aria-label="Replace loaded media"
            className={previewControlButtonClassName}
            onClick={onReplace}
            type="button"
          >
            <RefreshCw className="h-3 w-3" strokeWidth={2.35} />
          </button>

          {mediaKind === "image" ? (
            <button
              aria-label="Add more images"
              className={previewControlButtonClassName}
              onClick={onAddMoreImages}
              type="button"
            >
              <Images className="h-3 w-3" strokeWidth={2.35} />
            </button>
          ) : null}

          {mediaKind === "video" && onAddMoreVideos ? (
            <button
              aria-label="Add more videos"
              className={previewControlButtonClassName}
              onClick={onAddMoreVideos}
              type="button"
            >
              <Video className="h-3 w-3" strokeWidth={2.35} />
            </button>
          ) : null}
        </>
      ) : null}

      <button
        aria-label="Remove loaded media"
        className={previewControlButtonClassName}
        onClick={onRemove}
        type="button"
      >
        <Trash2 className="h-3 w-3" strokeWidth={2.35} />
      </button>
    </div>
  );
}

function UploadZone({ onClick, onDragOver, onDrop }: UploadZoneProps) {
  return (
    <div
      className="w-full cursor-pointer rounded-2xl border border-dashed border-ed-border bg-ed-bg-card px-5 py-8 text-center transition hover:border-sand hover:bg-ed-bg-card md:px-6 md:py-12"
      onClick={onClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
      role="button"
      tabIndex={0}
    >
      <p className="text-base font-semibold text-ed-fg md:text-lg">
        Drop your images, PDF, or video here
      </p>
      <p className="mt-2 text-sm text-ed-fg-muted">
        Select multiple images for batch watermarking, one PDF, or one video
      </p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-ed-fg-muted md:mt-6 md:tracking-[0.18em]">
        JPG, PNG, WebP, PDF, MP4, MOV, WebM
      </p>
      <span className="mt-4 inline-flex rounded-xl bg-signal px-5 py-2.5 text-sm font-semibold text-white md:hidden">
        Choose file
      </span>
    </div>
  );
}

function imageElementToDataUrl(image: HTMLImageElement): Promise<string> {
  if (image.src.startsWith("data:")) {
    return Promise.resolve(image.src);
  }

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    return Promise.resolve(image.src);
  }

  context.drawImage(image, 0, 0);
  return Promise.resolve(canvas.toDataURL("image/png"));
}

function getCanvasLogicalSize(canvas: HTMLCanvasElement) {
  return {
    height: canvas.clientHeight || canvas.height,
    width: canvas.clientWidth || canvas.width,
  };
}

function getCanvasPoint(event: PointerEvent<HTMLCanvasElement>) {
  const canvas = event.currentTarget;
  const rect = canvas.getBoundingClientRect();
  const { width: logicalWidth, height: logicalHeight } =
    getCanvasLogicalSize(canvas);

  if (!logicalWidth || !logicalHeight) {
    return null;
  }

  return {
    x: clamp(event.clientX - rect.left, 0, logicalWidth),
    y: clamp(event.clientY - rect.top, 0, logicalHeight),
  };
}

function canvasPointToPercent(
  canvas: HTMLCanvasElement,
  point: { x: number; y: number },
): CustomPosition {
  const { width, height } = getCanvasLogicalSize(canvas);

  return {
    xPercent: clamp(point.x / width, 0, 1),
    yPercent: clamp(point.y / height, 0, 1),
  };
}

function getCanvasPlacementFromDrag(
  event: DragEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
) {
  const rect = canvas.getBoundingClientRect();
  const logicalWidth = canvas.clientWidth || rect.width;
  const logicalHeight = canvas.clientHeight || rect.height;

  if (!logicalWidth || !logicalHeight) {
    return null;
  }

  return {
    xPercent: clamp((event.clientX - rect.left) / logicalWidth, 0, 1),
    yPercent: clamp((event.clientY - rect.top) / logicalHeight, 0, 1),
  };
}

function forwardPointerEventToElementBelow(
  event: PointerEvent<HTMLCanvasElement>,
) {
  const canvas = event.currentTarget;
  canvas.style.pointerEvents = "none";
  const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
  canvas.style.pointerEvents = "auto";

  if (!elementBelow || elementBelow === canvas) {
    return;
  }

  elementBelow.dispatchEvent(
    new PointerEvent(event.type, {
      bubbles: true,
      button: event.button,
      buttons: event.buttons,
      cancelable: true,
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
    }),
  );
}

function isPointInBounds(point: { x: number; y: number }, bounds: TextBounds) {
  return (
    point.x >= bounds.left &&
    point.x <= bounds.right &&
    point.y >= bounds.top &&
    point.y <= bounds.bottom
  );
}

function expandBounds(bounds: TextBounds, padding: number): TextBounds {
  return {
    bottom: bounds.bottom + padding,
    left: bounds.left - padding,
    right: bounds.right + padding,
    top: bounds.top - padding,
  };
}

function getWatermarkBoundsNearPoint(
  point: { x: number; y: number },
  boundsMap: Map<string, TextBounds>,
  proximity: number,
): TextBounds | null {
  let nearest: TextBounds | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const bounds of boundsMap.values()) {
    const expanded = expandBounds(bounds, proximity);

    if (!isPointInBounds(point, expanded)) {
      continue;
    }

    const centerX = (bounds.left + bounds.right) / 2;
    const centerY = (bounds.top + bounds.bottom) / 2;
    const distance = Math.hypot(point.x - centerX, point.y - centerY);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = bounds;
    }
  }

  return nearest;
}

function getCanvasHintPosition(
  canvas: HTMLCanvasElement,
  bounds: TextBounds,
  container: HTMLElement,
) {
  const canvasRect = canvas.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const { width: logicalWidth, height: logicalHeight } =
    getCanvasLogicalSize(canvas);
  const scaleX = canvasRect.width / logicalWidth;
  const scaleY = canvasRect.height / logicalHeight;
  const centerX = (bounds.left + bounds.right) / 2;
  const topY = bounds.top;

  return {
    x: canvasRect.left - containerRect.left + centerX * scaleX,
    y: canvasRect.top - containerRect.top + topY * scaleY,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatDuration(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.round(duration);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function normalizeDegrees(degrees: number) {
  if (!Number.isFinite(degrees)) {
    return 0;
  }

  return ((Math.round(degrees) % 360) + 360) % 360;
}

function getRotatedBounds(width: number, height: number, degrees: number) {
  const radians = (normalizeDegrees(degrees) * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));

  return {
    height: width * sin + height * cos,
    width: width * cos + height * sin,
  };
}

type PreviewImageFrame = {
  height: number;
  width: number;
  x: number;
  y: number;
};

function computeLetterboxedPreviewImageFrame({
  canvasHeight,
  canvasWidth,
  previewImageHeight,
  previewImageWidth,
  referenceHeight,
  referenceWidth,
  rotationAngle,
}: {
  canvasHeight: number;
  canvasWidth: number;
  previewImageHeight: number;
  previewImageWidth: number;
  referenceHeight: number;
  referenceWidth: number;
  rotationAngle: number;
}): PreviewImageFrame {
  const rotatedPreviewBounds = getRotatedBounds(
    previewImageWidth,
    previewImageHeight,
    rotationAngle,
  );
  const imageScale = Math.min(
    canvasWidth / Math.max(referenceWidth, rotatedPreviewBounds.width),
    canvasHeight / Math.max(referenceHeight, rotatedPreviewBounds.height),
  );
  const imageWidth = rotatedPreviewBounds.width * imageScale;
  const imageHeight = rotatedPreviewBounds.height * imageScale;

  return {
    height: imageHeight,
    width: imageWidth,
    x: (canvasWidth - imageWidth) / 2,
    y: (canvasHeight - imageHeight) / 2,
  };
}

function mapPreviewCustomPositionToExportSpace(
  position: CustomPosition,
  previewCanvasWidth: number,
  previewCanvasHeight: number,
  previewFrame: PreviewImageFrame,
  exportWidth: number,
  exportHeight: number,
) {
  return {
    textAlign: "center" as CanvasTextAlign,
    textBaseline: "middle" as CanvasTextBaseline,
    x:
      ((position.xPercent * previewCanvasWidth - previewFrame.x) /
        previewFrame.width) *
      exportWidth,
    y:
      ((position.yPercent * previewCanvasHeight - previewFrame.y) /
        previewFrame.height) *
      exportHeight,
  };
}

function getImageAspectRatio(image: HTMLImageElement) {
  return image.naturalWidth / image.naturalHeight;
}

function createRotatedImage(
  image: HTMLImageElement,
  degrees: number,
): Promise<HTMLImageElement> {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const bounds = getRotatedBounds(
    image.naturalWidth,
    image.naturalHeight,
    degrees,
  );

  canvas.width = Math.max(1, Math.ceil(bounds.width));
  canvas.height = Math.max(1, Math.ceil(bounds.height));

  if (context) {
    context.fillStyle = "#DCDCDD";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((degrees * Math.PI) / 180);
    context.drawImage(
      image,
      -image.naturalWidth / 2,
      -image.naturalHeight / 2,
    );
  }

  return createImageFromCanvas(canvas);
}

function createCroppedImage(
  image: HTMLImageElement,
  cropRect: CropRect,
): Promise<HTMLImageElement> {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const normalizedCrop = normalizeCropRect(cropRect, image);

  canvas.width = Math.max(1, Math.round(normalizedCrop.width));
  canvas.height = Math.max(1, Math.round(normalizedCrop.height));

  if (context) {
    context.drawImage(
      image,
      normalizedCrop.x,
      normalizedCrop.y,
      normalizedCrop.width,
      normalizedCrop.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  }

  return createImageFromCanvas(canvas);
}

function createResizedImage(
  image: HTMLImageElement,
  width: number,
  height: number,
  mode: ResizeScaleMode = "stretch",
): Promise<HTMLImageElement> {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  if (context) {
    context.imageSmoothingQuality = "high";
    drawImageWithResizeMode(
      context,
      image,
      image.naturalWidth,
      image.naturalHeight,
      mode,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  }

  return createImageFromCanvas(canvas);
}

function createImageFromCanvas(canvas: HTMLCanvasElement) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load transformed image."));
    image.src = canvas.toDataURL("image/png");
  });
}

type ExportRenderInput = {
  activeLogoLayerId: string;
  activeTextLayerId: string;
  blurStrokes: BlurStroke[];
  customPosition: CustomPosition | null;
  fontFamily: string;
  fontSizeScale: number;
  image: HTMLImageElement;
  imageEffectSettings: ImageEffectSettings;
  logoImage: HTMLImageElement | null;
  logoLayers: LogoWatermarkLayer[];
  previewCanvasSize: CanvasSize;
  referenceImageSize: CanvasSize;
  resizeHeight: number;
  resizeWidth: number;
  rotationAngle: number;
  textLayers: TextWatermarkLayer[];
  tileAngle: TileAngle;
  tileDensity: TileDensity;
  tileGap: number;
  useResizePreview: boolean;
  watermarkMode: WatermarkMode;
  watermarkOpacity: number;
  watermarkPosition: WatermarkPosition;
  watermarkText: string;
  watermarkType: WatermarkType;
};

type SignaturePlacementPaintEntry = {
  customPosition: CustomPosition | null;
  fontSizeScale: number;
  id: string;
  image: HTMLImageElement;
  isActive: boolean;
  opacity: number;
  watermarkPosition: WatermarkPosition;
};

type WatermarkLayerPaintInput = {
  activeLayerId: string;
  canvasHeight: number;
  canvasWidth: number;
  context: CanvasRenderingContext2D;
  imageHeight: number;
  imageWidth: number;
  imageX: number;
  imageY: number;
  logoLayers: LogoWatermarkLayer[];
  resolveCustomPosition?: (
    position: CustomPosition,
  ) => {
    textAlign: CanvasTextAlign;
    textBaseline: CanvasTextBaseline;
    x: number;
    y: number;
  };
  signatureCustomPosition: CustomPosition | null;
  signatureFontSizeScale: number;
  signatureImage: HTMLImageElement | null;
  signatureOpacity: number;
  signaturePlacements?: SignaturePlacementPaintEntry[];
  signaturePosition: WatermarkPosition;
  textLayers: TextWatermarkLayer[];
  tileAngle: TileAngle;
  tileDensity: TileDensity;
  tileGap: number;
  videoDurationSeconds?: number;
  videoPreviewTimeSeconds?: number;
  watermarkMode: WatermarkMode;
  watermarkReferenceWidth?: number;
  watermarkType: WatermarkType;
  displayScale?: number;
  includeForcedTilePattern?: boolean;
};

const defaultWatermarkFontFamily =
  'Arial, Helvetica, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

function resolveWatermarkDisplayScale(
  clipWidth: number,
  watermarkReferenceWidth: number,
) {
  if (!watermarkReferenceWidth) {
    return 1;
  }

  return clipWidth / watermarkReferenceWidth;
}

function paintWatermarkLayers({
  activeLayerId,
  canvasHeight,
  canvasWidth,
  context,
  displayScale,
  imageHeight,
  imageWidth,
  imageX,
  imageY,
  logoLayers,
  resolveCustomPosition,
  signatureCustomPosition,
  signatureFontSizeScale,
  signatureImage,
  signatureOpacity,
  signaturePlacements,
  signaturePosition,
  textLayers,
  tileAngle,
  tileDensity,
  tileGap,
  videoDurationSeconds,
  videoPreviewTimeSeconds,
  watermarkMode,
  watermarkReferenceWidth,
  watermarkType,
  includeForcedTilePattern = false,
}: WatermarkLayerPaintInput): {
  activeBounds: TextBounds | null;
  boundsByLayer: Map<string, TextBounds>;
} {
  const sizingWidth = watermarkReferenceWidth ?? imageWidth;
  const scale =
    displayScale ?? resolveWatermarkDisplayScale(imageWidth, sizingWidth);
  const boundsByLayer = new Map<string, TextBounds>();
  let activeBounds: TextBounds | null = null;

  const resolvePosition = (position: CustomPosition) => {
    if (resolveCustomPosition) {
      return resolveCustomPosition(position);
    }

    return {
      textAlign: "center" as CanvasTextAlign,
      textBaseline: "middle" as CanvasTextBaseline,
      x: position.xPercent * canvasWidth,
      y: position.yPercent * canvasHeight,
    };
  };

  const drawLayer = ({
    customPosition,
    fontFamily,
    fontSizeScale,
    fontWeight,
    isActive,
    layerId,
    logoImage,
    opacity,
    textColor,
    textShadowEnabled,
    watermarkPosition,
    watermarkText,
    layerType,
  }: {
    customPosition: CustomPosition | null;
    fontFamily: string;
    fontSizeScale: number;
    fontWeight: TextWatermarkFontWeight;
    isActive: boolean;
    layerId: string;
    logoImage: HTMLImageElement | null;
    opacity: number;
    textColor: string;
    textShadowEnabled: boolean;
    watermarkPosition: WatermarkPosition;
    watermarkText: string;
    layerType: "text" | "logo";
  }) => {
    const drawable = getDrawableWatermark({
      context,
      displayScale: scale,
      fontFamily,
      fontSizeScale,
      fontWeight,
      imageWidth,
      logoImage,
      textColor,
      textShadowEnabled,
      watermarkReferenceWidth: sizingWidth,
      watermarkText,
      watermarkType: layerType,
    });

    if (!drawable) {
      return;
    }

    const alpha = opacity / 100;
    const useTile = watermarkMode === "tile" && isActive;

    if (useTile) {
      drawTiledWatermark({
        alpha,
        angle: tileAngle,
        context,
        density: tileDensity,
        displayScale: scale,
        drawable,
        gap: tileGap,
        imageHeight,
        imageWidth,
        imageX,
        imageY,
        watermarkReferenceWidth: sizingWidth,
      });
      return;
    }

    const padding = Math.max(24, drawable.height * 0.9);
    const { x, y, textAlign, textBaseline } = customPosition
      ? resolvePosition(customPosition)
      : getWatermarkCoordinates({
          fontSize: drawable.height,
          imageHeight,
          imageWidth,
          imageX,
          imageY,
          padding,
          position: watermarkPosition,
        });

    context.save();
    const bounds = getDrawableBounds({
      drawable,
      textAlign,
      textBaseline,
      x,
      y,
    });
    boundsByLayer.set(layerId, bounds);

    if (isActive) {
      activeBounds = bounds;
    }

    drawWatermarkDrawable({
      alpha,
      context,
      drawable,
      textAlign,
      textBaseline,
      x,
      y,
    });
    context.restore();
  };

  if (watermarkType === "text") {
    for (const layer of textLayers) {
      if (!layer.text.trim()) {
        continue;
      }

      if (
        videoPreviewTimeSeconds !== undefined &&
        videoDurationSeconds !== undefined &&
        !isElementVisibleAt(
          layer,
          videoPreviewTimeSeconds,
          videoDurationSeconds,
        )
      ) {
        continue;
      }

      drawLayer({
        customPosition: layer.customPosition,
        fontFamily: layer.fontFamily,
        fontSizeScale: layer.fontSizeScale,
        fontWeight: layer.fontWeight ?? DEFAULT_TEXT_WATERMARK_FONT_WEIGHT,
        isActive: layer.id === activeLayerId,
        layerId: layer.id,
        logoImage: null,
        opacity: layer.opacity,
        textColor: layer.textColor ?? DEFAULT_TEXT_WATERMARK_COLOR,
        textShadowEnabled: layer.textShadowEnabled ?? DEFAULT_TEXT_SHADOW_ENABLED,
        watermarkPosition: layer.watermarkPosition,
        watermarkText: layer.text,
        layerType: "text",
      });
    }
  } else if (watermarkType === "logo") {
    for (const layer of logoLayers) {
      if (!layer.logoImage || layer.id === FORCED_TILE_LAYER_ID) {
        continue;
      }

      drawLayer({
        customPosition: layer.customPosition,
        fontFamily: defaultWatermarkFontFamily,
        fontSizeScale: layer.fontSizeScale,
        fontWeight: DEFAULT_TEXT_WATERMARK_FONT_WEIGHT,
        isActive: layer.id === activeLayerId,
        layerId: layer.id,
        logoImage: layer.logoImage,
        opacity: layer.opacity,
        textColor: DEFAULT_TEXT_WATERMARK_COLOR,
        textShadowEnabled: DEFAULT_TEXT_SHADOW_ENABLED,
        watermarkPosition: layer.watermarkPosition,
        watermarkText: "",
        layerType: "logo",
      });
    }
  } else if (watermarkType === "signature") {
    if (signaturePlacements?.length) {
      for (const placement of signaturePlacements) {
        drawLayer({
          customPosition: placement.customPosition,
          fontFamily: defaultWatermarkFontFamily,
          fontSizeScale: placement.fontSizeScale,
          fontWeight: DEFAULT_TEXT_WATERMARK_FONT_WEIGHT,
          isActive: placement.isActive,
          layerId: placement.id,
          logoImage: placement.image,
          opacity: placement.opacity,
          textColor: DEFAULT_TEXT_WATERMARK_COLOR,
          textShadowEnabled: DEFAULT_TEXT_SHADOW_ENABLED,
          watermarkPosition: placement.watermarkPosition,
          watermarkText: "",
          layerType: "logo",
        });

        if (placement.isActive) {
          const bounds = boundsByLayer.get(placement.id);

          if (bounds) {
            drawPlacementSelectionFrame(context, bounds);
            drawPlacementFrameActions(context, bounds);
          }
        }
      }
    } else if (signatureImage) {
      drawLayer({
        customPosition: signatureCustomPosition,
        fontFamily: defaultWatermarkFontFamily,
        fontSizeScale: signatureFontSizeScale,
        fontWeight: DEFAULT_TEXT_WATERMARK_FONT_WEIGHT,
        isActive: true,
        layerId: "signature",
        logoImage: signatureImage,
        opacity: signatureOpacity,
        textColor: DEFAULT_TEXT_WATERMARK_COLOR,
        textShadowEnabled: DEFAULT_TEXT_SHADOW_ENABLED,
        watermarkPosition: signaturePosition,
        watermarkText: "",
        layerType: "logo",
      });
    }
  }

  const forcedOverlayLayer = logoLayers.find(
    (layer) => layer.id === FORCED_TILE_LAYER_ID && layer.logoImage,
  );

  if (forcedOverlayLayer) {
    paintForcedExportStampLayer({
      canvasHeight,
      canvasWidth,
      context,
      displayScale: scale,
      forcedOverlayLayer,
      imageHeight,
      imageWidth,
      imageX,
      imageY,
      includeForcedTilePattern,
      resolveCustomPosition,
      watermarkReferenceWidth: sizingWidth,
    });
  }

  return { activeBounds, boundsByLayer };
}

function paintForcedExportStampLayer({
  canvasHeight,
  canvasWidth,
  context,
  displayScale = 1,
  forcedOverlayLayer,
  imageHeight,
  imageWidth,
  imageX,
  imageY,
  includeForcedTilePattern = false,
  resolveCustomPosition,
  watermarkReferenceWidth,
}: {
  canvasHeight: number;
  canvasWidth: number;
  context: CanvasRenderingContext2D;
  displayScale?: number;
  forcedOverlayLayer: LogoWatermarkLayer;
  imageHeight: number;
  imageWidth: number;
  imageX: number;
  imageY: number;
  includeForcedTilePattern?: boolean;
  resolveCustomPosition?: WatermarkLayerPaintInput["resolveCustomPosition"];
  watermarkReferenceWidth: number;
}) {
  if (includeForcedTilePattern) {
    const tileDrawable = getDrawableWatermark({
      context,
      displayScale,
      fontFamily: FORCED_TILE_PATTERN_SETTINGS.fontFamily,
      fontSizeScale: FORCED_TILE_PATTERN_SETTINGS.fontSizeScale,
      fontWeight: DEFAULT_TEXT_WATERMARK_FONT_WEIGHT,
      imageWidth,
      logoImage: null,
      textColor: DEFAULT_TEXT_WATERMARK_COLOR,
      textShadowEnabled: DEFAULT_TEXT_SHADOW_ENABLED,
      watermarkReferenceWidth,
      watermarkText: FORCED_TILE_SITE_TEXT,
      watermarkType: "text",
    });

    if (tileDrawable) {
      drawTiledWatermark({
        alpha: FORCED_TILE_PATTERN_SETTINGS.watermarkOpacity / 100,
        angle: FORCED_TILE_PATTERN_SETTINGS.tileAngle,
        context,
        density: FORCED_TILE_PATTERN_SETTINGS.tileDensity,
        displayScale,
        drawable: tileDrawable,
        gap: FORCED_TILE_PATTERN_SETTINGS.tileGap,
        imageHeight,
        imageWidth,
        imageX,
        imageY,
        watermarkReferenceWidth,
      });

      logRealVideoExport("STEP 11x/15: forced tile pattern painted onto overlay canvas", {
        drawableHeight: tileDrawable.height,
        drawableWidth: tileDrawable.width,
        forcedLayerId: forcedOverlayLayer.id,
      });
    }
  }

  const logoImage = forcedOverlayLayer.logoImage;

  if (!logoImage || logoImage.naturalWidth <= 0 || logoImage.naturalHeight <= 0) {
    logRealVideoExport("STEP 11x/15: forced stamp SKIPPED — logo image not ready", {
      naturalHeight: logoImage?.naturalHeight ?? null,
      naturalWidth: logoImage?.naturalWidth ?? null,
    });
    return;
  }

  const resolvePosition = (position: CustomPosition) => {
    if (resolveCustomPosition) {
      return resolveCustomPosition(position);
    }

    return {
      textAlign: "center" as CanvasTextAlign,
      textBaseline: "middle" as CanvasTextBaseline,
      x: position.xPercent * canvasWidth,
      y: position.yPercent * canvasHeight,
    };
  };

  const drawable = getDrawableWatermark({
    context,
    displayScale,
    fontFamily: defaultWatermarkFontFamily,
    fontSizeScale: forcedOverlayLayer.fontSizeScale,
    fontWeight: DEFAULT_TEXT_WATERMARK_FONT_WEIGHT,
    imageWidth,
    logoImage,
    textColor: DEFAULT_TEXT_WATERMARK_COLOR,
    textShadowEnabled: DEFAULT_TEXT_SHADOW_ENABLED,
    watermarkReferenceWidth,
    watermarkText: "",
    watermarkType: "logo",
  });

  if (!drawable) {
    logRealVideoExport("STEP 11x/15: forced stamp SKIPPED — drawable unavailable");
    return;
  }

  const alpha = forcedOverlayLayer.opacity / 100;
  const { x, y, textAlign, textBaseline } = forcedOverlayLayer.customPosition
    ? resolvePosition(forcedOverlayLayer.customPosition)
    : getWatermarkCoordinates({
        fontSize: drawable.height,
        imageHeight,
        imageWidth,
        imageX,
        imageY,
        padding: Math.max(24, drawable.height * 0.9),
        position: forcedOverlayLayer.watermarkPosition,
      });

  context.save();
  drawWatermarkDrawable({
    alpha,
    context,
    drawable,
    textAlign,
    textBaseline,
    x,
    y,
  });
  context.restore();

  logRealVideoExport("STEP 11x/15: forced stamp painted onto overlay canvas", {
    drawableHeight: drawable.height,
    drawableWidth: drawable.width,
    forcedLayerId: forcedOverlayLayer.id,
    naturalHeight: logoImage.naturalHeight,
    naturalWidth: logoImage.naturalWidth,
    x,
    y,
  });
}

type WatermarkOnlyRenderInput = {
  activeLayerId?: string;
  activeLogoLayerId?: string;
  activeTextLayerId?: string;
  context: CanvasRenderingContext2D;
  customPosition: CustomPosition | null;
  fontFamily: string;
  fontSizeScale: number;
  fontWeight?: TextWatermarkFontWeight;
  height: number;
  logoImage: HTMLImageElement | null;
  logoLayers?: LogoWatermarkLayer[];
  textColor?: string;
  textLayers?: TextWatermarkLayer[];
  textShadowEnabled?: boolean;
  tileAngle: TileAngle;
  tileDensity: TileDensity;
  tileGap: number;
  watermarkMode: WatermarkMode;
  watermarkOpacity: number;
  watermarkPosition: WatermarkPosition;
  watermarkText: string;
  watermarkType: WatermarkType;
  watermarkReferenceWidth?: number;
  width: number;
};

function drawWatermarkOnly({
  context,
  customPosition,
  fontFamily,
  fontSizeScale,
  fontWeight = DEFAULT_TEXT_WATERMARK_FONT_WEIGHT,
  height,
  logoImage,
  logoLayers,
  activeLayerId,
  activeLogoLayerId,
  activeTextLayerId,
  textColor = DEFAULT_TEXT_WATERMARK_COLOR,
  textLayers,
  textShadowEnabled = DEFAULT_TEXT_SHADOW_ENABLED,
  tileAngle,
  tileDensity,
  tileGap,
  watermarkMode,
  watermarkOpacity,
  watermarkPosition,
  watermarkText,
  watermarkType,
  watermarkReferenceWidth,
  width,
}: WatermarkOnlyRenderInput): TextBounds | null {
  const { activeBounds } = paintWatermarkLayers({
    activeLayerId:
      activeLayerId ??
      (watermarkType === "text"
        ? activeTextLayerId ?? ""
        : watermarkType === "logo"
          ? activeLogoLayerId ?? ""
          : activeTextLayerId ?? ""),
    canvasHeight: height,
    canvasWidth: width,
    context,
    imageHeight: height,
    imageWidth: width,
    imageX: 0,
    imageY: 0,
    logoLayers: logoLayers ?? [],
    signatureCustomPosition: customPosition,
    signatureFontSizeScale: fontSizeScale,
    signatureImage: watermarkType === "signature" ? logoImage : null,
    signatureOpacity: watermarkOpacity,
    signaturePosition: watermarkPosition,
    textLayers:
      textLayers ??
      (watermarkText.trim()
        ? [
            {
              customPosition,
              fontFamily,
              fontSizeScale,
              fontWeight,
              id: "legacy-text",
              opacity: watermarkOpacity,
              text: watermarkText,
              textColor,
              textShadowEnabled,
              type: "text" as const,
              watermarkPosition,
            },
          ]
        : []),
    tileAngle,
    tileDensity,
    tileGap,
    watermarkMode,
    watermarkReferenceWidth: watermarkReferenceWidth ?? width,
    watermarkType,
  });

  return activeBounds;
}

type BuildClientVideoOverlayPassesInput = {
  applyStaticFreeExportStamp?: boolean;
  durationSeconds: number;
  height: number;
  settings: Omit<WatermarkOverlayCanvasInput, "height" | "width">;
  videoBlurRegions?: VideoBlurRegion[];
  videoCaptionLayers?: VideoCaptionLayer[];
  videoElement?: HTMLVideoElement | null;
  watermarkReferenceWidth: number;
  width: number;
};

async function finalizeClientVideoOverlayPasses(
  passes: VideoOverlayPass[],
  {
    height,
    videoBlurRegions,
    videoElement,
    width,
  }: Pick<
    BuildClientVideoOverlayPassesInput,
    "height" | "videoBlurRegions" | "videoElement" | "width"
  >,
) {
  let result = passes;

  if (
    videoBlurRegions?.some((region) => region.strokes.length > 0) &&
    videoElement
  ) {
    result = await appendVideoBlurRegionPasses(
      result,
      videoBlurRegions,
      videoElement,
      width,
      height,
      canvasToPngBytes,
    );
  }

  if (
    result.length === 0 ||
    !result.some((pass) => pass.overlayPngBytes.length > 0)
  ) {
    throw new VideoExportFailedError(
      "Could not prepare the watermark overlay for export.",
    );
  }

  return result;
}

function renderCaptionOverlayCanvas(
  caption: VideoCaptionLayer,
  height: number,
  width: number,
) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);

  if (!context) {
    throw new Error("Could not create caption overlay canvas.");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  drawVideoCaption(context, canvas.width, canvas.height, caption);

  return canvas;
}

function renderUntimedCaptionsOverlayCanvas(
  layers: VideoCaptionLayer[],
  height: number,
  width: number,
) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);

  if (!context) {
    throw new Error("Could not create caption overlay canvas.");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  for (const layer of getUntimedCaptionLayers(layers)) {
    drawVideoCaption(context, canvas.width, canvas.height, layer);
  }

  return canvas;
}

type WatermarkOverlayCanvasInput = Omit<WatermarkOnlyRenderInput, "context"> & {
  applyStaticFreeExportStamp?: boolean;
  includeCaptionOnPass?: boolean;
  videoCaptionLayers?: VideoCaptionLayer[];
};

async function appendTimedCaptionLayerPasses(
  passes: VideoOverlayPass[],
  layers: VideoCaptionLayer[] | undefined,
  durationSeconds: number,
  height: number,
  width: number,
) {
  const timedLayers = layers ? getTimedCaptionLayers(layers) : [];

  for (const layer of timedLayers) {
    const start = layer.visibleFromSeconds ?? 0;
    const end = layer.visibleUntilSeconds ?? durationSeconds;

    if (start >= end) {
      throw new VideoExportFailedError(
        "Set a valid caption visibility time range. Start must be before end.",
      );
    }

    const captionCanvas = renderCaptionOverlayCanvas(layer, height, width);

    passes.push({
      overlayPngBytes: await canvasToPngBytes(captionCanvas),
      visibleFromSeconds: start,
      visibleUntilSeconds: end,
    });
  }

  return passes;
}

async function buildClientVideoOverlayPasses({
  applyStaticFreeExportStamp = false,
  durationSeconds,
  height,
  settings,
  videoBlurRegions,
  videoCaptionLayers,
  videoElement,
  watermarkReferenceWidth,
  width,
}: BuildClientVideoOverlayPassesInput): Promise<VideoOverlayPass[]> {
  logRealVideoExport("STEP 10a/15: buildClientVideoOverlayPasses() entered", {
    applyStaticFreeExportStamp,
    durationSeconds,
    height,
    settings: summarizeWatermarkSettingsForExportLog(settings),
    width,
  });

  const untimedCaptionLayers = videoCaptionLayers
    ? getUntimedCaptionLayers(videoCaptionLayers)
    : [];
  const includeUntimedCaptions = untimedCaptionLayers.length > 0;

  if (settings.watermarkType !== "text") {
    const canvas = await renderWatermarkOverlayCanvas({
      ...settings,
      applyStaticFreeExportStamp,
      height,
      includeCaptionOnPass: includeUntimedCaptions,
      videoCaptionLayers: includeUntimedCaptions
        ? videoCaptionLayers
        : undefined,
      watermarkReferenceWidth,
      width,
    });

    logRealVideoExport("STEP 11/15: renderWatermarkOverlayCanvas() completed (non-text path)", {
      height,
      settings: summarizeWatermarkSettingsForExportLog(settings),
      width,
    });

    const passes = [{ overlayPngBytes: await canvasToPngBytes(canvas) }];
    const withCaption = await appendTimedCaptionLayerPasses(
      passes,
      videoCaptionLayers,
      durationSeconds,
      height,
      width,
    );

    if (
      withCaption.length === 0 ||
      !withCaption.some((pass) => pass.overlayPngBytes.length > 0)
    ) {
      if (videoCaptionLayers?.some((layer) => isCaptionLayerActive(layer))) {
        const captionOnlyPasses: VideoOverlayPass[] = [];

        if (untimedCaptionLayers.length > 0) {
          const untimedCanvas = renderUntimedCaptionsOverlayCanvas(
            videoCaptionLayers,
            height,
            width,
          );

          captionOnlyPasses.push({
            overlayPngBytes: await canvasToPngBytes(untimedCanvas),
          });
        }

        return finalizeClientVideoOverlayPasses(
          await appendTimedCaptionLayerPasses(
            captionOnlyPasses,
            videoCaptionLayers,
            durationSeconds,
            height,
            width,
          ),
          { height, videoBlurRegions, videoElement, width },
        );
      }

      if (videoBlurRegions?.some((region) => region.strokes.length > 0)) {
        return finalizeClientVideoOverlayPasses([], {
          height,
          videoBlurRegions,
          videoElement,
          width,
        });
      }

      throw new VideoExportFailedError(
        "Could not prepare the watermark overlay for export.",
      );
    }

    return finalizeClientVideoOverlayPasses(withCaption, {
      height,
      videoBlurRegions,
      videoElement,
      width,
    });
  }

  const textLayers = settings.textLayers ?? [];
  const timedLayers = textLayers.filter(hasVideoVisibilityRange);
  const untimedLayers = textLayers.filter(
    (layer) => !hasVideoVisibilityRange(layer),
  );

  if (timedLayers.length > 1) {
    throw new VideoExportFailedError(
      "Only one text watermark can have a visibility time range per export.",
    );
  }

  logRealVideoExport("STEP 10b/15: buildClientVideoOverlayPasses() text path", {
    settings: summarizeWatermarkSettingsForExportLog(settings),
    timedLayerCount: timedLayers.length,
    untimedLayerCount: untimedLayers.length,
  });

  const passes: VideoOverlayPass[] = [];

  const pushPass = async (
    layers: TextWatermarkLayer[],
    timing?: { end: number; start: number },
  ) => {
    if (!layers.some((layer) => layer.text.trim())) {
      return;
    }

    const canvas = await renderWatermarkOverlayCanvas({
      ...settings,
      applyStaticFreeExportStamp,
      height,
      includeCaptionOnPass: includeUntimedCaptions,
      textLayers: layers,
      videoCaptionLayers: includeUntimedCaptions
        ? videoCaptionLayers
        : undefined,
      watermarkReferenceWidth,
      width,
    });

    logRealVideoExport("STEP 11/15: renderWatermarkOverlayCanvas() completed for pass", {
      height,
      passLayerIds: layers.map((layer) => layer.id),
      passLayerTexts: layers.map((layer) => layer.text.slice(0, 80)),
      settings: summarizeWatermarkSettingsForExportLog({
        ...settings,
        textLayers: layers,
      }),
      width,
    });

    passes.push({
      overlayPngBytes: await canvasToPngBytes(canvas),
      ...(timing
        ? {
            visibleFromSeconds: timing.start,
            visibleUntilSeconds: timing.end,
          }
        : {}),
    });
  };

  const timedLayer = timedLayers[0];

  if (!timedLayer) {
    await pushPass(textLayers);

    const withCaption = await appendTimedCaptionLayerPasses(
      passes,
      videoCaptionLayers,
      durationSeconds,
      height,
      width,
    );

    if (withCaption.length === 0) {
      if (videoBlurRegions?.some((region) => region.strokes.length > 0)) {
        return finalizeClientVideoOverlayPasses([], {
          height,
          videoBlurRegions,
          videoElement,
          width,
        });
      }

      throw new VideoExportFailedError(
        "Could not prepare the watermark overlay for export.",
      );
    }

    return finalizeClientVideoOverlayPasses(withCaption, {
      height,
      videoBlurRegions,
      videoElement,
      width,
    });
  }

  const range = resolveVideoVisibilityRange(timedLayer, durationSeconds);

  if (!range || range.start >= range.end) {
    throw new VideoExportFailedError(
      "Set a valid visibility time range. Start must be before end.",
    );
  }

  await pushPass(untimedLayers);
  await pushPass([timedLayer], range);

  const withCaption = await appendTimedCaptionLayerPasses(
    passes,
    videoCaptionLayers,
    durationSeconds,
    height,
    width,
  );

  if (withCaption.length === 0) {
    if (videoBlurRegions?.some((region) => region.strokes.length > 0)) {
      return finalizeClientVideoOverlayPasses([], {
        height,
        videoBlurRegions,
        videoElement,
        width,
      });
    }

    throw new VideoExportFailedError(
      "Could not prepare the watermark overlay for export.",
    );
  }

  return finalizeClientVideoOverlayPasses(withCaption, {
    height,
    videoBlurRegions,
    videoElement,
    width,
  });
}

type WatermarkOverlayCanvasPaintInput = Omit<
  WatermarkOverlayCanvasInput,
  "height" | "width"
>;

async function paintWatermarkOverlayCanvasContent(
  context: CanvasRenderingContext2D,
  contentWidth: number,
  contentHeight: number,
  {
    activeLogoLayerId,
    activeTextLayerId,
    applyStaticFreeExportStamp = false,
    customPosition,
    fontFamily,
    fontSizeScale,
    fontWeight = DEFAULT_TEXT_WATERMARK_FONT_WEIGHT,
    includeCaptionOnPass = true,
    logoImage,
    logoLayers,
    textColor = DEFAULT_TEXT_WATERMARK_COLOR,
    textLayers,
    textShadowEnabled = DEFAULT_TEXT_SHADOW_ENABLED,
    tileAngle,
    tileDensity,
    tileGap,
    videoCaptionLayers,
    watermarkMode,
    watermarkOpacity,
    watermarkPosition,
    watermarkReferenceWidth,
    watermarkText,
    watermarkType,
  }: WatermarkOverlayCanvasPaintInput,
) {
  applyHighQualityCanvasDefaults(context);
  context.clearRect(0, 0, contentWidth, contentHeight);
  drawWatermarkOnly({
    activeLogoLayerId,
    activeTextLayerId,
    context,
    customPosition,
    fontFamily,
    fontSizeScale,
    fontWeight,
    height: contentHeight,
    logoImage,
    logoLayers,
    textColor,
    textLayers,
    textShadowEnabled,
    tileAngle,
    tileDensity,
    tileGap,
    watermarkMode,
    watermarkOpacity,
    watermarkPosition,
    watermarkReferenceWidth,
    watermarkText,
    watermarkType,
    width: contentWidth,
  });

  if (includeCaptionOnPass && videoCaptionLayers?.length) {
    for (const layer of getUntimedCaptionLayers(videoCaptionLayers)) {
      drawVideoCaption(context, contentWidth, contentHeight, layer);
    }
  }

  if (applyStaticFreeExportStamp) {
    await paintClientVideoFreeExportStamp(
      context,
      contentWidth,
      contentHeight,
    );
  }
}

async function renderWatermarkOverlayCanvas({
  activeLogoLayerId,
  activeTextLayerId,
  applyStaticFreeExportStamp = false,
  customPosition,
  fontFamily,
  fontSizeScale,
  fontWeight = DEFAULT_TEXT_WATERMARK_FONT_WEIGHT,
  height,
  includeCaptionOnPass = true,
  logoImage,
  logoLayers,
  textColor = DEFAULT_TEXT_WATERMARK_COLOR,
  textLayers,
  textShadowEnabled = DEFAULT_TEXT_SHADOW_ENABLED,
  tileAngle,
  tileDensity,
  tileGap,
  videoCaptionLayers,
  watermarkMode,
  watermarkOpacity,
  watermarkPosition,
  watermarkReferenceWidth,
  watermarkText,
  watermarkType,
  width,
}: WatermarkOverlayCanvasInput) {
  const logicalWidth = Math.max(1, width);
  const logicalHeight = Math.max(1, height);
  const watermarkScale = getImageWatermarkExportScale(
    logicalWidth,
    logicalHeight,
  );
  const paintInput: WatermarkOverlayCanvasPaintInput = {
    activeLogoLayerId,
    activeTextLayerId,
    applyStaticFreeExportStamp,
    customPosition,
    fontFamily,
    fontSizeScale,
    fontWeight,
    includeCaptionOnPass,
    logoImage,
    logoLayers,
    textColor,
    textLayers,
    textShadowEnabled,
    tileAngle,
    tileDensity,
    tileGap,
    videoCaptionLayers,
    watermarkMode,
    watermarkOpacity,
    watermarkPosition,
    watermarkReferenceWidth,
    watermarkText,
    watermarkType,
  };

  const canvas = document.createElement("canvas");
  canvas.width = logicalWidth;
  canvas.height = logicalHeight;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create watermark overlay canvas.");
  }

  if (watermarkScale > 1) {
    const supersampleCanvas = document.createElement("canvas");
    supersampleCanvas.width = logicalWidth * watermarkScale;
    supersampleCanvas.height = logicalHeight * watermarkScale;
    const supersampleContext = supersampleCanvas.getContext("2d");

    if (!supersampleContext) {
      throw new Error("Could not create watermark overlay supersample canvas.");
    }

    supersampleContext.scale(watermarkScale, watermarkScale);
    await paintWatermarkOverlayCanvasContent(
      supersampleContext,
      logicalWidth,
      logicalHeight,
      paintInput,
    );

    applyHighQualityCanvasDefaults(context);
    context.clearRect(0, 0, logicalWidth, logicalHeight);
    context.drawImage(
      supersampleCanvas,
      0,
      0,
      logicalWidth,
      logicalHeight,
    );
  } else {
    await paintWatermarkOverlayCanvasContent(
      context,
      logicalWidth,
      logicalHeight,
      paintInput,
    );
  }

  logRealVideoExport("STEP 11a/15: renderWatermarkOverlayCanvas() painted pixels", {
    applyStaticFreeExportStamp,
    centerAlpha: context.getImageData(
      Math.floor(canvas.width / 2),
      Math.floor(canvas.height / 2),
      1,
      1,
    ).data[3],
    height: canvas.height,
    textLayerCount: textLayers?.length ?? 0,
    watermarkScale,
    watermarkType,
    width: canvas.width,
  });

  return canvas;
}

async function canvasToPngBytes(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });

  if (!blob) {
    throw new Error("Could not create watermark overlay PNG.");
  }

  return new Uint8Array(await blob.arrayBuffer());
}

type PdfTilePageWatermarkInput = Omit<
  PdfPageWatermarkOverlayInput,
  "canvasSize" | "pageHeight" | "pageWidth"
>;

async function renderPdfOrientedTileUnitPng({
  angleDegrees,
  drawable,
  exportScale,
  tileHeight,
  tileWidth,
}: {
  angleDegrees: TileAngle;
  drawable: DrawableWatermark;
  exportScale: number;
  tileHeight: number;
  tileWidth: number;
}) {
  const orientedBounds = getOrientedTileUnitBounds(
    tileWidth,
    tileHeight,
    angleDegrees,
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(orientedBounds.width * exportScale));
  canvas.height = Math.max(1, Math.round(orientedBounds.height * exportScale));
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create tile unit canvas.");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.scale(exportScale, exportScale);
  context.translate(orientedBounds.width / 2, orientedBounds.height / 2);
  context.rotate((-angleDegrees * Math.PI) / 180);
  applyHighQualityCanvasDefaults(context);
  drawWatermarkDrawable({
    alpha: 1,
    context,
    drawable,
    textAlign: "center",
    textBaseline: "middle",
    x: 0,
    y: 0,
  });

  return {
    pngBytes: await canvasToPngBytes(canvas),
    unitHeightPoints: orientedBounds.height,
    unitWidthPoints: orientedBounds.width,
  };
}

async function buildPdfTilePageWatermark(
  pageWidth: number,
  pageHeight: number,
  watermarkInput: PdfTilePageWatermarkInput,
  canvasSize: CanvasSize,
): Promise<PdfTilePatternWatermark> {
  const pageW = Math.max(1, Math.floor(pageWidth));
  const pageH = Math.max(1, Math.floor(pageHeight));
  const exportScale = getPdfWatermarkExportScale(pageW, pageH);
  const previewImageScale = Math.min(
    canvasSize.width / pageW,
    canvasSize.height / pageH,
  );
  const previewDisplayWidth = pageW * previewImageScale;
  const displayScale = pageW / previewDisplayWidth;
  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d");

  if (!measureContext) {
    throw new Error("Could not measure PDF tile watermark.");
  }

  let fontFamily = watermarkInput.fontFamily;
  let fontSizeScale = watermarkInput.fontSizeScale;
  let logoImage = watermarkInput.logoImage;
  let opacity = watermarkInput.watermarkOpacity;
  let textColor = DEFAULT_TEXT_WATERMARK_COLOR;
  let textShadowEnabled = DEFAULT_TEXT_SHADOW_ENABLED;
  let watermarkText = watermarkInput.watermarkText;
  let fontWeight = DEFAULT_TEXT_WATERMARK_FONT_WEIGHT;
  let drawableType = watermarkInput.watermarkType;

  if (watermarkInput.watermarkType === "logo") {
    const activeLayer = (watermarkInput.logoLayers ?? []).find(
      (layer) => layer.id === watermarkInput.activeLogoLayerId,
    );

    if (activeLayer) {
      fontSizeScale = activeLayer.fontSizeScale;
      logoImage = activeLayer.logoImage;
      opacity = activeLayer.opacity;
    }
  } else if (watermarkInput.watermarkType === "text") {
    const activeLayer = (watermarkInput.textLayers ?? []).find(
      (layer) => layer.id === watermarkInput.activeTextLayerId,
    );

    if (activeLayer) {
      fontFamily = activeLayer.fontFamily;
      fontSizeScale = activeLayer.fontSizeScale;
      fontWeight = activeLayer.fontWeight ?? DEFAULT_TEXT_WATERMARK_FONT_WEIGHT;
      opacity = activeLayer.opacity;
      textColor = activeLayer.textColor ?? DEFAULT_TEXT_WATERMARK_COLOR;
      textShadowEnabled =
        activeLayer.textShadowEnabled ?? DEFAULT_TEXT_SHADOW_ENABLED;
      watermarkText = activeLayer.text;
    }
  } else if (watermarkInput.watermarkType === "signature") {
    drawableType = "logo";
    logoImage = watermarkInput.logoImage;
  }

  const drawable = getDrawableWatermark({
    context: measureContext,
    displayScale,
    fontFamily,
    fontSizeScale,
    fontWeight,
    imageWidth: pageW,
    logoImage,
    textColor,
    textShadowEnabled,
    watermarkReferenceWidth: previewDisplayWidth,
    watermarkText,
    watermarkType: drawableType,
  });

  if (!drawable) {
    throw new Error("Could not build PDF tile watermark drawable.");
  }

  const orientedUnit = await renderPdfOrientedTileUnitPng({
    angleDegrees: watermarkInput.tileAngle,
    drawable,
    exportScale,
    tileHeight: drawable.height,
    tileWidth: drawable.width,
  });

  return {
    angleDegrees: watermarkInput.tileAngle,
    centers: computePdfTileCenters({
      angleDegrees: watermarkInput.tileAngle,
      density: watermarkInput.tileDensity,
      gapPercent: watermarkInput.tileGap,
      pageHeight: pageH,
      pageWidth: pageW,
      tileHeight: drawable.height,
      tileWidth: drawable.width,
    }),
    kind: "tilePattern",
    opacity: opacity / 100,
    unitHeightPoints: orientedUnit.unitHeightPoints,
    unitPngBytes: orientedUnit.pngBytes,
    unitWidthPoints: orientedUnit.unitWidthPoints,
  };
}

function paintWatermarkOnExportCanvas({
  activeLogoLayerId,
  activeTextLayerId,
  canvasHeight,
  canvasWidth,
  context,
  customPosition,
  fontFamily,
  fontSizeScale,
  logoImage,
  logoLayers,
  resolveCustomPosition,
  textLayers,
  tileAngle,
  tileDensity,
  tileGap,
  watermarkMode,
  watermarkOpacity,
  watermarkPosition,
  watermarkReferenceWidth,
  watermarkText,
  watermarkType,
  includeForcedTilePattern = false,
}: {
  activeLogoLayerId: string;
  activeTextLayerId: string;
  canvasHeight: number;
  canvasWidth: number;
  context: CanvasRenderingContext2D;
  customPosition: CustomPosition | null;
  fontFamily: string;
  fontSizeScale: number;
  logoImage: HTMLImageElement | null;
  logoLayers: LogoWatermarkLayer[];
  resolveCustomPosition?: WatermarkLayerPaintInput["resolveCustomPosition"];
  textLayers: TextWatermarkLayer[];
  tileAngle: TileAngle;
  tileDensity: TileDensity;
  tileGap: number;
  watermarkMode: WatermarkMode;
  watermarkOpacity: number;
  watermarkPosition: WatermarkPosition;
  watermarkReferenceWidth: number;
  watermarkText: string;
  watermarkType: WatermarkType;
  includeForcedTilePattern?: boolean;
}) {
  applyHighQualityCanvasDefaults(context);

  paintWatermarkLayers({
    activeLayerId:
      watermarkType === "text"
        ? activeTextLayerId
        : watermarkType === "logo"
          ? activeLogoLayerId
          : activeTextLayerId,
    canvasHeight,
    canvasWidth,
    context,
    imageHeight: canvasHeight,
    imageWidth: canvasWidth,
    imageX: 0,
    imageY: 0,
    includeForcedTilePattern,
    logoLayers,
    resolveCustomPosition,
    signatureCustomPosition: customPosition,
    signatureFontSizeScale: fontSizeScale,
    signatureImage: watermarkType === "signature" ? logoImage : null,
    signatureOpacity: watermarkOpacity,
    signaturePosition: watermarkPosition,
    textLayers,
    tileAngle,
    tileDensity,
    tileGap,
    watermarkMode,
    watermarkReferenceWidth,
    watermarkType,
  });
}

function renderExportCanvas({
  activeLogoLayerId,
  activeTextLayerId,
  blurStrokes,
  customPosition,
  fontFamily,
  fontSizeScale,
  image,
  imageEffectSettings,
  logoImage,
  logoLayers,
  previewCanvasSize,
  referenceImageSize,
  resizeHeight,
  resizeWidth,
  rotationAngle,
  textLayers,
  tileAngle,
  tileDensity,
  tileGap,
  useResizePreview,
  watermarkMode,
  watermarkOpacity,
  watermarkPosition,
  watermarkText,
  watermarkType,
}: ExportRenderInput) {
  const sourceWidth =
    useResizePreview && resizeWidth > 0 ? resizeWidth : image.naturalWidth;
  const sourceHeight =
    useResizePreview && resizeHeight > 0 ? resizeHeight : image.naturalHeight;
  const outputBounds = getRotatedBounds(sourceWidth, sourceHeight, rotationAngle);
  const logicalWidth = Math.max(1, Math.ceil(outputBounds.width));
  const logicalHeight = Math.max(1, Math.ceil(outputBounds.height));
  const previewFrame = computeLetterboxedPreviewImageFrame({
    canvasHeight: previewCanvasSize.height,
    canvasWidth: previewCanvasSize.width,
    previewImageHeight: sourceHeight,
    previewImageWidth: sourceWidth,
    referenceHeight: referenceImageSize.height,
    referenceWidth: referenceImageSize.width,
    rotationAngle,
  });
  const resolveCustomPosition = (position: CustomPosition) =>
    mapPreviewCustomPositionToExportSpace(
      position,
      previewCanvasSize.width,
      previewCanvasSize.height,
      previewFrame,
      logicalWidth,
      logicalHeight,
    );
  const outputScale = getImageExportOutputScale(logicalWidth, logicalHeight);
  const exportCanvas = document.createElement("canvas");
  const context = exportCanvas.getContext("2d");

  exportCanvas.width = logicalWidth * outputScale;
  exportCanvas.height = logicalHeight * outputScale;

  if (!context) {
    exportCanvas.width = logicalWidth;
    exportCanvas.height = logicalHeight;
    return exportCanvas;
  }

  applyHighQualityCanvasDefaults(context);
  context.scale(outputScale, outputScale);
  context.fillStyle = "#DCDCDD";
  context.fillRect(0, 0, logicalWidth, logicalHeight);
  context.save();
  context.translate(logicalWidth / 2, logicalHeight / 2);
  context.rotate((rotationAngle * Math.PI) / 180);
  const effectedCanvas = document.createElement("canvas");
  effectedCanvas.width = sourceWidth;
  effectedCanvas.height = sourceHeight;
  const effectedContext = effectedCanvas.getContext("2d");

  if (effectedContext) {
    drawBaseImageWithEffect(
      effectedContext,
      image,
      0,
      0,
      sourceWidth,
      sourceHeight,
      imageEffectSettings,
    );
    context.drawImage(
      effectedCanvas,
      -sourceWidth / 2,
      -sourceHeight / 2,
      sourceWidth,
      sourceHeight,
    );
    applyBlurStrokes(context, {
      destHeight: sourceHeight,
      destWidth: sourceWidth,
      destX: -sourceWidth / 2,
      destY: -sourceHeight / 2,
      source: effectedCanvas,
      sourceHeight,
      sourceWidth,
      strokes: blurStrokes,
    });
  } else {
    drawBaseImageWithEffect(
      context,
      image,
      -sourceWidth / 2,
      -sourceHeight / 2,
      sourceWidth,
      sourceHeight,
      imageEffectSettings,
    );
  }
  context.restore();

  const watermarkInput = {
    activeLogoLayerId,
    activeTextLayerId,
    canvasHeight: logicalHeight,
    canvasWidth: logicalWidth,
    customPosition,
    fontFamily,
    fontSizeScale,
    logoImage,
    logoLayers,
    resolveCustomPosition,
    textLayers,
    tileAngle,
    tileDensity,
    tileGap,
    watermarkMode,
    watermarkOpacity,
    watermarkPosition,
    watermarkReferenceWidth: previewFrame.width,
    watermarkText,
    watermarkType,
    includeForcedTilePattern: hasForcedWatermarkOverlay({ logoLayers }),
  };
  const watermarkScale = getImageWatermarkExportScale(logicalWidth, logicalHeight);

  if (watermarkScale > 1) {
    const overlayCanvas = document.createElement("canvas");
    overlayCanvas.width = logicalWidth * watermarkScale;
    overlayCanvas.height = logicalHeight * watermarkScale;
    const overlayContext = overlayCanvas.getContext("2d");

    if (overlayContext) {
      applyHighQualityCanvasDefaults(overlayContext);
      overlayContext.scale(watermarkScale, watermarkScale);
      paintWatermarkOnExportCanvas({
        ...watermarkInput,
        context: overlayContext,
      });
      context.drawImage(overlayCanvas, 0, 0, logicalWidth, logicalHeight);
    } else {
      paintWatermarkOnExportCanvas({
        ...watermarkInput,
        context,
      });
    }
  } else {
    paintWatermarkOnExportCanvas({
      ...watermarkInput,
      context,
    });
  }

  return exportCanvas;
}

type PdfPageSignatureRenderInput = {
  customPosition: CustomPosition | null;
  fontSizeScale: number;
  id: string;
  image: HTMLImageElement;
  opacity: number;
  watermarkPosition: WatermarkPosition;
};

type PdfPageWatermarkOverlayInput = Omit<
  WatermarkOverlayCanvasInput,
  "height" | "width"
> & {
  canvasSize: CanvasSize;
  pageFillFields?: PdfFillTextField[];
  pageHeight: number;
  pageSignatures?: PdfPageSignatureRenderInput[];
  pageWidth: number;
};

function renderWatermarkOverlayForPdfPage({
  activeLogoLayerId,
  activeTextLayerId,
  canvasSize,
  customPosition,
  fontFamily,
  fontSizeScale,
  logoImage,
  logoLayers,
  pageFillFields = [],
  pageHeight,
  pageSignatures = [],
  pageWidth,
  textLayers,
  tileAngle,
  tileDensity,
  tileGap,
  watermarkMode,
  watermarkOpacity,
  watermarkPosition,
  watermarkText,
  watermarkType,
}: PdfPageWatermarkOverlayInput) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const pageW = Math.max(1, Math.floor(pageWidth));
  const pageH = Math.max(1, Math.floor(pageHeight));
  const exportScale = getPdfWatermarkExportScale(pageW, pageH);

  canvas.width = pageW * exportScale;
  canvas.height = pageH * exportScale;

  if (!context) {
    throw new Error("Could not create watermark overlay canvas.");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.scale(exportScale, exportScale);

  const imageScale = Math.min(
    canvasSize.width / pageW,
    canvasSize.height / pageH,
  );
  const imageWidth = pageW * imageScale;
  const imageHeight = pageH * imageScale;
  const imageX = (canvasSize.width - imageWidth) / 2;
  const imageY = (canvasSize.height - imageHeight) / 2;
  const previewFrame = { height: imageHeight, width: imageWidth, x: imageX, y: imageY };
  const signatureImage =
    watermarkType === "signature" && pageSignatures.length === 0
      ? logoImage
      : null;
  const signatureCustomPosition =
    pageSignatures.length > 0 ? null : customPosition;
  const signatureFontSizeScale = fontSizeScale;
  const signatureOpacity = watermarkOpacity;
  const signaturePosition = watermarkPosition;
  const signaturePlacementsForPaint = pageSignatures.length
    ? pageSignatures.map((placement) => ({
        customPosition: placement.customPosition,
        fontSizeScale: placement.fontSizeScale,
        id: placement.id,
        image: placement.image,
        isActive: false,
        opacity: placement.opacity,
        watermarkPosition: placement.watermarkPosition,
      }))
    : undefined;

  paintWatermarkLayers({
    activeLayerId:
      watermarkType === "text"
        ? (activeTextLayerId ?? "")
        : watermarkType === "logo"
          ? (activeLogoLayerId ?? "")
          : (activeTextLayerId ?? ""),
    canvasHeight: canvasSize.height,
    canvasWidth: canvasSize.width,
    context,
    imageHeight: pageH,
    imageWidth: pageW,
    imageX: 0,
    imageY: 0,
    logoLayers: logoLayers ?? [],
    resolveCustomPosition: (position) =>
      mapPreviewCustomPositionToExportSpace(
        position,
        canvasSize.width,
        canvasSize.height,
        previewFrame,
        pageW,
        pageH,
      ),
    signatureCustomPosition,
    signatureFontSizeScale,
    signatureImage,
    signatureOpacity,
    signaturePlacements: signaturePlacementsForPaint,
    signaturePosition,
    textLayers: textLayers ?? [],
    tileAngle,
    tileDensity,
    tileGap,
    watermarkMode,
    watermarkReferenceWidth: previewFrame.width,
    watermarkType:
      signaturePlacementsForPaint?.length ? "signature" : watermarkType,
    includeForcedTilePattern: false,
  });

  if (pageFillFields.length) {
    paintFillFieldsForPdfExport({
      canvasSize,
      context,
      fields: pageFillFields,
      pageHeight: pageH,
      pageWidth: pageW,
    });
  }

  return canvas;
}

function getExportFileName(fileName: string) {
  const fallbackName = "watermarked-image";
  const rawBase = fileName.trim()
    ? fileName.replace(/\.[^/.]+$/, "")
    : fallbackName;
  const baseName = sanitizeDownloadFileName(rawBase, fallbackName);

  return `${baseName}-watermarked.jpg`;
}

function areWatermarkSnapshotsEqual(
  first: WatermarkSettingsSnapshot,
  second: WatermarkSettingsSnapshot,
) {
  return (
    first.activeLogoLayerId === second.activeLogoLayerId &&
    first.activeTextLayerId === second.activeTextLayerId &&
    first.backgroundRemovedLogoImage === second.backgroundRemovedLogoImage &&
    (first.blurBrushSize ?? "medium") === (second.blurBrushSize ?? "medium") &&
    areBlurStrokesEqual(first.blurStrokes ?? [], second.blurStrokes ?? []) &&
    areCustomPositionsEqual(first.customPosition, second.customPosition) &&
    first.fontFamily === second.fontFamily &&
    first.fontSizeScale === second.fontSizeScale &&
    first.isLogoBackgroundRemoved === second.isLogoBackgroundRemoved &&
    first.logoFileName === second.logoFileName &&
    first.logoImage === second.logoImage &&
    areLogoLayersSnapshotEqual(
      first.logoLayers ?? [],
      second.logoLayers ?? [],
    ) &&
    first.originalLogoImage === second.originalLogoImage &&
    areTextLayersSnapshotEqual(
      first.textLayers ?? [],
      second.textLayers ?? [],
    ) &&
    first.tileAngle === second.tileAngle &&
    first.tileDensity === second.tileDensity &&
    first.tileGap === second.tileGap &&
    first.watermarkMode === second.watermarkMode &&
    first.watermarkOpacity === second.watermarkOpacity &&
    first.watermarkPosition === second.watermarkPosition &&
    first.watermarkText === second.watermarkText &&
    first.watermarkType === second.watermarkType &&
    first.pdfDocumentTool === second.pdfDocumentTool &&
    arePdfPageFillMapsEqual(first.pdfPageFillMap, second.pdfPageFillMap) &&
    arePdfPageSignatureMapsEqual(first.pdfPageSignatures, second.pdfPageSignatures)
  );
}

function arePdfPageFillMapsEqual(
  first?: ReturnType<typeof serializePdfPageFillMap>,
  second?: ReturnType<typeof serializePdfPageFillMap>,
) {
  if (!first && !second) {
    return true;
  }

  if (!first || !second) {
    return false;
  }

  const firstKeys = Object.keys(first);
  const secondKeys = Object.keys(second);

  if (firstKeys.length !== secondKeys.length) {
    return false;
  }

  return firstKeys.every((key) => {
    const left = first[key] ?? [];
    const right = second[key] ?? [];

    if (left.length !== right.length) {
      return false;
    }

    return left.every((field, index) => {
      const other = right[index];

      return (
        field.id === other.id &&
        field.text === other.text &&
        field.color === other.color &&
        field.fontFamily === other.fontFamily &&
        field.fontSize === other.fontSize &&
        field.heightPercent === other.heightPercent &&
        field.widthPercent === other.widthPercent &&
        field.xPercent === other.xPercent &&
        field.yPercent === other.yPercent
      );
    });
  });
}

function arePdfPageSignatureMapsEqual(
  first?: ReturnType<typeof serializePdfPageSignatureMap>,
  second?: ReturnType<typeof serializePdfPageSignatureMap>,
) {
  if (!first && !second) {
    return true;
  }

  if (!first || !second) {
    return false;
  }

  const firstKeys = Object.keys(first);
  const secondKeys = Object.keys(second);

  if (firstKeys.length !== secondKeys.length) {
    return false;
  }

  return firstKeys.every((key) => {
    const left = first[key] ?? [];
    const right = second[key] ?? [];

    if (left.length !== right.length) {
      return false;
    }

    return left.every((placement, index) => {
      const other = right[index];

      return (
        placement.id === other.id &&
        placement.signatureId === other.signatureId &&
        areCustomPositionsEqual(placement.customPosition, other.customPosition) &&
        placement.fontSizeScale === other.fontSizeScale &&
        placement.opacity === other.opacity &&
        placement.watermarkPosition === other.watermarkPosition
      );
    });
  });
}

function areTextLayersSnapshotEqual(
  first: TextWatermarkLayer[],
  second: TextWatermarkLayer[],
) {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((layer, index) => {
    const other = second[index];

    return (
      layer.id === other.id &&
      layer.text === other.text &&
      layer.fontFamily === other.fontFamily &&
      layer.fontSizeScale === other.fontSizeScale &&
      (layer.fontWeight ?? DEFAULT_TEXT_WATERMARK_FONT_WEIGHT) ===
        (other.fontWeight ?? DEFAULT_TEXT_WATERMARK_FONT_WEIGHT) &&
      (layer.textColor ?? DEFAULT_TEXT_WATERMARK_COLOR) ===
        (other.textColor ?? DEFAULT_TEXT_WATERMARK_COLOR) &&
      (layer.textShadowEnabled ?? DEFAULT_TEXT_SHADOW_ENABLED) ===
        (other.textShadowEnabled ?? DEFAULT_TEXT_SHADOW_ENABLED) &&
      layer.opacity === other.opacity &&
      layer.watermarkPosition === other.watermarkPosition &&
      areCustomPositionsEqual(layer.customPosition, other.customPosition)
    );
  });
}

function areLogoLayersSnapshotEqual(
  first: LogoWatermarkLayer[],
  second: LogoWatermarkLayer[],
) {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((layer, index) => {
    const other = second[index];

    return (
      layer.id === other.id &&
      layer.logoFileName === other.logoFileName &&
      layer.fontSizeScale === other.fontSizeScale &&
      layer.opacity === other.opacity &&
      layer.watermarkPosition === other.watermarkPosition &&
      layer.isLogoBackgroundRemoved === other.isLogoBackgroundRemoved &&
      layer.logoImage === other.logoImage &&
      layer.originalLogoImage === other.originalLogoImage &&
      layer.backgroundRemovedLogoImage === other.backgroundRemovedLogoImage &&
      areCustomPositionsEqual(layer.customPosition, other.customPosition)
    );
  });
}

function areCustomPositionsEqual(
  first: CustomPosition | null,
  second: CustomPosition | null,
) {
  if (!first || !second) {
    return first === second;
  }

  return first.xPercent === second.xPercent && first.yPercent === second.yPercent;
}

function normalizeCropRect(cropRect: CropRect, image: HTMLImageElement) {
  const x = clamp(cropRect.x, 0, image.naturalWidth);
  const y = clamp(cropRect.y, 0, image.naturalHeight);
  const width = clamp(cropRect.width, 1, image.naturalWidth - x);
  const height = clamp(cropRect.height, 1, image.naturalHeight - y);

  return { height, width, x, y };
}

function getCropHandleAtPoint(
  point: { x: number; y: number },
  cropRect: CropRect,
  image: HTMLImageElement,
): CropDragMode | null {
  const handleSize = Math.max(image.naturalWidth, image.naturalHeight) * 0.04;
  const handles: { mode: CropDragMode; x: number; y: number }[] = [
    { mode: "resize-top-left", x: cropRect.x, y: cropRect.y },
    {
      mode: "resize-top",
      x: cropRect.x + cropRect.width / 2,
      y: cropRect.y,
    },
    { mode: "resize-top-right", x: cropRect.x + cropRect.width, y: cropRect.y },
    {
      mode: "resize-right",
      x: cropRect.x + cropRect.width,
      y: cropRect.y + cropRect.height / 2,
    },
    {
      mode: "resize-bottom-left",
      x: cropRect.x,
      y: cropRect.y + cropRect.height,
    },
    {
      mode: "resize-bottom",
      x: cropRect.x + cropRect.width / 2,
      y: cropRect.y + cropRect.height,
    },
    {
      mode: "resize-bottom-right",
      x: cropRect.x + cropRect.width,
      y: cropRect.y + cropRect.height,
    },
    {
      mode: "resize-left",
      x: cropRect.x,
      y: cropRect.y + cropRect.height / 2,
    },
  ];

  return (
    handles.find(
      (handle) =>
        Math.abs(point.x - handle.x) <= handleSize &&
        Math.abs(point.y - handle.y) <= handleSize,
    )?.mode ?? null
  );
}

function createDefaultCropRect(image: HTMLImageElement): CropRect {
  return {
    height: image.naturalHeight,
    width: image.naturalWidth,
    x: 0,
    y: 0,
  };
}

function constrainCropRectToAspectRatio(
  rect: CropRect,
  image: HTMLImageElement,
  aspectRatio: number,
): CropRect {
  let { height, width, x, y } = rect;

  if (height <= 0 || width <= 0 || aspectRatio <= 0) {
    return rect;
  }

  const currentRatio = width / height;

  if (currentRatio > aspectRatio) {
    width = height * aspectRatio;
  } else {
    height = width / aspectRatio;
  }

  width = Math.max(1, Math.min(width, image.naturalWidth));
  height = Math.max(1, Math.min(height, image.naturalHeight));
  x = clamp(x, 0, Math.max(0, image.naturalWidth - width));
  y = clamp(y, 0, Math.max(0, image.naturalHeight - height));

  return { height, width, x, y };
}

function getNextCropRect({
  drag,
  image,
  point,
}: {
  drag: {
    aspectRatio?: number;
    mode: CropDragMode;
    origin: { x: number; y: number };
    rect: CropRect;
  };
  image: HTMLImageElement;
  point: { x: number; y: number };
}) {
  const deltaX = point.x - drag.origin.x;
  const deltaY = point.y - drag.origin.y;

  if (drag.mode === "move") {
    return {
      ...drag.rect,
      x: clamp(drag.rect.x + deltaX, 0, image.naturalWidth - drag.rect.width),
      y: clamp(drag.rect.y + deltaY, 0, image.naturalHeight - drag.rect.height),
    };
  }

  if (drag.mode === "new") {
    return rectFromPoints(drag.origin, point, image);
  }

  const resizesLeft =
    drag.mode === "resize-left" ||
    drag.mode === "resize-top-left" ||
    drag.mode === "resize-bottom-left";
  const resizesRight =
    drag.mode === "resize-right" ||
    drag.mode === "resize-top-right" ||
    drag.mode === "resize-bottom-right";
  const resizesTop =
    drag.mode === "resize-top" ||
    drag.mode === "resize-top-left" ||
    drag.mode === "resize-top-right";
  const resizesBottom =
    drag.mode === "resize-bottom" ||
    drag.mode === "resize-bottom-left" ||
    drag.mode === "resize-bottom-right";
  const left = resizesLeft ? point.x : drag.rect.x;
  const right = resizesRight ? point.x : drag.rect.x + drag.rect.width;
  const top = resizesTop ? point.y : drag.rect.y;
  const bottom = resizesBottom ? point.y : drag.rect.y + drag.rect.height;

  const nextRect = rectFromPoints({ x: left, y: top }, { x: right, y: bottom }, image);

  if (drag.aspectRatio) {
    return constrainCropRectToAspectRatio(nextRect, image, drag.aspectRatio);
  }

  return nextRect;
}

function rectFromPoints(
  start: { x: number; y: number },
  end: { x: number; y: number },
  image: HTMLImageElement,
) {
  const x = clamp(Math.min(start.x, end.x), 0, image.naturalWidth);
  const y = clamp(Math.min(start.y, end.y), 0, image.naturalHeight);
  const right = clamp(Math.max(start.x, end.x), 0, image.naturalWidth);
  const bottom = clamp(Math.max(start.y, end.y), 0, image.naturalHeight);

  return {
    height: Math.max(1, bottom - y),
    width: Math.max(1, right - x),
    x,
    y,
  };
}

const EDITOR_SIGNAL_COLOR = "#D97757";

function drawCropOverlay({
  context,
  cropRect,
  frame,
  image,
  isActive,
}: {
  context: CanvasRenderingContext2D;
  cropRect: CropRect | null;
  frame: ImageFrame;
  image: HTMLImageElement;
  isActive: boolean;
}) {
  if (!isActive) {
    return;
  }

  context.save();

  if (!cropRect) {
    context.restore();
    return;
  }

  const rect = cropRectToCanvas(cropRect, frame, image);

  context.fillStyle = "rgba(0, 0, 0, 0.45)";
  context.fillRect(frame.x, frame.y, frame.width, rect.y - frame.y);
  context.fillRect(
    frame.x,
    rect.y + rect.height,
    frame.width,
    frame.y + frame.height - (rect.y + rect.height),
  );
  context.fillRect(frame.x, rect.y, rect.x - frame.x, rect.height);
  context.fillRect(
    rect.x + rect.width,
    rect.y,
    frame.x + frame.width - (rect.x + rect.width),
    rect.height,
  );

  context.strokeStyle = "rgba(217, 119, 87, 0.55)";
  context.lineWidth = 1;
  for (let index = 1; index <= 2; index += 1) {
    const vertical = rect.x + (rect.width * index) / 3;
    const horizontal = rect.y + (rect.height * index) / 3;
    context.beginPath();
    context.moveTo(vertical, rect.y);
    context.lineTo(vertical, rect.y + rect.height);
    context.stroke();
    context.beginPath();
    context.moveTo(rect.x, horizontal);
    context.lineTo(rect.x + rect.width, horizontal);
    context.stroke();
  }

  context.strokeStyle = EDITOR_SIGNAL_COLOR;
  context.lineWidth = 2;
  context.strokeRect(rect.x, rect.y, rect.width, rect.height);
  drawCropHandle(context, rect.x, rect.y, EDITOR_SIGNAL_COLOR);
  drawCropHandle(context, rect.x + rect.width / 2, rect.y, EDITOR_SIGNAL_COLOR);
  drawCropHandle(context, rect.x + rect.width, rect.y, EDITOR_SIGNAL_COLOR);
  drawCropHandle(
    context,
    rect.x + rect.width,
    rect.y + rect.height / 2,
    EDITOR_SIGNAL_COLOR,
  );
  drawCropHandle(context, rect.x, rect.y + rect.height / 2, EDITOR_SIGNAL_COLOR);
  drawCropHandle(context, rect.x, rect.y + rect.height, EDITOR_SIGNAL_COLOR);
  drawCropHandle(
    context,
    rect.x + rect.width / 2,
    rect.y + rect.height,
    EDITOR_SIGNAL_COLOR,
  );
  drawCropHandle(
    context,
    rect.x + rect.width,
    rect.y + rect.height,
    EDITOR_SIGNAL_COLOR,
  );

  context.restore();
}

function cropRectToCanvas(
  cropRect: CropRect,
  frame: ImageFrame,
  image: HTMLImageElement,
) {
  return {
    height: (cropRect.height / image.naturalHeight) * frame.height,
    width: (cropRect.width / image.naturalWidth) * frame.width,
    x: frame.x + (cropRect.x / image.naturalWidth) * frame.width,
    y: frame.y + (cropRect.y / image.naturalHeight) * frame.height,
  };
}

function drawCropHandle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  fillColor = "#FFFFFF",
) {
  context.fillStyle = fillColor;
  context.strokeStyle =
    fillColor === "#FFFFFF"
      ? "rgba(0, 0, 0, 0.25)"
      : "rgba(255, 255, 255, 0.85)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(x, y, 6, 0, Math.PI * 2);
  context.fill();
  context.stroke();
}

const MAX_RESIZE_DIMENSION = 16384;

function getResizeHandleAtPoint(
  point: { x: number; y: number },
  resizeWidth: number,
  resizeHeight: number,
): CropDragMode | null {
  const handleSize = Math.max(resizeWidth, resizeHeight) * 0.04;
  const handles: { mode: CropDragMode; x: number; y: number }[] = [
    { mode: "resize-top-left", x: 0, y: 0 },
    { mode: "resize-top", x: resizeWidth / 2, y: 0 },
    { mode: "resize-top-right", x: resizeWidth, y: 0 },
    { mode: "resize-right", x: resizeWidth, y: resizeHeight / 2 },
    { mode: "resize-bottom-left", x: 0, y: resizeHeight },
    { mode: "resize-bottom", x: resizeWidth / 2, y: resizeHeight },
    { mode: "resize-bottom-right", x: resizeWidth, y: resizeHeight },
    { mode: "resize-left", x: 0, y: resizeHeight / 2 },
  ];

  return (
    handles.find(
      (handle) =>
        Math.abs(point.x - handle.x) <= handleSize &&
        Math.abs(point.y - handle.y) <= handleSize,
    )?.mode ?? null
  );
}

function getNextResizeDimensions({
  drag,
  image,
  isAspectRatioLocked,
  point,
}: {
  drag: {
    mode: CropDragMode;
    origin: { x: number; y: number };
    startHeight: number;
    startWidth: number;
  };
  image: HTMLImageElement;
  isAspectRatioLocked: boolean;
  point: { x: number; y: number };
}) {
  const rect = {
    height: drag.startHeight,
    width: drag.startWidth,
    x: 0,
    y: 0,
  };
  const nextRect = getNextResizeRect({
    drag: {
      mode: drag.mode,
      origin: drag.origin,
      rect,
    },
    point,
  });
  let width = clampResizeDimension(nextRect.width);
  let height = clampResizeDimension(nextRect.height);

  if (isAspectRatioLocked) {
    const aspectRatio = getImageAspectRatio(image);
    height = clampResizeDimension(Math.round(width / aspectRatio));
  }

  return { height, width };
}

function getNextResizeRect({
  drag,
  point,
}: {
  drag: {
    mode: CropDragMode;
    origin: { x: number; y: number };
    rect: CropRect;
  };
  point: { x: number; y: number };
}) {
  const resizesLeft =
    drag.mode === "resize-left" ||
    drag.mode === "resize-top-left" ||
    drag.mode === "resize-bottom-left";
  const resizesRight =
    drag.mode === "resize-right" ||
    drag.mode === "resize-top-right" ||
    drag.mode === "resize-bottom-right";
  const resizesTop =
    drag.mode === "resize-top" ||
    drag.mode === "resize-top-left" ||
    drag.mode === "resize-top-right";
  const resizesBottom =
    drag.mode === "resize-bottom" ||
    drag.mode === "resize-bottom-left" ||
    drag.mode === "resize-bottom-right";
  const left = resizesLeft ? point.x : drag.rect.x;
  const right = resizesRight ? point.x : drag.rect.x + drag.rect.width;
  const top = resizesTop ? point.y : drag.rect.y;
  const bottom = resizesBottom ? point.y : drag.rect.y + drag.rect.height;

  return resizeRectFromPoints({ x: left, y: top }, { x: right, y: bottom });
}

function resizeRectFromPoints(
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const right = Math.max(start.x, end.x);
  const bottom = Math.max(start.y, end.y);

  return {
    height: clampResizeDimension(bottom - top),
    width: clampResizeDimension(right - left),
    x: 0,
    y: 0,
  };
}

function clampResizeDimension(value: number) {
  return clamp(Math.round(value), 1, MAX_RESIZE_DIMENSION);
}

function drawResizeOverlay({
  context,
  frame,
  isActive,
  resizeHeight,
  resizeWidth,
}: {
  context: CanvasRenderingContext2D;
  frame: ImageFrame;
  isActive: boolean;
  resizeHeight: number;
  resizeWidth: number;
}) {
  if (!isActive || !resizeWidth || !resizeHeight) {
    return;
  }

  context.save();

  context.setLineDash([6, 4]);
  context.strokeStyle = "rgba(217, 119, 87, 0.55)";
  context.lineWidth = 1;
  for (let index = 1; index <= 2; index += 1) {
    const vertical = frame.x + (frame.width * index) / 3;
    const horizontal = frame.y + (frame.height * index) / 3;
    context.beginPath();
    context.moveTo(vertical, frame.y);
    context.lineTo(vertical, frame.y + frame.height);
    context.stroke();
    context.beginPath();
    context.moveTo(frame.x, horizontal);
    context.lineTo(frame.x + frame.width, horizontal);
    context.stroke();
  }
  context.setLineDash([]);

  context.strokeStyle = EDITOR_SIGNAL_COLOR;
  context.lineWidth = 2;
  context.strokeRect(frame.x, frame.y, frame.width, frame.height);

  const label = `${Math.round(resizeWidth)} x ${Math.round(resizeHeight)}`;
  context.font = "600 12px system-ui, -apple-system, sans-serif";
  const metrics = context.measureText(label);
  const pillWidth = metrics.width + 20;
  const pillHeight = 24;
  const pillX = frame.x + frame.width / 2 - pillWidth / 2;
  const pillY = frame.y + frame.height / 2 - pillHeight / 2;

  context.fillStyle = "rgba(255, 255, 255, 0.94)";
  context.beginPath();
  context.roundRect(pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
  context.fill();
  context.fillStyle = "#000000";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, frame.x + frame.width / 2, frame.y + frame.height / 2);

  drawResizeGuideArrow(
    context,
    frame.x + 12,
    frame.y + frame.height / 2,
    pillX + 4,
    frame.y + frame.height / 2,
    EDITOR_SIGNAL_COLOR,
  );
  drawResizeGuideArrow(
    context,
    pillX + pillWidth - 4,
    frame.y + frame.height / 2,
    frame.x + frame.width - 12,
    frame.y + frame.height / 2,
    EDITOR_SIGNAL_COLOR,
  );
  drawResizeGuideArrow(
    context,
    frame.x + frame.width / 2,
    frame.y + 12,
    frame.x + frame.width / 2,
    pillY + 4,
    EDITOR_SIGNAL_COLOR,
  );
  drawResizeGuideArrow(
    context,
    frame.x + frame.width / 2,
    pillY + pillHeight - 4,
    frame.x + frame.width / 2,
    frame.y + frame.height - 12,
    EDITOR_SIGNAL_COLOR,
  );

  drawCropHandle(context, frame.x, frame.y, EDITOR_SIGNAL_COLOR);
  drawCropHandle(context, frame.x + frame.width / 2, frame.y, EDITOR_SIGNAL_COLOR);
  drawCropHandle(context, frame.x + frame.width, frame.y, EDITOR_SIGNAL_COLOR);
  drawCropHandle(
    context,
    frame.x + frame.width,
    frame.y + frame.height / 2,
    EDITOR_SIGNAL_COLOR,
  );
  drawCropHandle(context, frame.x, frame.y + frame.height / 2, EDITOR_SIGNAL_COLOR);
  drawCropHandle(context, frame.x, frame.y + frame.height, EDITOR_SIGNAL_COLOR);
  drawCropHandle(
    context,
    frame.x + frame.width / 2,
    frame.y + frame.height,
    EDITOR_SIGNAL_COLOR,
  );
  drawCropHandle(
    context,
    frame.x + frame.width,
    frame.y + frame.height,
    EDITOR_SIGNAL_COLOR,
  );

  context.restore();
}

function drawResizeGuideArrow(
  context: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headLength = 5;

  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.stroke();

  context.beginPath();
  context.moveTo(toX, toY);
  context.lineTo(
    toX - headLength * Math.cos(angle - Math.PI / 6),
    toY - headLength * Math.sin(angle - Math.PI / 6),
  );
  context.lineTo(
    toX - headLength * Math.cos(angle + Math.PI / 6),
    toY - headLength * Math.sin(angle + Math.PI / 6),
  );
  context.closePath();
  context.fill();

  const reverseAngle = angle + Math.PI;
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(
    fromX - headLength * Math.cos(reverseAngle - Math.PI / 6),
    fromY - headLength * Math.sin(reverseAngle - Math.PI / 6),
  );
  context.lineTo(
    fromX - headLength * Math.cos(reverseAngle + Math.PI / 6),
    fromY - headLength * Math.sin(reverseAngle + Math.PI / 6),
  );
  context.closePath();
  context.fill();
}

function drawImageWithResizeMode(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  mode: ResizeScaleMode,
  destX: number,
  destY: number,
  destWidth: number,
  destHeight: number,
) {
  if (mode === "stretch") {
    context.drawImage(image, destX, destY, destWidth, destHeight);
    return;
  }

  if (mode === "contain") {
    const scale = Math.min(destWidth / sourceWidth, destHeight / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const x = destX + (destWidth - drawWidth) / 2;
    const y = destY + (destHeight - drawHeight) / 2;
    context.drawImage(image, x, y, drawWidth, drawHeight);
    return;
  }

  const scale = Math.max(destWidth / sourceWidth, destHeight / sourceHeight);
  const sourceCropWidth = destWidth / scale;
  const sourceCropHeight = destHeight / scale;
  const sourceX = (sourceWidth - sourceCropWidth) / 2;
  const sourceY = (sourceHeight - sourceCropHeight) / 2;

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceCropWidth,
    sourceCropHeight,
    destX,
    destY,
    destWidth,
    destHeight,
  );
}

function drawResizeTargetImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  mode: ResizeScaleMode,
  settings: ImageEffectSettings,
) {
  if (mode === "stretch") {
    drawBaseImageWithEffect(context, image, 0, 0, targetWidth, targetHeight, settings);
    return;
  }

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = image.naturalWidth;
  tempCanvas.height = image.naturalHeight;
  const tempContext = tempCanvas.getContext("2d");

  if (!tempContext) {
    drawBaseImageWithEffect(context, image, 0, 0, targetWidth, targetHeight, settings);
    return;
  }

  drawBaseImageWithEffect(
    tempContext,
    image,
    0,
    0,
    tempCanvas.width,
    tempCanvas.height,
    settings,
  );
  drawImageWithResizeMode(
    context,
    tempCanvas,
    tempCanvas.width,
    tempCanvas.height,
    mode,
    0,
    0,
    targetWidth,
    targetHeight,
  );
}

type BackgroundRemovalResult =
  | {
      alreadyTransparent: true;
      dataUrl?: never;
    }
  | {
      alreadyTransparent?: false;
      dataUrl: string;
    };

function createBackgroundRemovedLogo(
  logo: HTMLImageElement,
): BackgroundRemovalResult | null {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context || !logo.naturalWidth || !logo.naturalHeight) {
    return null;
  }

  canvas.width = logo.naturalWidth;
  canvas.height = logo.naturalHeight;
  context.drawImage(logo, 0, 0);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const cornerColors = getCornerColors(imageData, canvas.width, canvas.height);

  if (cornerColors.every((color) => color.a < 20)) {
    return { alreadyTransparent: true };
  }

  const backgroundColor = averageColors(cornerColors);
  const cornersMatch = cornerColors.every(
    (color) => colorDistance(color, backgroundColor) <= 55,
  );
  const cornersAreNearWhite = cornerColors.every(
    (color) => colorDistance(color, { a: color.a, b: 255, g: 255, r: 255 }) <= 70,
  );

  if (!cornersMatch && !cornersAreNearWhite) {
    return null;
  }

  const data = imageData.data;
  const tolerance = 70;
  const softEdge = 45;

  for (let index = 0; index < data.length; index += 4) {
    const pixel = {
      a: data[index + 3],
      b: data[index + 2],
      g: data[index + 1],
      r: data[index],
    };
    const distance = colorDistance(pixel, backgroundColor);

    if (distance <= tolerance) {
      data[index + 3] = 0;
      continue;
    }

    if (distance <= tolerance + softEdge) {
      const edgeOpacity = (distance - tolerance) / softEdge;
      data[index + 3] = Math.round(data[index + 3] * edgeOpacity);
    }
  }

  context.putImageData(imageData, 0, 0);

  return {
    dataUrl: canvas.toDataURL("image/png"),
  };
}

function getCornerColors(
  imageData: ImageData,
  width: number,
  height: number,
): RgbaColor[] {
  return [
    getPixelColor(imageData, 0, 0, width),
    getPixelColor(imageData, width - 1, 0, width),
    getPixelColor(imageData, 0, height - 1, width),
    getPixelColor(imageData, width - 1, height - 1, width),
  ];
}

function getPixelColor(
  imageData: ImageData,
  x: number,
  y: number,
  width: number,
): RgbaColor {
  const index = (y * width + x) * 4;

  return {
    a: imageData.data[index + 3],
    b: imageData.data[index + 2],
    g: imageData.data[index + 1],
    r: imageData.data[index],
  };
}

function averageColors(colors: RgbaColor[]): RgbaColor {
  const totals = colors.reduce(
    (accumulator, color) => ({
      a: accumulator.a + color.a,
      b: accumulator.b + color.b,
      g: accumulator.g + color.g,
      r: accumulator.r + color.r,
    }),
    { a: 0, b: 0, g: 0, r: 0 },
  );

  return {
    a: totals.a / colors.length,
    b: totals.b / colors.length,
    g: totals.g / colors.length,
    r: totals.r / colors.length,
  };
}

function colorDistance(first: RgbaColor, second: RgbaColor) {
  return Math.hypot(first.r - second.r, first.g - second.g, first.b - second.b);
}

type TextBoundsInput = {
  drawable: DrawableWatermark;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  x: number;
  y: number;
};

function getTextBounds({
  drawable,
  textAlign,
  textBaseline,
  x,
  y,
}: TextBoundsInput): TextBounds {
  const width = drawable.width;
  const height = drawable.height;
  const horizontalPadding = Math.max(12, height * 0.25);
  const verticalPadding = Math.max(10, height * 0.2);

  let left = x - width / 2;

  if (textAlign === "left" || textAlign === "start") {
    left = x;
  }

  if (textAlign === "right" || textAlign === "end") {
    left = x - width;
  }

  let top = y - height / 2;

  if (textBaseline === "top" || textBaseline === "hanging") {
    top = y;
  }

  if (
    textBaseline === "bottom" ||
    textBaseline === "alphabetic" ||
    textBaseline === "ideographic"
  ) {
    top = y - height;
  }

  return {
    bottom: top + height + verticalPadding,
    left: left - horizontalPadding,
    right: left + width + horizontalPadding,
    top: top - verticalPadding,
  };
}

type DrawableInput = {
  context: CanvasRenderingContext2D;
  displayScale?: number;
  fontFamily: string;
  fontSizeScale: number;
  fontWeight: TextWatermarkFontWeight;
  imageWidth: number;
  logoImage: HTMLImageElement | null;
  textColor: string;
  textShadowEnabled: boolean;
  watermarkReferenceWidth: number;
  watermarkText: string;
  watermarkType: WatermarkType;
};

function getDrawableWatermark({
  context,
  displayScale = 1,
  fontFamily,
  fontSizeScale,
  fontWeight,
  imageWidth,
  logoImage,
  textColor,
  textShadowEnabled,
  watermarkReferenceWidth,
  watermarkText,
  watermarkType,
}: DrawableInput): DrawableWatermark | null {
  const baseFontSize =
    Math.max(
      8,
      Math.min(watermarkReferenceWidth / 12, 72) * (fontSizeScale / 100),
    ) * displayScale;

  if (isImageWatermarkType(watermarkType)) {
    if (!logoImage) {
      return null;
    }

    const logoWidthAtReference = Math.max(
      24,
      watermarkReferenceWidth * 0.18 * (fontSizeScale / 100),
    );
    const logoWidth = Math.min(imageWidth * 0.6, logoWidthAtReference * displayScale);
    const logoHeight = logoWidth * (logoImage.naturalHeight / logoImage.naturalWidth);

    return {
      height: logoHeight,
      image: logoImage,
      kind: "logo",
      width: logoWidth,
    };
  }

  const trimmedWatermark = watermarkText.trim();

  if (!trimmedWatermark) {
    return null;
  }

  context.save();
  context.font = `${fontWeight} ${baseFontSize}px ${fontFamily}`;
  const metrics = context.measureText(trimmedWatermark);
  context.restore();

  return {
    fontFamily,
    fontSize: baseFontSize,
    fontWeight,
    height:
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent ||
      baseFontSize,
    kind: "text",
    text: trimmedWatermark,
    textColor,
    textShadowEnabled,
    width: metrics.width,
  };
}

type DrawWatermarkInput = {
  alpha: number;
  context: CanvasRenderingContext2D;
  drawable: DrawableWatermark;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  x: number;
  y: number;
};

function drawWatermarkDrawable({
  alpha,
  context,
  drawable,
  textAlign,
  textBaseline,
  x,
  y,
}: DrawWatermarkInput) {
  if (drawable.kind === "logo") {
    const left = getAlignedLeft(x, drawable.width, textAlign);
    const top = getAlignedTop(y, drawable.height, textBaseline);

    context.save();
    context.globalAlpha = alpha;
    applyHighQualityCanvasDefaults(context);
    context.drawImage(
      drawable.image,
      0,
      0,
      drawable.image.naturalWidth,
      drawable.image.naturalHeight,
      left,
      top,
      drawable.width,
      drawable.height,
    );
    context.restore();
    return;
  }

  context.save();
  context.font = `${drawable.fontWeight} ${drawable.fontSize}px ${drawable.fontFamily}`;
  context.textAlign = textAlign;
  context.textBaseline = textBaseline;
  context.lineWidth = Math.max(3, drawable.fontSize / 12);
  const paint = resolveTextWatermarkPaint({
    alpha,
    textColor: drawable.textColor,
    textShadowEnabled: drawable.textShadowEnabled,
  });
  context.strokeStyle = paint.strokeStyle;
  context.fillStyle = paint.fillStyle;
  context.shadowColor = paint.shadowColor;
  context.shadowBlur = paint.shadowBlur;
  context.strokeText(drawable.text, x, y);
  context.fillText(drawable.text, x, y);
  context.restore();
}

function getDrawableBounds({
  drawable,
  textAlign,
  textBaseline,
  x,
  y,
}: TextBoundsInput) {
  return getTextBounds({
    drawable,
    textAlign,
    textBaseline,
    x,
    y,
  });
}

function getAlignedLeft(
  x: number,
  width: number,
  textAlign: CanvasTextAlign,
) {
  if (textAlign === "left" || textAlign === "start") {
    return x;
  }

  if (textAlign === "right" || textAlign === "end") {
    return x - width;
  }

  return x - width / 2;
}

function getAlignedTop(
  y: number,
  height: number,
  textBaseline: CanvasTextBaseline,
) {
  if (textBaseline === "top" || textBaseline === "hanging") {
    return y;
  }

  if (
    textBaseline === "bottom" ||
    textBaseline === "alphabetic" ||
    textBaseline === "ideographic"
  ) {
    return y - height;
  }

  return y - height / 2;
}

type TiledWatermarkInput = {
  alpha: number;
  angle: TileAngle;
  context: CanvasRenderingContext2D;
  density: TileDensity;
  displayScale?: number;
  drawable: DrawableWatermark;
  gap: number;
  imageHeight: number;
  imageWidth: number;
  imageX: number;
  imageY: number;
  watermarkReferenceWidth: number;
};

function drawTiledWatermark({
  alpha,
  angle,
  context,
  density,
  displayScale = 1,
  drawable,
  gap,
  imageHeight,
  imageWidth,
  imageX,
  imageY,
  watermarkReferenceWidth,
}: TiledWatermarkInput) {
  const densityConfig =
    tileDensities.find((option) => option.value === density) ??
    tileDensities[1];
  const densitySpacing =
    (watermarkReferenceWidth / densityConfig.repetitionsAcross) * displayScale;
  const diagonal = Math.hypot(imageWidth, imageHeight);

  context.save();
  context.beginPath();
  context.rect(imageX, imageY, imageWidth, imageHeight);
  context.clip();
  context.translate(imageX + imageWidth / 2, imageY + imageHeight / 2);
  context.rotate((-angle * Math.PI) / 180);

  const gapPixels = Math.max(drawable.height, drawable.width * (gap / 100));
  const xSpacing = Math.max(densitySpacing, drawable.width + gapPixels);
  const ySpacing = Math.max(drawable.height * 2.4, densitySpacing * 0.65);
  const patternExtent = diagonal + Math.max(xSpacing, ySpacing) * 2;

  for (let y = -patternExtent; y <= patternExtent; y += ySpacing) {
    for (let x = -patternExtent; x <= patternExtent; x += xSpacing) {
      drawWatermarkDrawable({
        alpha,
        context,
        drawable,
        textAlign: "center",
        textBaseline: "middle",
        x,
        y,
      });
    }
  }

  context.restore();
}

type WatermarkCoordinateInput = {
  fontSize: number;
  imageHeight: number;
  imageWidth: number;
  imageX: number;
  imageY: number;
  padding: number;
  position: WatermarkPosition;
};

function getWatermarkCoordinates({
  fontSize,
  imageHeight,
  imageWidth,
  imageX,
  imageY,
  padding,
  position,
}: WatermarkCoordinateInput) {
  const [verticalPosition, horizontalPosition] = position.split("-") as [
    "top" | "center" | "bottom",
    "left" | "center" | "right",
  ];

  const horizontalMap = {
    left: {
      x: imageX + padding,
      textAlign: "left" as CanvasTextAlign,
    },
    center: {
      x: imageX + imageWidth / 2,
      textAlign: "center" as CanvasTextAlign,
    },
    right: {
      x: imageX + imageWidth - padding,
      textAlign: "right" as CanvasTextAlign,
    },
  };
  const verticalMap = {
    top: {
      y: imageY + padding,
      textBaseline: "top" as CanvasTextBaseline,
    },
    center: {
      y: imageY + imageHeight / 2,
      textBaseline: "middle" as CanvasTextBaseline,
    },
    bottom: {
      y: imageY + imageHeight - padding,
      textBaseline: "bottom" as CanvasTextBaseline,
    },
  };

  return {
    fontSize,
    ...horizontalMap[horizontalPosition],
    ...verticalMap[verticalPosition],
  };
}
