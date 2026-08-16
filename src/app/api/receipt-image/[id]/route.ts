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
