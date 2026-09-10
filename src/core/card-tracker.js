import { intersectionOverUnion } from './geometry.js';
import { hammingDistance } from './dhash.js';

export const LockingStatus = Object.freeze({
  LOCKING_CARD: 'locking-card',
  NEW_CARD: 'new-card',
  CARD_LOCKED: 'card-locked',
});

export class CardTracker {
  constructor({
    cardClasses,
    validators = [],
    hashRegion,
    lockOnThreshold = 5,
    noDetectionCountLimit = 8,
    memoryDetectionTimeLimit = 1000,
    validateClassId = true,
    differenceHashDistanceLimit = 25,
    allowTemporalDrift = true,
    now = () => performance.now(),
  }) {
    if (!cardClasses?.length) throw new Error('cardClasses must not be empty');
    this.cardClasses = new Set(cardClasses);
    this.validators = validators;
    this.hashRegion = hashRegion;
    this.lockOnThreshold = lockOnThreshold;
    this.noDetectionCountLimit = noDetectionCountLimit;
    this.memoryDetectionTimeLimit = memoryDetectionTimeLimit;
    this.validateClassId = validateClassId;
    this.differenceHashDistanceLimit = differenceHashDistanceLimit;
    this.allowTemporalDrift = allowTemporalDrift;
    this.now = now;
    this.cardId = 0;
    this.reset();
  }

  track(detections, frame) {
    const currentTime = this.now();
    if (this.lastDetectionTime && this.memoryDetectionTimeLimit > 0
      && currentTime - this.lastDetectionTime > this.memoryDetectionTimeLimit) this.reset();
    const candidates = detections.filter((item) => this.cardClasses.has(item.classId)
      && this.validators.every((validator) => validator(item, this.previous, frame)));
    const card = this.selectCandidate(candidates);
    if (!card) {
      this.misses += 1;
      if (this.misses >= this.noDetectionCountLimit) this.reset();
      return null;
    }
    this.misses = 0;
    this.lastDetectionTime = currentTime;
    const currentHash = this.hashRegion(frame, card.box);
    const continues = this.previous && this.comparisonHash !== null
      && (!this.validateClassId || card.classId === this.previous.classId)
      && hammingDistance(this.comparisonHash, currentHash) <= this.differenceHashDistanceLimit;
    if (continues) {
      this.consistency = Math.min(this.lockOnThreshold, this.consistency + 1);
      if (this.allowTemporalDrift) this.comparisonHash = currentHash;
    } else {
      this.consistency = 1;
      this.sent = false;
      this.comparisonHash = currentHash;
    }
    this.previous = card;
    let lockingStatus = LockingStatus.LOCKING_CARD;
    if (this.consistency >= this.lockOnThreshold && !this.sent) {
      this.sent = true;
      this.cardId += 1;
      lockingStatus = LockingStatus.NEW_CARD;
    } else if (this.consistency >= this.lockOnThreshold) {
      lockingStatus = LockingStatus.CARD_LOCKED;
    }
    return {
      id: lockingStatus === LockingStatus.LOCKING_CARD ? null : this.cardId,
      lockingStatus,
      lockOnProgress: Math.min(1, this.consistency / this.lockOnThreshold),
      card,
      features: detections.filter((item) => !this.cardClasses.has(item.classId)),
      frame,
    };
  }

  selectCandidate(candidates) {
    if (!candidates.length) return null;
    if (!this.previous) return candidates.reduce((a, b) => a.confidence > b.confidence ? a : b);
    let preferred = this.validateClassId
      ? candidates.filter((item) => item.classId === this.previous.classId)
      : candidates;
    if (!preferred.length) preferred = candidates;
    const spatial = preferred.reduce((best, item) =>
      intersectionOverUnion(item.box, this.previous.box) > intersectionOverUnion(best.box, this.previous.box)
        ? item : best);
    return intersectionOverUnion(spatial.box, this.previous.box) > 0
      ? spatial
      : candidates.reduce((a, b) => a.confidence > b.confidence ? a : b);
  }

  reset() {
    this.previous = null;
    this.comparisonHash = null;
    this.consistency = 0;
    this.misses = 0;
    this.sent = false;
    this.lastDetectionTime = 0;
  }
}
