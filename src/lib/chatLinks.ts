export type ChatLinkKind = 'youtube' | 'instagram' | 'gif' | 'video' | 'website';

export interface ChatLink {
  url: string;
  hostname: string;
  label: string;
  kind: ChatLinkKind;
  embedUrl?: string;
}

export type LinkifiedMessagePart =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string; link: ChatLink };

const URL_PATTERN = /(https?:\/\/[^\s<>'"`]+)/gi;
const TRAILING_URL_PUNCTUATION = /[.,!?;:)}\]]+$/;
const DIRECT_GIF_PATTERN = /\.(?:gif|gifv|webp|apng)(?:$|[?#])/i;
const DIRECT_VIDEO_PATTERN = /\.(?:mp4|webm|ogg|ogv|mov|m4v)(?:$|[?#])/i;

function toSafeUrl(value: string): URL | null {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed : null;
  } catch {
    return null;
  }
}

function youtubeEmbedUrl(parsed: URL): string | null {
  const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
  let videoId = '';

  if (hostname === 'youtu.be') {
    videoId = parsed.pathname.split('/').filter(Boolean)[0] || '';
  } else if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) {
    if (parsed.pathname === '/watch') videoId = parsed.searchParams.get('v') || '';
    else {
      const [kind, candidate] = parsed.pathname.split('/').filter(Boolean);
      if (['embed', 'shorts', 'live'].includes(kind || '')) videoId = candidate || '';
    }
  }

  if (!/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`;
}

function instagramEmbedUrl(parsed: URL): string | null {
  const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
  if (hostname !== 'instagram.com' && !hostname.endsWith('.instagram.com')) return null;

  const [kind, shortcode] = parsed.pathname.split('/').filter(Boolean);
  if (!['p', 'reel', 'reels', 'tv'].includes(kind || '') || !/^[A-Za-z0-9_-]+$/.test(shortcode || '')) {
    return null;
  }

  // Instagram controls whether public content may be framed. The UI always
  // includes an open-on-Instagram fallback for private or blocked embeds.
  return `https://www.instagram.com/${kind}/${shortcode}/embed/captioned/`;
}

export function parseChatLink(rawUrl: string): ChatLink | null {
  const parsed = toSafeUrl(rawUrl);
  if (!parsed) return null;

  const url = parsed.toString();
  const hostname = parsed.hostname.replace(/^www\./, '');
  const compactPath = `${parsed.pathname === '/' ? '' : parsed.pathname}${parsed.search}`;
  const label = `${hostname}${compactPath}`.slice(0, 120);
  const youtube = youtubeEmbedUrl(parsed);
  if (youtube) return { url, hostname, label, kind: 'youtube', embedUrl: youtube };

  const instagram = instagramEmbedUrl(parsed);
  if (instagram) return { url, hostname, label, kind: 'instagram', embedUrl: instagram };

  if (DIRECT_GIF_PATTERN.test(parsed.pathname) || DIRECT_GIF_PATTERN.test(url)) {
    return { url, hostname, label, kind: 'gif' };
  }

  if (DIRECT_VIDEO_PATTERN.test(parsed.pathname) || DIRECT_VIDEO_PATTERN.test(url)) {
    return { url, hostname, label, kind: 'video' };
  }

  return { url, hostname, label, kind: 'website' };
}

export function linkifyMessageText(text: string): LinkifiedMessagePart[] {
  const result: LinkifiedMessagePart[] = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    const rawUrl = match[0];
    const urlWithoutPunctuation = rawUrl.replace(TRAILING_URL_PUNCTUATION, '');
    const trailingText = rawUrl.slice(urlWithoutPunctuation.length);
    const link = parseChatLink(urlWithoutPunctuation);

    if (start > cursor) result.push({ type: 'text', value: text.slice(cursor, start) });

    if (link) result.push({ type: 'link', value: urlWithoutPunctuation, link });
    else result.push({ type: 'text', value: urlWithoutPunctuation });
    if (trailingText) result.push({ type: 'text', value: trailingText });

    cursor = start + rawUrl.length;
  }

  if (cursor < text.length) result.push({ type: 'text', value: text.slice(cursor) });
  return result.length ? result : [{ type: 'text', value: text }];
}

/** Limits rendering to two cards so a pasted URL list cannot flood the chat. */
export function extractPreviewLinks(text: string, limit = 2): ChatLink[] {
  const seen = new Set<string>();
  const links: ChatLink[] = [];

  for (const part of linkifyMessageText(text)) {
    if (part.type !== 'link' || seen.has(part.link.url)) continue;
    seen.add(part.link.url);
    links.push(part.link);
    if (links.length === limit) break;
  }

  return links;
}
