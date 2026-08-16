import { prisma, DEMO_SESSION_ID } from "@/lib/prisma";

type Item = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type Seed = {
  vendorName: string;
  vendorRuc: string;
  documentType: "Boleta" | "Factura";
  documentNumber: string;
  issueDate: string;
  subtotal: number | null;
  igv: number | null;
  total: number;
  items: Item[];
};

export const PLACEHOLDER_IMG = Buffer.from([0x89]);
export const PLACEHOLDER_MIME = "image/synthetic";

export const seeds: Seed[] = [
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
  // --- added to keep "other" from dominating the demo's spending_by_category answer ---
  {
    vendorName: "Sodimac",
    vendorRuc: "20389230724",
    documentType: "Factura",
    documentNumber: "F001-00235400",
    issueDate: "2026-05-12",
    subtotal: 800.0,
    igv: 144.0,
    total: 944.0,
    items: [
      { description: "Escritorio de oficina", quantity: 1, unitPrice: 520.0, total: 520.0 },
      { description: "Silla ergonómica", quantity: 1, unitPrice: 220.0, total: 220.0 },
      { description: "Lámpara de escritorio", quantity: 2, unitPrice: 30.0, total: 60.0 },
    ],
  },
  {
    vendorName: "Tottus",
    vendorRuc: "20508565934",
    documentType: "Boleta",
    documentNumber: "B005-00128900",
    issueDate: "2026-05-19",
    subtotal: null,
    igv: null,
    total: 210.4,
    items: [
      { description: "Arroz 5kg", quantity: 1, unitPrice: 24.9, total: 24.9 },
      { description: "Pollo entero", quantity: 1, unitPrice: 32.5, total: 32.5 },
      { description: "Verduras variadas", quantity: 1, unitPrice: 45.0, total: 45.0 },
      { description: "Papel higiénico x12", quantity: 1, unitPrice: 28.5, total: 28.5 },
      { description: "Detergente", quantity: 1, unitPrice: 38.9, total: 38.9 },
      { description: "Frutas surtidas", quantity: 1, unitPrice: 40.6, total: 40.6 },
    ],
  },
  {
    vendorName: "Wong",
    vendorRuc: "20100070970",
    documentType: "Boleta",
    documentNumber: "B007-00346500",
    issueDate: "2026-06-02",
    subtotal: null,
    igv: null,
    total: 268.75,
    items: [
      { description: "Salmón fresco 500g", quantity: 1, unitPrice: 48.9, total: 48.9 },
      { description: "Queso parmesano 250g", quantity: 1, unitPrice: 32.5, total: 32.5 },
      { description: "Vino tinto reserva", quantity: 1, unitPrice: 65.0, total: 65.0 },
      { description: "Palta Hass 1kg", quantity: 1, unitPrice: 14.9, total: 14.9 },
      { description: "Pan artesanal", quantity: 1, unitPrice: 18.45, total: 18.45 },
      { description: "Aceite oliva extra virgen 500ml", quantity: 1, unitPrice: 89.0, total: 89.0 },
    ],
  },
  {
    vendorName: "Tambo",
    vendorRuc: "20507846085",
    documentType: "Boleta",
    documentNumber: "B021-00679200",
    issueDate: "2026-06-08",
    subtotal: null,
    igv: null,
    total: 22.3,
    items: [
      { description: "Agua mineral", quantity: 2, unitPrice: 3.5, total: 7.0 },
      { description: "Snack mixto", quantity: 1, unitPrice: 9.9, total: 9.9 },
      { description: "Chocolate", quantity: 1, unitPrice: 5.4, total: 5.4 },
    ],
  },
  {
    vendorName: "Saga Falabella",
    vendorRuc: "20100128056",
    documentType: "Factura",
    documentNumber: "F003-00457400",
    issueDate: "2026-06-14",
    subtotal: 280.0,
    igv: 50.4,
    total: 330.4,
    items: [
      { description: "Casaca impermeable", quantity: 1, unitPrice: 180.0, total: 180.0 },
      { description: "Zapatillas urbanas", quantity: 1, unitPrice: 100.0, total: 100.0 },
    ],
  },
  {
    vendorName: "Sodimac",
    vendorRuc: "20389230724",
    documentType: "Factura",
    documentNumber: "F001-00236100",
    issueDate: "2026-06-18",
    subtotal: 440.0,
    igv: 79.2,
    total: 519.2,
    items: [
      { description: "Microondas", quantity: 1, unitPrice: 280.0, total: 280.0 },
      { description: "Ventilador de torre", quantity: 1, unitPrice: 120.0, total: 120.0 },
      { description: "Set de cortinas", quantity: 1, unitPrice: 40.0, total: 40.0 },
    ],
  },
  {
    vendorName: "Falabella",
    vendorRuc: "20100128056",
    documentType: "Factura",
    documentNumber: "F004-00012800",
    issueDate: "2026-06-28",
    subtotal: 230.0,
    igv: 41.4,
    total: 271.4,
    items: [
      { description: "Licuadora Oster", quantity: 1, unitPrice: 150.0, total: 150.0 },
      { description: "Set de sábanas", quantity: 1, unitPrice: 80.0, total: 80.0 },
    ],
  },
  {
    vendorName: "Inkafarma",
    vendorRuc: "20331066703",
    documentType: "Boleta",
    documentNumber: "B210-00568900",
    issueDate: "2026-07-01",
    subtotal: null,
    igv: null,
    total: 68.9,
    items: [
      { description: "Multivitamínico x30", quantity: 1, unitPrice: 38.9, total: 38.9 },
      { description: "Protector solar FPS50", quantity: 1, unitPrice: 30.0, total: 30.0 },
    ],
  },
  {
    vendorName: "Pardos Chicken",
    vendorRuc: "20100070970",
    documentType: "Boleta",
    documentNumber: "B003-00878100",
    issueDate: "2026-07-05",
    subtotal: null,
    igv: null,
    total: 95.0,
    items: [
      { description: "Pollo entero a la brasa + papas", quantity: 1, unitPrice: 58.0, total: 58.0 },
      { description: "Ensalada cesar", quantity: 1, unitPrice: 19.0, total: 19.0 },
      { description: "Chicha morada 1L", quantity: 1, unitPrice: 18.0, total: 18.0 },
    ],
  },
  {
    vendorName: "Bembos",
    vendorRuc: "20100039207",
    documentType: "Boleta",
    documentNumber: "B015-00046500",
    issueDate: "2026-07-12",
    subtotal: null,
    igv: null,
    total: 34.0,
    items: [
      { description: "Combo La Bembos", quantity: 1, unitPrice: 22.0, total: 22.0 },
      { description: "Papas extra", quantity: 1, unitPrice: 6.0, total: 6.0 },
      { description: "Gaseosa", quantity: 1, unitPrice: 6.0, total: 6.0 },
    ],
  },
  {
    vendorName: "La Lucha Sanguchería",
    vendorRuc: "20510889551",
    documentType: "Boleta",
    documentNumber: "B002-00099600",
    issueDate: "2026-07-18",
    subtotal: null,
    igv: null,
    total: 47.5,
    items: [
      { description: "Sándwich chicharrón", quantity: 1, unitPrice: 21.5, total: 21.5 },
      { description: "Sándwich de pavo", quantity: 1, unitPrice: 19.5, total: 19.5 },
      { description: "Chicha morada", quantity: 1, unitPrice: 6.5, total: 6.5 },
    ],
  },
  {
    vendorName: "Tottus",
    vendorRuc: "20508565934",
    documentType: "Boleta",
    documentNumber: "B005-00130800",
    issueDate: "2026-07-25",
    subtotal: null,
    igv: null,
    total: 185.6,
    items: [
      { description: "Arroz y menestras", quantity: 1, unitPrice: 35.6, total: 35.6 },
      { description: "Pollo y carnes", quantity: 1, unitPrice: 62.0, total: 62.0 },
      { description: "Lácteos", quantity: 1, unitPrice: 28.0, total: 28.0 },
      { description: "Limpieza del hogar", quantity: 1, unitPrice: 60.0, total: 60.0 },
    ],
  },
  {
    vendorName: "Wong",
    vendorRuc: "20100070970",
    documentType: "Boleta",
    documentNumber: "B007-00349200",
    issueDate: "2026-08-01",
    subtotal: null,
    igv: null,
    total: 199.9,
    items: [
      { description: "Pescado fresco", quantity: 1, unitPrice: 55.9, total: 55.9 },
      { description: "Verduras orgánicas", quantity: 1, unitPrice: 38.0, total: 38.0 },
      { description: "Pan y pastelería", quantity: 1, unitPrice: 26.0, total: 26.0 },
      { description: "Congelados", quantity: 1, unitPrice: 80.0, total: 80.0 },
    ],
  },
  {
    vendorName: "Sodimac",
    vendorRuc: "20389230724",
    documentType: "Boleta",
    documentNumber: "B080-00023456",
    issueDate: "2026-08-05",
    subtotal: null,
    igv: null,
    total: 199.9,
    items: [
      { description: "Pintura interior 1 galón", quantity: 2, unitPrice: 58.5, total: 117.0 },
      { description: "Brochas y rodillos", quantity: 1, unitPrice: 35.0, total: 35.0 },
      { description: "Cinta de embalaje", quantity: 1, unitPrice: 12.9, total: 12.9 },
      { description: "Clavos y tornillos surtido", quantity: 1, unitPrice: 35.0, total: 35.0 },
    ],
  },
];

export async function reseedSyntheticReceipts() {
  const wiped = await prisma.receipt.deleteMany({
    where: { sessionId: DEMO_SESSION_ID, imageMimeType: PLACEHOLDER_MIME },
  });

  for (const s of seeds) {
    await prisma.receipt.create({
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
    });
  }

  const totalCount = await prisma.receipt.count({ where: { sessionId: DEMO_SESSION_ID } });
  return { wiped: wiped.count, created: seeds.length, totalCount };
}
