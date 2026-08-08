// app/api/publish/route.ts — mock de publicação no YouTube Shorts (T7).
// POST sem corpo: devolve um PublishResult simulado.

import { NextResponse } from "next/server";

import { mockPublish } from "@/lib/mocks/publish";

export async function POST(): Promise<NextResponse> {
  try {
    const result = await mockPublish();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { message: "Falha ao simular a publicação no YouTube Shorts." },
      { status: 500 }
    );
  }
}
