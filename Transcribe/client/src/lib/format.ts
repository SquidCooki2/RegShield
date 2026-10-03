import type { SeverityLevel } from "@/types";

/** 75 -> "01:15". Minutes keep counting past 59 for long meetings. */
export const formatTime = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds));
  const mins = String(Math.floor(total / 60)).padStart(2, "0");
  const secs = String(total % 60).padStart(2, "0");
  return `${mins}:${secs}`;
};

/** Chakra colorPalette for a risk level, so light/dark are handled by the theme. */
export const riskPalette = (level?: SeverityLevel) => {
  switch (level) {
    case "CRITICAL":
    case "HIGH":
      return "red";
    case "MEDIUM":
      return "orange";
    default:
      return "yellow";
  }
};

export const stripExtension = (filename: string) => filename.replace(/\.[^/.]+$/, "");