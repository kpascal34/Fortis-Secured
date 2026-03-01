const hexToRgb = (hex) => {
  const normalized = hex.replace('#', '').trim();
  const full = normalized.length === 3
    ? normalized.split('').map((ch) => ch + ch).join('')
    : normalized;

  const value = Number.parseInt(full, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const luminance = ({ r, g, b }) => {
  const [R, G, B] = [r, g, b].map((v) => {
    const channel = v / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};

export const contrastRatio = (foreground, background) => {
  const fg = luminance(hexToRgb(foreground));
  const bg = luminance(hexToRgb(background));
  const light = Math.max(fg, bg);
  const dark = Math.min(fg, bg);
  return Number(((light + 0.05) / (dark + 0.05)).toFixed(2));
};

export const meetsWCAGAA = (foreground, background, isLargeText = false) => {
  const minimum = isLargeText ? 3 : 4.5;
  return contrastRatio(foreground, background) >= minimum;
};
