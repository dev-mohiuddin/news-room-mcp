import { SupportTicket } from "#models/supportTicketModel.js";
import { paginateModel } from "#utils/paginationUtil.js";
import { MissingTenantScopeError } from "#utils/pipelineErrors.js";

/**
 * ============================================================
 *  SupportTicket Repository
 * ============================================================
 *
 *  Tenant queries always pass `workspaceId`. Admin queries omit it.
 *  Reply pushes use `$push` + `$set` in one atomic operation so the
 *  ticket's `lastReplyAt`, `lastReplyBy`, and `repliesCount` stay
 *  consistent with the embedded array.
 */

const requireScope = (workspaceId, method) => {
  if (!workspaceId) throw new MissingTenantScopeError(method);
};

/* ── Reads ── */

export const findOwnTicket = (workspaceId, id) => {
  requireScope(workspaceId, "findOwnTicket");
  return SupportTicket.findOne({ _id: id, workspaceId })
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email")
    .exec();
};

export const findAdminTicket = (id) =>
  SupportTicket.findById(id)
    .populate("workspaceId", "name slug")
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email")
    .exec();

export const paginateWorkspaceTickets = (workspaceId, params, filters = {}) => {
  requireScope(workspaceId, "paginateWorkspaceTickets");
  const baseQuery = { workspaceId };
  if (filters.status) baseQuery.status = filters.status;
  if (filters.priority) baseQuery.priority = filters.priority;
  return paginateModel(SupportTicket, baseQuery, params, {
    searchFields: ["subject", "body"],
    populate: [{ path: "createdBy", select: "name email" }],
  });
};

export const paginateAllTickets = (params, filters = {}) => {
  const baseQuery = {};
  if (filters.status) baseQuery.status = filters.status;
  if (filters.priority) baseQuery.priority = filters.priority;
  if (filters.workspaceId) baseQuery.workspaceId = filters.workspaceId;
  if (filters.assignedTo) baseQuery.assignedTo = filters.assignedTo;
  return paginateModel(SupportTicket, baseQuery, params, {
    searchFields: ["subject", "body", "customerEmail", "customerName"],
    populate: [
      { path: "workspaceId", select: "name slug" },
      { path: "createdBy", select: "name email" },
      { path: "assignedTo", select: "name email" },
    ],
  });
};

export const countByStatus = async (workspaceId = null) => {
  const match = workspaceId ? { workspaceId } : {};
  const rows = await SupportTicket.aggregate([
    { $match: match },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]).exec();
  const out = { open: 0, pending: 0, resolved: 0, closed: 0, total: 0 };
  for (const r of rows) {
    if (out[r._id] !== undefined) out[r._id] = r.count;
    out.total += r.count;
  }
  return out;
};

/* ── Writes ── */

export const createTicket = (data) => SupportTicket.create(data);

const STATE_FIELDS_FOR_TIMESTAMPS = (newStatus) => {
  const out = {};
  if (newStatus === "closed") out.closedAt = new Date();
  if (newStatus === "resolved") out.resolvedAt = new Date();
  if (newStatus === "open" || newStatus === "pending") {
    out.closedAt = null;
    out.resolvedAt = null;
  }
  return out;
};

/**
 * Append a reply atomically.
 *  - Pushes the reply into the array
 *  - Bumps `lastReplyAt` + `lastReplyBy` + `repliesCount`
 *  - Optionally transitions status (e.g. customer reply → open)
 */
export const appendReply = async ({
  ticketId,
  reply,
  newStatus = null,
}) => {
  const set = {
    lastReplyAt: reply.createdAt || new Date(),
    lastReplyBy: reply.authorKind,
  };
  if (newStatus) {
    set.status = newStatus;
    Object.assign(set, STATE_FIELDS_FOR_TIMESTAMPS(newStatus));
  }
  return SupportTicket.findByIdAndUpdate(
    ticketId,
    {
      $push: { replies: reply },
      $inc: { repliesCount: 1 },
      $set: set,
    },
    { new: true }
  )
    .populate("workspaceId", "name slug")
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email")
    .exec();
};

export const updateStatus = (ticketId, newStatus) =>
  SupportTicket.findByIdAndUpdate(
    ticketId,
    {
      $set: {
        status: newStatus,
        ...STATE_FIELDS_FOR_TIMESTAMPS(newStatus),
      },
    },
    { new: true }
  )
    .populate("workspaceId", "name slug")
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email")
    .exec();

export const updateAdminFields = (ticketId, set) =>
  SupportTicket.findByIdAndUpdate(
    ticketId,
    { $set: set },
    { new: true }
  )
    .populate("workspaceId", "name slug")
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email")
    .exec();
