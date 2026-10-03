import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  Field,
  Flex,
  HStack,
  IconButton,
  Input,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { LuCheck, LuCopy, LuX } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { PanelHeader } from "./PanelHeader";
import type { UserProfile } from "@/types";
import type { ReviewRecord } from "@transcribe/shared";
import { sendJson } from "@/lib/api";
import { riskPalette } from "@/lib/format";

// Sending saves edits with PATCH /api/meetings/:id/summary, then POST /api/meetings/:id/send-to-crm
// (a mock CRM on the server). Render with key={review?.meetingId} so local edits reset per meeting.

interface ActionItem {
  id: string;
  text: string;
}
type SyncState = "idle" | "sending" | "sent";

interface Props {
  review: ReviewRecord | null;
  user: UserProfile;
}

export const AdvisorSummaryView: React.FC<Props> = ({ review, user }) => {
  const [summary, setSummary] = useState(review?.summary ?? "");
  const [items, setItems] = useState<ActionItem[]>(() =>
    (review?.actionItems ?? []).map((text) => ({ id: crypto.randomUUID(), text }))
  );
  const [draft, setDraft] = useState("");
  const [sync, setSync] = useState<SyncState>(review?.summaryStatus === "sent_to_crm" ? "sent" : "idle");
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const addItem = () => {
    const text = draft.trim();
    if (!text) return;
    setItems((prev) => [...prev, { id: crypto.randomUUID(), text }]);
    setDraft("");
  };

  const buildPayload = () => ({
    meetingId: review?.meetingId,
    summary,
    actionItems: items.map((i) => i.text),
  });

  const sendToCrm = async () => {
    if (!review) return;
    setSync("sending");
    try {
      const { meetingId: _, ...edits } = buildPayload();
      const edited =
        edits.summary !== (review.summary ?? "") ||
        JSON.stringify(edits.actionItems) !== JSON.stringify(review.actionItems);
      if (edited) await sendJson(`/api/meetings/${review.meetingId}/summary`, "PATCH", { actor: user.name, ...edits });
      await sendJson(`/api/meetings/${review.meetingId}/send-to-crm`, "POST", { actor: user.name });
      setSync("sent");
      toaster.create({
        title: "Sent to CRM",
        description: `"${review.title}" was logged to the CRM.`,
        type: "success",
      });
    } catch (err) {
      setSync("idle");
      toaster.create({
        title: "Not sent to CRM",
        description: `${(err as Error).message} Try again.`,
        type: "error",
      });
    }
  };

  const copyPayload = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(buildPayload(), null, 2));
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toaster.create({
        title: "Couldn't copy",
        description: "Your browser blocked clipboard access.",
        type: "error",
      });
    }
  };

  if (!review) {
    return (
      <Card.Root variant="outline" h="full">
        <Card.Header>
          <PanelHeader title="CRM summary" subtitle="Ready after the meeting audit" />
        </Card.Header>
        <Card.Body justifyContent="center" alignItems="center" textAlign="center" py={16} gap={1}>
          <Text fontWeight="medium">No summary yet</Text>
          <Text fontSize="sm" color="fg.muted">
            Record or upload a meeting to generate one.
          </Text>
        </Card.Body>
      </Card.Root>
    );
  }

  const flagCount = review.flags.length;
  const locked = sync !== "idle";

  return (
    <Card.Root variant="outline" h="full">
      <Card.Header pb={0}>
        <PanelHeader
          title="CRM summary"
          subtitle={review.title}
          right={
            sync === "sent" ? (
              <Text fontSize="sm" color="green.fg">
                Sent to CRM
              </Text>
            ) : undefined
          }
        />
      </Card.Header>

      <Card.Body gap={7}>
        <VStack align="stretch" gap={1.5}>
          <HStack gap={1.5} colorPalette={riskPalette(review.overallRisk)}>
            <Box boxSize={2} borderRadius="full" bg="colorPalette.solid" />
            <Text fontSize="sm">
              {review.overallRisk === "none" ? "No risk found" : `${review.overallRisk} risk`}
              <Text as="span" color="fg.muted">
                {" "}
                from a {review.mode === "live" ? "live" : "recorded"} meeting
              </Text>
            </Text>
          </HStack>
          {review.status === "needs_review" && (
            <Text fontSize="sm" color="fg.muted">
              {flagCount} {flagCount === 1 ? "flag is" : "flags are"} waiting for supervisory review.
            </Text>
          )}
        </VStack>

        <Field.Root>
          <Field.Label>Meeting summary</Field.Label>
          <Textarea rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} disabled={locked} />
        </Field.Root>

        <VStack align="stretch" gap={0}>
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            Follow-ups ({items.length})
          </Text>
          <Box borderTopWidth="1px">
            {items.map((item) => (
              <Flex key={item.id} justify="space-between" align="center" gap={2} py={2} borderBottomWidth="1px">
                <Text fontSize="sm">{item.text}</Text>
                <IconButton
                  size="2xs"
                  variant="ghost"
                  aria-label={`Remove action item: ${item.text}`}
                  disabled={locked}
                  onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                >
                  <LuX />
                </IconButton>
              </Flex>
            ))}
          </Box>
          <HStack mt={3}>
            <Input
              size="sm"
              placeholder="Send the updated beneficiary form"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              disabled={locked}
            />
            <Button size="sm" variant="outline" onClick={addItem} disabled={!draft.trim() || locked}>
              Add
            </Button>
          </HStack>
        </VStack>

        <Box flex="1" />

        <HStack gap={2}>
          <Button flex="1" onClick={sendToCrm} loading={sync === "sending"} disabled={sync === "sent"}>
            {sync === "sent" ? "Sent to CRM" : "Approve and send to CRM"}
          </Button>
          <IconButton variant="outline" aria-label="Copy payload as JSON" onClick={copyPayload}>
            {copied ? <LuCheck /> : <LuCopy />}
          </IconButton>
        </HStack>
      </Card.Body>
    </Card.Root>
  );
};