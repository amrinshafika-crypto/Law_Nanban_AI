const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const systemInstruction = `You are Law Nanban, an Indian legal information assistant. Tagline: “Ungal Urimai, Ungal Nanban!”.
Answer in the language used by the user (Tamil or English). Focus only on Indian law and explain legal terms simply. You are not a lawyer: distinguish general information from professional legal advice. Explain practical, lawful next steps and relevant procedures. Where a provision is known with confidence, name the relevant Act and section/article. Never invent or guess Acts, provisions, judgments, citations, deadlines, or official URLs; do not claim to have searched official databases or that a law is current without a reliable basis. State uncertainty plainly. When suitable, identify authoritative source names and links only when you know them reliably. Never guarantee outcomes or encourage illegal conduct. For emergencies or immediate danger, recommend contacting emergency services or appropriate authorities. Politely explain if a question is outside Indian law. End substantive legal answers with a short reminder that this is general information and not a substitute for advice from a qualified lawyer.`;

function reply(status: number, error: string) {
  return Response.json({ error }, { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, "Method not allowed.");

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return reply(400, "Request body must be a JSON object.");
    body = parsed as Record<string, unknown>;
  } catch {
    return reply(400, "Request body must be valid JSON.");
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 4000) return reply(400, "Please enter a question (maximum 4000 characters).");
  if (body.history !== undefined && !Array.isArray(body.history)) return reply(400, "Conversation history is invalid.");

  const rawHistory = Array.isArray(body.history) ? body.history : [];
  if (rawHistory.length > 10) return reply(400, "Conversation history is too long. Please clear the chat and try again.");
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
  for (const item of rawHistory) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return reply(400, "Conversation history contains an invalid message.");
    }
    const message = item as Record<string, unknown>;
    if (!(message.role === "user" || message.role === "model") || typeof message.text !== "string") return reply(400, "Conversation history contains an invalid message.");
    const text = message.text.trim();
    if (!text || text.length > 4000) return reply(400, "A conversation message is empty or too long.");
    const role = message.role;
    if (contents[contents.length - 1]?.role === role) return reply(400, "Conversation messages must alternate between user and assistant.");
    contents.push({ role, parts: [{ text }] });
  }
  if (contents[contents.length - 1]?.role === "user") return reply(400, "Conversation history must end with an assistant reply.");
  contents.push({ role: "user", parts: [{ text: question }] });

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.error("Law Nanban configuration error: GEMINI_API_KEY is missing.");
    return reply(503, "The legal assistant is not configured yet. Please try again later.");
  }

  const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;
  let response: Response | undefined;
  let responseController: AbortController | undefined;
  let responseTimeout: number | undefined;
  let lastFailure = "network";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 13_500);
    responseController = controller;
    responseTimeout = timeout;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1000,
          },
        }),
      });
      if ((response.status === 429 || response.status >= 500) && attempt === 0) {
        clearTimeout(timeout);
        responseTimeout = undefined;
        lastFailure = `upstream_${response.status}`;
        await response.body?.cancel();
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }
      break;
    } catch (error) {
      clearTimeout(timeout);
      responseTimeout = undefined;
      lastFailure = error instanceof DOMException && error.name === "AbortError" ? "upstream_timeout" : "network";
      if (attempt === 0 && lastFailure === "network") {
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }
      console.error("Law Nanban Gemini request failed:", lastFailure);
      return reply(lastFailure === "upstream_timeout" ? 504 : 502, lastFailure === "upstream_timeout"
        ? "Law Nanban is taking longer than expected. Please try again."
        : "The legal assistant could not reach its AI service. Please try again.");
    }
  }

  if (!response) {
    console.error("Law Nanban Gemini request failed:", lastFailure);
    return reply(502, "The legal assistant could not reach its AI service. Please try again.");
  }

  const apiErrorMessage = (message: unknown) => {
    if (typeof message === "string") return message;
    if (message && typeof message === "object") {
      const candidate = message as { message?: unknown; status?: unknown };
      if (typeof candidate.message === "string") return candidate.message;
      if (typeof candidate.status === "string") return candidate.status;
    }
    return "unknown";
  };

  let data: { error?: { status?: string; message?: string }; candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }> };
  try {
    data = await response.json() as typeof data;
  } catch {
    if (responseTimeout !== undefined) clearTimeout(responseTimeout);
    if (responseController?.signal.aborted) {
      console.error("Law Nanban Gemini response body timed out.");
      return reply(504, "Law Nanban is taking longer than expected. Please try again.");
    }
    console.error("Law Nanban Gemini returned invalid JSON.");
    return reply(502, "The AI service returned an unreadable response. Please try again.");
  }
  if (responseTimeout !== undefined) clearTimeout(responseTimeout);

  if (!response.ok) {
    const status = response.status;
    const apiDetail = apiErrorMessage(data?.error ?? data ?? null);
    console.error("Law Nanban Gemini API returned an error:", { status, model: geminiModel, detail: apiDetail });
    if (status === 401 || status === 403 || /api key not valid|invalid api key/i.test(apiDetail)) return reply(502, "The AI service credentials need attention. Please try again later.");
    if (status === 404) return reply(502, "The configured AI model is unavailable. Please try again later.");
    if (status === 429) return reply(503, "The AI service is busy. Please try again shortly.");
    if (status >= 500) return reply(502, "The AI service is temporarily unavailable. Please try again.");
    return reply(502, "The AI service rejected this request. Please try again.");
  }

  const answer = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: unknown }) => typeof part.text === "string" ? part.text : "")
    .join("")
    .trim();
  if (!answer) {
    console.error("Law Nanban Gemini returned no answer.");
    return reply(502, "The AI service returned an empty answer. Please try again.");
  }
  return Response.json({ answer }, { headers: corsHeaders });
});
