/* ==========================================================================
   src/lib/gemini.ts
   Gemini access for the NEET Biology app.

   What changed vs the old file:
   1. Errors are no longer swallowed. Every failure carries the REAL HTTP
      status + Google's own message, so the UI can show "401 Invalid Auth key"
      instead of a generic "Failed to connect".
   2. Multi-turn chat: the tutor now receives the conversation so far.
   3. Retries (with backoff) on 429/5xx — free-tier rate limits are common.
   4. Structured generation of flashcards and MCQs (JSON mode + schema), only
      called when the user explicitly asks, and cached in localStorage so a
      refresh never spends tokens twice.
   5. testGeminiConnection() to check a key in one click.
   ========================================================================== */

export const GEMINI_MODELS = {
  /** Used for the AI Tutor chat */
  chat: 'gemini-3.6-flash',
  /** Used for flashcard / MCQ generation.
   *  Swap to 'gemini-3.5-flash-lite' or 'gemini-3.1-flash-lite' to spend
   *  noticeably fewer tokens on bulk generation. */
  generation: 'gemini-3.6-flash',
};

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models';
const REQUEST_TIMEOUT_MS = 45000;
const MAX_RETRIES = 2;
const RETRYABLE_STATUSES = [429, 500, 502, 503, 504];
const RETRY_BASE_DELAY_MS = 700;

/** localStorage key that lets you drop in a key without rebuilding.
 *  e.g. in the browser console:
 *      localStorage.setItem('gemini_api_key', 'AQ....')   // then reload */
const RUNTIME_KEY_STORAGE = 'gemini_api_key';

const CACHE_PREFIX = 'neetbio-ai-cache:';
const CACHE_VERSION = 1;

/* -------------------------------------------------------------------------- */
/* Errors                                                                      */
/* -------------------------------------------------------------------------- */

export type GeminiErrorKind =
  | 'missing-key'
  | 'network'
  | 'auth'
  | 'rate-limit'
  | 'blocked'
  | 'not-found'
  | 'bad-request'
  | 'server'
  | 'bad-response';

export class GeminiError extends Error {
  readonly kind: GeminiErrorKind;
  readonly status: number;
  readonly hint: string;

  constructor(kind: GeminiErrorKind, message: string, opts: { status?: number; hint?: string } = {}) {
    super(message);
    this.name = 'GeminiError';
    this.kind = kind;
    this.status = opts.status ?? 0;
    this.hint = opts.hint ?? '';
  }
}

/** Turns any thrown thing into something you can show a user. */
export function describeGeminiError(err: unknown): { message: string; hint: string } {
  if (err instanceof GeminiError) {
    return { message: err.message, hint: err.hint };
  }
  if (err instanceof Error) {
    return { message: err.message, hint: '' };
  }
  return { message: 'Something went wrong talking to Gemini.', hint: '' };
}

function classifyHttpError(status: number, apiMessage: string): GeminiError {
  const lower = apiMessage.toLowerCase();

  if (status === 401 || status === 403) {
    return new GeminiError('auth', apiMessage || 'Your API key was rejected.', {
      status,
      hint:
        'This key is not being accepted by Google. Create a fresh key at aistudio.google.com/apikey ' +
        'and paste the whole value — keys start with "AQ." now. Also check the key was not deleted.',
    });
  }

  if (status === 400 && /api key|auth key|credential/i.test(lower)) {
    return new GeminiError('auth', apiMessage, {
      status,
      hint:
        'Google says this credential is invalid. Generate a new API key in AI Studio ' +
        '(aistudio.google.com/apikey) and update your .env / Netlify environment variable.',
    });
  }

  if (status === 404) {
    return new GeminiError('not-found', apiMessage || 'Model not found.', {
      status,
      hint:
        'That model is not available to this key. Older models such as gemini-2.5-flash and ' +
        'gemini-2.0-flash have been retired — this app uses gemini-3.6-flash.',
    });
  }

  if (status === 429) {
    return new GeminiError('rate-limit', apiMessage || 'Rate limit reached.', {
      status,
      hint: 'Free-tier limits are per minute and per day. Wait a moment and try again.',
    });
  }

  if (status >= 500) {
    return new GeminiError('server', apiMessage || 'Gemini is having trouble.', {
      status,
      hint: 'This one is on Google’s side — retrying usually works.',
    });
  }

  return new GeminiError('bad-request', apiMessage || `Request failed (${status}).`, { status });
}

/* -------------------------------------------------------------------------- */
/* API key resolution: runtime override -> Vite env                            */
/* -------------------------------------------------------------------------- */

export function getGeminiApiKey(): string {
  try {
    const override = localStorage.getItem(RUNTIME_KEY_STORAGE);
    if (override && override.trim()) return override.trim();
  } catch {
    /* storage unavailable */
  }

  const env = ((import.meta as any)?.env ?? {}) as Record<string, string | undefined>;
  return (env.VITE_GEMINI_API_KEY ?? '').trim();
}

export function hasGeminiApiKey(): boolean {
  const key = getGeminiApiKey();
  return key.length > 0 && key !== 'your_gemini_api_key_here';
}

/** Test a key in the current browser without a rebuild. Pass '' to clear. */
export function setRuntimeApiKey(key: string) {
  try {
    if (key.trim()) localStorage.setItem(RUNTIME_KEY_STORAGE, key.trim());
    else localStorage.removeItem(RUNTIME_KEY_STORAGE);
  } catch {
    /* ignore */
  }
}

/* -------------------------------------------------------------------------- */
/* Core request                                                                */
/* -------------------------------------------------------------------------- */

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

interface CallGeminiOptions {
  prompt: string | ChatTurn[];
  systemInstruction?: string;
  model?: string;
  jsonSchema?: Record<string, unknown> | null;
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extractText(data: any): string {
  const blockReason = data?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new GeminiError('blocked', `Gemini blocked this request (${blockReason}).`, {
      hint: 'Try rephrasing the question.',
    });
  }

  const candidate = data?.candidates?.[0];
  if (!candidate) {
    throw new GeminiError('bad-response', 'Gemini returned no answer.', {
      hint: 'The response had no candidates — try again.',
    });
  }

  const text: string = (candidate.content?.parts ?? [])
    .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();

  if (!text) {
    const reason = candidate.finishReason || 'unknown';
    if (reason === 'SAFETY' || reason === 'PROHIBITED_CONTENT') {
      throw new GeminiError('blocked', 'Gemini refused to answer that one.', {
        hint: 'Try rephrasing the question.',
      });
    }
    if (reason === 'MAX_TOKENS') {
      throw new GeminiError('bad-response', 'The answer was cut off before any text arrived.', {
        hint: 'Try a shorter question.',
      });
    }
    throw new GeminiError('bad-response', `Gemini returned an empty answer (${reason}).`);
  }

  return text;
}

async function callGemini(options: CallGeminiOptions): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new GeminiError('missing-key', 'No Gemini API key configured.', {
      hint:
        'Add VITE_GEMINI_API_KEY to your .env file (local dev) and to your Netlify ' +
        'environment variables, then rebuild. Or set localStorage.gemini_api_key for a quick test.',
    });
  }

  const model = options.model ?? GEMINI_MODELS.chat;
  const url = `${API_ROOT}/${model}:generateContent`;

  const contents = Array.isArray(options.prompt)
    ? options.prompt.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] }))
    : [{ role: 'user', parts: [{ text: options.prompt }] }];

  const body: Record<string, unknown> = {
    contents,
    ...(options.systemInstruction
      ? { systemInstruction: { parts: [{ text: options.systemInstruction }] } }
      : {}),
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
      ...(options.jsonSchema
        ? { responseMimeType: 'application/json', responseSchema: options.jsonSchema }
        : {}),
    },
  };

  let lastError: GeminiError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      options.signal?.addEventListener('abort', () => controller.abort(), { once: true });

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // current standard for Gemini keys (including the new "AQ." auth keys)
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (response.ok) {
        return extractText(await response.json());
      }

      const errorBody = await response.json().catch(() => null);
      const apiMessage: string =
        errorBody?.error?.message ?? errorBody?.[0]?.error?.message ?? response.statusText;

      const apiError = classifyHttpError(response.status, apiMessage);

      if (RETRYABLE_STATUSES.includes(response.status) && attempt < MAX_RETRIES) {
        lastError = apiError;
        await delay(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
      throw apiError;
    } catch (err) {
      // our own errors are final (unless retried above)
      if (err instanceof GeminiError) throw err;

      const aborted = err instanceof DOMException && err.name === 'AbortError';
      lastError = new GeminiError(
        'network',
        aborted
          ? 'The request timed out.'
          : 'Could not reach the Gemini API from the browser.',
        {
          hint: aborted
            ? 'Gemini took too long. Try again.'
            : 'Usually a dropped connection or a blocked request. Check your internet, then the key.',
        }
      );

      if (attempt < MAX_RETRIES) {
        await delay(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new GeminiError('network', 'Could not reach the Gemini API.');
}

/* -------------------------------------------------------------------------- */
/* Chat                                                                        */
/* -------------------------------------------------------------------------- */

const TUTOR_SYSTEM_INSTRUCTION = [
  'You are an expert NCERT Class 11 Biology tutor for NEET preparation.',
  'Give concise, high-yield answers using correct NCERT terminology.',
  'Prefer short paragraphs and bullet points over walls of text.',
  'When the student asks for practice questions, give NEET-pattern MCQs with the answer and a one-line explanation.',
].join(' ');

/** Ask the tutor a question. Pass previous turns for real conversation context. */
export async function askGeminiBiology(question: string, history: ChatTurn[] = []): Promise<string> {
  const trimmed = question.trim();
  if (!trimmed) return ''

  // keep the recent context only — older turns add tokens without much value
  const recentHistory = history.slice(-10);

  return callGemini({
    prompt: [...recentHistory, { role: 'user', text: trimmed }],
    systemInstruction: TUTOR_SYSTEM_INSTRUCTION,
    model: GEMINI_MODELS.chat,
    temperature: 0.6,
    maxOutputTokens: 2048,
  });
}

/* -------------------------------------------------------------------------- */
/* Connection test                                                             */
/* -------------------------------------------------------------------------- */

export interface ConnectionTestResult {
  ok: boolean;
  model: string;
  detail: string;
  hint?: string;
  status?: number;
  keyPreview: string;
}

export async function testGeminiConnection(): Promise<ConnectionTestResult> {
  const key = getGeminiApiKey();
  const keyPreview = key ? `${key.slice(0, 6)}…${key.slice(-4)} (${key.length} chars)` : '(none)';
  const model = GEMINI_MODELS.chat;

  if (!key) {
    return {
      ok: false,
      model,
      keyPreview,
      detail: 'No API key found.',
      hint: 'Set VITE_GEMINI_API_KEY in .env / Netlify, or run localStorage.setItem("gemini_api_key", "AQ...") and reload.',
    };
  }

  try {
    const reply = await callGemini({
      prompt: 'Reply with exactly: OK',
      model,
      temperature: 0,
      maxOutputTokens: 16,
    });
    return { ok: true, model, keyPreview, detail: `Model replied: "${reply.trim()}"` };
  } catch (err) {
    const described = describeGeminiError(err);
    return {
      ok: false,
      model,
      keyPreview,
      detail: described.message,
      hint: described.hint,
      status: err instanceof GeminiError ? err.status : undefined,
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Structured generation (flashcards + MCQs)                                   */
/* -------------------------------------------------------------------------- */

export const UNIT_IDS = ['diversity', 'cell', 'plant', 'human'] as const;
export type UnitId = (typeof UNIT_IDS)[number];

export interface GeneratedFlashcard {
  front: string;
  back: string;
  unit: UnitId;
}

export interface GeneratedMCQ {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  unit: UnitId;
}

const FLASHCARD_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      front: { type: 'STRING', description: 'A short question or term, max 15 words' },
      back: { type: 'STRING', description: 'The precise NCERT answer, max 35 words' },
      unit: { type: 'STRING', enum: UNIT_IDS as unknown as string[] },
    },
    required: ['front', 'back', 'unit'],
    propertyOrdering: ['front', 'back', 'unit'],
  },
};

const MCQ_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      question: { type: 'STRING' },
      options: { type: 'ARRAY', items: { type: 'STRING' }, minItems: 4, maxItems: 4 },
      correctIndex: { type: 'INTEGER', description: '0-based index of the correct option' },
      explanation: { type: 'STRING', description: 'One or two lines, max 40 words' },
      unit: { type: 'STRING', enum: UNIT_IDS as unknown as string[] },
    },
    required: ['question', 'options', 'correctIndex', 'explanation', 'unit'],
    propertyOrdering: ['question', 'options', 'correctIndex', 'explanation', 'unit'],
  },
};

/** Pulls JSON out of a reply that may be wrapped in prose or ``` fences. */
function extractJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    /* fall through to a looser extraction */
  }

  const start = cleaned.search(/[[{]/);
  if (start >= 0) {
    const opener = cleaned[start];
    const closer = opener === '[' ? ']' : '}';
    const end = cleaned.lastIndexOf(closer);
    if (end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
  }

  throw new GeminiError('bad-response', 'Gemini did not return usable JSON.', {
    hint: 'Try generating again — this is usually a one-off.',
  });
}

async function callGeminiJson<T>(opts: {
  prompt: string;
  schema: Record<string, unknown>;
  systemInstruction: string;
  maxOutputTokens: number;
}): Promise<T> {
  const runWith = (schema: Record<string, unknown> | null) =>
    callGemini({
      prompt: opts.prompt,
      systemInstruction: opts.systemInstruction,
      model: GEMINI_MODELS.generation,
      jsonSchema: schema,
      temperature: 0.8,
      maxOutputTokens: opts.maxOutputTokens,
    });

  let raw: string;
  try {
    raw = await runWith(opts.schema);
  } catch (err) {
    // If the endpoint rejects the schema, fall back to plain JSON mode.
    if (err instanceof GeminiError && err.kind === 'bad-request') {
      raw = await runWith(null);
    } else {
      throw err;
    }
  }

  const parsed = extractJson<T | { items?: T }>(raw);

  // tolerate {"items":[...]} as well as a bare array
  if (parsed && !Array.isArray(parsed) && Array.isArray((parsed as any).items)) {
    return (parsed as any).items as T;
  }
  return parsed as T;
}

function unitLabelFor(unit: UnitId | 'all', unitNames: Record<UnitId, string>): string {
  return unit === 'all'
    ? 'Class 11 Biology as a whole (mix all four units)'
    : `${unitNames[unit]} (unit id: ${unit})`;
}

function compactAvoidList(items: string[], limit = 60): string {
  return items
    .slice(0, limit)
    .map((t) => `- ${t.replace(/\s+/g, ' ').slice(0, 70)}`)
    .join('\n');
}

export async function generateFlashcards(opts: {
  unit: UnitId | 'all';
  unitNames: Record<UnitId, string>;
  count: number;
  avoidFronts?: string[];
}): Promise<GeneratedFlashcard[]> {
  const { unit, unitNames, count, avoidFronts = [] } = opts;

  const avoidBlock = avoidFronts.length
    ? `\nDo NOT create cards that repeat or paraphrase any of these existing fronts:\n${compactAvoidList(avoidFronts)}`
    : '';

  const prompt = [
    `Create exactly ${count} revision flashcards for NCERT Class 11 Biology (NEET preparation).`,
    `Topic: ${unitLabelFor(unit, unitNames)}.`,
    '',
    'Rules:',
    '- front: one crisp question or term (max 15 words).',
    '- back: the precise NCERT answer (max 35 words).',
    `- unit: one of ${UNIT_IDS.join(', ')} — the unit the card belongs to.`,
    '- Cover high-yield NEET facts, definitions, examples and exceptions.',
    '- Make every card distinct and examinable. No filler.',
    avoidBlock,
  ].join('\n');

  const cards = await callGeminiJson<GeneratedFlashcard[]>({
    prompt,
    schema: FLASHCARD_SCHEMA,
    systemInstruction:
      'You write accurate NCERT Class 11 Biology revision material for Indian NEET aspirants. ' +
      'Answer only with JSON matching the given schema.',
    maxOutputTokens: 4096,
  });

  if (!Array.isArray(cards) || cards.length === 0) {
    throw new GeminiError('bad-response', 'Gemini returned no flashcards.', {
      hint: 'Try again in a moment.',
    });
  }

  return cards
    .filter((c) => c && typeof c.front === 'string' && typeof c.back === 'string')
    .map((c) => ({
      front: c.front.trim(),
      back: c.back.trim(),
      unit: (UNIT_IDS as readonly string[]).includes(c.unit) ? c.unit : (unit === 'all' ? 'diversity' : unit),
    }))
    .filter((c) => c.front.length > 0 && c.back.length > 0);
}

export async function generateMCQs(opts: {
  unit: UnitId | 'all';
  unitNames: Record<UnitId, string>;
  count: number;
  avoidQuestions?: string[];
}): Promise<GeneratedMCQ[]> {
  const { unit, unitNames, count, avoidQuestions = [] } = opts;

  const avoidBlock = avoidQuestions.length
    ? `\nDo NOT repeat or reword any of these existing questions:\n${compactAvoidList(avoidQuestions)}`
    : '';

  const prompt = [
    `Create exactly ${count} single-correct NEET-pattern MCQs on NCERT Class 11 Biology.`,
    `Topic: ${unitLabelFor(unit, unitNames)}.`,
    '',
    'Rules:',
    '- Exactly 4 options per question, only one correct.',
    '- correctIndex is 0-based (0 = first option).',
    '- Distractors must be plausible but unambiguously wrong.',
    '- explanation: max 40 words, naming the NCERT concept.',
    `- unit: one of ${UNIT_IDS.join(', ')}.`,
    '- Mix factual, assertion-style and application questions.',
    avoidBlock,
  ].join('\n');

  const questions = await callGeminiJson<GeneratedMCQ[]>({
    prompt,
    schema: MCQ_SCHEMA,
    systemInstruction:
      'You are a NEET Biology question setter using NCERT Class 11 content. ' +
      'Answer only with JSON matching the given schema.',
    maxOutputTokens: 4096,
  });

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new GeminiError('bad-response', 'Gemini returned no questions.', {
      hint: 'Try again in a moment.',
    });
  }

  return questions
    .filter(
      (q) =>
        q &&
        typeof q.question === 'string' &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        typeof q.explanation === 'string'
    )
    .map((q) => ({
      question: q.question.trim(),
      options: q.options.map((o) => String(o).trim()),
      correctIndex:
        typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3
          ? q.correctIndex
          : 0,
      explanation: q.explanation.trim(),
      unit: (UNIT_IDS as readonly string[]).includes(q.unit) ? q.unit : (unit === 'all' ? 'diversity' : unit),
    }));
}

/* -------------------------------------------------------------------------- */
/* Cache — so a page refresh never spends tokens twice                         */
/* -------------------------------------------------------------------------- */

interface CacheEnvelope<T> {
  v: number;
  savedAt: number;
  value: T;
}

export function readAiCache<T>(name: string): T | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${name}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || parsed.v !== CACHE_VERSION) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

export function writeAiCache<T>(name: string, value: T): void {
  try {
    const envelope: CacheEnvelope<T> = { v: CACHE_VERSION, savedAt: Date.now(), value };
    localStorage.setItem(`${CACHE_PREFIX}${name}`, JSON.stringify(envelope));
  } catch {
    /* storage full or unavailable — not worth failing the feature over */
  }
}

export function clearAiCache(name?: string): void {
  try {
    if (name) {
      localStorage.removeItem(`${CACHE_PREFIX}${name}`);
      return;
    }
    Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
