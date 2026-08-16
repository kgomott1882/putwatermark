export type VideoOverlayPass = {
  overlayPngBytes: Uint8Array;
  visibleFromSeconds?: number;
  visibleUntilSeconds?: number;
};

export type VideoOverlayPassTiming = Pick<
  VideoOverlayPass,
  "visibleFromSeconds" | "visibleUntilSeconds"
>;

export function buildOverlayFilterComplex(
  passes: readonly VideoOverlayPassTiming[],
) {
  if (passes.length === 1 && passes[0]?.visibleFromSeconds === undefined) {
    return "[0:v][1:v]overlay=0:0";
  }

  let currentLabel = "[0:v]";
  const filterParts: string[] = [];

  for (let index = 0; index < passes.length; index += 1) {
    const pass = passes[index]!;
    const overlayInput = index + 1;
    const outputLabel =
      index === passes.length - 1 ? "[vout]" : `[v${index + 1}]`;
    const enableSuffix =
      pass.visibleFromSeconds !== undefined &&
      pass.visibleUntilSeconds !== undefined
        ? `:enable='between(t,${pass.visibleFromSeconds},${pass.visibleUntilSeconds})'`
        : "";

    filterParts.push(
      `${currentLabel}[${overlayInput}:v]overlay=0:0${enableSuffix}${outputLabel}`,
    );
    currentLabel = outputLabel;
  }

  return filterParts.join(";");
}

export function overlayPassesNeedExplicitVideoMap(
  passes: readonly VideoOverlayPassTiming[],
) {
  return passes.length > 1 || passes[0]?.visibleFromSeconds !== undefined;
}

export function buildOverlayImageInputArgs(imagePaths: readonly string[]) {
  return imagePaths.flatMap((imagePath) => ["-loop", "1", "-i", imagePath]);
}
