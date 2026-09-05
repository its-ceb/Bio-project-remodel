import { useState, useEffect } from 'react';
import Sidebar, { type TabId } from '@/components/Sidebar';
import NotesModule from '@/components/NotesModule';
import FlashcardsModule from '@/components/FlashcardsModule';
import MCQModule from '@/components/MCQModule';
import { units, type UnitId } from '@/data/biology';
import { BookOpen, Layers, ClipboardList, Sparkles, Lock, Send, ShieldAlert } from 'lucide-react';

const tabMeta: Record<TabId, { title: string; subtitle: string; icon: typeof BookOpen }> = {
  notes: { title: 'Revision Notes', subtitle: 'High-yield NCERT-focused notes with keyword highlights', icon: BookOpen },
  flashcards: { title: 'Flashcards', subtitle: 'Flip cards to test your recall of key definitions', icon: Layers },
  mcq: { title: 'MCQ Practice', subtitle: 'NEET-pattern questions with instant feedback & explanations', icon: ClipboardList },
};

interface Message {
  id: number;
  text: string;
  sender: 'me' | 'them';
  time: string;
}

// SET YOUR DESIRED PIN HERE
const SECRET_PIN = "6767";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('notes');
  const [selectedUnit, setSelectedUnit] = useState<UnitId | 'all'>('all');

  // Stealth & PIN States
  const [clickCount, setClickCount] = useState(0);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);
  
  // Chat States
  const [isChatUnlocked, setIsChatUnlocked] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: 'Session connected. Encrypted channel active.', sender: 'them', time: '12:00 PM' }
  ]);

  // Triple-click handler logic
  const handleSecretTrigger = () => {
    setClickCount((prev) => prev + 1);
  };

  useEffect(() => {
    if (clickCount === 3) {
      setIsPinModalOpen(true); // Open PIN prompt instead of immediate chat unlock
      setClickCount(0);
    }
    const timer = setTimeout(() => setClickCount(0), 1000);
    return () => clearTimeout(timer);
  }, [clickCount]);

  // Validate entered PIN
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin === SECRET_PIN) {
      setIsPinModalOpen(false);
      setIsChatUnlocked(true);
      setEnteredPin('');
      setPinError(false);
    } else {
      setPinError(true);
      setEnteredPin('');
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMsg: Message = {
      id: Date.now(),
      text: inputMessage,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');
  };

  const meta = tabMeta[activeTab];
  const Icon = meta.icon;
  const unitLabel =
    selectedUnit === 'all'
      ? 'All Units'
      : units.find((u) => u.id === selectedUnit)?.name ?? 'All Units';

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/40 font-sans">
      
      {/* 1. SECRET PIN PASSCODE MODAL */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Authentication Required</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">Enter security passcode to unlock channel.</p>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  setPinError(false);
                }}
                placeholder="••••"
                className={`w-full text-center tracking-widest text-2xl bg-slate-800 border ${
                  pinError ? 'border-red-500 animate-shake' : 'border-slate-700'
                } rounded-xl py-3 text-white focus:outline-none focus:border-emerald-500`}
              />
              
              {pinError && (
                <p className="text-xs text-center text-red-400 font-semibold">Invalid Passcode</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPinModalOpen(false);
                    setEnteredPin('');
                    setPinError(false);
                  }}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-semibold"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. ENCRYPTED CHAT VIEW */}
      {isChatUnlocked ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 font-sans">
          <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
                Secure Channel
              </span>
            </div>
            <button
              onClick={() => setIsChatUnlocked(false)}
              className="rounded-lg bg-red-600/20 px-3 py-1 text-xs font-semibold text-red-400 border border-red-500/30 hover:bg-red-600 hover:text-white transition-all"
            >
              Exit / Lock
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-3xl w-full mx-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.sender === 'me'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="mt-1 text-[10px] text-slate-500 px-1">{msg.time}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="border-t border-slate-800 bg-slate-900/60 p-4">
            <div className="max-w-3xl mx-auto flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type message..."
                className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-white hover:bg-emerald-500 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* 3. PRIMARY BIOLOGY REVISION VIEW */
        <div>
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            selectedUnit={selectedUnit}
            onUnitChange={setSelectedUnit}
          />

          <main className="lg:pl-64">
            <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
              <div key={activeTab} className="animate-fade-up">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Class 11 NEET Biology</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-emerald shadow-lg shadow-emerald-500/25">
                    <Icon className="h-6 w-6 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 sm:text-3xl">{meta.title}</h1>
                    <p className="text-sm text-slate-500">{meta.subtitle}</p>
                  </div>
                </div>

                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/60 px-3.5 py-1.5 text-xs font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {unitLabel}
                </div>
              </div>

              <div className="mt-8" key={`${activeTab}-${selectedUnit}`}>
                {activeTab === 'notes' && <NotesModule selectedUnit={selectedUnit} />}
                {activeTab === 'flashcards' && <FlashcardsModule selectedUnit={selectedUnit} />}
                {activeTab === 'mcq' && <MCQModule selectedUnit={selectedUnit} />}
              </div>
            </div>
          </main>
        </div>
      )}

      {/* FOOTER WITH TRIGGER */}
      <footer className="py-6 text-center text-xs text-slate-400 lg:pl-64">
        NCERT Class 11 Biology Revision Portal{' '}
        <span
          onClick={handleSecretTrigger}
          className="cursor-pointer select-none transition-colors hover:text-slate-600"
        >
          ©
        </span>{' '}
        2026
      </footer>
    </div>
  );
}