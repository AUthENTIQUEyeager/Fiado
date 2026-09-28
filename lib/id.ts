export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Repli tres improbable (anciens navigateurs) — suffisant pour un id local.
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
