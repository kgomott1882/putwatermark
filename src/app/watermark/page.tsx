"use client";

import { Button } from "../../../components/Button";
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
  buildPdfPageThumbnails,
  loadPdfDocument,
  renderPdfPagePreview,
  type PdfPageThumbnail,
} from "../../lib/pdfPreview";
import JSZip from "jszip";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { motion } from "framer-motion";
import { BookmarkPlus, Redo2, Undo2, X } from "lucide-react";
import {
  type DragEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const acceptedVideoTypes = ["video/mp4", "video/quicktime", "video/webm"];
const acceptedMediaInputTypes =
  "image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,.mov,application/pdf,.pdf";

type WatermarkType = "text" | "logo";

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
  backgroundRemovedLogoImage: HTMLImageElement | null;
  customPosition: CustomPosition | null;
  fontFamily: string;
  fontSizeScale: number;
  isLogoBackgroundRemoved: boolean;
  logoFileName: string;
  logoImage: HTMLImageElement | null;
  originalLogoImage: HTMLImageElement | null;
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
];

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
  const logoInputRef = useRef<HTMLInputElement>(null);
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const logoObjectUrlRef = useRef<string | null>(null);
  const textBoundsRef = useRef<TextBounds | null>(null);
  const imageFrameRef = useRef<ImageFrame | null>(null);
  const isDraggingRef = useRef(false);
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
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: 900,
    height: 600,
  });

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
    const snapshot: WatermarkSettingsSnapshot = {
      backgroundRemovedLogoImage,
      customPosition: customPosition ? { ...customPosition } : null,
      fontFamily,
      fontSizeScale,
      isLogoBackgroundRemoved,
      logoFileName,
      logoImage,
      originalLogoImage,
      tileAngle,
      tileDensity,
      tileGap,
      watermarkMode,
      watermarkOpacity,
      watermarkPosition,
      watermarkText,
      watermarkType,
    };

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
    backgroundRemovedLogoImage,
    customPosition,
    fontFamily,
    fontSizeScale,
    isLogoBackgroundRemoved,
    logoFileName,
    logoImage,
    originalLogoImage,
    tileAngle,
    tileDensity,
    tileGap,
    watermarkMode,
    watermarkOpacity,
    watermarkPosition,
    watermarkText,
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
    context.drawImage(
      image,
      -sourceImageWidth / 2,
      -sourceImageHeight / 2,
      sourceImageWidth,
      sourceImageHeight,
    );
    context.restore();

    const drawable = getDrawableWatermark({
      context,
      fontFamily,
      fontSizeScale,
      imageWidth,
      logoImage,
      watermarkText,
      watermarkType,
    });

    if (!drawable) {
      textBoundsRef.current = null;
      drawCropOverlay({
        context,
        cropRect,
        frame: imageFrame,
        image,
        isActive: activeImageTool === "crop",
      });
      return;
    }

    const alpha = watermarkOpacity / 100;

    if (watermarkMode === "tile") {
      textBoundsRef.current = null;
      drawTiledWatermark({
        alpha,
        context,
        drawable,
        angle: tileAngle,
        imageHeight,
        imageWidth,
        imageX,
        imageY,
        density: tileDensity,
        gap: tileGap,
      });
      drawCropOverlay({
        context,
        cropRect,
        frame: imageFrame,
        image,
        isActive: activeImageTool === "crop",
      });
      return;
    }

    const padding = Math.max(24, drawable.height * 0.9);
    const { x, y, textAlign, textBaseline } = customPosition
      ? {
          x: customPosition.xPercent * canvas.width,
          y: customPosition.yPercent * canvas.height,
          textAlign: "center" as CanvasTextAlign,
          textBaseline: "middle" as CanvasTextBaseline,
        }
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
    textBoundsRef.current = getDrawableBounds({
      drawable,
      textAlign,
      textBaseline,
      x,
      y,
    });
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
    textBoundsRef.current = drawWatermarkOnly({
      context,
      customPosition,
      fontFamily,
      fontSizeScale,
      height: canvas.height,
      logoImage,
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
  });

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function openBatchImagePicker() {
    fileInputRef.current?.click();
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
  ): BatchImageEntry {
    return {
      fileName: file.name,
      id: createBatchImageId(),
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

    setUploadError("");
    setIsPdfLoading(true);

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

    try {
      const pdfBytes = new Uint8Array(await file.arrayBuffer());
      const pdfDocument = await loadPdfDocument(file);
      const pages = await buildPdfPageThumbnails(pdfDocument);

      pdfBytesRef.current = pdfBytes;
      pdfDocRef.current = pdfDocument;
      setMediaKind("pdf");
      setFileName(file.name);
      setPdfPageCount(pdfDocument.numPages);
      setPdfPages(pages);
      setActivePdfPageId(pages[0]?.id ?? null);

      const firstPage = await renderPdfPagePreview(pdfDocument, 1);

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
      applyStoredWatermarkSettingsOnMediaLoad();
    } catch (error) {
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
      setIsPdfLoading(false);
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
      const nextBatch = [
        ...persistActiveBatchEntry(imageBatch, activeBatchImageId),
        ...loadedEntries,
      ];

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
      customPosition,
      fontFamily,
      fontSizeScale,
      image: imageElement,
      logoImage,
      resizeHeight: entryResizeHeight,
      resizeWidth: entryResizeWidth,
      rotationAngle: entryRotationAngle,
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

        exportCanvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("We could not export that image. Please try again."));
            return;
          }

          resolve(blob);
        }, "image/png");
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

        zip.file(getUniqueZipEntryName(entry.fileName, usedNames), blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const objectUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = "watermarked-images.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
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

  function clearActiveTemplate() {
    setActiveTemplate(null);
  }

  function shouldIgnoreManualSettingsChange() {
    return shouldIgnoreManualSettingsRef.current;
  }

  function getWatermarkSettingsSnapshot(): WatermarkSettingsSnapshot {
    return {
      backgroundRemovedLogoImage,
      customPosition: customPosition ? { ...customPosition } : null,
      fontFamily,
      fontSizeScale,
      isLogoBackgroundRemoved,
      logoFileName,
      logoImage,
      originalLogoImage,
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

  function applyWatermarkSettingsSnapshot(
    snapshot: WatermarkSettingsSnapshot,
    options: { suppressHistory?: boolean } = {},
  ) {
    if (options.suppressHistory) {
      isApplyingSettingsHistoryRef.current = true;
    }

    setOriginalLogoImage(snapshot.originalLogoImage);
    setLogoImage(snapshot.logoImage);
    setBackgroundRemovedLogoImage(snapshot.backgroundRemovedLogoImage);
    setLogoFileName(snapshot.logoFileName);
    setIsLogoBackgroundRemoved(snapshot.isLogoBackgroundRemoved);
    setLogoBackgroundMessage("");
    setWatermarkType(snapshot.watermarkType);
    setWatermarkText(snapshot.watermarkText);
    setWatermarkMode(snapshot.watermarkMode);
    setWatermarkPosition(snapshot.watermarkPosition);
    setCustomPosition(
      snapshot.customPosition ? { ...snapshot.customPosition } : null,
    );
    setTileDensity(snapshot.tileDensity);
    setTileGap(snapshot.tileGap);
    setTileAngle(snapshot.tileAngle);
    setWatermarkOpacity(snapshot.watermarkOpacity);
    setFontSizeScale(snapshot.fontSizeScale);
    setFontFamily(snapshot.fontFamily);
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
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = objectUrl;
        link.download = getExportFileName(fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
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
      !watermarkText.trim() &&
      watermarkMode === "single"
    ) {
      setExportError("Add watermark text before exporting.");
      return;
    }

    if (watermarkType === "logo" && !logoImage) {
      setExportError("Upload a logo before exporting.");
      return;
    }

    setUploadError("");
    setExportError("");
    setIsExporting(true);
    setPdfExportProgress({ current: 0, total: pdfPageCount });

    const watermarkInput = {
      customPosition,
      fontFamily,
      fontSizeScale,
      logoImage,
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
      !watermarkText.trim() &&
      watermarkMode === "single"
    ) {
      setExportError("Add watermark text before exporting.");
      return;
    }

    if (watermarkType === "logo" && !logoImage) {
      setExportError("Upload a logo before exporting.");
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
        customPosition,
        fontFamily,
        fontSizeScale,
        height: videoSize.height,
        logoImage,
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
    if (!files.length) {
      return;
    }

    const imageFiles = files.filter(isImageFile);
    const videoFiles = files.filter(isVideoFile);
    const pdfFiles = files.filter(isPdfFile);

    if (
      (imageFiles.length && videoFiles.length) ||
      (imageFiles.length && pdfFiles.length) ||
      (videoFiles.length && pdfFiles.length)
    ) {
      setUploadError(
        "Upload one PDF, images together, or a single video at a time.",
      );
      return;
    }

    if (pdfFiles.length) {
      if (pdfFiles.length > 1) {
        setUploadError("Please upload one PDF at a time.");
        return;
      }

      void loadPdfFile(pdfFiles[0]);
      return;
    }

    if (videoFiles.length) {
      if (videoFiles.length > 1) {
        setUploadError("Please upload one video at a time.");
        return;
      }

      loadVideoFile(videoFiles[0]);
      return;
    }

    if (imageFiles.length > 1) {
      void loadImageBatchFiles(imageFiles);
      return;
    }

    if (imageFiles.length === 1) {
      loadImageFile(imageFiles[0]);
      return;
    }

    setUploadError(
      "Please choose a JPG, PNG, WebP, PDF, MP4, MOV, or WebM file.",
    );
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
    clearActiveTemplate();
    setIsDraggingWatermark(true);
    setIsWatermarkHovering(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    setCustomPosition({
      xPercent: point.x / event.currentTarget.width,
      yPercent: point.y / event.currentTarget.height,
    });
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
    setCustomPosition({
      xPercent: point.x / event.currentTarget.width,
      yPercent: point.y / event.currentTarget.height,
    });
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
    const bounds = textBoundsRef.current;

    return mode === "single" && Boolean(point && bounds && isPointInBounds(point, bounds));
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

      setMediaKind("image");
      setVideoUrl("");
      setVideoDuration(0);
      setVideoSize(null);
      setVideoFileSize(0);
      setImageBatch(loadedEntries);
      applyActiveBatchEntry(loadedEntries[0]);
      applyStoredWatermarkSettingsOnMediaLoad();
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
      applyStoredWatermarkSettingsOnMediaLoad();
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
      applyStoredWatermarkSettingsOnMediaLoad();
    };
    nextVideo.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      objectUrlRef.current = null;
      setUploadError("We could not load that video. Please try another file.");
    };
    nextVideo.src = objectUrl;
  }

  function loadLogoFile(file: File) {
    if (!acceptedImageTypes.includes(file.type)) {
      setLogoError("Please choose a PNG, JPG, or WebP logo image.");
      return;
    }

    setLogoError("");

    if (logoObjectUrlRef.current) {
      URL.revokeObjectURL(logoObjectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    const nextLogo = new Image();

    logoObjectUrlRef.current = objectUrl;
    nextLogo.onload = () => {
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
      logoObjectUrlRef.current = null;
      setLogoError("We could not load that logo. Please try another file.");
    };
    nextLogo.src = objectUrl;
  }

  function handleLogoBackgroundToggle() {
    if (!originalLogoImage) {
      return;
    }

    if (isLogoBackgroundRemoved) {
      setLogoImage(originalLogoImage);
      setIsLogoBackgroundRemoved(false);
      setLogoBackgroundMessage("");
      return;
    }

    if (backgroundRemovedLogoImage) {
      setLogoImage(backgroundRemovedLogoImage);
      setIsLogoBackgroundRemoved(true);
      setLogoBackgroundMessage("Best-effort background removal is on.");
      return;
    }

    const result = createBackgroundRemovedLogo(originalLogoImage);

    if (!result) {
      setLogoBackgroundMessage(
        "Couldn't detect a plain background - try a logo with a solid-color background, or use a PNG with transparency already applied",
      );
      return;
    }

    if (result.alreadyTransparent) {
      setLogoImage(originalLogoImage);
      setBackgroundRemovedLogoImage(originalLogoImage);
      setIsLogoBackgroundRemoved(true);
      setLogoBackgroundMessage("This logo already appears to have transparent corners.");
      return;
    }

    const cleanedLogo = new Image();

    cleanedLogo.onload = () => {
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
    if (logoObjectUrlRef.current) {
      URL.revokeObjectURL(logoObjectUrlRef.current);
      logoObjectUrlRef.current = null;
    }

    setOriginalLogoImage(null);
    setLogoImage(null);
    setBackgroundRemovedLogoImage(null);
    setLogoFileName("");
    setIsLogoBackgroundRemoved(false);
    setLogoBackgroundMessage("");
    setLogoError("");
    setIsWatermarkHovering(false);
  }

  const lastPresetLabel =
    watermarkPositions.find((position) => position.value === watermarkPosition)
      ?.label ?? "Bottom right";
  const hasMedia = Boolean(
    image ||
      videoUrl ||
      isPdfLoading ||
      (mediaKind === "pdf" && pdfPageCount > 0),
  );
  const isBatchImageMode = mediaKind === "image" && imageBatch.length >= 2;
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
            : "Export PNG";
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

  return (
    <main className="min-h-screen w-full bg-paper px-4 py-4 text-ink sm:px-6 md:h-[calc(100svh-4rem)] md:overflow-hidden lg:px-10">
      <motion.div
        className="grid h-full min-h-0 gap-4 md:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <aside className="max-h-full overflow-y-auto rounded-[1.25rem] border border-platinum bg-paper p-3 shadow-2xl shadow-platinum/60">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-battleship">
            Watermark tool
          </p>
          <h1
            className={`font-bold tracking-[-0.04em] text-ink ${
              hasMedia ? "mt-0.5 text-xl" : "mt-4 text-4xl"
            }`}
          >
            Design your watermark
          </h1>
          {!hasMedia ? (
            <p className="mt-4 text-sm leading-6 text-battleship">
              Upload an image and preview your own text or logo watermark
              locally in your browser.
            </p>
          ) : null}

          <input
            accept={acceptedMediaInputTypes}
            className="hidden"
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);

              if (files.length) {
                if (isBatchImageMode && files.every(isImageFile)) {
                  void appendImageBatchFiles(files);
                } else {
                  loadMediaFiles(files);
                }
              }

              event.target.value = "";
            }}
            ref={fileInputRef}
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

          {!hasMedia ? (
            <UploadZone
              onClick={openFilePicker}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ) : (
            <div className="mt-2 space-y-2">
              <div className="rounded-lg border border-platinum bg-platinum/50 px-2.5 py-1 text-xs text-ink">
                {isPdfLoading ? (
                  <>Loading PDF...</>
                ) : isBatchImageMode ? (
                  <>
                    Batch:{" "}
                    <span className="font-semibold">
                      {imageBatch.length} images
                    </span>
                  </>
                ) : (
                  <>
                    Loaded: <span className="font-semibold">{fileName}</span>
                  </>
                )}
                {loadedMediaDetails ? (
                  <span className="ml-1 text-battleship">{loadedMediaDetails}</span>
                ) : null}
              </div>

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
                <div className="rounded-lg border border-platinum bg-platinum/40 px-2.5 py-2 text-xs text-ink">
                  <p>Your last watermark settings were restored.</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3">
                    <button
                      className="font-medium text-signal transition hover:text-ink"
                      onClick={() => setShowRestoredSettingsNotice(false)}
                      type="button"
                    >
                      Dismiss
                    </button>
                    <button
                      className="font-medium text-battleship transition hover:text-ink"
                      onClick={resetWatermarkSettingsToDefaults}
                      type="button"
                    >
                      Reset to defaults
                    </button>
                  </div>
                </div>
              ) : null}

              <Button
                as="button"
                className="w-full justify-center px-4 py-2 text-sm"
                disabled={isExportDisabled}
                onClick={handleExport}
                title={exportDisabledReason}
                type="button"
              >
                {exportButtonLabel}
              </Button>

              {isExporting && isBatchImageMode && batchExportProgress ? (
                <div className="rounded-lg border border-platinum bg-paper px-2.5 py-2">
                  <p className="text-xs font-medium text-battleship">
                    Processing {batchExportProgress.current} of{" "}
                    {batchExportProgress.total}...
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-platinum">
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
                <div className="rounded-lg border border-platinum bg-paper px-2.5 py-2">
                  <p className="text-xs font-medium text-battleship">
                    Processing page {pdfExportProgress.current} of{" "}
                    {pdfExportProgress.total}...
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-platinum">
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
                <div className="rounded-lg border border-platinum bg-paper px-2.5 py-2">
                  {isServerVideoExport ? (
                    <p className="text-xs font-medium text-battleship">
                      {videoExportStageLabel}
                    </p>
                  ) : null}
                  <div
                    className={`flex items-center justify-between gap-2 text-xs ${
                      isServerVideoExport ? "mt-1.5" : ""
                    }`}
                  >
                    <span className="font-medium text-battleship">
                      {isServerVideoExport ? "Estimated progress" : "Export progress"}
                    </span>
                    <span className="font-semibold text-ink">{exportProgress}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-platinum">
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
                    className="mt-2 w-full rounded-full border border-signal/30 bg-paper px-3 py-2 text-xs font-semibold text-signal transition hover:border-signal hover:bg-signal/5"
                    onClick={handleCancelExport}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              ) : null}

              {exportNotice ? (
                <div className="rounded-lg border border-platinum bg-platinum/50 px-2.5 py-2 text-xs text-ink">
                  <div className="flex items-center justify-between gap-2">
                    <p>{exportNotice}</p>
                    <button
                      className="shrink-0 font-medium text-battleship transition hover:text-ink"
                      onClick={() => setExportNotice("")}
                      type="button"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : null}

              {exportError ? (
                <div className="rounded-lg border border-signal/30 bg-signal/10 px-2.5 py-2 text-xs text-ink">
                  <p>{exportError}</p>
                  <div className="mt-2 flex items-center gap-3">
                    {mediaKind === "video" && canExportVideo ? (
                      <button
                        className="font-medium text-signal transition hover:text-ink"
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
                      className="font-medium text-battleship transition hover:text-ink"
                      onClick={() => setExportError("")}
                      type="button"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : null}

              <div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    aria-label="Undo watermark settings"
                    className="flex items-center justify-center rounded-full border border-platinum bg-paper px-2 py-1.5 text-battleship transition hover:border-signal hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-platinum disabled:hover:text-battleship"
                    disabled={!canUndoSettings}
                    onClick={undoWatermarkSettings}
                    type="button"
                  >
                    <Undo2 size={15} />
                  </button>
                  <button
                    aria-label="Redo watermark settings"
                    className="flex items-center justify-center rounded-full border border-platinum bg-paper px-2 py-1.5 text-battleship transition hover:border-signal hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-platinum disabled:hover:text-battleship"
                    disabled={!canRedoSettings}
                    onClick={redoWatermarkSettings}
                    type="button"
                  >
                    <Redo2 size={15} />
                  </button>
                  <button
                    aria-label="Save watermark preset"
                    className={`flex items-center justify-center rounded-full border px-2 py-1.5 transition ${
                      isSavingPreset
                        ? "border-signal bg-signal text-white"
                        : "border-platinum bg-paper text-battleship hover:border-signal hover:text-ink"
                    }`}
                    onClick={() => setIsSavingPreset((value) => !value)}
                    type="button"
                  >
                    <BookmarkPlus size={15} />
                  </button>
                </div>

                {isSavingPreset ? (
                  <div className="mt-1.5 rounded-lg border border-platinum bg-paper p-2">
                    <label
                      className="text-xs font-medium text-battleship"
                      htmlFor="preset-name"
                    >
                      Name this preset
                    </label>
                    <input
                      className="mt-1 w-full rounded-lg border border-platinum bg-paper px-2 py-1 text-xs text-ink outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
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
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      <button
                        className="rounded-full border border-signal bg-signal px-2.5 py-1 text-xs font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!presetName.trim()}
                        onClick={saveCurrentPreset}
                        type="button"
                      >
                        Save
                      </button>
                      <button
                        className="rounded-full border border-platinum px-2.5 py-1 text-xs font-semibold text-battleship transition hover:border-signal hover:text-ink"
                        onClick={() => {
                          setPresetName("");
                          setIsSavingPreset(false);
                        }}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div>
                <p className="text-xs font-medium text-battleship">Image tools</p>
                {mediaKind === "video" ? (
                  <div className="mt-1 rounded-lg border border-platinum bg-platinum/40 px-2.5 py-2 text-xs text-battleship">
                    Crop, resize, and rotate are not available for video yet.
                  </div>
                ) : mediaKind === "pdf" ? (
                  <div className="mt-1 rounded-lg border border-platinum bg-platinum/40 px-2.5 py-2 text-xs text-battleship">
                    Crop, resize, and rotate are not available for PDF.
                  </div>
                ) : (
                  <div className="mt-1 grid grid-cols-3 gap-1.5">
                    {(["crop", "resize", "rotate"] as const).map((tool) => {
                      const isSelected = activeImageTool === tool;

                      return (
                        <button
                          className={`rounded-full border px-2 py-1 text-xs font-semibold capitalize transition ${
                            isSelected
                              ? "border-signal bg-signal text-white"
                              : "border-platinum bg-paper text-battleship hover:border-signal hover:text-ink"
                          }`}
                          key={tool}
                          onClick={() => handleImageToolSelect(tool)}
                          type="button"
                        >
                          {tool}
                        </button>
                      );
                    })}
                  </div>
                )}

                {mediaKind === "image" && activeImageTool === "rotate" ? (
                  <div className="mt-1.5 rounded-lg border border-platinum bg-paper p-2">
                    <p className="text-xs leading-4 text-battleship">
                      Rotate the base image. Watermark settings stay unchanged.
                    </p>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      <button
                        className="rounded-full border border-platinum px-2.5 py-1 text-xs font-semibold text-battleship transition hover:border-signal hover:text-ink"
                        onClick={() => rotateBaseImage("left")}
                        type="button"
                      >
                        90° left
                      </button>
                      <button
                        className="rounded-full border border-platinum px-2.5 py-1 text-xs font-semibold text-battleship transition hover:border-signal hover:text-ink"
                        onClick={() => rotateBaseImage("right")}
                        type="button"
                      >
                        90° right
                      </button>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between gap-3">
                        <label
                          className="text-xs font-medium text-battleship"
                          htmlFor="base-rotation"
                        >
                          Manual angle
                        </label>
                        <input
                          className="w-16 rounded-lg border border-platinum bg-paper px-2 py-1 text-right text-xs text-ink outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
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
                        className="mt-1.5 h-2 w-full cursor-pointer appearance-none rounded-full bg-platinum accent-signal"
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
                  </div>
                ) : null}

                {mediaKind === "image" && activeImageTool === "crop" ? (
                  <div className="mt-1.5 rounded-lg border border-platinum bg-paper p-2">
                    <p className="text-xs leading-4 text-battleship">
                      Drag on the canvas to select a crop. Move the box or drag
                      a corner handle to resize it.
                    </p>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      <button
                        className="rounded-full border border-signal bg-signal px-2.5 py-1 text-xs font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!cropRect || cropRect.width < 4 || cropRect.height < 4}
                        onClick={applyCrop}
                        type="button"
                      >
                        Apply crop
                      </button>
                      <button
                        className="rounded-full border border-platinum px-2.5 py-1 text-xs font-semibold text-battleship transition hover:border-signal hover:text-ink"
                        onClick={cancelCrop}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                {mediaKind === "image" && activeImageTool === "resize" ? (
                  <div className="mt-1.5 rounded-lg border border-platinum bg-paper p-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      <label className="text-xs font-medium text-battleship">
                        Width
                        <input
                          className="mt-1 w-full rounded-lg border border-platinum bg-paper px-2 py-1 text-xs text-ink outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
                          min={1}
                          onChange={(event) =>
                            handleResizeWidthChange(Number(event.target.value))
                          }
                          type="number"
                          value={resizeWidth}
                        />
                      </label>
                      <label className="text-xs font-medium text-battleship">
                        Height
                        <input
                          className="mt-1 w-full rounded-lg border border-platinum bg-paper px-2 py-1 text-xs text-ink outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
                          min={1}
                          onChange={(event) =>
                            handleResizeHeightChange(Number(event.target.value))
                          }
                          type="number"
                          value={resizeHeight}
                        />
                      </label>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-1.5">
                      <button
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                          isAspectRatioLocked
                            ? "border-signal bg-signal text-white"
                            : "border-platinum text-battleship hover:border-signal hover:text-ink"
                        }`}
                        onClick={() => setIsAspectRatioLocked((value) => !value)}
                        type="button"
                      >
                        {isAspectRatioLocked ? "Aspect locked" : "Aspect free"}
                      </button>
                      <button
                        className="rounded-full border border-signal bg-signal px-2.5 py-1 text-xs font-semibold text-white transition hover:brightness-95"
                        onClick={applyResize}
                        type="button"
                      >
                        Apply resize
                      </button>
                    </div>
                    {resizeWarning ? (
                      <p className="mt-2 text-xs leading-4 text-signal">
                        {resizeWarning}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div>
                <p className="text-xs font-medium text-battleship">Templates</p>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  {watermarkTemplates.map((template) => {
                    const isSelected = activeTemplate === template.id;

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`rounded-lg border px-1.5 py-1.5 text-left transition ${
                          isSelected
                            ? "border-signal bg-signal/10 text-ink"
                            : "border-platinum bg-paper text-battleship hover:border-signal hover:text-ink"
                        }`}
                        key={template.id}
                        onPointerDown={(event) => event.preventDefault()}
                        onClick={() => applyTemplate(template)}
                        type="button"
                      >
                        <TemplateIcon
                          isSelected={isSelected}
                          variant={template.icon}
                        />
                        <span className="mt-0.5 block truncate text-[10px] font-semibold leading-tight">
                          {template.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {savedPresets.length ? (
                  <div className="mt-1.5 space-y-1">
                    <p className="text-xs font-medium text-battleship">
                      Saved presets
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {savedPresets.map((preset) => (
                        <button
                          className="rounded-full border border-platinum bg-paper px-2 py-1 text-[11px] font-semibold text-battleship transition hover:border-signal hover:text-ink"
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
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-medium text-battleship">Mode</p>
                  <div className="mt-1 grid grid-cols-2 gap-1 rounded-full bg-platinum/50 p-0.5">
                    {watermarkModes.map(({ label, value }) => {
                      const isSelected = watermarkMode === value;

                      return (
                        <button
                          className={`rounded-full px-2 py-1 text-xs font-semibold transition ${
                            isSelected
                              ? "bg-signal text-white"
                              : "text-battleship hover:text-ink"
                          }`}
                          key={value}
                          onClick={() => {
                            clearActiveTemplate();
                            setWatermarkMode(value);
                            setIsWatermarkHovering(false);
                          }}
                          type="button"
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-battleship">Type</p>
                  <div className="mt-1 grid grid-cols-2 gap-1 rounded-full bg-platinum/50 p-0.5">
                    {watermarkTypes.map(({ label, value }) => {
                      const isSelected = watermarkType === value;

                      return (
                        <button
                          className={`rounded-full px-2 py-1 text-xs font-semibold transition ${
                            isSelected
                              ? "bg-signal text-white"
                              : "text-battleship hover:text-ink"
                          }`}
                          key={value}
                          onClick={() => {
                            clearActiveTemplate();
                            setWatermarkType(value);
                            setIsWatermarkHovering(false);
                          }}
                          type="button"
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {watermarkType === "text" ? (
                <div>
                  <label
                    className="block text-sm font-medium text-battleship"
                    htmlFor="watermark-text"
                  >
                    Watermark text
                  </label>
                  <input
                    className="mt-1 w-full rounded-lg border border-platinum bg-paper px-2.5 py-1.5 text-sm text-ink outline-none transition placeholder:text-battleship/60 focus:border-signal focus:ring-2 focus:ring-signal/20"
                    id="watermark-text"
                    onChange={(event) => setWatermarkText(event.target.value)}
                    placeholder="Your watermark"
                    type="text"
                    value={watermarkText}
                  />
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-battleship">Logo image</p>
                  {logoImage ? (
                    <div className="mt-1 space-y-1">
                      <div className="rounded-lg border border-platinum bg-platinum/50 px-2.5 py-1 text-xs text-ink">
                        Loaded:{" "}
                        <span className="font-semibold">{logoFileName}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        <button
                          className="font-medium text-battleship transition hover:text-ink"
                          onClick={openLogoPicker}
                          type="button"
                        >
                          Choose different logo
                        </button>
                        <button
                          className="font-medium text-signal transition hover:brightness-90"
                          onClick={removeLogo}
                          type="button"
                        >
                          Remove logo
                        </button>
                      </div>
                      <div className="rounded-lg border border-platinum bg-paper p-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-platinum"
                            style={{
                              backgroundColor: "#F8FAFC",
                              backgroundImage:
                                "linear-gradient(45deg, #DCDCDD 25%, transparent 25%), linear-gradient(-45deg, #DCDCDD 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #DCDCDD 75%), linear-gradient(-45deg, transparent 75%, #DCDCDD 75%)",
                              backgroundPosition:
                                "0 0, 0 8px, 8px -8px, -8px 0",
                              backgroundSize: "16px 16px",
                            }}
                          >
                            {/* Object/data URLs cannot be optimized by next/image. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              alt="Logo background preview"
                              className="max-h-9 max-w-9 object-contain"
                              src={logoImage.src}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-battleship">
                              Remove background
                            </p>
                            <button
                              aria-pressed={isLogoBackgroundRemoved}
                              className={`mt-1 flex w-full items-center justify-between rounded-full border p-0.5 text-xs font-semibold transition ${
                                isLogoBackgroundRemoved
                                  ? "border-signal bg-signal text-white"
                                  : "border-platinum bg-platinum/40 text-battleship hover:border-signal hover:text-ink"
                              }`}
                              onClick={handleLogoBackgroundToggle}
                              type="button"
                            >
                              <span className="px-2">
                                {isLogoBackgroundRemoved ? "On" : "Off"}
                              </span>
                              <span
                                className={`h-5 w-5 rounded-full transition ${
                                  isLogoBackgroundRemoved
                                    ? "bg-white"
                                    : "bg-paper"
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-4 text-battleship/80">
                          Best-effort cleanup. Works best with logos on a plain
                          white or solid background.
                        </p>
                        {logoBackgroundMessage ? (
                          <p className="mt-1 text-[11px] leading-4 text-battleship">
                            {logoBackgroundMessage}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <button
                      className="mt-1 w-full rounded-xl border border-dashed border-battleship/50 bg-platinum/40 px-4 py-3 text-center transition hover:border-signal hover:bg-platinum/70"
                      onClick={openLogoPicker}
                      type="button"
                    >
                      <span className="block text-sm font-semibold text-ink">
                        Upload a logo
                      </span>
                      <span className="mt-1 block text-xs text-battleship">
                        PNG preferred. JPG and WebP supported.
                      </span>
                    </button>
                  )}

                  {logoError ? (
                    <div className="mt-3 rounded-2xl border border-signal/30 bg-signal/10 px-4 py-3 text-sm text-ink">
                      {logoError}
                    </div>
                  ) : null}
                </div>
              )}

              {watermarkMode === "single" ? (
                <div>
                  <p className="text-xs font-medium text-battleship">Position</p>
                  <div className="mt-1 grid w-28 grid-cols-3 gap-1">
                    {watermarkPositions.map(({ label, value }) => {
                      const isSelected =
                        !customPosition && watermarkPosition === value;

                      return (
                        <button
                          aria-label={label}
                          className={`h-7 rounded-md border text-xs transition ${
                            isSelected
                              ? "border-signal bg-signal text-white"
                              : "border-platinum bg-paper text-battleship hover:border-signal hover:text-ink"
                          }`}
                          key={value}
                          onClick={() => {
                            clearActiveTemplate();
                            setWatermarkPosition(value);
                            setCustomPosition(null);
                          }}
                          type="button"
                        >
                          <span className="sr-only">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {customPosition ? (
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-signal">
                        Custom position
                      </span>
                      <button
                        className="font-medium text-battleship transition hover:text-ink"
                        onClick={() => {
                          clearActiveTemplate();
                          setCustomPosition(null);
                        }}
                        type="button"
                      >
                        Reset to {lastPresetLabel.toLowerCase()}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-battleship">Density</p>
                    <div className="mt-1 grid grid-cols-3 gap-1">
                      {tileDensities.map(({ label, value }) => {
                        const isSelected = tileDensity === value;

                        return (
                          <button
                            className={`rounded-full border px-2 py-1 text-xs font-medium transition ${
                              isSelected
                                ? "border-signal bg-signal text-white"
                                : "border-platinum bg-paper text-battleship hover:border-signal hover:text-ink"
                            }`}
                            key={value}
                            onClick={() => {
                              if (shouldIgnoreManualSettingsChange()) {
                                return;
                              }

                              clearActiveTemplate();
                              setTileDensity(value);
                            }}
                            type="button"
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-battleship">Angle</p>
                    <div className="mt-1 grid grid-cols-4 gap-1">
                      {tileAngles.map(({ label, value }) => {
                        const isSelected = tileAngle === value;

                        return (
                          <button
                            className={`rounded-full border px-2 py-1 text-xs font-medium transition ${
                              isSelected
                                ? "border-signal bg-signal text-white"
                                : "border-platinum bg-paper text-battleship hover:border-signal hover:text-ink"
                            }`}
                            key={value}
                            onClick={() => {
                              if (shouldIgnoreManualSettingsChange()) {
                                return;
                              }

                              clearActiveTemplate();
                              setTileAngle(value);
                            }}
                            type="button"
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <label
                        className="text-xs font-medium text-battleship"
                        htmlFor="tile-gap"
                      >
                        Gap
                      </label>
                      <span className="text-xs font-semibold text-ink">
                        {tileGap}%
                      </span>
                    </div>
                    <input
                      className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-full bg-platinum accent-signal"
                      id="tile-gap"
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
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-4">
                  <label
                    className="text-xs font-medium text-battleship"
                    htmlFor="watermark-opacity"
                  >
                    Opacity
                  </label>
                  <span className="text-xs font-semibold text-ink">
                    {watermarkOpacity}%
                  </span>
                </div>
                <input
                  className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-full bg-platinum accent-signal"
                  id="watermark-opacity"
                  max={100}
                  min={10}
                  onChange={(event) => {
                    if (shouldIgnoreManualSettingsChange()) {
                      return;
                    }

                    clearActiveTemplate();
                    setWatermarkOpacity(Number(event.target.value));
                  }}
                  step={5}
                  type="range"
                  value={watermarkOpacity}
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-4">
                  <label
                    className="text-xs font-medium text-battleship"
                    htmlFor="font-size"
                  >
                    {watermarkType === "logo" ? "Logo size" : "Font size"}
                  </label>
                  <span className="text-xs font-semibold text-ink">
                    {fontSizeScale}%
                  </span>
                </div>
                <input
                  className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-full bg-platinum accent-signal"
                  id="font-size"
                  max={135}
                  min={15}
                  onChange={(event) => {
                    if (shouldIgnoreManualSettingsChange()) {
                      return;
                    }

                    clearActiveTemplate();
                    setFontSizeScale(Number(event.target.value));
                  }}
                  step={5}
                  type="range"
                  value={fontSizeScale}
                />
              </div>

              {watermarkType === "text" ? (
                <div>
                  <label
                    className="block text-xs font-medium text-battleship"
                    htmlFor="font-family"
                  >
                    Font family
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border border-platinum bg-paper px-2.5 py-1.5 text-sm text-ink outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
                    id="font-family"
                    onChange={(event) => {
                      if (shouldIgnoreManualSettingsChange()) {
                        return;
                      }

                      clearActiveTemplate();
                      setFontFamily(event.target.value);
                    }}
                    value={fontFamily}
                  >
                    {fontFamilies.map(({ label, value }) => (
                      <option key={label} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {mediaKind === "image" || mediaKind === "pdf" ? (
                <button
                  className="text-xs font-medium text-battleship transition hover:text-ink"
                  onClick={
                    isBatchImageMode ? openBatchImagePicker : openFilePicker
                  }
                  type="button"
                >
                  {mediaKind === "pdf"
                    ? "Choose a different PDF"
                    : isBatchImageMode
                      ? "Add more images"
                      : "Choose a different image"}
                </button>
              ) : null}

              {!showRestoredSettingsNotice ? (
                <button
                  className="block text-xs font-medium text-battleship transition hover:text-ink"
                  onClick={resetWatermarkSettingsToDefaults}
                  type="button"
                >
                  Reset to defaults
                </button>
              ) : null}
            </div>
          )}

          {uploadError ? (
            <div className="mt-6 rounded-2xl border border-signal/30 bg-signal/10 px-4 py-3 text-sm text-ink">
              {uploadError}
            </div>
          ) : null}
        </aside>

        <section
          className="flex min-h-[320px] items-center justify-center overflow-hidden rounded-[1.5rem] border border-platinum bg-platinum/50 p-2 shadow-2xl shadow-platinum/60 md:min-h-0"
          ref={previewPanelRef}
        >
          {isPdfLoading ? (
            <div className="flex h-full min-h-[420px] w-full items-center justify-center rounded-[1.5rem] border border-dashed border-battleship/50 bg-paper text-center">
              <div>
                <p className="text-lg font-semibold text-ink">Loading PDF...</p>
                <p className="mt-2 text-sm text-battleship">
                  Rendering pages in your browser.
                </p>
              </div>
            </div>
          ) : (mediaKind === "image" || mediaKind === "pdf") && image ? (
            <canvas
              className="h-full max-h-full w-full touch-none rounded-[1.5rem] bg-platinum object-contain"
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
              className="relative max-h-full max-w-full overflow-hidden rounded-[1.5rem] bg-black"
              ref={videoPreviewRef}
            >
              <video
                className="block max-h-[calc(100vh-3rem)] max-w-full"
                controls
                playsInline
                src={videoUrl}
              />
              <canvas
                className="absolute inset-0 h-full w-full touch-none"
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
            <div className="flex h-full min-h-[420px] w-full items-center justify-center rounded-[1.5rem] border border-dashed border-battleship/50 bg-paper text-center">
              <div>
                <p className="text-lg font-semibold text-ink">
                  Your preview will appear here
                </p>
                <p className="mt-2 text-sm text-battleship">
                  Upload a JPG, PNG, WebP, PDF, MP4, MOV, or WebM to start.
                </p>
              </div>
            </div>
          )}
        </section>
      </motion.div>
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

function ImageBatchStrip({
  activeId,
  entries,
  onRemove,
  onSelect,
}: ImageBatchStripProps) {
  return (
    <div className="rounded-lg border border-platinum bg-paper p-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-battleship">
        Batch images
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {entries.map((entry) => {
          const isActive = entry.id === activeId;

          return (
            <div className="relative" key={entry.id}>
              <button
                className={`group relative block w-full overflow-hidden rounded-lg border transition ${
                  isActive
                    ? "border-signal ring-2 ring-signal/20"
                    : "border-platinum hover:border-signal/60"
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
                <span className="block truncate px-1 py-1 text-[10px] text-battleship">
                  {entry.fileName}
                </span>
              </button>
              <button
                aria-label={`Remove ${entry.fileName}`}
                className="absolute right-1 top-1 rounded-full bg-paper/90 p-0.5 text-battleship shadow-sm transition hover:bg-signal hover:text-white"
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
        })}
      </div>
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
    <div className="rounded-lg border border-platinum bg-paper p-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-battleship">
        PDF pages
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {pages.map((page) => {
          const isActive = page.id === activeId;

          return (
            <button
              className={`block w-full overflow-hidden rounded-lg border transition ${
                isActive
                  ? "border-signal ring-2 ring-signal/20"
                  : "border-platinum hover:border-signal/60"
              }`}
              key={page.id}
              onClick={() => onSelect(page.id)}
              title={`Page ${page.pageNumber}`}
              type="button"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`Page ${page.pageNumber}`}
                className="aspect-[3/4] w-full bg-platinum object-contain"
                src={page.thumbnailUrl}
              />
              <span className="block truncate px-1 py-1 text-[10px] text-battleship">
                Page {page.pageNumber}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UploadZone({ onClick, onDragOver, onDrop }: UploadZoneProps) {
  return (
    <div
      className="mt-8 cursor-pointer rounded-[1.5rem] border border-dashed border-battleship/50 bg-platinum/40 px-6 py-12 text-center transition hover:border-signal hover:bg-platinum/70"
      onClick={onClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
      role="button"
      tabIndex={0}
    >
      <p className="text-lg font-semibold text-ink">
        Drop your images, PDF, or video here
      </p>
      <p className="mt-2 text-sm text-battleship">
        Select multiple images for batch watermarking, one PDF, or one video
      </p>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-battleship">
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
  const markColor = isSelected ? "bg-signal" : "bg-battleship";
  const lineColor = isSelected ? "bg-signal" : "bg-battleship/70";

  return (
    <span className="relative block h-6 rounded-md border border-platinum bg-platinum/40">
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

function isImageFile(file: File) {
  return acceptedImageTypes.includes(file.type);
}

function isVideoFile(file: File) {
  const fileName = file.name.toLowerCase();

  return (
    acceptedVideoTypes.includes(file.type) ||
    fileName.endsWith(".mov") ||
    fileName.endsWith(".mp4") ||
    fileName.endsWith(".webm")
  );
}

function isPdfFile(file: File) {
  const fileName = file.name.toLowerCase();

  return file.type === "application/pdf" || fileName.endsWith(".pdf");
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
  customPosition: CustomPosition | null;
  fontFamily: string;
  fontSizeScale: number;
  image: HTMLImageElement;
  logoImage: HTMLImageElement | null;
  resizeHeight: number;
  resizeWidth: number;
  rotationAngle: number;
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

type WatermarkOnlyRenderInput = {
  context: CanvasRenderingContext2D;
  customPosition: CustomPosition | null;
  fontFamily: string;
  fontSizeScale: number;
  height: number;
  logoImage: HTMLImageElement | null;
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
  const drawable = getDrawableWatermark({
    context,
    fontFamily,
    fontSizeScale,
    imageWidth: width,
    logoImage,
    watermarkText,
    watermarkType,
  });

  if (!drawable) {
    return null;
  }

  const alpha = watermarkOpacity / 100;

  if (watermarkMode === "tile") {
    drawTiledWatermark({
      alpha,
      angle: tileAngle,
      context,
      density: tileDensity,
      drawable,
      gap: tileGap,
      imageHeight: height,
      imageWidth: width,
      imageX: 0,
      imageY: 0,
    });
    return null;
  }

  const padding = Math.max(24, drawable.height * 0.9);
  const { x, y, textAlign, textBaseline } = customPosition
    ? {
        x: customPosition.xPercent * width,
        y: customPosition.yPercent * height,
        textAlign: "center" as CanvasTextAlign,
        textBaseline: "middle" as CanvasTextBaseline,
      }
    : getWatermarkCoordinates({
        fontSize: drawable.height,
        imageHeight: height,
        imageWidth: width,
        imageX: 0,
        imageY: 0,
        padding,
        position: watermarkPosition,
      });

  const bounds = getDrawableBounds({
    drawable,
    textAlign,
    textBaseline,
    x,
    y,
  });

  drawWatermarkDrawable({
    alpha,
    context,
    drawable,
    textAlign,
    textBaseline,
    x,
    y,
  });

  return bounds;
}

type WatermarkOverlayCanvasInput = Omit<WatermarkOnlyRenderInput, "context">;

function renderWatermarkOverlayCanvas({
  customPosition,
  fontFamily,
  fontSizeScale,
  height,
  logoImage,
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
    context,
    customPosition,
    fontFamily,
    fontSizeScale,
    height: canvas.height,
    logoImage,
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

function renderExportCanvas({
  customPosition,
  fontFamily,
  fontSizeScale,
  image,
  logoImage,
  resizeHeight,
  resizeWidth,
  rotationAngle,
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
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = Math.max(1, Math.ceil(outputBounds.width));
  canvas.height = Math.max(1, Math.ceil(outputBounds.height));

  if (!context) {
    return canvas;
  }

  context.fillStyle = "#DCDCDD";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((rotationAngle * Math.PI) / 180);
  context.drawImage(
    image,
    -sourceWidth / 2,
    -sourceHeight / 2,
    sourceWidth,
    sourceHeight,
  );
  context.restore();

  const drawable = getDrawableWatermark({
    context,
    fontFamily,
    fontSizeScale,
    imageWidth: canvas.width,
    logoImage,
    watermarkText,
    watermarkType,
  });

  if (!drawable) {
    return canvas;
  }

  const alpha = watermarkOpacity / 100;

  if (watermarkMode === "tile") {
    drawTiledWatermark({
      alpha,
      angle: tileAngle,
      context,
      density: tileDensity,
      drawable,
      gap: tileGap,
      imageHeight: canvas.height,
      imageWidth: canvas.width,
      imageX: 0,
      imageY: 0,
    });

    return canvas;
  }

  const padding = Math.max(24, drawable.height * 0.9);
  const { x, y, textAlign, textBaseline } = customPosition
    ? {
        x: customPosition.xPercent * canvas.width,
        y: customPosition.yPercent * canvas.height,
        textAlign: "center" as CanvasTextAlign,
        textBaseline: "middle" as CanvasTextBaseline,
      }
    : getWatermarkCoordinates({
        fontSize: drawable.height,
        imageHeight: canvas.height,
        imageWidth: canvas.width,
        imageX: 0,
        imageY: 0,
        padding,
        position: watermarkPosition,
      });

  drawWatermarkDrawable({
    alpha,
    context,
    drawable,
    textAlign,
    textBaseline,
    x,
    y,
  });

  return canvas;
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
  canvasSize,
  customPosition,
  fontFamily,
  fontSizeScale,
  logoImage,
  pageHeight,
  pageWidth,
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

  const drawable = getDrawableWatermark({
    context,
    fontFamily,
    fontSizeScale,
    imageWidth: pageW,
    logoImage,
    watermarkText,
    watermarkType,
  });

  if (!drawable) {
    return canvas;
  }

  const alpha = watermarkOpacity / 100;

  if (watermarkMode === "tile") {
    drawTiledWatermark({
      alpha,
      angle: tileAngle,
      context,
      density: tileDensity,
      drawable,
      gap: tileGap,
      imageHeight: pageH,
      imageWidth: pageW,
      imageX: 0,
      imageY: 0,
    });
    return canvas;
  }

  const padding = Math.max(24, drawable.height * 0.9);
  const { x, y, textAlign, textBaseline } = customPosition
    ? {
        x: ((customPosition.xPercent * canvasSize.width - imageX) / imageWidth) * pageW,
        y:
          ((customPosition.yPercent * canvasSize.height - imageY) / imageHeight) *
          pageH,
        textAlign: "center" as CanvasTextAlign,
        textBaseline: "middle" as CanvasTextBaseline,
      }
    : getWatermarkCoordinates({
        fontSize: drawable.height,
        imageHeight: pageH,
        imageWidth: pageW,
        imageX: 0,
        imageY: 0,
        padding,
        position: watermarkPosition,
      });

  drawWatermarkDrawable({
    alpha,
    context,
    drawable,
    textAlign,
    textBaseline,
    x,
    y,
  });

  return canvas;
}

function getExportFileName(fileName: string) {
  const fallbackName = "watermarked-image";
  const baseName = fileName.trim()
    ? fileName.replace(/\.[^/.]+$/, "")
    : fallbackName;

  return `${baseName || fallbackName}-watermarked.png`;
}

function areWatermarkSnapshotsEqual(
  first: WatermarkSettingsSnapshot,
  second: WatermarkSettingsSnapshot,
) {
  return (
    first.backgroundRemovedLogoImage === second.backgroundRemovedLogoImage &&
    areCustomPositionsEqual(first.customPosition, second.customPosition) &&
    first.fontFamily === second.fontFamily &&
    first.fontSizeScale === second.fontSizeScale &&
    first.isLogoBackgroundRemoved === second.isLogoBackgroundRemoved &&
    first.logoFileName === second.logoFileName &&
    first.logoImage === second.logoImage &&
    first.originalLogoImage === second.originalLogoImage &&
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

  if (watermarkType === "logo") {
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
    context.drawImage(drawable.image, left, top, drawable.width, drawable.height);
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
