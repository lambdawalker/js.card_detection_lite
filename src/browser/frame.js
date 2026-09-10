export function createFrameBuffers(inputSize = 640) {
  const source = document.createElement('canvas');
  const model = document.createElement('canvas');
  model.width = inputSize;
  model.height = inputSize;
  return { source, model };
}

export function captureAndLetterbox(video, buffers) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  buffers.source.width = width;
  buffers.source.height = height;
  const sourceContext = buffers.source.getContext('2d', { willReadFrequently: true });
  sourceContext.drawImage(video, 0, 0, width, height);
  const target = buffers.model.width;
  const scale = Math.min(target / width, target / height);
  const scaledWidth = Math.floor(width * scale);
  const scaledHeight = Math.floor(height * scale);
  const padX = (target - scaledWidth) / 2;
  const padY = (target - scaledHeight) / 2;
  const modelContext = buffers.model.getContext('2d');
  modelContext.fillStyle = '#000';
  modelContext.fillRect(0, 0, target, target);
  modelContext.drawImage(buffers.source, 0, 0, width, height,
    padX, padY, scaledWidth, scaledHeight);
  return {
    source: buffers.source,
    model: buffers.model,
    width,
    height,
    scale,
    padX,
    padY,
    sourceWidth: width,
    sourceHeight: height,
  };
}
