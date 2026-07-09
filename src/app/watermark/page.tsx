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
} from "../../lib/watermarkVideoExport";
import {
  exportVideoOnServer,
  type ServerVideoExportStage,
} from "../../lib/serverVideoExportClient";
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
} from "../../lib/pdfExport";
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
  acceptedMediaInputTypes,
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
  buildPdfPageThumbnails,
  loadPdfDocumentFromBytes,
  renderPdfPagePreview,
  type PdfPageThumbnail,
} from "../../lib/pdfPreview";
import JSZip from "jszip";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  Crop,
  Droplets,
  Images,
  Maximize2,
  RefreshCw,
  RotateCw,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { EditorBottomBar } from "../../../components/watermark/EditorBottomBar";
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
import {
  SignatureControls,
  type SavedSignature,
} from "../../../components/watermark/SignatureControls";
import { WatermarkLayersPanel } from "../../../components/watermark/WatermarkLayersPanel";
import { WatermarkStyleControls } from "../../../components/watermark/WatermarkStyleControls";
import {
  createDefaultLogoLayer,
  createDefaultTextLayer,
  legacySnapshotToLogoLayer,
  legacySnapshotToTextLayer,
  revokeLogoLayerUrls,
  type LogoWatermarkLayer,
  type TextWatermarkLayer,
} from "../../lib/watermarkLayers";
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

const imageExportMimeType = "image/jpeg";
const imageExportQuality = IMAGE_EXPORT_JPEG_QUALITY;

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

type ImageTool = "crop" | "resize" | "rotate";

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

type CanvasSize = {
  width: number;
  height: number;
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
  customPosition: CustomPosition | null;
  fontFamily: string;
  fontSizeScale: number;
  isLogoBackgroundRemoved: boolean;
  logoFileName: string;
  logoImage: HTMLImageElement | null;
  logoLayers?: LogoWatermarkLayer[];
  originalLogoImage: HTMLImageElement | null;
  textLayers?: TextWatermarkLayer[];
  tileAngle: TileAngle;
  tileDensity: TileDensity;
  tileGap: number;
  watermarkMode: WatermarkMode;
  watermarkOpacity: number;
  watermarkPosition: WatermarkPosition;
  watermarkText: string;
  watermarkType: WatermarkType;
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

type DrawableWatermark =
  | {
      fontFamily: string;
      fontSize: number;
      height: number;
      kind: "text";
      text: string;
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

const defaultFontFamily =
  'Arial, Helvetica, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

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

const fontFamilies = [
  {
    label: "System Sans",
    value: defaultFontFamily,
  },
  {
    label: "Geometric Sans",
    value: '"Trebuchet MS", Arial, sans-serif',
  },
  {
    label: "Serif",
    value: 'Georgia, "Times New Roman", serif',
  },
  {
    label: "Monospace",
    value: '"Courier New", Courier, monospace',
  },
  {
    label: "Condensed",
    value: 'Impact, "Arial Narrow", sans-serif',
  },
  {
    label: "Script",
    value: '"Brush Script MT", "Segoe Script", cursive',
  },
] as const;

export default function WatermarkPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoOverlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoPreviewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appendImagesInputRef = useRef<HTMLInputElement>(null);
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
  const cropDragRef = useRef<{
    mode: CropDragMode;
    origin: { x: number; y: number };
    rect: CropRect;
  } | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageBatch, setImageBatch] = useState<BatchImageEntry[]>([]);
  const [activeBatchImageId, setActiveBatchImageId] = useState<string | null>(
    null,
  );
  const [mediaKind, setMediaKind] = useState<MediaKind | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfPages, setPdfPages] = useState<PdfPageThumbnail[]>([]);
  const [activePdfPageId, setActivePdfPageId] = useState<string | null>(null);
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
  const [activeImageTool, setActiveImageTool] = useState<ImageTool | null>(null);
  const [uploadedImageSize, setUploadedImageSize] = useState<CanvasSize | null>(
    null,
  );
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [resizeWidth, setResizeWidth] = useState(0);
  const [resizeHeight, setResizeHeight] = useState(0);
  const [isAspectRatioLocked, setIsAspectRatioLocked] = useState(true);
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
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportError, setExportError] = useState("");
  const [exportNotice, setExportNotice] = useState("");
  const [exportServerStage, setExportServerStage] =
    useState<ServerVideoExportStage | null>(null);
  const [isServerVideoExport, setIsServerVideoExport] = useState(false);
  const [showRestoredSettingsNotice, setShowRestoredSettingsNotice] =
    useState(false);
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
  const [activeTemplate, setActiveTemplate] =
    useState<WatermarkTemplateId | null>(null);
  const [watermarkMode, setWatermarkMode] = useState<WatermarkMode>("single");
  const [watermarkPosition, setWatermarkPosition] =
    useState<WatermarkPosition>("bottom-right");
  const [customPosition, setCustomPosition] = useState<CustomPosition | null>(
    null,
  );
  const [tileDensity, setTileDensity] = useState<TileDensity>("medium");
  const [tileGap, setTileGap] = useState(120);
  const [tileAngle, setTileAngle] = useState<TileAngle>(45);
  const [watermarkOpacity, setWatermarkOpacity] = useState(70);
  const [fontSizeScale, setFontSizeScale] = useState(100);
  const [fontFamily, setFontFamily] = useState<string>(fontFamilies[0].value);
  const [uploadError, setUploadError] = useState("");
  const [logoError, setLogoError] = useState("");
  const [isDraggingWatermark, setIsDraggingWatermark] = useState(false);
  const [isWatermarkHovering, setIsWatermarkHovering] = useState(false);
  const [settingsHistoryLength, setSettingsHistoryLength] = useState(0);
  const [settingsHistoryIndex, setSettingsHistoryIndex] = useState(0);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [savedPresets, setSavedPresets] = useState<SavedWatermarkPreset[]>([]);
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([]);
  const [activeSignatureId, setActiveSignatureId] = useState<string | null>(
    null,
  );
  const [isSignatureDropTarget, setIsSignatureDropTarget] = useState(false);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: 900,
    height: 600,
  });
  const [activeEditorPanel, setActiveEditorPanel] =
    useState<EditorPanelId | null>("watermark");

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
    const loadGeneration = ++mediaLoadGenerationRef.current;

    async function bootstrapEditor() {
      const handoffFiles = await consumeEditorHandoffFiles();

      if (loadGeneration !== mediaLoadGenerationRef.current) {
        return;
      }

      if (handoffFiles?.length) {
        loadMediaFiles(handoffFiles);
        return;
      }

      const session = await readEditorSession();

      if (loadGeneration !== mediaLoadGenerationRef.current || !session) {
        return;
      }

      isRestoringSessionRef.current = true;
      sessionRestoreRef.current = session.meta;
      loadMediaFiles(storedSessionFilesToFiles(session.files));
    }

    void bootstrapEditor();

    return () => {
      mediaLoadGenerationRef.current += 1;
      setIsPdfLoading(false);
    };
  }, []);

  useEffect(() => {
    const panel = previewPanelRef.current;

    if (!panel) {
      return;
    }

    function updateCanvasSize() {
      if (!panel) {
        return;
      }

      const nextWidth = Math.max(320, Math.floor(panel.clientWidth));
      const nextHeight = Math.max(320, Math.floor(panel.clientHeight));

      setCanvasSize({
        width: nextWidth,
        height: nextHeight,
      });
    }

    updateCanvasSize();

    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(panel);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

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
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#DCDCDD";
    context.fillRect(0, 0, canvas.width, canvas.height);

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
    const imageScale = Math.min(
      canvas.width / Math.max(referenceSize.width, rotatedPreviewBounds.width),
      canvas.height / Math.max(referenceSize.height, rotatedPreviewBounds.height),
    );
    const sourceImageWidth = previewImageWidth * imageScale;
    const sourceImageHeight = previewImageHeight * imageScale;
    const imageWidth = rotatedPreviewBounds.width * imageScale;
    const imageHeight = rotatedPreviewBounds.height * imageScale;
    const imageX = (canvas.width - imageWidth) / 2;
    const imageY = (canvas.height - imageHeight) / 2;
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
    drawBaseImageWithEffect(
      context,
      image,
      -sourceImageWidth / 2,
      -sourceImageHeight / 2,
      sourceImageWidth,
      sourceImageHeight,
      getImageEffectSettings(),
    );
    context.restore();

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
      imageHeight,
      imageWidth,
      imageX,
      imageY,
      logoLayers,
      signatureFontSizeScale: fontSizeScale,
      signatureImage: watermarkType === "signature" ? logoImage : null,
      signatureOpacity: watermarkOpacity,
      signaturePosition: watermarkPosition,
      signatureCustomPosition: customPosition,
      textLayers,
      tileAngle,
      tileDensity,
      tileGap,
      watermarkMode,
      watermarkType,
    });

    layerBoundsRef.current = boundsByLayer;
    textBoundsRef.current = activeBounds;
    drawCropOverlay({
      context,
      cropRect,
      frame: imageFrame,
      image,
      isActive: activeImageTool === "crop",
    });
  });

  useEffect(() => {
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
      imageHeight: canvas.height,
      imageWidth: canvas.width,
      imageX: 0,
      imageY: 0,
      logoLayers,
      signatureFontSizeScale: fontSizeScale,
      signatureImage: watermarkType === "signature" ? logoImage : null,
      signatureOpacity: watermarkOpacity,
      signaturePosition: watermarkPosition,
      signatureCustomPosition: customPosition,
      textLayers,
      tileAngle,
      tileDensity,
      tileGap,
      watermarkMode,
      watermarkType,
    });

    layerBoundsRef.current = boundsByLayer;
    textBoundsRef.current = activeBounds;
  });

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
            image,
            resizeHeight,
            resizeWidth,
            rotationAngle,
            uploadedImageSize,
          }
        : entry,
    );
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
    setFileName(file.name);
    setMediaKind("pdf");

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    clearImageBatch();
    clearPdfState();
    setImage(null);
    setVideoUrl("");
    setVideoDuration(0);
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
      setActivePdfPageId("pdf-page-1");

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
      finishMediaLoad();

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
  ): ExportRenderInput {
    return {
      activeLogoLayerId,
      activeTextLayerId,
      customPosition,
      fontFamily,
      fontSizeScale,
      image: imageElement,
      imageEffectSettings: getImageEffectSettings(),
      logoImage,
      logoLayers,
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
    setBatchExportProgress({ current: 0, total: imageBatch.length });

    try {
      const nextBatch = persistActiveBatchEntry(imageBatch, activeBatchImageId);
      setImageBatch(nextBatch);

      const zip = new JSZip();
      const usedNames = new Set<string>();

      for (const [index, entry] of nextBatch.entries()) {
        setBatchExportProgress({
          current: index + 1,
          total: nextBatch.length,
        });

        const blob = await exportImageToBlob(
          getWatermarkExportInput(
            entry.image,
            entry.resizeWidth,
            entry.resizeHeight,
            entry.rotationAngle,
            false,
          ),
        );

        zip.file(
          getUniqueZipEntryName(entry.fileName, usedNames),
          ensureBlobMimeType(blob, imageExportMimeType),
        );
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, "watermarked-images.zip");
    } catch {
      setUploadError("We could not export those images. Please try again.");
    } finally {
      setIsExporting(false);
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

    clearActiveTemplate();
    setWatermarkOpacity(value);
  }

  function handleFontSizeScaleChange(value: number) {
    if (shouldIgnoreManualSettingsChange()) {
      return;
    }

    clearActiveTemplate();
    setFontSizeScale(value);
  }

  function handleFontFamilyChange(value: string) {
    if (shouldIgnoreManualSettingsChange()) {
      return;
    }

    clearActiveTemplate();
    setFontFamily(value);
  }

  function clearActiveTemplate() {
    setActiveTemplate(null);
  }

  function shouldIgnoreManualSettingsChange() {
    return shouldIgnoreManualSettingsRef.current;
  }

  const activeTextLayer =
    textLayers.find((layer) => layer.id === activeTextLayerId) ?? textLayers[0];
  const activeLogoLayer =
    logoLayers.find((layer) => layer.id === activeLogoLayerId) ?? logoLayers[0];

  function syncLegacyFromTextLayer(layer: TextWatermarkLayer) {
    setWatermarkText(layer.text);
    setWatermarkOpacity(layer.opacity);
    setFontFamily(layer.fontFamily);
    setFontSizeScale(layer.fontSizeScale);
    setWatermarkPosition(layer.watermarkPosition);
    setCustomPosition(
      layer.customPosition ? { ...layer.customPosition } : null,
    );
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

  function setLayerCustomPosition(
    layerId: string,
    canvas: HTMLCanvasElement,
    point: { x: number; y: number },
  ) {
    const position = {
      xPercent: point.x / canvas.width,
      yPercent: point.y / canvas.height,
    };

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
  }

  function updateTextLayer(
    layerId: string,
    patch: Partial<TextWatermarkLayer>,
  ) {
    clearActiveTemplate();
    setTextLayers((layers) =>
      layers.map((layer) =>
        layer.id === layerId ? { ...layer, ...patch } : layer,
      ),
    );
  }

  function updateLogoLayer(
    layerId: string,
    patch: Partial<LogoWatermarkLayer>,
  ) {
    clearActiveTemplate();
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
    setIsWatermarkHovering(false);
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
        logoImage: null,
        originalLogoImage: null,
      },
      { suppressHistory: true },
    );
    setActiveTemplate(null);
    setShowRestoredSettingsNotice(true);
    return true;
  }

  function finishMediaLoad() {
    if (sessionRestoreRef.current) {
      void finalizeSessionRestore();
      return;
    }

    applyStoredWatermarkSettingsOnMediaLoad();
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

      setActiveTemplate(
        meta.activeTemplate as WatermarkTemplateId | null,
      );
      setActiveEditorPanel(meta.activeEditorPanel);
      setShowRestoredSettingsNotice(false);

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
          label: signature.label,
          previewSrc: signature.previewSrc.startsWith("data:")
            ? signature.previewSrc
            : await imageElementToDataUrl(signature.image),
          source: signature.source,
        })),
      );

      const meta: StoredEditorSessionMeta = {
        activeBatchImageId,
        activeEditorPanel,
        activePdfPageId,
        activeSignatureId,
        activeTemplate,
        backgroundRemovedLogoDataUrl,
        batchEntryIds: imageBatch.map((entry) => entry.id),
        batchFileNames: imageBatch.map((entry) => entry.fileName),
        customPosition: customPosition ? { ...customPosition } : null,
        fileName,
        logoDataUrl,
        logoFileName,
        mediaKind,
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
        logoImage: null,
        originalLogoImage: null,
      },
      { suppressHistory: true },
    );
    setActiveTemplate(null);
    setShowRestoredSettingsNotice(false);
    setExportNotice("");
    setExportError("");
    commitSettingsHistorySnapshot({
      ...defaults,
      backgroundRemovedLogoImage: null,
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

  function applyTemplate(template: WatermarkTemplate) {
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
    };

    commitSettingsHistorySnapshot(currentSnapshot);
    applyWatermarkSettingsSnapshot(templateSnapshot, { suppressHistory: true });
    commitSettingsHistorySnapshot(templateSnapshot);
    isApplyingSettingsHistoryRef.current = false;
    setActiveTemplate(template.id);
    setIsWatermarkHovering(false);
  }

  function handleExport() {
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

    setIsExporting(true);
    setExportProgress(null);

    void exportImageToBlob(
      getWatermarkExportInput(
        image,
        resizeWidth,
        resizeHeight,
        rotationAngle,
        activeImageTool === "resize",
      ),
    )
      .then((blob) => {
        downloadImageBlob(blob, getExportFileName(fileName), imageExportMimeType);
      })
      .catch(() => {
        setUploadError("We could not export that image. Please try again.");
      })
      .finally(() => {
        setIsExporting(false);
      });
  }

  async function handlePdfExport() {
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

    if (watermarkType === "signature" && !logoImage) {
      setExportError("Add a signature before exporting.");
      return;
    }

    setUploadError("");
    setExportError("");
    setIsExporting(true);
    setPdfExportProgress({ current: 0, total: pdfPageCount });

    const watermarkInput = {
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

    try {
      const exportedBytes = await exportWatermarkedPdf(
        pdfBytesRef.current,
        async (_pageIndex, pageWidth, pageHeight) => {
          const overlayCanvas = renderWatermarkOverlayForPdfPage({
            canvasSize,
            pageHeight,
            pageWidth,
            ...watermarkInput,
          });

          return canvasToPngBytes(overlayCanvas);
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
    } catch {
      setExportError("We could not export that PDF. Please try again.");
    } finally {
      setIsExporting(false);
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
    if (!videoUrl || !videoSize) {
      setExportError("Reload the video before exporting.");
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

    if (watermarkType === "signature" && !logoImage) {
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

    try {
      const overlayCanvas = renderWatermarkOverlayCanvas({
        activeLogoLayerId,
        activeTextLayerId,
        customPosition,
        fontFamily,
        fontSizeScale,
        height: videoSize.height,
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
        width: videoSize.width,
      });
      const overlayPngBytes = await canvasToPngBytes(overlayCanvas);
      const videoResponse = await fetch(videoUrl);

      if (!videoResponse.ok) {
        throw new VideoExportFailedError(
          "We could not read the loaded video. Please reload it and try again.",
        );
      }

      const videoBlob = await videoResponse.blob();
      const effectiveFileSize = videoFileSize || videoBlob.size;
      const exportRoute = getVideoExportRoute(
        videoDuration,
        videoSize.width,
        videoSize.height,
        effectiveFileSize,
      );

      if (exportRoute === "reject") {
        throw new VideoExportFailedError(getVideoExportRejectionMessage());
      }

      setIsServerVideoExport(exportRoute === "server");

      const exportedBlob =
        exportRoute === "server"
          ? await exportVideoOnServer({
              abortSignal,
              duration: videoDuration,
              fileSizeBytes: effectiveFileSize,
              height: videoSize.height,
              inputFileName: fileName,
              onProgress: setExportProgress,
              onStageChange: setExportServerStage,
              overlayPngBytes,
              shouldCancel: () => videoExportCancelRef.current,
              videoBlob,
              width: videoSize.width,
            })
          : await exportVideoWithOverlay({
              inputFileName: fileName,
              onProgress: setExportProgress,
              overlayPngBytes,
              shouldCancel: () => videoExportCancelRef.current,
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
    } catch (error) {
      if (videoExportCancelRef.current || error instanceof VideoExportCancelledError) {
        setExportError("");
        setExportNotice((current) => current || "Export cancelled.");
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

  function handleCanvasPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (activeImageTool === "crop") {
      handleCropPointerDown(event);
      return;
    }

    if (watermarkMode === "tile") {
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
        clearActiveTemplate();
        setIsDraggingWatermark(true);
        setIsWatermarkHovering(true);
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

        setLayerCustomPosition(layer.id, event.currentTarget, point);
        return;
      }
    }

    const bounds = textBoundsRef.current;

    if (!point || !bounds || !isPointInBounds(point, bounds)) {
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
    clearActiveTemplate();
    setIsDraggingWatermark(true);
    setIsWatermarkHovering(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    setLayerCustomPosition(
      draggingLayerIdRef.current ?? activeTextLayerId,
      event.currentTarget,
      point,
    );
  }

  function handleCanvasPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (activeImageTool === "crop") {
      handleCropPointerMove(event);
      return;
    }

    const point = getCanvasPoint(event);

    if (!isDraggingRef.current) {
      setIsWatermarkHovering(isPointerOverWatermark(point, watermarkMode));
      return;
    }

    if (!point) {
      return;
    }

    event.preventDefault();
    setLayerCustomPosition(
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
    if (activeImageTool === "crop") {
      handleCropPointerUp(event);
      return;
    }

    if (!isDraggingRef.current) {
      return;
    }

    event.preventDefault();
    isDraggingRef.current = false;
    draggingLayerIdRef.current = null;
    setIsDraggingWatermark(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setIsWatermarkHovering(
      isPointerOverWatermark(getCanvasPoint(event), watermarkMode),
    );
  }

  function handleCanvasPointerLeave() {
    if (activeImageTool === "crop") {
      return;
    }

    if (!isDraggingRef.current) {
      setIsWatermarkHovering(false);
    }
  }

  function handleCanvasPointerCancel(event: PointerEvent<HTMLCanvasElement>) {
    cropDragRef.current = null;
    isDraggingRef.current = false;
    draggingLayerIdRef.current = null;
    setIsDraggingWatermark(false);
    setIsWatermarkHovering(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
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
  }

  async function openImageToolPanel(tool: ImageTool) {
    if (mediaKind !== "image") {
      return;
    }

    if (tool !== "rotate") {
      await materializeRotationIfNeeded();
    }

    setActiveEditorPanel(tool);
    setActiveImageTool(tool);
    setIsWatermarkHovering(false);

    if (tool !== "crop") {
      setCropRect(null);
      cropDragRef.current = null;
    }
  }

  function handleEditorPanelSelect(panel: EditorPanelId) {
    if (panel === "watermark" || panel === "templates" || panel === "effects") {
      setActiveEditorPanel(panel);
      setActiveImageTool(null);
      setCropRect(null);
      cropDragRef.current = null;
      return;
    }

    void openImageToolPanel(panel);
  }

  function removeLoadedMedia() {
    mediaLoadGenerationRef.current += 1;
    setIsPdfLoading(false);
    clearAllMedia();
  }

  function clearAllMedia() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    clearImageBatch();
    clearPdfState();
    setImage(null);
    setVideoUrl("");
    setVideoDuration(0);
    setVideoSize(null);
    setVideoFileSize(0);
    setMediaKind(null);
    setFileName("");
    setUploadedImageSize(null);
    setResizeWidth(0);
    setResizeHeight(0);
    setRotationAngle(0);
    setResizeWarning("");
    setActiveImageTool(null);
    setCropRect(null);
    setActiveImageEffect("none");
    setEffectBorderWidth("medium");
    setEffectBorderColor("ink");
    setEffectExposure(0);
    setUploadError("");
    setExportError("");
    setExportNotice("");
    setActiveEditorPanel("watermark");
    void clearEditorSession();
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

    if (activeBatchImageId && uploadedImageSize) {
      setImageBatch((currentBatch) =>
        currentBatch.map((entry) =>
          entry.id === activeBatchImageId
            ? {
                ...entry,
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
  }

  function cancelCrop() {
    setCropRect(null);
    cropDragRef.current = null;
    setActiveImageTool(null);
  }

  function handleResizeWidthChange(value: number) {
    const nextWidth = Math.max(1, Math.round(value));
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
    const nextHeight = Math.max(1, Math.round(value));
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

    const nextImage = await createResizedImage(image, resizeWidth, resizeHeight);

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
    clearPdfState();

    try {
      const preservedIds = sessionRestoreRef.current?.batchEntryIds ?? [];
      const loadedEntries = await Promise.all(
        imageFiles.map(async (file, index) => {
          const loaded = await loadImageElementFromFile(file);
          return createBatchImageEntry(
            loaded.file,
            loaded.image,
            loaded.objectUrl,
            preservedIds[index],
          );
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
          (entry) => entry.id === sessionRestoreRef.current?.activeBatchImageId,
        ) ?? loadedEntries[0];

      applyActiveBatchEntry(initialEntry);
      finishMediaLoad();
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "We could not load those images. Please try again.",
      );
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

    clearImageBatch();
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
      finishMediaLoad();
    };
    nextImage.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      objectUrlRef.current = null;
      setUploadError("We could not load that image. Please try another file.");
    };
    nextImage.src = objectUrl;
  }

  function loadVideoFile(file: File) {
    if (!isVideoFile(file)) {
      setUploadError("Please choose an MP4, MOV, or WebM video.");
      return;
    }

    setUploadError("");

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    clearImageBatch();
    clearPdfState();

    const objectUrl = URL.createObjectURL(file);
    const nextVideo = document.createElement("video");

    objectUrlRef.current = objectUrl;
    nextVideo.preload = "metadata";
    nextVideo.onloadedmetadata = () => {
      setMediaKind("video");
      setImage(null);
      setActiveBatchImageId(null);
      setVideoUrl(objectUrl);
      setVideoDuration(nextVideo.duration);
      setVideoSize({
        height: nextVideo.videoHeight,
        width: nextVideo.videoWidth,
      });
      setFileName(file.name);
      setVideoFileSize(file.size);
      setUploadError("");
      setResizeWarning("");
      setActiveImageTool(null);
      setCropRect(null);
      setIsWatermarkHovering(false);
      finishMediaLoad();
    };
    nextVideo.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      objectUrlRef.current = null;
      setUploadError("We could not load that video. Please try another file.");
    };
    nextVideo.src = objectUrl;
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
      setLogoBackgroundMessage("Best-effort background removal is on.");
      return;
    }

    const result = createBackgroundRemovedLogo(originalLogoImageForLayer);

    if (!result) {
      setLogoBackgroundMessage(
        "Couldn't detect a plain background - try a logo with a solid-color background, or use a PNG with transparency already applied",
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
      setLogoBackgroundMessage("Best-effort background removal is on.");
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
    clearActiveTemplate();

    if (nextType === "signature") {
      if (watermarkMode === "tile") {
        setWatermarkMode("single");
      }

      const activeSignature = savedSignatures.find(
        (signature) => signature.id === activeSignatureId,
      );

      setLogoImage(activeSignature?.image ?? null);
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

    if (watermarkType === "signature") {
      setLogoImage(signature?.image ?? null);
      setIsWatermarkHovering(false);
    }
  }

  function placeSignatureOnDocument(
    signature: SavedSignature,
    position?: { xPercent: number; yPercent: number },
  ) {
    clearActiveTemplate();

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
  const isBatchImageMode = mediaKind === "image" && imageBatch.length >= 2;
  const imageToolsEnabled = mediaKind === "image";
  const loadedMediaDetails =
    mediaKind === "video" && videoSize
      ? `${formatDuration(videoDuration)} · ${videoSize.width}x${videoSize.height}`
      : mediaKind === "pdf" && pdfPageCount > 0
        ? `· ${pdfPageCount} ${pdfPageCount === 1 ? "page" : "pages"}`
        : null;
  const canUndoSettings = settingsHistoryIndex > 0;
  const canRedoSettings = settingsHistoryIndex < settingsHistoryLength - 1;
  const canExportVideo =
    mediaKind === "video" &&
    videoSize !== null &&
    (videoFileSize > 0
      ? isAnyVideoExportEligible(
          videoDuration,
          videoSize.width,
          videoSize.height,
          videoFileSize,
        )
      : getVideoExportRoute(
          videoDuration,
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
  const videoExportStageLabel =
    exportServerStage === "preparing"
      ? "Preparing server export..."
      : exportServerStage === "uploading"
        ? "Uploading video..."
        : exportServerStage === "processing"
          ? "Processing on our servers — this may take longer"
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
    isPdfLoading ||
    (mediaKind === "video"
      ? !canExportVideo
      : mediaKind === "pdf"
        ? pdfPageCount === 0
        : !image);
  const canvasCursor =
    activeImageTool === "crop"
      ? "crosshair"
      : watermarkMode === "single"
      ? isDraggingWatermark
        ? "grabbing"
        : isWatermarkHovering
          ? "grab"
          : "auto"
      : "auto";

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
    activePdfPageId,
    activeSignatureId,
    activeTemplate,
    customPosition,
    fileName,
    hasMedia,
    imageBatch,
    mediaKind,
    savedSignatures,
    videoUrl,
    watermarkMode,
    watermarkType,
  ]);

  const showEditorPanel = activeEditorPanel !== null;
  const editorPanelTitle =
    activeEditorPanel === "templates"
      ? "Templates"
      : activeEditorPanel === "watermark"
        ? "Watermark"
        : activeEditorPanel === "crop"
          ? "Crop"
          : activeEditorPanel === "resize"
            ? "Resize"
            : activeEditorPanel === "rotate"
              ? "Rotate"
              : activeEditorPanel === "effects"
                ? "Effects"
                : "";
  const editorPanelIcon =
    activeEditorPanel === "templates" ? (
      <Star className="h-4 w-4" strokeWidth={2} />
    ) : activeEditorPanel === "watermark" ? (
      <Droplets className="h-4 w-4" strokeWidth={2} />
    ) : activeEditorPanel === "crop" ? (
      <Crop className="h-4 w-4" strokeWidth={2} />
    ) : activeEditorPanel === "resize" ? (
      <Maximize2 className="h-4 w-4" strokeWidth={2} />
    ) : activeEditorPanel === "rotate" ? (
      <RotateCw className="h-4 w-4" strokeWidth={2} />
    ) : activeEditorPanel === "effects" ? (
      <Sparkles className="h-4 w-4" strokeWidth={2} />
    ) : null;
  const canvasMetaLabel =
    fileName && uploadedImageSize
      ? `${fileName} · ${uploadedImageSize.width}x${uploadedImageSize.height}`
      : fileName
        ? `${fileName}${loadedMediaDetails ?? ""}`
        : null;

  return (
    <main className="editor-theme flex h-[100svh] w-full flex-col overflow-hidden">
      <motion.div
        className="grid min-h-0 flex-1 md:grid-cols-[auto_minmax(0,1fr)]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="relative flex min-h-0 max-h-full overflow-hidden">
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

          <ToolIconRail
            activePanel={activeEditorPanel}
            imageToolsEnabled={imageToolsEnabled}
            onSelectPanel={handleEditorPanelSelect}
          />

          {showEditorPanel ? (
            <EditorToolPanel
              icon={editorPanelIcon}
              onClose={() => setActiveEditorPanel(null)}
              title={editorPanelTitle}
            >
          {activeEditorPanel === "watermark" ? (
            <div className="space-y-3">
              {hasMedia ? (
                <EditorCard>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-beige-dim">
                        {isPdfLoading
                          ? "Loading PDF..."
                          : isBatchImageMode
                            ? "Batch"
                            : "Loaded"}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-beige">
                        {isBatchImageMode ? `${imageBatch.length} images` : fileName}
                        {loadedMediaDetails ? (
                          <span className="ml-1 font-normal text-beige-dim">
                            {loadedMediaDetails}
                          </span>
                        ) : null}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {!isPdfLoading ? (
                        <>
                          <button
                            aria-label={
                              mediaKind === "pdf"
                                ? "Choose a different PDF"
                                : mediaKind === "video"
                                  ? "Choose a different video"
                                  : "Choose a different image"
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-beige/10 bg-night-card text-beige-dim transition hover:border-sand hover:text-sand"
                            onClick={openReplaceMediaPicker}
                            title={
                              mediaKind === "pdf"
                                ? "Change PDF"
                                : mediaKind === "video"
                                  ? "Change video"
                                  : "Change image"
                            }
                            type="button"
                          >
                            <RefreshCw className="h-4 w-4" strokeWidth={2} />
                          </button>

                          {mediaKind === "image" ? (
                            <button
                              aria-label="Add more images"
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-beige/10 bg-night-card text-beige-dim transition hover:border-sand hover:text-sand"
                              onClick={openAddMoreImagesPicker}
                              title="Upload more images"
                              type="button"
                            >
                              <Images className="h-4 w-4" strokeWidth={2} />
                            </button>
                          ) : null}
                        </>
                      ) : null}

                      <button
                        aria-label={
                          isPdfLoading
                            ? "Cancel loading"
                            : mediaKind === "pdf"
                              ? "Remove PDF"
                              : mediaKind === "video"
                                ? "Remove video"
                                : "Remove image"
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-beige/10 bg-night-card text-beige-dim transition hover:border-signal/40 hover:text-signal"
                        onClick={removeLoadedMedia}
                        title={
                          isPdfLoading
                            ? "Cancel loading"
                            : mediaKind === "pdf"
                              ? "Remove PDF"
                              : mediaKind === "video"
                                ? "Remove video"
                                : "Remove image"
                        }
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </EditorCard>
              ) : null}

              {isBatchImageMode ? (
                <ImageBatchStrip
                  activeId={activeBatchImageId}
                  entries={imageBatch}
                  onRemove={removeBatchImage}
                  onSelect={selectBatchImage}
                />
              ) : null}

              {mediaKind === "pdf" && pdfPages.length > 0 ? (
                <PdfPageStrip
                  activeId={activePdfPageId}
                  onSelect={(id) => {
                    void selectPdfPage(id);
                  }}
                  pages={pdfPages}
                />
              ) : null}

              {showRestoredSettingsNotice ? (
                <div className="rounded-lg border border-beige/10 bg-beige/5 px-2.5 py-2 text-xs text-beige">
                  <p>Your last watermark settings were restored.</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3">
                    <button
                      className="font-medium text-signal transition hover:text-beige"
                      onClick={() => setShowRestoredSettingsNotice(false)}
                      type="button"
                    >
                      Dismiss
                    </button>
                    <button
                      className="font-medium text-beige-dim transition hover:text-beige"
                      onClick={resetWatermarkSettingsToDefaults}
                      type="button"
                    >
                      Reset to defaults
                    </button>
                  </div>
                </div>
              ) : null}

              {isExporting && isBatchImageMode && batchExportProgress ? (
                <div className="rounded-lg border border-beige/10 bg-night-card px-2.5 py-2">
                  <p className="text-xs font-medium text-beige-dim">
                    Processing {batchExportProgress.current} of{" "}
                    {batchExportProgress.total}...
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-beige/10">
                    <div
                      className="h-full rounded-full bg-signal transition-[width] duration-200"
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

              {isExporting && mediaKind === "pdf" && pdfExportProgress ? (
                <div className="rounded-lg border border-beige/10 bg-night-card px-2.5 py-2">
                  <p className="text-xs font-medium text-beige-dim">
                    Processing page {pdfExportProgress.current} of{" "}
                    {pdfExportProgress.total}...
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-beige/10">
                    <div
                      className="h-full rounded-full bg-signal transition-[width] duration-200"
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
                <div className="rounded-lg border border-beige/10 bg-night-card px-2.5 py-2">
                  {isServerVideoExport ? (
                    <p className="text-xs font-medium text-beige-dim">
                      {videoExportStageLabel}
                    </p>
                  ) : null}
                  <div
                    className={`flex items-center justify-between gap-2 text-xs ${
                      isServerVideoExport ? "mt-1.5" : ""
                    }`}
                  >
                    <span className="font-medium text-beige-dim">
                      {isServerVideoExport ? "Estimated progress" : "Export progress"}
                    </span>
                    <span className="font-semibold text-beige">{exportProgress}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-beige/10">
                    <div
                      className={`h-full rounded-full bg-signal transition-[width] duration-200 ${
                        isServerVideoExport && exportServerStage === "processing"
                          ? "animate-pulse"
                          : ""
                      }`}
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                  <button
                    className="mt-2 w-full rounded-full border border-signal/30 bg-night-card px-3 py-2 text-xs font-semibold text-signal transition hover:border-signal hover:bg-signal/5"
                    onClick={handleCancelExport}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              ) : null}

              {exportNotice ? (
                <div className="rounded-lg border border-beige/10 bg-beige/5 px-2.5 py-2 text-xs text-beige">
                  <div className="flex items-center justify-between gap-2">
                    <p>{exportNotice}</p>
                    <button
                      className="shrink-0 font-medium text-beige-dim transition hover:text-beige"
                      onClick={() => setExportNotice("")}
                      type="button"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : null}

              {exportError ? (
                <div className="rounded-lg border border-signal/30 bg-signal/10 px-2.5 py-2 text-xs text-beige">
                  <p>{exportError}</p>
                  <div className="mt-2 flex items-center gap-3">
                    {mediaKind === "video" && canExportVideo ? (
                      <button
                        className="font-medium text-signal transition hover:text-beige"
                        onClick={() => {
                          setExportError("");
                          void handleVideoExport();
                        }}
                        type="button"
                      >
                        Retry export
                      </button>
                    ) : null}
                    <button
                      className="font-medium text-beige-dim transition hover:text-beige"
                      onClick={() => setExportError("")}
                      type="button"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : null}

              <EditorPanelSection title="Type">
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-night-card/60 p-1">
                  {watermarkTypes.map(({ label, value }) => (
                    <EditorSegment
                      active={watermarkType === value}
                      groupId="watermark-type"
                      key={value}
                      onClick={() => handleWatermarkTypeChange(value)}
                    >
                      {label}
                    </EditorSegment>
                  ))}
                </div>
              </EditorPanelSection>

              <EditorPanelSection title="Mode">
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-night-card/60 p-1">
                  {watermarkModes.map(({ label, value }) => (
                    <EditorSegment
                      active={watermarkMode === value}
                      className={
                        watermarkType === "signature" && value === "tile"
                          ? "cursor-not-allowed opacity-40"
                          : ""
                      }
                      groupId="watermark-mode"
                      key={value}
                      onClick={() => {
                        if (
                          watermarkType === "signature" &&
                          value === "tile"
                        ) {
                          return;
                        }

                        clearActiveTemplate();
                        setWatermarkMode(value);
                        setIsWatermarkHovering(false);
                      }}
                    >
                      {label}
                    </EditorSegment>
                  ))}
                </div>
                {watermarkType === "signature" ? (
                  <p className="text-[11px] leading-4 text-beige-dim/80">
                    Signatures use single placement only.
                  </p>
                ) : null}
              </EditorPanelSection>

              <AnimatePresence mode="wait">
                {watermarkType === "text" ? (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    initial={{ opacity: 0, y: 10 }}
                    key="watermark-text-layers"
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <WatermarkLayersPanel
                      activeLayerId={activeTextLayerId}
                      fontFamilies={fontFamilies}
                      hasMedia={hasMedia}
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
                      onLayerSelect={(id) => {
                        setActiveTextLayerId(id);
                        const layer = textLayers.find((entry) => entry.id === id);

                        if (layer) {
                          syncLegacyFromTextLayer(layer);
                        }

                        setIsWatermarkHovering(false);
                      }}
                      onPositionChange={(position) => {
                        if (shouldIgnoreManualSettingsChange()) {
                          return;
                        }

                        updateTextLayer(activeTextLayerId, {
                          customPosition: null,
                          watermarkPosition: position,
                        });
                        setWatermarkPosition(position);
                        setCustomPosition(null);
                      }}
                      onRemoveLayer={removeTextLayer}
                      onTextChange={(value) => {
                        updateTextLayer(activeTextLayerId, { text: value });
                        setWatermarkText(value);
                      }}
                      onTileAngleChange={(value) => {
                        if (shouldIgnoreManualSettingsChange()) {
                          return;
                        }

                        clearActiveTemplate();
                        setTileAngle(value);
                      }}
                      onTileDensityChange={(value) => {
                        if (shouldIgnoreManualSettingsChange()) {
                          return;
                        }

                        clearActiveTemplate();
                        setTileDensity(value);
                      }}
                      onTileGapChange={(value) => {
                        if (shouldIgnoreManualSettingsChange()) {
                          return;
                        }

                        clearActiveTemplate();
                        setTileGap(value);
                      }}
                      onWatermarkOpacityChange={(value) => {
                        updateTextLayer(activeTextLayerId, { opacity: value });
                        handleWatermarkOpacityChange(value);
                      }}
                      tileAngle={tileAngle}
                      tileDensity={tileDensity}
                      tileGap={tileGap}
                      type="text"
                      watermarkPosition={activeTextLayer.watermarkPosition}
                    />
                  </motion.div>
                ) : watermarkType === "logo" ? (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    initial={{ opacity: 0, y: 10 }}
                    key="watermark-logo-layers"
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <WatermarkLayersPanel
                      activeLayerId={activeLogoLayerId}
                      fontFamilies={fontFamilies}
                      hasMedia={hasMedia}
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
                      onPositionChange={(position) => {
                        if (shouldIgnoreManualSettingsChange()) {
                          return;
                        }

                        updateLogoLayer(activeLogoLayerId, {
                          customPosition: null,
                          watermarkPosition: position,
                        });
                        setWatermarkPosition(position);
                        setCustomPosition(null);
                      }}
                      onRemoveLayer={removeLogoLayer}
                      onTextChange={() => undefined}
                      onTileAngleChange={(value) => {
                        if (shouldIgnoreManualSettingsChange()) {
                          return;
                        }

                        clearActiveTemplate();
                        setTileAngle(value);
                      }}
                      onTileDensityChange={(value) => {
                        if (shouldIgnoreManualSettingsChange()) {
                          return;
                        }

                        clearActiveTemplate();
                        setTileDensity(value);
                      }}
                      onTileGapChange={(value) => {
                        if (shouldIgnoreManualSettingsChange()) {
                          return;
                        }

                        clearActiveTemplate();
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
                      watermarkPosition={activeLogoLayer.watermarkPosition}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    initial={{ opacity: 0, y: 10 }}
                    key="watermark-signature-input"
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <p className="text-xs font-medium text-beige-dim">
                      Signature
                    </p>
                    <div className="mt-1">
                      <SignatureControls
                        activeSignatureId={activeSignatureId}
                        hasDocument={hasMedia}
                        onActiveSignatureChange={handleActiveSignatureChange}
                        onPlaceSignature={placeSignatureOnDocument}
                        onSignaturesChange={setSavedSignatures}
                        savedSignatures={savedSignatures}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {watermarkMode === "single" && hasMedia && watermarkType === "signature" ? (
                <p className="text-[11px] leading-4 text-beige-dim/80">
                  Drag a saved signature onto the preview, or drag it on the canvas
                  to reposition.
                </p>
              ) : null}

              {!showRestoredSettingsNotice ? (
                <button
                  className="block text-xs font-medium text-beige-dim transition hover:text-beige"
                  onClick={resetWatermarkSettingsToDefaults}
                  type="button"
                >
                  Reset to defaults
                </button>
              ) : null}

              {!hasMedia ? (
                <EditorCard>
                  <p className="text-sm leading-6 text-beige-dim">
                    Upload an image, PDF, or video to start watermarking.
                  </p>
                  <button
                    className="mt-3 w-full rounded-xl border border-dashed border-beige/10 bg-night-card/70 px-4 py-3 text-sm font-semibold text-beige transition hover:border-sand hover:bg-night-card"
                    onClick={openFilePicker}
                    type="button"
                  >
                    Choose file
                  </button>
                </EditorCard>
              ) : null}
            </div>
          ) : null}

          {activeEditorPanel === "templates" ? (
            <div className="space-y-3">
              <EditorPanelSection title="Quick templates">
                <div className="grid grid-cols-3 gap-2">
                  {watermarkTemplates.map((template) => {
                    const isSelected = activeTemplate === template.id;

                    return (
                      <motion.button
                        aria-pressed={isSelected}
                        className={`relative rounded-xl border px-1.5 py-2 text-left transition-colors ${
                          isSelected
                            ? "border-signal text-white"
                            : "border-beige/10 bg-night-card text-beige-dim hover:border-signal hover:text-beige"
                        }`}
                        key={template.id}
                        onPointerDown={(event) => event.preventDefault()}
                        onClick={() => applyTemplate(template)}
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        transition={{ type: "spring", stiffness: 420, damping: 28 }}
                      >
                        {isSelected ? (
                          <motion.span
                            className="absolute inset-0 rounded-xl border border-signal bg-signal shadow-md"
                            layoutId="template-selection"
                            transition={{
                              type: "spring",
                              stiffness: 380,
                              damping: 32,
                            }}
                          />
                        ) : null}
                        <span className="relative z-10">
                          <TemplateIcon
                            isSelected={isSelected}
                            variant={template.icon}
                          />
                          <span className="mt-1 block truncate text-[10px] font-semibold leading-tight">
                            {template.label}
                          </span>
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </EditorPanelSection>

              {watermarkMode === "tile" ? (
                <div className="space-y-2">
                  <EditorPanelSection title="Density">
                    <div className="grid grid-cols-3 gap-1">
                      {tileDensities.map(({ label, value }) => (
                        <EditorPill
                          active={tileDensity === value}
                          groupId="template-tile-density"
                          key={value}
                          onClick={() => {
                            if (shouldIgnoreManualSettingsChange()) {
                              return;
                            }

                            clearActiveTemplate();
                            setTileDensity(value);
                          }}
                        >
                          {label}
                        </EditorPill>
                      ))}
                    </div>
                  </EditorPanelSection>

                  <EditorPanelSection title="Angle">
                    <div className="grid grid-cols-4 gap-1">
                      {tileAngles.map(({ label, value }) => (
                        <EditorPill
                          active={tileAngle === value}
                          groupId="template-tile-angle"
                          key={value}
                          onClick={() => {
                            if (shouldIgnoreManualSettingsChange()) {
                              return;
                            }

                            clearActiveTemplate();
                            setTileAngle(value);
                          }}
                        >
                          {label}
                        </EditorPill>
                      ))}
                    </div>
                  </EditorPanelSection>

                  <EditorPanelSection title="Gap">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-semibold text-beige">
                        {tileGap}%
                      </span>
                    </div>
                    <input
                      className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-full bg-editor-panel-header accent-signal"
                      id="template-tile-gap"
                      max={300}
                      min={50}
                      onChange={(event) => {
                        if (shouldIgnoreManualSettingsChange()) {
                          return;
                        }

                        clearActiveTemplate();
                        setTileGap(Number(event.target.value));
                      }}
                      step={10}
                      type="range"
                      value={tileGap}
                    />
                  </EditorPanelSection>
                </div>
              ) : null}

              <WatermarkStyleControls
                fontFamilies={fontFamilies}
                fontFamily={fontFamily}
                fontSizeScale={fontSizeScale}
                onFontFamilyChange={handleFontFamilyChange}
                onFontSizeScaleChange={handleFontSizeScaleChange}
                onWatermarkOpacityChange={handleWatermarkOpacityChange}
                watermarkOpacity={watermarkOpacity}
                watermarkType={watermarkType}
              />

              {savedPresets.length ? (
                <EditorPanelSection title="Saved presets">
                  <div className="flex flex-wrap gap-1.5">
                    {savedPresets.map((preset) => (
                      <button
                        className="rounded-full border border-beige/10 bg-night-card px-2.5 py-1 text-[11px] font-semibold text-beige-dim transition hover:border-sand hover:text-beige"
                        key={preset.id}
                        onClick={() =>
                          applyWatermarkSettingsSnapshot(preset.snapshot)
                        }
                        type="button"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </EditorPanelSection>
              ) : null}

              <EditorPanelSection title="Save preset">
                <button
                  aria-label="Save watermark preset"
                  className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                    isSavingPreset
                      ? "border-signal bg-signal text-white"
                      : "border-beige/10 bg-night-card text-beige-dim hover:border-signal hover:text-beige"
                  }`}
                  onClick={() => setIsSavingPreset((value) => !value)}
                  type="button"
                >
                  <BookmarkPlus size={15} />
                  Save current settings
                </button>

                {isSavingPreset ? (
                  <EditorCard className="mt-2">
                    <label
                      className="text-xs font-medium text-beige-dim"
                      htmlFor="preset-name"
                    >
                      Name this preset
                    </label>
                    <input
                      className="mt-1 w-full rounded-lg border border-beige/10 bg-night-card px-2 py-1.5 text-xs text-beige outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
                      id="preset-name"
                      onChange={(event) => setPresetName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          saveCurrentPreset();
                        }
                      }}
                      placeholder="e.g. My brand mark"
                      type="text"
                      value={presetName}
                    />
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      <button
                        className="rounded-lg bg-signal px-2.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!presetName.trim()}
                        onClick={saveCurrentPreset}
                        type="button"
                      >
                        Save
                      </button>
                      <button
                        className="rounded-lg border border-beige/10 px-2.5 py-1.5 text-xs font-semibold text-beige-dim transition hover:text-beige"
                        onClick={() => {
                          setPresetName("");
                          setIsSavingPreset(false);
                        }}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </EditorCard>
                ) : null}
              </EditorPanelSection>
            </div>
          ) : null}

          {activeEditorPanel === "crop" ? (
            <div className="space-y-3">
              {mediaKind !== "image" ? (
                <EditorCard>
                  <p className="text-sm text-beige-dim">
                    Crop is not available for video or PDF yet.
                  </p>
                </EditorCard>
              ) : (
                <>
                  <EditorCard>
                    <p className="text-sm leading-6 text-beige-dim">
                      Drag on the canvas to select a crop. Move the box or drag
                      a corner handle to resize it.
                    </p>
                  </EditorCard>
                  <EditorApplyButton
                    disabled={!cropRect || cropRect.width < 4 || cropRect.height < 4}
                    onClick={applyCrop}
                  >
                    Apply crop
                  </EditorApplyButton>
                  <button
                    className="w-full rounded-xl border border-beige/10 bg-night-card/70 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-beige-dim transition hover:text-beige"
                    onClick={cancelCrop}
                    type="button"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          ) : null}

          {activeEditorPanel === "resize" ? (
            <div className="space-y-3">
              {mediaKind !== "image" ? (
                <EditorCard>
                  <p className="text-sm text-beige-dim">
                    Resize is not available for video or PDF yet.
                  </p>
                </EditorCard>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <EditorCard>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-beige-dim">
                        Width
                      </p>
                      <input
                        className="mt-1 w-full bg-transparent text-lg font-semibold text-beige outline-none"
                        min={1}
                        onChange={(event) =>
                          handleResizeWidthChange(Number(event.target.value))
                        }
                        type="number"
                        value={resizeWidth}
                      />
                      <span className="text-xs text-beige-dim">px</span>
                    </EditorCard>
                    <EditorCard>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-beige-dim">
                        Height
                      </p>
                      <input
                        className="mt-1 w-full bg-transparent text-lg font-semibold text-beige outline-none"
                        min={1}
                        onChange={(event) =>
                          handleResizeHeightChange(Number(event.target.value))
                        }
                        type="number"
                        value={resizeHeight}
                      />
                      <span className="text-xs text-beige-dim">px</span>
                    </EditorCard>
                  </div>
                  <EditorToggleRow
                    checked={isAspectRatioLocked}
                    label="Aspect ratio"
                    onChange={() => setIsAspectRatioLocked((value) => !value)}
                  />
                  {resizeWarning ? (
                    <p className="text-xs leading-4 text-signal">{resizeWarning}</p>
                  ) : null}
                  <EditorApplyButton onClick={applyResize}>Apply resize</EditorApplyButton>
                </>
              )}
            </div>
          ) : null}

          {activeEditorPanel === "rotate" ? (
            <div className="space-y-3">
              {mediaKind !== "image" ? (
                <EditorCard>
                  <p className="text-sm text-beige-dim">
                    Rotate is not available for video or PDF yet.
                  </p>
                </EditorCard>
              ) : (
                <>
                  <EditorCard>
                    <p className="text-sm leading-6 text-beige-dim">
                      Rotate the base image. Watermark settings stay unchanged.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        className="rounded-xl border border-beige/10 bg-night-card px-3 py-2 text-xs font-semibold text-beige transition hover:border-sand"
                        onClick={() => rotateBaseImage("left")}
                        type="button"
                      >
                        90° left
                      </button>
                      <button
                        className="rounded-xl border border-beige/10 bg-night-card px-3 py-2 text-xs font-semibold text-beige transition hover:border-sand"
                        onClick={() => rotateBaseImage("right")}
                        type="button"
                      >
                        90° right
                      </button>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between gap-3">
                        <label
                          className="text-xs font-medium text-beige-dim"
                          htmlFor="base-rotation"
                        >
                          Manual angle
                        </label>
                        <input
                          className="w-16 rounded-lg border border-beige/10 bg-night-card px-2 py-1 text-right text-xs text-beige outline-none"
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
                        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-editor-panel-header accent-signal"
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

          {activeEditorPanel === "effects" ? (
            <div className="space-y-3">
              {mediaKind !== "image" ? (
                <EditorCard>
                  <p className="text-sm text-beige-dim">
                    Effects are not available for video or PDF yet.
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

            </EditorToolPanel>
          ) : null}

          {uploadError ? (
            <div className="absolute bottom-20 left-[4.5rem] z-10 max-w-xs rounded-xl border border-signal/30 bg-signal/10 px-4 py-3 text-sm text-beige">
              {uploadError}
            </div>
          ) : null}
        </div>

        <section
          className="relative flex min-h-[320px] min-w-0 flex-col overflow-hidden md:min-h-0"
          ref={previewPanelRef}
        >
          <div className="editor-checkerboard flex min-h-0 flex-1 items-center justify-center p-4 md:p-6">
            {isPdfLoading ? (
              <div className="text-center">
                <p className="text-lg font-semibold text-beige">Loading PDF...</p>
                <p className="mt-2 text-sm text-beige-dim">
                  Rendering pages in your browser.
                </p>
              </div>
            ) : (mediaKind === "image" || mediaKind === "pdf") && image ? (
              <canvas
                className={`max-h-full max-w-full touch-none shadow-lg ${
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
                style={{ cursor: canvasCursor }}
              />
            ) : mediaKind === "video" && videoUrl ? (
              <div
                className="relative max-h-full max-w-full overflow-hidden shadow-lg"
                ref={videoPreviewRef}
              >
                <video
                  className="block max-h-full max-w-full"
                  controls
                  playsInline
                  src={videoUrl}
                />
                <canvas
                  className={`absolute inset-0 h-full w-full touch-none ${
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
                  style={{ cursor: canvasCursor }}
                />
              </div>
            ) : (
              <div className="w-full max-w-xl">
                <UploadZone
                  onClick={openFilePicker}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />
              </div>
            )}
          </div>

          {canvasMetaLabel ? (
            <p className="border-t border-beige/10 bg-night-card py-2 text-center text-xs text-beige-dim">
              {canvasMetaLabel}
            </p>
          ) : null}
        </section>
      </motion.div>

      <EditorBottomBar
        canRedo={canRedoSettings}
        canUndo={canUndoSettings}
        exportDisabled={isExportDisabled}
        exportLabel={exportButtonLabel}
        exportTitle={exportDisabledReason}
        onExit={clearAllMedia}
        onExport={handleExport}
        onRedo={redoWatermarkSettings}
        onUndo={undoWatermarkSettings}
      />
    </main>
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
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-beige/10 bg-night-elevated text-beige-dim transition hover:border-sand/40 hover:text-beige disabled:cursor-not-allowed disabled:opacity-35"
            disabled={!canGoLeft}
            onClick={() => setStartIndex((index) => Math.max(0, index - 1))}
            type="button"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>

          <p className="text-center text-[10px] font-medium tabular-nums text-beige-dim">
            {safeStartIndex + 1}–
            {Math.min(safeStartIndex + stripVisibleCount, items.length)} of{" "}
            {items.length}
          </p>

          <button
            aria-label="Show next items"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-beige/10 bg-night-elevated text-beige-dim transition hover:border-sand/40 hover:text-beige disabled:cursor-not-allowed disabled:opacity-35"
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
  onRemove,
  onSelect,
}: ImageBatchStripProps) {
  return (
    <div className="rounded-lg border border-beige/10 bg-night-card p-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-beige-dim">
        Batch images
      </p>
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
                    ? "border-signal ring-2 ring-signal/20"
                    : "border-beige/10 hover:border-signal/60"
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
                <span className="block truncate px-1 py-1 text-[10px] text-beige-dim">
                  {entry.fileName}
                </span>
              </button>
              <button
                aria-label={`Remove ${entry.fileName}`}
                className="absolute right-1 top-1 rounded-full bg-night-card/90 p-0.5 text-beige-dim shadow-sm transition hover:bg-signal hover:text-white"
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
  onSelect: (id: string) => void;
  pages: PdfPageThumbnail[];
};

function PdfPageStrip({ activeId, onSelect, pages }: PdfPageStripProps) {
  return (
    <div className="rounded-lg border border-beige/10 bg-night-card p-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-beige-dim">
        PDF pages
      </p>
      <PaginatedThreeColumnStrip
        activeId={activeId}
        getItemId={(page) => page.id}
        items={pages}
        renderItem={(page) => {
          const isActive = page.id === activeId;

          return (
            <button
              className={`block w-full overflow-hidden rounded-lg border transition ${
                isActive
                  ? "border-signal ring-2 ring-signal/20"
                  : "border-beige/10 hover:border-signal/60"
              }`}
              onClick={() => onSelect(page.id)}
              title={`Page ${page.pageNumber}`}
              type="button"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`Page ${page.pageNumber}`}
                className="aspect-[3/4] w-full bg-beige/10 object-contain"
                src={page.thumbnailUrl}
              />
              <span className="block truncate px-1 py-1 text-[10px] text-beige-dim">
                Page {page.pageNumber}
              </span>
            </button>
          );
        }}
      />
    </div>
  );
}

function UploadZone({ onClick, onDragOver, onDrop }: UploadZoneProps) {
  return (
    <div
      className="cursor-pointer rounded-2xl border border-dashed border-beige/20 bg-night-card/80 px-6 py-12 text-center transition hover:border-sand hover:bg-night-elevated"
      onClick={onClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
      role="button"
      tabIndex={0}
    >
      <p className="text-lg font-semibold text-beige">
        Drop your images, PDF, or video here
      </p>
      <p className="mt-2 text-sm text-beige-dim">
        Select multiple images for batch watermarking, one PDF, or one video
      </p>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-beige-dim">
        JPG, PNG, WebP, PDF, MP4, MOV, WebM
      </p>
    </div>
  );
}

type TemplateIconProps = {
  isSelected: boolean;
  variant: WatermarkTemplate["icon"];
};

function TemplateIcon({ isSelected, variant }: TemplateIconProps) {
  const markColor = isSelected ? "bg-signal" : "bg-beige-dim";
  const lineColor = isSelected ? "bg-signal" : "bg-beige-dim/70";

  return (
    <span className="relative block h-6 rounded-md border border-beige/10 bg-beige/5">
      {variant === "corner" ? (
        <span
          className={`absolute bottom-1 right-1 h-1.5 w-3 rounded-full ${markColor}`}
        />
      ) : null}
      {variant === "center" ? (
        <span
          className={`absolute left-1/2 top-1/2 h-2 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full ${markColor}`}
        />
      ) : null}
      {variant === "dense" ? (
        <>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <span
              className={`absolute h-1 w-3 rotate-[-35deg] rounded-full ${lineColor}`}
              key={index}
              style={{
                left: `${4 + (index % 3) * 11}px`,
                top: `${5 + Math.floor(index / 3) * 9}px`,
              }}
            />
          ))}
        </>
      ) : null}
      {variant === "sparse" ? (
        <>
          {[0, 1, 2].map((index) => (
            <span
              className={`absolute h-1 w-4 rotate-[-35deg] rounded-full ${lineColor}`}
              key={index}
              style={{
                left: `${4 + index * 11}px`,
                top: `${5 + index * 4}px`,
              }}
            />
          ))}
        </>
      ) : null}
      {variant === "signature" ? (
        <span
          className={`absolute bottom-1 left-1/2 h-1.5 w-6 -translate-x-1/2 rounded-full ${markColor}`}
        />
      ) : null}
    </span>
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

function getCanvasPoint(event: PointerEvent<HTMLCanvasElement>) {
  const canvas = event.currentTarget;
  const rect = canvas.getBoundingClientRect();

  if (!rect.width || !rect.height) {
    return null;
  }

  const x = clamp(
    ((event.clientX - rect.left) / rect.width) * canvas.width,
    0,
    canvas.width,
  );
  const y = clamp(
    ((event.clientY - rect.top) / rect.height) * canvas.height,
    0,
    canvas.height,
  );

  return { x, y };
}

function getCanvasPlacementFromDrag(
  event: DragEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
) {
  const rect = canvas.getBoundingClientRect();

  if (!rect.width || !rect.height) {
    return null;
  }

  return {
    xPercent: clamp((event.clientX - rect.left) / rect.width, 0, 1),
    yPercent: clamp((event.clientY - rect.top) / rect.height, 0, 1),
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
): Promise<HTMLImageElement> {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  if (context) {
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
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
  customPosition: CustomPosition | null;
  fontFamily: string;
  fontSizeScale: number;
  image: HTMLImageElement;
  imageEffectSettings: ImageEffectSettings;
  logoImage: HTMLImageElement | null;
  logoLayers: LogoWatermarkLayer[];
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
  signaturePosition: WatermarkPosition;
  textLayers: TextWatermarkLayer[];
  tileAngle: TileAngle;
  tileDensity: TileDensity;
  tileGap: number;
  watermarkMode: WatermarkMode;
  watermarkType: WatermarkType;
};

const defaultWatermarkFontFamily =
  'Arial, Helvetica, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

function paintWatermarkLayers({
  activeLayerId,
  canvasHeight,
  canvasWidth,
  context,
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
  signaturePosition,
  textLayers,
  tileAngle,
  tileDensity,
  tileGap,
  watermarkMode,
  watermarkType,
}: WatermarkLayerPaintInput): {
  activeBounds: TextBounds | null;
  boundsByLayer: Map<string, TextBounds>;
} {
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
    isActive,
    layerId,
    logoImage,
    opacity,
    watermarkPosition,
    watermarkText,
    layerType,
  }: {
    customPosition: CustomPosition | null;
    fontFamily: string;
    fontSizeScale: number;
    isActive: boolean;
    layerId: string;
    logoImage: HTMLImageElement | null;
    opacity: number;
    watermarkPosition: WatermarkPosition;
    watermarkText: string;
    layerType: "text" | "logo";
  }) => {
    const drawable = getDrawableWatermark({
      context,
      fontFamily,
      fontSizeScale,
      imageWidth,
      logoImage,
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
        drawable,
        gap: tileGap,
        imageHeight,
        imageWidth,
        imageX,
        imageY,
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

      drawLayer({
        customPosition: layer.customPosition,
        fontFamily: layer.fontFamily,
        fontSizeScale: layer.fontSizeScale,
        isActive: layer.id === activeLayerId,
        layerId: layer.id,
        logoImage: null,
        opacity: layer.opacity,
        watermarkPosition: layer.watermarkPosition,
        watermarkText: layer.text,
        layerType: "text",
      });
    }
  } else if (watermarkType === "logo") {
    for (const layer of logoLayers) {
      if (!layer.logoImage) {
        continue;
      }

      drawLayer({
        customPosition: layer.customPosition,
        fontFamily: defaultWatermarkFontFamily,
        fontSizeScale: layer.fontSizeScale,
        isActive: layer.id === activeLayerId,
        layerId: layer.id,
        logoImage: layer.logoImage,
        opacity: layer.opacity,
        watermarkPosition: layer.watermarkPosition,
        watermarkText: "",
        layerType: "logo",
      });
    }
  } else if (watermarkType === "signature" && signatureImage) {
    drawLayer({
      customPosition: signatureCustomPosition,
      fontFamily: defaultWatermarkFontFamily,
      fontSizeScale: signatureFontSizeScale,
      isActive: true,
      layerId: "signature",
      logoImage: signatureImage,
      opacity: signatureOpacity,
      watermarkPosition: signaturePosition,
      watermarkText: "",
      layerType: "logo",
    });
  }

  return { activeBounds, boundsByLayer };
}

type WatermarkOnlyRenderInput = {
  activeLayerId?: string;
  activeLogoLayerId?: string;
  activeTextLayerId?: string;
  context: CanvasRenderingContext2D;
  customPosition: CustomPosition | null;
  fontFamily: string;
  fontSizeScale: number;
  height: number;
  logoImage: HTMLImageElement | null;
  logoLayers?: LogoWatermarkLayer[];
  textLayers?: TextWatermarkLayer[];
  tileAngle: TileAngle;
  tileDensity: TileDensity;
  tileGap: number;
  watermarkMode: WatermarkMode;
  watermarkOpacity: number;
  watermarkPosition: WatermarkPosition;
  watermarkText: string;
  watermarkType: WatermarkType;
  width: number;
};

function drawWatermarkOnly({
  context,
  customPosition,
  fontFamily,
  fontSizeScale,
  height,
  logoImage,
  logoLayers,
  activeLayerId,
  activeLogoLayerId,
  activeTextLayerId,
  textLayers,
  tileAngle,
  tileDensity,
  tileGap,
  watermarkMode,
  watermarkOpacity,
  watermarkPosition,
  watermarkText,
  watermarkType,
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
              id: "legacy-text",
              opacity: watermarkOpacity,
              text: watermarkText,
              type: "text" as const,
              watermarkPosition,
            },
          ]
        : []),
    tileAngle,
    tileDensity,
    tileGap,
    watermarkMode,
    watermarkType,
  });

  return activeBounds;
}

type WatermarkOverlayCanvasInput = Omit<WatermarkOnlyRenderInput, "context">;

function renderWatermarkOverlayCanvas({
  activeLogoLayerId,
  activeTextLayerId,
  customPosition,
  fontFamily,
  fontSizeScale,
  height,
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
  width,
}: WatermarkOverlayCanvasInput) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);

  if (!context) {
    throw new Error("Could not create watermark overlay canvas.");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  drawWatermarkOnly({
    activeLogoLayerId,
    activeTextLayerId,
    context,
    customPosition,
    fontFamily,
    fontSizeScale,
    height: canvas.height,
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
  textLayers,
  tileAngle,
  tileDensity,
  tileGap,
  watermarkMode,
  watermarkOpacity,
  watermarkPosition,
  watermarkText,
  watermarkType,
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
  textLayers: TextWatermarkLayer[];
  tileAngle: TileAngle;
  tileDensity: TileDensity;
  tileGap: number;
  watermarkMode: WatermarkMode;
  watermarkOpacity: number;
  watermarkPosition: WatermarkPosition;
  watermarkText: string;
  watermarkType: WatermarkType;
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
    logoLayers,
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
    watermarkType,
  });
}

function renderExportCanvas({
  activeLogoLayerId,
  activeTextLayerId,
  customPosition,
  fontFamily,
  fontSizeScale,
  image,
  imageEffectSettings,
  logoImage,
  logoLayers,
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
  drawBaseImageWithEffect(
    context,
    image,
    -sourceWidth / 2,
    -sourceHeight / 2,
    sourceWidth,
    sourceHeight,
    imageEffectSettings,
  );
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

type PdfPageWatermarkOverlayInput = Omit<
  WatermarkOverlayCanvasInput,
  "height" | "width"
> & {
  canvasSize: CanvasSize;
  pageHeight: number;
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
  pageHeight,
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
    resolveCustomPosition: (position) => ({
      textAlign: "center" as CanvasTextAlign,
      textBaseline: "middle" as CanvasTextBaseline,
      x: ((position.xPercent * canvasSize.width - imageX) / imageWidth) * pageW,
      y:
        ((position.yPercent * canvasSize.height - imageY) / imageHeight) *
        pageH,
    }),
    signatureCustomPosition: customPosition,
    signatureFontSizeScale: fontSizeScale,
    signatureImage: watermarkType === "signature" ? logoImage : null,
    signatureOpacity: watermarkOpacity,
    signaturePosition: watermarkPosition,
    textLayers: textLayers ?? [],
    tileAngle,
    tileDensity,
    tileGap,
    watermarkMode,
    watermarkType,
  });

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
    first.watermarkType === second.watermarkType
  );
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

function getNextCropRect({
  drag,
  image,
  point,
}: {
  drag: {
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

  return rectFromPoints({ x: left, y: top }, { x: right, y: bottom }, image);
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

  context.fillStyle = "rgba(8, 22, 31, 0.45)";
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
  context.strokeStyle = "#F97316";
  context.lineWidth = 2;
  context.strokeRect(rect.x, rect.y, rect.width, rect.height);
  drawCropHandle(context, rect.x, rect.y);
  drawCropHandle(context, rect.x + rect.width / 2, rect.y);
  drawCropHandle(context, rect.x + rect.width, rect.y);
  drawCropHandle(context, rect.x + rect.width, rect.y + rect.height / 2);
  drawCropHandle(context, rect.x, rect.y + rect.height / 2);
  drawCropHandle(context, rect.x, rect.y + rect.height);
  drawCropHandle(context, rect.x + rect.width / 2, rect.y + rect.height);
  drawCropHandle(context, rect.x + rect.width, rect.y + rect.height);

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
) {
  context.fillStyle = "#FFFFFF";
  context.strokeStyle = "#F97316";
  context.lineWidth = 2;
  context.beginPath();
  context.rect(x - 5, y - 5, 10, 10);
  context.fill();
  context.stroke();
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
  fontFamily: string;
  fontSizeScale: number;
  imageWidth: number;
  logoImage: HTMLImageElement | null;
  watermarkText: string;
  watermarkType: WatermarkType;
};

function getDrawableWatermark({
  context,
  fontFamily,
  fontSizeScale,
  imageWidth,
  logoImage,
  watermarkText,
  watermarkType,
}: DrawableInput): DrawableWatermark | null {
  const baseFontSize = Math.max(
    8,
    Math.min(imageWidth / 12, 72) * (fontSizeScale / 100),
  );

  if (isImageWatermarkType(watermarkType)) {
    if (!logoImage) {
      return null;
    }

    const logoWidth = Math.min(
      imageWidth * 0.6,
      Math.max(24, imageWidth * 0.18 * (fontSizeScale / 100)),
    );
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
  context.font = `700 ${baseFontSize}px ${fontFamily}`;
  const metrics = context.measureText(trimmedWatermark);
  context.restore();

  return {
    fontFamily,
    fontSize: baseFontSize,
    height:
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent ||
      baseFontSize,
    kind: "text",
    text: trimmedWatermark,
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
  context.font = `700 ${drawable.fontSize}px ${drawable.fontFamily}`;
  context.textAlign = textAlign;
  context.textBaseline = textBaseline;
  context.lineWidth = Math.max(3, drawable.fontSize / 12);
  context.strokeStyle = `rgba(0, 0, 0, ${Math.min(alpha, 0.5)})`;
  context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  context.shadowColor = `rgba(0, 0, 0, ${Math.min(alpha, 0.4)})`;
  context.shadowBlur = 10;
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
  drawable: DrawableWatermark;
  gap: number;
  imageHeight: number;
  imageWidth: number;
  imageX: number;
  imageY: number;
};

function drawTiledWatermark({
  alpha,
  angle,
  context,
  density,
  drawable,
  gap,
  imageHeight,
  imageWidth,
  imageX,
  imageY,
}: TiledWatermarkInput) {
  const densityConfig =
    tileDensities.find((option) => option.value === density) ??
    tileDensities[1];
  const densitySpacing = imageWidth / densityConfig.repetitionsAcross;
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
