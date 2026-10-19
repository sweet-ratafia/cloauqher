export function slug(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}
