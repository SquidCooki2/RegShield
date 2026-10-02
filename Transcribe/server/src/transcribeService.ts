import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION || "us-east-1";
const bucket = process.env.S3_COMPLIANCE_BUCKET || "compliance-audio-vault";

const s3 = new S3Client({ region });

export async function streamChunkToS3(
  sessionId: string,
  audioBase64: string,
  chunkIndex: number
) {
  const key = `recordings/${sessionId}/chunk-${chunkIndex}.wav`;

  const buffer = Buffer.from(audioBase64, "base64");

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: "audio/wav",
    })
  );

  return {
    s3Uri: `s3://${bucket}/${key}`,
    timestamp: new Date().toISOString(),
  };
}

export async function processRecordedAudio(
  file: File | null,
  manualTranscript?: string
) {
  if (!file && !manualTranscript) {
    throw new Error("Audio file or transcript is required");
  }

  let s3Uri = "";

  if (file) {
    const key = `uploads/${Date.now()}-${file.name}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: file.type || "audio/wav",
      })
    );

    s3Uri = `s3://${bucket}/${key}`;
  }

  const transcript =
    manualTranscript ||
    "Sample transcript for compliance testing.";

  return { s3Uri, transcript };
}