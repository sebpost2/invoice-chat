# Evals — invoice-chat tool selection

LLM tool selection is non-deterministic. This suite locks down the behavior that matters most for this app: **given a user message, does the model pick the right tool with the right arguments?** If the model regresses (or a prompt edit changes its decisions), the eval catches it before users do.

Built on [Promptfoo](https://promptfoo.dev) (open source, MIT). Runs against Groq's free tier — a full pass uses ~25 calls (~200 prompt + ~50 completion tokens each), well inside the 6000 TPM limit.

## Run

```bash
GROQ_API_KEY=gsk_... npm run eval
```

That runs two steps:

1. **`evals/verify-prompts-sync.mjs`** — parses `SYSTEM_PROMPT_EN/ES` from both `src/lib/chat-prompts.ts` (canonical) and `evals/groq-tool-provider.mjs` (duplicate for ESM-loadable eval suite). Exits non-zero with a diff if they drift.
2. **`promptfoo eval -c evals/promptfoo.config.yaml`** — runs all test cases in `evals/tests/` against Groq and asserts on the model's tool-selection decision.

Then optionally:

```bash
npm run eval:view   # opens the Promptfoo UI with the latest results
```

## What this checks

Each test feeds the model a user message and asserts on a deterministic output string from the custom provider:

- `TOOL:<name> ARGS:<json>` — when the model emitted a tool call
- `TEXT:<content>` — when it answered directly

| File | What it tests | # cases |
|---|---|---|
| [`tests/tool-selection.yaml`](./tests/tool-selection.yaml) | Single-step routing: each message → exactly one expected tool with exact args. ES + EN equivalence. | 12 |
| [`tests/multi-step.yaml`](./tests/multi-step.yaml) | Chained reasoning: prompts that require `list_receipts` first as the entry point of a multi-step plan. | 5 |
| [`tests/refusal.yaml`](./tests/refusal.yaml) | Greetings, meta questions, off-topic — should answer with text, never waste a tool call. | 5 |

## What this does NOT check

- **Tool execution.** The Prisma queries in `src/lib/chat-config.ts` are deterministic and tested by manual + Vercel preview testing, not by LLM evals. Forcing the model to pick the right tool is the hard part; the SQL behind it is straightforward.
- **Streaming, rate limit, markdown rendering.** Those are integration concerns covered by the dev environment and the live demo.
- **Multi-turn dialogue state.** The chat is stateless per message by design; evals match that single-turn shape.

## Why a custom provider

Promptfoo's built-in OpenAI provider supports tools, but the assertion surface for tool calls is awkward — the output shape varies by provider and the `is-valid-function-call` family doesn't cover argument equality. Wrapping Groq in a tiny custom provider that returns a predictable `TOOL:<name> ARGS:<json>` string lets every test express its expectation with a one-line `contains` + `contains-json` pair, which is easy to read in a PR diff.

The provider is ~120 lines of plain JavaScript with zero runtime deps beyond `fetch`, by design — keeps the moving parts auditable.

## Editing the prompts or tools

- **System prompts** live in `src/lib/chat-prompts.ts` (canonical source for the live app + evals). The eval provider mirrors them; if you edit the canonical file without updating `evals/groq-tool-provider.mjs`, the `verify-prompts-sync.mjs` step fails with a diff and tells you exactly what to copy over.
- **Tool schemas** live in `src/lib/chat-config.ts` (Zod, with Prisma `execute` impls) and are mirrored in `evals/groq-tool-provider.mjs` (OpenAI JSON Schema form). There's no auto-sync for these — they change rarely (currently 3 tools). The `evals/groq-tool-provider.mjs` header has a comment reminding to keep them in sync.

## Why no CI

Each PR run would consume Groq free-tier quota, and the daily `job-alert-agent` cron already uses some. Run evals locally before merging meaningful changes to `chat-prompts.ts`, `chat-config.ts`, or the prompts in the eval YAML.
