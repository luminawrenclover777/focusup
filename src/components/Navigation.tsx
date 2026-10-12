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
      badge: hasActiveSession ? '·' : undefined,
      color: 'text-blue-400'
    },
    { key: 'voice' as TabKey, label: '表达', icon: MessageSquare, color: 'text-amber-400' },
    { key: 'body' as TabKey, label: '训练', icon: Dumbbell, color: 'text-emerald-400' },
    { key: 'dashboard' as TabKey, label: '看板', icon: BarChart3 }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-dark-900/95 backdrop-blur-lg border-t border-dark-700/80 pb-safe-bottom">
      <div className="flex items-center justify-around h-14 max-w-md mx-auto px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onSelectTab(tab.key)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-95 ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 ' + (tab.color || 'text-white') : 'text-slate-400'
                  }`}
                />
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
                )}
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                )}
              </div>
              <span
                className={`text-[10px] mt-1 font-medium transition-colors ${
                  isActive ? (tab.color || 'text-white font-semibold') : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-slate-300"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
