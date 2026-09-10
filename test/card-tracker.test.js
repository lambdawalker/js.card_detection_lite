import test from 'node:test';
import assert from 'node:assert/strict';
import { CardTracker, LockingStatus } from '../src/core/card-tracker.js';

const detection = { box: { x: 10, y: 10, x2: 110, y2: 70 }, confidence: .9, classId: 0 };
const frame = { width: 200, height: 100 };

test('emits locking, new-card, then card-locked states', () => {
  const tracker = new CardTracker({
    cardClasses: [0], lockOnThreshold: 3, hashRegion: () => 42n, now: () => 1,
  });
  assert.equal(tracker.track([detection], frame).lockingStatus, LockingStatus.LOCKING_CARD);
  assert.equal(tracker.track([detection], frame).lockingStatus, LockingStatus.LOCKING_CARD);
  const locked = tracker.track([detection], frame);
  assert.equal(locked.lockingStatus, LockingStatus.NEW_CARD);
  assert.equal(locked.id, 1);
  assert.equal(tracker.track([detection], frame).lockingStatus, LockingStatus.CARD_LOCKED);
});

test('resets after configured consecutive misses', () => {
  const tracker = new CardTracker({
    cardClasses: [0], lockOnThreshold: 2, noDetectionCountLimit: 2,
    hashRegion: () => 1n, now: () => 1,
  });
  tracker.track([detection], frame);
  tracker.track([], frame);
  tracker.track([], frame);
  assert.equal(tracker.track([detection], frame).lockOnProgress, .5);
});
