import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  type UIMessage,
} from "ai";
import { groq } from "@ai-sdk/groq";
import { cookies } from "next/headers";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { LANG_COOKIE } from "@/lib/i18n-dicts";
import {
  chatTools,
  SYSTEM_PROMPT_EN,
  SYSTEM_PROMPT_ES,
} from "@/lib/chat-config";

export const maxDuration = 30;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = checkRateLimit(ip);

  const c = await cookies();
  const langCookie = c.get(LANG_COOKIE)?.value;
  const lang: "en" | "es" =
    langCookie === "es" || langCookie === "en" ? langCookie : "es";

  if (!rl.allowed) {
    const minutes = Math.max(1, Math.ceil(rl.retryAfterSec / 60));
    const errorMsg =
      lang === "es"
        ? `Demo en alto tráfico — intenta de nuevo en ~${minutes} min. (límite: 10 mensajes/hora por IP)`
        : `Demo under heavy traffic — try again in ~${minutes} min. (limit: 10 messages/hour per IP)`;
    return Response.json(
      { error: errorMsg },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  let messages: UIMessage[];
  try {
    ({ messages } = await req.json());
    if (!Array.isArray(messages)) throw new Error("messages is not an array");
  } catch {
    const errorMsg =
      lang === "es" ? "Cuerpo de solicitud inválido." : "Invalid request body.";
    return Response.json({ error: errorMsg }, { status: 400 });
  }

  const result = streamText({
    model: groq("openai/gpt-oss-120b"),
    system: lang === "es" ? SYSTEM_PROMPT_ES : SYSTEM_PROMPT_EN,
    messages: await convertToModelMessages(messages),
    tools: chatTools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error("[/api/chat] streamText error:", error);
      return lang === "es"
        ? "Ocurrió un error procesando la consulta."
        : "Something went wrong processing the query.";
    },
  });
}
