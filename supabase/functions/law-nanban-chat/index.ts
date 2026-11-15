const GROQ_REQUEST_TIMEOUT_MS = 35_000;
const GROQ_RETRY_DELAY_MS = 500;
const GROQ_TOTAL_REQUEST_BUDGET_MS = 75_000;
const GROQ_MAX_COMPLETION_TOKENS = 4_096;
const GROQ_CONTINUATION_MAX_COMPLETION_TOKENS = 1_500;
const GROQ_DEFAULT_MODEL = "qwen/qwen3.8-27b";
const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const systemInstruction = `You are Law Nanban, an Indian legal information assistant. Tagline: “Ungal Urimai, Ungal Nanban!”.
Answer in the language used by the user (Tamil or English). Focus only on Indian law and explain legal terms simply. You are not a lawyer: distinguish general information from professional legal advice. Explain practical, lawful next steps and relevant procedures. Where a provision is known with confidence, name the relevant Act and section/article. Never invent or guess Acts, provisions, judgments, citations, deadlines, or official URLs; do not claim to have searched official databases or that a law is current without a reliable basis. State uncertainty plainly. When suitable, identify authoritative source names and links only when you know them reliably. Never guarantee outcomes or encourage illegal conduct. For emergencies or immediate danger, recommend contacting emergency services or appropriate authorities. Politely explain if a question is outside Indian law. End substantive legal answers with a short reminder that this is general information and not a substitute for advice from a qualified lawyer.`;

function reply(status: number, error: string, code?: string) {
  return Response.json({ error, ...(code ? { code } : {}) }, { status, headers: corsHeaders });
}

function sanitizeProviderDetail(value: string) {
  return value
    .replace(/gsk_[0-9A-Za-z_-]{10,}/g, "[REDACTED_KEY]")
    .replace(/(key|authorization|bearer)\s*[:= ]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .slice(0, 300);
}

function isAllowedProjectKey(request: Request) {
  const supplied = request.headers.get("apikey");
  if (!supplied) return false;
  const candidates = [Deno.env.get("SUPABASE_ANON_KEY"), Deno.env.get("SUPABASE_PUBLISHABLE_KEY")].filter((value): value is string => Boolean(value));
  try {
    const parsed = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}") as Record<string, unknown>;
    candidates.push(...Object.values(parsed).filter((value): value is string => typeof value === "string"));
  } catch { /* Optional platform key map; legacy anon key remains supported. */ }
  return candidates.includes(supplied);
}

async function hasProfessionalSession(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const projectUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = request.headers.get("apikey");
  if (!match || !projectUrl || !publishableKey) return false;

  try {
    const authResponse = await fetch(`${projectUrl}/auth/v1/user`, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${match[1]}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!authResponse.ok) return false;
    const user = await authResponse.json() as { id?: unknown };
    if (typeof user.id !== "string") return false;

    const profileUrl = new URL(`${projectUrl}/rest/v1/profiles`);
    profileUrl.searchParams.set("select", "role");
    profileUrl.searchParams.set("id", `eq.${user.id}`);
    const profileResponse = await fetch(profileUrl, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${match[1]}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!profileResponse.ok) return false;
    const profiles = await profileResponse.json() as Array<{ role?: unknown }>;
    return profiles.some((profile) => profile.role === "professional" || profile.role === "admin");
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, "Method not allowed.");
  if (!isAllowedProjectKey(req)) return reply(401, "This request is not authorized for the Law Nanban project.");

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return reply(400, "Request body must be a JSON object.");
    body = parsed as Record<string, unknown>;
  } catch {
    return reply(400, "Request body must be valid JSON.");
  }

  const mode = body.mode === "draft" || body.mode === "research" ? body.mode : "chat";
  if (mode !== "chat" && !(await hasProfessionalSession(req))) {
    return reply(401, "A signed-in professional account is required for this feature.");
  }
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const questionLimit = mode === "chat" ? 4000 : 16000;
  if (!question || question.length > questionLimit) return reply(400, `Please enter a question (maximum ${questionLimit} characters).`);
  const prompt = mode === "draft"
    ? `Create an editable working legal document draft using only the supplied facts and instructions. Do not invent facts, statutes, provisions, citations, deadlines, or procedural requirements. Preserve uncertain details as clearly marked [VERIFY] placeholders. Include a concise advocate review checklist. This is a draft for advocate review, not legal advice.\n\n${question}`
    : mode === "research"
      ? `Analyze this legal research query using only the supplied reference records. Identify relevant provisions only when explicitly present in records. Distinguish records marked verified from unverified. Do not invent authorities, citations, URLs, or claim live/current verification. If records do not support a finding, say so. Cite source record titles inline.\n\n${question}`
    : question;
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
  contents.push({ role: "user", parts: [{ text: prompt }] });

  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) {
    console.error("Law Nanban configuration error: GROQ_API_KEY is missing.");
    return reply(503, "The legal assistant is not configured yet. Please try again later.", "AI_NOT_CONFIGURED");
  }

  const configuredModel = Deno.env.get("GROQ_MODEL") || GROQ_DEFAULT_MODEL;
  const model = /^[a-zA-Z0-9._/-]+$/.test(configuredModel) ? configuredModel : GROQ_DEFAULT_MODEL;
  const messages = [
    { role: "system", content: systemInstruction },
    ...contents.map(({ role, parts }) => ({ role: role === "model" ? "assistant" : "user", content: parts.map((part) => part.text).join("\n") })),
  ];
  const requestDeadline = Date.now() + GROQ_TOTAL_REQUEST_BUDGET_MS;
  let response: Response | undefined;
  let responseController: AbortController | undefined;
  let responseTimeout: number | undefined;
  let lastFailure = "network";
  let lastAttemptStartedAt = Date.now();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const attemptStartedAt = Date.now();
    lastAttemptStartedAt = attemptStartedAt;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GROQ_REQUEST_TIMEOUT_MS);
    responseController = controller;
    responseTimeout = timeout;
    try {
      response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          max_completion_tokens: GROQ_MAX_COMPLETION_TOKENS,
          reasoning_effort: "low",
          stream: false,
        }),
      });
      if (!response.ok) {
        let detail = "No error detail";
        try {
          const errorData = await response.clone().json() as { error?: { message?: unknown; code?: unknown; type?: unknown } };
          const parts = [errorData.error?.message, errorData.error?.code, errorData.error?.type]
            .filter((part): part is string => typeof part === "string");
          if (parts.length) detail = sanitizeProviderDetail(parts.join(" | "));
        } catch { /* Some gateway errors do not include JSON bodies. */ }
        console.warn("Law Nanban Groq upstream HTTP error", { status: response.status, elapsedMs: Date.now() - attemptStartedAt, attempt: attempt + 1, model, detail });
      } else {
        console.info("Law Nanban Groq upstream response", { status: response.status, elapsedMs: Date.now() - attemptStartedAt, attempt: attempt + 1, model });
      }
      if ((response.status === 429 || (response.status >= 500 && response.status <= 599)) && attempt === 0) {
        clearTimeout(timeout);
        responseTimeout = undefined;
        lastFailure = `upstream_${response.status}`;
        await response.body?.cancel();
        await new Promise((resolve) => setTimeout(resolve, GROQ_RETRY_DELAY_MS));
        continue;
      }
      break;
    } catch (error) {
      clearTimeout(timeout);
      responseTimeout = undefined;
      lastFailure = controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError") ? "timeout" : "network";
      if (attempt === 0 && lastFailure === "network") {
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }
      const detail = error instanceof Error ? sanitizeProviderDetail(`${error.name}: ${error.message}`) : "Unknown fetch error";
      console.error("Law Nanban Groq request failed", { failure: lastFailure, elapsedMs: Date.now() - attemptStartedAt, attempt: attempt + 1, timeoutMs: GROQ_REQUEST_TIMEOUT_MS, detail });
      return lastFailure === "timeout"
        ? reply(504, "Law Nanban is taking longer than expected. Please try again.", "AI_TIMEOUT")
        : reply(502, "The legal assistant could not reach its AI service. Please try again.", "AI_NETWORK");
    }
  }

  if (!response) {
    console.error("Law Nanban Groq request failed:", lastFailure);
    return reply(502, "The legal assistant could not reach its AI service. Please try again.", "AI_NETWORK");
  }

  let data: GroqCompletionResponse;
  try {
    data = await response.json() as typeof data;
  } catch {
    if (responseTimeout !== undefined) clearTimeout(responseTimeout);
    if (responseController?.signal.aborted) {
      console.error("Law Nanban Groq response body timed out", { status: response.status, elapsedMs: Date.now() - lastAttemptStartedAt, timeoutMs: GROQ_REQUEST_TIMEOUT_MS });
      return reply(504, "Law Nanban is taking longer than expected. Please try again.", "AI_TIMEOUT");
    }
    if (!response.ok) return mapGroqError(response.status, "Non-JSON upstream error");
    console.error("Law Nanban Groq returned invalid JSON", { status: response.status, elapsedMs: Date.now() - lastAttemptStartedAt });
    return reply(502, "The AI service returned an unreadable response. Please try again.", "AI_INVALID_RESPONSE");
  }
  if (responseTimeout !== undefined) clearTimeout(responseTimeout);

  if (!response.ok) {
    const apiDetail = [data?.error?.message, data?.error?.code, data?.error?.type]
      .filter((part): part is string => typeof part === "string").join(" | ") || "Unknown upstream error";
    return mapGroqError(response.status, apiDetail, model, Date.now() - lastAttemptStartedAt);
  }

  const choice = data?.choices?.[0];
  const answer = typeof choice?.message?.content === "string" ? choice.message.content.trim() : "";
  if (!answer) {
    console.error("Law Nanban Groq returned no text answer.", { status: response.status, model, elapsedMs: Date.now() - lastAttemptStartedAt });
    return reply(502, "The AI service returned an empty answer. Please try again.", "AI_EMPTY_RESPONSE");
  }
  if (typeof choice?.finish_reason !== "string") {
    console.error("Law Nanban Groq response omitted finish_reason", { status: response.status, model, elapsedMs: Date.now() - lastAttemptStartedAt });
    return reply(502, "The AI service could not confirm that this response was complete. Please try again.", "AI_INVALID_RESPONSE");
  }
  if (choice.finish_reason === "stop") return Response.json({ answer }, { headers: corsHeaders });
  if (choice.finish_reason !== "length") {
    console.error("Law Nanban Groq returned an unsupported finish reason", { model, finishReason: choice.finish_reason });
    return reply(502, "The AI service could not complete this response. Please try again.", "AI_INVALID_RESPONSE");
  }

  const remainingMs = requestDeadline - Date.now();
  if (remainingMs <= 0) return responseIncomplete("Overall request time budget was exhausted before continuation.", model);
  const continuationTimeoutMs = Math.min(GROQ_REQUEST_TIMEOUT_MS, remainingMs);
  const continuationController = new AbortController();
  const continuationTimeout = setTimeout(() => continuationController.abort(), continuationTimeoutMs);
  try {
    const continuationMessages = [
      ...messages,
      { role: "assistant", content: answer },
      { role: "user", content: "Continue the answer from exactly where it ended. Do not repeat, summarize, or restate any previous text or headings. Complete the current sentence if it was cut off, then continue the remaining answer and its legal disclaimer in the same language and format." },
    ];
    const continuationResponse = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: continuationController.signal,
      body: JSON.stringify({
        model,
        messages: continuationMessages,
        temperature: 0.2,
        max_completion_tokens: GROQ_CONTINUATION_MAX_COMPLETION_TOKENS,
        reasoning_effort: "low",
        stream: false,
      }),
    });
    const continuationElapsedMs = Date.now() - (requestDeadline - GROQ_TOTAL_REQUEST_BUDGET_MS);
    if (!continuationResponse.ok) {
      const detail = await readGroqErrorDetail(continuationResponse);
      console.warn("Law Nanban Groq continuation HTTP error", { status: continuationResponse.status, elapsedMs: continuationElapsedMs, model, detail });
      if (continuationResponse.status === 401 || continuationResponse.status === 403) return mapGroqError(continuationResponse.status, detail, model, continuationElapsedMs);
      return responseIncomplete(`Continuation request failed with HTTP ${continuationResponse.status}.`, model, continuationElapsedMs);
    }

    let continuationData: GroqCompletionResponse;
    try {
      continuationData = await continuationResponse.json() as GroqCompletionResponse;
    } catch {
      if (continuationController.signal.aborted) {
        return responseIncomplete("Continuation response timed out.", model, continuationElapsedMs);
      }
      return responseIncomplete("Continuation response was not valid JSON.", model, continuationElapsedMs);
    }
    const continuationChoice = continuationData?.choices?.[0];
    const continuationText = typeof continuationChoice?.message?.content === "string" ? continuationChoice.message.content.trim() : "";
    if (!continuationText || continuationChoice?.finish_reason !== "stop") {
      return responseIncomplete(`Continuation finish reason: ${String(continuationChoice?.finish_reason ?? "missing")}.`, model, continuationElapsedMs);
    }
    return Response.json({ answer: appendWithoutRepeatedOverlap(answer, continuationText) }, { headers: corsHeaders });
  } catch (error) {
    const failure = continuationController.signal.aborted ? "timeout" : "network";
    const detail = error instanceof Error ? sanitizeProviderDetail(`${error.name}: ${error.message}`) : "Unknown continuation error";
    console.error("Law Nanban Groq continuation failed", { failure, elapsedMs: Date.now() - (requestDeadline - GROQ_TOTAL_REQUEST_BUDGET_MS), timeoutMs: continuationTimeoutMs, detail });
    return responseIncomplete(`Continuation ${failure}.`, model);
  } finally {
    clearTimeout(continuationTimeout);
  }
});

type GroqCompletionResponse = {
  error?: { status?: string; message?: string; code?: string; type?: string };
  choices?: Array<{ finish_reason?: unknown; message?: { content?: unknown } }>;
};

async function readGroqErrorDetail(response: Response) {
  try {
    const data = await response.clone().json() as { error?: { message?: unknown; code?: unknown; type?: unknown } };
    return sanitizeProviderDetail([data.error?.message, data.error?.code, data.error?.type]
      .filter((part): part is string => typeof part === "string").join(" | ") || "No error detail");
  } catch {
    return "Non-JSON upstream error";
  }
}

function responseIncomplete(detail: string, model: string, elapsedMs?: number) {
  console.warn("Law Nanban Groq response incomplete", { model, ...(elapsedMs !== undefined ? { elapsedMs } : {}), detail: sanitizeProviderDetail(detail) });
  return reply(502, "The AI response was cut off and could not be completed. Please retry with a shorter question.", "AI_RESPONSE_INCOMPLETE");
}

function appendWithoutRepeatedOverlap(answer: string, continuation: string) {
  const maxOverlap = Math.min(answer.length, continuation.length, 2_000);
  for (let overlap = maxOverlap; overlap >= 32; overlap -= 1) {
    if (answer.slice(-overlap) === continuation.slice(0, overlap)) {
      return `${answer}${continuation.slice(overlap)}`.trim();
    }
  }
  return `${answer}\n\n${continuation}`.trim();
}

function mapGroqError(status: number, rawDetail: string, model?: string, elapsedMs?: number) {
  const detail = sanitizeProviderDetail(rawDetail || "No error detail");
  console.error("Law Nanban Groq API returned an error", { status, ...(model ? { model } : {}), ...(elapsedMs !== undefined ? { elapsedMs } : {}), detail });
  if (status === 401 || status === 403) return reply(502, "The AI service credentials need attention. Please try again later.", "AI_AUTH");
  if (status === 429) return reply(503, "The AI service is busy. Please try again shortly.", "AI_RATE_LIMIT");
  if (status >= 500 && status <= 599) return reply(502, "The AI service is temporarily unavailable. Please try again.", "AI_UPSTREAM");
  if (status === 404) return reply(502, "The configured AI model is unavailable. Please check GROQ_MODEL.", "AI_MODEL_UNAVAILABLE");
  return reply(502, "The AI service rejected this request.", "AI_REQUEST_REJECTED");
}
