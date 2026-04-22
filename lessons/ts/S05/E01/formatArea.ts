export const roundTo2dp = (x: number): string =>
  (Math.round(x * 100) / 100).toFixed(2);

export const parseAreaValue = (raw: string): string | null => {
  const num = parseFloat(raw.replace(/[^\d.]/g, ""));
  if (isNaN(num)) return null;
  return roundTo2dp(num);
};
