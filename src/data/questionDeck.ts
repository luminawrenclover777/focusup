export interface MentorQuestion {
  id: string;
  framework?: 'PREP' | 'WHAT_WHY_HOW' | 'PRO_CON';
  trigger?: 'intercept' | 'stop_loss' | 'daily_practice';
  text: string;
}

export const MENTOR_QUESTIONS: MentorQuestion[] = [
  // PREP Framework questions
  {
    id: 'prep_1',
    framework: 'PREP',
    text: '如果只能对一个完全不同意你观点的人解释，你会用什么样的一句话作为最硬核的证据？'
  },
  {
    id: 'prep_2',
    framework: 'PREP',
    text: '你的结论在什么特定边界条件下可能完全不成立？'
  },
  {
    id: 'prep_3',
    framework: 'PREP',
    text: '这个例子中，最不可替代的变量是什么？如果去掉它结论还成立吗？'
  },
  // What-Why-How (现象-本质-行动)
  {
    id: 'wwh_1',
    framework: 'WHAT_WHY_HOW',
    text: '你观察到的这个现象，是短期周期性波动，还是长期结构性不可逆的变化？'
  },
  {
    id: 'wwh_2',
    framework: 'WHAT_WHY_HOW',
    text: '你找到的底层原因，是真正的一阶因果，还是只是另一个表层现象的包装？'
  },
  {
    id: 'wwh_3',
    framework: 'WHAT_WHY_HOW',
    text: '你提出的下一步行动，明天早上 9 点你能立刻执行的最小切片是什么？'
  },
  // Pro-Con-Synthesis (正反合)
  {
    id: 'procon_1',
    framework: 'PRO_CON',
    text: '反对你的人最聪明的论据是什么？你如何站在对方角度捍卫他的合理性？'
  },
  {
    id: 'procon_2',
    framework: 'PRO_CON',
    text: '合成后的新结论，是否牺牲了某种原本清晰但偏颇的行动指导力？'
  },
  {
    id: 'procon_3',
    framework: 'PRO_CON',
    text: '如果这个代价必须由你本人全额承担，你的最终决定会有所改变吗？'
  },
  // Intercept & Stop Loss Trigger questions
  {
    id: 'intercept_1',
    trigger: 'intercept',
    text: '刚刚促使你想打开短视频的情绪底色是什么？是疲惫、无聊、还是对当前任务的逃避？'
  },
  {
    id: 'stop_loss_1',
    trigger: 'stop_loss',
    text: '你刚刚主动切断了自动播放，这一瞬间你的大脑是否感受到了轻微的主权回归？'
  },
  {
    id: 'gen_1',
    trigger: 'daily_practice',
    text: '换一个 5 年后的你来审视今天这个观点，他会觉得这依然关键吗？'
  }
];

export function getRandomMentorQuestion(framework?: 'PREP' | 'WHAT_WHY_HOW' | 'PRO_CON', trigger?: string): string {
  let matched = MENTOR_QUESTIONS.filter(q => {
    if (framework && q.framework === framework) return true;
    if (trigger && q.trigger === trigger) return true;
    return false;
  });

  if (matched.length === 0) {
    matched = MENTOR_QUESTIONS;
  }

  const randomIndex = Math.floor(Math.random() * matched.length);
  return matched[randomIndex].text;
}
