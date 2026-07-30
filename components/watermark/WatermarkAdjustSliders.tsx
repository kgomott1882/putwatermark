"use client";

type TileAngle = 0 | 45 | 90 | 180;
type TileDensity = "sparse" | "medium" | "dense";
type WatermarkMode = "single" | "tile";

const tileDensityPercentByValue: Record<TileDensity, number> = {
  sparse: 0,
  medium: 50,
  dense: 100,
};

function tileDensityFromPercent(percent: number): TileDensity {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));

  if (clamped < 25) {
    return "sparse";
  }

  if (clamped < 75) {
    return "medium";
  }

  return "dense";
}

function tileDensityPercent(density: TileDensity) {
  return tileDensityPercentByValue[density];
}

function AdjustSlider({
  formatValue,
  id,
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  formatValue?: (value: number) => string;
  id: string;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  const display = formatValue ? formatValue(value) : `${value}%`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          className="text-[10px] font-bold uppercase tracking-[0.1em] text-ed-fg"
          htmlFor={id}
        >
          {label}
        </label>
        <span className="text-[11px] font-semibold tabular-nums text-ed-fg-muted">
          {display}
        </span>
      </div>
      <input
        className="editor-range"
        id={id}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </div>
  );
}

export type WatermarkAdjustSlidersProps = {
  fontSizeScale: number;
  mode: WatermarkMode;
  onFontSizeScaleChange: (value: number) => void;
  onTileAngleChange: (value: TileAngle) => void;
  onTileDensityChange: (value: TileDensity) => void;
  onTileGapChange: (value: number) => void;
  onWatermarkOpacityChange: (value: number) => void;
  tileAngle: TileAngle;
  tileDensity: TileDensity;
  tileGap: number;
  watermarkOpacity: number;
  watermarkType: "logo" | "text";
};

export function WatermarkAdjustSliders({
  fontSizeScale,
  mode,
  onFontSizeScaleChange,
  onTileAngleChange,
  onTileDensityChange,
  onTileGapChange,
  onWatermarkOpacityChange,
  tileAngle,
  tileDensity,
  tileGap,
  watermarkOpacity,
  watermarkType,
}: WatermarkAdjustSlidersProps) {
  const sizeLabel = watermarkType === "logo" ? "Logo size" : "Text size";

  return (
    <div className="space-y-3 rounded-xl border border-ed-border bg-ed-bg-card p-3 shadow-sm">
      <AdjustSlider
        id="adjust-size"
        label={sizeLabel}
        max={135}
        min={15}
        onChange={onFontSizeScaleChange}
        step={5}
        value={fontSizeScale}
      />
      <AdjustSlider
        id="adjust-opacity"
        label="Opacity"
        max={100}
        min={10}
        onChange={onWatermarkOpacityChange}
        step={5}
        value={watermarkOpacity}
      />
      {mode === "tile" ? (
        <>
          <AdjustSlider
            formatValue={(value) => `${value}%`}
            id="adjust-density"
            label="Tile density"
            max={100}
            min={0}
            onChange={(percent) =>
              onTileDensityChange(tileDensityFromPercent(percent))
            }
            step={1}
            value={tileDensityPercent(tileDensity)}
          />
          <AdjustSlider
            formatValue={(value) => `${value}°`}
            id="adjust-angle"
            label="Tile angle"
            max={180}
            min={0}
            onChange={(angle) => onTileAngleChange(angle as TileAngle)}
            step={45}
            value={tileAngle}
          />
          <AdjustSlider
            formatValue={(value) => `${value}%`}
            id="adjust-gap"
            label="Tile gap"
            max={300}
            min={50}
            onChange={onTileGapChange}
            step={10}
            value={tileGap}
          />
        </>
      ) : null}
    </div>
  );
}
