// Email currently points to the web app. Accept its full link as a mobile fallback.
export function extractEmailToken(value: string | string[] | undefined): string {
  const text = (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
  if (!text.includes('://')) return text;
  try {
    return new URL(text).searchParams.get('token') ?? '';
  } catch {
    return '';
  }
}
