type ImageVariant = "thumb" | "card" | "hero" | "detail";

const SIZE_MAP: Record<ImageVariant, number> = {
  thumb: 220,
  card: 420,
  hero: 920,
  detail: 1400,
};

export const extractGoogleDriveFileId = (rawUrl: string): string | null => {
  if (!rawUrl) {
    return null;
  }

  try {
    const parsed = new URL(rawUrl);

    if (!/drive\.google\.com$/i.test(parsed.hostname)) {
      return null;
    }

    const queryId = parsed.searchParams.get("id");
    if (queryId) {
      return queryId;
    }

    const filePathMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/i);
    if (filePathMatch?.[1]) {
      return filePathMatch[1];
    }

    return null;
  } catch {
    return null;
  }
};

export const getOptimizedImageUrl = (url: string, variant: ImageVariant = "card") => {
  if (!url) {
    return "";
  }

  const driveFileId = extractGoogleDriveFileId(url);
  if (!driveFileId) {
    return url;
  }

  return `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w${SIZE_MAP[variant]}`;
};
