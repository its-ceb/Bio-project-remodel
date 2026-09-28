# Cloudflare Workers AI deployment

This project keeps its React frontend on Netlify and sends AI requests to a separate Cloudflare Worker. The Worker uses a Cloudflare Workers AI binding, so neither a Gemini key nor a Cloudflare API token is ever sent to site visitors.

## Before you deploy

1. If `VITE_GEMINI_API_KEY` was ever set in Netlify, revoke that Gemini key in Google AI Studio. Vite variables are intentionally bundled into browser code.
2. Remove `VITE_GEMINI_API_KEY` from Netlify once the Worker deployment is working.
3. Sign up for a Cloudflare account and enable Workers AI.

## Deploy the Worker

1. In this repository, edit `wrangler.toml`:

   ```toml
   ALLOWED_ORIGIN = "https://YOUR-NETLIFY-SITE.netlify.app"
   ```

   Use your exact Netlify production URL. For local testing, use a comma-separated value such as:

   ```toml
   ALLOWED_ORIGIN = "https://your-site.netlify.app,http://localhost:5173"
   ```

2. Log in to Cloudflare from a terminal:

   ```bash
   npx wrangler login
   ```

3. Deploy:

   ```bash
   npm run cf:deploy
   ```

   Wrangler prints a URL like:

   ```text
   https://neet-biology-ai.<your-subdomain>.workers.dev
   ```

4. In Netlify, create a new environment variable:

   ```text
   VITE_CLOUDFLARE_AI_URL=https://neet-biology-ai.<your-subdomain>.workers.dev
   ```

   This value is safe to expose: it is only the public Worker URL, not a credential.

5. Redeploy the Netlify site so Vite receives the new value at build time.

## Local frontend test

Create a local `.env` file (it is ignored by Git):

```bash
VITE_CLOUDFLARE_AI_URL=https://neet-biology-ai.<your-subdomain>.workers.dev
```

Then restart Vite:

```bash
npm run dev
```

## Model and quota

The default Worker model is `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, which supports Cloudflare Workers AI JSON Mode for structured flashcard and MCQ responses. The project keeps compact request limits: concise tutor answers, four flashcards at a time, and five MCQs at a time.

Workers AI free-plan availability and model access can change. If Cloudflare reports the selected model requires a paid plan, choose another free model in `AI_MODEL` from the Workers AI model catalog, keeping JSON Mode support for quiz generation.

## Protecting the public endpoint

`ALLOWED_ORIGIN` prevents other browser origins from using your Worker, but CORS is not authentication: someone could still call a public URL directly. For a small friends-only site, also add a Cloudflare WAF rate-limiting rule for your Worker hostname:

- Match: the Worker hostname and `POST` method
- Starter limit: 20 requests per minute per IP address
- Action: block or managed challenge for 1 minute

For a larger release, add Turnstile verification or user accounts before treating the Worker as a public API.
