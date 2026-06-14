# Copa 2026 — Tabela Interativa

Aplicação interativa para acompanhar a Copa do Mundo FIFA 2026.

## Rodando Localmente

```bash
npm run dev
```

Acesse: http://localhost:3000

## Configurando Persistência Cross-Device (Opcional)

Para que os dados sejam sincronizados entre dispositivos, você precisa do Upstash Redis:

1. Acesse https://console.upstash.com e crie uma conta gratuita
2. Crie um novo banco Redis
3. Copie as variáveis de ambiente para `.env.local`:

```
UPSTASH_REDIS_REST_URL=https://seu-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=seu-token
```

**Sem Redis**: A app funciona normalmente mas os dados ficam em memória (resetam ao reiniciar o servidor).

## Deploy na Vercel

1. Push para GitHub
2. Importe no Vercel: https://vercel.com/import
3. Adicione as variáveis de ambiente do Upstash nas configurações do projeto
4. Deploy! 🚀

## Alternativa gratuita: Upstash via Vercel Marketplace

Na dashboard da Vercel, vá em **Storage → Upstash Redis** e crie um banco gratuito. As variáveis serão adicionadas automaticamente.

## Tecnologias

- Next.js 15 (App Router)
- TypeScript
- Zustand (estado)
- Upstash Redis (persistência)
- CSS Modules personalizados
- flagcdn.com (bandeiras)
