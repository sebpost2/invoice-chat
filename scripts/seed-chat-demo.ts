import "dotenv/config"
import { prisma, DEMO_SESSION_ID } from "../src/lib/prisma"

type Item = {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

type Seed = {
  vendorName: string
  vendorRuc: string
  documentType: "Boleta" | "Factura"
  documentNumber: string
  issueDate: string
  subtotal: number | null
  igv: number | null
  total: number
  items: Item[]
}

const PLACEHOLDER_IMG = Buffer.from([0x89])
const PLACEHOLDER_MIME = "image/synthetic"

const seeds: Seed[] = [
  {
    vendorName: "Tottus",
    vendorRuc: "20508565934",
    documentType: "Boleta",
    documentNumber: "B005-00123456",
    issueDate: "2026-02-10",
    subtotal: null,
    igv: null,
    total: 87.5,
    items: [
      { description: "Arroz Costeño 5kg", quantity: 1, unitPrice: 24.9, total: 24.9 },
      { description: "Aceite Primor 1L", quantity: 2, unitPrice: 12.5, total: 25.0 },
      { description: "Leche Gloria 1L", quantity: 3, unitPrice: 5.4, total: 16.2 },
      { description: "Huevos rosados x12", quantity: 1, unitPrice: 11.9, total: 11.9 },
      { description: "Pan integral", quantity: 1, unitPrice: 9.5, total: 9.5 },
    ],
  },
  {
    vendorName: "Pardos Chicken",
    vendorRuc: "20100070970",
    documentType: "Boleta",
    documentNumber: "B003-00876543",
    issueDate: "2026-02-22",
    subtotal: null,
    igv: null,
    total: 65.0,
    items: [
      { description: "1/4 pollo a la brasa + papas", quantity: 1, unitPrice: 32.0, total: 32.0 },
      { description: "Chicha morada 1L", quantity: 1, unitPrice: 14.0, total: 14.0 },
      { description: "Ensalada cesar", quantity: 1, unitPrice: 19.0, total: 19.0 },
    ],
  },
  {
    vendorName: "Tottus",
    vendorRuc: "20508565934",
    documentType: "Boleta",
    documentNumber: "B005-00125890",
    issueDate: "2026-03-05",
    subtotal: null,
    igv: null,
    total: 142.3,
    items: [
      { description: "Pollo entero", quantity: 1, unitPrice: 32.5, total: 32.5 },
      { description: "Detergente Ariel 4kg", quantity: 1, unitPrice: 38.9, total: 38.9 },
      { description: "Papel higiénico Suave x12", quantity: 1, unitPrice: 28.5, total: 28.5 },
      { description: "Frutas surtidas", quantity: 1, unitPrice: 42.4, total: 42.4 },
    ],
  },
  {
    vendorName: "Bembos",
    vendorRuc: "20100039207",
    documentType: "Boleta",
    documentNumber: "B015-00045678",
    issueDate: "2026-03-12",
    subtotal: null,
    igv: null,
    total: 28.0,
    items: [
      { description: "Combo La Bembos", quantity: 1, unitPrice: 22.0, total: 22.0 },
      { description: "Gaseosa adicional", quantity: 1, unitPrice: 6.0, total: 6.0 },
    ],
  },
  {
    vendorName: "Sodimac",
    vendorRuc: "20389230724",
    documentType: "Factura",
    documentNumber: "F001-00234567",
    issueDate: "2026-03-18",
    subtotal: 412.0,
    igv: 74.16,
    total: 486.16,
    items: [
      { description: "Taladro percutor Bosch", quantity: 1, unitPrice: 289.0, total: 289.0 },
      { description: "Brocas para concreto x5", quantity: 1, unitPrice: 45.0, total: 45.0 },
      { description: "Cinta aislante 3M", quantity: 4, unitPrice: 19.5, total: 78.0 },
    ],
  },
  {
    vendorName: "La Lucha Sanguchería",
    vendorRuc: "20510889551",
    documentType: "Boleta",
    documentNumber: "B002-00098765",
    issueDate: "2026-03-24",
    subtotal: null,
    igv: null,
    total: 35.5,
    items: [
      { description: "Sándwich de pavo", quantity: 1, unitPrice: 19.5, total: 19.5 },
      { description: "Chicha morada", quantity: 1, unitPrice: 8.0, total: 8.0 },
      { description: "Papas nativas", quantity: 1, unitPrice: 8.0, total: 8.0 },
    ],
  },
  {
    vendorName: "Wong",
    vendorRuc: "20100070970",
    documentType: "Boleta",
    documentNumber: "B007-00345678",
    issueDate: "2026-04-03",
    subtotal: null,
    igv: null,
    total: 96.8,
    items: [
      { description: "Salmón fresco 500g", quantity: 1, unitPrice: 48.9, total: 48.9 },
      { description: "Quinua orgánica 1kg", quantity: 1, unitPrice: 22.5, total: 22.5 },
      { description: "Palta Hass 1kg", quantity: 1, unitPrice: 14.9, total: 14.9 },
      { description: "Pan baguette", quantity: 2, unitPrice: 5.25, total: 10.5 },
    ],
  },
  {
    vendorName: "Inkafarma",
    vendorRuc: "20331066703",
    documentType: "Boleta",
    documentNumber: "B210-00567890",
    issueDate: "2026-04-14",
    subtotal: null,
    igv: null,
    total: 23.4,
    items: [
      { description: "Paracetamol 500mg x20", quantity: 1, unitPrice: 8.9, total: 8.9 },
      { description: "Loratadina 10mg x10", quantity: 1, unitPrice: 14.5, total: 14.5 },
    ],
  },
  {
    vendorName: "Saga Falabella",
    vendorRuc: "20100128056",
    documentType: "Factura",
    documentNumber: "F003-00456789",
    issueDate: "2026-04-21",
    subtotal: 254.24,
    igv: 45.76,
    total: 300.0,
    items: [
      { description: "Zapatillas Nike Pegasus 41", quantity: 1, unitPrice: 254.24, total: 254.24 },
    ],
  },
  {
    vendorName: "Tambo",
    vendorRuc: "20507846085",
    documentType: "Boleta",
    documentNumber: "B021-00678901",
    issueDate: "2026-05-06",
    subtotal: null,
    igv: null,
    total: 12.5,
    items: [
      { description: "Café Altomayo 200g", quantity: 1, unitPrice: 8.5, total: 8.5 },
      { description: "Galletas Tentación", quantity: 2, unitPrice: 2.0, total: 4.0 },
    ],
  },
]

async function main() {
  console.log(`🌱 Sembrando ${seeds.length} boletas sintéticas en sessionId="${DEMO_SESSION_ID}"...\n`)

  // Wipe ONLY synthetic ones (image mime "image/synthetic") to avoid touching the 3 real ones del extractor.
  const wiped = await prisma.receipt.deleteMany({
    where: { sessionId: DEMO_SESSION_ID, imageMimeType: PLACEHOLDER_MIME },
  })
  console.log(`   🧹 ${wiped.count} sintéticas previas eliminadas (las 3 reales del extractor quedan intactas).\n`)

  for (const s of seeds) {
    const created = await prisma.receipt.create({
      data: {
        sessionId: DEMO_SESSION_ID,
        imageData: PLACEHOLDER_IMG,
        imageMimeType: PLACEHOLDER_MIME,
        vendorName: s.vendorName,
        vendorRuc: s.vendorRuc,
        documentType: s.documentType,
        documentNumber: s.documentNumber,
        issueDate: new Date(s.issueDate + "T00:00:00.000Z"),
        currency: "PEN",
        subtotal: s.subtotal,
        igv: s.igv,
        total: s.total,
        items: s.items as never,
      },
    })
    console.log(
      `   ✓ ${created.issueDate?.toISOString().slice(0, 10)} | ${s.vendorName.padEnd(24)} | ${s.documentType} | S/ ${s.total.toFixed(2)}`,
    )
  }

  const totalCount = await prisma.receipt.count({ where: { sessionId: DEMO_SESSION_ID } })
  console.log(`\n🎉 Listo. Total en sessionId="${DEMO_SESSION_ID}": ${totalCount} boletas.`)
}

main()
  .catch((err) => {
    console.error("❌ Error:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
