export type Lang = "en" | "es";

export const LANG_COOKIE = "lang";

const enDict = {
  meta: {
    title: "Invoice Chat — Ask about your receipts",
    description:
      "Conversational agent answering in natural language about Peruvian receipts, using SQL tools over Neon Postgres and Groq.",
  },
  header: {
    subtitle: "Agent with tool use over 13 demo receipts",
    extractorLink: "← Invoice Extractor",
  },
  intro: {
    title: "Ask me about your receipts",
    body: (
      <>
        The agent decides which SQL tool to call (
        <span className="font-mono">list_receipts</span>,{" "}
        <span className="font-mono">query_aggregates</span>,{" "}
        <span className="font-mono">get_receipt_detail</span>) and answers
        with real data. Click each <span className="font-mono">tool</span>{" "}
        chip to see the exact input and output.
      </>
    ),
    suggestions: [
      "How much did I spend in total?",
      "Who's my most frequent vendor?",
      "Give me the details of the most expensive receipt",
      "How much VAT did I pay?",
    ],
  },
  tool: {
    chipLabel: "tool",
    seeDetails: "view details",
    hide: "hide",
    input: "input",
    output: "output",
    errorFallback: "Error",
  },
  sources: {
    sourcesLabel: "📎 Sources:",
    scope: (n: number) => `📎 Based on ${n} receipt${n === 1 ? "" : "s"}`,
  },
  input: {
    placeholder: "Ask about your receipts...",
    send: "Send",
    stop: "Stop",
    genericError: "Something went wrong. Try again.",
  },
  toggle: { aria: "Switch language" },
};

export type Dict = typeof enDict;

const esDict: Dict = {
  meta: {
    title: "Invoice Chat — Pregunta sobre tus boletas",
    description:
      "Agente conversacional que responde en lenguaje natural sobre boletas peruanas, usando herramientas SQL sobre Neon Postgres y Groq.",
  },
  header: {
    subtitle: "Agente con tool use sobre 13 boletas demo",
    extractorLink: "← Invoice Extractor",
  },
  intro: {
    title: "Pregúntame sobre tus boletas",
    body: (
      <>
        El agente decide qué herramienta SQL llamar (
        <span className="font-mono">list_receipts</span>,{" "}
        <span className="font-mono">query_aggregates</span>,{" "}
        <span className="font-mono">get_receipt_detail</span>) y responde
        con la data real. Haz click en cada{" "}
        <span className="font-mono">tool</span> para ver el input y output
        exactos.
      </>
    ),
    suggestions: [
      "¿Cuánto gasté en total?",
      "¿Quién es mi proveedor más frecuente?",
      "Dame el detalle de la boleta más cara",
      "¿Cuánto IGV pagué?",
    ],
  },
  tool: {
    chipLabel: "tool",
    seeDetails: "ver detalles",
    hide: "ocultar",
    input: "input",
    output: "output",
    errorFallback: "Error",
  },
  sources: {
    sourcesLabel: "📎 Fuentes:",
    scope: (n: number) => `📎 Basado en ${n} boleta${n === 1 ? "" : "s"}`,
  },
  input: {
    placeholder: "Pregunta sobre tus boletas...",
    send: "Enviar",
    stop: "Detener",
    genericError: "Ocurrió un error. Intenta de nuevo.",
  },
  toggle: { aria: "Cambiar idioma" },
};

export const dicts: Record<Lang, Dict> = { en: enDict, es: esDict };
