export function aspectRatioValidator({ min = 1.28, max = 1.7 } = {}) {
  return ({ box }) => {
    const width = box.x2 - box.x;
    const height = box.y2 - box.y;
    if (width <= 0 || height <= 0) return false;
    const ratio = Math.max(width, height) / Math.min(width, height);
    return ratio >= min && ratio <= max;
  };
}

export function marginValidator({ margin = 20 } = {}) {
  return ({ box }, _previous, frame) => margin * 2 < frame.width
    && margin * 2 < frame.height
    && box.x >= margin
    && box.y >= margin
    && box.x2 <= frame.width - margin
    && box.y2 <= frame.height - margin;
}
