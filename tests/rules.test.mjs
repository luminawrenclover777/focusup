import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateBackup } from '../src/services/backupValidator.ts';

describe('FocusUp PRD v3.1 核心算法与业务规则验证', () => {

  test('等级计算规则: 每 300 EXP 升 1 级，初始 1 级', () => {
    const calcLevel = (exp) => Math.max(1, Math.floor(exp / 300) + 1);
    
    assert.equal(calcLevel(0), 1);
    assert.equal(calcLevel(150), 1);
    assert.equal(calcLevel(299), 1);
    assert.equal(calcLevel(300), 2);
    assert.equal(calcLevel(599), 2);
    assert.equal(calcLevel(600), 3);
    assert.equal(calcLevel(1200), 5);
  });

  test('娱乐券发放算法: 每累计 150 有效 EXP 发放 1 张 30 分钟娱乐券，防重复发券', () => {
    const calcEligibleTickets = (lifetimeExp) => Math.floor(lifetimeExp / 150);

    assert.equal(calcEligibleTickets(0), 0);
    assert.equal(calcEligibleTickets(149), 0);
    assert.equal(calcEligibleTickets(150), 1);
    assert.equal(calcEligibleTickets(299), 1);
    assert.equal(calcEligibleTickets(300), 2);
    assert.equal(calcEligibleTickets(450), 3);

    // 跨越区间增量发放测试
    let totalEarnedRecorded = 0;
    const simulateExpGain = (newLifetimeExp) => {
      const eligible = calcEligibleTickets(newLifetimeExp);
      const toIssue = eligible - totalEarnedRecorded;
      if (toIssue > 0) {
        totalEarnedRecorded += toIssue;
        return toIssue;
      }
      return 0;
    };

    assert.equal(simulateExpGain(100), 0); // 未达标
    assert.equal(simulateExpGain(160), 1); // 达标获得 1 张
    assert.equal(simulateExpGain(160), 0); // 重复触发不发券
    assert.equal(simulateExpGain(310), 1); // 再次跨越 300，发放第 2 张
    assert.equal(totalEarnedRecorded, 2);
  });

  test('有效专注时长校准算法: 扣除所有暂停区间，不依赖后台 setInterval', () => {
    const calculateEffective = (session, currentTime) => {
      const now = session.endedAt || currentTime;
      let totalPausedMs = 0;
      for (const interval of session.pausedIntervals) {
        const end = interval.endAt || (session.status === 'paused' ? now : interval.startAt);
        totalPausedMs += Math.max(0, end - interval.startAt);
      }
      const totalPassedMs = Math.max(0, now - session.startedAt);
      const effectiveMs = Math.max(0, totalPassedMs - totalPausedMs);
      return {
        effectiveSeconds: Math.floor(effectiveMs / 1000),
        pausedSeconds: Math.floor(totalPausedMs / 1000)
      };
    };

    const startTime = 1000000;
    // 会话运行中无暂停: 15 分钟 (900秒)
    const session1 = {
      startedAt: startTime,
      status: 'running',
      pausedIntervals: []
    };
    const res1 = calculateEffective(session1, startTime + 900 * 1000);
    assert.equal(res1.effectiveSeconds, 900);
    assert.equal(res1.pausedSeconds, 0);

    // 会话有两次暂停:
    // 第一次暂停 120 秒，已恢复
    // 第二次暂停当前仍在暂停中 (持续 60 秒)
    const session2 = {
      startedAt: startTime,
      status: 'paused',
      pausedIntervals: [
        { startAt: startTime + 300 * 1000, endAt: startTime + 420 * 1000 },
        { startAt: startTime + 600 * 1000 } // ongoing
      ]
    };
    const res2 = calculateEffective(session2, startTime + 660 * 1000);
    // 总过去 660 秒，暂停 120 + 60 = 180 秒，有效 480 秒
    assert.equal(res2.pausedSeconds, 180);
    assert.equal(res2.effectiveSeconds, 480);
  });

  test('薄肌训练个人突破判定: 超过历史最佳容量触发突破 (+10 EXP)', () => {
    const checkBreakthrough = (newSet, historicalBestSet) => {
      if (!historicalBestSet) return false;
      const currentScore = (newSet.weightKg || 1) * newSet.reps * newSet.setNumber;
      const bestScore = (historicalBestSet.weightKg || 1) * historicalBestSet.reps * historicalBestSet.setNumber;
      return currentScore > bestScore;
    };

    const bestSet = { weightKg: 20, reps: 10, setNumber: 3 }; // 600 kg 容量
    
    // 平局或未突破
    assert.equal(checkBreakthrough({ weightKg: 20, reps: 10, setNumber: 3 }, bestSet), false);
    assert.equal(checkBreakthrough({ weightKg: 18, reps: 10, setNumber: 3 }, bestSet), false);

    // 次数突破
    assert.equal(checkBreakthrough({ weightKg: 20, reps: 12, setNumber: 3 }, bestSet), true);

    // 重量突破
    assert.equal(checkBreakthrough({ weightKg: 22.5, reps: 10, setNumber: 3 }, bestSet), true);
  });

  test('备份数据校验器 (validateBackup): 严格验证 schemaVersion、结构完整性与错误拦截', () => {
    // 1. 非法输入
    assert.equal(validateBackup(null).valid, false);
    assert.equal(validateBackup('string').valid, false);

    // 2. 版本不兼容
    assert.equal(validateBackup({ schemaVersion: 2, data: {} }).valid, false);

    // 3. 缺失 data
    assert.equal(validateBackup({ schemaVersion: 1 }).valid, false);

    // 4. 正确备份
    const validJson = {
      schemaVersion: 1,
      exportedAt: Date.now(),
      exportedDate: '2026-10-12',
      data: {
        focusSessions: [{}, {}],
        activityEvents: [{}],
        expressionLogs: [{}],
        workoutSets: [{}, {}, {}],
        expTransactions: [{}, {}, {}, {}],
        ticketTransactions: [{}]
      }
    };
    const res = validateBackup(validJson);
    assert.equal(res.valid, true);
    assert.equal(res.counts.focusSessions, 2);
    assert.equal(res.counts.workoutSets, 3);
    assert.equal(res.counts.expTransactions, 4);
  });
});
