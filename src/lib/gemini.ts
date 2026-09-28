/* ==========================================================================
   Cloudflare Workers AI client for the NEET Biology app.

   The browser calls our Worker, never an AI-provider API directly. The Worker
   owns the Workers AI binding and is responsible for model selection, CORS,
   request validation, and quota errors.
   ========================================================================== */

const AI_API_TIMEOUT_MS = 45_000;
const MAX_RETRIES = 1;
const RETRY_BASE_DELAY_MS = 800;
const RATE_LIMIT_COOLDOWN_MS = 60_000;
const RATE_LIMIT_COOLDOWN_STORAGE = 'neetbio-ai-rate-limit-until';
const CACHE_PREFIX = 'neetbio-ai-cache:';
const CACHE_VERSION = 1;

export type AiErrorKind = 'missing-config' | 'network' | 'rate-limit' | 'bad-response' | 'server';

export class AiServiceError extends Error {
  readonly kind: AiErrorKind;
  readonly status: number;
  readonly hint: string;

  constructor(kind: AiErrorKind, message: string, opts: { status?: number; hint?: string } = {}) {
    super(message);
    this.name = 'AiServiceError';
    this.kind = kind;
    this.status = opts.status ?? 0;
    this.hint = opts.hint ?? '';
  }
}

/** Turns any thrown value into a safe message for the UI. */
export function describeAiError(error: unknown): { message: string; hint: string } {
  if (error instanceof AiServiceError) return { message: error.message, hint: error.hint };
  if (error instanceof Error) return { message: error.message, hint: '' };
  return { message: 'Something went wrong talking to the AI service.', hint: '' };
}

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

export interface GeneratedFlashcard {
  front: string;
  back: string;
  unit: 'diversity' | 'cell' | 'plant' | 'human';
}

export interface GeneratedMCQ {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  unit: 'diversity' | 'cell' | 'plant' | 'human';
}

type AiAction = 'chat' | 'flashcards' | 'mcqs';

interface WorkerResponse {
  text?: unknown;
  error?: string;
  hint?: string;
}

function workerUrl(): string {
  return (import.meta.env.VITE_CLOUDFLARE_AI_URL ?? '').trim().replace(/\/$/, '');
}

/** The Worker URL is public; it is not an API key. */
export function isAiServiceConfigured(): boolean {
  return workerUrl().startsWith('https://');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rateLimitCooldownRemaining(): number {
  try {
    const until = Number(localStorage.getItem(RATE_LIMIT_COOLDOWN_STORAGE) || 0);
    return Math.max(0, until - Date.now());
  } catch {
    return 0;
  }
}

function startRateLimitCooldown(): void {
  try {
    localStorage.setItem(RATE_LIMIT_COOLDOWN_STORAGE, String(Date.now() + RATE_LIMIT_COOLDOWN_MS));
  } catch {
    /* storage unavailable — the Worker response still reaches the user */
  }
}

function throwIfRateLimited(): void {
  const remaining = rateLimitCooldownRemaining();
  if (remaining <= 0) return;

  const seconds = Math.ceil(remaining / 1000);
  throw new AiServiceError('rate-limit', `AI requests are paused for ${seconds} more seconds.`, {
    status: 429,
    hint: 'Cloudflare Workers AI was recently rate limited. Wait for the timer before trying again.',
  });
}

function extractText(payload: WorkerResponse): string {
  if (typeof payload.text === 'string' && payload.text.trim()) return payload.text.trim();
  if (payload.text && typeof payload.text === 'object') return JSON.stringify(payload.text);
  throw new AiServiceError('bad-response', 'The AI service returned an empty response.', {
    hint: 'Try again in a moment.',
  });
}

async function callAiWorker(action: AiAction, payload: Record<string, unknown>): Promise<string> {
  const url = workerUrl();
  if (!url) {
    throw new AiServiceError('missing-config', 'Cloudflare Workers AI is not configured for this site.', {
      hint: 'Add VITE_CLOUDFLARE_AI_URL in Netlify, then redeploy the site.',
    });
  }

  throwIfRateLimited();
  let lastError: AiServiceError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_API_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
        signal: controller.signal,
      });
      const result = (await response.json().catch(() => ({}))) as WorkerResponse;

      if (response.ok) return extractText(result);

      if (response.status === 429) {
        startRateLimitCooldown();
        throw new AiServiceError('rate-limit', result.error || 'Cloudflare Workers AI is temporarily rate limited.', {
          status: 429,
          hint:
            result.hint ||
            'The free daily Workers AI allowance may be exhausted. Wait for Cloudflare to reset the quota and try again.',
        });
      }

      const retryable = response.status >= 500 && response.status < 600;
      lastError = new AiServiceError(
        retryable ? 'server' : 'bad-response',
        result.error || `The AI service returned ${response.status}.`,
        { status: response.status, hint: result.hint || 'Check the Worker configuration and try again.' }
      );
      if (!retryable || attempt === MAX_RETRIES) throw lastError;
      await delay(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
    } catch (error) {
      if (error instanceof AiServiceError) throw error;

      const timedOut = error instanceof DOMException && error.name === 'AbortError';
      lastError = new AiServiceError(
        'network',
        timedOut ? 'The AI service took too long to respond.' : 'Could not reach the AI service.',
        { hint: timedOut ? 'Try again shortly.' : 'Check your connection and the Worker URL, then try again.' }
      );
      if (attempt === MAX_RETRIES) throw lastError;
      await delay(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new AiServiceError('network', 'Could not reach the AI service.');
}

/** Ask the tutor a question. The Worker enforces concise outputs and compact history. */
export async function askBiologyTutor(question: string, history: ChatTurn[] = []): Promise<string> {
  const trimmed = question.trim();
  if (!trimmed) return '';

  const messages = [...history, { role: 'user' as const, text: trimmed }]
    .slice(-5)
    .map((turn) => ({ role: turn.role, text: turn.text }));

  return callAiWorker('chat', { messages });
}

function extractJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const starts = [cleaned.indexOf('['), cleaned.indexOf('{')].filter((index) => index >= 0);
    const start = starts.length > 0 ? Math.min(...starts) : -1;
    const end = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1)) as T;
    throw new AiServiceError('bad-response', 'The AI service did not return usable JSON.', {
      hint: 'Try generating again — this is usually a temporary model formatting issue.',
    });
  }
}

export async function generateFlashcards<T extends string>(opts: {
  unit: T | 'all';
  unitNames: Record<T, string>;
  count: number;
  avoidFronts?: string[];
}): Promise<GeneratedFlashcard[]> {
  const unitLabel = opts.unit === 'all' ? 'Class 11 Biology as a whole' : opts.unitNames[opts.unit] || opts.unit;
  const text = await callAiWorker('flashcards', {
    unit: unitLabel,
    count: Math.min(4, opts.count),
    avoid: opts.avoidFronts ?? [],
  });
  const cards = extractJson<GeneratedFlashcard[]>(text);

  if (!Array.isArray(cards) || cards.length === 0) {
    throw new AiServiceError('bad-response', 'The AI service returned no flashcards.', { hint: 'Try again in a moment.' });
  }

  return cards
    .filter((card) => card && typeof card.front === 'string' && typeof card.back === 'string')
    .map((card) => ({
      front: card.front.trim(),
      back: card.back.trim(),
      unit: card.unit,
    }))
    .filter((card) => card.front.length > 0 && card.back.length > 0);
}

export async function generateMCQs<T extends string>(opts: {
  unit: T | 'all';
  unitNames: Record<T, string>;
  count: number;
  avoidQuestions?: string[];
}): Promise<GeneratedMCQ[]> {
  const unitLabel = opts.unit === 'all' ? 'Class 11 Biology as a whole' : opts.unitNames[opts.unit] || opts.unit;
  const text = await callAiWorker('mcqs', {
    unit: unitLabel,
    count: Math.min(5, opts.count),
    avoid: opts.avoidQuestions ?? [],
  });
  const questions = extractJson<GeneratedMCQ[]>(text);

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new AiServiceError('bad-response', 'The AI service returned no MCQs.', { hint: 'Try again in a moment.' });
  }

  return questions
    .filter(
      (question) =>
        question &&
        typeof question.question === 'string' &&
        Array.isArray(question.options) &&
        question.options.length === 4 &&
        typeof question.explanation === 'string'
    )
    .map((question) => ({
      question: question.question.trim(),
      options: question.options.map((option) => String(option).trim()),
      correctIndex:
        typeof question.correctIndex === 'number' && question.correctIndex >= 0 && question.correctIndex <= 3
          ? question.correctIndex
          : 0,
      explanation: question.explanation.trim(),
      unit: question.unit,
    }));
}

interface CacheEnvelope<T> {
  v: number;
  savedAt: number;
  value: T;
}

/** Cached generated material prevents repeated requests after a page refresh. */
export function readAiCache<T>(name: string): T | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${name}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    return parsed?.v === CACHE_VERSION ? parsed.value : null;
  } catch {
    return null;
  }
}

export function writeAiCache(name: string, value: unknown): void {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${name}`, JSON.stringify({ v: CACHE_VERSION, savedAt: Date.now(), value }));
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
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}
