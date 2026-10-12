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
    },
    { key: 'voice' as TabKey, label: '表达', icon: MessageSquare },
    { key: 'body' as TabKey, label: '训练', icon: Dumbbell },
    { key: 'dashboard' as TabKey, label: '看板', icon: BarChart3 }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 ios-glass border-t border-white/[0.08] pb-safe-bottom">
      <div className="flex items-center justify-around h-[58px] max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onSelectTab(tab.key)}
              className="relative flex flex-col items-center justify-center flex-1 py-1 group select-none outline-none"
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-[22px] h-[22px] transition-all duration-200 ${
                    isActive ? 'text-white scale-105' : 'text-[#8E8E93] group-hover:text-slate-200'
                  }`}
                  strokeWidth={isActive ? 2.4 : 1.7}
                />
                {tab.badge && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#0A84FF] ring-2 ring-black animate-pulse" />
                )}
              </div>
              <span
                className={`text-[10px] mt-1 tracking-tight transition-colors duration-200 ${
                  isActive ? 'text-white font-semibold' : 'text-[#8E8E93] font-medium'
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
