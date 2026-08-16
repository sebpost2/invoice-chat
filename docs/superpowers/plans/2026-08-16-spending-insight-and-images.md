# Spending-Category Insight + Inline Receipt Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Invoice Chat a data-grounded way to answer "how do I cut my costs" and let users see the actual receipt image behind an answer instead of a bare id.

**Architecture:** A pure vendor→category lookup feeds a new `spending_by_category` tool (same shape as the existing `query_aggregates`), wired into both system prompts. A new `GET /api/receipt-image/[id]` route streams the `imageData` bytes already stored on `Receipt`, and the chat UI turns source-id chips into clickable thumbnails that fall back to a plain badge when no real image exists (the 10 seeded demo receipts use a 1-byte placeholder, only the 3 real Extractor-uploaded receipts have actual images).

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma (`@prisma/client` v7, `PrismaPg` adapter), AI SDK v6 (`ai`, `@ai-sdk/groq`), Zod v4, promptfoo for LLM-behavior evals. No unit test runner in this repo — verification is `tsc --noEmit`, `eslint`, small `tsx`-run self-check scripts (existing convention: `scripts/seed-chat-demo.ts`), and promptfoo evals for tool-selection behavior.

**Spec:** `docs/superpowers/specs/2026-08-16-spending-insight-and-images-design.md`

## Global Constraints

- No schema changes, no re-extraction (spec explicitly defers a real `category` field).
- Both `SYSTEM_PROMPT_EN`/`SYSTEM_PROMPT_ES` in `src/lib/chat-prompts.ts` must stay byte-identical to their duplicates in `evals/groq-tool-provider.mjs` — enforced by `evals/verify-prompts-sync.mjs`, which runs before `npm run eval`.
- Demo data has two image tiers: 10 synthetic receipts (`imageMimeType: "image/synthetic"`, 1-byte placeholder from `scripts/seed-chat-demo.ts`) and 3 real receipts uploaded through Invoice Extractor (real JPEG/PNG bytes). The image route and UI must not present the placeholder byte as a real image.
- All new receipt-scoped queries filter by `sessionId: DEMO_SESSION_ID` (from `src/lib/prisma.ts`), matching every existing tool in `src/lib/chat-config.ts`.
- Follow the existing "id is the access control" reasoning already used on Invoice Extractor's public `/receipt/[id]` page — no additional auth on the new image route.

---

### Task 1: Vendor category lookup

**Files:**
- Create: `src/lib/vendor-categories.ts`
- Create: `scripts/check-vendor-categories.ts`

**Interfaces:**
- Produces: `categorize(vendorName: string | null): string` — used by Task 2's `spending_by_category` tool.

- [ ] **Step 1: Write `src/lib/vendor-categories.ts`**

```ts
// Vendor-name substring -> spending category. Heuristic, not authoritative —
// unmatched vendors fall into "other". Keys are matched case-insensitively
// against the full vendorName.
const VENDOR_CATEGORIES: Record<string, string> = {
  TOTTUS: "groceries",
  WONG: "groceries",
  TAMBO: "groceries",
  "PARDOS CHICKEN": "dining",
  BEMBOS: "dining",
  "LA LUCHA": "dining",
  SODIMAC: "home",
  INKAFARMA: "health",
  "SAGA FALABELLA": "shopping",
  FALABELLA: "shopping",
};

export function categorize(vendorName: string | null): string {
  if (!vendorName) return "other";
  const upper = vendorName.toUpperCase();
  for (const [key, category] of Object.entries(VENDOR_CATEGORIES)) {
    if (upper.includes(key)) return category;
  }
  return "other";
}
```

- [ ] **Step 2: Write the self-check script**

```ts
// scripts/check-vendor-categories.ts
// Run with: npx tsx scripts/check-vendor-categories.ts
import { categorize } from "../src/lib/vendor-categories"

const cases: [string | null, string][] = [
  ["Tottus", "groceries"],
  ["Wong", "groceries"],
  ["Tambo", "groceries"],
  ["Pardos Chicken", "dining"],
  ["Bembos", "dining"],
  ["La Lucha Sanguchería", "dining"],
  ["Sodimac", "home"],
  ["Inkafarma", "health"],
  ["Saga Falabella", "shopping"],
  ["Some Random Vendor S.A.C.", "other"],
  [null, "other"],
]

let failures = 0
for (const [input, expected] of cases) {
  const actual = categorize(input)
  if (actual !== expected) {
    console.error(`FAIL: categorize(${JSON.stringify(input)}) = ${actual}, expected ${expected}`)
    failures++
  }
}

if (failures > 0) {
  console.error(`\n${failures}/${cases.length} cases failed`)
  process.exit(1)
}
console.log(`✓ all ${cases.length} categorize() cases passed`)
```

- [ ] **Step 3: Run it and confirm it fails before the lookup exists, then passes after**

Run: `npx tsx scripts/check-vendor-categories.ts`
Expected (before Step 1 exists): module not found error.
Expected (after Step 1): `✓ all 11 categorize() cases passed`

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/vendor-categories.ts scripts/check-vendor-categories.ts
git commit -m "Add vendor-to-category heuristic for spending insight"
```

---

### Task 2: `spending_by_category` tool

**Files:**
- Modify: `src/lib/chat-config.ts`

**Interfaces:**
- Consumes: `categorize(vendorName: string | null): string` from Task 1 (`src/lib/vendor-categories.ts`).
- Consumes: `prisma`, `DEMO_SESSION_ID` from `@/lib/prisma` (already imported in this file).
- Produces: `chatTools.spending_by_category` — a tool entry with the same `tool({...})` shape as the existing three, consumed by Task 3's system-prompt wiring and by `src/app/api/chat/route.ts` (already passes `tools: chatTools` unmodified — no changes needed there).

- [ ] **Step 1: Add the import**

In `src/lib/chat-config.ts`, add after the existing `prisma`/`DEMO_SESSION_ID` import:

```ts
import { categorize } from "@/lib/vendor-categories";
```

- [ ] **Step 2: Add the implementation function**

Add after `getReceiptDetailImpl` (before the `chatTools` export):

```ts
const spendingByCategoryImpl = withToolLogging(
  "spending_by_category",
  async () => {
    const rows = await prisma.receipt.findMany({
      where: { sessionId: DEMO_SESSION_ID },
      select: { vendorName: true, total: true, currency: true },
    });
    const totals = new Map<string, { totalSpent: number; count: number }>();
    for (const r of rows) {
      if (r.total == null) continue;
      const category = categorize(r.vendorName);
      const key = `${category}|${r.currency}`;
      const entry = totals.get(key) ?? { totalSpent: 0, count: 0 };
      entry.totalSpent += Number(r.total);
      entry.count += 1;
      totals.set(key, entry);
    }
    return [...totals.entries()]
      .map(([key, { totalSpent, count }]) => {
        const [category, currency] = key.split("|");
        return { category, currency, totalSpent, count };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent);
  },
);
```

- [ ] **Step 3: Register the tool**

Inside the `chatTools` object, add after `get_receipt_detail`:

```ts
  spending_by_category: tool({
    description:
      "Returns total spending grouped by category (groceries, dining, home, health, shopping, other) and currency, sorted highest first. Use this whenever the user asks how to reduce, optimize, or improve their spending — ground the answer in this data instead of generic advice.",
    inputSchema: z.object({}),
    execute: spendingByCategoryImpl,
  }),
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`, then in another terminal:

```bash
curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"Where can I cut costs?"}]}]}'
```

Expected: streamed response includes a `tool-spending_by_category` part with `output-available` state and a category breakdown in the output (system prompt not yet updated, so the model may not call it reliably yet — that's Task 3; this step just confirms the tool executes without error when invoked. If it doesn't get called, proceed to Task 3 before re-testing).

- [ ] **Step 6: Commit**

```bash
git add src/lib/chat-config.ts
git commit -m "Add spending_by_category tool"
```

---

### Task 3: System prompt updates + eval provider sync

**Files:**
- Modify: `src/lib/chat-prompts.ts`
- Modify: `evals/groq-tool-provider.mjs`
- Modify: `evals/tests/tool-selection.yaml`

**Interfaces:**
- Consumes: `chatTools.spending_by_category` from Task 2 (referenced by name in the prompt text, not imported).
- Produces: updated `SYSTEM_PROMPT_EN`/`SYSTEM_PROMPT_ES` strings, kept byte-identical between the two files (checked by `evals/verify-prompts-sync.mjs`).

- [ ] **Step 1: Update `src/lib/chat-prompts.ts`**

Replace `SYSTEM_PROMPT_EN`:

```ts
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
```

Replace `SYSTEM_PROMPT_ES`:

```ts
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
```

- [ ] **Step 2: Mirror both prompts in `evals/groq-tool-provider.mjs`**

Replace the `SYSTEM_PROMPT_EN`/`SYSTEM_PROMPT_ES` consts at the top of the file with the exact same two strings from Step 1 (byte-for-byte — this is what `verify-prompts-sync.mjs` checks).

- [ ] **Step 3: Add the tool schema to `evals/groq-tool-provider.mjs`**

In the `TOOLS` array, add after the `get_receipt_detail` entry:

```js
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
```

- [ ] **Step 4: Run the prompt-sync check**

Run: `node evals/verify-prompts-sync.mjs`
Expected: exits 0 with no drift reported.

- [ ] **Step 5: Add eval cases to `evals/tests/tool-selection.yaml`**

Append:

```yaml
- description: "EN: 'how can I cut costs?' → spending_by_category"
  vars:
    message: "How can I cut my monthly costs?"
    lang: en
  assert:
    - type: contains
      value: "TOOL:spending_by_category"

- description: "ES: '¿cómo puedo ahorrar?' → spending_by_category"
  vars:
    message: "¿Cómo puedo reducir mis gastos mensuales?"
    lang: es
  assert:
    - type: contains
      value: "TOOL:spending_by_category"
```

- [ ] **Step 6: Run the eval suite** (requires `GROQ_API_KEY`)

Run: `npm run eval`
Expected: the two new cases pass (model picks `spending_by_category` with no required args), no regressions on existing cases.

- [ ] **Step 7: Re-run the Task 2 manual smoke test**

Repeat the `curl` from Task 2 Step 5. Expected: the model now reliably calls `spending_by_category` for the cost-cutting question and the final text answer names a specific category (e.g. "groceries") rather than generic advice.

- [ ] **Step 8: Commit**

```bash
git add src/lib/chat-prompts.ts evals/groq-tool-provider.mjs evals/tests/tool-selection.yaml
git commit -m "Wire spending_by_category into both system prompts and eval provider"
```

---

### Task 4: Receipt image route

**Files:**
- Create: `src/app/api/receipt-image/[id]/route.ts`

**Interfaces:**
- Consumes: `prisma`, `DEMO_SESSION_ID` from `@/lib/prisma`.
- Produces: `GET /api/receipt-image/:id` — 200 with image bytes and correct `Content-Type` for a real receipt, 404 for a missing id or a synthetic (placeholder-image) receipt. Consumed by Task 5's frontend thumbnails.

- [ ] **Step 1: Write the route**

```ts
import { prisma, DEMO_SESSION_ID } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const receipt = await prisma.receipt.findFirst({
    where: {
      id,
      sessionId: DEMO_SESSION_ID,
      imageMimeType: { not: "image/synthetic" },
    },
    select: { imageData: true, imageMimeType: true },
  });

  if (!receipt) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(receipt.imageData), {
    headers: {
      "Content-Type": receipt.imageMimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Manual test against real and synthetic ids**

Run: `npm run dev`, then find one real and one synthetic receipt id:

```bash
npx tsx -e "
import { prisma, DEMO_SESSION_ID } from './src/lib/prisma';
(async () => {
  const real = await prisma.receipt.findFirst({ where: { sessionId: DEMO_SESSION_ID, imageMimeType: { not: 'image/synthetic' } } });
  const synth = await prisma.receipt.findFirst({ where: { sessionId: DEMO_SESSION_ID, imageMimeType: 'image/synthetic' } });
  console.log('real:', real?.id);
  console.log('synthetic:', synth?.id);
  await prisma.\$disconnect();
})();
"
```

Then:

```bash
curl -sI http://localhost:3000/api/receipt-image/<real-id>
curl -sI http://localhost:3000/api/receipt-image/<synthetic-id>
```

Expected: real id → `200` with `Content-Type: image/jpeg` (or whatever was uploaded); synthetic id → `404`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/receipt-image
git commit -m "Add receipt image serving route"
```

---

### Task 5: Frontend thumbnail source chips

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `GET /api/receipt-image/:id` from Task 4 (404 on missing/synthetic image).

- [ ] **Step 1: Add a `SourceThumb` component**

In `src/app/page.tsx`, add after the `shortId` function:

```tsx
function SourceThumb({ id }: { id: string }) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <span
        title={id}
        className="font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[11px]"
      >
        {shortId(id)}
      </span>
    );
  }

  return (
    <a
      href={`/api/receipt-image/${id}`}
      target="_blank"
      rel="noopener noreferrer"
      title={id}
      className="block h-7 w-7 rounded overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-colors"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- receipt bytes come from our own DB-backed route, not next/image's remote loader */}
      <img
        src={`/api/receipt-image/${id}`}
        alt=""
        onError={() => setBroken(true)}
        className="h-full w-full object-cover"
      />
    </a>
  );
}
```

- [ ] **Step 2: Use it in the `specific` sources block**

Replace the existing `sources.kind === "specific"` block's id rendering:

```tsx
{sources.kind === "specific" && (
  <div className="pt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
    <span className="text-zinc-600">{t.sources.sourcesLabel}</span>
    {sources.ids.map((id) => (
      <SourceThumb key={id} id={id} />
    ))}
  </div>
)}
```

(The `scope`-case block below it is unchanged — no single receipt id to show a thumbnail for.)

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual test in the browser**

Run: `npm run dev`, open `http://localhost:3000`, ask "Give me the details of the most expensive receipt." Expected: the source chip under the answer shows a small clickable image thumbnail (opens the real receipt in a new tab) if it resolves to one of the 3 real receipts, or the plain `shortId` badge (unchanged look) if it resolves to one of the 10 synthetic ones — no broken-image icon in either case.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "Show receipt image thumbnails on chat source chips"
```

---

### Task 6: Suggested prompt chip

**Files:**
- Modify: `src/lib/i18n-dicts.tsx`

- [ ] **Step 1: Add the suggestion to both dicts**

In `enDict.intro.suggestions`, add as the last entry:

```ts
      "Where can I cut costs?",
```

In `esDict.intro.suggestions`, add as the last entry:

```ts
      "¿Dónde puedo recortar gastos?",
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Manual test**

Run: `npm run dev`, open `http://localhost:3000` with an empty chat, confirm the new chip appears in both languages (toggle the language switch) and clicking it sends the message and gets a category-grounded answer.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n-dicts.tsx
git commit -m "Add cost-cutting suggested prompt"
```

---

### Task 7: Push and verify on Vercel preview

**Files:** none (deployment verification only)

- [ ] **Step 1: Push the branch**

```bash
git push
```

- [ ] **Step 2: Confirm the deployment is ready**

Use the Vercel CLI (`vercel api /v9/projects/<project-id>` or `vercel ls`) to confirm the latest deployment for `invoice-chat` reached `READY`.

- [ ] **Step 3: Verify live**

`curl` or open the production URL, ask "Where can I cut costs?" / "¿Dónde puedo recortar gastos?" in both languages, confirm a category-grounded answer and, for at least one receipt-detail question, a working thumbnail linking to a real image.

- [ ] **Step 4: Report back**

Summarize to the user what shipped and confirm both new suggested-prompt chips work end to end on production.
