export interface MicroMovement {
  id: string;
  category: 'desk' | 'active';
  name: string;
  durationSeconds: number;
  description: string;
}

export const MICRO_MOVEMENTS: MicroMovement[] = [
  {
    id: 'mv_desk_1',
    category: 'desk',
    name: '坐姿核心等长收紧',
    durationSeconds: 30,
    description: '端坐椅面，腹肌如准备承受轻击般收紧，保持正常呼气 30 秒'
  },
  {
    id: 'mv_desk_2',
    category: 'desk',
    name: '沉肩微收下巴',
    durationSeconds: 30,
    description: '双肩向后下自然沉降，下巴微收，感受后颈伸展拉长 30 秒'
  },
  {
    id: 'mv_desk_3',
    category: 'desk',
    name: '坐姿脚踝环绕与提踵',
    durationSeconds: 30,
    description: '足尖点地提踵 15 次，随后脚踝顺逆时针各转动 10 圈，促进下肢血液循环'
  },
  {
    id: 'mv_active_1',
    category: 'active',
    name: '离座自重深蹲',
    durationSeconds: 45,
    description: '离开座椅，进行 12-15 次平稳自重深蹲，唤醒下肢肌群'
  },
  {
    id: 'mv_active_2',
    category: 'active',
    name: '桌沿/墙面俯卧撑',
    durationSeconds: 45,
    description: '双手支撑桌沿或墙面，进行 10-12 次稳定推起，激活胸背与手臂'
  },
  {
    id: 'mv_active_3',
    category: 'active',
    name: '扩胸伸展与短走',
    durationSeconds: 60,
    description: '双手后背十指相扣扩胸深呼吸 5 次，并在室内慢步走动 1 分钟'
  }
];
