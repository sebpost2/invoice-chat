**[English](README.md) · [Español](README.es.md)**

---

# Invoice Chat

[![ci](https://github.com/sebpost2/invoice-chat/actions/workflows/ci.yml/badge.svg)](https://github.com/sebpost2/invoice-chat/actions/workflows/ci.yml)

Conversational agent that answers in natural language about Peruvian receipts and invoices. Showcases **real tool use**: the LLM decides which SQL tool to call (`list_receipts`, `query_aggregates`, `get_receipt_detail`), executes it against Neon Postgres, and responds with verifiable data. Reuses the same database as [Invoice Extractor](https://github.com/sebpost2/invoice-extractor) — extract first, then analyze.

Author: [sebpost2](https://github.com/sebpost2)

**[Live demo](https://invoice-chat-zeta.vercel.app)** · No sign-up · 13 demo receipts preloaded

---

## Highlights

- **Multi-step reasoning agent**: the model can chain up to 5 steps. For "details of the most expensive receipt" it calls `list_receipts({orderBy: "total_desc"})` → grabs the first id → `get_receipt_detail({id})` → writes the answer.
- **Zod-typed tools**: each tool declares its schema (`z.enum`, `z.string`), the AI SDK validates inputs before execution, and TypeScript infers the types on the server.
- **Token-by-token streaming** of the final answer via Vercel AI SDK v6 (`streamText` + `useChat`).
- **Agent transparency**: every tool call is a collapsible `<details>` component showing the exact `input` and `output` JSON. Visitors see what the model queried, not just what it said.
- **Data-driven citations**: if the answer comes from a specific `get_receipt_detail`, the receipt id is shown. If it comes from a list/aggregate, the scope is shown ("Based on N receipts"). No fabricated references.
- **Real Markdown** in answers (bullets, tables, emphasis) rendered with `react-markdown` + GFM.
- **Per-IP rate limit** (in-memory token bucket, 10 messages/hour) — protects the free Groq quota from casual bots and shows a friendly message on limit hit.
- **Synthetic demo data**: 10 receipts seeded via `npm run seed` (Tottus, Pardos, Sodimac, Inkafarma, etc.) plus the 3 real ones from the extractor — 13 receipts total for substantial questions.
- **Tool-selection evals with [Promptfoo](https://promptfoo.dev)**: 22 cases under [`evals/`](./evals) lock down the agent's behavior — single-step routing (ES + EN), multi-step `list → detail` chains, and no-tool refusal for greetings/off-topic. Run with `npm run eval`. A pre-eval guard verifies the duplicated prompt copy hasn't drifted from `src/lib/chat-prompts.ts`.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (dark-first) |
| LLM SDK | Vercel AI SDK v6 (`ai`, `@ai-sdk/groq`, `@ai-sdk/react`) |
| Model | OpenAI gpt-oss-120b via Groq |
| Database | PostgreSQL (Neon, serverless) — shared with the extractor |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Validation | Zod 4 |
| Markdown | `react-markdown` + `remark-gfm` |
| Rate limit | In-memory token bucket |
| LLM evals | Promptfoo (OSS) — 22 tool-selection cases under `evals/` |
| Deploy | Vercel |

## How it works

```
┌──────────┐  sendMessage   ┌────────────────┐    streamText    ┌──────┐
│  Client  │ ─────────────> │  /api/chat     │ ───────────────> │ Groq │
│ useChat  │                │ (route handler)│  + tools (Zod)   │ LLM  │
└────┬─────┘                └────────┬───────┘                  └───┬──┘
     │                               │                              │
     │       UIMessageStream         │                              │
     │ <─────────────────────────────┤  ┌────────┐  tool call       │
     │ • text-delta                  │  │ Neon   │ <────────────────┤
     │ • tool-input-streaming        │  │ DB     │                  │
     │ • tool-output-available       │  └────────┘  tool result ────┤
     │ • text-end                    │                              │
     │                               │  ... until stepCountIs(5)    │
```

1. The client sends a message via `useChat({ transport: DefaultChatTransport })`.
2. The route handler checks per-IP rate limit. If allowed, it calls `streamText` with the 3 tools and the Groq model.
3. The model picks a tool and emits tool-call parts. The AI SDK runs the matching `execute` (Prisma query) and feeds the result back to the model.
4. The model can make further tool calls in subsequent steps (`stopWhen: stepCountIs(5)`) or write the final answer.
5. The entire conversation reaches the client as a stream of typed parts rendered in order.

## The three tools

| Tool | Input | Output | When the model picks it |
|---|---|---|---|
| `list_receipts` | `orderBy: "date_desc" \| "date_asc" \| "total_desc" \| "total_asc"` | Array of receipts with summary fields | "Show me my receipts", "which was the most expensive?" |
| `query_aggregates` | `metric: "total_spent" \| "total_igv" \| "total_subtotal" \| "count" \| "all"` | Per-currency aggregates | "How much did I spend?", "How many receipts?", "How much VAT?" |
| `get_receipt_detail` | `id: string` | Full receipt with items | "Give me the details of [id]", final step after identifying a receipt via a list |

## Design decisions

- **DB shared with the extractor** (`sessionId = "__demo__"`): telling a story ("extract first, then analyze") is a stronger portfolio signal than two disconnected silos.
- **No embeddings, no vector DB**: the data is structured SQL. Tool use with SQL is more accurate, faster, and more explainable than RAG over the same data.
- **No thread persistence**: each refresh starts a new conversation. Stateless per message. The demo is meant to showcase the agent, not build a ChatGPT clone.
- **Model: `openai/gpt-oss-120b`** over `llama-3.3-70b`: Llama has a reproducible bug where it sends `input: null` to tools without parameters and Groq rejects with `Failed to call a function`. gpt-oss-120b builds valid tool calls consistently.
- **Required parameters on every tool** (no empty `z.object({})`): forces the model to make a real decision (sort, metric), not produce an empty object. As a bonus it enriches the conversation.
- **Citations only from `get_receipt_detail`**: when the model calls `list_receipts` it gets N rows; treating all N as "sources" would be noise. Only specific lookups count as references.

## Tool-selection evals

Each test feeds the model a user message and asserts on a deterministic string from a small custom Promptfoo provider:

- `TOOL:<name> ARGS:<json>` — model called that tool with those arguments
- `TEXT:<content>` — model answered directly

```bash
GROQ_API_KEY=gsk_... npm run eval
```

That runs (1) a sync guard that fails if the system prompts duplicated in the eval provider have drifted from `src/lib/chat-prompts.ts`, then (2) the Promptfoo suite. The 22 cases cover single-step routing in ES + EN, multi-step `list → detail` chains, and no-tool refusal for greetings / off-topic. Full pass uses ~25 Groq calls, well inside the free tier. See [`evals/README.md`](./evals/README.md) for the rationale, the file layout, and what the suite intentionally does *not* check.

## Running locally

### Requirements

- Node.js 20.9+
- Postgres DB with the extractor schema applied ([Neon](https://neon.tech) free tier)
- Free [Groq](https://console.groq.com) API key

### Setup

```bash
git clone https://github.com/<your-user>/invoice-chat
cd invoice-chat
npm install
```

Create `.env`:

```env
DATABASE_URL="postgresql://user:password@host/db?sslmode=verify-full"
GROQ_API_KEY="gsk_..."
```

Make sure the DB has the extractor schema (`Receipt` table). If not:

```bash
npx prisma db push
```

Seed the 10 synthetic demo receipts:

```bash
npm run seed
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string — Neon (same one as the extractor) |
| `GROQ_API_KEY` | Groq API key for gpt-oss-120b |

## Project structure

```
├── src/
│   ├── app/
│   │   ├── api/chat/route.ts   # Route handler: streamText + rate limit (orchestration only)
│   │   ├── layout.tsx          # Forced dark mode, metadata
│   │   └── page.tsx            # UI: useChat + tool details + citations + markdown
│   └── lib/
│       ├── chat-config.ts      # chatTools (Zod schemas + Prisma execute impls)
│       ├── chat-prompts.ts     # SYSTEM_PROMPT_EN/ES (canonical source for live + evals)
│       ├── prisma.ts           # Prisma client with Neon adapter
│       └── ratelimit.ts        # Per-IP in-memory token bucket
├── evals/
│   ├── promptfoo.config.yaml   # Provider + test file references
│   ├── groq-tool-provider.mjs  # Custom provider → deterministic TOOL:/TEXT: output
│   ├── verify-prompts-sync.mjs # Pre-eval guard: fails if prompt copy drifts
│   └── tests/                  # 22 cases: tool-selection, multi-step, refusal
├── prisma/
│   └── schema.prisma           # Receipt model (shared with the extractor)
└── scripts/
    └── seed-chat-demo.ts       # 10 synthetic receipts (Tottus, Pardos, Sodimac…)
```

## Known limitations

- **In-memory rate limit**: each Vercel serverless function has its own counter. If Vercel scales to multiple instances under heavy traffic, the effective limit is per-instance-per-IP. Fine for a personal portfolio; migrate to Upstash Redis if it ever matters.
- **Conversation does not persist**: refresh = new chat. Showcasing the agent matters more than history.
- **The model may not pick the ideal tool**: for ambiguous prompts it occasionally calls a sub-optimal tool. The system prompt mitigates, doesn't eliminate.

---

Built by [sebpost2](https://github.com/sebpost2) to showcase AI agents with real tool use, multi-step reasoning, and a modern stack (Vercel AI SDK + Next 16).
