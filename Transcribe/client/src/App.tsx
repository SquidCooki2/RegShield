import React, { useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Container,
  Flex,
  Heading,
  HStack,
  SegmentGroup,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuShieldAlert } from "react-icons/lu";
import { ColorModeButton } from "./components/ui/color-mode";
import { TranscribeWorkspace } from "./components/TranscribeWorkspace";
import { ComplianceQueue } from "./components/ComplianceQueue";
import { AdvisorSummaryView } from "./components/AdvisorSummaryView";
import { useCurrentUser } from "./hooks/useCurrentUser";
import type { UserProfile, UserRole } from "./types";
import type { ReviewRecord } from "@transcribe/shared";

const ROLE_LABEL: Record<UserRole, string> = {
  ADVISOR: "Advisor",
  REVIEWER: "Reviewer",
};

const CenteredMessage: React.FC<{
  title?: string;
  body?: string;
  action?: React.ReactNode;
  loading?: boolean;
}> = ({ title, body, action, loading }) => (
  <Center minH="100vh" bg="bg.muted" px={6}>
    <VStack gap={3} textAlign="center" maxW="sm">
      {loading ? <Spinner /> : <Heading size="md">{title}</Heading>}
      {body && (
        <Text fontSize="sm" color="fg.muted">
          {body}
        </Text>
      )}
      {action}
    </VStack>
  </Center>
);

const SectionHeader: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <Box>
    <Heading size="lg">{title}</Heading>
    <Text color="fg.muted" fontSize="sm" mt={1}>
      {description}
    </Text>
  </Box>
);

function Dashboard({ user }: { user: UserProfile }) {
  const [activeRole, setActiveRole] = useState<UserRole>(user.roles[0]);
  const [review, setReview] = useState<ReviewRecord | null>(null);
  const [isLive, setIsLive] = useState(false);

  const canAdvise = user.roles.includes("ADVISOR");
  const canReview = user.roles.includes("REVIEWER");

  return (
    <Box minH="100vh" bg="bg.muted">
      <Box
        as="header"
        position="sticky"
        top={0}
        zIndex="sticky"
        bg="bg.panel"
        borderBottomWidth="1px"
        py={3}
      >
        <Container maxW="7xl">
          <Flex justify="space-between" align="center" gap={4} wrap="wrap">
            <HStack gap={3}>
              <Center boxSize={10} bg="blue.600" color="white" borderRadius="xl">
                <LuShieldAlert size={22} />
              </Center>
              <Box>
                <HStack gap={2}>
                  <Heading size="md">RegShield</Heading>
                  <Badge colorPalette="blue" variant="subtle" borderRadius="full">
                    AI Compliance Co-Pilot
                  </Badge>
                </HStack>
                <Text fontSize="xs" color="fg.muted">
                  Supervisory surveillance and WORM storage
                </Text>
              </Box>
            </HStack>

            <HStack gap={4}>
              {user.roles.length > 1 && (
                <SegmentGroup.Root
                  size="sm"
                  value={activeRole}
                  disabled={isLive}
                  onValueChange={(e) => setActiveRole(e.value as UserRole)}
                >
                  <SegmentGroup.Indicator />
                  <SegmentGroup.Items
                    items={user.roles.map((role) => ({ value: role, label: ROLE_LABEL[role] }))}
                  />
                </SegmentGroup.Root>
              )}

              <HStack
                display={{ base: "none", lg: "flex" }}
                gap={2}
                px={3}
                py={1}
                borderRadius="full"
                borderWidth="1px"
                aria-live="polite"
              >
                <Box
                  boxSize={2}
                  borderRadius="full"
                  bg={isLive ? "red.solid" : "green.solid"}
                  animationName={isLive ? "pulse" : undefined}
                  animationDuration="1.5s"
                  animationIterationCount="infinite"
                />
                <Text fontSize="xs" fontWeight="medium">
                  {isLive ? "Live stream active" : "Ready"}
                </Text>
              </HStack>

              <HStack gap={2.5}>
                <Avatar.Root size="sm">
                  <Avatar.Fallback name={user.name} />
                </Avatar.Root>
                <Box display={{ base: "none", md: "block" }}>
                  <Text fontSize="sm" fontWeight="medium" lineHeight="short">
                    {user.name}
                  </Text>
                  {user.credential && (
                    <Text fontSize="xs" color="fg.muted" lineHeight="short">
                      {user.credential}
                    </Text>
                  )}
                </Box>
              </HStack>

              <ColorModeButton />
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Container maxW="7xl" py={8}>
        {/* Stays mounted when hidden so switching roles can't drop a live session. */}
        {canAdvise && (
          <VStack align="stretch" gap={6} display={activeRole === "ADVISOR" ? "flex" : "none"}>
            <SectionHeader
              title="Advisor workspace"
              description="Record a meeting, review the audit, then send the summary to the CRM."
            />
            <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
              <TranscribeWorkspace
                user={user}
                onLiveChange={setIsLive}
                onAuditComplete={setReview}
              />
              <AdvisorSummaryView key={review?.meetingId ?? "empty"} review={review} user={user} />
            </SimpleGrid>
          </VStack>
        )}

        {canReview && activeRole === "REVIEWER" && (
          <VStack align="stretch" gap={6}>
            <SectionHeader
              title="Supervisory review"
              description="Triage flagged meetings and record your disposition."
            />
            <ComplianceQueue reviewer={user} />
          </VStack>
        )}
      </Container>
    </Box>
  );
}

export default function App() {
  const { state, retry } = useCurrentUser();

  switch (state.status) {
    case "loading":
      return <CenteredMessage loading />;
    case "unauthenticated":
      return (
        <CenteredMessage
          title="Sign in required"
          body="Your session isn't active. Sign in, then check again."
          action={<Button size="sm" onClick={retry}>Check again</Button>}
        />
      );
    case "error":
      return (
        <CenteredMessage
          title="Couldn't load your profile"
          body={state.message}
          action={<Button size="sm" onClick={retry}>Try again</Button>}
        />
      );
    case "ready":
      return <Dashboard user={state.user} />;
  }
}