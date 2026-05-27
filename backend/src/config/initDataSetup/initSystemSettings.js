import { logger } from "#utils/logger.js";
import {
  SystemSettings,
  SETTINGS_SINGLETON_ID,
} from "#models/systemSettingsModel.js";

/**
 * Idempotent system-settings seeder.
 *
 *  - First boot: creates the singleton with sensible defaults + the canonical
 *    feature-flag list mirrored from the proposal roadmap.
 *  - Subsequent boots: only inserts NEW canonical flags missing from the doc;
 *    never overwrites admin edits.
 */

const CANONICAL_FLAGS = [
  {
    id: "real_time_streaming",
    label: "Real-time generation streaming",
    description: "Show progress while AI is drafting (article:progress events)",
    enabled: true,
    category: "core",
  },
  {
    id: "version_history",
    label: "Article version history",
    description: "Save snapshots on each auto-save",
    enabled: false,
    category: "experimental",
  },
  {
    id: "team_collab",
    label: "Team collaboration (Pro+)",
    description: "Invite editors, writers, reviewers",
    enabled: true,
    category: "core",
  },
  {
    id: "ghost_integration",
    label: "Ghost CMS integration",
    description: "Beta — Ghost publishing API",
    enabled: false,
    category: "integration",
  },
  {
    id: "social_repurpose",
    label: "Social repurposing",
    description: "Generate Twitter / LinkedIn from article",
    enabled: true,
    category: "core",
  },
  {
    id: "originality_check",
    label: "Originality / plagiarism check",
    description: "Run pre-publish originality scans against Originality.ai",
    enabled: true,
    category: "billing",
  },
];

export const initSystemSettings = async () => {
  const existing = await SystemSettings.findById(SETTINGS_SINGLETON_ID).exec();
  if (!existing) {
    await SystemSettings.create({
      _id: SETTINGS_SINGLETON_ID,
      features: CANONICAL_FLAGS,
    });
    logger.info("[init] system settings created", {
      flags: CANONICAL_FLAGS.length,
    });
    return;
  }

  // Add new canonical flags that aren't in the doc yet.
  const existingIds = new Set((existing.features || []).map((f) => f.id));
  const additions = CANONICAL_FLAGS.filter((f) => !existingIds.has(f.id));
  if (additions.length === 0) {
    logger.info("[init] system settings up to date");
    return;
  }
  await SystemSettings.updateOne(
    { _id: SETTINGS_SINGLETON_ID },
    { $push: { features: { $each: additions } } }
  );
  logger.info("[init] system settings synced new flags", {
    added: additions.length,
  });
};

export default initSystemSettings;
