import { logger } from "#utils/logger.js";

/**
 * Lightweight Unsplash search wrapper.
 * Returns up to N normalized results { url, downloadUrl, photographerName, photographerUrl }.
 *
 * UNSPLASH_ACCESS_KEY is required. If missing, returns [] silently.
 */

const fetchWithTimeout = async (url, options = {}, timeoutMs = 8_000) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
};

export const searchUnsplash = async ({ query, perPage = 9 }) => {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    logger.debug("Unsplash not configured; skipping search");
    return [];
  }
  const params = new URLSearchParams({
    query,
    per_page: String(Math.min(perPage, 30)),
    orientation: "landscape",
    content_filter: "high",
  });
  const res = await fetchWithTimeout(
    `https://api.unsplash.com/search/photos?${params.toString()}`,
    {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
    }
  );
  if (!res.ok) {
    throw new Error(`Unsplash error ${res.status}`);
  }
  const data = await res.json();
  return (data?.results || []).map((r) => ({
    id: r.id,
    url: r.urls?.regular,
    downloadUrl: r.urls?.full,
    width: r.width,
    height: r.height,
    description: r.description || r.alt_description || "",
    photographerName: r.user?.name,
    photographerUrl: r.user?.links?.html,
  }));
};
