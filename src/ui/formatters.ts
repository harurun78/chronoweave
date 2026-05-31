export function formatOptionalMs(value: number | undefined): string {
  return value === undefined ? '-' : `${value} ms`;
}
