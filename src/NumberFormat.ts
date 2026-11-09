const formatter = new Intl.NumberFormat();

export function f(n: number) {
  return formatter.format(n);
}