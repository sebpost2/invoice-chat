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
