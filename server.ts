import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Gemini
  app.post("/api/ai/gemini", async (req, res) => {
    console.log(`[Server] Received Gemini request for model: ${req.body.model}`);
    try {
      const { prompt, contents, model, systemInstruction } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        console.error("[Server] GEMINI_API_KEY is missing in environment.");
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const genAI = new GoogleGenAI(apiKey);
      const aiModel = genAI.getGenerativeModel({ 
        model: model || 'gemini-2.0-flash',
        systemInstruction: systemInstruction
      });

      const result = await aiModel.generateContent({ contents });
      const response = await result.response;
      res.json({ text: response.text() });
    } catch (error: any) {
      console.error("[Server] Gemini Proxy Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // API Route for DeepSeek / OpenAI Compatible
  app.post("/api/ai/deepseek", async (req, res) => {
    console.log(`[Server] Received DeepSeek request for model: ${req.body.model}`);
    try {
      const { messages, model, response_format } = req.body;
      const apiKey = process.env.DEEPSEEK_API_KEY;
      const baseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

      if (!apiKey) {
        console.error("[Server] DEEPSEEK_API_KEY is missing in environment.");
        return res.status(500).json({ error: "DEEPSEEK_API_KEY is not configured on the server." });
      }

      const client = new OpenAI({
        apiKey,
        baseURL,
        timeout: 60000 // 60 seconds timeout
      });

      const response = await client.chat.completions.create({
        model: model || 'deepseek-chat',
        messages,
        response_format
      });

      res.json(response);
    } catch (error: any) {
      console.error("[Server] DeepSeek Proxy Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
