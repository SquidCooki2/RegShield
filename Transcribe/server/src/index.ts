import { streamChunkToS3, processRecordedAudio } from "./transcribeService";
import { analyzeTranscriptWithBedrock } from "./bedrockService";

const port = Number(process.env.PORT ?? 3000);

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const server = Bun.serve({
  port,

  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers });

    try {
      if (url.pathname === "/api/health") {
        return Response.json(
          { success: true, status: "ok" },
          { headers }
        );
      }

      if (url.pathname === "/api/transcribe/stream-to-s3" && req.method === "POST") {
        const { sessionId, audioBase64, chunkIndex } = await req.json();

        if (!audioBase64)
          return Response.json({ error: "Missing audio" }, { status: 400, headers });

        const result = await streamChunkToS3(
          sessionId || "session",
          audioBase64,
          chunkIndex ?? Date.now()
        );

        return Response.json(
          { success: true, ...result },
          { headers }
        );
      }

      if (url.pathname === "/api/compliance/upload-audio" && req.method === "POST") {
        const form = await req.formData();
        const audio = form.get("audio");
        const transcriptInput = form.get("transcript");

        const file = audio instanceof File ? audio : null;
        const transcriptText =
          typeof transcriptInput === "string" ? transcriptInput : undefined;

        if (!file && !transcriptText)
          return Response.json(
            { error: "Audio or transcript required" },
            { status: 400, headers }
          );

        const { s3Uri, transcript } =
          await processRecordedAudio(file, transcriptText);

        const analysis = await analyzeTranscriptWithBedrock(transcript);

        return Response.json(
          { success: true, s3Uri, transcript, analysis },
          { headers }
        );
      }

      if (url.pathname === "/api/compliance/analyze" && req.method === "POST") {
        const { text, advisorId } = await req.json();

        if (!text)
          return Response.json(
            { error: "Missing transcript" },
            { status: 400, headers }
          );

        const analysis = await analyzeTranscriptWithBedrock(text);

        return Response.json(
          {
            success: true,
            advisorId: advisorId || "ADV-9812",
            timestamp: new Date().toISOString(),
            analysis,
          },
          { headers }
        );
      }

      return new Response("Not Found", { status: 404, headers });
    } catch (error) {
      console.error(error);

      return Response.json(
        {
          error: error instanceof Error
            ? error.message
            : "Internal server error",
        },
        { status: 500, headers }
      );
    }
  },
});

console.log(`Server running at ${server.url}`);