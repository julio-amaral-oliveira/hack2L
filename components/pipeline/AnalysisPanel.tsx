// components/pipeline/AnalysisPanel.tsx — caixa "Aprender": análise de mercado
// via Gorilla. Durante a busca mostra o statusText ao vivo; com a análise
// pronta mostra assunto, resumo, crenças e objeções com links de evidência,
// linguagem do prospect, concorrentes, mecanismo sugerido e provas. O botão
// "Aprovar e gerar copy" aciona a prop onApprove (gate humano 2).

"use client";

import {
  ExternalLink,
  LineChart,
  Loader2,
  Quote,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Users,
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
import type {
  AwarenessLevel,
  MarketAnalysis,
  MarketConcorrente,
  MarketEvidence,
} from "@/lib/contracts";
import { cn } from "@/lib/utils";

interface AnalysisPanelProps {
  research: MarketAnalysis | null;
  running: boolean;
  statusText: string;
  onApprove: () => void;
  onRetry?: () => void;
}

const AWARENESS_LABELS: Record<AwarenessLevel, string> = {
  unaware: "Inconsciente do problema",
  problem_aware: "Consciente do problema",
  solution_aware: "Consciente da solução",
  product_aware: "Consciente do produto",
  most_aware: "Pronto para comprar",
};

const SOFISTICACAO_LABELS: Record<MarketAnalysis["sofisticacaoMercado"], string> = {
  baixa: "Baixa (promessas comuns ainda funcionam)",
  media: "Média (exige diferenciação no mecanismo)",
  alta: "Alta (exige mecanismo e ângulo novos)",
};

function EvidenceLink({ texto, evidencia_url }: MarketEvidence) {
  return (
    <li className="flex flex-col gap-0.5">
      <span className="text-sm">{texto}</span>
      <a
        href={evidencia_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-4"
      >
        <ExternalLink className="size-3" />
        Ver evidência
      </a>
    </li>
  );
}

function ConcorrenteRow({ concorrente }: { concorrente: MarketConcorrente }) {
  return (
    <li className="flex flex-col gap-0.5 rounded-md border px-3 py-2 text-sm">
      <span className="font-medium">{concorrente.concorrente}</span>
      <span className="text-xs text-muted-foreground">{concorrente.motivo}</span>
      <a
        href={concorrente.evidencia_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-4"
      >
        <ExternalLink className="size-3" />
        Ver evidência
      </a>
    </li>
  );
}

function SectionTitle({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase">
      {icon}
      {children}
    </span>
  );
}

export function AnalysisPanel({
  research,
  running,
  statusText,
  onApprove,
  onRetry,
}: AnalysisPanelProps) {
  const vazio = !research && !running;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2">
            <LineChart className="size-4 text-muted-foreground" />
            Análise de mercado
          </CardTitle>
          <CardDescription>
            Como o mercado fala sobre o problema do prospect (pesquisa real na
            Gorilla).
          </CardDescription>
        </div>
        {research ? (
          <Badge variant="secondary">
            {research.creditosGastos > 0
              ? `${research.creditosGastos} créditos`
              : "Análise pronta"}
          </Badge>
        ) : running ? (
          <Badge variant="outline">Pesquisando…</Badge>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {running ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
            <p aria-live="polite">{statusText || "Iniciando a pesquisa..."}</p>
          </div>
        ) : null}

        {vazio ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            <Search className="size-6" />
            <p>
              A análise aparece aqui depois que o diagnóstico for aprovado.
            </p>
            {onRetry ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="mt-1"
              >
                <RefreshCw />
                Tentar novamente
              </Button>
            ) : null}
          </div>
        ) : null}

        {research ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 px-4 py-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">
                  <Target className="size-3" />
                  {research.estadoDeConsciencia
                    ? AWARENESS_LABELS[research.estadoDeConsciencia]
                    : research.estadoDeConsciencia}
                </Badge>
                <Badge variant="outline">
                  {SOFISTICACAO_LABELS[research.sofisticacaoMercado]}
                </Badge>
              </div>
              <p className="text-lg leading-snug font-semibold">
                {research.assunto}
              </p>
              <p className="text-sm text-muted-foreground">{research.resumo}</p>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Prospect
                </span>
                <p className="mt-0.5">{research.prospect}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Desejo dominante
                </span>
                <p className="mt-0.5">{research.desejoDominante}</p>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-3">
              <SectionTitle icon={<Users className="size-3" />}>
                Linguagem do prospect
              </SectionTitle>
              {research.linguagem.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {research.linguagem.map((frase, index) => (
                    <blockquote
                      key={index}
                      className="flex items-start gap-2 rounded-md border-l-2 border-primary bg-muted/30 px-3 py-2 text-sm italic"
                    >
                      <Quote className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">{frase}</span>
                    </blockquote>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem citações.</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <SectionTitle icon={<Sparkles className="size-3" />}>
                  Crenças
                </SectionTitle>
                {research.crencas.length > 0 ? (
                  <ul className="flex flex-col gap-2.5">
                    {research.crencas.map((crenca, index) => (
                      <EvidenceLink key={index} {...crenca} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem crenças.</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <SectionTitle icon={<Sparkles className="size-3" />}>
                  Objeções
                </SectionTitle>
                {research.objeicoes.length > 0 ? (
                  <ul className="flex flex-col gap-2.5">
                    {research.objeicoes.map((objecao, index) => (
                      <EvidenceLink key={index} {...objecao} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem objeções.</p>
                )}
              </div>
            </div>

            {research.concorrentes.length > 0 ? (
              <div className="flex flex-col gap-2">
                <SectionTitle icon={<Users className="size-3" />}>
                  Concorrentes mencionados
                </SectionTitle>
                <ul className="flex flex-col gap-2">
                  {research.concorrentes.map((concorrente, index) => (
                    <ConcorrenteRow key={index} concorrente={concorrente} />
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 rounded-md border px-3 py-2.5 text-sm">
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Mecanismo sugerido
                </span>
                <p className="mt-0.5">{research.mecanismoSugerido}</p>
              </div>
              {research.prova.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    Provas do mercado
                  </span>
                  <ul className="flex flex-col gap-2">
                    {research.prova.map((prova, index) => (
                      <EvidenceLink key={index} {...prova} />
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <Button
              type="button"
              onClick={onApprove}
              className={cn("self-start")}
            >
              <Sparkles />
              Aprovar e gerar copy
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
