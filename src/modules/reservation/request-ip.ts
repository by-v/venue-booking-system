import { createHash } from "node:crypto";

/**
 * Sumber permintaan untuk pembatas laju (design RS-5). Header IP bergantung
 * pada platform deploy; NFR-SEC-04 mencatat bahwa perilaku ini PROVISIONAL.
 */

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = headers.get("x-real-ip")?.trim();
  return realIp || "unknown";
}

export function hashClientIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}
