// components/pipeline/VideoPanel.tsx
// Player <video>, seleção do provider de vídeo e geração com progresso.
// O clique em "Gerar vídeo" chama a prop onGenerate (a T8 liga ao
// orquestrador); o progresso mostra a mensagem padrão da geração.

"use client";

import { useState } from "react";
import { Clapperboard, Loader2, RotateCcw, Video } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { VideoGenResult, VideoProviderId } from "@/lib/contracts";

import { ALL_PROVIDERS, ProviderSelect } from "./ProviderSelect";

interface VideoPanelProps {
  video: VideoGenResult | null;
  onGenerate: () => void;
}

export function VideoPanel({ video, onGenerate }: VideoPanelProps) {
  const [provider, setProvider] = useState<VideoProviderId>("mock");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setIsGenerating(true);
    try {
      await onGenerate();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha na geração do vídeo."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clapperboard className="size-4 text-muted-foreground" />
          Vídeo
        </CardTitle>
        <CardDescription>
          Vídeo vertical 9:16 gerado pela API de vídeo.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {video ? (
          <video
            key={video.videoUrl}
            src={video.videoUrl}
            controls
            playsInline
            className="aspect-[9/16] max-h-96 w-full rounded-lg border bg-black"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-lg border bg-muted/40">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Video className="size-10" />
              <span className="text-sm">Nenhum vídeo gerado ainda.</span>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <ProviderSelect
            value={provider}
            available={ALL_PROVIDERS}
            onChange={setProvider}
          />
          {video ? (
            <Badge variant="secondary">
              {video.fromCache ? "do cache" : "novo"}
            </Badge>
          ) : null}
          {video ? (
            <span className="text-xs text-muted-foreground">
              {video.videoUrl}
            </span>
          ) : null}
        </div>
        {isGenerating ? (
          <div className="flex flex-col gap-2" role="status">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Gerando vídeo, isso pode levar até 4 minutos
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
            <span className="text-destructive">{error}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              className="w-fit"
            >
              <RotateCcw />
              Tentar novamente
            </Button>
          </div>
        ) : (
          <Button type="button" onClick={handleGenerate}>
            Gerar vídeo
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
