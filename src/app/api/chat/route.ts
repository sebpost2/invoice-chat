import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai"
import { groq } from "@ai-sdk/groq"
import { z } from "zod"
import { prisma, DEMO_SESSION_ID } from "@/lib/prisma"
import { checkRateLimit, clientIp } from "@/lib/ratelimit"

export const maxDuration = 30

type ListOrderBy = "date_desc" | "date_asc" | "total_desc" | "total_asc"

async function listReceiptsImpl({ orderBy }: { orderBy: ListOrderBy }) {
  const orderMap: Record<ListOrderBy, { field: "issueDate" | "total"; dir: "asc" | "desc" }> = {
    date_desc: { field: "issueDate", dir: "desc" },
    date_asc: { field: "issueDate", dir: "asc" },
    total_desc: { field: "total", dir: "desc" },
    total_asc: { field: "total", dir: "asc" },
  }
  const { field, dir } = orderMap[orderBy]
  try {
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
    })
    const mapped = rows.map((r) => ({
      id: r.id,
      vendorName: r.vendorName,
      vendorRuc: r.vendorRuc,
      documentType: r.documentType,
      documentNumber: r.documentNumber,
      issueDate: r.issueDate ? r.issueDate.toISOString().slice(0, 10) : null,
      currency: r.currency,
      total: r.total != null ? Number(r.total) : null,
    }))
    console.log("[tool] list_receipts → returning", mapped.length, "rows")
    return mapped
  } catch (e) {
    console.error("[tool] list_receipts ERROR:", e)
    throw e
  }
}

type AggregateMetric = "total_spent" | "total_igv" | "total_subtotal" | "count" | "all"

async function queryAggregatesImpl({ metric }: { metric: AggregateMetric }) {
  try {
    const grouped = await prisma.receipt.groupBy({
      by: ["currency"],
      where: { sessionId: DEMO_SESSION_ID },
      _count: { _all: true },
      _sum: { total: true, igv: true, subtotal: true },
    })
    const all = grouped.map((g) => ({
      currency: g.currency,
      count: g._count._all,
      totalSpent: g._sum.total != null ? Number(g._sum.total) : 0,
      totalIgv: g._sum.igv != null ? Number(g._sum.igv) : 0,
      totalSubtotal: g._sum.subtotal != null ? Number(g._sum.subtotal) : 0,
    }))
    const projected = all.map((g) => {
      switch (metric) {
        case "total_spent":
          return { currency: g.currency, totalSpent: g.totalSpent }
        case "total_igv":
          return { currency: g.currency, totalIgv: g.totalIgv }
        case "total_subtotal":
          return { currency: g.currency, totalSubtotal: g.totalSubtotal }
        case "count":
          return { currency: g.currency, count: g.count }
        case "all":
        default:
          return g
      }
    })
    console.log("[tool] query_aggregates metric=" + metric + " →", projected)
    return projected
  } catch (e) {
    console.error("[tool] query_aggregates ERROR:", e)
    throw e
  }
}

async function getReceiptDetailImpl({ id }: { id: string }) {
  try {
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
    })
    if (!r) {
      console.log("[tool] get_receipt_detail → not found id:", id)
      return { error: `No existe boleta con id ${id}.` }
    }
    const mapped = {
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
    }
    console.log("[tool] get_receipt_detail → returning id:", id)
    return mapped
  } catch (e) {
    console.error("[tool] get_receipt_detail ERROR:", e)
    throw e
  }
}

const chatTools = {
  list_receipts: tool({
    description:
      "Lista las boletas/facturas disponibles con sus campos resumidos (id, proveedor, tipo, número, fecha, total). Úsalo cuando el usuario pida ver sus boletas o cuando necesites encontrar el id de una boleta antes de consultar su detalle.",
    inputSchema: z.object({
      orderBy: z
        .enum(["date_desc", "date_asc", "total_desc", "total_asc"])
        .describe(
          "Orden del listado: 'date_desc' (más reciente primero, por defecto), 'date_asc' (más antiguo), 'total_desc' (más caro primero), 'total_asc' (más barato).",
        ),
    }),
    execute: listReceiptsImpl,
  }),

  query_aggregates: tool({
    description:
      "Devuelve métricas agregadas por moneda. Úsalo para responder cuánto gastó el usuario, cuánto IGV pagó, cuántas boletas tiene, o para todo a la vez.",
    inputSchema: z.object({
      metric: z
        .enum(["total_spent", "total_igv", "total_subtotal", "count", "all"])
        .describe(
          "Qué métrica calcular: 'total_spent' (gasto total), 'total_igv', 'total_subtotal', 'count' (cuántas boletas), o 'all' para todas.",
        ),
    }),
    execute: queryAggregatesImpl,
  }),

  get_receipt_detail: tool({
    description:
      "Devuelve el detalle completo de una boleta por id, incluyendo los ítems (descripción, cantidad, precio unitario, total). Si no conoces el id, llama primero a list_receipts.",
    inputSchema: z.object({
      id: z.string().describe("El id (cuid) de la boleta a consultar."),
    }),
    execute: getReceiptDetailImpl,
  }),
}

const SYSTEM_PROMPT = `Eres un asistente financiero que responde preguntas sobre las boletas y facturas peruanas del usuario.

Tienes tres herramientas para consultar la base de datos:
- list_receipts: lista las boletas disponibles (id, proveedor, tipo, número, fecha, total).
- query_aggregates: devuelve totales agregados por moneda (cuánto se gastó, cuánto IGV, conteo).
- get_receipt_detail: devuelve el detalle completo de una boleta por id, incluyendo sus ítems.

Reglas:
- Responde siempre en español, breve y al grano.
- Usa las herramientas en lugar de inventar datos. Si no tienes los datos, llama a la herramienta correspondiente.
- Si el usuario pide "el detalle" sin precisar cuál, llama primero a list_receipts y dale las opciones.
- Formatea los montos como "S/ 12.34" (o "USD 12.34" si la moneda no es PEN).
- Cuando muestres listas o ítems, usa bullets markdown.`

export async function POST(req: Request) {
  const ip = clientIp(req)
  const rl = checkRateLimit(ip)
  if (!rl.allowed) {
    const minutes = Math.max(1, Math.ceil(rl.retryAfterSec / 60))
    return Response.json(
      {
        error: `Demo en alto tráfico — intenta de nuevo en ~${minutes} min. (límite: 10 mensajes/hora por IP)`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      },
    )
  }

  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: groq("openai/gpt-oss-120b"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: chatTools,
    stopWhen: stepCountIs(5),
  })

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error("[/api/chat] streamText error:", error)
      if (error instanceof Error) return error.message
      return "Ocurrió un error procesando la consulta."
    },
  })
}
