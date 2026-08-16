import { reseedSyntheticReceipts } from "@/lib/demo-seed-data";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = process.env.ADMIN_SEED_SECRET;

  if (!expected || auth !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await reseedSyntheticReceipts();
  return Response.json(result);
}
