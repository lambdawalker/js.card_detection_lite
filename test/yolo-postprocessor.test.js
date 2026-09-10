import test from 'node:test';
import assert from 'node:assert/strict';
import { OutputLayout, YoloPostProcessor } from '../src/core/yolo-postprocessor.js';

test('decodes attrs-first normalized output and reverses letterboxing', () => {
  const processor = new YoloPostProcessor({
    outputShape: [1, 6, 2], outputLayout: OutputLayout.ATTRS_X_BOXES,
    inputSize: 100, scoreThreshold: 0.5,
  });
  // attrs are cx, cy, w, h, class0, class1; each row contains two boxes.
  const output = new Float32Array([
    .5, .1, .5, .1, .4, .1, .2, .1, .9, .2, .1, .3,
  ]);
  const result = processor.process(output, {
    scale: 0.5, padX: 0, padY: 25, sourceWidth: 200, sourceHeight: 100,
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].classId, 0);
  assert.deepEqual(
    Object.fromEntries(Object.entries(result[0].box).map(([key, value]) => [key, Math.round(value)])),
    { x: 60, y: 30, x2: 140, y2: 70, width: 80, height: 40 },
  );
});

test('NMS suppresses overlapping boxes only within the same class', () => {
  const processor = new YoloPostProcessor({ outputShape: [1, 2, 6], iouThreshold: 0.4 });
  const same = { box: { x: 1, y: 1, x2: 9, y2: 9 }, confidence: .8, classId: 0 };
  const result = processor.nms([
    { box: { x: 0, y: 0, x2: 10, y2: 10 }, confidence: .9, classId: 0 },
    same,
    { ...same, confidence: .7, classId: 1 },
  ]);
  assert.equal(result.length, 2);
  assert.deepEqual(result.map((item) => item.classId), [0, 1]);
});
