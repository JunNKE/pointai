export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassValue[]
  | { [key: string]: boolean };

function toClassName(value: ClassValue): string {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(toClassName).filter(Boolean).join(" ");
  if (typeof value === "object") {
    return Object.keys(value)
      .filter((k) => Boolean((value as Record<string, boolean>)[k]))
      .join(" ");
  }
  return "";
}

export function cn(...values: ClassValue[]) {
  return values.map(toClassName).filter(Boolean).join(" ");
}
