import { User } from "#models/userModel.js";
import { Subscription } from "#models/subscriptionModel.js";
import { Workspace } from "#models/workspaceModel.js";
import { Article } from "#models/articleModel.js";

/**
 * ============================================================
 *  Platform Analytics Repository
 * ============================================================
 *
 *  Cross-tenant counts and time-series for the super-admin dashboard.
 *  All queries are read-only and indexed-friendly.
 */

export const totalUsers = () => User.countDocuments({}).exec();
export const activeUsers = () =>
  User.countDocuments({ isActive: true }).exec();

export const totalWorkspaces = () =>
  Workspace.countDocuments({ isActive: true }).exec();

export const totalActiveSubscriptions = () =>
  Subscription.countDocuments({ status: { $in: ["active", "trialing"] } }).exec();

export const dailyNewSignups = async (days = 30) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  cutoff.setHours(0, 0, 0, 0);
  const rows = await User.aggregate([
    { $match: { createdAt: { $gte: cutoff } } },
    {
      $group: {
        _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } },
        users: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]).exec();
  return rows.map((r) => ({ day: r._id, users: r.users }));
};

/**
 * MAU: distinct users with `lastLoginAt` within the last 30 days.
 * DAU: distinct users with `lastLoginAt` today (UTC).
 *
 * Falls back to `createdAt` for users that never updated `lastLoginAt`.
 */
export const monthlyActiveUsers = async () => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return User.countDocuments({
    isActive: true,
    $or: [{ lastLoginAt: { $gte: cutoff } }, { createdAt: { $gte: cutoff } }],
  }).exec();
};

export const dailyActiveUsers = async () => {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  return User.countDocuments({
    isActive: true,
    lastLoginAt: { $gte: startOfDay },
  }).exec();
};

/**
 * Plan distribution — counts active subscriptions by plan code, joined with
 * the live Plan document so the chart shows the right `displayName`.
 */
export const planDistribution = async () => {
  const rows = await Subscription.aggregate([
    { $match: { status: { $in: ["active", "trialing", "past_due"] } } },
    { $group: { _id: "$plan", count: { $sum: 1 } } },
    {
      $lookup: {
        from: "plans",
        localField: "_id",
        foreignField: "code",
        as: "plan",
      },
    },
    { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        code: "$_id",
        displayName: {
          $ifNull: [
            "$plan.displayName",
            { $toUpper: "$_id" },
          ],
        },
        count: 1,
        sortOrder: { $ifNull: ["$plan.sortOrder", 99] },
        monthlyPriceCents: { $ifNull: ["$plan.monthlyPriceCents", 0] },
      },
    },
    { $sort: { sortOrder: 1 } },
  ]).exec();
  return rows;
};

/**
 * Recent platform-wide signups (admin "Recent signups" widget).
 */
export const recentSignups = (limit = 10) =>
  User.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("name email createdAt isActive workspaceId roleId")
    .populate("roleId", "name displayName scope")
    .lean()
    .exec();

/**
 * Combine `recentSignups` with subscription plan + article count for cards
 * that show "Sarah · Pro · 142 articles".
 */
export const recentSignupsEnriched = async (limit = 8) => {
  const users = await recentSignups(limit);
  const wsIds = users.map((u) => u.workspaceId).filter(Boolean);
  if (!wsIds.length) {
    return users.map((u) => ({ ...u, plan: null, articles: 0 }));
  }
  const [subs, articleCounts] = await Promise.all([
    Subscription.find({ workspaceId: { $in: wsIds } })
      .select("workspaceId plan")
      .lean(),
    Article.aggregate([
      { $match: { workspaceId: { $in: wsIds }, deletedAt: null } },
      { $group: { _id: "$workspaceId", count: { $sum: 1 } } },
    ]),
  ]);
  const planByWs = new Map(
    subs.map((s) => [String(s.workspaceId), s.plan])
  );
  const articlesByWs = new Map(
    articleCounts.map((a) => [String(a._id), a.count])
  );
  return users.map((u) => ({
    ...u,
    plan: u.workspaceId ? planByWs.get(String(u.workspaceId)) || null : null,
    articles: u.workspaceId
      ? articlesByWs.get(String(u.workspaceId)) || 0
      : 0,
  }));
};
