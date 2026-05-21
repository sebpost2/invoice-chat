"use client"

import { useChat } from "@ai-sdk/react"
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai"
import { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

const SUGGESTIONS = [
  "¿Cuánto gasté en total?",
  "¿Quién es mi proveedor más frecuente?",
  "Dame el detalle de la boleta más cara",
  "¿Cuánto IGV pagué?",
]

const TOOL_LABELS: Record<string, string> = {
  list_receipts: "list_receipts",
  query_aggregates: "query_aggregates",
  get_receipt_detail: "get_receipt_detail",
}

const EXTRACTOR_URL = "https://invoice-extractor-gules.vercel.app"

function collectReceiptIds(value: unknown, into: Set<string>): void {
  if (!value) return
  if (Array.isArray(value)) {
    for (const item of value) collectReceiptIds(item, into)
    return
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>
    if (typeof obj.id === "string" && /^cm[a-z0-9]{20,}$/i.test(obj.id)) {
      into.add(obj.id)
    }
  }
}

type Sources =
  | { kind: "specific"; ids: string[] }
  | { kind: "scope"; count: number }
  | { kind: "none" }

function sourcesFor(message: UIMessage): Sources {
  const specific = new Set<string>()
  let scopeCount = 0

  for (const part of message.parts) {
    if (!part.type.startsWith("tool-")) continue
    const p = part as { type: string; state?: string; output?: unknown }
    if (p.state !== "output-available") continue

    if (p.type === "tool-get_receipt_detail") {
      collectReceiptIds(p.output, specific)
    } else if (p.type === "tool-list_receipts" && Array.isArray(p.output)) {
      scopeCount = Math.max(scopeCount, p.output.length)
    }
  }

  if (specific.size > 0) {
    return { kind: "specific", ids: Array.from(specific) }
  }
  if (scopeCount > 0) {
    return { kind: "scope", count: scopeCount }
  }
  return { kind: "none" }
}

function shortId(id: string): string {
  return id.slice(-6)
}

function MarkdownBody({ text }: { text: string }) {
  return (
    <div className="text-sm leading-relaxed [&_p]:my-1.5 [&_ul]:my-1.5 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:my-1.5 [&_ol]:pl-5 [&_ol]:list-decimal [&_li]:my-0.5 [&_strong]:font-semibold [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-zinc-800/60 [&_table]:my-2 [&_table]:text-xs [&_th]:font-semibold [&_th]:px-2 [&_th]:py-1 [&_th]:border-b [&_th]:border-zinc-700 [&_td]:px-2 [&_td]:py-1 [&_td]:border-b [&_td]:border-zinc-800">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  )
}

type ToolPart = {
  type: string
  toolCallId?: string
  state?: string
  input?: unknown
  output?: unknown
  errorText?: string
}

function ToolDetail({ part }: { part: ToolPart }) {
  const toolName = part.type.slice("tool-".length)
  const label = TOOL_LABELS[toolName] ?? toolName
  const state = part.state
  const isDone = state === "output-available"
  const isError = state === "output-error"
  const isPending = state === "input-streaming" || state === "input-available"

  return (
    <details className="group rounded-md border border-zinc-800 bg-zinc-950/60 text-xs overflow-hidden">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-zinc-900 select-none list-none [&::-webkit-details-marker]:hidden">
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          tool
        </span>
        <span className="font-mono text-zinc-300">{label}</span>
        {isDone && <span className="text-emerald-500">✓</span>}
        {isError && <span className="text-red-500">✗</span>}
        {isPending && <span className="text-zinc-500 animate-pulse">…</span>}
        <span className="ml-auto text-zinc-600 text-[10px] group-open:hidden">
          ver detalles
        </span>
        <span className="ml-auto text-zinc-600 text-[10px] hidden group-open:inline">
          ocultar
        </span>
      </summary>
      <div className="border-t border-zinc-800 px-3 py-2 space-y-2 font-mono text-[11px] text-zinc-400">
        {part.input != null && (
          <div>
            <div className="text-zinc-500 mb-0.5">input</div>
            <pre className="whitespace-pre-wrap break-words text-zinc-300">
              {JSON.stringify(part.input, null, 2)}
            </pre>
          </div>
        )}
        {isDone && (
          <div>
            <div className="text-zinc-500 mb-0.5">output</div>
            <pre className="whitespace-pre-wrap break-words text-zinc-300 max-h-72 overflow-auto">
              {JSON.stringify(part.output, null, 2)}
            </pre>
          </div>
        )}
        {isError && (
          <div className="text-red-400">{part.errorText ?? "Error"}</div>
        )}
      </div>
    </details>
  )
}

export default function Page() {
  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  })
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, status])

  const busy = status === "submitted" || status === "streaming"

  function submit(text: string) {
    if (!text.trim() || busy) return
    sendMessage({ text })
    setInput("")
  }

  return (
    <div className="flex flex-1 w-full max-w-3xl mx-auto flex-col px-4 sm:px-6">
      <header className="pt-6 sm:pt-8 pb-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            Invoice Chat
          </h1>
          <p className="text-xs text-zinc-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Agente con tool use sobre 13 boletas demo</span>
            <span className="text-zinc-700 hidden sm:inline">·</span>
            <span className="font-mono">Groq · gpt-oss-120b</span>
            <span className="text-zinc-700 hidden sm:inline">·</span>
            <span className="font-mono">Neon Postgres</span>
          </p>
        </div>
        <a
          href={EXTRACTOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          ← Invoice Extractor
        </a>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-6 space-y-4 min-h-0"
      >
        {messages.length === 0 && (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-zinc-300 font-medium mb-1">
                Pregúntame sobre tus boletas
              </p>
              <p className="text-xs text-zinc-500">
                El agente decide qué herramienta SQL llamar
                (<span className="font-mono">list_receipts</span>,{" "}
                <span className="font-mono">query_aggregates</span>,{" "}
                <span className="font-mono">get_receipt_detail</span>) y
                responde con la data real. Haz click en cada chip{" "}
                <span className="font-mono">tool</span> para ver el input y
                output exactos.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  disabled={busy}
                  className="px-3 py-1.5 rounded-full border border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:bg-zinc-900 transition-colors disabled:opacity-50 text-xs"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const sources: Sources =
            m.role === "assistant" ? sourcesFor(m) : { kind: "none" }
          return (
            <div
              key={m.id}
              className={
                m.role === "user" ? "flex justify-end" : "flex justify-start"
              }
            >
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-sm bg-zinc-100 text-zinc-900 px-4 py-2.5 text-sm whitespace-pre-wrap"
                    : "max-w-[90%] w-full space-y-2 text-zinc-100"
                }
              >
                {m.parts.map((part, idx) => {
                  if (part.type === "text") {
                    return m.role === "user" ? (
                      <div key={idx} className="whitespace-pre-wrap">
                        {part.text}
                      </div>
                    ) : (
                      <MarkdownBody key={idx} text={part.text} />
                    )
                  }
                  if (part.type === "step-start") {
                    return idx > 0 ? (
                      <hr
                        key={idx}
                        className="border-zinc-800 my-2"
                        aria-hidden
                      />
                    ) : null
                  }
                  if (part.type.startsWith("tool-")) {
                    return (
                      <ToolDetail key={idx} part={part as ToolPart} />
                    )
                  }
                  return null
                })}
                {sources.kind === "specific" && (
                  <div className="pt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                    <span className="text-zinc-600">📎 Fuentes:</span>
                    {sources.ids.map((id) => (
                      <span
                        key={id}
                        title={id}
                        className="font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400"
                      >
                        {shortId(id)}
                      </span>
                    ))}
                  </div>
                )}
                {sources.kind === "scope" && (
                  <div className="pt-2 text-[11px] text-zinc-600">
                    📎 Basado en {sources.count} boleta
                    {sources.count === 1 ? "" : "s"}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {error && (
          <div className="rounded-md border border-red-900/40 bg-red-950/30 text-red-300 text-sm px-3 py-2">
            {error.message || "Ocurrió un error. Intenta de nuevo."}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(input)
        }}
        className="pb-6 pt-2 border-t border-zinc-800 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta sobre tus boletas..."
          className="flex-1 px-4 py-2.5 rounded-full border border-zinc-800 bg-zinc-950 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-zinc-700"
          disabled={busy}
        />
        {busy ? (
          <button
            type="button"
            onClick={() => stop()}
            className="px-5 py-2.5 rounded-full bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-zinc-200"
          >
            Detener
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-5 py-2.5 rounded-full bg-zinc-100 text-zinc-900 text-sm font-medium disabled:opacity-30 hover:bg-zinc-200"
          >
            Enviar
          </button>
        )}
      </form>
    </div>
  )
}
