// lib/mocks/campaign.ts — mock de campanha no Google Ads (T7).
// Espera 1,5 s e monta um CampaignResult a partir do Diagnosis recebido,
// sem chamada de LLM: a segmentação é derivada de prospect e
// desejoDominante com template strings.

import type { CampaignResult, Diagnosis } from "@/lib/contracts";

const DEFAULT_LANDING_PAGE = "https://brandloop-lp.vercel.app";

export async function mockCampaign(
  diagnosis: Diagnosis
): Promise<CampaignResult> {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Fallbacks só para payloads malformados; um Diagnosis válido traz ambos.
  const prospect = diagnosis.prospect?.trim() || "público da marca";
  const desejoDominante =
    diagnosis.desejoDominante?.trim() || "desejo dominante da marca";

  return {
    plataforma: "google-ads",
    status: "ativa",
    landingPage: process.env.LANDING_PAGE_URL ?? DEFAULT_LANDING_PAGE,
    orcamentoDiario: 50,
    segmentacao: [
      `Público-alvo: ${prospect}`,
      `Desejo dominante: ${desejoDominante}`,
      `Oferta: ${desejoDominante} para ${prospect}`,
    ],
    simulado: true,
  };
}
