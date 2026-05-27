import { catchAsync } from "#utils/catchAsync.js";
import { parsePaginationParams } from "#utils/paginationUtil.js";
import * as supportService from "#services/support/supportTicketService.js";

/* ─────────────────────────────────────────────────────────────
 *  Tenant — /api/v1/support/*
 * ───────────────────────────────────────────────────────────── */

/* GET /support/tickets */
export const listMyTickets = catchAsync(async (req, res) => {
  const params = parsePaginationParams(req, {
    defaultSortBy: "lastReplyAt",
    defaultSortOrder: "desc",
    allowedSortFields: ["lastReplyAt", "createdAt", "priority", "status"],
  });
  const filters = {};
  if (req.query.status) filters.status = req.query.status;
  if (req.query.priority) filters.priority = req.query.priority;

  const { items, meta } = await supportService.listMyTickets(
    req.tenant.workspaceId,
    params,
    filters
  );
  res.success({
    data: items,
    pagination: meta,
    message: "Tickets",
  });
});

/* GET /support/tickets/stats */
export const myStats = catchAsync(async (req, res) => {
  const stats = await supportService.getMyTicketStats(
    req.tenant.workspaceId
  );
  res.success({ data: stats, message: "Ticket stats" });
});

/* GET /support/tickets/:id */
export const getMyTicket = catchAsync(async (req, res) => {
  const ticket = await supportService.getMyTicket({
    workspaceId: req.tenant.workspaceId,
    ticketId: req.params.id,
    actor: req.user,
  });
  res.success({ data: ticket, message: "Ticket" });
});

/* POST /support/tickets */
export const createTicket = catchAsync(async (req, res) => {
  const ticket = await supportService.createTicket({
    workspaceId: req.tenant.workspaceId,
    actor: req.user,
    subject: req.body.subject,
    body: req.body.body,
    priority: req.body.priority || "medium",
    req,
  });
  res.success({
    statusCode: 201,
    data: ticket,
    message: "Ticket submitted — we'll respond within 24 hours.",
  });
});

/* POST /support/tickets/:id/reply */
export const replyToMyTicket = catchAsync(async (req, res) => {
  const ticket = await supportService.replyToMyTicket({
    workspaceId: req.tenant.workspaceId,
    ticketId: req.params.id,
    actor: req.user,
    body: req.body.body,
    req,
  });
  res.success({ data: ticket, message: "Reply posted" });
});

/* PATCH /support/tickets/:id/status */
export const tenantChangeStatus = catchAsync(async (req, res) => {
  const ticket = await supportService.tenantChangeStatus({
    workspaceId: req.tenant.workspaceId,
    ticketId: req.params.id,
    actor: req.user,
    newStatus: req.body.status,
    req,
  });
  res.success({
    data: ticket,
    message: `Ticket marked as ${ticket.status}`,
  });
});

/* ─────────────────────────────────────────────────────────────
 *  Admin — /api/v1/admin/support/*
 * ───────────────────────────────────────────────────────────── */

/* GET /admin/support/tickets */
export const listAllTickets = catchAsync(async (req, res) => {
  const params = parsePaginationParams(req, {
    defaultSortBy: "lastReplyAt",
    defaultSortOrder: "desc",
    allowedSortFields: ["lastReplyAt", "createdAt", "priority", "status"],
  });
  const filters = {};
  if (req.query.status) filters.status = req.query.status;
  if (req.query.priority) filters.priority = req.query.priority;
  if (req.query.workspaceId) filters.workspaceId = req.query.workspaceId;
  if (req.query.assignedTo) filters.assignedTo = req.query.assignedTo;

  const { items, meta } = await supportService.listAllTickets(params, filters);
  res.success({
    data: items,
    pagination: meta,
    message: "Tickets",
  });
});

/* GET /admin/support/stats */
export const adminStats = catchAsync(async (_req, res) => {
  const stats = await supportService.adminStats();
  res.success({ data: stats, message: "Stats" });
});

/* GET /admin/support/tickets/:id */
export const getAdminTicket = catchAsync(async (req, res) => {
  const ticket = await supportService.getAdminTicket(req.params.id);
  res.success({ data: ticket, message: "Ticket" });
});

/* POST /admin/support/tickets/:id/reply */
export const replyAsStaff = catchAsync(async (req, res) => {
  const ticket = await supportService.replyAsStaff({
    ticketId: req.params.id,
    actor: req.user,
    body: req.body.body,
    req,
  });
  res.success({ data: ticket, message: "Reply sent" });
});

/* PATCH /admin/support/tickets/:id/status */
export const adminChangeStatus = catchAsync(async (req, res) => {
  const ticket = await supportService.adminChangeStatus({
    ticketId: req.params.id,
    actor: req.user,
    newStatus: req.body.status,
    req,
  });
  res.success({
    data: ticket,
    message: `Ticket marked as ${ticket.status}`,
  });
});

/* PATCH /admin/support/tickets/:id/priority */
export const adminChangePriority = catchAsync(async (req, res) => {
  const ticket = await supportService.adminChangePriority({
    ticketId: req.params.id,
    actor: req.user,
    newPriority: req.body.priority,
    req,
  });
  res.success({
    data: ticket,
    message: `Priority set to ${ticket.priority}`,
  });
});

/* PATCH /admin/support/tickets/:id/assign */
export const adminAssignTo = catchAsync(async (req, res) => {
  const ticket = await supportService.adminAssignTo({
    ticketId: req.params.id,
    actor: req.user,
    assigneeId: req.body.assigneeId || null,
    req,
  });
  res.success({
    data: ticket,
    message: ticket.assignedTo
      ? `Assigned to ${ticket.assignedTo.name || "staff"}`
      : "Unassigned",
  });
});
