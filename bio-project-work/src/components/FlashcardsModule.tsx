import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Shuffle,
  RotateCcw,
  Check,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { flashcards, type Flashcard, type UnitId } from '@/data/biology';

interface FlashcardsModuleProps {
  selectedUnit: UnitId | 'all';
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function FlashcardsModule({ selectedUnit }: FlashcardsModuleProps) {
  const deck = useMemo<Flashcard[]>(
    () =>
      selectedUnit === 'all'
        ? flashcards
        : flashcards.filter((c) => c.unit === selectedUnit),
    [selectedUnit]
  );

  const [order, setOrder] = useState<number[]>(() => deck.map((_, i) => i));
  const [position, setPosition] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mastered, setMastered] = useState<Set<string>>(new Set());

  // Reset when deck changes (unit switch)
  useEffect(() => {
    setOrder(deck.map((_, i) => i));
    setPosition(0);
    setIsFlipped(false);
  }, [deck]);

  const currentCard = deck[order[position]];

  const goNext = useCallback(() => {
    setIsFlipped(false);
    setPosition((p) => (p + 1) % order.length);
  }, [order.length]);

  const goPrev = useCallback(() => {
    setIsFlipped(false);
    setPosition((p) => (p - 1 + order.length) % order.length);
  }, [order.length]);

  const handleShuffle = () => {
    setOrder((prev) => shuffleArray(prev));
    setPosition(0);
    setIsFlipped(false);
  };

  const toggleMastered = () => {
    if (!currentCard) return;
    setMastered((prev) => {
      const next = new Set(prev);
      if (next.has(currentCard.id)) next.delete(currentCard.id);
      else next.add(currentCard.id);
      return next;
    });
  };

  const resetMastery = () => {
    setMastered(new Set());
    setPosition(0);
    setIsFlipped(false);
  };

  if (!currentCard || deck.length === 0) {
    return (
      <div className="animate-fade-in rounded-2xl border border-dashed border-slate-300 bg-white/50 py-16 text-center">
        <Layers className="mx-auto mb-3 h-8 w-8 text-slate-300" />
        <p className="text-sm font-semibold text-slate-500">No flashcards available for this unit.</p>
      </div>
    );
  }

  const isMastered = mastered.has(currentCard.id);
  const masteryPct = Math.round((mastered.size / deck.length) * 100);

  return (
    <div className="animate-fade-in">
      {/* Header bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100">
            <Layers className="h-5 w-5 text-teal-700" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Flashcard Deck</h2>
            <p className="text-xs text-slate-500">
              Card {position + 1} of {deck.length}
            </p>
          </div>
        </div>

        {/* Mastery counter */}
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2.5">
          <Sparkles className="h-5 w-5 text-emerald-600" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Mastered:</span>
            <span className="text-lg font-extrabold text-emerald-700">{mastered.size}</span>
            <span className="text-sm font-bold text-slate-400">/ {deck.length}</span>
          </div>
          <div className="ml-1 h-2 w-16 overflow-hidden rounded-full bg-emerald-200/60">
            <div
              className="h-full rounded-full gradient-emerald transition-all duration-500"
              style={{ width: `${masteryPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="perspective-1000 mx-auto max-w-2xl">
        <button
          onClick={() => setIsFlipped((v) => !v)}
          className="group relative h-80 w-full cursor-pointer select-none sm:h-96"
          aria-label="Flip card"
        >
          <div
            className={`preserve-3d relative h-full w-full transition-transform duration-700 ease-out ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
          >
            {/* Front */}
            <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-xl shadow-emerald-900/5 glow-border">
              <span className="absolute left-5 top-5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Question
              </span>
              {isMastered && (
                <span className="absolute right-5 top-5 flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white">
                  <Check className="h-3 w-3" /> Mastered
                </span>
              )}
              <p className="font-serif text-xl font-semibold leading-relaxed text-slate-800 sm:text-2xl">
                {currentCard.front}
              </p>
              <p className="absolute bottom-5 text-xs font-medium text-slate-400">
                Click to flip
              </p>
            </div>

            {/* Back */}
            <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-teal-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-8 text-center shadow-xl shadow-teal-900/10">
              <span className="absolute left-5 top-5 rounded-lg bg-teal-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-teal-700">
                Answer
              </span>
              <p className="text-base font-medium leading-relaxed text-slate-700 sm:text-lg">
                {currentCard.back}
              </p>
              <p className="absolute bottom-5 text-xs font-medium text-slate-400">
                Click to flip back
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Controls */}
      <div className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-3">
        <button
          onClick={goPrev}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>

        <button
          onClick={handleShuffle}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
        >
          <Shuffle className="h-4 w-4" /> Shuffle
        </button>

        <button
          onClick={toggleMastered}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition-all ${
            isMastered
              ? 'bg-emerald-500 text-white shadow-emerald-500/30 hover:bg-emerald-600'
              : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          {isMastered ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {isMastered ? 'Mastered' : 'Mark Mastered'}
        </button>

        <button
          onClick={goNext}
          className="flex items-center gap-1.5 rounded-xl gradient-emerald px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/25 transition-all hover:shadow-lg hover:shadow-emerald-500/30"
        >
          Next Card <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Reset mastery */}
      {mastered.size > 0 && (
        <div className="mx-auto mt-4 flex max-w-2xl justify-center">
          <button
            onClick={resetMastery}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-600"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset mastery
          </button>
        </div>
      )}

      {/* Progress dots */}
      <div className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-1.5">
        {order.map((cardIdx, i) => {
          const card = deck[cardIdx];
          const isCurrent = i === position;
          const isMasteredCard = mastered.has(card.id);
          return (
            <button
              key={i}
              onClick={() => {
                setPosition(i);
                setIsFlipped(false);
              }}
              className={`h-2 rounded-full transition-all ${
                isCurrent
                  ? 'w-6 gradient-emerald'
                  : isMasteredCard
                    ? 'w-2 bg-emerald-400'
                    : 'w-2 bg-slate-200 hover:bg-slate-300'
              }`}
              aria-label={`Go to card ${i + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
}
