// lib/mocks/publish.ts — mock de publicação no YouTube Shorts (T7).
// Espera 1,5 s e devolve um PublishResult com URL fake. Sem integração real.

import type { PublishResult } from "@/lib/contracts";

const SUFFIX_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomSuffix(length = 6): string {
  let suffix = "";
  for (let i = 0; i < length; i += 1) {
    suffix += SUFFIX_CHARS[Math.floor(Math.random() * SUFFIX_CHARS.length)];
  }
  return suffix;
}

export async function mockPublish(): Promise<PublishResult> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return {
    plataforma: "youtube-shorts",
    status: "publicado",
    url: `https://youtube.com/shorts/brandloop-${randomSuffix()}`,
    simulado: true,
  };
}
