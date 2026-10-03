import type { OverallRisk } from "@transcribe/shared";

/** 75 -> "01:15". Minutes keep counting past 59 for long meetings. */
export const formatTime = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds));
  const mins = String(Math.floor(total / 60)).padStart(2, "0");
  const secs = String(total % 60).padStart(2, "0");
  return `${mins}:${secs}`;
};

/** Chakra colorPalette for a risk level, so light/dark are handled by the theme. */
export const riskPalette = (level: OverallRisk) =>
  ({ high: "red", medium: "orange", low: "yellow", none: "green" })[level];

export const stripExtension = (filename: string) => filename.replace(/\.[^/.]+$/, "");