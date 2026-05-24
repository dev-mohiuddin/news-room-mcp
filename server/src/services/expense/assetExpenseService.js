import {
  createAssetExpense,
  findAssetExpenseById,
  listAssetExpenses,
} from "#repositories/assetExpenseRepository.js";
import { getAssetById } from "#repositories/assetRepository.js";
import { recomputeAssetPnlFromMonth } from "#services/profit/assetPnlService.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logAudit } from "#utils/auditLogger.js";

const roundCurrency = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const normalizeExpenseDateTime = (rawValue) => {
  const date = rawValue ? new Date(rawValue) : new Date();
  if (Number.isNaN(date.getTime())) {
    throwError("Invalid expenseDateTime value", 400);
  }
  return date;
};

const toMonthKey = (date) => date.toISOString().slice(0, 7);

const computeLineItems = (lineItems = []) => {
  const rows = lineItems.map((line) => {
    const quantity = Number(line.quantity) || 0;
    const unitCost = Number(line.unitCost) || 0;

    if (quantity <= 0) throwError("Line item quantity must be greater than zero", 400);
    if (unitCost < 0) throwError("Line item unitCost cannot be negative", 400);

    const lineTotal = roundCurrency(quantity * unitCost);

    return {
      itemName: line.itemName.trim(),
      description: line.description?.trim() || undefined,
      quantity,
      unitCost,
      lineTotal,
    };
  });

  if (!rows.length) throwError("At least one expense line item is required", 400);

  const totalAmount = roundCurrency(rows.reduce((sum, row) => sum + row.lineTotal, 0));
  if (totalAmount <= 0) throwError("Expense total must be greater than zero", 400);

  return { lineItems: rows, totalAmount };
};

const buildAuditAction = (entryType) => {
  if (entryType === "adjustment") return "assetExpense.adjustment";
  if (entryType === "reversal") return "assetExpense.reversal";
  return "assetExpense.create";
};

const createExpenseEntry = async (payload, actor, entryType = "expense") => {
  const asset = await getAssetById(payload.assetId);
  if (!asset) throwError("Asset not found", 404);

  const expenseDateTime = normalizeExpenseDateTime(payload.expenseDateTime);
  const monthKey = toMonthKey(expenseDateTime);
  const { lineItems, totalAmount } = computeLineItems(payload.lineItems);

  if (entryType !== "expense" && payload.referenceExpenseId) {
    const reference = await findAssetExpenseById(payload.referenceExpenseId);
    if (!reference) throwError("Reference expense not found", 404);
    if (reference.assetId.toString() !== asset._id.toString()) {
      throwError("Reference expense must belong to the same asset", 400);
    }
  }

  const expense = await createAssetExpense({
    assetId: asset._id,
    monthKey,
    expenseDateTime,
    vendorName: payload.vendorName?.trim() || "Manual Entry",
    description: payload.description?.trim() || undefined,
    lineItems,
    totalAmount,
    currency: payload.currency || "USD",
    entryType,
    referenceExpenseId: payload.referenceExpenseId || undefined,
    createdBy: actor.id || actor._id,
    metadata: payload.metadata || {},
  });

  await logAudit({
    actorId: actor.id || actor._id,
    actorRole: actor.roleName,
    action: buildAuditAction(entryType),
    entity: "AssetExpense",
    entityId: expense._id,
    after: expense.toObject(),
  });

  await recomputeAssetPnlFromMonth(asset._id, monthKey);

  return expense;
};

export const recordAssetExpense = async (payload, actor) => {
  return createExpenseEntry(payload, actor, "expense");
};

export const recordAssetExpenseCorrection = async (payload, actor) => {
  return createExpenseEntry(payload, actor, payload.type);
};

export const listAssetExpenseEntries = async (filters) => {
  return listAssetExpenses(filters);
};
