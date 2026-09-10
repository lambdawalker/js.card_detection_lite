import { CardDetectionController } from '../src/browser/card-detection-controller.js';
import { TfjsTfliteEngine } from '../src/inference/tfjs-tflite-engine.js';
import '../src/ui/card-detector-element.js';
import './style.css';

const status = document.querySelector('#status');
const engine = new TfjsTfliteEngine({
  modelUrl: '/model/Y11-640E197F16.tflite',
  wasmPath: 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite/dist/',
});
const controller = new CardDetectionController({ engine });
controller.addEventListener('detection', ({ detail }) => {
  status.textContent = detail
    ? `${detail.lockingStatus} · ${Math.round(detail.lockOnProgress * 100)}%`
    : 'Looking for a card…';
});
controller.addEventListener('error', ({ detail }) => { status.textContent = detail.message; });
await controller.load();
status.textContent = 'Requesting camera…';
await document.querySelector('#detector').start(controller);
