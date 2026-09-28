import { ExternalLink, Film, Play } from 'lucide-react';
import { extractPreviewLinks, linkifyMessageText, type ChatLink } from '@/lib/chatLinks';

interface MessageLinkContentProps {
  text: string;
}

const linkClassName = 'break-all font-medium text-emerald-300 underline decoration-emerald-400/50 underline-offset-2 hover:text-emerald-200';

function OpenLink({ link, children }: { link: ChatLink; children: React.ReactNode }) {
  return (
    <a href={link.url} target="_blank" rel="noreferrer noopener" className={linkClassName}>
      {children}
    </a>
  );
}

function GenericLinkCard({ link }: { link: ChatLink }) {
  return (
    <OpenLink link={link}>
      <span className="chat-link-card mt-2 flex max-w-full items-center gap-2 rounded-xl border border-slate-600/80 bg-slate-950/30 px-3 py-2 text-left no-underline transition-colors hover:border-emerald-500/70 hover:bg-slate-950/50">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
          <ExternalLink className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[10px] font-bold uppercase tracking-wider text-emerald-400">{link.hostname}</span>
          <span className="block truncate text-xs text-slate-200">{link.label}</span>
        </span>
      </span>
    </OpenLink>
  );
}

function MediaHeader({ link, label, icon }: { link: ChatLink; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noreferrer noopener"
      className="flex items-center gap-1.5 border-b border-slate-700/70 px-2.5 py-1.5 text-[10px] font-bold text-slate-300 hover:bg-slate-800/70"
    >
      <span className="text-emerald-400">{icon}</span>
      <span>{label}</span>
      <span className="ml-auto inline-flex items-center gap-1 text-slate-500">
        {link.hostname} <ExternalLink className="h-3 w-3" />
      </span>
    </a>
  );
}

function ChatLinkCard({ link }: { link: ChatLink }) {
  if (link.kind === 'youtube' && link.embedUrl) {
    return (
      <div className="chat-link-card mt-2 overflow-hidden rounded-xl border border-slate-600/80 bg-slate-950/50 shadow-sm">
        <MediaHeader link={link} label="YouTube video" icon={<Play className="h-3.5 w-3.5" />} />
        <div className="aspect-video bg-black">
          <iframe
            src={link.embedUrl}
            title="YouTube video"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    );
  }

  if (link.kind === 'instagram' && link.embedUrl) {
    return (
      <div className="chat-link-card mt-2 overflow-hidden rounded-xl border border-slate-600/80 bg-slate-950/50 shadow-sm">
        <MediaHeader link={link} label="Instagram post / reel" icon={<Play className="h-3.5 w-3.5" />} />
        <div className="h-[430px] bg-slate-950">
          <iframe
            src={link.embedUrl}
            title="Instagram post or reel"
            className="h-full w-full"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <a
          href={link.url}
          target="_blank"
          rel="noreferrer noopener"
          className="block px-2.5 py-1.5 text-[10px] text-slate-400 hover:bg-slate-800/70 hover:text-emerald-300"
        >
          Instagram may block private or restricted embeds — open on Instagram ↗
        </a>
      </div>
    );
  }

  if (link.kind === 'gif') {
    return (
      <div className="chat-link-card mt-2 overflow-hidden rounded-xl border border-slate-600/80 bg-slate-950/50 shadow-sm">
        <MediaHeader link={link} label="GIF" icon={<Film className="h-3.5 w-3.5" />} />
        <a href={link.url} target="_blank" rel="noreferrer noopener" className="block bg-black">
          <img src={link.url} alt="Shared GIF" loading="lazy" className="max-h-80 w-full object-contain" />
        </a>
      </div>
    );
  }

  if (link.kind === 'video') {
    return (
      <div className="chat-link-card mt-2 overflow-hidden rounded-xl border border-slate-600/80 bg-slate-950/50 shadow-sm">
        <MediaHeader link={link} label="Video" icon={<Play className="h-3.5 w-3.5" />} />
        <video controls preload="metadata" className="max-h-80 w-full bg-black" src={link.url}>
          Your browser cannot play this video.
        </video>
      </div>
    );
  }

  return <GenericLinkCard link={link} />;
}

/** Linkifies message text and provides a compact preview for the first two URLs. */
export default function MessageLinkContent({ text }: MessageLinkContentProps) {
  const parts = linkifyMessageText(text);
  const previews = extractPreviewLinks(text);

  return (
    <>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
        {parts.map((part, index) =>
          part.type === 'link' ? (
            <OpenLink key={`${part.value}-${index}`} link={part.link}>
              {part.value}
            </OpenLink>
          ) : (
            <span key={`${part.value}-${index}`}>{part.value}</span>
          )
        )}
      </p>
      {previews.map((link) => (
        <ChatLinkCard key={link.url} link={link} />
      ))}
    </>
  );
}
