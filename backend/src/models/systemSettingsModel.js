import mongoose from "mongoose";

/**
 * ============================================================
 *  SystemSettings — single document, platform-wide config
 * ============================================================
 *
 *  Singleton pattern: we always read/write the row with `_id`
 *  hardcoded to "system" (Mongo accepts string `_id` values when the
 *  schema declares it). The seeder creates this row on first boot.
 *
 *  Sections:
 *    - identity   : platformName, tagline, supportEmail, defaultTimezone
 *    - branding   : primaryColor, logoLightUrl, logoDarkUrl, faviconUrl
 *    - email      : smtp host/port/user/from
 *    - maintenance: enabled, message, allowAdminBypass
 *    - features   : feature-flag map keyed by stable id
 *
 *  Maintenance mode → blocks tenant requests with HTTP 503 from the
 *  middleware in `maintenanceMiddleware.js`. Admins always pass through;
 *  webhooks and auth flows are exempt by route mount order.
 */

export const SETTINGS_SINGLETON_ID = "system";

const featureFlagSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true, maxlength: 60 },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", trim: true, maxlength: 300 },
    enabled: { type: Boolean, default: false },
    category: {
      type: String,
      enum: ["core", "experimental", "integration", "billing"],
      default: "core",
    },
  },
  { _id: false }
);

const systemSettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: SETTINGS_SINGLETON_ID },

    /* ── Identity ── */
    identity: {
      platformName: { type: String, default: "Newsroom MCP", maxlength: 80 },
      tagline: {
        type: String,
        default: "Publish Smarter. Write with AI.",
        maxlength: 160,
      },
      supportEmail: {
        type: String,
        default: "support@newsroommcp.com",
        lowercase: true,
        trim: true,
      },
      defaultTimezone: { type: String, default: "UTC", maxlength: 60 },
    },

    /* ── Branding ── */
    branding: {
      primaryColor: { type: String, default: "#3B82F6", maxlength: 20 },
      logoLightUrl: { type: String, default: null, maxlength: 500 },
      logoDarkUrl: { type: String, default: null, maxlength: 500 },
      faviconUrl: { type: String, default: null, maxlength: 500 },
    },

    /* ── Email (display-only — keys live in env) ── */
    email: {
      smtpHost: { type: String, default: null, maxlength: 200 },
      smtpPort: { type: Number, default: null, min: 0, max: 65535 },
      smtpUser: { type: String, default: null, maxlength: 200 },
      fromAddress: {
        type: String,
        default: null,
        lowercase: true,
        trim: true,
        maxlength: 200,
      },
      fromName: { type: String, default: null, maxlength: 100 },
    },

    /* ── Maintenance mode ── */
    maintenance: {
      enabled: { type: Boolean, default: false },
      message: {
        type: String,
        default:
          "We're upgrading our infrastructure. Newsroom MCP will be back shortly.",
        maxlength: 500,
      },
      allowAdminBypass: { type: Boolean, default: true },
    },

    /* ── Feature flags ── */
    features: { type: [featureFlagSchema], default: [] },

    /* ── Audit ── */
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    minimize: false, // keep empty subdocs in the response
    _id: false, // we declare _id ourselves above
  }
);

export const SystemSettings = mongoose.model(
  "SystemSettings",
  systemSettingsSchema
);
export default SystemSettings;
