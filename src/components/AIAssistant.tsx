import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, RefreshCw, BookOpen } from 'lucide-react';
import { askGeminiBiology } from '@/lib/gemini';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
}

interface AIAssistantProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AIAssistant({ isOpen = true }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Hello! I am your NCERT Biology AI Tutor. Ask me any conceptual question, request quick summaries, or ask for NEET-pattern practice questions!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsgText = input;
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userMsgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const aiTextResponse = await askGeminiBiology(userMsgText);

    const aiResponse: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'ai',
      text: aiTextResponse,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, aiResponse]);
    setIsLoading(false);
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
      </div>

      {/* CHAT MESSAGES CONTAINER */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-950/50">
        {messages.map((msg) => {
          const isAi = msg.sender === 'ai';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isAi ? 'items-start' : 'items-start flex-row-reverse'}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isAi ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-200'
                }`}
              >
                {isAi ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  isAi
                    ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
                    : 'bg-emerald-600 text-white rounded-tr-none'
                }`}
              >
                <p>{msg.text}</p>
                <span
                  className={`block text-[10px] mt-1.5 ${
                    isAi ? 'text-slate-500' : 'text-emerald-200 text-right'
                  }`}
                >
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
        <button
          onClick={() => setInput('Summarize Photosynthesis in C4 plants')}
          className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-slate-200 transition-colors border border-slate-700/50 flex items-center gap-1.5"
        >
          <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
          C4 Photosynthesis
        </button>
        <button
          onClick={() => setInput('Give 3 NEET questions on Cell Cycle')}
          className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-slate-200 transition-colors border border-slate-700/50 flex items-center gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          Cell Cycle MCQs
        </button>
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