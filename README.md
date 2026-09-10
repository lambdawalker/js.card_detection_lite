# Card Detection Lite for JavaScript

This repository is the framework-neutral JavaScript port of [android.card_detection_lite](https://github.com/lambdawalker/android.card_detection_lite). The detection pipeline is plain ES modules; the only optional runtime dependency is TensorFlow.js Lite for executing the existing `.tflite` model in a browser.

## Architecture

- `core/`: DOM-free geometry, YOLO decoding/NMS, validators, dHash, and temporal tracking.
- `inference/`: replaceable model runtime adapter. `TfjsTfliteEngine` is the first implementation.
- `browser/`: camera-frame capture, letterboxing, throttling, and pipeline orchestration.
- `ui/`: an optional Web Component and imperative mount function. Framework adapters should wrap this boundary rather than reimplementing detection.

## Run the demo

Place `Y11-640E197F16.tflite` at `demo/public/model/Y11-640E197F16.tflite`. The model currently lives in the Android source repository under `tfmodel/src/main/assets/cdl/tflite/`. Then:

```sh
npm install
npm run dev
```

Camera access requires HTTPS or localhost.

## Plain JavaScript usage

```js
import { CardDetectionController } from '@apexfission/card-detection-lite';
import { TfjsTfliteEngine } from '@apexfission/card-detection-lite/tfjs-tflite';
import '@apexfission/card-detection-lite/element';

const engine = new TfjsTfliteEngine({
  modelUrl: '/models/Y11-640E197F16.tflite',
  wasmPath: '/vendor/tfjs-tflite/',
});
const controller = new CardDetectionController({ engine });
await controller.load();

const detector = document.createElement('card-detector-lite');
document.body.append(detector);
await detector.start(controller);

controller.addEventListener('detection', (event) => {
  const result = event.detail;
  if (result?.lockingStatus === 'new-card') console.log(result);
});
```

The controller accepts an injected `engine` with `load()`, `infer(canvas)`, and `dispose()` methods, so switching to ONNX Runtime Web, MediaPipe, WebNN, or a server inference adapter does not affect tracking or UI integrations.
