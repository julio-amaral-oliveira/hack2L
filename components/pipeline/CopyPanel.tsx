// components/pipeline/CopyPanel.tsx — caixa "Criativo": mostra a copy gerada
// pela rubrica (headline, roteiro por cena, metadados e videoPrompt) com os
// botões Regenerar copy e Aprovar e gerar vídeo. Props do stub T2 preservadas:
// a integração (T8) liga onRegenerate/onApprove ao orquestrador.

"use client";

import { useEffect, useState } from "react";

import {
  CheckCircle2,
  Clapperboard,
  Loader2,
  RefreshCw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

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
import type { CopyPackage } from "@/lib/contracts";

interface CopyPanelProps {
  copy: CopyPackage | null;
  onRegenerate: () => void;
  onApprove: () => void;
}

const FALHA_REGENERAR = "Não foi possível regenerar a copy. Tente novamente.";
const FALHA_APROVAR = "Não foi possível aprovar a copy. Tente novamente.";

export function CopyPanel({ copy, onRegenerate, onApprove }: CopyPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A copy nova chega por prop quando a geração/regeneração termina:
  // encerra o loading e limpa erros.
  useEffect(() => {
    setLoading(false);
    setError(null);
  }, [copy]);

  // Aciona a prop (síncrona na casca T2, assíncrona no fluxo real) e
  // reflete loading/erro. Se o callback devolver uma Promise rejeitada
  // (erro tratado fora), mostra a falha aqui também.
  const run = (action: () => void, falha: string) => {
    setError(null);
    setLoading(true);
    try {
      const result = action() as unknown;
      if (result instanceof Promise) {
        result.catch(() => {
          setLoading(false);
          setError(falha);
        });
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
      setError(falha);
    }
  };

  const semCopy = copy === null;
  const totalSeg = copy
    ? copy.roteiro.reduce((acc, cena) => acc + cena.duracaoSeg, 0)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-muted-foreground" />
          Copy
        </CardTitle>
        <CardDescription>
          Headline, roteiro do vídeo e metadados gerados pela rubrica.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {semCopy ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            <Clapperboard className="size-6" />
            <p>
              A copy aparece aqui depois que o diagnóstico for aprovado.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border bg-muted/40 px-4 py-3">
              <p className="text-xl leading-snug font-semibold">
                {copy.headline}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              {copy.roteiro.map((cena) => (
                <div
                  key={cena.ordem}
                  className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Cena {cena.ordem}
                    </span>
                    <span>{cena.fala}</span>
                    <span className="text-xs text-muted-foreground">
                      Texto na tela: {cena.textoNaTela}
                    </span>
                  </div>
                  <Badge variant="outline">{cena.duracaoSeg}s</Badge>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                {copy.roteiro.length} cenas · {totalSeg}s no total
              </p>
            </div>

            <Separator />

            <div className="flex flex-col gap-3 text-sm">
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Título do vídeo
                </span>
                <p className="mt-0.5">{copy.titulo}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Descrição
                </span>
                <p className="mt-0.5">{copy.descricao}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Hashtags
                </span>
                {copy.hashtags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  CTA
                </span>
                <p className="mt-0.5">
                  <a
                    href={copy.cta}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    {copy.cta}
                  </a>
                </p>
              </div>
            </div>

            <details className="rounded-md border px-3 py-2 text-sm">
              <summary className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                <Clapperboard className="size-4" />
                videoPrompt
              </summary>
              <p className="mt-2 text-xs text-muted-foreground">
                {copy.videoPrompt}
              </p>
            </details>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => run(onRegenerate, FALHA_REGENERAR)}
            disabled={semCopy || loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCw />
            )}
            {loading ? "Gerando copy..." : "Regenerar copy"}
          </Button>
          <Button
            type="button"
            onClick={() => run(onApprove, FALHA_APROVAR)}
            disabled={semCopy || loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <CheckCircle2 />
            )}
            {loading ? "Aguarde..." : "Aprovar e gerar vídeo"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
