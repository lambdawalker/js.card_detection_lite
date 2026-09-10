/** Thin, replaceable adapter around @tensorflow/tfjs-tflite. */
export class TfjsTfliteEngine {
  constructor({ modelUrl, wasmPath, inputSize = 640, outputShape = [1, 13, 8400] }) {
    this.modelUrl = modelUrl;
    this.wasmPath = wasmPath;
    this.inputSize = inputSize;
    this.outputShape = outputShape;
  }

  async load() {
    const [tf, tflite] = await Promise.all([
      import('@tensorflow/tfjs-core'),
      import('@tensorflow/tfjs-tflite'),
    ]);
    if (this.wasmPath) tflite.setWasmPath(this.wasmPath);
    this.tf = tf;
    this.model = await tflite.loadTFLiteModel(this.modelUrl);
    return this;
  }

  async infer(canvas) {
    if (!this.model) throw new Error('Call load() before infer()');
    const tf = this.tf;
    const input = tf.tidy(() => tf.browser.fromPixels(canvas, 3).toFloat().div(255).expandDims(0));
    try {
      const prediction = this.model.predict(input);
      const tensor = Array.isArray(prediction) ? prediction[0] : prediction;
      const output = new Float32Array(await tensor.data());
      const shape = tensor.shape?.length ? tensor.shape : this.outputShape;
      tensor.dispose?.();
      return { output, outputShape: shape };
    } finally {
      input.dispose();
    }
  }

  dispose() {
    this.model?.dispose?.();
    this.model = null;
  }
}
