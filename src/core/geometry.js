export function box(x, y, x2, y2) {
  return { x, y, x2, y2, width: x2 - x, height: y2 - y };
}

export function clampBox(value, width, height) {
  return box(
    Math.max(0, Math.min(width, value.x)),
    Math.max(0, Math.min(height, value.y)),
    Math.max(0, Math.min(width, value.x2)),
    Math.max(0, Math.min(height, value.y2)),
  );
}

export function intersectionOverUnion(a, b) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x2, b.x2);
  const bottom = Math.min(a.y2, b.y2);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  if (intersection === 0) return 0;
  const areaA = Math.max(0, a.x2 - a.x) * Math.max(0, a.y2 - a.y);
  const areaB = Math.max(0, b.x2 - b.x) * Math.max(0, b.y2 - b.y);
  return intersection / (areaA + areaB - intersection + 1e-6);
}
