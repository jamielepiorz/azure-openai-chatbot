require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { AzureOpenAI } = require("openai");

const app = express();

app.use(cors());
app.use(express.json());

const client = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION,
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
});



app.post("/chat", async (req, res) => {
  try {

    const userMessage = req.body.message;

    const response =
      await client.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are the Apprentify AI assistant."
          },
          {
            role: "user",
            content: userMessage
          }
        ]
      });

    res.json({
      reply:
        response.choices[0].message.content
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to contact Azure OpenAI"
    });
  }
});