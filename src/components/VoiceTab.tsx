import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  CheckCircle2,
  History,
  Mic,
  Square,
  PenTool,
  RotateCw,
  ArrowLeft
} from 'lucide-react';
import type { ExpressionLog } from '../types';
import { db, getLocalDate } from '../db';
import { awardExp, EXP_RULES, getDailyCapInfo } from '../services/expService';
import confetti from 'canvas-confetti';

interface VoiceTabProps {
  initialTrigger?: 'intercept' | 'stop_loss' | 'daily_practice';
  refreshData: () => void;
}

const INSPIRATION_PROMPTS = [
  '今天哪一个瞬间让你感到真正放松或开心？',
  '刚才想刷手机或分心时，内心是在逃避某种压力或无聊吗？',
  '如果给当下的自己一句温柔的提醒，你想对自己说什么？',
  '今天学到了什么新认识，或者看到了什么有趣的观点？',
  '用一句话概括：接下来这半天，最值得我专注做好的一件事是什么？',
  '最近有没有什么事情让你卡住了？试着像旁观者一样把困惑说出来。',
  '一件微小但值得感恩的事情：今天谁帮助了你，或者有什么小幸运？'
];

export const VoiceTab: React.FC<VoiceTabProps> = ({
  initialTrigger = 'daily_practice',
  refreshData
}) => {
  const [promptIndex, setPromptIndex] = useState<number>(0);
  const [mode, setMode] = useState<'speak' | 'write'>('speak');
  
  // Audio record state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const recordIntervalRef = useRef<number | null>(null);

  // Text write state
  const [noteContent, setNoteContent] = useState<string>('');

  const [step, setStep] = useState<'active' | 'success'>('active');
  const [dailyCap, setDailyCap] = useState<{ used: number; max: number; remaining: number }>({ used: 0, max: 3, remaining: 3 });
  const [historyLogs, setHistoryLogs] = useState<ExpressionLog[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const loadLogs = async () => {
    const cap = await getDailyCapInfo('expression');
    setDailyCap(cap);
    const logs = await db.expressionLogs.orderBy('createdAt').reverse().limit(15).toArray();
    setHistoryLogs(logs);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleNextPrompt = () => {
    setPromptIndex((prev) => (prev + 1) % INSPIRATION_PROMPTS.length);
  };

  // Timer controls for speaking
  const handleToggleRecord = () => {
    if (isRecording) {
      // Stop recording
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      setIsRecording(false);
      handleSaveExpression(`语音随心表达 (${recordSeconds} 秒)`);
    } else {
      // Start recording
      setRecordSeconds(0);
      setIsRecording(true);
      recordIntervalRef.current = window.setInterval(() => {
        setRecordSeconds((sec) => {
          if (sec >= 60) {
            if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
            setIsRecording(false);
            handleSaveExpression('语音随心表达 (满 60 秒)');
            return 60;
          }
          return sec + 1;
        });
      }, 1000);
    }
  };

  useEffect(() => {
    return () => {
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    };
  }, []);

  const handleSaveExpression = async (customSummary?: string) => {
    const today = getLocalDate();
    const logId = `expr_${Date.now()}`;
    const topicText = INSPIRATION_PROMPTS[promptIndex];
    const contentText = customSummary || noteContent.trim() || '随手灵感速记';

    const log: ExpressionLog = {
      id: logId,
      createdAt: Date.now(),
      localDate: today,
      triggerType: initialTrigger,
      framework: 'PREP',
      topic: topicText,
      slot1: contentText,
      slot2: mode === 'speak' ? `口述时长: ${recordSeconds || 60}s` : '文字速记',
      slot3: '已完成无压力倾诉',
      mentorQuestion: topicText,
      completed: true
    };

    await db.expressionLogs.put(log);

    const tx = await awardExp({
      dimension: 'voice',
      amount: EXP_RULES.EXPRESSION,
      reason: '完成 60 秒随心表达与灵感倾倒',
      sourceType: 'expression',
      sourceId: logId,
      localDate: today
    });

    if (tx) {
      confetti({ particleCount: 45, spread: 70, origin: { y: 0.6 } });
    }

    setStep('success');
    loadLogs();
    refreshData();
  };

  const handleReset = () => {
    setNoteContent('');
    setRecordSeconds(0);
    setIsRecording(false);
    setStep('active');
    handleNextPrompt();
  };

  return (
    <div className="space-y-6 px-5 py-4 max-w-lg mx-auto pb-28">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">随心表达</h2>
          <p className="text-xs text-[#8E8E93] mt-1">倾倒杂念 · 记录灵感 · 找回内心平静</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#8E8E93] px-3 py-1 rounded-full bg-[#1C1C1E] border border-white/10">
            今日 {dailyCap.used}/{dailyCap.max}
          </span>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-10 h-10 rounded-full bg-[#1C1C1E] border border-white/10 text-slate-300 hover:text-white flex items-center justify-center active:scale-95 transition-all shadow-sm"
            title="历史表达"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showHistory ? (
        /* History View */
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-white">历史表达回顾</span>
            <button
              onClick={() => setShowHistory(false)}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              返回表达
            </button>
          </div>

          {historyLogs.length === 0 ? (
            <div className="p-10 text-center bg-[#1C1C1E] rounded-3xl border border-white/[0.08] text-[#8E8E93] text-sm">
              暂无表达记录，快去倾吐第一段灵感吧！
            </div>
          ) : (
            <div className="space-y-3">
              {historyLogs.map((item) => (
                <div key={item.id} className="p-5 rounded-3xl bg-[#1C1C1E] border border-white/[0.08] space-y-2 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-[#8E8E93]">
                    <span className="font-mono">{item.localDate}</span>
                    <span className="text-amber-400 font-semibold">+30 Voice EXP</span>
                  </div>
                  <h4 className="text-base font-bold text-white leading-snug">{item.topic}</h4>
                  <p className="text-sm text-slate-300 pt-1 leading-relaxed bg-[#2C2C2E]/60 p-3.5 rounded-2xl">
                    {item.slot1 || '口述随笔'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : step === 'success' ? (
        /* Success State */
        <div className="p-8 rounded-3xl bg-[#1C1C1E] border border-amber-500/30 text-center space-y-5 animate-fade-in shadow-lg">
          <span className="inline-flex p-4 rounded-full bg-amber-500/20 text-amber-400">
            <CheckCircle2 className="w-10 h-10" />
          </span>
          <div>
            <h3 className="text-2xl font-bold text-white">灵感已收录！</h3>
            <p className="text-sm text-slate-300 mt-2">
              恭喜倾倒大脑杂念，已入账 <strong className="text-amber-400 font-bold">+30 Voice EXP</strong>
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleReset}
              className="flex-1 h-13 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm shadow-md transition-all active:scale-95"
            >
              再来一段
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className="h-13 px-5 rounded-2xl bg-[#2C2C2E] text-slate-200 font-semibold text-sm hover:text-white"
            >
              查看记录
            </button>
          </div>
        </div>
      ) : (
        /* Main Active Expression Flow */
        <div className="space-y-5">
          {/* Inspiration Card */}
          <div className="p-6 rounded-3xl bg-[#1C1C1E] border border-white/[0.08] shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-amber-400 tracking-wide">
                <Sparkles className="w-4 h-4" />
                灵感启思
              </span>
              <button
                onClick={handleNextPrompt}
                className="flex items-center gap-1.5 text-xs text-[#8E8E93] hover:text-white transition-colors"
                title="换一个启发"
              >
                <RotateCw className="w-3.5 h-3.5" />
                换一个
              </button>
            </div>
            <p className="text-lg font-semibold text-white leading-relaxed">
              "{INSPIRATION_PROMPTS[promptIndex]}"
            </p>
          </div>

          {/* Mode Switch (Voice vs Note) */}
          <div className="flex items-center p-1.5 rounded-2xl bg-[#1C1C1E] border border-white/[0.08]">
            <button
              onClick={() => setMode('speak')}
              className={`flex-1 h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                mode === 'speak'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-[#8E8E93] hover:text-white'
              }`}
            >
              <Mic className="w-4 h-4" />
              60秒口述随心录
            </button>
            <button
              onClick={() => setMode('write')}
              className={`flex-1 h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                mode === 'write'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-[#8E8E93] hover:text-white'
              }`}
            >
              <PenTool className="w-4 h-4" />
              灵感速写
            </button>
          </div>

          {/* Voice Mode Content */}
          {mode === 'speak' ? (
            <div className="p-8 rounded-3xl bg-[#1C1C1E] border border-white/[0.08] flex flex-col items-center text-center space-y-5 shadow-sm">
              <div className="relative flex items-center justify-center">
                {isRecording && (
                  <span className="absolute w-28 h-28 rounded-full bg-amber-500/20 animate-ping"></span>
                )}
                <button
                  onClick={handleToggleRecord}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl ${
                    isRecording
                      ? 'bg-rose-500 text-white shadow-rose-500/30'
                      : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/25'
                  }`}
                >
                  {isRecording ? (
                    <Square className="w-8 h-8 fill-current" />
                  ) : (
                    <Mic className="w-10 h-10" />
                  )}
                </button>
              </div>

              <div>
                <span className="text-3xl font-mono font-bold text-white tabular-nums">
                  {isRecording ? `${recordSeconds} / 60 秒` : '点击开启 60 秒倾诉'}
                </span>
                <p className="text-xs text-[#8E8E93] mt-2">
                  {isRecording ? '畅所欲言，倾倒杂念…点击按钮可提前结束' : '不限内容，不设框架，讲完即打卡'}
                </p>
              </div>

              {isRecording && (
                <button
                  onClick={handleToggleRecord}
                  className="h-12 px-6 rounded-2xl bg-[#34C759] text-white font-semibold text-sm active:scale-95 shadow-md"
                >
                  讲完了，立即完成 (+30 EXP)
                </button>
              )}
            </div>
          ) : (
            /* Write Mode Content */
            <div className="p-6 rounded-3xl bg-[#1C1C1E] border border-white/[0.08] space-y-4 shadow-sm">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="在此写下任何随想、感悟、或是刚刚烦扰你的思绪（随便写几句即可）…"
                className="w-full h-36 p-4 rounded-2xl bg-[#2C2C2E] border border-white/[0.06] text-base text-white placeholder-[#8E8E93] focus:outline-none focus:border-amber-500/50 resize-none leading-relaxed"
              />
              <button
                onClick={() => handleSaveExpression()}
                className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-bold text-base shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
              >
                保存并打卡 (+30 EXP)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
