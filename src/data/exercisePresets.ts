import type { BodyPart } from '../types';

export interface ExercisePreset {
  id: string;
  name: string;
  bodyPart: BodyPart;
  isBodyweight: boolean;
  tips: string;
}

export const EXERCISE_PRESETS: ExercisePreset[] = [
  // Shoulder (肩)
  { id: 'ex_sh_1', name: '哑铃侧平举', bodyPart: 'shoulder', isBodyweight: false, tips: '手肘微屈，向两侧平举，下落控制节奏' },
  { id: 'ex_sh_2', name: '坐姿哑铃推举', bodyPart: 'shoulder', isBodyweight: false, tips: '后背紧贴靠背，大臂与躯干夹角约 60-70 度' },
  { id: 'ex_sh_3', name: '哑铃面拉', bodyPart: 'shoulder', isBodyweight: false, tips: '手腕高于肘部，强化后束与肩胛稳定' },

  // Back (背)
  { id: 'ex_bk_1', name: '引体向上', bodyPart: 'back', isBodyweight: true, tips: '沉肩发力，背阔肌收紧，下落时充分伸展' },
  { id: 'ex_bk_2', name: '单臂哑铃划船', bodyPart: 'back', isBodyweight: false, tips: '核心稳定，肘部贴紧躯干向后上方拉起' },
  { id: 'ex_bk_3', name: '高位下拉', bodyPart: 'back', isBodyweight: false, tips: '胸部上挺，引向锁骨上方，控制还原' },

  // Chest (胸)
  { id: 'ex_ch_1', name: '标准俯卧撑', bodyPart: 'chest', isBodyweight: true, tips: '身体呈一条直线，胸部下落至离地一拳' },
  { id: 'ex_ch_2', name: '平板哑铃卧推', bodyPart: 'chest', isBodyweight: false, tips: '肩胛收紧下沉，底部大臂与小臂垂直' },
  { id: 'ex_ch_3', name: '上斜哑铃卧推', bodyPart: 'chest', isBodyweight: false, tips: '上斜角度约 30 度，专注上胸刺激' },

  // Core (核心)
  { id: 'ex_cr_1', name: '卷腹', bodyPart: 'core', isBodyweight: true, tips: '下背部贴紧地面，靠腹直肌挤压卷起上背部' },
  { id: 'ex_cr_2', name: '悬垂举腿', bodyPart: 'core', isBodyweight: true, tips: '避免身体晃动，骨盆后倾带动双腿上抬' },
  { id: 'ex_cr_3', name: '平板支撑', bodyPart: 'core', isBodyweight: true, tips: '骨盆保持中立，核心全程等长发力' },

  // Legs (臀腿)
  { id: 'ex_lg_1', name: '徒手/高脚杯深蹲', bodyPart: 'legs', isBodyweight: true, tips: '膝盖对准脚尖方向，臀部自然向后坐' },
  { id: 'ex_lg_2', name: '罗马尼亚硬拉', bodyPart: 'legs', isBodyweight: false, tips: '微屈膝髋后推，感受腘绳肌和臀部拉伸' },
  { id: 'ex_lg_3', name: '保加利亚分腿蹲', bodyPart: 'legs', isBodyweight: true, tips: '前脚掌实踏地面，后脚搭在长凳上保持平衡' }
];

export const BODY_PART_LABELS: Record<BodyPart, string> = {
  shoulder: '肩部',
  back: '背部',
  chest: '胸部',
  core: '核心',
  legs: '臀腿'
};
