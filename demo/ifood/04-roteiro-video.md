# iFood "A conta" — 16s · 9:16 · 1080×1920

1 reference image + 2 silent 8s takes. Handheld phone look, real Brazilian delivery kitchen, late night.

**Language:** voiceover and all on-screen text stay in **Brazilian Portuguese — do not translate**. Prompts are English on purpose. Use a **native pt-BR** ElevenLabs voice.

## 1. REFERENCE IMAGE — generate first, reuse in BOTH takes

```
Vertical 9:16 photographic portrait, candid phone snapshot. Brazilian woman
~35, dark hair in a low bun with loose strands, brown skin with real texture
and end-of-shift sheen, no makeup, plain charcoal-grey t-shirt under a dark
kitchen apron open at the neck. Behind the counter of a small real Brazilian
delivery kitchen: scuffed stainless steel, stacked plastic containers,
takeout packaging, masking tape with handwriting. Cold overhead fluorescent
light, late night, warm glow spilling from off-frame. Tired but steady, brow
slightly furrowed, looking slightly off-camera. Imperfect framing, sensor
grain, natural colors, soft depth of field, visible pores. Photorealistic,
documentary.
```

## 2. TAKE 1 — 0.0–5.1s, cut right after the glance at camera

```
Vertical 9:16 handheld phone video, small natural camera movement. Use
exactly the woman from the reference image: same face, low bun, charcoal-grey
t-shirt with dark apron, same kitchen, same cold late-night light.

She leans over the counter with two phones propped side by side, screens
facing her and out of camera view, a desk calculator beside them. She shifts
her gaze between one phone and the other, taps two or three numbers into the
calculator, stops, breathes in through her nose, glances briefly at camera
with chin still lowered — not defeat, someone who already figured out the
game — then looks back down. Restrained performance, micro-expressions,
documentary, one continuous shot, no cuts. Defocused background, realistic
skin, subtle phone-camera grain.
```

## 3. TAKE 2 — 8.2–14.0s

```
Vertical 9:16 handheld phone video, casual and realistic. Use exactly the
woman from the reference image: same face, low bun, charcoal-grey t-shirt
with dark apron, same kitchen, same cold late-night light.

Only one phone in her hand now, screen facing her and out of camera view; the
calculator is closed and pushed to the far corner of the counter. She reads
for a moment, gives one short affirmative nod, lifts her eyes to camera for
about a second with a small contained smile — not relief, someone who just
had a task lifted off their back — then leans her back against the counter
and drops one shoulder. Keep clean space on the right side and lower half of
frame for text added later. One continuous shot, no cuts, smooth handheld,
defocused containers behind, realistic skin, subtle grain.
```

## 4. NEGATIVE PROMPT — paste into all three generations

```
speech, lip sync, mouth movement, music, text, captions, logos, watermark,
legible phone screen, studio lighting, tripod, slow motion, overacting,
dramatic sadness, celebration, TV-commercial look
```

## 5. INSERTS — static assets, NOT AI video

**A** = messy spreadsheet, many columns, red cells, handwriting. **B** = clean neutral UI: cost + fee + margin in, suggested price out.

## 6. VOICEOVER — ElevenLabs, pt-BR, verbatim

Conversational, not announcer. No pitch lift at sentence end. One file per line.

| In | Line | Target |
|---|---|---:|
| 0.2s | Toda taxa zero tem prazo de validade. | 2.0s |
| 2.4s | Você já sabia disso. | 1.2s |
| 3.8s | O que muda toda semana é a sua conta. | 2.2s |
| 6.2s | E quem faz essa conta, de madrugada, é você. | 2.7s |
| 9.2s | Devia ser o contrário. | 1.4s |
| 11.0s | Quem tem os seus números devia te dar o preço. | 2.4s |

## 7. TIMELINE — burned-in text, pt-BR

| Time | Video | Text |
|---|---|---|
| 0.0–2.2s | Take 1 | TODA TAXA ZERO TEM PRAZO DE VALIDADE. |
| 2.2–3.7s | Take 1, glance at camera | VOCÊ JÁ SABIA. |
| 3.7–5.1s | Take 1 | O QUE MUDA É A SUA CONTA. |
| 5.1–6.6s | Insert A | VOCÊ FAZENDO A CONTA. |
| 6.6–8.2s | Insert B | A GENTE FAZENDO A CONTA. |
| 8.2–10.9s | Take 2 | DEVIA SER O CONTRÁRIO. |
| 10.9–14.0s | Take 2 + 3 cards | CUSTO · TAXA · MARGEM<br>O PREÇO CERTO, TODA SEMANA. |
| 14.0–16.0s | Black | iFOOD PARA PARCEIROS<br>QUEM FAZ A CONTA SOMOS NÓS. |

Heavy sans-serif, white on black, one red keyword per card, inside central 70%. No CTA.

## GUARDRAILS
- No fee percentage, no competitor named or shown, no CADE reference.
- Insert B is a **concept**: neutral unbranded UI, never a simulated real iFood feature.
- No promise of sales, margin or any number.
- Same character both takes. Calculator in take 1, **absent in take 2**.
- **"QUEM FAZ A CONTA SOMOS NÓS"** — never "a conta é nossa": reads as *we pay the bill*.
- Hackathon exercise, not official iFood. No logo or brand sign-off.
