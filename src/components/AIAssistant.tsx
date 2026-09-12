import React, { useState, useRef, useEffect } from 'react';
import {
  Bot, Send, User, Sparkles, RefreshCw, BookOpen, AlertTriangle, X
} from 'lucide-react';
import {
  askGeminiBiology,
  describeGeminiError,
  hasGeminiApiKey,
  type ChatTurn,
} from '@/lib/gemini';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
  /** set when a reply failed — shown as an error card with a retry action */
  error?: { message: string; hint: string };
  /** the question that produced this failure, so Retry can resend it */
  retryQuestion?: string;
}

interface AIAssistantProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const WELCOME: Message = {
  id: 'welcome',
  sender: 'ai',
  text:
    'Hello! I am your NCERT Biology AI Tutor. Ask me any conceptual question, request quick summaries, or ask for NEET-pattern practice questions!',
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

const QUICK_PROMPTS = [
  { label: 'C4 Photosynthesis', icon: BookOpen, prompt: 'Summarize Photosynthesis in C4 plants' },
  { label: 'Cell Cycle MCQs', icon: Sparkles, prompt: 'Give 3 NEET questions on Cell Cycle' },
];

export default function AIAssistant({ isOpen = true, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const keyPresent = hasGeminiApiKey();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  /** previous turns, so the tutor remembers the conversation */
  const buildHistory = (list: Message[]): ChatTurn[] =>
    list
      .filter((m) => !m.error && m.id !== 'welcome')
      .slice(-10)
      .map((m) => ({ role: m.sender === 'ai' ? ('model' as const) : ('user' as const), text: m.text }));

  const ask = async (question: string, historyOverride?: Message[]) => {
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      time: stamp,
    };

    const base = historyOverride ?? messages;
    setMessages([...base, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await askGeminiBiology(trimmed, buildHistory(base));

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'ai',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      // Show EXACTLY what went wrong instead of a generic message
      const { message, hint } = describeGeminiError(err);
      console.error('Gemini error:', err);

      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          sender: 'ai',
          text: message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          error: { message, hint },
          retryQuestion: trimmed,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  /** Re-send the question that failed, without duplicating it in the thread. */
  const handleRetry = (failed: Message) => {
    if (!failed.retryQuestion) return;
    const withoutFailure = messages.filter((m) => m.id !== failed.id && m.retryQuestion !== failed.retryQuestion);
    const lastUser = [...withoutFailure].reverse().find((m) => m.sender === 'user');
    const history = lastUser && lastUser.text === failed.retryQuestion
      ? withoutFailure.filter((m) => m.id !== lastUser.id)
      : withoutFailure;
    ask(failed.retryQuestion, history);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden font-sans">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              NEET Biology AI Assistant
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                Gemini Powered
              </span>
            </h3>
            <p className="text-xs text-slate-400">Instant doubt resolution & NCERT guidance</p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Close assistant"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* MISSING KEY BANNER — says exactly what to do */}
      {!keyPresent && (
        <div className="flex items-start gap-2 border-b border-amber-500/20 bg-amber-500/10 px-5 py-3 text-[11px] text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p className="font-bold">The AI tutor is unavailable right now.</p>
            <p className="mt-0.5 text-amber-200/80">
              No Gemini API key is configured for this build, so questions cannot be answered. The
              flashcards and MCQ practice work as normal.
            </p>
          </div>
        </div>
      )}

      {/* CHAT MESSAGES CONTAINER */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-950/50">
        {messages.map((msg) => {
          const isAi = msg.sender === 'ai';
          return (
            <div key={msg.id} className={`flex gap-3 ${isAi ? 'items-start' : 'items-start flex-row-reverse'}`}>
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  msg.error ? 'bg-red-600/20 text-red-400' : isAi ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-200'
                }`}
              >
                {msg.error ? <AlertTriangle className="h-4 w-4" /> : isAi ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.error
                    ? 'bg-red-500/10 border border-red-500/30 text-red-200 rounded-tl-none shadow-sm'
                    : isAi
                      ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
                      : 'bg-emerald-600 text-white rounded-tr-none'
                }`}
              >
                <p>{msg.text}</p>

                {msg.error?.hint && (
                  <p className="mt-2 border-t border-red-500/20 pt-2 text-[11px] text-red-300/90">
                    {msg.error.hint}
                  </p>
                )}

                {msg.error && msg.retryQuestion && (
                  <button
                    type="button"
                    onClick={() => handleRetry(msg)}
                    disabled={isLoading}
                    className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-bold text-red-100 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" /> Retry
                  </button>
                )}

                <span className={`block text-[10px] mt-1.5 ${isAi ? 'text-slate-500' : 'text-emerald-200 text-right'}`}>
                  {msg.time}
                </span>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-3 text-slate-400 text-xs italic">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-400">
              <RefreshCw className="h-4 w-4 animate-spin" />
            </div>
            <span>Querying Gemini & NCERT references...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* QUICK SUGGESTIONS */}
      <div className="px-5 py-2.5 bg-slate-900 border-t border-slate-800/80 flex gap-2 overflow-x-auto text-xs text-slate-400">
        {QUICK_PROMPTS.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <button
              key={suggestion.label}
              onClick={() => setInput(suggestion.prompt)}
              className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-slate-200 transition-colors border border-slate-700/50 flex items-center gap-1.5"
            >
              <Icon className={`h-3.5 w-3.5 ${suggestion.icon === BookOpen ? 'text-emerald-400' : 'text-indigo-400'}`} />
              {suggestion.label}
            </button>
          );
        })}
      </div>

      {/* INPUT FORM */}
      <form onSubmit={handleSend} className="p-4 bg-slate-900 border-t border-slate-800 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a biology doubt or concept..."
          className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
