const segments = ['🯰', '🯱', '🯲', '🯳', '🯴', '🯵', '🯶', '🯷', '🯸', '🯹'];

function getSegmentChar(v: number): string {
  if (0 <= v && v <= 9) {
    return segments[v];
  }
  throw new Error('invalid input');
}

export function toSegmentStr(base10Str: string): string {
  return base10Str
    .split('')
    .map((v) => {
      const n = Number(v);
      return Number.isInteger(n) ? getSegmentChar(n) : v;
    })
    .join('');
}

export function getMoscowTime(value: number | undefined): string {
  if (value === undefined) {
    return '--:--';
  }
  const satPerBase = (1e8 / value).toFixed(0);
  const a = satPerBase.substr(0, satPerBase.length - 2);
  const b = satPerBase.substr(satPerBase.length - 2, satPerBase.length);
  return `${a}:${b}`;
}
