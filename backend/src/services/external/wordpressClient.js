/**
 * ============================================================
 *  WordPress REST API client
 * ============================================================
 *
 *  Minimal wrapper used by the Publish_Service. Authentication is
 *  HTTP Basic with `username:applicationPassword`.
 *
 *  All methods accept a fully-decrypted credentials bundle:
 *    { siteUrl, username, password }
 */

const buildAuthHeader = ({ username, password }) => {
  const token = Buffer.from(`${username}:${password}`).toString("base64");
  return `Basic ${token}`;
};

const apiBase = (siteUrl) => `${String(siteUrl).replace(/\/$/, "")}/wp-json/wp/v2`;

const fetchWithTimeout = async (url, options = {}, timeoutMs = 20_000) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
};

export const verifyConnection = async ({ siteUrl, username, password }) => {
  const res = await fetchWithTimeout(`${apiBase(siteUrl)}/users/me?context=edit`, {
    headers: { Authorization: buildAuthHeader({ username, password }) },
  }, 10_000);
  if (!res.ok) {
    throw new Error(`WordPress auth failed: ${res.status}`);
  }
  const user = await res.json();
  const capabilities = user.capabilities || {};
  return {
    user,
    canEditPosts: Boolean(capabilities.edit_posts),
  };
};

const findOrCreateTaxonomy = async (creds, taxonomy /* "tags" | "categories" */, terms) => {
  if (!terms?.length) return [];
  const ids = [];
  for (const term of terms) {
    const slug = String(term)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!slug) continue;

    // Try to find existing.
    const findRes = await fetchWithTimeout(
      `${apiBase(creds.siteUrl)}/${taxonomy}?slug=${encodeURIComponent(slug)}`,
      { headers: { Authorization: buildAuthHeader(creds) } }
    );
    if (findRes.ok) {
      const arr = await findRes.json();
      if (Array.isArray(arr) && arr.length > 0) {
        ids.push(arr[0].id);
        continue;
      }
    }
    // Create it.
    const createRes = await fetchWithTimeout(
      `${apiBase(creds.siteUrl)}/${taxonomy}`,
      {
        method: "POST",
        headers: {
          Authorization: buildAuthHeader(creds),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: term, slug }),
      }
    );
    if (createRes.ok) {
      const created = await createRes.json();
      ids.push(created.id);
    }
  }
  return ids;
};

export const uploadMedia = async ({ creds, buffer, filename, mime }) => {
  const res = await fetchWithTimeout(
    `${apiBase(creds.siteUrl)}/media`,
    {
      method: "POST",
      headers: {
        Authorization: buildAuthHeader(creds),
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
      body: buffer,
    },
    30_000
  );
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`WP media upload failed: ${res.status} ${errBody}`);
  }
  return res.json();
};

export const createPost = async ({ creds, payload }) => {
  const res = await fetchWithTimeout(`${apiBase(creds.siteUrl)}/posts`, {
    method: "POST",
    headers: {
      Authorization: buildAuthHeader(creds),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WP post create failed: ${res.status} ${text}`);
  }
  return res.json();
};

export { findOrCreateTaxonomy };
