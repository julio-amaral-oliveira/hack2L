// components/pipeline/MocksPanel.tsx
// T7: mocks de Publicar (YouTube Shorts) e Campanha (Google Ads). Cada card
// tem o badge "Simulado", um botão, estados de loading e erro, e mostra o
// payload retornado. O clique dispara a prop onPublish/onCampaign — na T8
// ligada a callPublish/callCampaign do orquestrador — e o payload retornado
// aparece na prop publish/campaign. Para o painel segurar o loading e
// capturar o erro, a prop precisa retornar a promise do fetch (ex.:
// onPublish={() => callPublish()}); com props no-op (T2) ela resolve na hora.

"use client";

import { useState } from "react";

import { AlertCircle, Loader2, Rocket, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { CampaignResult, PublishResult } from "@/lib/contracts";

interface MocksPanelProps {
  publish: PublishResult | null;
  campaign: CampaignResult | null;
  onPublish: () => void;
  onCampaign: () => void;
}

export function MocksPanel({
  publish,
  campaign,
  onPublish,
  onCampaign,
}: MocksPanelProps) {
  const [publishLoading, setPublishLoading] = useState(false);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [campaignError, setCampaignError] = useState<string | null>(null);

  async function handlePublish() {
    setPublishLoading(true);
    setPublishError(null);
    try {
      await Promise.resolve(onPublish());
    } catch (err) {
      setPublishError(
        err instanceof Error
          ? err.message
          : "Falha ao publicar no YouTube Shorts. Tente novamente."
      );
    } finally {
      setPublishLoading(false);
    }
  }

  async function handleCampaign() {
    setCampaignLoading(true);
    setCampaignError(null);
    try {
      await Promise.resolve(onCampaign());
    } catch (err) {
      setCampaignError(
        err instanceof Error
          ? err.message
          : "Falha ao criar a campanha no Google Ads. Tente novamente."
      );
    } finally {
      setCampaignLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="size-4 text-muted-foreground" />
          Publicar e Campanha
        </CardTitle>
        <CardDescription>
          Simulações de publicação no YouTube Shorts e de campanha no Google
          Ads. Nenhuma integração real.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">YouTube Shorts</span>
            <Badge variant="secondary">Simulado</Badge>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handlePublish}
            disabled={publishLoading}
          >
            {publishLoading && <Loader2 className="animate-spin" />}
            {publishLoading
              ? "Publicando..."
              : "Publicar no YouTube Shorts"}
          </Button>
          {publishError ? (
            <p className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{publishError}</span>
            </p>
          ) : publish ? (
            <dl className="flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium">{publish.status}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Plataforma</dt>
                <dd className="font-medium">{publish.plataforma}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">URL</dt>
                <dd className="break-all">{publish.url}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nada publicado ainda. Clique para simular a publicação.
            </p>
          )}
        </div>

        <Separator />

        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Google Ads</span>
            <Badge variant="secondary">Simulado</Badge>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleCampaign}
            disabled={campaignLoading}
          >
            {campaignLoading && <Loader2 className="animate-spin" />}
            {campaignLoading
              ? "Criando campanha..."
              : "Criar campanha no Google Ads"}
          </Button>
          {campaignError ? (
            <p className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{campaignError}</span>
            </p>
          ) : campaign ? (
            <dl className="flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium">{campaign.status}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Plataforma</dt>
                <dd className="font-medium">{campaign.plataforma}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Orçamento diário</dt>
                <dd className="font-medium">
                  R$ {campaign.orcamentoDiario}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">Landing page</dt>
                <dd className="break-all">{campaign.landingPage}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">Segmentação</dt>
                <dd>
                  <ul className="list-disc pl-4">
                    {campaign.segmentacao.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhuma campanha criada ainda. Clique para simular.
            </p>
          )}
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Target className="mt-0.5 size-3.5 shrink-0" />
          Publicar e Campanha são mocks: nenhuma publicação ou campanha real
          é criada.
        </p>
      </CardContent>
    </Card>
  );
}
