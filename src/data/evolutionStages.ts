export interface EvolutionPhase {
  phase: number;
  code: string;
  name: string;
  enName: string;
  subtitle: string;
  minExp: number;
  maxExp: number;
  unlockedFeature: string;
  lore: string;
  auraColor: string;
  glowColor: string;
}

export const EVOLUTION_PHASES: EvolutionPhase[] = [
  {
    phase: 1,
    code: 'MK-I',
    name: '游离微光核',
    enName: 'Spark Core',
    subtitle: '意识初醒 · 原始微芒',
    minExp: 0,
    maxExp: 600,
    unlockedFeature: '超频量子核心 & 初级神经突触',
    lore: '自混沌信息流中脱颖而出的微弱硅基光核。正在渴望纯净的专注能量充填。',
    auraColor: 'from-blue-600/30 to-cyan-500/20',
    glowColor: '#0A84FF'
  },
  {
    phase: 2,
    code: 'MK-II',
    name: '晶体谐振体',
    enName: 'Resonance Crystal',
    subtitle: '三维交织 · 双环磁轨',
    minExp: 600,
    maxExp: 1500,
    unlockedFeature: '双向谐振加速磁轨 & 意识导流罩',
    lore: '专注与身体打破孤岛，外围凝聚出高频自转轨道，阻隔初期多巴胺杂讯。',
    auraColor: 'from-cyan-500/30 to-emerald-500/20',
    glowColor: '#64D2FF'
  },
  {
    phase: 3,
    code: 'MK-III',
    name: '动力外骨骼',
    enName: 'Kinetic Exoskeleton',
    subtitle: '反重力突触 · 机体具象',
    minExp: 1500,
    maxExp: 2700,
    unlockedFeature: '液压动力支架 & 神经声波天线',
    lore: '躯体体能与表达能量全面共振，合金装甲闭合，能够硬抗长时间工作疲乏。',
    auraColor: 'from-emerald-500/30 to-amber-500/20',
    glowColor: '#30D158'
  },
  {
    phase: 4,
    code: 'MK-IV',
    name: '赛博先锋体',
    enName: 'Cyber Vanguard',
    subtitle: '绝对掌控 · 质能跃迁',
    minExp: 2700,
    maxExp: 4500,
    unlockedFeature: '全域离子力场 & 矩阵折跃光翎',
    lore: '算法信息流已无法渗透其心智防火墙，前额叶与机体达到高度自律和谐。',
    auraColor: 'from-amber-500/30 to-purple-500/20',
    glowColor: '#FF9F0A'
  },
  {
    phase: 5,
    code: 'MK-V',
    name: '超维恒星体',
    enName: 'Hyper Celestial',
    subtitle: '终极形态 · 自由觉醒',
    minExp: 4500,
    maxExp: 99999,
    unlockedFeature: '恒星级曲率光环 & 永恒意识流',
    lore: '肉身机能与数字意识融为一体，掌控时间与注意力的终极存在。',
    auraColor: 'from-purple-500/30 to-pink-500/25',
    glowColor: '#BF5AF2'
  }
];

export function getEvolutionPhase(totalExp: number): {
  current: EvolutionPhase;
  next: EvolutionPhase | null;
  progressPercent: number;
  expInPhase: number;
  phaseSpan: number;
} {
  const safeExp = Math.max(0, totalExp);
  let current = EVOLUTION_PHASES[0];

  for (let i = EVOLUTION_PHASES.length - 1; i >= 0; i--) {
    if (safeExp >= EVOLUTION_PHASES[i].minExp) {
      current = EVOLUTION_PHASES[i];
      break;
    }
  }

  const next = current.phase < EVOLUTION_PHASES.length ? EVOLUTION_PHASES[current.phase] : null;

  if (!next) {
    return {
      current,
      next: null,
      progressPercent: 100,
      expInPhase: safeExp - current.minExp,
      phaseSpan: 1000
    };
  }

  const phaseSpan = next.minExp - current.minExp;
  const expInPhase = safeExp - current.minExp;
  const progressPercent = Math.min(100, Math.max(0, Math.floor((expInPhase / phaseSpan) * 100)));

  return {
    current,
    next,
    progressPercent,
    expInPhase,
    phaseSpan
  };
}

export const AVATAR_DIALOGUES = {
  idle: [
    '「意识核心待机中。主人，准备好进入下一段心流了吗？」',
    '「检测到外界多巴胺噪音... 我的神经回路已为你构筑防火墙。」',
    '「机体各项参数稳定，等待纯净算力注入。」',
    '「哪怕只是专注 15 分钟，也能让我的微光核更加明亮。」',
    '「信息洪流正在消逝，唯有你亲手创造的专注永存。」'
  ],
  recovery: [
    '「保底日防御协议已启动。不必勉强，守住底线即是胜利。」',
    '「机体正在低能耗自愈中，轻量启动 10 分钟即可维持核心稳定。」',
    '「累了就休息，我会在休眠轨道守护你的生物节律。」'
  ],
  purified: [
    '「神经防火墙已生效！成功拦截多巴胺劫持，抢回注意力主权！」',
    '「漂亮的一击！虚无退散，意识能量正在提纯中。」',
    '「刚才那根插头被你亲手拔掉了。你做到了。」'
  ],
  charged: [
    '「澎湃的算力已注入核心！能量谐振效率达到巅峰！」',
    '「机体磁轨正在加速，离下一次形态进化更近了一步！」',
    '「感受到了吗？那是掌控自我带来的真实质感。」'
  ]
};
