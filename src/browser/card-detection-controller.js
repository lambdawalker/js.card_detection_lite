import { captureAndLetterbox, createFrameBuffers } from './frame.js';
import { differenceHash } from '../core/dhash.js';
import { CardTracker } from '../core/card-tracker.js';
import { YoloPostProcessor } from '../core/yolo-postprocessor.js';
import { aspectRatioValidator, marginValidator } from '../core/validators.js';

export const DEFAULT_CLASSES = Object.freeze({
  0: 'horizontal_card', 1: 'vertical_card', 2: 'horizontal_card_back',
  3: 'photo', 4: 'slim-barcode', 5: 'pdf417', 6: 'mrz-text',
  7: 'barcode', 8: 'qrcode',
});

export class CardDetectionController extends EventTarget {
  constructor({
    engine,
    classes = DEFAULT_CLASSES,
    cardClasses = [0, 1, 2],
    scoreThreshold = 0.5,
    iouThreshold = 0.45,
    inferenceIntervalMs = 33,
    tracker = {},
  }) {
    super();
    this.engine = engine;
    this.classes = classes;
    this.cardClasses = cardClasses;
    this.scoreThreshold = scoreThreshold;
    this.iouThreshold = iouThreshold;
    this.inferenceIntervalMs = inferenceIntervalMs;
    this.buffers = createFrameBuffers(engine.inputSize);
    this.hashCanvas = document.createElement('canvas');
    this.tracker = new CardTracker({
      cardClasses,
      validators: [aspectRatioValidator(), marginValidator()],
      hashRegion: (frame, region) => differenceHash(frame.source, region, this.hashCanvas),
      ...tracker,
    });
    this.enabled = true;
    this.processing = false;
    this.lastInference = 0;
  }

  async load() {
    await this.engine.load();
    return this;
  }

  async process(video, timestamp = performance.now()) {
    if (!this.enabled || this.processing || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
      || timestamp - this.lastInference < this.inferenceIntervalMs) return null;
    this.processing = true;
    this.lastInference = timestamp;
    try {
      const frame = captureAndLetterbox(video, this.buffers);
      const { output, outputShape } = await this.engine.infer(frame.model);
      this.postProcessor ??= new YoloPostProcessor({
        outputShape,
        inputSize: this.engine.inputSize,
        scoreThreshold: this.scoreThreshold,
        iouThreshold: this.iouThreshold,
      });
      const detections = this.postProcessor.process(output, frame);
      const result = this.tracker.track(detections, frame);
      this.dispatchEvent(new CustomEvent('detection', { detail: result }));
      return result;
    } catch (error) {
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
      throw error;
    } finally {
      this.processing = false;
    }
  }

  dispose() {
    this.engine.dispose();
    this.tracker.reset();
  }
}
