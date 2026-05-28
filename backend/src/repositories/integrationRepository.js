import { Integration } from "#models/integrationModel.js";

export const listIntegrations = () =>
  Integration.find({}).sort({ provider: 1 }).exec();

export const findIntegrationByProvider = (provider) =>
  Integration.findOne({ provider }).exec();

/**
 * Returns the document with the encrypted `secrets` Map populated.
 * Internal use only — never expose the raw doc to the API surface.
 */
export const findIntegrationWithSecrets = (provider) =>
  Integration.findOne({ provider }).select("+secrets").exec();

export const upsertIntegration = (provider, data) =>
  Integration.findOneAndUpdate(
    { provider },
    { $set: { ...data, provider } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).exec();

export const setIntegrationActive = (provider, isActive) =>
  Integration.findOneAndUpdate(
    { provider },
    { $set: { isActive: !!isActive } },
    { new: true }
  ).exec();

export const deleteIntegration = (provider) =>
  Integration.findOneAndDelete({ provider }).exec();

export const recordTestResult = (provider, { status, error }) =>
  Integration.findOneAndUpdate(
    { provider },
    {
      $set: {
        lastTestedAt: new Date(),
        lastTestStatus: status,
        lastTestError: error || null,
      },
    },
    { new: true }
  ).exec();
