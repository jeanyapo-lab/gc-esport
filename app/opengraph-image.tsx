import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "GC ESPORT";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0A0A",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 96, fontWeight: 900, letterSpacing: -2 }}>
          <span style={{ color: "#FFFFFF" }}>GC&nbsp;</span>
          <span style={{ color: "#FF5500" }}>ESPORT</span>
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 32, color: "#C9FF03" }}>
          Abidjan · Côte d'Ivoire
        </div>
        <div style={{ display: "flex", marginTop: 16, fontSize: 26, color: "#999999" }}>
          Draft & compétitions e-sport
        </div>
      </div>
    ),
    { ...size }
  );
}
