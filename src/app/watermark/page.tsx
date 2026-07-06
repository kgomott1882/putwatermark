"use client";

import { motion } from "framer-motion";
import {
  type DragEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];

type WatermarkType = "text" | "logo";

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
  | "bold-stamp"
  | "protect-dense"
  | "protect-light"
  | "signature"
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

type RgbaColor = {
  a: number;
  b: number;
  g: number;
  r: number;
};

type WatermarkTemplate = {
  density?: TileDensity;
  fontSizeScale: number;
  icon: "center" | "corner" | "dense" | "signature" | "sparse";
  id: WatermarkTemplateId;
  label: string;
  mode: WatermarkMode;
  opacity: number;
  position?: WatermarkPosition;
  tileAngle?: TileAngle;
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

const watermarkTemplates: WatermarkTemplate[] = [
  {
    fontSizeScale: 55,
    icon: "corner",
    id: "subtle-corner",
    label: "Subtle corner",
    mode: "single",
    opacity: 40,
    position: "bottom-right",
  },
  {
    fontSizeScale: 125,
    icon: "center",
    id: "bold-stamp",
    label: "Bold stamp",
    mode: "single",
    opacity: 90,
    position: "center",
  },
  {
    density: "dense",
    fontSizeScale: 70,
    icon: "dense",
    id: "protect-dense",
    label: "Protect dense",
    mode: "tile",
    opacity: 50,
    tileAngle: 45,
  },
  {
    density: "sparse",
    fontSizeScale: 50,
    icon: "sparse",
    id: "protect-light",
    label: "Protect light",
    mode: "tile",
    opacity: 25,
    tileAngle: 45,
  },
  {
    fontSizeScale: 90,
    icon: "signature",
    id: "signature",
    label: "Signature",
    mode: "single",
    opacity: 70,
    position: "bottom-center",
  },
];

const fontFamilies = [
  {
    label: "System Sans",
    value:
      'Arial, Helvetica, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const logoObjectUrlRef = useRef<string | null>(null);
  const textBoundsRef = useRef<TextBounds | null>(null);
  const imageFrameRef = useRef<ImageFrame | null>(null);
  const isDraggingRef = useRef(false);
  const cropDragRef = useRef<{
    mode: CropDragMode;
    origin: { x: number; y: number };
    rect: CropRect;
  } | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
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
  const [fontFamily, setFontFamily] = useState(fontFamilies[0].value);
  const [uploadError, setUploadError] = useState("");
  const [logoError, setLogoError] = useState("");
  const [isDraggingWatermark, setIsDraggingWatermark] = useState(false);
  const [isWatermarkHovering, setIsWatermarkHovering] = useState(false);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: 900,
    height: 600,
  });

  useEffect(() => {
    const panel = previewPanelRef.current;

    if (!panel) {
      return;
    }

    function updateCanvasSize() {
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
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      if (logoObjectUrlRef.current) {
        URL.revokeObjectURL(logoObjectUrlRef.current);
      }
    };
  }, []);

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
    context.fillStyle = "#D4DDE2";
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

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function openLogoPicker() {
    logoInputRef.current?.click();
  }

  function clearActiveTemplate() {
    setActiveTemplate(null);
  }

  function applyTemplate(template: WatermarkTemplate) {
    setActiveTemplate(template.id);
    setWatermarkMode(template.mode);
    setWatermarkOpacity(template.opacity);
    setFontSizeScale(template.fontSizeScale);
    setCustomPosition(null);
    setIsWatermarkHovering(false);

    if (template.mode === "single" && template.position) {
      setWatermarkPosition(template.position);
      return;
    }

    if (template.mode === "tile") {
      if (template.density) {
        setTileDensity(template.density);
      }

      if (template.tileAngle !== undefined) {
        setTileAngle(template.tileAngle);
      }
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files.item(0);

    if (file) {
      loadImageFile(file);
    }
  }

  function handleCanvasPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (activeImageTool === "crop") {
      handleCropPointerDown(event);
      return;
    }

    if (watermarkMode === "tile") {
      setIsWatermarkHovering(false);
      return;
    }

    const point = getCanvasPoint(event);
    const bounds = textBoundsRef.current;

    if (!point || !bounds || !isPointInBounds(point, bounds)) {
      setIsWatermarkHovering(false);
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

  function loadImageFile(file: File) {
    if (!acceptedImageTypes.includes(file.type)) {
      setUploadError("Please choose a JPG, PNG, or WebP image.");
      return;
    }

    setUploadError("");

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    const nextImage = new Image();

    objectUrlRef.current = objectUrl;
    nextImage.onload = () => {
      setImage(nextImage);
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
      setCustomPosition(null);
      setIsWatermarkHovering(false);
    };
    nextImage.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      objectUrlRef.current = null;
      setUploadError("We could not load that image. Please try another file.");
    };
    nextImage.src = objectUrl;
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
    <main className="min-h-screen w-full bg-paper px-4 py-4 text-ink sm:px-6 md:h-screen md:overflow-hidden lg:px-10">
      <motion.div
        className="grid h-full min-h-0 gap-4 md:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <aside className="max-h-full overflow-y-auto rounded-[1.5rem] border border-mist bg-paper p-4 shadow-2xl shadow-mist/60">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-steel">
            Watermark tool
          </p>
          <h1
            className={`font-bold tracking-[-0.04em] text-ink ${
              image ? "mt-1 text-2xl" : "mt-4 text-4xl"
            }`}
          >
            Design your watermark
          </h1>
          {!image ? (
            <p className="mt-4 text-sm leading-6 text-steel">
              Upload an image and preview your own text or logo watermark
              locally in your browser.
            </p>
          ) : null}

          <input
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.item(0);

              if (file) {
                loadImageFile(file);
              }
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

          {!image ? (
            <UploadZone
              onClick={openFilePicker}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ) : (
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-mist bg-mist/50 px-3 py-1.5 text-sm text-ink">
                Loaded: <span className="font-semibold">{fileName}</span>
              </div>

              <div>
                <p className="text-sm font-medium text-steel">Image tools</p>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {(["crop", "resize", "rotate"] as const).map((tool) => {
                    const isSelected = activeImageTool === tool;

                    return (
                      <button
                        className={`rounded-full border px-2 py-1.5 text-sm font-semibold capitalize transition ${
                          isSelected
                            ? "border-signal bg-signal text-white"
                            : "border-mist bg-paper text-steel hover:border-signal hover:text-ink"
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

                {activeImageTool === "rotate" ? (
                  <div className="mt-2 rounded-xl border border-mist bg-paper p-2.5">
                    <p className="text-xs leading-4 text-steel">
                      Rotate the base image. Watermark settings stay unchanged.
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        className="rounded-full border border-mist px-3 py-1.5 text-sm font-semibold text-steel transition hover:border-signal hover:text-ink"
                        onClick={() => rotateBaseImage("left")}
                        type="button"
                      >
                        90° left
                      </button>
                      <button
                        className="rounded-full border border-mist px-3 py-1.5 text-sm font-semibold text-steel transition hover:border-signal hover:text-ink"
                        onClick={() => rotateBaseImage("right")}
                        type="button"
                      >
                        90° right
                      </button>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between gap-3">
                        <label
                          className="text-xs font-medium text-steel"
                          htmlFor="base-rotation"
                        >
                          Manual angle
                        </label>
                        <input
                          className="w-20 rounded-lg border border-mist bg-paper px-2 py-1 text-right text-sm text-ink outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
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
                        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-mist accent-signal"
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

                {activeImageTool === "crop" ? (
                  <div className="mt-2 rounded-xl border border-mist bg-paper p-2.5">
                    <p className="text-xs leading-4 text-steel">
                      Drag on the canvas to select a crop. Move the box or drag
                      a corner handle to resize it.
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        className="rounded-full border border-signal bg-signal px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!cropRect || cropRect.width < 4 || cropRect.height < 4}
                        onClick={applyCrop}
                        type="button"
                      >
                        Apply crop
                      </button>
                      <button
                        className="rounded-full border border-mist px-3 py-1.5 text-sm font-semibold text-steel transition hover:border-signal hover:text-ink"
                        onClick={cancelCrop}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                {activeImageTool === "resize" ? (
                  <div className="mt-2 rounded-xl border border-mist bg-paper p-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs font-medium text-steel">
                        Width
                        <input
                          className="mt-1 w-full rounded-lg border border-mist bg-paper px-2 py-1.5 text-sm text-ink outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
                          min={1}
                          onChange={(event) =>
                            handleResizeWidthChange(Number(event.target.value))
                          }
                          type="number"
                          value={resizeWidth}
                        />
                      </label>
                      <label className="text-xs font-medium text-steel">
                        Height
                        <input
                          className="mt-1 w-full rounded-lg border border-mist bg-paper px-2 py-1.5 text-sm text-ink outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
                          min={1}
                          onChange={(event) =>
                            handleResizeHeightChange(Number(event.target.value))
                          }
                          type="number"
                          value={resizeHeight}
                        />
                      </label>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <button
                        className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                          isAspectRatioLocked
                            ? "border-signal bg-signal text-white"
                            : "border-mist text-steel hover:border-signal hover:text-ink"
                        }`}
                        onClick={() => setIsAspectRatioLocked((value) => !value)}
                        type="button"
                      >
                        {isAspectRatioLocked ? "Aspect locked" : "Aspect free"}
                      </button>
                      <button
                        className="rounded-full border border-signal bg-signal px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-95"
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
                <p className="text-sm font-medium text-steel">Templates</p>
                <div className="mt-1.5 grid grid-cols-5 gap-1.5">
                  {watermarkTemplates.map((template) => {
                    const isSelected = activeTemplate === template.id;

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`rounded-xl border px-2 py-2 text-left transition ${
                          isSelected
                            ? "border-signal bg-signal/10 text-ink"
                            : "border-mist bg-paper text-steel hover:border-signal hover:text-ink"
                        }`}
                        key={template.id}
                        onClick={() => applyTemplate(template)}
                        type="button"
                      >
                        <TemplateIcon
                          isSelected={isSelected}
                          variant={template.icon}
                        />
                        <span className="mt-1 block truncate text-[11px] font-semibold leading-tight">
                          {template.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-medium text-steel">Mode</p>
                  <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-full bg-mist/50 p-1">
                    {watermarkModes.map(({ label, value }) => {
                      const isSelected = watermarkMode === value;

                      return (
                        <button
                          className={`rounded-full px-2 py-1.5 text-sm font-semibold transition ${
                            isSelected
                              ? "bg-signal text-white"
                              : "text-steel hover:text-ink"
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
                  <p className="text-sm font-medium text-steel">Type</p>
                  <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-full bg-mist/50 p-1">
                    {watermarkTypes.map(({ label, value }) => {
                      const isSelected = watermarkType === value;

                      return (
                        <button
                          className={`rounded-full px-2 py-1.5 text-sm font-semibold transition ${
                            isSelected
                              ? "bg-signal text-white"
                              : "text-steel hover:text-ink"
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
                    className="block text-sm font-medium text-steel"
                    htmlFor="watermark-text"
                  >
                    Watermark text
                  </label>
                  <input
                    className="mt-1.5 w-full rounded-xl border border-mist bg-paper px-3 py-2 text-ink outline-none transition placeholder:text-steel/60 focus:border-signal focus:ring-2 focus:ring-signal/20"
                    id="watermark-text"
                    onChange={(event) => setWatermarkText(event.target.value)}
                    placeholder="Your watermark"
                    type="text"
                    value={watermarkText}
                  />
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-steel">Logo image</p>
                  {logoImage ? (
                    <div className="mt-1.5 space-y-1.5">
                      <div className="rounded-xl border border-mist bg-mist/50 px-3 py-1.5 text-sm text-ink">
                        Loaded:{" "}
                        <span className="font-semibold">{logoFileName}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <button
                          className="font-medium text-steel transition hover:text-ink"
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
                      <div className="rounded-xl border border-mist bg-paper p-2.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-mist"
                            style={{
                              backgroundColor: "#F8FAFC",
                              backgroundImage:
                                "linear-gradient(45deg, #D4DDE2 25%, transparent 25%), linear-gradient(-45deg, #D4DDE2 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #D4DDE2 75%), linear-gradient(-45deg, transparent 75%, #D4DDE2 75%)",
                              backgroundPosition:
                                "0 0, 0 8px, 8px -8px, -8px 0",
                              backgroundSize: "16px 16px",
                            }}
                          >
                            {/* Object/data URLs cannot be optimized by next/image. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              alt="Logo background preview"
                              className="max-h-10 max-w-10 object-contain"
                              src={logoImage.src}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-steel">
                              Remove background
                            </p>
                            <button
                              aria-pressed={isLogoBackgroundRemoved}
                              className={`mt-1 flex w-full items-center justify-between rounded-full border p-1 text-sm font-semibold transition ${
                                isLogoBackgroundRemoved
                                  ? "border-signal bg-signal text-white"
                                  : "border-mist bg-mist/40 text-steel hover:border-signal hover:text-ink"
                              }`}
                              onClick={handleLogoBackgroundToggle}
                              type="button"
                            >
                              <span className="px-3">
                                {isLogoBackgroundRemoved ? "On" : "Off"}
                              </span>
                              <span
                                className={`h-6 w-6 rounded-full transition ${
                                  isLogoBackgroundRemoved
                                    ? "bg-white"
                                    : "bg-paper"
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                        <p className="mt-2 text-xs leading-4 text-steel/80">
                          Best-effort cleanup. Works best with logos on a plain
                          white or solid background.
                        </p>
                        {logoBackgroundMessage ? (
                          <p className="mt-1.5 text-xs leading-4 text-steel">
                            {logoBackgroundMessage}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <button
                      className="mt-1.5 w-full rounded-[1.25rem] border border-dashed border-steel/50 bg-mist/40 px-5 py-4 text-center transition hover:border-signal hover:bg-mist/70"
                      onClick={openLogoPicker}
                      type="button"
                    >
                      <span className="block text-base font-semibold text-ink">
                        Upload a logo
                      </span>
                      <span className="mt-2 block text-sm text-steel">
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
                  <p className="text-sm font-medium text-steel">Position</p>
                  <div className="mt-1.5 grid w-32 grid-cols-3 gap-1.5">
                    {watermarkPositions.map(({ label, value }) => {
                      const isSelected =
                        !customPosition && watermarkPosition === value;

                      return (
                        <button
                          aria-label={label}
                          className={`h-8 rounded-lg border text-xs transition ${
                            isSelected
                              ? "border-signal bg-signal text-white"
                              : "border-mist bg-paper text-steel hover:border-signal hover:text-ink"
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
                    <div className="mt-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-signal">
                        Custom position
                      </span>
                      <button
                        className="font-medium text-steel transition hover:text-ink"
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
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-steel">Density</p>
                    <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                      {tileDensities.map(({ label, value }) => {
                        const isSelected = tileDensity === value;

                        return (
                          <button
                            className={`rounded-full border px-2 py-1.5 text-sm font-medium transition ${
                              isSelected
                                ? "border-signal bg-signal text-white"
                                : "border-mist bg-paper text-steel hover:border-signal hover:text-ink"
                            }`}
                            key={value}
                            onClick={() => {
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
                    <p className="text-sm font-medium text-steel">Angle</p>
                    <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                      {tileAngles.map(({ label, value }) => {
                        const isSelected = tileAngle === value;

                        return (
                          <button
                            className={`rounded-full border px-2 py-1.5 text-sm font-medium transition ${
                              isSelected
                                ? "border-signal bg-signal text-white"
                                : "border-mist bg-paper text-steel hover:border-signal hover:text-ink"
                            }`}
                            key={value}
                            onClick={() => {
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
                        className="text-sm font-medium text-steel"
                        htmlFor="tile-gap"
                      >
                        Gap
                      </label>
                      <span className="text-sm font-semibold text-ink">
                        {tileGap}%
                      </span>
                    </div>
                    <input
                      className="mt-1.5 h-2 w-full cursor-pointer appearance-none rounded-full bg-mist accent-signal"
                      id="tile-gap"
                      max={300}
                      min={50}
                      onChange={(event) => {
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
                    className="text-sm font-medium text-steel"
                    htmlFor="watermark-opacity"
                  >
                    Opacity
                  </label>
                  <span className="text-sm font-semibold text-ink">
                    {watermarkOpacity}%
                  </span>
                </div>
                <input
                  className="mt-1.5 h-2 w-full cursor-pointer appearance-none rounded-full bg-mist accent-signal"
                  id="watermark-opacity"
                  max={100}
                  min={10}
                  onChange={(event) => {
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
                    className="text-sm font-medium text-steel"
                    htmlFor="font-size"
                  >
                    {watermarkType === "logo" ? "Logo size" : "Font size"}
                  </label>
                  <span className="text-sm font-semibold text-ink">
                    {fontSizeScale}%
                  </span>
                </div>
                <input
                  className="mt-1.5 h-2 w-full cursor-pointer appearance-none rounded-full bg-mist accent-signal"
                  id="font-size"
                  max={135}
                  min={15}
                  onChange={(event) => {
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
                    className="block text-sm font-medium text-steel"
                    htmlFor="font-family"
                  >
                    Font family
                  </label>
                  <select
                    className="mt-1.5 w-full rounded-xl border border-mist bg-paper px-3 py-2 text-ink outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
                    id="font-family"
                    onChange={(event) => {
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

              <button
                className="text-sm font-medium text-steel transition hover:text-ink"
                onClick={openFilePicker}
                type="button"
              >
                Choose a different image
              </button>
            </div>
          )}

          {uploadError ? (
            <div className="mt-6 rounded-2xl border border-signal/30 bg-signal/10 px-4 py-3 text-sm text-ink">
              {uploadError}
            </div>
          ) : null}
        </aside>

        <section
          className="flex min-h-[320px] items-center justify-center overflow-hidden rounded-[1.5rem] border border-mist bg-mist/50 p-2 shadow-2xl shadow-mist/60 md:min-h-0"
          ref={previewPanelRef}
        >
          {image ? (
            <canvas
              className="h-full max-h-full w-full touch-none rounded-[1.5rem] bg-mist object-contain"
              onPointerCancel={handleCanvasPointerCancel}
              onPointerDown={handleCanvasPointerDown}
              onPointerLeave={handleCanvasPointerLeave}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              ref={canvasRef}
              style={{ cursor: canvasCursor }}
            />
          ) : (
            <div className="flex h-full min-h-[420px] w-full items-center justify-center rounded-[1.5rem] border border-dashed border-steel/50 bg-paper text-center">
              <div>
                <p className="text-lg font-semibold text-ink">
                  Your preview will appear here
                </p>
                <p className="mt-2 text-sm text-steel">
                  Upload a JPG, PNG, or WebP to start.
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

function UploadZone({ onClick, onDragOver, onDrop }: UploadZoneProps) {
  return (
    <div
      className="mt-8 cursor-pointer rounded-[1.5rem] border border-dashed border-steel/50 bg-mist/40 px-6 py-12 text-center transition hover:border-signal hover:bg-mist/70"
      onClick={onClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
      role="button"
      tabIndex={0}
    >
      <p className="text-lg font-semibold text-ink">Drop your image here</p>
      <p className="mt-2 text-sm text-steel">or click to browse</p>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-steel">
        JPG, PNG, WebP
      </p>
    </div>
  );
}

type TemplateIconProps = {
  isSelected: boolean;
  variant: WatermarkTemplate["icon"];
};

function TemplateIcon({ isSelected, variant }: TemplateIconProps) {
  const markColor = isSelected ? "bg-signal" : "bg-steel";
  const lineColor = isSelected ? "bg-signal" : "bg-steel/70";

  return (
    <span className="relative block h-8 rounded-lg border border-mist bg-mist/40">
      {variant === "corner" ? (
        <span
          className={`absolute bottom-1.5 right-1.5 h-2 w-4 rounded-full ${markColor}`}
        />
      ) : null}
      {variant === "center" ? (
        <span
          className={`absolute left-1/2 top-1/2 h-3 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full ${markColor}`}
        />
      ) : null}
      {variant === "dense" ? (
        <>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <span
              className={`absolute h-1 w-3 rotate-[-35deg] rounded-full ${lineColor}`}
              key={index}
              style={{
                left: `${6 + (index % 3) * 14}px`,
                top: `${6 + Math.floor(index / 3) * 12}px`,
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
                left: `${6 + index * 13}px`,
                top: `${7 + index * 5}px`,
              }}
            />
          ))}
        </>
      ) : null}
      {variant === "signature" ? (
        <span
          className={`absolute bottom-1.5 left-1/2 h-1.5 w-8 -translate-x-1/2 rounded-full ${markColor}`}
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
    context.fillStyle = "#D4DDE2";
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
