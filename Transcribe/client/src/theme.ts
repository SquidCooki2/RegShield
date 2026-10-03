import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Slate neutrals matching document app (#0b0f17 dark base, #1e293b border, #0f172a panel)
        gray: {
          50: { value: "#f8fafc" },
          100: { value: "#f1f5f9" },
          200: { value: "#e2e8f0" },
          300: { value: "#cbd5e1" },
          400: { value: "#94a3b8" },
          500: { value: "#64748b" },
          600: { value: "#475569" },
          700: { value: "#334155" },
          800: { value: "#1e293b" },
          900: { value: "#0f172a" },
          950: { value: "#0b0f17" },
        },
      },
    },
    semanticTokens: {
      colors: {
        "bg.muted": {
          value: { _light: "#f8fafc", _dark: "#0b0f17" },
        },
        "bg.panel": {
          value: { _light: "#ffffff", _dark: "#0f172a" },
        },
        "bg.subtle": {
          value: { _light: "#f1f5f9", _dark: "#1e293b" },
        },
        border: {
          value: { _light: "#e2e8f0", _dark: "#1e293b" },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);