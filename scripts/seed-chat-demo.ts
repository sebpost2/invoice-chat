import "dotenv/config"
import { prisma, DEMO_SESSION_ID } from "../src/lib/prisma"
import { seeds, reseedSyntheticReceipts } from "../src/lib/demo-seed-data"

async function main() {
  console.log(`🌱 Sembrando ${seeds.length} boletas sintéticas en sessionId="${DEMO_SESSION_ID}"...\n`)

  const { wiped, totalCount } = await reseedSyntheticReceipts()

  console.log(`   🧹 ${wiped} sintéticas previas eliminadas (las 3 reales del extractor quedan intactas).\n`)
  for (const s of seeds) {
    console.log(`   ✓ ${s.issueDate} | ${s.vendorName.padEnd(24)} | ${s.documentType} | S/ ${s.total.toFixed(2)}`)
  }
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
