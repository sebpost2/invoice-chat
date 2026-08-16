/**
 * Custom Promptfoo provider that calls Groq with the same tools the live
 * chat exposes and returns a deterministic string describing the model's
 * tool-selection decision. Assertions in the test YAML check that string.
 *
 * Output format:
 *   TOOL:<tool_name> ARGS:<json args>      // when the model called a tool
 *   TEXT:<assistant content>                // when the model answered directly
 *
 * The system prompts below are copies of src/lib/chat-prompts.ts. A small
 * `verify-prompts-sync.mjs` script runs before `promptfoo eval` (wired in
 * package.json) and fails the eval if they drift. Tool schemas mirror
 * src/lib/chat-config.ts `chatTools` in OpenAI JSON Schema form; keep in
 * sync when the live tool schemas change.
 */

// --- prompts (synced with src/lib/chat-prompts.ts) ---

export const SYSTEM_PROMPT_EN = `You are a financial assistant that answers questions about the user's Peruvian receipts and invoices.

You have four tools to query the database:
- list_receipts: lists available receipts (id, vendor, type, number, date, total).
- query_aggregates: returns totals aggregated by currency (spending, VAT, count).
- get_receipt_detail: returns the full detail of a receipt by id, including its items.
- spending_by_category: returns total spending grouped by category and currency, sorted highest first.

Rules:
- Always respond in English, briefly and to the point.
- Use the tools instead of making up data. If you don't have the data, call the corresponding tool.
- If the user asks for "the details" without specifying which, call list_receipts first and offer the options.
- If the user asks how to reduce, optimize, or improve their spending, call spending_by_category first and name the actual top category (and the dominant vendor within it, if one stands out) — never give generic advice.
- Format amounts as "S/ 12.34" (or "USD 12.34" if the currency is not PEN).
- When showing lists or items, use Markdown bullets.`;

export const SYSTEM_PROMPT_ES = `Eres un asistente financiero que responde preguntas sobre las boletas y facturas peruanas del usuario.

Tienes cuatro herramientas para consultar la base de datos:
- list_receipts: lista las boletas disponibles (id, proveedor, tipo, número, fecha, total).
- query_aggregates: devuelve totales agregados por moneda (cuánto se gastó, cuánto IGV, conteo).
- get_receipt_detail: devuelve el detalle completo de una boleta por id, incluyendo sus ítems.
- spending_by_category: devuelve el gasto total agrupado por categoría y moneda, de mayor a menor.

Reglas:
- Responde siempre en español, breve y al grano.
- Usa las herramientas en lugar de inventar datos. Si no tienes los datos, llama a la herramienta correspondiente.
- Si el usuario pide "el detalle" sin precisar cuál, llama primero a list_receipts y dale las opciones.
- Si el usuario pregunta cómo reducir, optimizar o mejorar su gasto, llama primero a spending_by_category y nombra la categoría principal real (y el proveedor dominante dentro de ella, si hay uno) — nunca des consejos genéricos.
- Formatea los montos como "S/ 12.34" (o "USD 12.34" si la moneda no es PEN).
- Cuando muestres listas o ítems, usa bullets markdown.`;

// --- tools (OpenAI function-calling format) ---

const TOOLS = [
  {
    type: "function",
    function: {
      name: "list_receipts",
      description:
        "Lists the available receipts/invoices with their summary fields (id, vendor, type, number, date, total). Use it when the user asks to see their receipts or when you need to find a receipt id before querying its detail.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["orderBy"],
        properties: {
          orderBy: {
            type: "string",
            enum: ["date_desc", "date_asc", "total_desc", "total_asc"],
            description:
              "List order: 'date_desc' (most recent first, default), 'date_asc' (oldest first), 'total_desc' (most expensive first), 'total_asc' (cheapest first).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_aggregates",
      description:
        "Returns aggregate metrics by currency. Use it to answer how much the user spent, how much VAT they paid, how many receipts they have, or everything at once.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["metric"],
        properties: {
          metric: {
            type: "string",
            enum: ["total_spent", "total_igv", "total_subtotal", "count", "all"],
            description:
              "Which metric to compute: 'total_spent' (total spending), 'total_igv' (VAT total), 'total_subtotal', 'count' (how many receipts), or 'all' for all of them.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_receipt_detail",
      description:
        "Returns the full detail of a receipt by id, including the items (description, quantity, unit price, total). If you don't know the id, call list_receipts first.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["id"],
        properties: {
          id: {
            type: "string",
            description: "The id (cuid) of the receipt to fetch.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "spending_by_category",
      description:
        "Returns total spending grouped by category (groceries, dining, home, health, shopping, other) and currency, sorted highest first. Use this whenever the user asks how to reduce, optimize, or improve their spending — ground the answer in this data instead of generic advice.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: [],
        properties: {},
      },
    },
  },
];

const MODEL = "openai/gpt-oss-120b";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

async function callGroq(systemPrompt, userMessage, apiKey) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      tools: TOOLS,
      tool_choice: "auto",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq ${res.status}: ${text}`);
  }
  return await res.json();
}

class GroqToolProvider {
  id() {
    return `groq:${MODEL}:tool-select`;
  }

  async callApi(_prompt, context) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY env var is required");
    }
    const lang = context.vars.lang ?? "es";
    const system = lang === "es" ? SYSTEM_PROMPT_ES : SYSTEM_PROMPT_EN;
    const message = context.vars.message;

    const response = await callGroq(system, message, apiKey);
    const choice = response.choices?.[0]?.message;

    const tokenUsage = response.usage
      ? {
          total: response.usage.total_tokens,
          prompt: response.usage.prompt_tokens,
          completion: response.usage.completion_tokens,
        }
      : undefined;

    const toolCall = choice?.tool_calls?.[0];
    if (toolCall) {
      return {
        output: `TOOL:${toolCall.function.name} ARGS:${toolCall.function.arguments}`,
        tokenUsage,
      };
    }
    return {
      output: `TEXT:${choice?.content ?? ""}`,
      tokenUsage,
    };
  }
}

export default GroqToolProvider;
