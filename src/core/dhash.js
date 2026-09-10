const HASH_WIDTH = 9;
const HASH_HEIGHT = 8;

export function differenceHash(imageData, region, scratchCanvas) {
  const canvas = scratchCanvas ?? document.createElement('canvas');
  canvas.width = HASH_WIDTH;
  canvas.height = HASH_HEIGHT;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const source = imageData instanceof ImageData
    ? imageDataToCanvas(imageData)
    : imageData;
  context.drawImage(source, region.x, region.y, region.x2 - region.x, region.y2 - region.y,
    0, 0, HASH_WIDTH, HASH_HEIGHT);
  const pixels = context.getImageData(0, 0, HASH_WIDTH, HASH_HEIGHT).data;
  let hash = 0n;
  let bit = 0n;
  for (let y = 0; y < HASH_HEIGHT; y += 1) {
    for (let x = 0; x < HASH_WIDTH - 1; x += 1) {
      const left = grayscale(pixels, (y * HASH_WIDTH + x) * 4);
      const right = grayscale(pixels, (y * HASH_WIDTH + x + 1) * 4);
      if (left > right) hash |= 1n << bit;
      bit += 1n;
    }
  }
  return hash;
}

export function hammingDistance(a, b) {
  let value = a ^ b;
  let count = 0;
  while (value) {
    value &= value - 1n;
    count += 1;
  }
  return count;
}

function grayscale(data, index) {
  return data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
}

function imageDataToCanvas(imageData) {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  canvas.getContext('2d').putImageData(imageData, 0, 0);
  return canvas;
}
