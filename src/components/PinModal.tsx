import React, { useState } from 'react';
import { Lock, X, ShieldAlert } from 'lucide-react';

interface PinModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export default function PinModal({ onSuccess, onClose }: PinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '6767') {
      onSuccess();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4 shadow-inner">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-800">Security Access</h3>
          <p className="mt-1 text-xs text-slate-500">Enter passcode to unlock channel access</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(false);
              }}
              placeholder="••••"
              className={`w-full text-center text-2xl font-bold tracking-[0.5em] rounded-2xl border px-4 py-3 outline-none transition-all ${
                error
                  ? 'border-red-500 bg-red-50 text-red-600 focus:ring-2 focus:ring-red-200'
                  : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10'
              }`}
              autoFocus
            />
            {error && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-red-500">
                <ShieldAlert className="h-3.5 w-3.5" /> Invalid Passcode
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98]"
          >
            Unlock Channel
          </button>
        </form>
      </div>
    </div>
  );
}