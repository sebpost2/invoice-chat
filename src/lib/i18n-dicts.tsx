export type Lang = "en" | "es";

export const LANG_COOKIE = "lang";

const enDict = {
  meta: {
    title: "Invoice Chat — Ask about your receipts",
    description:
      "Ask about your receipts in plain English and get real answers — no dashboard, no filters to learn.",
  },
  header: {
    subtitle: "Ask in plain English — 13 demo receipts loaded",
    extractorLink: "← Invoice Extractor",
  },
  intro: {
    title: "Ask me about your receipts",
    body: (
      <>
        No dashboard, no filters to learn — just ask like you&apos;d ask a
        person, and get an answer backed by your real numbers. Curious how
        it works? Click any{" "}
        <span className="font-mono">tool</span> tag under an answer to see
        the exact database query it ran.
      </>
    ),
    suggestions: [
      "How much did I spend in total?",
      "Who's my most frequent vendor?",
      "Give me the details of the most expensive receipt",
      "How much VAT did I pay?",
      "Where can I cut costs?",
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
      "Pregunta sobre tus boletas en lenguaje natural y recibe respuestas reales — sin dashboard, sin filtros que aprender.",
  },
  header: {
    subtitle: "Pregunta en lenguaje natural — 13 boletas demo cargadas",
    extractorLink: "← Invoice Extractor",
  },
  intro: {
    title: "Pregúntame sobre tus boletas",
    body: (
      <>
        Sin dashboard, sin filtros que aprender — pregunta como le
        preguntarías a una persona, y recibe una respuesta con tus datos
        reales. ¿Curioso de cómo funciona? Haz click en cualquier etiqueta{" "}
        <span className="font-mono">tool</span> bajo una respuesta para ver
        la consulta exacta que corrió.
      </>
    ),
    suggestions: [
      "¿Cuánto gasté en total?",
      "¿Quién es mi proveedor más frecuente?",
      "Dame el detalle de la boleta más cara",
      "¿Cuánto IGV pagué?",
      "¿Dónde puedo recortar gastos?",
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
