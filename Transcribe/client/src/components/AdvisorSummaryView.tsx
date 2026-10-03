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
import type { ComplianceAuditReport } from "@/types";

// Assumes POST /api/crm/sync/:meetingId accepts the payload built in buildPayload().
// Render with key={report?.meetingId} so local edits reset when a new meeting arrives.

interface ActionItem {
  id: string;
  text: string;
}
type SyncState = "idle" | "sending" | "sent";

export const AdvisorSummaryView: React.FC<{ report: ComplianceAuditReport | null }> = ({ report }) => {
  const summary = report?.crmSummary;
  const [objectives, setObjectives] = useState(summary?.clientObjectives ?? "");
  const [items, setItems] = useState<ActionItem[]>(() =>
    (summary?.actionItems ?? []).map((text) => ({ id: crypto.randomUUID(), text }))
  );
  const [draft, setDraft] = useState("");
  const [sync, setSync] = useState<SyncState>("idle");
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
    meetingId: report?.meetingId,
    objectives,
    actionItems: items.map((i) => i.text),
    productsDiscussed: summary?.productsDiscussed ?? [],
    disclosuresVerified: summary?.disclosuresVerified ?? false,
    // Reported from the audit, not asserted by the client.
    complianceReview: {
      riskLevel: report?.overallRiskLevel,
      flagCount: report?.flags.length ?? 0,
    },
  });

  const sendToCrm = async () => {
    if (!report) return;
    setSync("sending");
    try {
      const res = await fetch(`/api/crm/sync/${report.meetingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) throw new Error(`CRM sync failed (${res.status})`);
      setSync("sent");
      toaster.create({
        title: "Sent to CRM",
        description: `Meeting ${report.meetingId} was logged to ClientWorks.`,
        type: "success",
      });
    } catch (err) {
      setSync("idle");
      toaster.create({
        title: "Not sent to CRM",
        description: `${(err as Error).message}. Nothing was logged. Try again.`,
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

  if (!report || !summary) {
    return (
      <Card.Root variant="outline" h="full">
        <Card.Header>
          <PanelHeader icon={<LuFileCheck size={20} />} title="CRM summary" subtitle="Ready after the meeting audit" />
        </Card.Header>
        <Card.Body justify="center" align="center" textAlign="center" color="fg.muted" py={12}>
          <Text fontSize="sm">Record or upload a meeting to generate its summary.</Text>
        </Card.Body>
      </Card.Root>
    );
  }

  const flagCount = report.flags.length;

  return (
    <Card.Root variant="outline" h="full">
      <Card.Header>
        <PanelHeader
          icon={<LuFileCheck size={20} />}
          title="CRM summary"
          subtitle={`Meeting ${report.meetingId}`}
          right={
            <Badge colorPalette={sync === "sent" ? "green" : "blue"} variant="subtle">
              {sync === "sent" ? "Sent to CRM" : "Ready to review"}
            </Badge>
          }
        />
      </Card.Header>

      <Card.Body gap={5}>
        {flagCount > 0 && (
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
          <Badge colorPalette={summary.disclosuresVerified ? "green" : "orange"} variant="subtle">
            {summary.disclosuresVerified ? "Disclosures verified" : "Disclosures not verified"}
          </Badge>
          {summary.productsDiscussed.map((product) => (
            <Badge key={product} variant="outline">
              {product}
            </Badge>
          ))}
        </HStack>

        {summary.outsideBusinessMentions.length > 0 && (
          <Alert.Root status="info" size="sm">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>
                Outside business mentioned: {summary.outsideBusinessMentions.join(", ")}
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        <Field.Root>
          <Field.Label>Objectives and discussion</Field.Label>
          <Textarea
            size="sm"
            rows={4}
            value={objectives}
            onChange={(e) => setObjectives(e.target.value)}
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