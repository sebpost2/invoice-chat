import { tool } from "ai";
import { z } from "zod";
import { prisma, DEMO_SESSION_ID } from "@/lib/prisma";
import { categorize } from "@/lib/vendor-categories";

export { SYSTEM_PROMPT_EN, SYSTEM_PROMPT_ES } from "@/lib/chat-prompts";

function withToolLogging<Args extends unknown[], Result>(
  name: string,
  fn: (...args: Args) => Promise<Result>,
) {
  return async (...args: Args): Promise<Result> => {
    try {
      return await fn(...args);
    } catch (e) {
      console.error(`[tool] ${name} ERROR:`, e);
      throw e;
    }
  };
}

type ListOrderBy = "date_desc" | "date_asc" | "total_desc" | "total_asc";

const listReceiptsImpl = withToolLogging(
  "list_receipts",
  async ({ orderBy }: { orderBy: ListOrderBy }) => {
    const orderMap: Record<
      ListOrderBy,
      { field: "issueDate" | "total"; dir: "asc" | "desc" }
    > = {
      date_desc: { field: "issueDate", dir: "desc" },
      date_asc: { field: "issueDate", dir: "asc" },
      total_desc: { field: "total", dir: "desc" },
      total_asc: { field: "total", dir: "asc" },
    };
    const { field, dir } = orderMap[orderBy];
    const rows = await prisma.receipt.findMany({
      where: { sessionId: DEMO_SESSION_ID },
      orderBy: { [field]: dir },
      select: {
        id: true,
        vendorName: true,
        vendorRuc: true,
        documentType: true,
        documentNumber: true,
        issueDate: true,
        currency: true,
        total: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      vendorName: r.vendorName,
      vendorRuc: r.vendorRuc,
      documentType: r.documentType,
      documentNumber: r.documentNumber,
      issueDate: r.issueDate ? r.issueDate.toISOString().slice(0, 10) : null,
      currency: r.currency,
      total: r.total != null ? Number(r.total) : null,
    }));
  },
);

type AggregateMetric =
  | "total_spent"
  | "total_igv"
  | "total_subtotal"
  | "count"
  | "all";

const queryAggregatesImpl = withToolLogging(
  "query_aggregates",
  async ({ metric }: { metric: AggregateMetric }) => {
    const grouped = await prisma.receipt.groupBy({
      by: ["currency"],
      where: { sessionId: DEMO_SESSION_ID },
      _count: { _all: true },
      _sum: { total: true, igv: true, subtotal: true },
    });
    const all = grouped.map((g) => ({
      currency: g.currency,
      count: g._count._all,
      totalSpent: g._sum.total != null ? Number(g._sum.total) : 0,
      totalIgv: g._sum.igv != null ? Number(g._sum.igv) : 0,
      totalSubtotal: g._sum.subtotal != null ? Number(g._sum.subtotal) : 0,
    }));
    return all.map((g) => {
      switch (metric) {
        case "total_spent":
          return { currency: g.currency, totalSpent: g.totalSpent };
        case "total_igv":
          return { currency: g.currency, totalIgv: g.totalIgv };
        case "total_subtotal":
          return { currency: g.currency, totalSubtotal: g.totalSubtotal };
        case "count":
          return { currency: g.currency, count: g.count };
        case "all":
        default:
          return g;
      }
    });
  },
);

const getReceiptDetailImpl = withToolLogging(
  "get_receipt_detail",
  async ({ id }: { id: string }) => {
    const r = await prisma.receipt.findFirst({
      where: { id, sessionId: DEMO_SESSION_ID },
      select: {
        id: true,
        vendorName: true,
        vendorRuc: true,
        documentType: true,
        documentNumber: true,
        issueDate: true,
        currency: true,
        subtotal: true,
        igv: true,
        total: true,
        items: true,
      },
    });
    if (!r) {
      return { error: `No receipt with id ${id}.` };
    }
    return {
      id: r.id,
      vendorName: r.vendorName,
      vendorRuc: r.vendorRuc,
      documentType: r.documentType,
      documentNumber: r.documentNumber,
      issueDate: r.issueDate ? r.issueDate.toISOString().slice(0, 10) : null,
      currency: r.currency,
      subtotal: r.subtotal != null ? Number(r.subtotal) : null,
      igv: r.igv != null ? Number(r.igv) : null,
      total: r.total != null ? Number(r.total) : null,
      items: r.items,
    };
  },
);

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

// Canonical source for prompts + tool schemas. When edited, also update
// `evals/promptfoo.config.yaml` so the eval suite reflects the live config.
export const chatTools = {
  list_receipts: tool({
    description:
      "Lists the available receipts/invoices with their summary fields (id, vendor, type, number, date, total). Use it when the user asks to see their receipts or when you need to find a receipt id before querying its detail.",
    inputSchema: z.object({
      orderBy: z
        .enum(["date_desc", "date_asc", "total_desc", "total_asc"])
        .describe(
          "List order: 'date_desc' (most recent first, default), 'date_asc' (oldest first), 'total_desc' (most expensive first), 'total_asc' (cheapest first).",
        ),
    }),
    execute: listReceiptsImpl,
  }),

  query_aggregates: tool({
    description:
      "Returns aggregate metrics by currency. Use it to answer how much the user spent, how much VAT they paid, how many receipts they have, or everything at once.",
    inputSchema: z.object({
      metric: z
        .enum(["total_spent", "total_igv", "total_subtotal", "count", "all"])
        .describe(
          "Which metric to compute: 'total_spent' (total spending), 'total_igv' (VAT total), 'total_subtotal', 'count' (how many receipts), or 'all' for all of them.",
        ),
    }),
    execute: queryAggregatesImpl,
  }),

  get_receipt_detail: tool({
    description:
      "Returns the full detail of a receipt by id, including the items (description, quantity, unit price, total). If you don't know the id, call list_receipts first.",
    inputSchema: z.object({
      id: z.string().describe("The id (cuid) of the receipt to fetch."),
    }),
    execute: getReceiptDetailImpl,
  }),

  spending_by_category: tool({
    description:
      "Returns total spending grouped by category (groceries, dining, home, health, shopping, other) and currency, sorted highest first. Use this whenever the user asks how to reduce, optimize, or improve their spending — ground the answer in this data instead of generic advice.",
    inputSchema: z.object({}),
    execute: spendingByCategoryImpl,
  }),
};

