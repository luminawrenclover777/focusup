import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Clock,
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
    title: 'PREP 结论先行',
    tagline: '结论 → 理由 → 例子/行动',
    slots: ['1. 核心结论 (Point)', '2. 关键理由 (Reason)', '3. 支撑例子/行动 (Example)'],
    placeholders: ['用一句话表明你的明确主张', '支撑该结论最硬核的原因', '一个真实的佐证或下一步具体行动']
  },
  WHAT_WHY_HOW: {
    title: '现象 - 本质 - 行动',
    tagline: '表面现象 → 真实底层原因 → 破局微行动',
    slots: ['1. 观察到的现象', '2. 底层深层原因', '3. 自主微行动'],
    placeholders: ['你看到或感受到的事实是什么？', '深层的一阶因果与动力机制是什么？', '你可以立刻采取的不可逆小行动']
  },
  PRO_CON: {
    title: '正反合 辩证审视',
    tagline: '直觉观点 → 反面代价 → 综合结论',
    slots: ['1. 直觉第一感 (正)', '2. 反面代价/盲区 (反)', '3. 全面合成新观点 (合)'],
    placeholders: ['原本深信不疑的直觉或常识', '反面事实、隐藏代价或反对者视角', '兼顾两者后的更高阶审慎结论']
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

  // Load daily cap and history
  const loadLogs = async () => {
    const cap = await getDailyCapInfo('expression');
    setDailyCap(cap);
    const logs = await db.expressionLogs.orderBy('createdAt').reverse().limit(10).toArray();
    setHistoryLogs(logs);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Update question when framework changes
  useEffect(() => {
    setMentorQuestion(getRandomMentorQuestion(selectedFramework, initialTrigger));
  }, [selectedFramework, initialTrigger]);

  // Submit 60s Expression
  const handleSubmit = async () => {
    if (!topic.trim()) {
      alert('请先输入本次思考的主题');
      return;
    }

    setStep('question');
  };

  // Complete and save
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

    // Award +10 Voice EXP (idempotent, max 3/day)
    const tx = await awardExp({
      dimension: 'voice',
      amount: EXP_RULES.EXPRESSION,
      reason: `完成 60 秒思考表达 (${FRAMEWORKS[selectedFramework].title})`,
      sourceType: 'expression',
      sourceId: logId,
      localDate: today
    });

    if (tx) {
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
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
    <div className="space-y-4 px-4 py-3 max-w-md mx-auto">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            Voice 思考表达仓
          </span>
          <h2 className="text-lg font-bold text-white mt-0.5">60 秒结构化梳理</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 bg-dark-800 px-2.5 py-1 rounded-full border border-dark-700">
            今日已领 {dailyCap.used}/{dailyCap.max}
          </span>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1.5 rounded-lg bg-dark-800 border border-dark-700 text-slate-400 hover:text-white"
            title="历史记录"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showHistory ? (
        /* History View */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">最近表达练习</h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-xs text-amber-400 font-medium"
            >
              返回练习
            </button>
          </div>

          {historyLogs.length === 0 ? (
            <div className="p-8 text-center bg-dark-800 rounded-2xl border border-dark-700 text-slate-400 text-xs">
              暂无表达练习记录。开始你的第一次 60 秒观点梳理吧！
            </div>
          ) : (
            <div className="space-y-2.5">
              {historyLogs.map((item) => (
                <div key={item.id} className="p-3.5 rounded-xl bg-dark-800 border border-dark-700 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-medium border border-amber-900/50">
                      {FRAMEWORKS[item.framework]?.title || item.framework}
                    </span>
                    <span className="text-slate-400">{item.localDate}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{item.topic}</h4>
                  <div className="space-y-1 text-xs text-slate-300 bg-dark-900/60 p-2.5 rounded-lg border border-dark-700/60">
                    <p><span className="text-slate-400">·</span> {item.slot1}</p>
                    <p><span className="text-slate-400">·</span> {item.slot2}</p>
                    <p><span className="text-slate-400">·</span> {item.slot3}</p>
                  </div>
                  {item.mentorQuestion && (
                    <div className="text-[11px] text-amber-300/80 bg-amber-950/30 p-2 rounded border border-amber-900/30">
                      <span className="font-semibold text-amber-400">导师追问：</span> {item.mentorQuestion}
                      {item.mentorAnswer && (
                        <p className="mt-1 text-slate-300 pl-2 border-l border-amber-500/40">
                          {item.mentorAnswer}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : step === 'input' ? (
        /* Input Form */
        <div className="space-y-4">
          {/* Framework Selector */}
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(FRAMEWORKS) as FrameworkKey[]).map((key) => {
              const meta = FRAMEWORKS[key];
              const isSelected = selectedFramework === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedFramework(key)}
                  className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/80 text-amber-300 shadow-sm shadow-amber-950'
                      : 'bg-dark-800 border-dark-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold block">{meta.title}</span>
                  <span className="text-[9px] text-slate-400 line-clamp-1 mt-0.5">{meta.tagline}</span>
                </button>
              );
            })}
          </div>

          {/* 60s Cadence Tip */}
          <div className="p-3 rounded-xl bg-dark-800/80 border border-dark-700 flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              60 秒心智节奏
            </span>
            <span className="text-[11px] text-slate-400">
              0-10s 提观点 · 10-45s 展论据 · 45-60s 促行动
            </span>
          </div>

          {/* Inputs */}
          <div className="space-y-3 bg-dark-800 p-4 rounded-2xl border border-dark-700">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                思考主题 / 触发场景
              </label>
              <input
                type="text"
                placeholder="例如：为什么我刚才想刷短视频？或者关于某件事的看法"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-dark-900 border border-dark-600 focus:border-amber-500 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Slot 1 */}
            <div>
              <label className="block text-xs font-medium text-amber-300 mb-1">
                {currentMeta.slots[0]}
              </label>
              <input
                type="text"
                placeholder={currentMeta.placeholders[0]}
                value={slot1}
                onChange={(e) => setSlot1(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-dark-600 focus:border-amber-500 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Slot 2 */}
            <div>
              <label className="block text-xs font-medium text-amber-300 mb-1">
                {currentMeta.slots[1]}
              </label>
              <input
                type="text"
                placeholder={currentMeta.placeholders[1]}
                value={slot2}
                onChange={(e) => setSlot2(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-dark-600 focus:border-amber-500 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Slot 3 */}
            <div>
              <label className="block text-xs font-medium text-amber-300 mb-1">
                {currentMeta.slots[2]}
              </label>
              <input
                type="text"
                placeholder={currentMeta.placeholders[2]}
                value={slot3}
                onChange={(e) => setSlot3(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-dark-600 focus:border-amber-500 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!topic.trim()}
              className="w-full mt-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-dark-900 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all"
            >
              下一步：接受导师追问 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : step === 'question' ? (
        /* Mentor Question Card (Offline) */
        <div className="space-y-4 animate-fade-in">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-dark-800 to-dark-800 border border-amber-600/40 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">离线导师追问卡</h3>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-900/80 border border-dark-700">
              <p className="text-xs text-amber-200 leading-relaxed font-medium">
                “{mentorQuestion}”
              </p>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                你的反思或补充回答（选填，跳过亦可正常领取 EXP）
              </label>
              <textarea
                rows={3}
                placeholder="在此写下追问带来的直觉洞察..."
                value={mentorAnswer}
                onChange={(e) => setMentorAnswer(e.target.value)}
                className="w-full p-3 rounded-xl bg-dark-900 border border-dark-600 focus:border-amber-500 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleFinalize}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-dark-900 font-bold text-sm shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1"
              >
                <CheckCircle2 className="w-4 h-4" />
                完成并领取 +{EXP_RULES.EXPRESSION} Voice EXP
              </button>
              <button
                onClick={handleFinalize}
                className="py-3 px-3 rounded-xl bg-dark-700 hover:bg-dark-600 text-slate-300 text-xs font-medium"
              >
                略过追问
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Success Screen */
        <div className="p-6 rounded-2xl bg-dark-800 border border-dark-700 text-center space-y-4 animate-fade-in">
          <div className="inline-flex p-3 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">60 秒结构化表达达成！</h3>
          <p className="text-xs text-slate-300">
            你已成功将模糊的潜意识转化为清晰的结构化表达。
          </p>

          <button
            onClick={handleReset}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-dark-900 font-bold text-sm shadow-md transition-all active:scale-95"
          >
            再来一次观点梳理
          </button>
        </div>
      )}
    </div>
  );
};
