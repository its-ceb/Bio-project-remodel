import { useMemo, useState, useEffect } from 'react';
import {
  Check,
  X,
  RotateCcw,
  Trophy,
  ChevronRight,
  ClipboardList,
  Award,
  Target,
  TrendingUp,
  Sparkles,
  Wand2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { mcqs, type MCQ, type UnitId } from '@/data/biology';
import {
  generateMCQs,
  describeGeminiError,
  hasGeminiApiKey,
  readAiCache,
  writeAiCache,
  clearAiCache,
} from '@/lib/gemini';

interface MCQModuleProps {
  selectedUnit: UnitId | 'all';
}

/** Questions per AI batch. One request = one batch, so keep it chunky. */
const AI_BATCH_SIZE = 10;
const QUIZ_LENGTH = 10;

const UNIT_NAMES: Record<UnitId, string> = {
  diversity: 'Diversity in the Living World',
  cell: 'Structural Organisation in Plants and Animals',
  plant: 'Plant Physiology',
  human: 'Human Physiology',
};

const cacheName = (unit: UnitId | 'all') => `mcqs:${unit}`;

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type AnswerState = 'unanswered' | 'correct' | 'wrong';

export default function MCQModule({ selectedUnit }: MCQModuleProps) {
  /* The curated questions — free, always available */
  const basePool = useMemo<MCQ[]>(
    () => (selectedUnit === 'all' ? mcqs : mcqs.filter((q) => q.unit === selectedUnit)),
    [selectedUnit]
  );

  /* AI extras, restored from cache so a refresh never re-spends tokens */
  const [aiQuestions, setAiQuestions] = useState<MCQ[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<{ message: string; hint: string } | null>(null);

  const pool = useMemo<MCQ[]>(() => [...basePool, ...aiQuestions], [basePool, aiQuestions]);

  const [quiz, setQuiz] = useState<MCQ[]>(() => shuffleArray(basePool).slice(0, QUIZ_LENGTH));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [finished, setFinished] = useState(false);

  // Reset when unit changes
  useEffect(() => {
    const cached = readAiCache<MCQ[]>(cacheName(selectedUnit)) ?? [];
    setAiQuestions(cached);
    setQuiz(shuffleArray(basePool).slice(0, QUIZ_LENGTH));
    setCurrentIdx(0);
    setSelected(null);
    setAnswers([]);
    setFinished(false);
    setAiError(null);
  }, [selectedUnit, basePool]);

  const current = quiz[currentIdx];
  const score = answers.filter((a) => a === 'correct').length;

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const isCorrect = idx === current.correctIndex;
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIdx] = isCorrect ? 'correct' : 'wrong';
      return next;
    });
  };

  const handleNext = () => {
    if (currentIdx + 1 >= quiz.length) {
      setFinished(true);
      return;
    }
    setCurrentIdx((i) => i + 1);
    setSelected(null);
  };

  const handleRetry = () => {
    setQuiz(shuffleArray(pool).slice(0, QUIZ_LENGTH));
    setCurrentIdx(0);
    setSelected(null);
    setAnswers([]);
    setFinished(false);
  };

  /* ------------------------------------------------------------------ */
  /* AI generation — button-triggered only, and cached afterwards.       */
  /* ------------------------------------------------------------------ */
  const handleGenerateMore = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setAiError(null);

    try {
      const generated = await generateMCQs({
        unit: selectedUnit,
        unitNames: UNIT_NAMES,
        count: AI_BATCH_SIZE,
        avoidQuestions: pool.map((q) => q.question),
      });

      const stamped: MCQ[] = generated.map((q, i) => ({
        id: `ai-${selectedUnit}-${Date.now()}-${i}`,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        unit: q.unit as UnitId,
      }));

      const nextAi = [...aiQuestions, ...stamped];
      setAiQuestions(nextAi);
      writeAiCache(cacheName(selectedUnit), nextAi);

      // straight into a fresh quiz made of the new questions
      setQuiz(stamped.slice(0, QUIZ_LENGTH));
      setCurrentIdx(0);
      setSelected(null);
      setAnswers([]);
      setFinished(false);
    } catch (err) {
      console.error('MCQ generation failed:', err);
      setAiError(describeGeminiError(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearAiQuestions = () => {
    clearAiCache(cacheName(selectedUnit));
    setAiQuestions([]);
  };

  const aiCount = pool.length - basePool.length;

  if (quiz.length === 0) {
    return (
      <div className="animate-fade-in rounded-2xl border border-dashed border-slate-300 bg-white/50 py-16 text-center">
        <ClipboardList className="mx-auto mb-3 h-8 w-8 text-slate-300" />
        <p className="text-sm font-semibold text-slate-500">No questions available for this unit.</p>
      </div>
    );
  }

  if (finished) {
    return (
      <ScoreSummary
        score={score}
        total={quiz.length}
        onRetry={handleRetry}
        answers={answers}
        quiz={quiz}
        aiCount={aiCount}
        isGenerating={isGenerating}
        aiError={aiError}
        onGenerateMore={handleGenerateMore}
        onClearAiQuestions={handleClearAiQuestions}
      />
    );
  }

  const answered = selected !== null;
  const isCorrect = answers[currentIdx] === 'correct';
  const isAiQuestion = current.id.startsWith('ai-');

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      {/* Progress header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <ClipboardList className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">MCQ Practice</h2>
            <p className="text-xs text-slate-500">
              Question {currentIdx + 1} of {quiz.length}
              {aiCount > 0 && <span className="text-violet-500"> · {aiCount} AI in pool</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5">
          <Target className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-bold text-emerald-700">Score: {score}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full gradient-emerald transition-all duration-500"
          style={{ width: `${((currentIdx + (answered ? 1 : 0)) / quiz.length) * 100}%` }}
        />
      </div>

      {/* Question card */}
      <div key={current.id} className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
            NEET Pattern
          </span>
          {isAiQuestion && (
            <span className="flex items-center gap-1 rounded-md bg-violet-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-700">
              <Wand2 className="h-3 w-3" /> AI
            </span>
          )}
        </div>
        <h3 className="mt-3 text-base font-bold leading-relaxed text-slate-800 sm:text-lg">
          {current.question}
        </h3>

        {/* Options */}
        <div className="mt-5 grid gap-2.5">
          {current.options.map((opt, idx) => {
            const isThisSelected = selected === idx;
            const isThisCorrect = idx === current.correctIndex;

            let stateClass = 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50';
            if (answered) {
              if (isThisCorrect) {
                stateClass = 'border-emerald-400 bg-emerald-50';
              } else if (isThisSelected) {
                stateClass = 'border-red-400 bg-red-50 animate-shake';
              } else {
                stateClass = 'border-slate-200 bg-white opacity-60';
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={answered}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium text-slate-700 transition-all duration-200 ${stateClass} ${
                  !answered ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                    answered && isThisCorrect
                      ? 'bg-emerald-500 text-white'
                      : answered && isThisSelected
                        ? 'bg-red-500 text-white'
                        : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {answered && isThisCorrect ? (
                    <Check className="h-4 w-4" />
                  ) : answered && isThisSelected ? (
                    <X className="h-4 w-4" />
                  ) : (
                    String.fromCharCode(65 + idx)
                  )}
                </span>
                <span className="flex-1">{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {answered && (
          <div
            className={`animate-fade-in mt-5 rounded-xl border p-4 ${
              isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex items-center gap-2">
              {isCorrect ? (
                <Check className="h-5 w-5 text-emerald-600" />
              ) : (
                <X className="h-5 w-5 text-red-600" />
              )}
              <span className={`text-sm font-bold ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                {isCorrect ? 'Correct!' : 'Incorrect'}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              <span className="font-semibold text-slate-700">Explanation: </span>
              {current.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Next button */}
      {answered && (
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 rounded-xl gradient-emerald px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/25 transition-all hover:shadow-lg hover:shadow-emerald-500/30"
          >
            {currentIdx + 1 >= quiz.length ? 'View Results' : 'Next Question'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

interface ScoreSummaryProps {
  score: number;
  total: number;
  onRetry: () => void;
  answers: AnswerState[];
  quiz: MCQ[];
  aiCount: number;
  isGenerating: boolean;
  aiError: { message: string; hint: string } | null;
  onGenerateMore: () => void;
  onClearAiQuestions: () => void;
}

function ScoreSummary({
  score,
  total,
  onRetry,
  aiCount,
  isGenerating,
  aiError,
  onGenerateMore,
  onClearAiQuestions,
}: ScoreSummaryProps) {
  const pct = Math.round((score / total) * 100);
  const isExcellent = pct >= 80;
  const isGood = pct >= 50 && pct < 80;

  const grade = isExcellent ? 'Excellent' : isGood ? 'Good Effort' : 'Keep Practicing';
  const message = isExcellent
    ? "Outstanding! You're NEET-ready on this set."
    : isGood
      ? 'Solid attempt. Review the explanations and try again.'
      : "Don't worry — revise the notes and retry to improve.";

  const TrophyIcon = isExcellent ? Trophy : isGood ? Award : TrendingUp;

  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <div className="card-hover relative overflow-hidden rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-xl">
        {/* Decorative gradient blob */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-emerald-200/40 to-teal-200/30 blur-2xl" />

        <div className="relative">
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-3xl ${
              isExcellent
                ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                : isGood
                  ? 'bg-gradient-to-br from-teal-400 to-cyan-500'
                  : 'bg-gradient-to-br from-amber-400 to-orange-500'
            } shadow-lg`}
          >
            <TrophyIcon className="h-10 w-10 text-white" strokeWidth={1.8} />
          </div>

          <h2 className="mt-5 text-2xl font-extrabold text-slate-800">{grade}</h2>
          <p className="mt-1 text-sm text-slate-500">{message}</p>

          {/* Score display */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="text-5xl font-extrabold gradient-text">{score}</span>
            <span className="text-2xl font-bold text-slate-300">/ {total}</span>
          </div>

          {/* Progress ring bar */}
          <div className="mx-auto mt-5 h-3 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full gradient-emerald transition-all duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            {pct}% Accuracy
          </p>

          {/* Retry */}
          <button
            onClick={onRetry}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl gradient-emerald px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/25 transition-all hover:shadow-lg hover:shadow-emerald-500/30"
          >
            <RotateCcw className="h-4 w-4" /> Retry Quiz
          </button>

          {/* ---------------- AI: fresh questions after the curated set ---------------- */}
          <div className="mt-5 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100">
                <Wand2 className="h-4 w-4 text-violet-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">Finished the curated set?</p>
                <p className="text-xs text-slate-500">
                  Generate {AI_BATCH_SIZE} fresh NEET-style questions with Gemini.
                  {aiCount > 0 && ` ${aiCount} AI question${aiCount === 1 ? '' : 's'} already saved.`}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={onGenerateMore}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-violet-500/25 transition-all hover:bg-violet-500 disabled:opacity-60"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Generating…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" /> Generate {AI_BATCH_SIZE} with AI
                      </>
                    )}
                  </button>

                  {aiCount > 0 && (
                    <button
                      onClick={onClearAiQuestions}
                      className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600"
                    >
                      <RotateCcw className="h-3 w-3" /> Clear AI questions
                    </button>
                  )}
                </div>

                {!hasGeminiApiKey() && (
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600">
                    <AlertTriangle className="h-3 w-3" /> No API key configured — add VITE_GEMINI_API_KEY first.
                  </p>
                )}

                {aiError && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] text-red-700">
                    <p className="font-bold">{aiError.message}</p>
                    {aiError.hint && <p className="mt-1 text-red-600/90">{aiError.hint}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
