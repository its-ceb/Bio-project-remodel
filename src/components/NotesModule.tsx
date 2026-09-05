import { useMemo, useState } from 'react';
import { Search, CheckCircle2, Circle, BookOpen, ChevronRight } from 'lucide-react';
import { notes, type NoteTopic, type UnitId } from '@/data/biology';

interface NotesModuleProps {
  selectedUnit: UnitId | 'all';
}

export default function NotesModule({ selectedUnit }: NotesModuleProps) {
  const [query, setQuery] = useState('');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const byUnit = selectedUnit === 'all' ? notes : notes.filter((n) => n.unit === selectedUnit);
    const q = query.trim().toLowerCase();
    if (!q) return byUnit;
    return byUnit.filter((t) => {
      const inTitle = t.title.toLowerCase().includes(q);
      const inSummary = t.summary.toLowerCase().includes(q);
      const inChapter = t.chapter.toLowerCase().includes(q);
      const inSections = t.sections.some(
        (s) =>
          s.heading.toLowerCase().includes(q) ||
          s.keywords.some((k) => k.toLowerCase().includes(q)) ||
          s.bullets.some((b) => b.toLowerCase().includes(q))
      );
      return inTitle || inSummary || inChapter || inSections;
    });
  }, [selectedUnit, query]);

  const allTopicIds = useMemo(() => filtered.map((t) => t.id), [filtered]);
  const readCount = allTopicIds.filter((id) => readIds.has(id)).length;
  const progress = allTopicIds.length > 0 ? Math.round((readCount / allTopicIds.length) * 100) : 0;

  const toggleRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="animate-fade-in">
      {/* Progress tracker */}
      <div className="glass mb-6 rounded-2xl border border-white/60 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <BookOpen className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Reading Progress</h2>
              <p className="text-xs text-slate-500">
                {readCount} of {allTopicIds.length} topics marked as read
              </p>
            </div>
          </div>
          <span className="text-2xl font-extrabold gradient-text">{progress}%</span>
        </div>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full gradient-emerald transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes, keywords, or topics…"
          className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
        />
      </div>

      {/* Notes list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 py-16 text-center">
          <Search className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">No notes found for "{query}"</p>
          <button onClick={() => setQuery('')} className="mt-2 text-xs font-bold text-emerald-600 hover:underline">
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((topic, idx) => (
            <NoteCard
              key={topic.id}
              topic={topic}
              index={idx}
              isRead={readIds.has(topic.id)}
              isExpanded={expandedId === topic.id}
              onToggleRead={() => toggleRead(topic.id)}
              onToggleExpand={() => toggleExpand(topic.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface NoteCardProps {
  topic: NoteTopic;
  index: number;
  isRead: boolean;
  isExpanded: boolean;
  onToggleRead: () => void;
  onToggleExpand: () => void;
}

function NoteCard({ topic, index, isRead, isExpanded, onToggleRead, onToggleExpand }: NoteCardProps) {
  return (
    <div
      className={`card-hover overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 ${
        isRead ? 'border-emerald-200' : 'border-slate-200'
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-4 p-5">
        <button
          onClick={onToggleRead}
          className="mt-0.5 shrink-0 transition-transform hover:scale-110"
          aria-label={isRead ? 'Mark as unread' : 'Mark as read'}
        >
          {isRead ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          ) : (
            <Circle className="h-6 w-6 text-slate-300 hover:text-emerald-400" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
              {topic.chapter}
            </span>
          </div>
          <h3 className="mt-2 text-lg font-bold text-slate-800">{topic.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{topic.summary}</p>

          <button
            onClick={onToggleExpand}
            className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-600 transition-colors hover:text-emerald-700"
          >
            {isExpanded ? 'Hide notes' : 'Read notes'}
            <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="animate-fade-in border-t border-slate-100 bg-slate-50/50 px-5 py-5">
          {topic.sections.map((section) => (
            <div key={section.id} className="mb-6 last:mb-0">
              <h4 className="font-serif text-base font-semibold text-slate-800">{section.heading}</h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {section.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="rounded-md bg-gradient-to-r from-emerald-100 to-teal-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800"
                  >
                    {kw}
                  </span>
                ))}
              </div>
              <ul className="mt-3 space-y-2">
                {section.bullets.map((bullet, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-600">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
