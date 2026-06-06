export function getKolAvatarInitials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "K";
}

export function getResolvedKolAvatarUrl(name: string, url: string | null | undefined): string {
  const normalizedUrl = normalizeKolAvatarUrl(url);
  if (normalizedUrl) {
    return normalizedUrl;
  }

  return createGeneratedKolAvatarUrl(name);
}

function normalizeKolAvatarUrl(url: string | null | undefined): string | null {
  const trimmedUrl = url?.trim();
  if (!trimmedUrl) {
    return null;
  }

  if (trimmedUrl.startsWith("/") || trimmedUrl.startsWith("data:image/")) {
    return trimmedUrl;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
      ? parsedUrl.toString()
      : null;
  } catch {
    return null;
  }
}

function createGeneratedKolAvatarUrl(name: string): string {
  const label = getKolAvatarInitials(name);
  const hue =
    Array.from(name).reduce(
      (sum, character) => sum + character.charCodeAt(0),
      0,
    ) % 360;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">`,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0%" stop-color="hsl(${hue} 84% 58%)"/>`,
    `<stop offset="100%" stop-color="hsl(${(hue + 52) % 360} 92% 42%)"/>`,
    `</linearGradient></defs>`,
    `<rect width="96" height="96" rx="48" fill="url(#g)"/>`,
    `<circle cx="70" cy="24" r="16" fill="rgba(255,255,255,.18)"/>`,
    `<text x="48" y="57" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800">${escapeSvgText(label)}</text>`,
    `</svg>`,
  ].join("");

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeSvgText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
