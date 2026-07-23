'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const logic = require('../logic.js');

test('computeRanking: empty logs returns empty array', () => {
  assert.deepEqual(logic.computeRanking([]), []);
});

test('computeRanking: single action type computes correct rate', () => {
  const logs = [
    { action_type: '間食', regret: true },
    { action_type: '間食', regret: false },
    { action_type: '間食', regret: true },
  ];
  const result = logic.computeRanking(logs);
  assert.equal(result.length, 1);
  assert.equal(result[0].actionType, '間食');
  assert.equal(result[0].total, 3);
  assert.equal(result[0].regretCount, 2);
  assert.equal(result[0].rate, 2 / 3);
});

test('computeRanking: sorts multiple action types by regret rate descending', () => {
  const logs = [
    { action_type: '間食', regret: true },
    { action_type: '間食', regret: false },
    { action_type: '運動サボり', regret: true },
    { action_type: '運動サボり', regret: true },
  ];
  const result = logic.computeRanking(logs);
  assert.equal(result[0].actionType, '運動サボり');
  assert.equal(result[0].rate, 1);
  assert.equal(result[1].actionType, '間食');
  assert.equal(result[1].rate, 0.5);
});

test('computeRanking: ties on rate break by total count descending', () => {
  const logs = [
    { action_type: '間食', regret: true },
    { action_type: '運動サボり', regret: true },
    { action_type: '運動サボり', regret: false },
    { action_type: '運動サボり', regret: false },
  ];
  const result = logic.computeRanking(logs);
  // 間食: 1/1 = 100%, 運動サボり: 1/3 = 33%
  assert.equal(result[0].actionType, '間食');
});

test('computeRanking: all regret false yields rate 0', () => {
  const logs = [
    { action_type: '間食', regret: false },
    { action_type: '間食', regret: false },
  ];
  const result = logic.computeRanking(logs);
  assert.equal(result[0].rate, 0);
});

test('ACTION_TYPES contains the two known categories', () => {
  assert.deepEqual(logic.ACTION_TYPES, ['間食', '運動サボり']);
});

test('computeRegretRate: empty group returns null rate', () => {
  const result = logic.computeRegretRate([]);
  assert.equal(result.total, 0);
  assert.equal(result.rate, null);
});

test('computeRegretRate: computes rate over the given group only', () => {
  const logs = [{ regret: true }, { regret: true }, { regret: false }, { regret: false }];
  const result = logic.computeRegretRate(logs);
  assert.equal(result.total, 4);
  assert.equal(result.regretCount, 2);
  assert.equal(result.rate, 0.5);
});

test('TRIGGER_OPTIONS has distinct option sets per action type', () => {
  assert.ok(logic.TRIGGER_OPTIONS['間食'].includes('ストレス'));
  assert.ok(logic.TRIGGER_OPTIONS['運動サボり'].includes('時間がなかった'));
});
