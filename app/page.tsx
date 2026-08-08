// app/page.tsx — integração ponta a ponta do pipeline (T8).
// Todo o estado vem do usePipeline (lib/orchestrator.ts): cada caixa é uma
// rota de API e o stepper avança conforme os status reais. Os dois gates
// humanos (aprovar diagnóstico e aprovar copy) dirigem o fluxo.

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, RotateCcw } from "lucide-react";

import type {
  AwarenessLevel,
  BrandDigest,
  ChatMessage,
  Diagnosis,
  InterviewTurn,
  StepId,
  VideoProviderId,
} from "@/lib/contracts";
import { usePipeline } from "@/lib/orchestrator";

import { AnalysisPanel } from "@/components/pipeline/AnalysisPanel";
import { ChatPanel } from "@/components/pipeline/ChatPanel";
import { CopyPanel } from "@/components/pipeline/CopyPanel";
import { DiagnosisGrid } from "@/components/pipeline/DiagnosisGrid";
import { MocksPanel } from "@/components/pipeline/MocksPanel";
import { Stepper } from "@/components/pipeline/Stepper";
import { UploadPanel } from "@/components/pipeline/UploadPanel";
import { VideoPanel } from "@/components/pipeline/VideoPanel";
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
import { Toaster } from "@/components/ui/sonner";

const LANDING_PAGE_URL = "https://brandloop-lp.vercel.app";

// Referência estável. Um `history={[]}` inline criaria um array novo a cada
// render e faria o ChatPanel remontar o histórico do zero. O reset da
// entrevista é feito pela prop `key`, não por essa prop.
const EMPTY_HISTORY: ChatMessage[] = [];

const DIAGNOSIS_FIELDS: (keyof Diagnosis)[] = [
  "prospect",
  "desejoDominante",
  "nivelConsciencia",
  "sofisticacaoMercado",
  "crencas",
  "objeicoes",
  "mecanismo",
  "prova",
];

const AWARENESS_LABELS: Record<AwarenessLevel, string> = {
  unaware: "Inconsciente do problema",
  problem_aware: "Consciente do problema",
  solution_aware: "Consciente da solução",
  product_aware: "Consciente do produto",
  most_aware: "Pronto para comprar",
};

/** Os oito campos do diagnóstico precisam ter conteúdo antes de aprovar. */
function isDiagnosisComplete(partial: Partial<Diagnosis>): boolean {
  return DIAGNOSIS_FIELDS.every((campo) => {
    const valor = partial[campo];
    if (Array.isArray(valor)) return valor.length > 0;
    if (typeof valor === "string") return valor.trim().length > 0;
    return valor !== undefined && valor !== null;
  });
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export default function Home() {
  const {
    state,
    dispatch,
    setStatus,
    callResearch,
    callCopy,
    callVideo,
    callPublish,
    callCampaign,
    reset,
  } = usePipeline();

  const [chatKey, setChatKey] = useState(0);
  const [researchBusy, setResearchBusy] = useState(false);
  const [researchStatusText, setResearchStatusText] = useState("");
  const [copyBusy, setCopyBusy] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);

  const { copy, video, publish, campaign, status } = state;

  // ---- Etapa Aprender -----------------------------------------------------

  // O UploadPanel faz o POST /api/ingest e entrega o BrandDigest pronto.
  const handleDigest = useCallback(
    (digest: BrandDigest) => {
      dispatch({ type: "SET_DIGEST", digest });
      setStatus("aprender", "em_andamento");
      setChatKey((key) => key + 1); // remonta o chat para uma entrevista nova
    },
    [dispatch, setStatus]
  );

  // Cada turno da entrevista faz merge do diagnóstico parcial ao vivo.
  const handleTurn = useCallback(
    (turn: InterviewTurn) => {
      if (turn.diagnosis && Object.keys(turn.diagnosis).length > 0) {
        dispatch({ type: "MERGE_PARTIAL_DIAGNOSIS", partial: turn.diagnosis });
      }
      if (turn.complete) {
        setStatus("aprender", "aguardando_aprovacao");
      }
    },
    [dispatch, setStatus]
  );

  const handleInterviewError = useCallback(() => {
    setStatus("aprender", "erro");
    toast.error("A entrevista falhou. Tente novamente.");
  }, [setStatus]);

  // Gate humano 1: fixa o Diagnosis e inicia a análise de mercado (Gorilla).
  // A copy só é gerada depois que a análise for aprovada (gate humano 2).
  const handleApproveDiagnosis = useCallback(async () => {
    const { digest, partialDiagnosis } = state;
    if (!digest) return;
    if (!isDiagnosisComplete(partialDiagnosis)) {
      toast.error("Diagnóstico incompleto. Responda as perguntas pendentes.");
      return;
    }
    const diagnosis = partialDiagnosis as Diagnosis;
    dispatch({ type: "SET_DIAGNOSIS", diagnosis });
    setResearchBusy(true);
    setResearchStatusText("Preparando a análise de mercado…");
    setStatus("aprender", "em_andamento");
    try {
      await callResearch(
        { digest, diagnosis },
        {
          onStatus: (value) => setResearchStatusText(value),
          onAnalysis: () => setStatus("aprender", "aguardando_aprovacao"),
        }
      );
    } catch (err) {
      setStatus("aprender", "erro");
      toast.error(
        errorMessage(
          err,
          "A análise de mercado falhou. Tente novamente."
        )
      );
    } finally {
      setResearchBusy(false);
    }
  }, [state, dispatch, setStatus, callResearch]);

  // Gate humano 2 ("Aprovar e gerar copy"): a análise aprovada fecha a etapa
  // aprender e dispara a geração da copy.
  const handleApproveAnalysis = useCallback(async () => {
    const { digest, diagnosis } = state;
    if (!digest || !diagnosis) return;
    setStatus("aprender", "concluido");
    setStatus("criativo", "em_andamento");
    setCopyBusy(true);
    try {
      await callCopy({ digest, diagnosis });
    } catch (err) {
      setStatus("criativo", "erro");
      toast.error(
        errorMessage(err, "Não foi possível gerar a copy. Tente novamente.")
      );
    } finally {
      setCopyBusy(false);
    }
  }, [state, setStatus, callCopy]);

  // ---- Etapa Criativo -----------------------------------------------------

  const handleRegenerateCopy = useCallback(async () => {
    const { digest, diagnosis } = state;
    if (!digest || !diagnosis) return;
    setCopyBusy(true);
    setStatus("criativo", "em_andamento");
    try {
      await callCopy({ digest, diagnosis });
    } catch (err) {
      setStatus("criativo", "erro");
      toast.error(
        errorMessage(err, "Não foi possível gerar a copy. Tente novamente.")
      );
    } finally {
      setCopyBusy(false);
    }
  }, [state, setStatus, callCopy]);

  // Gera o vídeo com o videoPrompt da copy. Sem provider, a rota usa o
  // default do servidor (VIDEO_PROVIDER) — o mesmo que o seletor aplica.
  const runVideoGeneration = useCallback(
    async (provider?: VideoProviderId) => {
      if (!copy) return;
      setVideoBusy(true);
      setStatus("criativo", "em_andamento");
      try {
        await callVideo(
          provider
            ? { videoPrompt: copy.videoPrompt, provider }
            : { videoPrompt: copy.videoPrompt }
        );
      } catch (err) {
        setStatus("criativo", "erro");
        toast.error(
          errorMessage(err, "Falha na geração do vídeo. Tente novamente.")
        );
      } finally {
        setVideoBusy(false);
      }
    },
    [copy, setStatus, callVideo]
  );

  // Gate humano 2 ("Aprovar e gerar vídeo"): aprova a copy e dispara o vídeo.
  const handleApproveCopy = useCallback(() => {
    runVideoGeneration();
  }, [runVideoGeneration]);

  // ---- Etapa Publicar / Campanha (mocks sob comando do usuário) -----------

  const handlePublish = useCallback(() => {
    setStatus("publicar", "em_andamento");
    return callPublish().catch((err) => {
      setStatus("publicar", "erro");
      toast.error(errorMessage(err, "Falha ao publicar. Tente novamente."));
      throw err; // o painel também mostra o erro inline
    });
  }, [setStatus, callPublish]);

  const handleCampaign = useCallback(() => {
    const { diagnosis } = state;
    if (!diagnosis) {
      toast.error("Aprove o diagnóstico antes de criar a campanha.");
      return Promise.resolve();
    }
    setStatus("campanha", "em_andamento");
    return callCampaign(diagnosis).catch((err) => {
      setStatus("campanha", "erro");
      toast.error(
        errorMessage(err, "Falha ao criar a campanha. Tente novamente.")
      );
      throw err;
    });
  }, [state, setStatus, callCampaign]);

  // ---- Retry por etapa e reset --------------------------------------------

  const handleRetry = useCallback(
    (step: StepId) => {
      if (step === "aprender") {
        if (state.diagnosis) {
          // Diagnóstico já aprovado: retry da análise de mercado.
          setStatus("aprender", "em_andamento");
          void handleApproveDiagnosis();
        } else {
          setStatus("aprender", "em_andamento");
          setChatKey((key) => key + 1); // remonta o chat e reinicia a entrevista
        }
      } else if (step === "criativo") {
        if (state.copy) {
          runVideoGeneration();
        } else {
          handleRegenerateCopy();
        }
      } else if (step === "publicar") {
        handlePublish();
      } else if (step === "campanha") {
        handleCampaign();
      }
    },
    [
      state.diagnosis,
      state.copy,
      setStatus,
      handleApproveDiagnosis,
      runVideoGeneration,
      handleRegenerateCopy,
      handlePublish,
      handleCampaign,
    ]
  );

  const handleReset = useCallback(() => {
    reset();
    setChatKey(0);
  }, [reset]);

  // Avança o stepper conforme os resultados chegam das rotas.
  useEffect(() => {
    if (copy && !copyBusy && !videoBusy && status.criativo === "em_andamento") {
      setStatus("criativo", "aguardando_aprovacao");
    }
    if (video && !videoBusy && status.criativo !== "concluido") {
      setStatus("criativo", "concluido");
    }
    if (publish && status.publicar !== "concluido") {
      setStatus("publicar", "concluido");
    }
    if (campaign && status.campanha !== "concluido") {
      setStatus("campanha", "concluido");
    }
  }, [copy, video, publish, campaign, copyBusy, videoBusy, status, setStatus]);

  const pipelineStarted = Object.values(status).some((s) => s !== "pendente");
  const fluxoConcluido = publish !== null && campaign !== null;
  const gridDiagnosis = { ...state.partialDiagnosis, ...(state.diagnosis ?? {}) };
  const landingHref = campaign?.landingPage ?? LANDING_PAGE_URL;
  const podeAprovar = isDiagnosisComplete(state.partialDiagnosis);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <h1 className="text-xl font-bold tracking-tight">BrandLoop</h1>
              <p className="text-sm text-muted-foreground">
                Pipeline de marketing com agentes
              </p>
            </div>
            {pipelineStarted ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="shrink-0"
              >
                <RotateCcw />
                Recomeçar
              </Button>
            ) : null}
          </div>
          <Stepper status={status} onRetry={handleRetry} />
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        <UploadPanel onDigest={handleDigest} />

        <ChatPanel
          key={chatKey}
          digest={state.digest}
          partialDiagnosis={state.partialDiagnosis}
          history={EMPTY_HISTORY}
          onTurn={handleTurn}
          onError={handleInterviewError}
        />

        {state.digest ? (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <CardTitle>Diagnóstico</CardTitle>
                <CardDescription>
                  O grid se preenche ao vivo durante a entrevista.
                </CardDescription>
              </div>
              {state.diagnosis ? (
                <Badge variant="secondary">
                  <CheckCircle2 className="size-3.5" />
                  Aprovado
                </Badge>
              ) : status.aprender === "aguardando_aprovacao" ? (
                <Badge variant="outline">
                  <Clock className="size-3.5" />
                  Aguardando aprovação
                </Badge>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <DiagnosisGrid diagnosis={gridDiagnosis} />
              {status.aprender === "aguardando_aprovacao" &&
              !state.diagnosis ? (
                <Button
                  type="button"
                  onClick={handleApproveDiagnosis}
                  disabled={!podeAprovar}
                  className="self-start"
                >
                  <CheckCircle2 />
                  Aprovar diagnóstico
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {state.digest && state.diagnosis ? (
          <AnalysisPanel
            research={state.research}
            running={researchBusy}
            statusText={researchStatusText}
            onApprove={handleApproveAnalysis}
            onRetry={() => handleRetry("aprender")}
          />
        ) : null}

        <CopyPanel
          copy={copy}
          onRegenerate={handleRegenerateCopy}
          onApprove={handleApproveCopy}
        />

        <VideoPanel video={video} onGenerate={handleApproveCopy} />

        <MocksPanel
          publish={publish}
          campaign={campaign}
          onPublish={handlePublish}
          onCampaign={handleCampaign}
        />

        {fluxoConcluido && state.diagnosis && copy && video ? (
          <Card className="border-emerald-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                Fluxo concluído
              </CardTitle>
              <CardDescription>
                Diagnóstico, copy, vídeo, publicação e campanha prontos.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    Prospect
                  </span>
                  <p>{state.diagnosis.prospect}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    Desejo dominante
                  </span>
                  <p>{state.diagnosis.desejoDominante}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    Nível de consciência
                  </span>
                  <p>
                    {AWARENESS_LABELS[state.diagnosis.nivelConsciencia] ??
                      state.diagnosis.nivelConsciencia}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    Headline
                  </span>
                  <p>{copy.headline}</p>
                </div>
              </div>
              <Separator />
              <dl className="flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Vídeo</dt>
                  <dd className="break-all">
                    {video.videoUrl} ({video.provider}
                    {video.fromCache ? ", cache" : ""})
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Short publicado</dt>
                  <dd className="break-all">
                    <a
                      href={publish.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-4"
                    >
                      {publish.url}
                    </a>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Campanha</dt>
                  <dd>
                    ativa · R$ {campaign.orcamentoDiario}/dia ·{" "}
                    {campaign.segmentacao.length} segmentos
                  </dd>
                </div>
              </dl>
              <Separator />
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Landing page
                </span>
                <a
                  href={landingHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4"
                >
                  {landingHref}
                </a>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <footer className="pb-4 text-center text-xs text-muted-foreground">
          BrandLoop · demo de hackathon · Publicar e Campanha são simulações
        </footer>
      </main>

      <Toaster position="top-center" richColors />
    </div>
  );
}
