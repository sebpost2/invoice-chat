# Invoice Chat: spending-category insight + inline receipt images

Date: 2026-08-16
Status: approved

## Problem

Two gaps found while auditing Invoice Chat as a first-time client would experience it:

1. The chat can answer "what/how much" questions (`list_receipts`, `query_aggregates`, `get_receipt_detail`) but has no data-grounded way to answer "how do I cut my monthly costs" — there's no category concept anywhere in the schema or tools, so a question like that either gets deflected or answered with generic, non-data-backed advice.
2. Answers cite receipts by a bare 6-character id chip with no way to see the actual receipt. The image is already stored in this DB (`Receipt.imageData` / `imageMimeType`) but nothing serves it.

## Scope

In scope:
- A vendor-name → category heuristic (no schema change, no re-extraction)
- A new `spending_by_category` tool + system prompt updates telling the model to use it for cost-improvement questions
- An image-serving route + clickable/thumbnail source chips in the UI
- One new suggested-prompt chip

Out of scope (explicitly deferred):
- Real LLM-extracted `category` field (would touch Invoice Extractor's schema + prompt + a backfill; heuristic is enough for a 13-receipt demo)
- Seeding additional receipts from the user's Downloads folder (separate task, queued as a follow-up)

## Design

### 1. Vendor category lookup — `src/lib/vendor-categories.ts`

```ts
export const VENDOR_CATEGORIES: Record<string, string> = {
  // substring (uppercased) -> category
};

export function categorize(vendorName: string | null): string {
  // uppercase vendorName, find first matching substring key, default "other"
}
```

Seeded from the 13 existing demo vendors. Pure function, no I/O, easy to extend as new vendors show up.

### 2. New tool: `spending_by_category`

Added to `src/lib/chat-config.ts` alongside the existing three tools, same pattern as `queryAggregatesImpl`:

- Fetches `{ vendorName, total, currency }` for the demo session
- Maps each row through `categorize()`
- Sums `total` grouped by `{ category, currency }`
- Returns `{ category, currency, totalSpent, count }[]`

No input parameters needed (mirrors `list_receipts`'s simplicity where possible) — always returns the full breakdown, model picks out what's relevant.

### 3. System prompt updates — `src/lib/chat-prompts.ts`

Both `SYSTEM_PROMPT_EN` and `SYSTEM_PROMPT_ES`:
- Document the 4th tool in the tool list
- Add a rule: for questions about reducing/improving/optimizing spending, call `spending_by_category` first and answer using the actual top category and, where one vendor dominates a category, name that vendor specifically — not generic advice

Also update `evals/promptfoo.config.yaml` per the file's existing convention (it's the canonical source note at the top of `chat-config.ts`).

### 4. Inline receipt image

New route `src/app/api/receipt-image/[id]/route.ts`:
- `GET`, reads `imageData` + `imageMimeType` from `Receipt` by id (scoped to `DEMO_SESSION_ID` like the other tools)
- Returns the bytes with the correct `Content-Type`, `Cache-Control: public, max-age=31536000, immutable` (cuid ids are stable/unguessable, same access-control reasoning as Extractor's public receipt page)
- 404 if not found

Frontend (`src/app/page.tsx`): the `sources` footer (`sourcesFor`, `specific` case) renders each id as a small `<img>` thumbnail (`/api/receipt-image/{id}`) wrapped in an `<a target="_blank">` to the full image, instead of a bare text chip. `scope`-case sources (from `list_receipts`) stay as plain text since there's no single receipt to show.

### 5. Suggested prompt

Add `"Where can I cut costs?"` / `"¿Dónde puedo recortar gastos?"` to `intro.suggestions` in both dict blocks in `src/lib/i18n-dicts.tsx`.

## Testing

- `npx tsc --noEmit` clean
- Manual: all 13 demo vendors map to a non-"other" category unless genuinely ambiguous
- Manual: ask "where can I cut costs" in both languages, confirm the answer names a real category/vendor from `spending_by_category` output, not generic text
- Manual: click a source thumbnail, confirm the image loads and matches the receipt referenced in the answer
- Add/update promptfoo eval cases per the file's existing convention
