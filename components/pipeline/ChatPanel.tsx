// components/pipeline/ChatPanel.tsx
// Entrevista adaptativa em SSE: histórico em bolhas, tokens ao vivo na bolha
// do assistente e merge do diagnóstico via prop onTurn (T4). O input fica
// desabilitado durante o streaming.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type {
  BrandDigest,
  ChatMessage,
  Diagnosis,
  InterviewEvent,
  InterviewTurn,
} from "@/lib/contracts";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  digest: BrandDigest | null;
  partialDiagnosis: Partial<Diagnosis>;
  history: ChatMessage[];
  onTurn: (turn: InterviewTurn) => void;
  /** Avisa o orquestrador quando a entrevista falha (toast/status de erro). */
  onError?: () => void;
}

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

/** Conta campos do diagnóstico com conteúdo real (arrays vazios não contam). */
function countFilledFields(partial: Partial<Diagnosis>): number {
  return DIAGNOSIS_FIELDS.filter((campo) => {
    const valor = partial[campo];
    if (Array.isArray(valor)) return valor.length > 0;
    if (typeof valor === "string") return valor.trim().length > 0;
    return valor !== undefined && valor !== null;
  }).length;
}

/** Decodifica uma linha `data: {...}` do SSE; devolve null fora do formato. */
function parseDataLine(line: string): InterviewEvent | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const raw = trimmed.slice(5).trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as InterviewEvent;
    if (parsed && typeof parsed === "object" && "type" in parsed) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function ChatPanel({
  digest,
  partialDiagnosis,
  history,
  onTurn,
  onError,
}: ChatPanelProps) {
  // `history` é só a semente. NÃO espelhe a prop num useEffect: o pai passa
  // `history={[]}` inline, o que cria um array novo a cada render dele, e o
  // efeito apagava as mensagens sempre que onTurn disparava um dispatch —
  // o usuário dava enter e a conversa sumia. O reset é feito remontando o
  // componente pela prop `key` em page.tsx, que já existe.
  const [messages, setMessages] = useState<ChatMessage[]>(history);
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startedDigestRef = useRef<BrandDigest | null>(null);

  const runInterview = useCallback(
    async (historyToSend: ChatMessage[], forceComplete: boolean) => {
      if (!digest) return;
      setIsStreaming(true);
      setError(null);
      setStreamingText("");
      try {
        const res = await fetch("/api/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            digest,
            history: historyToSend,
            partialDiagnosis,
            forceComplete,
          }),
        });
        if (!res.ok || !res.body) {
          throw new Error(
            `Falha na entrevista (HTTP ${res.status}). Tente novamente.`
          );
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let turn: InterviewTurn | null = null;
        let hadError = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const event = parseDataLine(line);
            if (!event) continue;
            if (event.type === "token") {
              setStreamingText((prev) => prev + event.value);
            } else if (event.type === "turn") {
              turn = event.value;
              onTurn(event.value);
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: event.value.message },
              ]);
              setStreamingText("");
            } else if (event.type === "error") {
              hadError = true;
              setError(event.message);
              onError?.();
            }
          }
        }

        if (!turn && !hadError) {
          throw new Error("A entrevista terminou sem um turno válido.");
        }
      } catch (erro) {
        setError(
          erro instanceof Error ? erro.message : "Falha na entrevista. Tente novamente."
        );
        console.error("Entrevista falhou:", erro);
        onError?.();
      } finally {
        setStreamingText("");
        setIsStreaming(false);
      }
    },
    [digest, partialDiagnosis, onTurn, onError]
  );

  // A entrevista começa sozinha quando o digest chega e ainda não há histórico.
  // `messages` (estado local) é a fonte da verdade aqui, não a prop `history`.
  useEffect(() => {
    if (!digest || messages.length > 0 || isStreaming) return;
    if (startedDigestRef.current === digest) return;
    startedDigestRef.current = digest;
    runInterview([], false);
  }, [digest, messages.length, isStreaming, runInterview]);

  // Mantém o fim do chat visível durante o streaming.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamingText, isStreaming]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || isStreaming || !digest) return;
    const userMessage: ChatMessage = { role: "user", content };
    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setDraft("");
    await runInterview(nextHistory, false);
  };

  const closeNow = async () => {
    if (isStreaming || !digest) return;
    await runInterview(messages, true);
  };

  const filledFields = countFilledFields(partialDiagnosis);
  const canSend = !isStreaming && digest !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrevista</CardTitle>
        <CardDescription>
          {digest
            ? `Contexto pronto (${digest.arquivos.length} arquivos). O entrevistador vai fechar o diagnóstico.`
            : "A entrevista começa depois do upload da marca."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ScrollArea className="h-64 rounded-md border bg-muted/40 p-3">
          <div className="flex flex-col gap-2">
            {messages.length === 0 && !isStreaming ? (
              <p className="text-sm text-muted-foreground">
                {digest
                  ? "Preparando a primeira pergunta…"
                  : "Envie o contexto da marca para começar a entrevista."}
              </p>
            ) : null}
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                  message.role === "user"
                    ? "self-end bg-primary text-primary-foreground"
                    : "self-start bg-card ring-1 ring-foreground/10"
                )}
              >
                {message.content}
              </div>
            ))}
            {isStreaming && streamingText ? (
              <div className="max-w-[85%] self-start whitespace-pre-wrap rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-foreground/10">
                {streamingText}
                <span
                  className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-foreground/50 align-middle"
                  aria-hidden
                />
              </div>
            ) : null}
            {isStreaming && !streamingText ? (
              <div className="flex items-center gap-2 self-start rounded-lg bg-card px-3 py-2 text-sm text-muted-foreground ring-1 ring-foreground/10">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Pensando…
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
        >
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={!canSend}
            placeholder={
              isStreaming
                ? "Entrevistador respondendo…"
                : "Responda ao entrevistador…"
            }
            aria-label="Resposta da entrevista"
          />
          <Button
            type="submit"
            disabled={!canSend || !draft.trim()}
            size="icon"
            aria-label="Enviar resposta"
          >
            <Send aria-hidden />
          </Button>
        </form>
        <Separator />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            Diagnóstico parcial:
          </span>
          {filledFields > 0 ? (
            <Badge variant="secondary">
              {filledFields}/8 campos preenchidos
            </Badge>
          ) : (
            <Badge variant="outline">Nenhum campo ainda</Badge>
          )}
          {isStreaming ? (
            <Badge variant="outline">Entrevistando…</Badge>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          className="self-start"
          disabled={!digest || isStreaming}
          onClick={closeNow}
        >
          Fechar diagnóstico agora
        </Button>
      </CardContent>
    </Card>
  );
}
