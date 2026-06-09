/**
 * Extracts coordinates of points (M and L commands) from an SVG path string.
 */
export function extractPathPoints(pathData: string): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const re = /[ML]\s*([-\d.]+)\s+([-\d.]+)/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(pathData)) !== null) {
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      points.push({ x, y });
    }
  }

  return points;
}
