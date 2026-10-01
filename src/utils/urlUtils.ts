const EXPLICIT_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Accept only destinations that are safe to expose as clickable live-preview
 * links. Relative Markdown paths remain supported for local-first vaults.
 */
export function sanitizeLivePreviewUrl(rawUrl: string, allowImageData = false): string | null {
  const url = rawUrl.trim();
  if (!url || /[\u0000-\u001f\u007f]/.test(url)) return null;

  if (url.startsWith('#') || url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return url;
  }

  if (!EXPLICIT_SCHEME.test(url)) return url;

  try {
    const protocol = new URL(url).protocol.toLowerCase();
    if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:' || protocol === 'worklog-media:') {
      return url;
    }
    if (allowImageData && protocol === 'data:' && /^data:image\/(?:png|jpe?g|gif|webp|bmp);/i.test(url)) {
      return url;
    }
  } catch {
    return null;
  }

  return null;
}
