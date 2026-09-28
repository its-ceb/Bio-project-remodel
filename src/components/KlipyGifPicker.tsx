import React, { useEffect, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';

interface KlipyGifPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
}

interface KlipyGif {
  id: string;
  previewUrl: string;
  gifUrl: string;
  title: string;
}

type JsonRecord = Record<string, unknown>;

const GIFS_PER_REQUEST = 24;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function valueAtPath(value: unknown, path: string[]): string | null {
  let current: unknown = value;
  for (const key of path) {
    const record = asRecord(current);
    if (!record) return null;
    current = record[key];
  }
  return typeof current === 'string' && current.startsWith('http') ? current : null;
}

function responseItems(payload: unknown): unknown[] {
  const root = asRecord(payload);
  if (!root) return [];

  const data = asRecord(root.data);
  const candidates = [root.data, root.results, root.items, data?.data, data?.results, data?.items];
  return candidates.find(Array.isArray) || [];
}

function toKlipyGif(value: unknown, index: number): KlipyGif | null {
  const gifUrl =
    valueAtPath(value, ['file', 'md', 'gif', 'url']) ||
    valueAtPath(value, ['file', 'hd', 'gif', 'url']) ||
    valueAtPath(value, ['media_formats', 'gif', 'url']) ||
    valueAtPath(value, ['media', 'gif', 'url']) ||
    valueAtPath(value, ['url']);
  const previewUrl =
    valueAtPath(value, ['file', 'sm', 'gif', 'url']) ||
    valueAtPath(value, ['file', 'xs', 'gif', 'url']) ||
    valueAtPath(value, ['file', 'sm', 'webp', 'url']) ||
    valueAtPath(value, ['media_formats', 'tinygif', 'url']) ||
    gifUrl;

  if (!gifUrl || !previewUrl) return null;
  const item = asRecord(value);
  return {
    id: typeof item?.id === 'string' ? item.id : `${gifUrl}-${index}`,
    gifUrl,
    previewUrl,
    title: typeof item?.title === 'string' ? item.title : 'Klipy GIF',
  };
}

/**
 * Browser-based KLIPY search. KLIPY application keys are intended for client
 * integrations; the picker is disabled until VITE_KLIPY_API_KEY is configured.
 */
export default function KlipyGifPicker({ open, onClose, onSelect }: KlipyGifPickerProps) {
  const apiKey = (import.meta.env.VITE_KLIPY_API_KEY || '').trim();
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<KlipyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !apiKey) return;

    const abortController = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');

      try {
        const path = query.trim() ? 'search' : 'trending';
        const params = new URLSearchParams({
          per_page: String(GIFS_PER_REQUEST),
          content_filter: 'medium',
          format_filter: 'gif',
          locale: 'en_US',
        });
        if (query.trim()) params.set('q', query.trim());

        const response = await fetch(
          `https://api.klipy.com/api/v1/${encodeURIComponent(apiKey)}/gifs/${path}?${params.toString()}`,
          { signal: abortController.signal }
        );
        if (!response.ok) throw new Error(`KLIPY returned ${response.status}`);

        const payload = (await response.json()) as unknown;
        const nextGifs = responseItems(payload)
          .map(toKlipyGif)
          .filter((gif): gif is KlipyGif => Boolean(gif));

        setGifs(nextGifs);
        if (!nextGifs.length) setError('No GIFs found. Try another search.');
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        console.error('KLIPY GIF search failed:', requestError);
        setGifs([]);
        setError('Could not load GIFs. Check the KLIPY app key and try again.');
      } finally {
        if (!abortController.signal.aborted) setLoading(false);
      }
    }, query.trim() ? 350 : 0);

    return () => {
      abortController.abort();
      window.clearTimeout(timer);
    };
  }, [apiKey, open, query]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="klipy-gif-picker fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="klipy-gif-picker-panel flex max-h-[82vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-700 bg-[#1f2c34] text-slate-100 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-white">GIFs</h3>
            <p className="text-[10px] text-slate-400">Search KLIPY or choose a trending GIF</p>
          </div>
          <button onClick={onClose} aria-label="Close GIF picker" className="rounded-full p-2 text-slate-400 hover:bg-slate-700 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!apiKey ? (
          <div className="p-5 text-sm text-slate-300">
            <p className="font-semibold text-amber-300">GIF search is not configured yet.</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Add <code className="rounded bg-slate-950 px-1 py-0.5 text-emerald-300">VITE_KLIPY_API_KEY</code> to the site environment, then redeploy.
            </p>
          </div>
        ) : (
          <>
            <label className="relative m-3 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search funny GIFs..."
                className="w-full rounded-xl border border-slate-700 bg-[#111b21] py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500"
              />
            </label>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              {loading ? (
                <div className="flex h-44 items-center justify-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading GIFs...
                </div>
              ) : error ? (
                <p className="py-10 text-center text-xs text-slate-400">{error}</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {gifs.map((gif) => (
                    <button
                      key={gif.id}
                      type="button"
                      title={`Send ${gif.title}`}
                      onClick={() => onSelect(gif.gifUrl)}
                      className="group relative aspect-video overflow-hidden rounded-xl border border-slate-700 bg-slate-900 text-left hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                      <img src={gif.previewUrl} alt={gif.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <a
              href="https://klipy.com"
              target="_blank"
              rel="noreferrer noopener"
              className="border-t border-slate-700 px-4 py-2 text-center text-[10px] font-semibold text-slate-500 hover:bg-slate-800 hover:text-slate-300"
            >
              Powered by KLIPY
            </a>
          </>
        )}
      </div>
    </div>
  );
}
