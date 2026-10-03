import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { ReviewRecord, type AuditEvent, type ReviewStatus } from '@transcribe/shared'

function env(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name} in server/.env`)
  return value
}

const table = env('REVIEWS_TABLE')

// DynamoDB rejects undefined values, so drop them (DESIGN_DECISIONS.md D2).
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: env('AWS_REGION') }), {
  marshallOptions: { removeUndefinedValues: true },
})

export async function createReview(record: ReviewRecord): Promise<void> {
  await db.send(
    new PutCommand({ TableName: table, Item: ReviewRecord.parse(record), ConditionExpression: 'attribute_not_exists(meetingId)' }),
  )
}

export async function getReview(meetingId: string): Promise<ReviewRecord | undefined> {
  const { Item } = await db.send(new GetCommand({ TableName: table, Key: { meetingId } }))
  return Item && ReviewRecord.parse(Item)
}

// Full scan: fine at hackathon scale; production would add an index on status (D2).
export async function listReviews(): Promise<ReviewRecord[]> {
  const items: Record<string, unknown>[] = []
  let ExclusiveStartKey: Record<string, unknown> | undefined
  do {
    const page = await db.send(new ScanCommand({ TableName: table, ExclusiveStartKey }))
    items.push(...(page.Items ?? []))
    ExclusiveStartKey = page.LastEvaluatedKey
  } while (ExclusiveStartKey)
  return items.map((item) => ReviewRecord.parse(item))
}

// Sets the given fields and appends one audit event in a single write. The audit log is only ever
// appended to, never rewritten. With onlyIfStatus, the write fails (ConditionalCheckFailedException)
// unless the record is currently in one of those statuses.
export async function updateReview(
  meetingId: string,
  fields: Partial<Omit<ReviewRecord, 'meetingId' | 'audit'>>,
  event: AuditEvent,
  onlyIfStatus?: ReviewStatus[],
): Promise<ReviewRecord> {
  const names: Record<string, string> = { '#audit': 'audit' }
  const values: Record<string, unknown> = { ':event': [event] }
  const sets = ['#audit = list_append(#audit, :event)']

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue
    names[`#${key}`] = key
    values[`:${key}`] = value
    sets.push(`#${key} = :${key}`)
  }

  let condition = 'attribute_exists(meetingId)'
  if (onlyIfStatus) {
    names['#status'] = 'status'
    onlyIfStatus.forEach((status, i) => (values[`:allowed${i}`] = status))
    condition += ` AND #status IN (${onlyIfStatus.map((_, i) => `:allowed${i}`).join(', ')})`
  }

  const { Attributes } = await db.send(
    new UpdateCommand({
      TableName: table,
      Key: { meetingId },
      UpdateExpression: `SET ${sets.join(', ')}`,
      ConditionExpression: condition,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }),
  )
  return ReviewRecord.parse(Attributes)
}

export function auditEvent(actor: string, action: AuditEvent['action'], note?: string): AuditEvent {
  return { at: new Date().toISOString(), actor, action, note }
}
