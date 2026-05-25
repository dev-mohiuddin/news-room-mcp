import { API, handleRequest } from "@/lib/http";

const BASE = "/api/v1/team";
const PUBLIC_BASE = "/api/v1/auth/invitations";

export const getTeamApi = () =>
  handleRequest(() => API.get(BASE));

export const inviteMemberApi = (payload) =>
  handleRequest(() => API.post(`${BASE}/invitations`, payload));

export const resendInviteApi = (id) =>
  handleRequest(() => API.post(`${BASE}/invitations/${id}/resend`));

export const cancelInviteApi = (id) =>
  handleRequest(() => API.delete(`${BASE}/invitations/${id}`));

export const changeMemberRoleApi = (id, roleName) =>
  handleRequest(() => API.patch(`${BASE}/members/${id}/role`, { roleName }));

export const removeMemberApi = (id) =>
  handleRequest(() => API.delete(`${BASE}/members/${id}`));

/* Public — accept invite */
export const inspectInviteApi = (token) =>
  handleRequest(() => API.get(`${PUBLIC_BASE}/${token}`));

export const acceptInviteApi = (token, payload) =>
  handleRequest(() => API.post(`${PUBLIC_BASE}/${token}/accept`, payload));
