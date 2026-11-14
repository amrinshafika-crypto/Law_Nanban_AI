export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function safePhoneUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.replace(/[\s().-]/g, '');
  return /^\+?\d{5,15}$/.test(normalized) ? `tel:${normalized}` : null;
}
