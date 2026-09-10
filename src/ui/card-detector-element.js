import { CardDetectionController } from '../browser/card-detection-controller.js';

const template = document.createElement('template');
template.innerHTML = `<style>
  :host { display:block; position:relative; overflow:hidden; background:#111; }
  video, canvas { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
  canvas { pointer-events:none; }
  ::slotted(*) { position:absolute; inset:0; }
</style><video playsinline muted></video><canvas></canvas><slot></slot>`;

export class CardDetectorElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true));
    this.video = this.shadowRoot.querySelector('video');
    this.overlay = this.shadowRoot.querySelector('canvas');
    this.loop = this.loop.bind(this);
  }

  async start(controller, mediaConstraints = { video: { facingMode: 'environment' }, audio: false }) {
    if (!(controller instanceof CardDetectionController)) throw new TypeError('controller must be a CardDetectionController');
    this.controller = controller;
    this.stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
    this.video.srcObject = this.stream;
    await this.video.play();
    this.running = true;
    this.animationFrame = requestAnimationFrame(this.loop);
    return this;
  }

  async loop(time) {
    if (!this.running) return;
    const result = await this.controller.process(this.video, time).catch(() => null);
    this.draw(result);
    this.animationFrame = requestAnimationFrame(this.loop);
  }

  draw(result) {
    const ratio = window.devicePixelRatio || 1;
    const rect = this.getBoundingClientRect();
    this.overlay.width = rect.width * ratio;
    this.overlay.height = rect.height * ratio;
    const context = this.overlay.getContext('2d');
    context.scale(ratio, ratio);
    context.clearRect(0, 0, rect.width, rect.height);
    if (!result) return;
    const frameRatio = result.frame.width / result.frame.height;
    const viewRatio = rect.width / rect.height;
    const scale = frameRatio > viewRatio ? rect.height / result.frame.height : rect.width / result.frame.width;
    const offsetX = (rect.width - result.frame.width * scale) / 2;
    const offsetY = (rect.height - result.frame.height * scale) / 2;
    const { box } = result.card;
    context.strokeStyle = result.lockingStatus === 'locking-card' ? '#ffd166' : '#39e58c';
    context.lineWidth = 3;
    context.strokeRect(offsetX + box.x * scale, offsetY + box.y * scale,
      (box.x2 - box.x) * scale, (box.y2 - box.y) * scale);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.animationFrame);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.video.srcObject = null;
  }

  disconnectedCallback() { this.stop(); }
}

if (!customElements.get('card-detector-lite')) customElements.define('card-detector-lite', CardDetectorElement);

export function mountCardDetector(target, options) {
  const element = document.createElement('card-detector-lite');
  target.append(element);
  return element.start(options.controller, options.mediaConstraints);
}
