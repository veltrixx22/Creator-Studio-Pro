import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry user-agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy-key-for-development",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Express API endpoints
app.post("/api/gemini/highlights", async (req, res) => {
  const { prompt, transcript } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Focus prompt is required" });
  }

  // Check for fallback if no API Key is provided
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
    console.warn("No active GEMINI_API_KEY detected. Returning high-fidelity mock fallback.");
    return res.json({
      highlights: [
        {
          id: "h-1",
          title: "Início Explosivo: Bem-vindo ao Creator Studio",
          startTime: 1,
          duration: 12,
          reason: "Análise de áudio indicou pico de entusiasmo vocal de 85dB na abertura.",
          platform: "YouTube Shorts"
        },
        {
          id: "h-2",
          title: "Sacanagem! Latência Local menor de 30ms",
          startTime: 11,
          duration: 18,
          reason: "O convidado destaca o recurso chave da rede local sem internet.",
          platform: "TikTok"
        },
        {
          id: "h-3",
          title: "Gravação Híbrida Inteligente",
          startTime: 28,
          duration: 25,
          reason: "Segmento de alta densidade técnica explicando o core business do app.",
          platform: "Reels"
        }
      ],
      reasoning: "Processamento de IA offline simulado devido à ausência de credenciais."
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Analise a seguinte transcrição e crie cortes (highlights) recomendados para redes sociais (Shorts, TikTok ou Reels).
Abaixo está o foco do usuário para estes cortes:
"${prompt}"

Transcrição do projeto:
${transcript || "Nenhuma transcrição fornecida."}
`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            highlights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING, description: "Título curto e engajador para o corte." },
                  startTime: { type: Type.INTEGER, description: "Tempo de início aproximado do corte em segundos." },
                  duration: { type: Type.INTEGER, description: "Duração recomendada do corte em segundos." },
                  reason: { type: Type.STRING, description: "Explicação lógica de por que este corte é atraente ou engraçado." },
                  platform: { type: Type.STRING, description: "Rede social recomendada: TikTok, YouTube Shorts ou Reels." }
                },
                required: ["id", "title", "startTime", "duration", "reason", "platform"]
              }
            },
            reasoning: { type: Type.STRING, description: "Resumo geral da análise de engajamento do vídeo." }
          },
          required: ["highlights", "reasoning"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response text from Gemini API");
    }

    const parsed = JSON.parse(resultText);
    res.json(parsed);
  } catch (error: any) {
    console.error("Gemini highlights error:", error);
    res.status(500).json({ error: error.message || "Failed to process highlights with Gemini" });
  }
});

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date() });
});

// Configure Vite middleware in dev, static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Creator Studio Server running on http://localhost:${PORT}`);
  });
}

startServer();
