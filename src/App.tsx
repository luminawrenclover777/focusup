import React, { useState, useEffect, useCallback } from 'react';
import type { EnergyMode } from './types';
import { db, getLocalDate, ensureUserSettings } from './db';
import { Header } from './components/Header';
import { Navigation, type TabKey } from './components/Navigation';
import { FocusPodTab } from './components/FocusPodTab';
import { BrakeTab } from './components/BrakeTab';
import { LogTab } from './components/LogTab';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('focus');
  const [energyMode, setEnergyMode] = useState<EnergyMode>('normal');
  const [hasActiveSession, setHasActiveSession] = useState<boolean>(false);
  const [focusInitialMinutes, setFocusInitialMinutes] = useState<number | undefined>(undefined);

  // Honest metrics for today
  const [todayMinutes, setTodayMinutes] = useState<number>(0);
  const [todayBrakes, setTodayBrakes] = useState<number>(0);

  // Load app state
  const loadAppState = useCallback(async () => {
    const settings = await ensureUserSettings();
    setEnergyMode(settings.energyMode);

    const today = getLocalDate();

    // 1. Calculate today's focus minutes
    const sessions = await db.focusSessions.toArray();
    let secToday = 0;
    for (const s of sessions) {
      if (s.status === 'completed' && s.effectiveSeconds) {
        const sessionDate = new Date(s.startedAt).toISOString().split('T')[0];
        if (sessionDate === today) {
          secToday += s.effectiveSeconds;
        }
      }
    }
    setTodayMinutes(Math.floor(secToday / 60));

    // 2. Calculate today's brakes count
    const brakeCount = await db.activityEvents
      .where('localDate')
      .equals(today)
      .and((e) => e.type === 'stop_loss' || e.type === 'intercept')
      .count();
    setTodayBrakes(brakeCount);

    // 3. Check active session
    const running = await db.focusSessions
      .where('status')
      .anyOf(['running', 'paused'])
      .first();
    setHasActiveSession(!!running);
  }, []);

  useEffect(() => {
    loadAppState();
  }, [loadAppState]);

  // Navigate directly to focus with preset minutes (e.g. from BrakeTab 4-7-8 breathing)
  const handleNavigateToFocus = (mins: number) => {
    setFocusInitialMinutes(mins);
    setActiveTab('focus');
  };

  return (
    <div className="min-h-screen bg-black text-[#F2F2F7] flex flex-col justify-between pb-20 selection:bg-[#0A84FF] selection:text-white">
      {/* Top Fixed Header with Honest Metrics */}
      <Header
        todayMinutes={todayMinutes}
        todayBrakes={todayBrakes}
      />

      {/* Main Content View with top offset for fixed header */}
      <main className="flex-1 w-full max-w-lg mx-auto pt-[calc(68px+env(safe-area-inset-top))]">
        {activeTab === 'focus' && (
          <FocusPodTab
            energyMode={energyMode}
            initialMinutes={focusInitialMinutes}
            refreshData={loadAppState}
            onActiveSessionChange={setHasActiveSession}
          />
        )}

        {activeTab === 'brake' && (
          <BrakeTab
            onStartFocus={handleNavigateToFocus}
            onRefreshData={loadAppState}
          />
        )}

        {activeTab === 'log' && (
          <LogTab />
        )}
      </main>

      {/* Bottom Safe Navigation Bar (3 Tabs: Focus, Brake, Log) */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        hasActiveSession={hasActiveSession}
      />
    </div>
  );
};

export default App;
