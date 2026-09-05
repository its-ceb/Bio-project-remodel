import { useState, useRef } from 'react';
import Sidebar, { type TabId } from '@/components/Sidebar';
import NotesModule from '@/components/NotesModule';
import FlashcardsModule from '@/components/FlashcardsModule';
import MCQModule from '@/components/MCQModule';
import AIAssistant from '@/components/AIAssistant';
import SecretChat from '@/components/SecretChat';
import PinModal from '@/components/PinModal';
import type { UnitId } from '@/data/biology';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('notes');
  const [selectedUnit, setSelectedUnit] = useState<UnitId | 'all'>('all');
  const [showPinModal, setShowPinModal] = useState(false);
  const [showSecretChat, setShowSecretChat] = useState(false);

  const clickCountRef = useRef<number>(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleCopyrightClick = () => {
    clickCountRef.current += 1;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    if (clickCountRef.current === 3) {
      clickCountRef.current = 0;
      setShowPinModal(true);
      return;
    }

    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 400);
  };

  if (showSecretChat) {
    return <SecretChat onClose={() => setShowSecretChat(false)} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 antialiased">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedUnit={selectedUnit}
        onUnitChange={setSelectedUnit}
      />

      <div className="flex-1 lg:ml-64 flex flex-col justify-between">
        <main className="p-4 sm:p-6 lg:p-8">
          {activeTab === 'notes' && <NotesModule selectedUnit={selectedUnit} />}
          {activeTab === 'flashcards' && <FlashcardsModule selectedUnit={selectedUnit} />}
          {activeTab === 'mcq' && <MCQModule selectedUnit={selectedUnit} />}
          {activeTab === 'ai' && (
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-4 text-2xl font-bold text-slate-800">NCERT AI Biology Tutor</h2>
              <AIAssistant isOpen={true} onClose={() => setActiveTab('notes')} />
            </div>
          )}
        </main>

        <footer className="border-t border-slate-200/60 bg-white/50 px-4 py-3 text-center text-xs text-slate-400 select-none">
          <p>
            <button
              onClick={handleCopyrightClick}
              className="font-semibold text-slate-400 cursor-default focus:outline-none"
              aria-label="Copyright"
            >
              ©
            </button>{' '}
            {new Date().getFullYear()} NEET Biology Revision. All rights reserved.
          </p>
        </footer>
      </div>

      {showPinModal && (
        <PinModal
          onSuccess={() => {
            setShowPinModal(false);
            setShowSecretChat(true);
          }}
          onClose={() => setShowPinModal(false)}
        />
      )}
    </div>
  );
}