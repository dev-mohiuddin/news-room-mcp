import { API, handleRequest } from "@/lib/http";

const BASE = "/api/v1/research";

/**
 * Search a topic across the configured providers (Brave → Exa fallback).
 * body: { topic, targetKeyword?, depth? }
 */
export const searchTopic = (data) =>
  handleRequest(() => API.post(`${BASE}/search`, data));

/**
 * Summarize the user-selected sources into a research brief.
 * body: { topic, targetKeyword?, urls: string[] }
 */
export const summarizeSources = (data) =>
  handleRequest(() => API.post(`${BASE}/summarize`, data));

/* Alias — the redux slice imports both names. */
export const generateBrief = (data) =>
  handleRequest(() => API.post(`${BASE}/brief`, data));
