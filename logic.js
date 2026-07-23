'use strict';

const ACTION_TYPES = ['間食', '運動サボり'];

const TRIGGER_OPTIONS = {
  '間食': ['ストレス', '疲れ', '誘惑が近くにあった', '空腹', '習慣・惰性', '付き合い'],
  '運動サボり': ['時間がなかった', '疲れていた', 'やる気が出なかった', '天候・環境', '予定が入った'],
};

const MOOD_OPTIONS = ['イライラ', '落ち込み', '退屈・だるい', '普通', '楽しい・満足'];

const RESISTANCE_OPTIONS = ['全く我慢しなかった', '少し我慢したけど負けた', 'かなり葛藤した末に'];

// logs: [{ action_type, regret }]
// -> [{ actionType, total, regretCount, rate }] sorted by rate desc, then total desc
function computeRanking(logs) {
  const stats = {};

  for (const log of logs) {
    const actionType = log.action_type;
    if (!stats[actionType]) {
      stats[actionType] = { total: 0, regretCount: 0 };
    }
    stats[actionType].total += 1;
    if (log.regret) {
      stats[actionType].regretCount += 1;
    }
  }

  return Object.entries(stats)
    .map(([actionType, s]) => ({
      actionType,
      total: s.total,
      regretCount: s.regretCount,
      rate: s.regretCount / s.total,
    }))
    .sort((a, b) => b.rate - a.rate || b.total - a.total);
}

// logs: [{ regret }] already filtered to the group being compared
// -> { total, regretCount, rate } ; rate is null when total is 0
function computeRegretRate(logs) {
  const total = logs.length;
  if (total === 0) {
    return { total: 0, regretCount: 0, rate: null };
  }
  const regretCount = logs.filter((log) => log.regret).length;
  return { total, regretCount, rate: regretCount / total };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ACTION_TYPES,
    TRIGGER_OPTIONS,
    MOOD_OPTIONS,
    RESISTANCE_OPTIONS,
    computeRanking,
    computeRegretRate,
  };
}
