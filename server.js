require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { AzureOpenAI } = require("openai");

const app = express();

const port = Number(process.env.PORT || 3000);
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
const apiVersion =
  process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";

const missingVariables = [];

if (!endpoint) missingVariables.push("AZURE_OPENAI_ENDPOINT");
if (!apiKey) missingVariables.push("AZURE_OPENAI_API_KEY");
if (!deployment) missingVariables.push("AZURE_OPENAI_DEPLOYMENT");

if (missingVariables.length > 0) {
  console.error(
    "Missing environment variables:",
    missingVariables.join(", ")
  );
  process.exit(1);
}

const client = new AzureOpenAI({
  endpoint,
  apiKey,
  deployment,
  apiVersion
});

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Chatbot server is running"
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "canvas-azure-openai-chatbot",
    azureConfigured: Boolean(endpoint && apiKey && deployment),
    deployment,
    apiVersion
  });
});

app.post("/chat", async (req, res) => {
  try {
    console.log("POST /chat received");
    console.log("Request origin:", req.headers.origin || "No origin");
    console.log("Request body:", req.body);

    const message =
      typeof req.body?.message === "string"
        ? req.body.message.trim()
        : "";

    if (!message) {
      return res.status(400).json({
        ok: false,
        error:
          'The request body must contain a non-empty "message" value.'
      });
    }

    const completion = await client.chat.completions.create({
      model: deployment,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful learning support assistant. Give clear, concise and accurate answers."
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      console.error(
        "Azure returned no message content:",
        JSON.stringify(completion, null, 2)
      );

      return res.status(502).json({
        ok: false,
        error:
          "Azure OpenAI returned a response without message content."
      });
    }

    return res.status(200).json({
      ok: true,
      reply
    });
  } catch (error) {
    console.error("Azure OpenAI request failed.");

    console.error({
      name: error?.name,
      message: error?.message,
      status: error?.status,
      code: error?.code,
      type: error?.type,
      requestId:
        error?.request_id ||
        error?.headers?.["x-request-id"]
    });

    return res.status(error?.status || 500).json({
      ok: false,
      error: error?.message || "Unknown server error",
      status: error?.status || 500,
      code: error?.code || null
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Chatbot server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Chat route: POST http://localhost:${port}/chat`);
  console.log(`Azure endpoint loaded: ${Boolean(endpoint)}`);
  console.log(`Azure key loaded: ${Boolean(apiKey)}`);
  console.log(`Deployment: ${deployment}`);
  console.log(`API version: ${apiVersion}`);
});