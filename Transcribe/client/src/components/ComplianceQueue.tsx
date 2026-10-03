import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Collapsible,
  Field,
  Flex,
  Grid,
  GridItem,
  HStack,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { LuChevronDown, LuPause, LuPlay, LuRefreshCw } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { PanelHeader } from "./PanelHeader";
import { errorMessage, sendJson } from "@/lib/api";
import { formatTime, riskPalette } from "@/lib/format";
import type { UserProfile } from "@/types";
import type { ReviewRecord, SpeakerRole } from "@transcribe/shared";

/** One row of GET /api/meetings (already sorted by risk, then newest). */
type QueueItem = Pick<
  ReviewRecord,
  "meetingId" | "mode" | "title" | "createdAt" | "createdBy" | "status" | "overallRisk" | "summaryStatus"
> & { flagCount: number };

/** GET /api/meetings/:id adds a short-lived presigned link to the archived original. */
type MeetingDetail = ReviewRecord & { audioUrl?: string };

type Decision = "approve" | "escalate";

const ROLE_LABEL: Record<SpeakerRole, string> = {
  advisor: "Advisor",
  client: "Client",
  third_party: "Third party",
};

const speakerName = (detail: MeetingDetail, speaker: string) => {
  const role = detail.speakerRoles[speaker];
  return role ? ROLE_LABEL[role] : speaker;
};

const formatDate = (iso: string) => new Date(iso).toLocaleString();

const seekAndPlay = (audio: HTMLAudioElement, seconds: number) => {
  const go = () => {
    audio.currentTime = seconds;
    audio.play().catch(console.error);
  };
  if (audio.readyState >= 1) go();
  else audio.addEventListener("loadedmetadata", go, { once: true });
};

/** A dot plus the risk word. Color carries severity and nothing else in this panel. */
const Risk: React.FC<{ level: string }> = ({ level }) => (
  <HStack gap={1.5} colorPalette={riskPalette(level as never)} flexShrink={0}>
    <Box boxSize={2} borderRadius="full" bg="colorPalette.solid" />
    <Text fontSize="xs" color="fg.muted" textTransform="capitalize">
      {level} risk
    </Text>
  </HStack>
);

/** Secondary sections stay closed until the reviewer wants them. */
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Collapsible.Root>
    <Collapsible.Trigger asChild>
      <Button variant="plain" size="sm" px={0} h="auto" fontWeight="medium" color="fg">
        {title} <LuChevronDown />
      </Button>
    </Collapsible.Trigger>
    <Collapsible.Content pt={3}>{children}</Collapsible.Content>
  </Collapsible.Root>
);

export const ComplianceQueue: React.FC<{ reviewer: UserProfile }> = ({ reviewer }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MeetingDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  // Bumped by Refresh so the open case reloads too (its audio link expires after 15 minutes).
  const [refreshCount, setRefreshCount] = useState(0);
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playingFlag, setPlayingFlag] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/meetings");
      if (!res.ok) throw new Error(errorMessage(res.status, await res.text()));
      const next = ((await res.json()) as QueueItem[]).filter((m) => m.status === "needs_review");
      setQueue(next);
      setSelectedId((prev) => (next.some((m) => m.meetingId === prev) ? prev : (next[0]?.meetingId ?? null)));
      setRefreshCount((n) => n + 1);
    } catch (err) {
      toaster.create({
        title: "Couldn't load the queue",
        description: `${(err as Error).message} Check your connection, then try Refresh.`,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // The note and playback belong to one case, so they reset only when the selection changes.
  useEffect(() => {
    setNote("");
    setPlayingFlag(null);
    setDetail(null);
  }, [selectedId]);

  useEffect(() => {
    setDetailError(null);
    if (!selectedId) return;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/meetings/${selectedId}`, { signal: controller.signal });
        if (!res.ok) throw new Error(errorMessage(res.status, await res.text()));
        setDetail((await res.json()) as MeetingDetail);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setDetailError((err as Error).message);
      }
    })();
    return () => controller.abort();
  }, [selectedId, refreshCount]);

  const toggleFlagAudio = (idx: number, seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingFlag === idx && !audio.paused) {
      audio.pause();
      return;
    }
    setPlayingFlag(idx);
    seekAndPlay(audio, seconds);
  };

  const decide = async (decision: Decision) => {
    if (!detail || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await sendJson(`/api/meetings/${detail.meetingId}/${decision}`, "POST", {
        actor: reviewer.name,
        note: note.trim() || undefined,
      });
      toaster.create({
        title: decision === "escalate" ? "Meeting escalated" : "Meeting approved",
        description: `"${detail.title}" left the queue. Your decision is in its audit trail.`,
        type: decision === "escalate" ? "warning" : "success",
      });
      await fetchQueue();
    } catch (err) {
      toaster.create({
        title: "Decision not saved",
        description: (err as Error).message,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selected = queue.find((m) => m.meetingId === selectedId) ?? null;

  return (
    <Card.Root variant="outline">
      <Card.Header pb={0}>
        <PanelHeader
          title="Review queue"
          subtitle="Flagged meetings, with audio at the moment of each flag"
          right={
            <Button size="xs" variant="ghost" onClick={fetchQueue} loading={isLoading}>
              <LuRefreshCw size={12} /> Refresh
            </Button>
          }
        />
      </Card.Header>

      <Card.Body pt={6}>
        <Grid templateColumns={{ base: "minmax(0, 1fr)", lg: "minmax(0, 4fr) minmax(0, 8fr)" }} gap={10}>
          {/* Queue list */}
          <GridItem>
            <Text fontSize="sm" color="fg.muted" mb={2}>
              {queue.length} waiting
            </Text>
            <VStack align="stretch" gap={0} maxH="70vh" overflowY="auto" borderTopWidth="1px">
              {queue.length === 0 && !isLoading && (
                <Text fontSize="sm" color="fg.muted" py={6}>
                  Nothing to review. Flagged meetings show up here once analysis finishes.
                </Text>
              )}
              {queue.map((item) => {
                const active = item.meetingId === selectedId;
                return (
                  <Box
                    key={item.meetingId}
                    as="button"
                    w="full"
                    textAlign="left"
                    py={3.5}
                    pl={active ? 3 : 0}
                    pr={2}
                    borderBottomWidth="1px"
                    borderLeftWidth={active ? "3px" : "0"}
                    borderLeftColor="fg"
                    bg={active ? "bg.muted" : "transparent"}
                    _hover={{ bg: "bg.muted" }}
                    aria-pressed={active}
                    onClick={() => setSelectedId(item.meetingId)}
                  >
                    <Flex justify="space-between" align="center" gap={3}>
                      <Text fontWeight="medium" fontSize="sm" truncate>
                        {item.title}
                      </Text>
                      <Risk level={item.overallRisk} />
                    </Flex>
                    <Text fontSize="xs" color="fg.muted" mt={1} truncate>
                      {item.flagCount} {item.flagCount === 1 ? "flag" : "flags"}, {item.createdBy},{" "}
                      {formatDate(item.createdAt)}
                    </Text>
                  </Box>
                );
              })}
            </VStack>
          </GridItem>

          {/* Case detail */}
          <GridItem>
            {!selected ? (
              <VStack py={20} gap={1} color="fg.muted" textAlign="center">
                <Text fontWeight="medium" color="fg">
                  No meeting selected
                </Text>
                <Text fontSize="sm">Pick one from the list to see its flags and audio.</Text>
              </VStack>
            ) : detailError ? (
              <Alert.Root status="error">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Couldn't load this meeting</Alert.Title>
                  <Alert.Description>{detailError} Try Refresh.</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            ) : !detail ? (
              <VStack py={20}>
                <Spinner />
              </VStack>
            ) : (
              <VStack align="stretch" gap={8}>
                <Box>
                  <Flex justify="space-between" align="baseline" gap={3}>
                    <Text fontSize="lg" fontWeight="semibold" truncate>
                      {detail.title}
                    </Text>
                    <Risk level={detail.overallRisk} />
                  </Flex>
                  <Text fontSize="sm" color="fg.muted" mt={0.5}>
                    {detail.mode === "live" ? "Live" : "Recorded"} by {detail.createdBy} on{" "}
                    {formatDate(detail.createdAt)}
                  </Text>
                </Box>

                {detail.audioUrl ? (
                  <audio
                    ref={audioRef}
                    src={detail.audioUrl}
                    controls
                    preload="metadata"
                    style={{ width: "100%" }}
                    onPause={() => setPlayingFlag(null)}
                    onEnded={() => setPlayingFlag(null)}
                    onError={() =>
                      toaster.create({
                        title: "Audio couldn't play",
                        description: "The link may have expired. Refresh the queue to get a new one.",
                        type: "error",
                      })
                    }
                  />
                ) : (
                  <Text fontSize="sm" color="fg.muted">
                    Audio isn't available for this meeting.
                  </Text>
                )}

                <VStack align="stretch" gap={0}>
                  <Text fontSize="sm" fontWeight="semibold" mb={3}>
                    Flags ({detail.flags.length})
                  </Text>
                  {detail.flags.map((flag, idx) => (
                    <Box
                      key={idx}
                      colorPalette={riskPalette(flag.severity)}
                      borderLeftWidth="3px"
                      borderLeftColor="colorPalette.solid"
                      pl={4}
                      py={3}
                      mb={4}
                    >
                      <Flex justify="space-between" align="baseline" gap={3} wrap="wrap">
                        <Text fontSize="sm" fontWeight="semibold">
                          {flag.ruleName}
                        </Text>
                        <Button
                          size="xs"
                          variant="ghost"
                          disabled={!detail.audioUrl}
                          onClick={() => toggleFlagAudio(idx, flag.timestampSeconds)}
                        >
                          {playingFlag === idx ? <LuPause size={12} /> : <LuPlay size={12} />}
                          {playingFlag === idx ? "Pause" : "Play"} at {formatTime(flag.timestampSeconds)}
                        </Button>
                      </Flex>
                      <Text fontSize="xs" color="fg.muted">
                        {flag.ruleId}, {flag.severity} severity, said by {ROLE_LABEL[flag.speakerRole].toLowerCase()}
                      </Text>
                      <Text fontSize="md" mt={3} fontStyle="italic">
                        "{flag.quote}"
                      </Text>
                      {!flag.quoteVerified && (
                        <Text fontSize="xs" color="orange.fg" mt={1}>
                          This quote wasn't found in the transcript. Listen to the audio before relying on it.
                        </Text>
                      )}
                      <Text fontSize="sm" mt={2}>
                        {flag.explanation}
                      </Text>
                      <Text fontSize="sm" color="fg.muted" mt={1.5}>
                        Suggested action: {flag.suggestedAction}
                      </Text>
                    </Box>
                  ))}
                </VStack>

                {detail.liveAlerts.length > 0 && (
                  <Section title={`Alerts shown during the meeting (${detail.liveAlerts.length})`}>
                    <VStack align="stretch" gap={1.5}>
                      {detail.liveAlerts.map((alert, idx) => (
                        <Text key={idx} fontSize="sm">
                          <Text as="span" color="fg.muted" fontVariantNumeric="tabular-nums">
                            {formatTime(alert.timestampSeconds)} {alert.ruleId}
                          </Text>{" "}
                          {alert.nudge}
                        </Text>
                      ))}
                    </VStack>
                  </Section>
                )}

                <Section title="Redacted transcript">
                  <Box maxH="260px" overflowY="auto" fontSize="sm" lineHeight="tall">
                    {detail.transcript.map((turn, idx) => (
                      <Box key={idx} mb={3}>
                        <Text fontSize="xs" color="fg.muted" fontVariantNumeric="tabular-nums">
                          {formatTime(turn.start)}{" "}
                          <Text as="span" fontWeight="medium" color="fg">
                            {speakerName(detail, turn.speaker)}
                          </Text>
                        </Text>
                        <Text>{turn.text}</Text>
                      </Box>
                    ))}
                  </Box>
                </Section>

                <Section title="Audit trail">
                  <VStack align="stretch" gap={1.5} fontSize="sm">
                    {detail.audit.map((event, idx) => (
                      <Text key={idx}>
                        <Text as="span" color="fg.muted">
                          {formatDate(event.at)}
                        </Text>{" "}
                        {event.action.replaceAll("_", " ")} by {event.actor}
                        {event.note && (
                          <Text as="span" color="fg.muted">
                            {" "}
                            ({event.note})
                          </Text>
                        )}
                      </Text>
                    ))}
                  </VStack>
                </Section>

                {/* Decision bar stays reachable while the reviewer scrolls the evidence. */}
                <Box position="sticky" bottom={0} bg="bg.panel" borderTopWidth="1px" pt={4} pb={2}>
                  <Field.Root>
                    <Field.Label>Note from {reviewer.name}</Field.Label>
                    <Textarea
                      rows={2}
                      placeholder="Saved to the audit trail with your decision"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <Field.HelperText>Required to escalate.</Field.HelperText>
                  </Field.Root>
                  <HStack gap={2} justify="flex-end" mt={3}>
                    <Button
                      size="sm"
                      variant="outline"
                      colorPalette="red"
                      onClick={() => decide("escalate")}
                      disabled={isSubmitting || note.trim().length === 0}
                    >
                      Escalate
                    </Button>
                    <Button size="sm" onClick={() => decide("approve")} disabled={isSubmitting}>
                      Approve
                    </Button>
                  </HStack>
                </Box>
              </VStack>
            )}
          </GridItem>
        </Grid>
      </Card.Body>
    </Card.Root>
  );
};