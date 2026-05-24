import { API, handleRequest } from "@/lib/http";

export const getTeamMembers = (query = "") =>
  handleRequest(() => API.get(`/api/team${query}`));

export const inviteMember = (data) =>
  handleRequest(() => API.post(`/api/team/invite`, data));

export const updateMemberRole = (id, data) =>
  handleRequest(() => API.put(`/api/team/${id}/role`, data));

export const removeMember = (id) =>
  handleRequest(() => API.delete(`/api/team/${id}`));
