import { logger } from "#utils/logger.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logAudit } from "#utils/auditLogger.js";
import * as repo from "#repositories/supportTicketRepository.js";
import * as notificationService from "#services/notification/notificationService.js";
import {
  TICKET_STATUSES,
  TICKET_PRIORITIES,
} from "#models/supportTicketModel.js";
import { findUserById } from "#repositories/userRepository.js";

/**
 * ============================================================
 *  SupportTicket Service
 * ============================================================
 *
 *  Tenant flow:
 *    - createTicket
 *    - listMyTickets
 *    - getMyTicket
 *    - replyToMyTicket           (customer reply: status auto → "open")
 *    - markMyTicketResolved
 *    - reopenMyTicket
 *
 *  Admin flow:
 *    - listAllTickets
 *    - getAdminTicket
 *    - replyAsStaff              (staff reply: status auto → "pending")
 *    - changeStatus
 *    - changePriority
 *    - assignTo
 *
 *  Notifications:
 *    - Customer creates → notify all admins-with-permission (best effort)
 *    - Staff replies     → notify ticket creator
 *    - Customer replies  → notify the assignee (or all admins if unassigned)
 *    - Status changes    → notify the customer
 */

const ALLOWED_TENANT_STATUS_TRANSITIONS = {
  open: ["resolved", "closed"],          // customer can mark resolved or close
  pending: ["resolved", "closed", "open"], // and reopen if needed
  resolved: ["open"],                     // reopen
  closed: [],                             // terminal
};

const ALLOWED_ADMIN_STATUS_TRANSITIONS = {
  open: ["pending", "resolved", "closed"],
  pending: ["open", "resolved", "closed"],
  resolved: ["open", "closed"],
  closed: ["open"],
};

/* ── Shapes ── */

const toThreadShape = (ticket, { includeBody = true } = {}) => {
  if (!ticket) return null;
  const o = ticket.toObject ? ticket.toObject() : ticket;
  return {
    _id: o._id,
    workspaceId: o.workspaceId?._id || o.workspaceId,
    workspace: o.workspaceId?.name
      ? {
          _id: o.workspaceId._id,
          name: o.workspaceId.name,
          slug: o.workspaceId.slug,
        }
      : null,
    subject: o.subject,
    body: includeBody ? o.body : undefined,
    priority: o.priority,
    status: o.status,
    createdBy: o.createdBy?._id
      ? {
          _id: o.createdBy._id,
          name: o.createdBy.name,
          email: o.createdBy.email,
        }
      : { _id: o.createdBy },
    assignedTo: o.assignedTo?._id
      ? {
          _id: o.assignedTo._id,
          name: o.assignedTo.name,
          email: o.assignedTo.email,
        }
      : null,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    repliesCount: o.repliesCount || 0,
    replies: (o.replies || []).map((r) => ({
      _id: r._id,
      body: r.body || "",
      authorKind: r.authorKind,
      authorId: r.authorId,
      authorName: r.authorName,
      authorEmail: r.authorEmail,
      statusChange: r.statusChange?.from
        ? { from: r.statusChange.from, to: r.statusChange.to }
        : null,
      createdAt: r.createdAt,
    })),
    lastReplyAt: o.lastReplyAt,
    lastReplyBy: o.lastReplyBy,
    closedAt: o.closedAt,
    resolvedAt: o.resolvedAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
};

const toListShape = (ticket) => {
  const t = toThreadShape(ticket, { includeBody: false });
  if (!t) return null;
  // Drop reply array on list views to keep the payload light
  const { replies: _replies, ...rest } = t;
  return rest;
};

/* ── Helpers ── */

const validateStatus = (status) => {
  if (!TICKET_STATUSES.includes(status)) {
    throwError(`Invalid status '${status}'`, 400);
  }
};
const validatePriority = (priority) => {
  if (!TICKET_PRIORITIES.includes(priority)) {
    throwError(`Invalid priority '${priority}'`, 400);
  }
};

const ensureCustomerOwnsTicket = (ticket, userId) => {
  const ownerId = ticket.createdBy?._id || ticket.createdBy;
  if (String(ownerId) !== String(userId)) {
    throwError("This ticket does not belong to you", 403);
  }
};

const notifyAdminsOfNewTicket = async (ticket) => {
  // Best effort — find all super-admin users (workspaceId is null + perms include "*")
  const { User } = await import("#models/userModel.js");
  const { Role } = await import("#models/roleModel.js");
  const adminRoles = await Role.find({
    permissions: { $in: ["*", "platform.support:manage"] },
  })
    .select("_id")
    .lean();
  if (!adminRoles.length) return;
  const admins = await User.find({
    roleId: { $in: adminRoles.map((r) => r._id) },
    isActive: true,
  })
    .select("_id")
    .lean();
  for (const a of admins) {
    notificationService
      .notifyUser({
        recipientUserId: a._id,
        type: ticket.priority === "high" ? "warning" : "info",
        category: "support",
        title: `New ${ticket.priority} priority ticket`,
        body: ticket.subject,
        link: `/admin/support`,
        metadata: {
          ticketId: String(ticket._id),
          workspaceId: ticket.workspaceId?._id
            ? String(ticket.workspaceId._id)
            : String(ticket.workspaceId),
          priority: ticket.priority,
        },
      })
      .catch((err) =>
        logger.warn("[support] admin notify failed", { message: err.message })
      );
  }
};

const notifyAssigneeOrAdmins = async (ticket, payload) => {
  const assigneeId = ticket.assignedTo?._id || ticket.assignedTo;
  if (assigneeId) {
    notificationService.notifyUser({
      recipientUserId: assigneeId,
      ...payload,
    }).catch(() => {});
    return;
  }
  notifyAdminsOfNewTicket({
    ...ticket,
    subject: payload.body || ticket.subject,
  }).catch(() => {});
};

/* ──────────────────────────────────────────────────────────
 *  Tenant flows
 * ────────────────────────────────────────────────────────── */

export const createTicket = async ({
  workspaceId,
  actor,
  subject,
  body,
  priority = "medium",
  req,
}) => {
  if (!subject?.trim()) throwError("Subject is required", 400);
  if (!body?.trim()) throwError("Body is required", 400);
  validatePriority(priority);

  const created = await repo.createTicket({
    workspaceId,
    createdBy: actor.id,
    subject: subject.trim(),
    body: body.trim(),
    priority,
    status: "open",
    customerEmail: actor.email || null,
    customerName: actor.name || null,
    lastReplyAt: new Date(),
    lastReplyBy: "customer",
    replies: [],
    repliesCount: 0,
  });

  // Re-fetch with populated refs so the response & notifications carry display fields
  const ticket = await repo.findOwnTicket(workspaceId, created._id);

  notifyAdminsOfNewTicket(ticket);

  await logAudit({
    actor,
    category: "support",
    action: "support.ticket.created",
    entityType: "support_ticket",
    entityId: ticket._id,
    workspaceId,
    after: { subject: ticket.subject, priority: ticket.priority },
    req,
  });

  return toThreadShape(ticket);
};

export const listMyTickets = async (workspaceId, params, filters) => {
  const { items, meta } = await repo.paginateWorkspaceTickets(
    workspaceId,
    params,
    filters
  );
  return { items: items.map(toListShape), meta };
};

export const getMyTicketStats = (workspaceId) =>
  repo.countByStatus(workspaceId);

export const getMyTicket = async ({ workspaceId, ticketId, actor }) => {
  const ticket = await repo.findOwnTicket(workspaceId, ticketId);
  if (!ticket) throwError("Ticket not found", 404);
  ensureCustomerOwnsTicket(ticket, actor.id);
  return toThreadShape(ticket);
};

export const replyToMyTicket = async ({
  workspaceId,
  ticketId,
  actor,
  body,
  req,
}) => {
  if (!body?.trim()) throwError("Reply body is required", 400);
  const ticket = await repo.findOwnTicket(workspaceId, ticketId);
  if (!ticket) throwError("Ticket not found", 404);
  ensureCustomerOwnsTicket(ticket, actor.id);
  if (ticket.status === "closed") {
    throwError("This ticket is closed. Open a new one to continue.", 409);
  }

  // Customer reply re-opens the ticket if it was pending/resolved
  const newStatus = ticket.status === "pending" || ticket.status === "resolved"
    ? "open"
    : null;

  const updated = await repo.appendReply({
    ticketId,
    reply: {
      body: body.trim(),
      authorKind: "customer",
      authorId: actor.id,
      authorName: actor.name || null,
      authorEmail: actor.email || null,
      createdAt: new Date(),
    },
    newStatus,
  });

  notifyAssigneeOrAdmins(updated, {
    type: "info",
    category: "support",
    title: `Customer replied: ${updated.subject}`,
    body: body.slice(0, 200),
    link: `/admin/support`,
    metadata: { ticketId: String(updated._id) },
  });

  await logAudit({
    actor,
    category: "support",
    action: "support.ticket.replied",
    entityType: "support_ticket",
    entityId: updated._id,
    workspaceId,
    after: { authorKind: "customer", newStatus: updated.status },
    req,
  });

  return toThreadShape(updated);
};

export const tenantChangeStatus = async ({
  workspaceId,
  ticketId,
  actor,
  newStatus,
  req,
}) => {
  validateStatus(newStatus);
  const ticket = await repo.findOwnTicket(workspaceId, ticketId);
  if (!ticket) throwError("Ticket not found", 404);
  ensureCustomerOwnsTicket(ticket, actor.id);

  const allowed = ALLOWED_TENANT_STATUS_TRANSITIONS[ticket.status] || [];
  if (!allowed.includes(newStatus)) {
    throwError(
      `Cannot transition '${ticket.status}' → '${newStatus}'`,
      409
    );
  }

  const updated = await applyStatusChange({
    ticket,
    newStatus,
    actor,
    actorKind: "customer",
  });

  await logAudit({
    actor,
    category: "support",
    action: `support.ticket.${newStatus}`,
    entityType: "support_ticket",
    entityId: ticket._id,
    workspaceId,
    before: { status: ticket.status },
    after: { status: newStatus },
    req,
  });

  return toThreadShape(updated);
};

/* ──────────────────────────────────────────────────────────
 *  Admin flows
 * ────────────────────────────────────────────────────────── */

export const listAllTickets = async (params, filters) => {
  const { items, meta } = await repo.paginateAllTickets(params, filters);
  return { items: items.map(toListShape), meta };
};

export const adminStats = () => repo.countByStatus();

export const getAdminTicket = async (ticketId) => {
  const ticket = await repo.findAdminTicket(ticketId);
  if (!ticket) throwError("Ticket not found", 404);
  return toThreadShape(ticket);
};

export const replyAsStaff = async ({
  ticketId,
  actor,
  body,
  req,
}) => {
  if (!body?.trim()) throwError("Reply body is required", 400);
  const ticket = await repo.findAdminTicket(ticketId);
  if (!ticket) throwError("Ticket not found", 404);
  if (ticket.status === "closed") {
    throwError("This ticket is closed.", 409);
  }

  const updated = await repo.appendReply({
    ticketId,
    reply: {
      body: body.trim(),
      authorKind: "staff",
      authorId: actor.id,
      authorName: actor.name || null,
      authorEmail: actor.email || null,
      createdAt: new Date(),
    },
    newStatus: "pending", // staff replied → awaiting customer
  });

  // Notify the customer
  const recipientId = updated.createdBy?._id || updated.createdBy;
  if (recipientId) {
    notificationService.notifyUser({
      recipientUserId: recipientId,
      workspaceId: updated.workspaceId?._id || updated.workspaceId,
      type: "info",
      category: "support",
      title: `Support replied: ${updated.subject}`,
      body: body.slice(0, 200),
      link: `/dashboard/support`,
      metadata: { ticketId: String(updated._id) },
    }).catch(() => {});
  }

  await logAudit({
    actor,
    category: "support",
    action: "support.ticket.replied",
    entityType: "support_ticket",
    entityId: updated._id,
    workspaceId: updated.workspaceId?._id || updated.workspaceId,
    after: { authorKind: "staff", newStatus: updated.status },
    req,
  });

  return toThreadShape(updated);
};

const applyStatusChange = async ({ ticket, newStatus, actor, actorKind }) => {
  // We push a system reply documenting the change so the thread shows it,
  // then update the status. Both happen atomically inside `appendReply`.
  return repo.appendReply({
    ticketId: ticket._id,
    reply: {
      body: "",
      authorKind: "system",
      authorId: actor.id,
      authorName: actor.name || actorKind,
      statusChange: { from: ticket.status, to: newStatus },
      createdAt: new Date(),
    },
    newStatus,
  });
};

export const adminChangeStatus = async ({
  ticketId,
  actor,
  newStatus,
  req,
}) => {
  validateStatus(newStatus);
  const ticket = await repo.findAdminTicket(ticketId);
  if (!ticket) throwError("Ticket not found", 404);

  const allowed = ALLOWED_ADMIN_STATUS_TRANSITIONS[ticket.status] || [];
  if (!allowed.includes(newStatus)) {
    throwError(
      `Cannot transition '${ticket.status}' → '${newStatus}'`,
      409
    );
  }

  const updated = await applyStatusChange({
    ticket,
    newStatus,
    actor,
    actorKind: "staff",
  });

  // Notify customer
  const recipientId = updated.createdBy?._id || updated.createdBy;
  if (recipientId) {
    notificationService.notifyUser({
      recipientUserId: recipientId,
      workspaceId: updated.workspaceId?._id || updated.workspaceId,
      type: newStatus === "closed" ? "warning" : "info",
      category: "support",
      title: `Ticket ${newStatus}: ${updated.subject}`,
      body: `Status changed to ${newStatus}.`,
      link: `/dashboard/support`,
      metadata: { ticketId: String(updated._id), newStatus },
    }).catch(() => {});
  }

  await logAudit({
    actor,
    category: "support",
    action: `support.ticket.${newStatus}`,
    entityType: "support_ticket",
    entityId: updated._id,
    workspaceId: updated.workspaceId?._id || updated.workspaceId,
    before: { status: ticket.status },
    after: { status: newStatus },
    req,
  });

  return toThreadShape(updated);
};

export const adminChangePriority = async ({
  ticketId,
  actor,
  newPriority,
  req,
}) => {
  validatePriority(newPriority);
  const ticket = await repo.findAdminTicket(ticketId);
  if (!ticket) throwError("Ticket not found", 404);
  if (ticket.priority === newPriority) {
    return toThreadShape(ticket);
  }

  const updated = await repo.updateAdminFields(ticketId, {
    priority: newPriority,
  });

  await logAudit({
    actor,
    category: "support",
    action: "support.ticket.priority_changed",
    entityType: "support_ticket",
    entityId: ticket._id,
    workspaceId: updated.workspaceId?._id || updated.workspaceId,
    before: { priority: ticket.priority },
    after: { priority: newPriority },
    req,
  });

  return toThreadShape(updated);
};

export const adminAssignTo = async ({
  ticketId,
  actor,
  assigneeId,
  req,
}) => {
  const ticket = await repo.findAdminTicket(ticketId);
  if (!ticket) throwError("Ticket not found", 404);

  if (assigneeId) {
    const assignee = await findUserById(assigneeId);
    if (!assignee) throwError("Assignee user not found", 404);
  }

  const updated = await repo.updateAdminFields(ticketId, {
    assignedTo: assigneeId || null,
  });

  if (assigneeId) {
    notificationService.notifyUser({
      recipientUserId: assigneeId,
      type: "info",
      category: "support",
      title: `Ticket assigned to you: ${updated.subject}`,
      body: `Priority: ${updated.priority}`,
      link: `/admin/support`,
      metadata: { ticketId: String(updated._id) },
    }).catch(() => {});
  }

  await logAudit({
    actor,
    category: "support",
    action: assigneeId
      ? "support.ticket.assigned"
      : "support.ticket.unassigned",
    entityType: "support_ticket",
    entityId: ticket._id,
    workspaceId: updated.workspaceId?._id || updated.workspaceId,
    before: { assignedTo: ticket.assignedTo?._id || ticket.assignedTo || null },
    after: { assignedTo: assigneeId || null },
    req,
  });

  return toThreadShape(updated);
};
