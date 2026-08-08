// app/api/campaign/route.ts — mock de campanha no Google Ads (T7).
// Recebe { diagnosis } e devolve um CampaignResult simulado.

import { NextResponse } from "next/server";

import type { Diagnosis } from "@/lib/contracts";
import { mockCampaign } from "@/lib/mocks/campaign";

export async function POST(request: Request): Promise<NextResponse> {
  let diagnosis: Diagnosis | null = null;
  try {
    const body = (await request.json()) as { diagnosis?: unknown };
    const candidate = body.diagnosis;
    if (
      candidate !== null &&
      typeof candidate === "object" &&
      !Array.isArray(candidate)
    ) {
      diagnosis = candidate as Diagnosis;
    }
  } catch {
    // Corpo ausente ou JSON inválido — tratado abaixo como 400.
  }

  if (!diagnosis) {
    return NextResponse.json(
      { message: 'Envie um corpo JSON com o campo "diagnosis".' },
      { status: 400 }
    );
  }

  try {
    const result = await mockCampaign(diagnosis);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { message: "Falha ao simular a campanha no Google Ads." },
      { status: 500 }
    );
  }
}
