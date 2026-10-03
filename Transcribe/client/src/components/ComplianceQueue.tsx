import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Field,
  Flex,
  Grid,
  GridItem,
  HStack,
  Separator,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  LuArrowUpRight,
  LuCircleCheck,
  LuClock,
  LuPause,
  LuPlay,
  LuRefreshCw,
  LuShieldAlert,
} from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { PanelHeader } from "./PanelHeader";
import { formatTime, riskPalette } from "@/lib/format";
import type { CaseDisposition, MeetingCaseRecord, UserProfile } from "@/types";

// Assumes GET /api/compliance/audio/:meetingId -> { url } (presigned S3 URL),
// and that POST /api/compliance/resolve/:meetingId accepts "ESCALATED" | "APPROVED".

const seekAndPlay = (audio: HTMLAudioElement, seconds: number) => {
  const go = () => {
    audio.currentTime = seconds;
    audio.play().catch(console.error);
  };
  if (audio.readyState >= 1) go();
  else audio.addEventListener("loadedmetadata", go, { once: true });
};

export const ComplianceQueue: React.FC<{ reviewer: UserProfile }> = ({ reviewer }) => {
  const [queue, setQueue] = useState<MeetingCaseRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [playingFlag, setPlayingFlag] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const selected = queue.find((m) => m.meetingId === selectedId) ?? null;
  const flags = selected?.auditReport?.flags ?? [];

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/compliance/queue");
      if (!res.ok) throw new Error(`Queue request failed (${res.status})`);
      const data = await res.json();
      const next: MeetingCaseRecord[] = data.queue ?? [];
      setQueue(next);
      setSelectedId((prev) =>
        next.some((m) => m.meetingId === prev) ? prev : (next[0]?.meetingId ?? null)
      );
    } catch (err) {
      console.error("Queue load failed:", err);
      toaster.create({
        title: "Couldn't load the queue",
        description: "Check your connection, then try Refresh.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Switching cases clears the note (it belongs to one case) and loads that case's audio.
  useEffect(() => {
    setNote("");
    setPlayingFlag(null);
    setAudioUrl(null);
    if (!selectedId) return;

    const controller = new AbortController();
    setAudioLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/compliance/audio/${selectedId}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        setAudioUrl(data.url ?? null);
      } catch (err) {
        if ((err as Error).name !== "AbortError") console.error("Audio URL failed:", err);
      } finally {
        if (!controller.signal.aborted) setAudioLoading(false);
      }
    })();
    return () => controller.abort();
  }, [selectedId]);

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

  const disposition = async (status: CaseDisposition) => {
    if (!selected || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/compliance/resolve/${selected.meetingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes: note.trim(), officerId: reviewer.id }),
      });
      if (!res.ok) throw new Error(`Resolve request failed (${res.status})`);

      toaster.create({
        title: status === "ESCALATED" ? "Case escalated" : "Case approved",
        description: `Meeting ${selected.meetingId} was updated.`,
        type: status === "ESCALATED" ? "warning" : "success",
      });
      await fetchQueue();
    } catch (err) {
      console.error(err);
      toaster.create({
        title: "Case not updated",
        description: "The server rejected the change. Try again before moving on.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card.Root variant="outline">
      <Card.Header>
        <PanelHeader
          palette="red"
          icon={<LuShieldAlert size={20} />}
          title="Supervisory review queue"
          subtitle="Flagged meetings with time-aligned audio evidence"
          right={
            <Button size="xs" variant="outline" onClick={fetchQueue} loading={isLoading}>
              <LuRefreshCw size={12} /> Refresh
            </Button>
          }
        />
      </Card.Header>

      <Card.Body>
        <Grid templateColumns={{ base: "minmax(0, 1fr)", lg: "minmax(0, 5fr) minmax(0, 7fr)" }} gap={6}>
          {/* Queue list */}
          <GridItem pr={{ lg: 6 }} borderRightWidth={{ base: 0, lg: "1px" }}>
            <Text fontSize="sm" fontWeight="semibold" mb={3}>
              Awaiting review ({queue.length})
            </Text>
            <VStack align="stretch" gap={2} maxH="65vh" overflowY="auto">
              {queue.length === 0 && !isLoading && (
                <Text fontSize="sm" color="fg.muted">
                  No meetings are waiting for review.
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
                    p={3.5}
                    borderRadius="lg"
                    borderWidth="1px"
                    colorPalette="blue"
                    borderColor={active ? "colorPalette.solid" : "border"}
                    bg={active ? "colorPalette.subtle" : "transparent"}
                    _hover={{ borderColor: "colorPalette.solid" }}
                    aria-pressed={active}
                    onClick={() => setSelectedId(item.meetingId)}
                  >
                    <Flex justify="space-between" align="center" gap={2} mb={1.5}>
                      <Text fontWeight="semibold" fontSize="sm" truncate>
                        {item.meetingId}
                      </Text>
                      <Badge colorPalette={riskPalette(item.overallRiskLevel)} size="sm">
                        {item.overallRiskLevel} ({item.overallRiskScore})
                      </Badge>
                    </Flex>
                    <Text fontSize="xs" color="fg.muted" truncate>
                      {item.auditReport?.flags?.[0]?.quote
                        ? `"${item.auditReport.flags[0].quote}"`
                        : "No specific rule violations detected"}
                    </Text>
                  </Box>
                );
              })}
            </VStack>
          </GridItem>

          {/* Case detail */}
          <GridItem>
            {selected ? (
              <VStack align="stretch" gap={5}>
                <Flex justify="space-between" align="center" gap={3}>
                  <Box minW={0}>
                    <Text fontWeight="semibold">Meeting {selected.meetingId}</Text>
                    <Text fontSize="xs" fontFamily="mono" color="fg.muted" truncate>
                      {selected.s3AudioLocation || "Audio location unavailable"}
                    </Text>
                  </Box>
                  <Badge colorPalette={riskPalette(selected.overallRiskLevel)} variant="subtle" size="md">
                    {selected.overallRiskScore}/100 risk
                  </Badge>
                </Flex>

                {audioUrl ? (
                  <audio
                    ref={audioRef}
                    src={audioUrl}
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
                  !audioLoading && (
                    <Text fontSize="xs" color="fg.muted">
                      Audio isn't available for this meeting.
                    </Text>
                  )
                )}

                <Separator />

                <VStack align="stretch" gap={3}>
                  <Text fontSize="sm" fontWeight="semibold">
                    Compliance flags ({flags.length})
                  </Text>
                  {flags.length === 0 && (
                    <Text fontSize="sm" color="fg.muted">
                      No flags were raised for this meeting.
                    </Text>
                  )}
                  {flags.map((flag, idx) => {
                    const start = flag.timestampRange?.startSec;
                    const canPlay = Boolean(audioUrl) && start !== undefined;
                    return (
                      <Box
                        key={idx}
                        colorPalette={riskPalette(flag.severity)}
                        p={4}
                        borderRadius="lg"
                        borderWidth="1px"
                        borderColor="colorPalette.muted"
                        bg="colorPalette.subtle"
                      >
                        <Flex justify="space-between" align="center" gap={2}>
                          <Badge colorPalette={riskPalette(flag.severity)} size="sm">
                            {flag.ruleCategory}
                          </Badge>
                          <Button
                            size="xs"
                            variant="subtle"
                            colorPalette="blue"
                            disabled={!canPlay}
                            onClick={() => start !== undefined && toggleFlagAudio(idx, start)}
                          >
                            {playingFlag === idx ? <LuPause size={11} /> : <LuPlay size={11} />}
                            {start === undefined
                              ? "No timestamp"
                              : playingFlag === idx
                                ? `Pause (${formatTime(start)})`
                                : `Play at ${formatTime(start)}`}
                          </Button>
                        </Flex>
                        <Text fontSize="sm" fontFamily="mono" fontWeight="medium" color="colorPalette.fg" mt={3}>
                          "{flag.quote}"
                        </Text>
                        <Text fontSize="sm" mt={2}>
                          {flag.explanation}
                        </Text>
                        <Text fontSize="sm" color="fg.muted" mt={1.5}>
                          <Text as="span" fontWeight="semibold" color="fg">
                            Action:
                          </Text>{" "}
                          {flag.recommendedAction}
                        </Text>
                      </Box>
                    );
                  })}
                </VStack>

                <Box p={4} borderRadius="lg" bg="bg.muted" borderWidth="1px">
                  <Field.Root>
                    <Field.Label>Reviewer notes ({reviewer.name})</Field.Label>
                    <Textarea
                      size="sm"
                      bg="bg.panel"
                      rows={3}
                      placeholder="Notes for the audit trail"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <Field.HelperText>A note is required to escalate.</Field.HelperText>
                  </Field.Root>
                  <HStack gap={2} justify="flex-end" mt={4} wrap="wrap">
                    <Button
                      size="sm"
                      colorPalette="red"
                      onClick={() => disposition("ESCALATED")}
                      disabled={isSubmitting || note.trim().length === 0}
                    >
                      <LuArrowUpRight /> Escalate to branch manager
                    </Button>
                    <Button
                      size="sm"
                      colorPalette="green"
                      variant="subtle"
                      onClick={() => disposition("APPROVED")}
                      disabled={isSubmitting}
                    >
                      <LuCircleCheck /> Approve and archive
                    </Button>
                  </HStack>
                </Box>
              </VStack>
            ) : (
              <VStack py={16} gap={2} color="fg.muted" textAlign="center">
                <LuClock size={32} />
                <Text fontSize="sm">Select a meeting to review its flags and audio.</Text>
              </VStack>
            )}
          </GridItem>
        </Grid>
      </Card.Body>
    </Card.Root>
  );
};