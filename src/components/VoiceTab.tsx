import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  History,
  ChevronRight
} from 'lucide-react';
import type { ExpressionLog } from '../types';
import { db, getLocalDate } from '../db';
import { awardExp, EXP_RULES, getDailyCapInfo } from '../services/expService';
import { getRandomMentorQuestion } from '../data/questionDeck';
import confetti from 'canvas-confetti';

interface VoiceTabProps {
  initialTrigger?: 'intercept' | 'stop_loss' | 'daily_practice';
  refreshData: () => void;
}

type FrameworkKey = 'PREP' | 'WHAT_WHY_HOW' | 'PRO_CON';

interface FrameworkMeta {
  title: string;
  tagline: string;
  slots: [string, string, string];
  placeholders: [string, string, string];
}

const FRAMEWORKS: Record<FrameworkKey, FrameworkMeta> = {
  PREP: {
    title: 'PREP',
    tagline: '结论先行',
    slots: ['1. 核心观点 (Point)', '2. 关键理由 (Reason)', '3. 证据/行动 (Example)'],
    placeholders: ['你的核心主张是什么？', '为什么这么认为？最硬核的原因', '一个佐证例子或下一步行动']
  },
  WHAT_WHY_HOW: {
    title: '现象·本质·行动',
    tagline: '深层归因',
    slots: ['1. 观察到的现象', '2. 底层深层原因', '3. 自主微行动'],
    placeholders: ['看到的具体事实或感受', '底层的一阶因果与动力机制', '你可以立刻采取的最小切片']
  },
  PRO_CON: {
    title: '正反合',
    tagline: '辩证审视',
    slots: ['1. 直觉观点 (正)', '2. 反面代价 (反)', '3. 全面结论 (合)'],
    placeholders: ['原本深信不疑的直觉看法', '反面事实或反对者视角', '兼顾两者后的更高阶结论']
  }
};

export const VoiceTab: React.FC<VoiceTabProps> = ({
  initialTrigger = 'daily_practice',
  refreshData
}) => {
  const [selectedFramework, setSelectedFramework] = useState<FrameworkKey>('PREP');
  const [topic, setTopic] = useState<string>('');
  const [slot1, setSlot1] = useState<string>('');
  const [slot2, setSlot2] = useState<string>('');
  const [slot3, setSlot3] = useState<string>('');
  const [mentorQuestion, setMentorQuestion] = useState<string>('');
  const [mentorAnswer, setMentorAnswer] = useState<string>('');

  const [step, setStep] = useState<'input' | 'question' | 'success'>('input');
  const [dailyCap, setDailyCap] = useState<{ used: number; max: number; remaining: number }>({ used: 0, max: 3, remaining: 3 });
  const [historyLogs, setHistoryLogs] = useState<ExpressionLog[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const loadLogs = async () => {
    const cap = await getDailyCapInfo('expression');
    setDailyCap(cap);
    const logs = await db.expressionLogs.orderBy('createdAt').reverse().limit(10).toArray();
    setHistoryLogs(logs);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    setMentorQuestion(getRandomMentorQuestion(selectedFramework, initialTrigger));
  }, [selectedFramework, initialTrigger]);

  const handleSubmit = async () => {
    if (!topic.trim()) {
      alert('请输入思考主题');
      return;
    }
    setStep('question');
  };

  const handleFinalize = async () => {
    const today = getLocalDate();
    const logId = `expr_${Date.now()}`;
    const log: ExpressionLog = {
      id: logId,
      createdAt: Date.now(),
      localDate: today,
      triggerType: initialTrigger,
      framework: selectedFramework,
      topic: topic.trim(),
      slot1: slot1.trim(),
      slot2: slot2.trim(),
      slot3: slot3.trim(),
      mentorQuestion,
      mentorAnswer: mentorAnswer.trim(),
      completed: true
    };

    await db.expressionLogs.put(log);

    const tx = await awardExp({
      dimension: 'voice',
      amount: EXP_RULES.EXPRESSION,
      reason: `完成 60 秒思考表达 (${FRAMEWORKS[selectedFramework].title})`,
      sourceType: 'expression',
      sourceId: logId,
      localDate: today
    });

    if (tx) {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    }

    setStep('success');
    loadLogs();
    refreshData();
  };

  const handleReset = () => {
    setTopic('');
    setSlot1('');
    setSlot2('');
    setSlot3('');
    setMentorAnswer('');
    setMentorQuestion(getRandomMentorQuestion(selectedFramework));
    setStep('input');
  };

  const currentMeta = FRAMEWORKS[selectedFramework];

  return (
    <div className="space-y-3.5 px-4 py-3 max-w-md mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">60 秒结构思考</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">清晰提炼 · 摆脱模糊情绪</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded-full bg-dark-800 border border-white/[0.06]">
            今日 {dailyCap.used}/{dailyCap.max}
          </span>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1.5 rounded-lg bg-dark-800 border border-white/[0.06] text-slate-400 hover:text-white"
            title="历史记录"
          >
            <History className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showHistory ? (
        /* History View */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">历史表达记录</span>
            <button
              onClick={() => setShowHistory(false)}
              className="text-xs text-amber-400 font-medium"
            >
              返回练习
            </button>
          </div>

          {historyLogs.length === 0 ? (
            <div className="p-8 text-center bg-dark-800/60 rounded-2xl border border-white/[0.05] text-slate-400 text-xs">
              暂无历史记录。
            </div>
          ) : (
            <div className="space-y-2">
              {historyLogs.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-dark-800/80 border border-white/[0.06] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-medium">
                      {FRAMEWORKS[item.framework]?.title || item.framework}
                    </span>
                    <span className="text-slate-500 font-mono">{item.localDate}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">{item.topic}</h4>
                  <div className="text-[11px] text-slate-300 space-y-0.5 pt-1">
                    <p className="line-clamp-1">· {item.slot1}</p>
                    <p className="line-clamp-1">· {item.slot2}</p>
                    <p className="line-clamp-1">· {item.slot3}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : step === 'input' ? (
        /* Input Form */
        <div className="space-y-3">
          {/* Sleek Framework Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-dark-900/80 border border-white/[0.06]">
            {(Object.keys(FRAMEWORKS) as FrameworkKey[]).map((key) => {
              const meta = FRAMEWORKS[key];
              const isSelected = selectedFramework === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedFramework(key)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  {meta.title}
                </button>
              );
            })}
          </div>

          {/* Minimal Form */}
          <div className="p-3.5 rounded-2xl bg-dark-800/70 border border-white/[0.07] space-y-2.5">
            <div>
              <input
                type="text"
                placeholder="思考主题 / 触发点（如：为什么刚才想刷手机？）"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-dark-900/70 border border-white/[0.08] focus:border-amber-500/50 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* 3 Slots */}
            <div className="space-y-2 pt-1">
              <div>
                <span className="text-[11px] font-medium text-amber-400/90 block mb-1">
                  {currentMeta.slots[0]}
                </span>
                <input
                  type="text"
                  placeholder={currentMeta.placeholders[0]}
                  value={slot1}
                  onChange={(e) => setSlot1(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-dark-900/70 border border-white/[0.06] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40"
                />
              </div>

              <div>
                <span className="text-[11px] font-medium text-amber-400/90 block mb-1">
                  {currentMeta.slots[1]}
                </span>
                <input
                  type="text"
                  placeholder={currentMeta.placeholders[1]}
                  value={slot2}
                  onChange={(e) => setSlot2(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-dark-900/70 border border-white/[0.06] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40"
                />
              </div>

              <div>
                <span className="text-[11px] font-medium text-amber-400/90 block mb-1">
                  {currentMeta.slots[2]}
                </span>
                <input
                  type="text"
                  placeholder={currentMeta.placeholders[2]}
                  value={slot3}
                  onChange={(e) => setSlot3(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-dark-900/70 border border-white/[0.06] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!topic.trim()}
              className="w-full mt-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 disabled:opacity-40 text-dark-900 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1"
            >
              下一步：导师追问卡 <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : step === 'question' ? (
        /* Mentor Question */
        <div className="p-4 rounded-2xl bg-dark-800 border border-amber-500/30 space-y-3 animate-fade-in">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white">离线导师追问</h3>
          </div>

          <div className="p-3 rounded-xl bg-dark-900/80 border border-white/[0.05]">
            <p className="text-xs text-amber-200 leading-relaxed font-medium">
              “{mentorQuestion}”
            </p>
          </div>

          <div>
            <textarea
              rows={2}
              placeholder="写下补充洞察（选填）..."
              value={mentorAnswer}
              onChange={(e) => setMentorAnswer(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-dark-900/70 border border-white/[0.06] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleFinalize}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-dark-900 font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              完成 (+{EXP_RULES.EXPRESSION} Voice EXP)
            </button>
            <button
              onClick={handleFinalize}
              className="py-2.5 px-3 rounded-xl bg-dark-700 text-slate-400 text-xs"
            >
              略过
            </button>
          </div>
        </div>
      ) : (
        /* Success */
        <div className="p-6 rounded-2xl bg-dark-800/80 border border-white/[0.08] text-center space-y-3 animate-fade-in">
          <div className="inline-flex p-2.5 rounded-full bg-amber-500/15 text-amber-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">表达梳理完成</h3>
          <p className="text-xs text-slate-400">观点已收录至思维日志中。</p>
          <button
            onClick={handleReset}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-dark-900 font-bold text-xs active:scale-95"
          >
            再次梳理
          </button>
        </div>
      )}
    </div>
  );
};
