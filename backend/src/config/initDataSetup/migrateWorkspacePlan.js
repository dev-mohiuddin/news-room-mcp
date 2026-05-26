import mongoose from "mongoose";
import { Workspace } from "#models/workspaceModel.js";
import { Subscription } from "#models/subscriptionModel.js";
import { ensureSubscription } from "#repositories/subscriptionRepository.js";
import { ALL_PLAN_NAMES, PLAN_NAMES } from "#constants/plans.js";
import { logger } from "#utils/logger.js";

/**
 * One-time idempotent migration — Requirement 12.3.
 *
 *  - For every Workspace with no Subscription, create one.
 *  - If a Workspace doc still has a legacy `plan` field, copy it to
 *    Subscription.plan and `$unset` it from Workspace.
 *  - Re-runnable: anything already migrated is left alone.
 */
export const migrateWorkspacePlan = async () => {
  // Use the raw collection so we can read the legacy `plan` field even
  // though the Mongoose schema no longer declares it.
  const collection = Workspace.collection;
  const cursor = collection.find({});
  let migrated = 0;
  let kept = 0;

  // eslint-disable-next-line no-await-in-loop
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const workspaceId = doc._id;

    const subExists = await Subscription.exists({ workspaceId });
    const legacyPlan = doc.plan && ALL_PLAN_NAMES.includes(doc.plan)
      ? doc.plan
      : PLAN_NAMES.FREE;

    if (!subExists) {
      await ensureSubscription(workspaceId, { plan: legacyPlan, anchor: doc.createdAt || new Date() });
      // Then promote the plan if needed (ensureSubscription defaults to FREE)
      if (legacyPlan !== PLAN_NAMES.FREE) {
        await Subscription.updateOne(
          { workspaceId },
          { $set: { plan: legacyPlan } }
        );
      }
      migrated++;
    } else {
      kept++;
    }

    if (doc.plan !== undefined) {
      await collection.updateOne(
        { _id: workspaceId },
        { $unset: { plan: "" } }
      );
    }
  }

  logger.info("[migration] workspace.plan → subscription", {
    migrated,
    kept,
  });
};

/**
 * Schema introspection guard — Requirement 12.5.
 * If the Workspace schema still declares `plan`, fail boot loudly so the
 * dev knows to remove it.
 */
export const assertWorkspaceSchemaClean = () => {
  const path = Workspace.schema?.path("plan");
  if (path) {
    throw new Error(
      "Workspace schema still defines `plan`. Remove it; plan now lives on Subscription."
    );
  }
};
