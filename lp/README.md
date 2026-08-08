# BrandLoop — Landing Page

LP one-page que recebe o tráfego de leads: **https://brandloop-lp.vercel.app**

## Estrutura

- `index.html` — a página (estática, sem framework)
- `api/waitlist.js` — Vercel Function da lista de espera (salva no Vercel Blob, privado)
- `package.json` + `package-lock.json` — dependência `@vercel/blob`. **O lockfile é obrigatório**: sem ele o build resolve o workspace pnpm da raiz do repo e a function quebra. Se mudar dependências: `npm install --package-lock-only`.

## Deploy

Projeto Vercel `brandloop-lp` (team bonatti-programas), conectado ao fork `natti-jpb/hack2L` com Root Directory = `lp`.

- Push na `main` deste repo → um robô no fork ([sync a cada 5 min](https://github.com/natti-jpb/hack2L/actions)) espelha a main → a Vercel deploya automaticamente.
- Ou seja: **mexeu em `lp/`, fez push na main, em ~5 min está no ar.** Nada manual.

## Lista de espera

Os botões "Testar gratuitamente" abrem um modal que salva o email via `POST /api/waitlist`.

Pra baixar a lista: `GET https://brandloop-lp.vercel.app/api/waitlist?key=<WAITLIST_KEY>` (adicione `&format=csv` pra planilha). A chave está nas env vars do projeto na Vercel.
