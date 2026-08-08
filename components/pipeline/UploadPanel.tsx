// components/pipeline/UploadPanel.tsx
// T3: upload de arquivos (.txt/.md/.markdown), textarea "Ou cole o contexto
// da marca" (vira o arquivo virtual contexto.md), POST /api/ingest com
// estados de loading e erro. Sucesso chama a prop onDigest com o BrandDigest.

"use client";

import { useRef, useState, type ChangeEvent } from "react";

import { AlertCircle, FileText, Loader2, Trash2, Upload } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { BrandDigest } from "@/lib/contracts";

const ACCEPT = ".txt,.md,.markdown";

const ALLOWED_EXTENSION = /\.(txt|md|markdown)$/i;

function formatBytes(bytes: number): string {
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

interface UploadPanelProps {
  onDigest?: (digest: BrandDigest) => void;
}

export function UploadPanel({ onDigest }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [contexto, setContexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [digest, setDigest] = useState<BrandDigest | null>(null);

  const podeEnviar =
    !loading && (arquivos.length > 0 || contexto.trim().length > 0);

  function handleFilesChange(e: ChangeEvent<HTMLInputElement>) {
    const selecionados = Array.from(e.target.files ?? []);
    const validos = selecionados.filter((arquivo) =>
      ALLOWED_EXTENSION.test(arquivo.name)
    );
    const invalidos = selecionados.filter(
      (arquivo) => !ALLOWED_EXTENSION.test(arquivo.name)
    );
    if (invalidos.length > 0) {
      setErro(
        `Formato não suportado: ${invalidos
          .map((arquivo) => arquivo.name)
          .join(", ")}. Envie apenas arquivos .txt, .md ou .markdown.`
      );
    }
    if (validos.length > 0) {
      setArquivos((atual) => [...atual, ...validos]);
      setErro(null);
    }
    e.target.value = "";
  }

  function removerArquivo(nome: string) {
    setArquivos((atual) => atual.filter((arquivo) => arquivo.name !== nome));
  }

  async function aprender() {
    setLoading(true);
    setErro(null);
    setDigest(null);
    try {
      const form = new FormData();
      arquivos.forEach((arquivo) => form.append("files", arquivo));
      if (contexto.trim()) {
        form.append(
          "files",
          new File([contexto], "contexto.md", { type: "text/markdown" })
        );
      }
      const res = await fetch("/api/ingest", { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as
        | (BrandDigest & { message?: string })
        | null;
      if (!res.ok || !data) {
        throw new Error(
          data?.message ?? "Falha na ingestão da marca. Tente novamente."
        );
      }
      setDigest(data);
      onDigest?.(data);
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : "Falha na ingestão da marca. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aprender</CardTitle>
        <CardDescription>
          Envie os arquivos da marca ou cole o contexto. O sistema condensa o
          material em um resumo para a entrevista.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            onChange={handleFilesChange}
            disabled={loading}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">
            Formatos aceitos: .txt, .md e .markdown. Total de até 200 KB.
          </p>
        </div>

        {arquivos.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {arquivos.map((arquivo) => (
              <li
                key={`${arquivo.name}-${arquivo.size}`}
                className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{arquivo.name}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {formatBytes(arquivo.size)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remover ${arquivo.name}`}
                    onClick={() => removerArquivo(arquivo.name)}
                    disabled={loading}
                  >
                    <Trash2 />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="contexto" className="text-sm font-medium">
            Ou cole o contexto da marca
          </label>
          <Textarea
            id="contexto"
            placeholder="Cole aqui o contexto da marca: o que vende, quem é o público, dores, tom de voz, campanhas..."
            value={contexto}
            onChange={(e) => setContexto(e.target.value)}
            disabled={loading}
          />
        </div>

        <Separator />

        <Button type="button" onClick={aprender} disabled={!podeEnviar}>
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Upload />
          )}
          {loading ? "Aprendendo..." : "Aprender sobre a marca"}
        </Button>

        {erro && (
          <p className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{erro}</span>
          </p>
        )}

        {digest && !loading && (
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">Material aprendido</span>
              <Badge variant="secondary">
                {digest.fatos.length} fatos extraídos
              </Badge>
            </div>
            <p className="text-muted-foreground">{digest.resumo}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
