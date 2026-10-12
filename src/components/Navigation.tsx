import React from 'react';
import { Compass, Timer, MessageSquare, Dumbbell, BarChart3 } from 'lucide-react';

export type TabKey = 'today' | 'focus' | 'voice' | 'body' | 'dashboard';

interface NavigationProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  hasActiveSession?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  hasActiveSession
}) => {
  const tabs = [
    { key: 'today' as TabKey, label: '今日', icon: Compass },
    {
      key: 'focus' as TabKey,
      label: '专注',
      icon: Timer,
      badge: hasActiveSession,
      color: 'text-blue-400'
    },
    { key: 'voice' as TabKey, label: '表达', icon: MessageSquare, color: 'text-amber-400' },
    { key: 'body' as TabKey, label: '训练', icon: Dumbbell, color: 'text-emerald-400' },
    { key: 'dashboard' as TabKey, label: '看板', icon: BarChart3 }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#000000] border-t border-white/[0.08] pb-safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onSelectTab(tab.key)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1.5 transition-all active:scale-95 ${
                isActive ? 'text-white' : 'text-[#8E8E93] hover:text-slate-300'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-6 h-6 transition-all duration-200 ${
                    isActive ? (tab.color || 'text-white') : 'text-[#8E8E93]'
                  }`}
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse ring-2 ring-black"></span>
                )}
              </div>
              <span
                className={`text-[11px] mt-1 tracking-tight transition-colors ${
                  isActive ? (tab.color || 'text-white font-semibold') : 'text-[#8E8E93] font-medium'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
