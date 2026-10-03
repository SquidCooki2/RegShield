"use client"

import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import {
  ColorModeProvider,
  type ColorModeProviderProps,
} from "./color-mode"

// The old version passed forcedTheme="light", which made the color mode button a no-op.
export function Provider(props: ColorModeProviderProps) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider {...props} />
    </ChakraProvider>
  )
}