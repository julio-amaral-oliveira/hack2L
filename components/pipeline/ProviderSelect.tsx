// components/pipeline/ProviderSelect.tsx
// Carrega GET /api/video no mount: mostra os providers disponíveis e aplica
// o default do servidor quando o valor atual não é uma escolha do usuário.

"use client";

import { useEffect, useRef, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VideoProviderId } from "@/lib/contracts";

export const PROVIDER_LABELS: Record<VideoProviderId, string> = {
  openai: "OpenAI (Sora)",
  google: "Google (Veo)",
  mock: "Mock (cache)",
};

export const ALL_PROVIDERS: VideoProviderId[] = ["openai", "google", "mock"];

interface VideoOptions {
  available: VideoProviderId[];
  default: VideoProviderId;
}

interface ProviderSelectProps {
  value: VideoProviderId;
  available: VideoProviderId[];
  onChange: (provider: VideoProviderId) => void;
}

export function ProviderSelect({
  value,
  available,
  onChange,
}: ProviderSelectProps) {
  const [server, setServer] = useState<VideoOptions | null>(null);

  // Ref para o default aplicado uma única vez no mount, sem refetch por
  // mudança de valor.
  const appliedRef = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let active = true;
    fetch("/api/video")
      .then((res) => (res.ok ? (res.json() as Promise<VideoOptions>) : null))
      .then((data) => {
        if (!active || !data) return;
        setServer(data);
        if (!appliedRef.current && data.available.length > 0) {
          appliedRef.current = true;
          // Marca o default do servidor se o valor atual não foi escolhido
          // explicitamente pelo usuário (o pai ainda está no valor inicial).
          if (!data.available.includes(valueRef.current)) {
            onChangeRef.current(data.default);
          }
        }
      })
      .catch(() => {
        /* sem rede: usa a prop available como fallback */
      });
    return () => {
      active = false;
    };
  }, []);

  const options = server?.available ?? available;
  const current = options.includes(value) ? value : (server?.default ?? value);

  return (
    <Select
      value={current}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
    >
      <SelectTrigger aria-label="Provedor de vídeo">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((provider) => (
          <SelectItem key={provider} value={provider}>
            {PROVIDER_LABELS[provider]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
