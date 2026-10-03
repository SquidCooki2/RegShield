"use client"

import { IconButton } from "@chakra-ui/react"
import { ThemeProvider, useTheme, type ThemeProviderProps } from "next-themes"
import { LuMoon, LuSun } from "react-icons/lu"

export type ColorModeProviderProps = ThemeProviderProps

export function ColorModeProvider(props: ColorModeProviderProps) {
  return <ThemeProvider attribute="class" disableTransitionOnChange {...props} />
}

export function ColorModeButton() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  return (
    <IconButton
      aria-label="Toggle color mode"
      variant="ghost"
      size="sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <LuMoon /> : <LuSun />}
    </IconButton>
  )
}
