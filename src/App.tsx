import React, { useState, useEffect, useCallback } from 'react';
import type { EnergyMode, DimensionStats, DailyHabit } from './types';
import { db, getLocalDate, ensureUserSettings } from './db';
import { getDimensionStats, getDailyCapInfo } from './services/expService';
import { getTicketBalance } from './services/ticketService';
import { Header } from './components/Header';
import { Navigation, type TabKey } from './components/Navigation';
import { TodayTab } from './components/TodayTab';
import { FocusPodTab } from './components/FocusPodTab';
import { VoiceTab } from './components/VoiceTab';
import { BodyTab } from './components/BodyTab';
import { DashboardTab } from './components/DashboardTab';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [energyMode, setEnergyMode] = useState<EnergyMode>('normal');
  const [hasActiveSession, setHasActiveSession] = useState<boolean>(false);

  // Focus quick start parameters
  const [focusInitialMinutes, setFocusInitialMinutes] = useState<number | undefined>(undefined);
  // Voice trigger parameter
  const [voiceInitialTrigger, setVoiceInitialTrigger] = useState<'intercept' | 'stop_loss' | 'daily_practice'>('daily_practice');

  // Stats
  const [stats, setStats] = useState<{
    focus: DimensionStats;
    body: DimensionStats;
    voice: DimensionStats;
    totalExp: number;
  }>({
    focus: { dimension: 'focus', exp: 0, level: 1, levelExp: 0, nextLevelExp: 300 },
    body: { dimension: 'body', exp: 0, level: 1, levelExp: 0, nextLevelExp: 300 },
    voice: { dimension: 'voice', exp: 0, level: 1, levelExp: 0, nextLevelExp: 300 },
    totalExp: 0
  });

  const [ticketBalance, setTicketBalance] = useState<number>(0);

  // Today Habits
  const [todayHabit, setTodayHabit] = useState<DailyHabit>({
    localDate: getLocalDate(),
    protein: false,
    sleep: false,
    activity: false
  });

  // Daily caps
  const [dailyCounts, setDailyCounts] = useState<{
    interceptCount: number;
    interceptCap: number;
    stopLossCount: number;
    stopLossCap: number;
  }>({
    interceptCount: 0,
    interceptCap: 5,
    stopLossCount: 0,
    stopLossCap: 5
  });

  // Load everything
  const loadAppState = useCallback(async () => {
    const settings = await ensureUserSettings();
    setEnergyMode(settings.energyMode);

    const dimStats = await getDimensionStats();
    setStats(dimStats);

    const tData = await getTicketBalance();
    setTicketBalance(tData.balance);

    const today = getLocalDate();
    const habit = await db.dailyHabits.get(today);
    if (habit) {
      setTodayHabit(habit);
    } else {
      setTodayHabit({
        localDate: today,
        protein: false,
        sleep: false,
        activity: false
      });
    }

    const intCap = await getDailyCapInfo('intercept', today);
    const slCap = await getDailyCapInfo('stop_loss', today);
    setDailyCounts({
      interceptCount: intCap.used,
      interceptCap: intCap.max,
      stopLossCount: slCap.used,
      stopLossCap: slCap.max
    });

    // Check active session
    const running = await db.focusSessions
      .where('status')
      .anyOf(['running', 'paused'])
      .first();
    setHasActiveSession(!!running);
  }, []);

  useEffect(() => {
    loadAppState();
  }, [loadAppState]);

  // Toggle Energy Mode
  const handleToggleEnergyMode = async () => {
    const nextMode: EnergyMode = energyMode === 'normal' ? 'recovery' : 'normal';
    setEnergyMode(nextMode);
    await db.settings.update('current', {
      energyMode: nextMode,
      lastModeDate: getLocalDate()
    });
  };

  // Navigation handlers
  const handleNavigateToFocus = (mins?: number) => {
    setFocusInitialMinutes(mins);
    setActiveTab('focus');
  };

  const handleNavigateToVoice = (trigger?: 'intercept' | 'stop_loss' | 'daily_practice') => {
    setVoiceInitialTrigger(trigger || 'daily_practice');
    setActiveTab('voice');
  };

  const handleNavigateToBody = () => {
    setActiveTab('body');
  };

  const todayCompletedCount = (todayHabit.protein ? 1 : 0) + (todayHabit.sleep ? 1 : 0) + (todayHabit.activity ? 1 : 0) + dailyCounts.interceptCount + dailyCounts.stopLossCount;

  return (
    <div className="min-h-screen bg-black text-[#F2F2F7] flex flex-col justify-between pb-20 selection:bg-[#007AFF] selection:text-white">
      {/* Header */}
      <Header
        energyMode={energyMode}
        onToggleEnergyMode={handleToggleEnergyMode}
        ticketBalance={ticketBalance}
        onOpenTickets={() => setActiveTab('dashboard')}
        todayCompletedCount={todayCompletedCount}
      />

      {/* Main Content View */}
      <main className="flex-1 w-full max-w-lg mx-auto">
        {activeTab === 'today' && (
          <TodayTab
            energyMode={energyMode}
            stats={stats}
            onNavigateToFocus={handleNavigateToFocus}
            onNavigateToVoice={handleNavigateToVoice}
            onNavigateToBody={handleNavigateToBody}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
            todayHabit={todayHabit}
            onHabitChange={setTodayHabit}
            dailyCounts={dailyCounts}
            refreshData={loadAppState}
          />
        )}

        {activeTab === 'focus' && (
          <FocusPodTab
            energyMode={energyMode}
            initialMinutes={focusInitialMinutes}
            refreshData={loadAppState}
            onActiveSessionChange={setHasActiveSession}
          />
        )}

        {activeTab === 'voice' && (
          <VoiceTab
            initialTrigger={voiceInitialTrigger}
            refreshData={loadAppState}
          />
        )}

        {activeTab === 'body' && (
          <BodyTab
            refreshData={loadAppState}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardTab
            stats={stats}
            refreshData={loadAppState}
          />
        )}
      </main>

      {/* Bottom Safe Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        hasActiveSession={hasActiveSession}
      />
    </div>
  );
};

export default App;
