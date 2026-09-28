type ClientRole = 'user' | 'model';
type WorkerRole = 'system' | 'user' | 'assistant';
type AiAction = 'chat' | 'flashcards' | 'mcqs';

interface Env {
  AI: {
    run: (model: string, options: Record<string, unknown>) => Promise<unknown>;
  };
  /** Comma-separated deployment origins, e.g. https://my-site.netlify.app */
  ALLOWED_ORIGIN?: string;
  /** Optional model override; defaults to the JSON-capable Llama 3.3 model. */
  AI_MODEL?: string;
}

interface ClientMessage {
  role: ClientRole;
  text: string;
}

interface AiRequest {
  action: AiAction;
  messages?: ClientMessage[];
  unit?: string;
  count?: number;
  avoid?: string[];
}

const DEFAULT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MAX_MESSAGE_CHARS = 2_000;
const MAX_HISTORY_MESSAGES = 5;
const MAX_AVOID_ITEMS = 20;

const TUTOR_INSTRUCTION = [
  'You are an expert NCERT Class 11 Biology tutor for NEET preparation.',
  'Use accurate NCERT terminology and concise, high-yield explanations.',
  'Keep standard answers under 160 words unless the student explicitly asks for more detail.',
  'Prefer short paragraphs and bullets over long walls of text.',
  'When asked for practice questions, give NEET-pattern MCQs with answers and one-line explanations.',
].join(' ');

const FLASHCARD_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      front: { type: 'string' },
      back: { type: 'string' },
      unit: { type: 'string', enum: ['diversity', 'cell', 'plant', 'human'] },
    },
    required: ['front', 'back', 'unit'],
  },
};

const MCQ_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      question: { type: 'string' },
      options: {
        type: 'array',
        items: { type: 'string' },
        minItems: 4,
        maxItems: 4,
      },
      correctIndex: { type: 'integer', minimum: 0, maximum: 3 },
      explanation: { type: 'string' },
      unit: { type: 'string', enum: ['diversity', 'cell', 'plant', 'human'] },
    },
    required: ['question', 'options', 'correctIndex', 'explanation', 'unit'],
  },
};

function json(data: unknown, init: ResponseInit = {}, corsHeaders: HeadersInit = {}): Response {
  const headers = new Headers(corsHeaders);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(data), { ...init, headers });
}

function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;

  const allowed = (env.ALLOWED_ORIGIN ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return allowed.includes(origin) ? origin : null;
}

function corsHeaders(origin: string | null): HeadersInit {
  if (!origin) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

function asText(result: unknown): string {
  if (typeof result === 'string') return result.trim();
  if (result && typeof result === 'object' && 'response' in result) {
    const response = (result as { response: unknown }).response;
    return typeof response === 'string' ? response.trim() : JSON.stringify(response);
  }
  return JSON.stringify(result) || '';
}

function boundedInteger(value: unknown, fallback: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(value)));
}

function normaliseMessages(messages: unknown): { role: WorkerRole; content: string }[] | null {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_HISTORY_MESSAGES) {
    return null;
  }

  const normalised: { role: WorkerRole; content: string }[] = [];
  for (const message of messages) {
    if (!message || typeof message !== 'object') return null;
    const role = (message as ClientMessage).role;
    const text = (message as ClientMessage).text;
    if ((role !== 'user' && role !== 'model') || typeof text !== 'string' || !text.trim()) return null;
    normalised.push({
      role: role === 'model' ? 'assistant' : 'user',
      content: text.trim().slice(0, MAX_MESSAGE_CHARS),
    });
  }

  return normalised;
}

function compactAvoidList(items: unknown): string {
  if (!Array.isArray(items)) return '';
  return items
    .filter((item): item is string => typeof item === 'string')
    .slice(0, MAX_AVOID_ITEMS)
    .map((item) => `- ${item.replace(/\s+/g, ' ').slice(0, 70)}`)
    .join('\n');
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /rate.?limit|quota|too many requests|429/i.test(message);
}

async function runChat(env: Env, request: AiRequest): Promise<string> {
  const messages = normaliseMessages(request.messages);
  if (!messages) throw new Error('Send between 1 and 5 valid chat messages.');

  const result = await env.AI.run(env.AI_MODEL || DEFAULT_MODEL, {
    messages: [{ role: 'system', content: TUTOR_INSTRUCTION }, ...messages],
    temperature: 0.5,
    max_tokens: 700,
  });
  return asText(result);
}

async function runFlashcards(env: Env, request: AiRequest): Promise<string> {
  const count = boundedInteger(request.count, 4, 4);
  const unit = typeof request.unit === 'string' ? request.unit.slice(0, 80) : 'all units';
  const avoid = compactAvoidList(request.avoid);
  const prompt = [
    `Create exactly ${count} concise revision flashcards for NCERT Class 11 Biology (NEET preparation).`,
    `Topic: ${unit}.`,
    'front: one crisp question or term, maximum 15 words.',
    'back: precise NCERT answer, maximum 35 words.',
    'Cover high-yield facts, definitions, examples and exceptions. No filler.',
    avoid ? `Do not repeat these existing card fronts:\n${avoid}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const result = await env.AI.run(env.AI_MODEL || DEFAULT_MODEL, {
    messages: [
      {
        role: 'system',
        content: 'Create accurate NCERT Class 11 Biology material. Return only JSON that follows the requested schema.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 1600,
    response_format: { type: 'json_schema', json_schema: FLASHCARD_SCHEMA },
  });
  return asText(result);
}

async function runMcqs(env: Env, request: AiRequest): Promise<string> {
  const count = boundedInteger(request.count, 5, 5);
  const unit = typeof request.unit === 'string' ? request.unit.slice(0, 80) : 'all units';
  const avoid = compactAvoidList(request.avoid);
  const prompt = [
    `Create exactly ${count} single-correct NEET-pattern MCQs for NCERT Class 11 Biology.`,
    `Topic: ${unit}.`,
    'Each question must have exactly four options, one correct answer, and a one- or two-line NCERT explanation.',
    'correctIndex is zero-based: 0 means the first option.',
    'Use plausible but unambiguously wrong distractors. No filler.',
    avoid ? `Do not repeat these existing questions:\n${avoid}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const result = await env.AI.run(env.AI_MODEL || DEFAULT_MODEL, {
    messages: [
      {
        role: 'system',
        content: 'You are a NEET Biology question setter using NCERT Class 11 content. Return only JSON that follows the requested schema.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 1600,
    response_format: { type: 'json_schema', json_schema: MCQ_SCHEMA },
  });
  return asText(result);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestOrigin = request.headers.get('origin');
    const origin = allowedOrigin(request, env);
    const cors = corsHeaders(origin);

    if (requestOrigin && !origin) {
      return json({ error: 'This origin is not allowed to use the AI service.' }, { status: 403 });
    }

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') {
      return json({ error: 'Use POST for this endpoint.' }, { status: 405 }, cors);
    }

    let body: AiRequest;
    try {
      body = (await request.json()) as AiRequest;
    } catch {
      return json({ error: 'Request body must be valid JSON.' }, { status: 400 }, cors);
    }

    try {
      let text: string;
      if (body.action === 'chat') text = await runChat(env, body);
      else if (body.action === 'flashcards') text = await runFlashcards(env, body);
      else if (body.action === 'mcqs') text = await runMcqs(env, body);
      else return json({ error: 'Unknown AI action.' }, { status: 400 }, cors);

      return json({ text }, { status: 200 }, cors);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The AI service could not complete that request.';
      const status = isRateLimitError(error) ? 429 : 502;
      return json(
        {
          error: status === 429 ? 'Cloudflare Workers AI is temporarily rate limited.' : message,
          hint:
            status === 429
              ? 'The free daily Workers AI allowance may be exhausted. Try again later.'
              : 'Try again shortly. If this continues, check the Worker logs and selected model availability.',
        },
        { status },
        cors
      );
    }
  },
};
