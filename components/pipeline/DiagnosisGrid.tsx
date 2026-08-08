// components/pipeline/DiagnosisGrid.tsx
// T3: um card por campo de Diagnosis. O grid aceita Partial<Diagnosis> e se
// preenche aos poucos conforme a entrevista avança. Campo vazio mostra
// "Pendente". Arrays (crencas, objeicoes) viram badges.

"use client";

import { Badge } from "@/components/ui/badge";
import type { AwarenessLevel, Diagnosis } from "@/lib/contracts";

const AWARENESS_LABELS: Record<AwarenessLevel, string> = {
  unaware: "Inconsciente do problema",
  problem_aware: "Consciente do problema",
  solution_aware: "Consciente da solução",
  product_aware: "Consciente do produto",
  most_aware: "Pronto para comprar",
};

const FIELDS: { key: keyof Diagnosis; label: string }[] = [
  { key: "prospect", label: "Prospect" },
  { key: "desejoDominante", label: "Desejo dominante" },
  { key: "nivelConsciencia", label: "Nível de consciência" },
  { key: "sofisticacaoMercado", label: "Sofisticação do mercado" },
  { key: "crencas", label: "Crenças" },
  { key: "objeicoes", label: "Objeções" },
  { key: "mecanismo", label: "Mecanismo" },
  { key: "prova", label: "Prova" },
];

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function formatScalar(key: keyof Diagnosis, value: string): string {
  if (key === "nivelConsciencia") {
    return AWARENESS_LABELS[value as AwarenessLevel] ?? value;
  }
  if (key === "sofisticacaoMercado") {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  return value;
}

interface DiagnosisGridProps {
  diagnosis: Partial<Diagnosis>;
}

export function DiagnosisGrid({ diagnosis }: DiagnosisGridProps) {
  return (
    <section className="grid gap-2 sm:grid-cols-2">
      {FIELDS.map(({ key, label }) => {
        const valor = diagnosis[key];
        const vazio = isEmpty(valor);
        return (
          <div
            key={key}
            className="flex min-h-16 flex-col gap-1.5 rounded-lg border bg-card px-3 py-2.5"
          >
            <span className="text-xs font-medium text-muted-foreground uppercase">
              {label}
            </span>
            {vazio ? (
              <span className="text-sm text-muted-foreground italic">
                Pendente
              </span>
            ) : Array.isArray(valor) ? (
              <div className="flex flex-wrap gap-1">
                {valor.map((item, indice) => (
                  <Badge key={`${key}-${indice}`} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </div>
            ) : typeof valor === "string" ? (
              <span className="text-sm">{formatScalar(key, valor)}</span>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
