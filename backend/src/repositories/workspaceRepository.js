import { Workspace } from "#models/workspaceModel.js";

const slugify = (text = "") =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .slice(0, 40) || `ws-${Date.now()}`;

export const findWorkspaceById = (id) => Workspace.findById(id).exec();
export const findWorkspaceBySlug = (slug) => Workspace.findOne({ slug }).exec();
export const findWorkspaceByOwnerId = (ownerId) => Workspace.findOne({ ownerId }).exec();

export const createWorkspace = async ({ name, ownerId, plan = "free" }) => {
  // Ensure unique slug
  const base = slugify(name);
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Workspace.findOne({ slug })) {
    slug = `${base}-${suffix++}`;
  }
  return Workspace.create({ name, slug, ownerId, plan });
};

export const updateWorkspaceById = (id, data) =>
  Workspace.findByIdAndUpdate(id, data, { new: true }).exec();

export const countMembers = async (workspaceId) => {
  const { User } = await import("#models/userModel.js");
  return User.countDocuments({ workspaceId });
};
