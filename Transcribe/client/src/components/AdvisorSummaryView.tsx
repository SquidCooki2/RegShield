import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
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
import { LuCheck, LuCopy, LuFileCheck, LuSend, LuX } from "react-icons/lu";
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
          <PanelHeader icon={<LuFileCheck size={20} />} title="CRM summary" subtitle="Ready after the meeting audit" />
        </Card.Header>
        <Card.Body justifyContent="center" alignItems="center" textAlign="center" color="fg.muted" py={12}>
          <Text fontSize="sm">Record or upload a meeting to generate its summary.</Text>
        </Card.Body>
      </Card.Root>
    );
  }

  const flagCount = review.flags.length;

  return (
    <Card.Root variant="outline" h="full">
      <Card.Header>
        <PanelHeader
          icon={<LuFileCheck size={20} />}
          title="CRM summary"
          subtitle={review.title}
          right={
            <Badge colorPalette={sync === "sent" ? "green" : "blue"} variant="subtle">
              {sync === "sent" ? "Sent to CRM" : "Ready to review"}
            </Badge>
          }
        />
      </Card.Header>

      <Card.Body gap={5}>
        {review.status === "needs_review" && (
          <Alert.Root status="warning" size="sm">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>
                {flagCount} compliance {flagCount === 1 ? "flag is" : "flags are"} awaiting supervisory review.
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        <HStack gap={2} wrap="wrap">
          <Badge colorPalette={riskPalette(review.overallRisk)} variant="subtle">
            {review.overallRisk === "none" ? "No risk found" : `Overall risk: ${review.overallRisk}`}
          </Badge>
          <Badge variant="outline">{review.mode === "live" ? "Live meeting" : "Recorded meeting"}</Badge>
        </HStack>

        <Field.Root>
          <Field.Label>Meeting summary</Field.Label>
          <Textarea
            size="sm"
            rows={4}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            disabled={sync !== "idle"}
          />
        </Field.Root>

        <VStack align="stretch" gap={2}>
          <Text fontSize="sm" fontWeight="medium">
            Follow-up action items ({items.length})
          </Text>
          {items.map((item) => (
            <Flex
              key={item.id}
              justify="space-between"
              align="center"
              gap={2}
              pl={3}
              pr={1}
              py={1}
              bg="bg.muted"
              borderRadius="md"
            >
              <Text fontSize="sm">{item.text}</Text>
              <IconButton
                size="xs"
                variant="ghost"
                colorPalette="red"
                aria-label={`Remove action item: ${item.text}`}
                disabled={sync !== "idle"}
                onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
              >
                <LuX />
              </IconButton>
            </Flex>
          ))}
          <HStack>
            <Input
              size="sm"
              placeholder="Add an action item"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              disabled={sync !== "idle"}
            />
            <Button size="sm" variant="outline" onClick={addItem} disabled={!draft.trim() || sync !== "idle"}>
              Add
            </Button>
          </HStack>
        </VStack>

        <Box flex="1" />

        <HStack gap={2}>
          <Button
            flex="1"
            size="sm"
            colorPalette="blue"
            onClick={sendToCrm}
            loading={sync === "sending"}
            disabled={sync === "sent"}
          >
            <LuSend /> {sync === "sent" ? "Sent to CRM" : "Approve and send to CRM"}
          </Button>
          <IconButton size="sm" variant="outline" aria-label="Copy payload as JSON" onClick={copyPayload}>
            {copied ? <LuCheck /> : <LuCopy />}
          </IconButton>
        </HStack>
      </Card.Body>
    </Card.Root>
  );
};