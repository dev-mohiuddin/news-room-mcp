/**
 * Hosts (or path prefixes) we never scrape — paywall, login wall,
 * or tos that disallows automated extraction.
 *
 * Per Requirement 2.2 criterion (b).
 */

export const PAYWALL_BLOCKLIST = Object.freeze([
  "nytimes.com",
  "wsj.com",
  "ft.com",
  "bloomberg.com",
  "economist.com",
  "newyorker.com",
  "theatlantic.com",
  "wired.com",
  "harpers.org",
  "stratechery.com",
  "businessinsider.com",
  "seekingalpha.com",
  "forbes.com",
  "telegraph.co.uk",
  "thetimes.co.uk",

  // Paths
  "medium.com/m/", // Medium member-only
  "linkedin.com/pulse/",
]);

/**
 * Returns true if the URL host (or full URL) matches any blocklist entry.
 */
export const isPaywalled = (rawUrl = "") => {
  let host;
  let pathPrefix;
  try {
    const u = new URL(rawUrl);
    host = u.hostname.replace(/^www\./, "").toLowerCase();
    pathPrefix = `${host}${u.pathname}`;
  } catch {
    return false;
  }
  return PAYWALL_BLOCKLIST.some((entry) => {
    const e = entry.toLowerCase();
    if (e.includes("/")) return pathPrefix.startsWith(e);
    return host === e || host.endsWith(`.${e}`);
  });
};
