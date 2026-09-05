import { useState } from 'react';
import {
  BookOpen,
  Layers,
  ClipboardList,
  Leaf,
  Microscope,
  Sprout,
  HeartPulse,
  ChevronDown,
  Menu,
  X,
  GraduationCap,
} from 'lucide-react';
import { units, type UnitId } from '@/data/biology';
import type { LucideIcon } from 'lucide-react';

export type TabId = 'notes' | 'flashcards' | 'mcq';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  selectedUnit: UnitId | 'all';
  onUnitChange: (unit: UnitId | 'all') => void;
}

const tabItems: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'notes', label: 'Notes', icon: BookOpen },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'mcq', label: 'MCQ Practice', icon: ClipboardList },
];

const unitIcons: Record<UnitId, LucideIcon> = {
  diversity: Leaf,
  cell: Microscope,
  plant: Sprout,
  human: HeartPulse,
};

export default function Sidebar({ activeTab, onTabChange, selectedUnit, onUnitChange }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);

  const selectedUnitObj = units.find((u) => u.id === selectedUnit);
  const SelectedUnitIcon = selectedUnitObj ? unitIcons[selectedUnitObj.id] : GraduationCap;

  const handleTabClick = (tab: TabId) => {
    onTabChange(tab);
    setMobileOpen(false);
  };

  const handleUnitSelect = (unit: UnitId | 'all') => {
    onUnitChange(unit);
    setUnitDropdownOpen(false);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-emerald shadow-lg shadow-emerald-500/30">
          <GraduationCap className="h-6 w-6 text-white" strokeWidth={2.2} />
        </div>
        <div className="leading-tight">
          <h1 className="text-base font-extrabold text-slate-800">NEET Biology</h1>
          <p className="text-xs font-medium text-slate-400">Class 11 Revision</p>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1.5 px-3">
        <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Modules
        </p>
        {tabItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                active
                  ? 'gradient-emerald text-white shadow-md shadow-emerald-500/25'
                  : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600'}`} strokeWidth={2} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Unit Selector */}
      <div className="px-3 pt-6">
        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Unit
        </p>
        <div className="relative">
          <button
            onClick={() => setUnitDropdownOpen((v) => !v)}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50/50"
          >
            <SelectedUnitIcon className="h-[18px] w-[18px] text-emerald-600" strokeWidth={2} />
            <span className="flex-1 truncate">
              {selectedUnit === 'all' ? 'All Units' : selectedUnitObj?.shortName}
            </span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${unitDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {unitDropdownOpen && (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 animate-pop overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
              <button
                onClick={() => handleUnitSelect('all')}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-emerald-50 ${
                  selectedUnit === 'all' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600'
                }`}
              >
                <GraduationCap className="h-[18px] w-[18px] text-emerald-600" />
                All Units
              </button>
              {units.map((unit) => {
                const Icon = unitIcons[unit.id];
                return (
                  <button
                    key={unit.id}
                    onClick={() => handleUnitSelect(unit.id)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-emerald-50 ${
                      selectedUnit === unit.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600'
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px] text-emerald-600" />
                    <span className="flex-1 truncate">{unit.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto p-4">
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
          <p className="text-xs font-bold text-emerald-800">High-Yield NCERT</p>
          <p className="mt-1 text-[11px] leading-relaxed text-emerald-700/80">
            Focused revision notes, flashcards & NEET-pattern MCQs across all Class 11 Biology units.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="glass sticky top-0 z-40 flex items-center justify-between px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-emerald">
            <GraduationCap className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <span className="text-sm font-extrabold text-slate-800">NEET Biology</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] animate-slide-in overflow-y-auto bg-white shadow-2xl scrollbar-thin">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 border-r border-slate-200/70 bg-white/80 backdrop-blur-xl lg:block">
        {sidebarContent}
      </aside>
    </>
  );
}
