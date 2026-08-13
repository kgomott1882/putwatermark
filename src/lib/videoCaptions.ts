export type CaptionPresetId = "none" | "karaoke" | "beasty" | "deep-diver";

export type CaptionTextAlign = "left" | "center" | "right";
export type CaptionVerticalPosition = "top" | "center" | "bottom";

export type CaptionCustomPosition = {
  xPercent: number;
  yPercent: number;
};

export type VideoCaptionSettings = {
  backgroundColor: string;
  backgroundRadiusPx: number;
  customPosition: CaptionCustomPosition | null;
  enabled: boolean;
  fontFamily: string;
  fontSizePx: number;
  fontStyle: "normal" | "italic";
  fontWeight: "normal" | "bold";
  maxWidthPercent: number;
  presetId: CaptionPresetId;
  text: string;
  textAlign: CaptionTextAlign;
  textColor: string;
  underline: boolean;
  verticalPosition: CaptionVerticalPosition;
  visibleFromSeconds?: number;
  visibleUntilSeconds?: number;
};

export type VideoCaptionLayer = VideoCaptionSettings & {
  id: string;
};

export type CaptionPresetDefinition = {
  id: CaptionPresetId;
  label: string;
  previewClassName: string;
  previewLines: string[];
  settings: Partial<VideoCaptionSettings>;
};

export const CAPTION_EMOJI_OPTIONS = [
  "🔥",
  "✨",
  "💡",
  "🎯",
  "👀",
  "👏",
  "💯",
  "🚀",
  "❤️",
  "😂",
  "😍",
  "🙌",
  "⚡",
  "📌",
  "✅",
  "❌",
  "🎬",
  "🎤",
  "📣",
  "💬",
] as const;

export const CAPTION_STYLE_PRESETS: readonly CaptionPresetDefinition[] = [
  {
    id: "none",
    label: "None",
    previewClassName: "text-ed-fg-muted",
    previewLines: ["None"],
    settings: { enabled: false, presetId: "none" },
  },
  {
    id: "karaoke",
    label: "Bold",
    previewClassName: "font-bold uppercase tracking-wide text-white",
    previewLines: ["Bold"],
    settings: {
      backgroundColor: "transparent",
      backgroundRadiusPx: 0,
      fontSizePx: 42,
      fontStyle: "normal",
      fontWeight: "bold",
      maxWidthPercent: 90,
      textAlign: "center",
      textColor: "#FFFFFF",
      underline: false,
      verticalPosition: "bottom",
    },
  },
] as const;

export const CAPTION_PRESETS: readonly CaptionPresetDefinition[] = [
  ...CAPTION_STYLE_PRESETS,
  {
    id: "beasty",
    label: "Italic",
    previewClassName: "italic text-white/90",
    previewLines: ["Italic"],
    settings: {
      backgroundColor: "transparent",
      backgroundRadiusPx: 0,
      fontSizePx: 28,
      fontStyle: "italic",
      fontWeight: "normal",
      maxWidthPercent: 85,
      textAlign: "center",
      textColor: "#FFFFFF",
      underline: false,
      verticalPosition: "bottom",
    },
  },
  {
    id: "deep-diver",
    label: "Pill",
    previewClassName: "rounded-full bg-white px-2 text-ed-fg-muted",
    previewLines: ["Pill"],
    settings: {
      backgroundColor: "#FFFFFF",
      backgroundRadiusPx: 999,
      fontSizePx: 24,
      fontStyle: "normal",
      fontWeight: "normal",
      maxWidthPercent: 80,
      textAlign: "center",
      textColor: "#6B7280",
      underline: false,
      verticalPosition: "bottom",
    },
  },
] as const;

export function createVideoCaptionLayerId() {
  return `cap-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getDefaultVideoCaptionSettings(): VideoCaptionSettings {
  return {
    backgroundColor: "transparent",
    backgroundRadiusPx: 0,
    customPosition: null,
    enabled: true,
    fontFamily: '"Montserrat", sans-serif',
    fontSizePx: 42,
    fontStyle: "normal",
    fontWeight: "bold",
    maxWidthPercent: 90,
    presetId: "karaoke",
    text: "",
    textAlign: "center",
    textColor: "#FFFFFF",
    underline: false,
    verticalPosition: "bottom",
  };
}

export function createDefaultVideoCaptionLayer(
  partial?: Partial<VideoCaptionSettings>,
): VideoCaptionLayer {
  return {
    ...getDefaultVideoCaptionSettings(),
    ...partial,
    id: createVideoCaptionLayerId(),
  };
}

export function createInitialVideoCaptionLayers(): VideoCaptionLayer[] {
  const layer = createDefaultVideoCaptionLayer();

  return [
    {
      ...applyCaptionPreset(layer, "karaoke"),
      id: layer.id,
    },
  ];
}

export function applyCaptionPreset(
  current: VideoCaptionSettings,
  presetId: CaptionPresetId,
): VideoCaptionSettings {
  if (presetId === "none") {
    return {
      ...current,
      enabled: false,
      presetId: "none",
    };
  }

  const preset = CAPTION_PRESETS.find((entry) => entry.id === presetId);

  if (!preset) {
    return current;
  }

  return {
    ...current,
    ...preset.settings,
    enabled: true,
    presetId,
  };
}

export function captionHasTimingRange(caption: VideoCaptionSettings) {
  return (
    typeof caption.visibleFromSeconds === "number" ||
    typeof caption.visibleUntilSeconds === "number"
  );
}

export function isCaptionLayerActive(caption: VideoCaptionSettings) {
  return caption.enabled && caption.text.trim().length > 0;
}

export function isCaptionVisibleAtTime(
  settings: VideoCaptionSettings,
  timeSeconds: number,
  durationSeconds: number,
) {
  if (!isCaptionLayerActive(settings)) {
    return false;
  }

  const hasStart = typeof settings.visibleFromSeconds === "number";
  const hasEnd = typeof settings.visibleUntilSeconds === "number";

  if (!hasStart && !hasEnd) {
    return true;
  }

  const start = hasStart ? settings.visibleFromSeconds! : 0;
  const end = hasEnd ? settings.visibleUntilSeconds! : durationSeconds;

  return timeSeconds >= start && timeSeconds <= end;
}

export function getCaptionLayerSummary(layer: VideoCaptionLayer, index: number) {
  const trimmed = layer.text.trim();
  const preview = trimmed
    ? trimmed.length > 14
      ? `${trimmed.slice(0, 14)}…`
      : trimmed
    : "Empty caption";

  return `${index + 1} · ${preview}`;
}

function formatCaptionTimingSeconds(seconds: number) {
  const rounded = Math.max(0, Math.round(seconds));

  if (rounded >= 3600) {
    const hours = Math.floor(rounded / 3600);
    const minutes = Math.floor((rounded % 3600) / 60);
    const secs = rounded % 60;
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  if (rounded >= 60) {
    const minutes = Math.floor(rounded / 60);
    const secs = rounded % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  return `${rounded}s`;
}

export function getCaptionLayerTimingLabel(
  layer: VideoCaptionSettings,
  durationSeconds: number,
) {
  const hasStart = typeof layer.visibleFromSeconds === "number";
  const hasEnd = typeof layer.visibleUntilSeconds === "number";

  if (!hasStart && !hasEnd) {
    return durationSeconds > 0 ? "Full video" : "No timing set";
  }

  const start = hasStart ? layer.visibleFromSeconds! : 0;
  const end = hasEnd ? layer.visibleUntilSeconds! : durationSeconds;

  return `${formatCaptionTimingSeconds(start)} to ${formatCaptionTimingSeconds(end)}`;
}

function wrapCaptionLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    const width = context.measureText(candidate).width;

    if (width <= maxWidth || !currentLine) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length ? lines : [text];
}

function getCaptionAnchorY(
  verticalPosition: CaptionVerticalPosition,
  canvasHeight: number,
  blockHeight: number,
) {
  const padding = canvasHeight * 0.08;

  if (verticalPosition === "top") {
    return padding + blockHeight / 2;
  }

  if (verticalPosition === "center") {
    return canvasHeight / 2;
  }

  return canvasHeight - padding - blockHeight / 2;
}

export type VideoCaptionBounds = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

export type VideoCaptionLayout = {
  anchorX: number;
  anchorY: number;
  blockHeight: number;
  blockWidth: number;
  blockX: number;
  bounds: VideoCaptionBounds;
  fontSize: number;
  hasBackground: boolean;
  lineHeight: number;
  lines: string[];
  startY: number;
};

export function measureVideoCaptionLayout(
  context: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  settings: VideoCaptionSettings,
): VideoCaptionLayout | null {
  if (!isCaptionLayerActive(settings)) {
    return null;
  }

  const maxWidth = (canvasWidth * settings.maxWidthPercent) / 100;
  const fontWeight = settings.fontWeight === "bold" ? "700" : "400";
  const fontStyle = settings.fontStyle === "italic" ? "italic" : "normal";
  const scale = canvasHeight / 720;
  const fontSize = Math.max(12, settings.fontSizePx * scale);

  context.save();
  context.font = `${fontStyle} ${fontWeight} ${fontSize}px ${settings.fontFamily}`;
  context.textBaseline = "middle";

  const displayText =
    settings.presetId === "karaoke"
      ? settings.text.toUpperCase()
      : settings.text;
  const lines = wrapCaptionLines(context, displayText, maxWidth);
  const lineHeight = fontSize * 1.15;
  const blockHeight = lines.length * lineHeight;

  let anchorX = canvasWidth / 2;
  let anchorY = getCaptionAnchorY(
    settings.verticalPosition,
    canvasHeight,
    blockHeight,
  );

  if (settings.customPosition) {
    anchorX = settings.customPosition.xPercent * canvasWidth;
    anchorY = settings.customPosition.yPercent * canvasHeight;
  }

  const startY = anchorY - blockHeight / 2 + lineHeight / 2;

  let maxLineWidth = 0;

  for (const line of lines) {
    maxLineWidth = Math.max(maxLineWidth, context.measureText(line).width);
  }

  const blockWidth = Math.min(maxWidth, maxLineWidth);
  let blockX = anchorX - blockWidth / 2;

  if (!settings.customPosition) {
    if (settings.textAlign === "left") {
      blockX = (canvasWidth - maxWidth) / 2;
    } else if (settings.textAlign === "right") {
      blockX = (canvasWidth + maxWidth) / 2 - blockWidth;
    } else {
      blockX = (canvasWidth - blockWidth) / 2;
    }
  } else if (settings.textAlign === "left") {
    blockX = anchorX;
  } else if (settings.textAlign === "right") {
    blockX = anchorX - blockWidth;
  } else {
    blockX = anchorX - blockWidth / 2;
  }

  const hasBackground =
    settings.backgroundColor !== "transparent" &&
    settings.backgroundColor !== "";
  const padX = hasBackground ? fontSize * 0.45 : Math.max(8, fontSize * 0.2);
  const padY = hasBackground ? fontSize * 0.28 : Math.max(6, fontSize * 0.15);
  const blockTop = startY - lineHeight / 2;
  const blockBottom = startY + (lines.length - 1) * lineHeight + lineHeight / 2;

  const layout: VideoCaptionLayout = {
    anchorX,
    anchorY,
    blockHeight,
    blockWidth,
    blockX,
    bounds: {
      left: blockX - padX,
      right: blockX + blockWidth + padX,
      top: blockTop - padY,
      bottom: blockBottom + padY,
    },
    fontSize,
    hasBackground,
    lineHeight,
    lines,
    startY,
  };

  context.restore();
  return layout;
}

function drawCaptionHighlight(
  context: CanvasRenderingContext2D,
  bounds: VideoCaptionBounds,
) {
  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.95)";
  context.lineWidth = 2;
  context.setLineDash([6, 4]);
  context.strokeRect(
    bounds.left,
    bounds.top,
    bounds.right - bounds.left,
    bounds.bottom - bounds.top,
  );
  context.restore();
}

export function drawVideoCaption(
  context: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  settings: VideoCaptionSettings,
): VideoCaptionLayout | null {
  const layout = measureVideoCaptionLayout(
    context,
    canvasWidth,
    canvasHeight,
    settings,
  );

  if (!layout) {
    return null;
  }

  const {
    anchorX,
    blockWidth,
    blockX,
    bounds,
    fontSize,
    hasBackground,
    lineHeight,
    lines,
    startY,
  } = layout;
  const scale = canvasHeight / 720;
  const fontWeight = settings.fontWeight === "bold" ? "700" : "400";
  const fontStyle = settings.fontStyle === "italic" ? "italic" : "normal";

  context.save();
  context.font = `${fontStyle} ${fontWeight} ${fontSize}px ${settings.fontFamily}`;
  context.textBaseline = "middle";

  if (hasBackground) {
    const padX = fontSize * 0.45;
    const padY = fontSize * 0.28;
    const radius = settings.backgroundRadiusPx * scale;

    context.fillStyle = settings.backgroundColor;
    roundRect(
      context,
      blockX - padX,
      startY - lineHeight / 2 - padY,
      blockWidth + padX * 2,
      layout.blockHeight + padY * 2,
      radius,
    );
    context.fill();
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const y = startY + index * lineHeight;
    let x = settings.customPosition ? anchorX : canvasWidth / 2;

    if (settings.textAlign === "left") {
      x = blockX;
      context.textAlign = "left";
    } else if (settings.textAlign === "right") {
      x = blockX + blockWidth;
      context.textAlign = "right";
    } else {
      x = settings.customPosition ? anchorX : canvasWidth / 2;
      context.textAlign = "center";
    }

    context.fillStyle = settings.textColor;
    context.fillText(line, x, y);

    if (settings.underline) {
      const metrics = context.measureText(line);
      const underlineY = y + fontSize * 0.35;
      const underlineX =
        context.textAlign === "center"
          ? x - metrics.width / 2
          : context.textAlign === "right"
            ? x - metrics.width
            : x;

      context.strokeStyle = settings.textColor;
      context.lineWidth = Math.max(2, fontSize * 0.08);
      context.beginPath();
      context.moveTo(underlineX, underlineY);
      context.lineTo(underlineX + metrics.width, underlineY);
      context.stroke();
    }
  }

  context.restore();
  return { ...layout, bounds };
}

export function drawVideoCaptions(
  context: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  layers: readonly VideoCaptionLayer[],
  timeSeconds: number,
  durationSeconds: number,
  options?: {
    highlightLayerId?: string;
  },
): Map<string, VideoCaptionBounds> {
  const boundsByLayer = new Map<string, VideoCaptionBounds>();

  for (const layer of layers) {
    if (!isCaptionVisibleAtTime(layer, timeSeconds, durationSeconds)) {
      continue;
    }

    const layout = drawVideoCaption(
      context,
      canvasWidth,
      canvasHeight,
      layer,
    );

    if (!layout) {
      continue;
    }

    boundsByLayer.set(layer.id, layout.bounds);

    if (options?.highlightLayerId === layer.id) {
      drawCaptionHighlight(context, layout.bounds);
    }
  }

  return boundsByLayer;
}

export function getUntimedCaptionLayers(layers: readonly VideoCaptionLayer[]) {
  return layers.filter(
    (layer) => isCaptionLayerActive(layer) && !captionHasTimingRange(layer),
  );
}

export function getTimedCaptionLayers(layers: readonly VideoCaptionLayer[]) {
  return layers.filter(
    (layer) => isCaptionLayerActive(layer) && captionHasTimingRange(layer),
  );
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}
