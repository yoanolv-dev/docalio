// Dates lisibles en français, sans dépendance.

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = Math.round((now - new Date(iso).getTime()) / 1000);
  if (diff < 45) return "à l'instant";
  const min = Math.round(diff / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "hier";
  if (d < 7) return `il y a ${d} jours`;
  return shortDate(iso);
}

export function shortDate(iso: string): string {
  const d = new Date(iso);
  const months = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${d.getDate()} ${months[d.getMonth()]}${sameYear ? "" : ` ${d.getFullYear()}`}`;
}

export function initials(value: string): string {
  const parts = value.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
