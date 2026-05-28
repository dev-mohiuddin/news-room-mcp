import nodemailer from "nodemailer";
import {
  getProviderConfig,
  recordTestResult,
} from "#services/system/integrationService.js";
import { logger } from "#utils/logger.js";
import { throwError } from "#utils/throwErrorUtil.js";

/**
 * ============================================================
 *  Test-Connection helpers
 * ============================================================
 *
 *  Each provider has a tiny "ping" — a minimal authenticated
 *  request that returns 200 quickly. Failures DO NOT throw to
 *  the controller; they're recorded on the integration doc and
 *  returned as `{ ok:false, error:"..." }` so the admin UI can
 *  show a clean status without a stack trace.
 *
 *  Hard timeout: 8s per test. Anything longer is treated as
 *  failure to keep the admin UI snappy.
 */

const TEST_TIMEOUT_MS = 8_000;

const withTimeout = async (label, fn) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);
  try {
    const result = await fn(controller.signal);
    return result;
  } catch (err) {
    if (err?.name === "AbortError" || err?.code === "ABORT_ERR") {
      throw new Error(`${label} timeout after ${TEST_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
};

const requireField = (config, field, providerLabel) => {
  if (!config?.[field]) {
    throw new Error(`${providerLabel}: missing "${field}"`);
  }
  return config[field];
};

/* ──────────────────────────────────────────────────────────
 *  Per-provider tests
 * ────────────────────────────────────────────────────────── */

const testAnthropic = async (config) => {
  const apiKey = requireField(config, "apiKey", "Anthropic");
  /* 1-token Haiku call — cheapest possible auth check */
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey });
  await withTimeout("Anthropic", async () => {
    await client.messages.create({
      model: process.env.ANTHROPIC_HAIKU_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    });
  });
};

const testBrave = async (config) => {
  const apiKey = requireField(config, "apiKey", "Brave");
  await withTimeout("Brave", async (signal) => {
    const res = await fetch(
      "https://api.search.brave.com/res/v1/web/search?q=test&count=1",
      {
        signal,
        headers: { Accept: "application/json", "X-Subscription-Token": apiKey },
      }
    );
    if (!res.ok) throw new Error(`Brave HTTP ${res.status}`);
  });
};

const testExa = async (config) => {
  const apiKey = requireField(config, "apiKey", "Exa");
  await withTimeout("Exa", async (signal) => {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      signal,
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "test", numResults: 1, type: "auto" }),
    });
    if (!res.ok) throw new Error(`Exa HTTP ${res.status}`);
  });
};

const testStripe = async (config) => {
  const secretKey = requireField(config, "secretKey", "Stripe");
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(secretKey, { apiVersion: "2024-12-18.acacia", timeout: 5000 });
  await withTimeout("Stripe", async () => {
    await stripe.customers.list({ limit: 1 });
  });
};

const testCloudinary = async (config) => {
  const cloudName = requireField(config, "cloudName", "Cloudinary");
  const apiKey = requireField(config, "apiKey", "Cloudinary");
  const apiSecret = requireField(config, "apiSecret", "Cloudinary");
  const cloudinary = (await import("cloudinary")).v2;
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  await withTimeout("Cloudinary", async () => {
    await cloudinary.api.ping();
  });
};

const testSmtp = async (config) => {
  const host = requireField(config, "host", "SMTP");
  const port = Number(config.port || 587);
  const user = requireField(config, "user", "SMTP");
  const pass = requireField(config, "pass", "SMTP");
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: TEST_TIMEOUT_MS,
    greetingTimeout: TEST_TIMEOUT_MS,
    socketTimeout: TEST_TIMEOUT_MS,
  });
  await withTimeout("SMTP", async () => {
    await transporter.verify();
    transporter.close();
  });
};

const testDataForSeo = async (config) => {
  const login = requireField(config, "login", "DataForSEO");
  const password = requireField(config, "password", "DataForSEO");
  const auth = Buffer.from(`${login}:${password}`).toString("base64");
  await withTimeout("DataForSEO", async (signal) => {
    const res = await fetch("https://api.dataforseo.com/v3/appendix/user_data", {
      signal,
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) throw new Error(`DataForSEO HTTP ${res.status}`);
  });
};

const testFirecrawl = async (config) => {
  const apiKey = requireField(config, "apiKey", "Firecrawl");
  await withTimeout("Firecrawl", async (signal) => {
    /* The /v1/scrape endpoint requires a body — use /v1/team usage which
     * is auth-only, returns small JSON, ideal for a heartbeat ping. */
    const res = await fetch("https://api.firecrawl.dev/v1/team/usage", {
      signal,
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok && res.status !== 200) {
      throw new Error(`Firecrawl HTTP ${res.status}`);
    }
  });
};

const testJina = async (config) => {
  const apiKey = requireField(config, "apiKey", "Jina");
  await withTimeout("Jina", async (signal) => {
    /* `r.jina.ai` reader is permissive; we just need the auth surface */
    const res = await fetch("https://r.jina.ai/https://example.com", {
      signal,
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "text/plain" },
    });
    if (!res.ok) throw new Error(`Jina HTTP ${res.status}`);
  });
};

const TESTERS = {
  anthropic: testAnthropic,
  brave: testBrave,
  exa: testExa,
  stripe: testStripe,
  cloudinary: testCloudinary,
  smtp: testSmtp,
  dataforseo: testDataForSeo,
  firecrawl: testFirecrawl,
  jina: testJina,
};

/* ──────────────────────────────────────────────────────────
 *  Public — runs the test, persists the result, returns shape
 *  the admin UI expects.
 * ────────────────────────────────────────────────────────── */
export const testIntegration = async (provider) => {
  const tester = TESTERS[provider];
  if (!tester) throwError(`Unknown provider: ${provider}`, 400);

  const config = await getProviderConfig(provider);
  if (!config || Object.keys(config).length === 0) {
    const updated = await recordTestResult({
      provider,
      status: "failed",
      error: "Not configured",
    });
    return { ok: false, error: "Not configured", record: updated };
  }

  try {
    await tester(config);
    const updated = await recordTestResult({ provider, status: "ok" });
    return { ok: true, error: null, record: updated };
  } catch (err) {
    logger.warn("[integration-test] failed", {
      provider,
      message: err.message,
    });
    const updated = await recordTestResult({
      provider,
      status: "failed",
      error: err.message?.slice(0, 240) || "Test failed",
    });
    return { ok: false, error: err.message, record: updated };
  }
};
