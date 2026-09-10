import { box, clampBox, intersectionOverUnion } from './geometry.js';

export const OutputLayout = Object.freeze({
  ATTRS_X_BOXES: 'attrs-x-boxes',
  BOXES_X_ATTRS: 'boxes-x-attrs',
});

export class YoloPostProcessor {
  constructor({
    outputShape,
    outputLayout,
    inputSize = 640,
    scoreThreshold = 0.5,
    iouThreshold = 0.45,
    maxNmsCandidates = 100,
    coordinates = 'normalized',
  }) {
    const dimensions = outputShape.length === 3 ? outputShape.slice(1) : outputShape;
    if (dimensions.length !== 2) throw new Error(`Expected a 2D/3D YOLO output, got [${outputShape}]`);
    const [first, second] = dimensions;
    this.layout = outputLayout ?? (second >= 400 && first <= 256
      ? OutputLayout.ATTRS_X_BOXES
      : OutputLayout.BOXES_X_ATTRS);
    this.outAttrs = this.layout === OutputLayout.ATTRS_X_BOXES ? first : second;
    this.outBoxes = this.layout === OutputLayout.ATTRS_X_BOXES ? second : first;
    this.numClasses = this.outAttrs - 4;
    this.inputSize = inputSize;
    this.scoreThreshold = scoreThreshold;
    this.iouThreshold = iouThreshold;
    this.maxNmsCandidates = maxNmsCandidates;
    this.coordinateScale = coordinates === 'normalized' ? inputSize : 1;
  }

  process(output, letterbox) {
    return this.nms(this.decode(output, letterbox));
  }

  decode(output, { scale, padX, padY, sourceWidth, sourceHeight }) {
    const attrsFirst = this.layout === OutputLayout.ATTRS_X_BOXES;
    const boxStride = attrsFirst ? 1 : this.outAttrs;
    const attrStride = attrsFirst ? this.outBoxes : 1;
    const results = [];
    for (let i = 0; i < this.outBoxes; i += 1) {
      const base = i * boxStride;
      let confidence = 0;
      let classId = -1;
      for (let classIndex = 0; classIndex < this.numClasses; classIndex += 1) {
        const score = output[base + (4 + classIndex) * attrStride];
        if (score > confidence) {
          confidence = score;
          classId = classIndex;
        }
      }
      if (confidence < this.scoreThreshold) continue;
      const cx = output[base] * this.coordinateScale;
      const cy = output[base + attrStride] * this.coordinateScale;
      const width = output[base + 2 * attrStride] * this.coordinateScale;
      const height = output[base + 3 * attrStride] * this.coordinateScale;
      results.push({
        box: clampBox(box(
          (cx - width / 2 - padX) / scale,
          (cy - height / 2 - padY) / scale,
          (cx + width / 2 - padX) / scale,
          (cy + height / 2 - padY) / scale,
        ), sourceWidth, sourceHeight),
        confidence,
        classId,
      });
    }
    return results;
  }

  nms(detections) {
    const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
    const kept = [];
    for (const candidate of sorted) {
      if (kept.length >= this.maxNmsCandidates) break;
      const overlaps = kept.some((accepted) =>
        accepted.classId === candidate.classId
        && intersectionOverUnion(accepted.box, candidate.box) > this.iouThreshold);
      if (!overlaps) kept.push(candidate);
    }
    return kept;
  }
}
