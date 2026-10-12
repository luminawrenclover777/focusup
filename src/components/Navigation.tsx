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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-dark-900/85 backdrop-blur-xl border-t border-white/[0.06] pb-safe-bottom">
      <div className="flex items-center justify-around h-13 max-w-md mx-auto px-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onSelectTab(tab.key)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1.5 transition-all active:scale-90 ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-105 ' + (tab.color || 'text-white') : 'text-slate-400'
                  }`}
                />
                {tab.badge && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 font-medium transition-colors ${
                  isActive ? (tab.color || 'text-white font-semibold') : 'text-slate-400'
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
