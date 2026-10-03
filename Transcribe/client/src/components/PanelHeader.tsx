import React from "react";
import { Box, Center, Flex, Heading, HStack, Text } from "@chakra-ui/react";

interface PanelHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  palette?: string;
  right?: React.ReactNode;
}

/** One header for every panel so icon tile, title and spacing match across the dashboard. */
export const PanelHeader: React.FC<PanelHeaderProps> = ({
  icon,
  title,
  subtitle,
  palette = "blue",
  right,
}) => (
  <Flex justify="space-between" align="center" gap={4} wrap="wrap">
    <HStack gap={3}>
      <Center
        boxSize={10}
        flexShrink={0}
        borderRadius="lg"
        colorPalette={palette}
        bg="colorPalette.subtle"
        color="colorPalette.fg"
      >
        {icon}
      </Center>
      <Box>
        <Heading size="sm">{title}</Heading>
        {subtitle && (
          <Text fontSize="xs" color="fg.muted">
            {subtitle}
          </Text>
        )}
      </Box>
    </HStack>
    {right}
  </Flex>
);