import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Blue-tinted neutrals. Chakra's semantic tokens (bg.muted, bg.panel, fg.muted,
        // border...) are built on gray.*, so every component picks this up in light and dark.
        gray: {
          50: { value: "#f0f6ff" },
          100: { value: "#e1ecfb" },
          200: { value: "#c7d9f2" },
          300: { value: "#a3bde0" },
          400: { value: "#7b9bc7" },
          500: { value: "#5a7aa6" },
          600: { value: "#435f87" },
          700: { value: "#334a6b" },
          800: { value: "#1f3150" },
          900: { value: "#12203a" },
          950: { value: "#0a1426" },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);