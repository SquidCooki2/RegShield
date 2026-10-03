import React from "react";
import { Box, Flex, Heading, Text } from "@chakra-ui/react";

interface PanelHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  /** Kept so existing callers still compile; the redesign no longer uses them. */
  icon?: React.ReactNode;
  palette?: string;
}

/** Plain title and one muted line. Structure comes from spacing, not tinted tiles. */
export const PanelHeader: React.FC<PanelHeaderProps> = ({ title, subtitle, right }) => (
  <Flex justify="space-between" align="baseline" gap={4} wrap="wrap">
    <Box>
      <Heading size="md" fontWeight="semibold" letterSpacing="-0.01em">
        {title}
      </Heading>
      {subtitle && (
        <Text fontSize="sm" color="fg.muted" mt={0.5}>
          {subtitle}
        </Text>
      )}
    </Box>
    {right}
  </Flex>
);