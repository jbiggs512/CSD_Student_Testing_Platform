import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeInputText(value: string): string {
  return value
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(
      /<\/?(?:iframe|object|embed|style|svg|math|link|meta|base)\b[^>]*>/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim()
}

export function downloadJsonFile(filename: string, data: unknown): void {
  const json = typeof data === "string" ? data : JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (error instanceof Error && error.message) return error.message
  return fallback
}