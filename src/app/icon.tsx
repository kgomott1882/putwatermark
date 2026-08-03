import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = {
  height: 32,
  width: 32,
};

export const contentType = "image/png";

const ICON_SCALE = 1.22;

export default async function Icon() {
  const iconBuffer = await readFile(join(process.cwd(), "public", "Icon.png"));
  const iconSrc = `data:image/png;base64,${iconBuffer.toString("base64")}`;
  const imageSize = Math.round(size.width * ICON_SCALE);

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#000000",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          overflow: "hidden",
          width: "100%",
        }}
      >
        <img
          alt=""
          height={imageSize}
          src={iconSrc}
          style={{
            objectFit: "cover",
          }}
          width={imageSize}
        />
      </div>
    ),
    {
      ...size,
    },
  );
}
