// components/pipeline/Stepper.tsx — as quatro etapas do pipeline com status colorido.

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Clock,
  LoaderCircle,
  Megaphone,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";

import type { StepId, StepStatus } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const STEP_ORDER: StepId[] = [
  "aprender",
  "criativo",
  "publicar",
  "campanha",
];

export const STEP_META: Record<StepId, { label: string; icon: LucideIcon }> = {
  aprender: { label: "Aprender", icon: BookOpen },
  criativo: { label: "Criativo", icon: Sparkles },
  publicar: { label: "Publicar", icon: Send },
  campanha: { label: "Campanha", icon: Megaphone },
};

export const STATUS_META: Record<
  StepStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  pendente: {
    label: "Pendente",
    icon: CircleDashed,
    className: "text-muted-foreground",
  },
  em_andamento: {
    label: "Em andamento",
    icon: LoaderCircle,
    className: "text-blue-500 animate-spin",
  },
  aguardando_aprovacao: {
    label: "Aguardando aprovação",
    icon: Clock,
    className: "text-amber-500",
  },
  concluido: {
    label: "Concluído",
    icon: CircleCheck,
    className: "text-emerald-500",
  },
  erro: {
    label: "Erro",
    icon: CircleAlert,
    className: "text-red-500",
  },
};

interface StepperProps {
  status: Record<StepId, StepStatus>;
  /** Botão de retry aparece na etapa em erro (integração T8). */
  onRetry?: (step: StepId) => void;
}

export function Stepper({ status, onRetry }: StepperProps) {
  return (
    <ol
      className="flex flex-wrap items-center gap-x-1.5 gap-y-2"
      aria-label="Etapas do pipeline"
    >
      {STEP_ORDER.map((stepId, index) => {
        const step = STEP_META[stepId];
        const stepStatus = status[stepId];
        const statusMeta = STATUS_META[stepStatus];
        const StepIcon = step.icon;
        const StatusIcon = statusMeta.icon;
        return (
          <li key={stepId} className="flex items-center gap-1.5">
            {index > 0 && (
              <span
                aria-hidden
                className="mr-1.5 h-px w-5 shrink-0 bg-border"
              />
            )}
            <span
              className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 transition-colors duration-300"
            >
              <StepIcon className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">{step.label}</span>
              <StatusIcon
                data-testid={`status-${stepId}`}
                className={cn("size-4", statusMeta.className)}
                aria-hidden
              />
              {stepStatus === "erro" && onRetry ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-6 text-destructive hover:text-destructive"
                  onClick={() => onRetry(stepId)}
                  aria-label={`Tentar novamente: ${step.label}`}
                  title="Tentar novamente"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              ) : null}
            </span>
            <span className="sr-only">{statusMeta.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
