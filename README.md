# Invoice Chat

Agente conversacional que responde en lenguaje natural sobre boletas y facturas peruanas. Demuestra **tool use real**: el LLM decide qué herramienta SQL llamar (`list_receipts`, `query_aggregates`, `get_receipt_detail`), las ejecuta sobre Neon Postgres y responde con la data verificable. Reusa la misma DB que [Invoice Extractor](https://github.com/sebpost2/invoice-extractor) — primero se extraen las boletas, después se analizan.

Autor: [sebpost2](https://github.com/sebpost2)

**[Demo en vivo](https://invoice-chat-zeta.vercel.app)** · Sin registro · 13 boletas demo precargadas

---

## Highlights

- **Agente con multi-step reasoning**: el modelo encadena hasta 5 pasos. Para "el detalle de la boleta más cara" hace `list_receipts({orderBy: "total_desc"})` → toma el id del primer resultado → `get_receipt_detail({id})` → redacta la respuesta.
- **Tools tipadas con Zod**: cada herramienta declara su schema (`z.enum`, `z.string`), el AI SDK valida los inputs antes de ejecutar, y TypeScript infiere los tipos en el lado del servidor.
- **Streaming token-por-token** de la respuesta final con Vercel AI SDK v6 (`streamText` + `useChat`).
- **Transparencia del agente**: cada tool call es un componente `<details>` colapsable que muestra `input` y `output` JSON exactos. El visitante ve qué consultó el modelo, no solo qué respondió.
- **Citas data-driven**: si la respuesta surge de un `get_receipt_detail` específico, se muestra el id de la boleta consultada. Si surge de un listado/agregado, se muestra el alcance ("Basado en N boletas"). Nada de fabricar referencias.
- **Markdown real** en las respuestas (bullets, tablas, énfasis) renderizado con `react-markdown` + GFM.
- **Rate limit** por IP (token bucket en memoria, 10 mensajes/hora) — protege la cuota gratis de Groq de bots casuales y muestra un mensaje amigable al alcanzar el límite.
- **Demo data sintética**: 10 boletas sembradas vía `npm run seed` (Tottus, Pardos, Sodimac, Inkafarma, etc.) más las 3 reales del extractor — 13 boletas totales para preguntas con sustancia.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 (dark-first) |
| LLM SDK | Vercel AI SDK v6 (`ai`, `@ai-sdk/groq`, `@ai-sdk/react`) |
| Modelo | OpenAI gpt-oss-120b via Groq |
| Base de datos | PostgreSQL (Neon, serverless) — compartida con el extractor |
| ORM | Prisma 7 con adapter `@prisma/adapter-pg` |
| Validación | Zod 4 |
| Markdown | `react-markdown` + `remark-gfm` |
| Rate limit | Token bucket in-memory |
| Deploy | Vercel |

## Cómo funciona

```
┌──────────┐  sendMessage   ┌────────────────┐    streamText    ┌──────┐
│  Cliente │ ─────────────> │  /api/chat     │ ───────────────> │ Groq │
│ useChat  │                │ (route handler)│  + tools (Zod)   │ LLM  │
└────┬─────┘                └────────┬───────┘                  └───┬──┘
     │                               │                              │
     │       UIMessageStream         │                              │
     │ <─────────────────────────────┤  ┌────────┐  tool call       │
     │ • text-delta                  │  │ Neon   │ <────────────────┤
     │ • tool-input-streaming        │  │ DB     │                  │
     │ • tool-output-available       │  └────────┘  tool result ────┤
     │ • text-end                    │                              │
     │                               │  ... hasta stepCountIs(5)    │
```

1. El cliente envía mensaje con `useChat({ transport: DefaultChatTransport })`.
2. El route handler chequea rate limit por IP. Si pasa, llama `streamText` con las 3 tools y el modelo Groq.
3. El modelo decide qué tool llamar y emite tool-call parts. El AI SDK ejecuta el `execute` correspondiente (Prisma query) y feedbackea el resultado al modelo.
4. El modelo puede hacer más tool calls en pasos siguientes (`stopWhen: stepCountIs(5)`) o redactar la respuesta final.
5. Toda la conversación llega al cliente como un stream de partes tipadas que se renderizan en orden.

## Las tres herramientas

| Tool | Input | Output | Cuándo el modelo la elige |
|---|---|---|---|
| `list_receipts` | `orderBy: "date_desc" \| "date_asc" \| "total_desc" \| "total_asc"` | Array de boletas con campos resumidos | "Muéstrame mis boletas", "¿cuál fue la más cara?" |
| `query_aggregates` | `metric: "total_spent" \| "total_igv" \| "total_subtotal" \| "count" \| "all"` | Agregados por moneda | "¿Cuánto gasté?", "¿Cuántas boletas tengo?", "¿Cuánto IGV pagué?" |
| `get_receipt_detail` | `id: string` | Boleta completa con ítems | "Dame el detalle de [id]", último paso después de identificar una boleta por listado |

## Decisiones de diseño

- **DB compartida con el extractor** (`sessionId = "__demo__"`): contar una historia ("primero extraigo, después analizo") es más fuerte para portafolio que dos silos desconectados.
- **Sin embeddings ni vector DB**: los datos son SQL estructurado. Tool use con SQL es más preciso, más rápido y más explicable que RAG sobre la misma data.
- **Sin persistencia de threads**: cada refresh empieza una conversación nueva. Stateless por mensaje. El demo es para mostrar el agente, no construir un ChatGPT-clone.
- **Modelo: `openai/gpt-oss-120b`** sobre `llama-3.3-70b`: el Llama tiene un bug reproducible donde envía `input: null` a tools sin parámetros y Groq rechaza con `Failed to call a function`. El gpt-oss-120b construye tool calls válidos consistentemente.
- **Parámetros requeridos en todas las tools** (no `z.object({})` vacío): obliga al modelo a tomar una decisión real (orden, métrica), no a generar un objeto vacío. Como bonus enriquece la conversación.
- **Citas solo de `get_receipt_detail`**: cuando el modelo llama `list_receipts` recibe N filas; tratar a las N como "fuentes" sería ruido. Solo los lookups específicos cuentan como referencias.

## Correr localmente

### Requisitos

- Node.js 20.9+
- DB Postgres con el schema del extractor aplicado ([Neon](https://neon.tech) free tier)
- API key de [Groq](https://console.groq.com) free tier

### Setup

```bash
git clone https://github.com/<tu-usuario>/invoice-chat
cd invoice-chat
npm install
```

Crea `.env`:

```env
DATABASE_URL="postgresql://user:password@host/db?sslmode=verify-full"
GROQ_API_KEY="gsk_..."
```

Asegúrate de que la DB tenga el schema del extractor (`Receipt` table). Si no la tienes:

```bash
npx prisma db push
```

Siembra las 10 boletas demo sintéticas:

```bash
npm run seed
```

Levanta el dev server:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Connection string PostgreSQL — Neon (la misma del extractor) |
| `GROQ_API_KEY` | API key de Groq para gpt-oss-120b |

## Estructura del proyecto

```
├── src/
│   ├── app/
│   │   ├── api/chat/route.ts   # Route handler: streamText + 3 tools + rate limit
│   │   ├── layout.tsx          # Dark mode forzado, metadata
│   │   └── page.tsx            # UI: useChat + tool details + citas + markdown
│   └── lib/
│       ├── prisma.ts           # Cliente Prisma con adapter Neon
│       └── ratelimit.ts        # Token bucket in-memory por IP
├── prisma/
│   └── schema.prisma           # Modelo Receipt (compartido con el extractor)
└── scripts/
    └── seed-chat-demo.ts       # 10 boletas sintéticas (Tottus, Pardos, Sodimac…)
```

## Limitaciones conocidas

- **Rate limit in-memory**: cada serverless function de Vercel tiene su propio contador. Si Vercel escala a varias instancias bajo tráfico alto, el límite efectivo es por-instancia-por-IP. Suficiente para portafolio personal; migrar a Upstash Redis si se vuelve relevante.
- **Conversación no persiste**: refresh = nuevo chat. Mostrar el agente importa más que el histórico.
- **El modelo puede no elegir la tool ideal**: para preguntas ambiguas ocasionalmente llama una tool subóptima. El system prompt mitiga, no elimina.

---

Construido por [sebpost2](https://github.com/sebpost2) para demostrar agentes IA con tool use real, multi-step reasoning, y stack moderno (Vercel AI SDK + Next 16).
