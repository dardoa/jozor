export const stringToColor = (value: string): string => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
    hash |= 0;
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 42% 68%)`;
};

export const stringToGradient = (value: string): string => {
  const base = stringToColor(value);
  const hueMatch = /hsl\((\d+)/.exec(base);
  const hue = hueMatch ? Number(hueMatch[1]) : 205;
  const secondaryHue = (hue + 28) % 360;

  return `linear-gradient(145deg, hsl(${hue} 42% 70%), hsl(${secondaryHue} 38% 66%))`;
};
