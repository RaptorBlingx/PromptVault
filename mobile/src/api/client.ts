// ============================================
// PromptVault Mobile - API Client
// Adapted from web apiService.ts
// ============================================

import { Prompt, Folder } from '../shared/types';

const DEFAULT_SERVER_URL = 'http://localhost:2529';
let serverUrl = DEFAULT_SERVER_URL;

export function normalizeServerUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return DEFAULT_SERVER_URL;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;

  let normalized = withProtocol.replace(/\/+$/, '');

  if (normalized.endsWith('/api')) {
    normalized = normalized.slice(0, -4);
  }

  return normalized;
}

export function setServerUrl(url: string) {
  serverUrl = normalizeServerUrl(url);
}

export function getServerUrl(): string {
  return serverUrl;
}

// ----- Error Handling -----

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.error || `HTTP ${response.status}`,
      response.status,
      errorData,
    );
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

// ----- Health Check -----

export async function checkHealth(): Promise<{
  status: string;
  promptCount: number;
  folderCount: number;
}> {
  const response = await fetchWithTimeout(`${serverUrl}/api/health`);
  return handleResponse(response);
}

// ----- Prompts -----

export async function fetchPrompts(): Promise<Prompt[]> {
  const response = await fetchWithTimeout(`${serverUrl}/api/prompts`);
  return handleResponse(response);
}

export async function fetchPromptById(id: string): Promise<Prompt> {
  const response = await fetchWithTimeout(`${serverUrl}/api/prompts/${encodeURIComponent(id)}`);
  return handleResponse(response);
}

export async function createPromptApi(prompt: Prompt): Promise<Prompt> {
  const response = await fetchWithTimeout(`${serverUrl}/api/prompts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prompt),
  });
  return handleResponse(response);
}

export async function updatePromptApi(
  id: string,
  updates: Partial<Prompt>,
): Promise<Prompt> {
  const response = await fetchWithTimeout(
    `${serverUrl}/api/prompts/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    },
  );
  return handleResponse(response);
}

export async function deletePromptApi(id: string): Promise<void> {
  const response = await fetchWithTimeout(
    `${serverUrl}/api/prompts/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
  return handleResponse(response);
}

// ----- Folders -----

export async function fetchFolders(): Promise<Folder[]> {
  const response = await fetchWithTimeout(`${serverUrl}/api/folders`);
  return handleResponse(response);
}

export async function createFolderApi(folder: Folder): Promise<Folder> {
  const response = await fetchWithTimeout(`${serverUrl}/api/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(folder),
  });
  return handleResponse(response);
}

export async function updateFolderApi(
  id: string,
  updates: Partial<Folder>,
): Promise<Folder> {
  const response = await fetchWithTimeout(
    `${serverUrl}/api/folders/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    },
  );
  return handleResponse(response);
}

export async function deleteFolderApi(id: string): Promise<void> {
  const response = await fetchWithTimeout(
    `${serverUrl}/api/folders/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
  return handleResponse(response);
}

// ----- Import/Export -----

export async function exportDataApi(): Promise<{
  version: number;
  exportedAt: number;
  prompts: Prompt[];
  folders: Folder[];
}> {
  const response = await fetchWithTimeout(`${serverUrl}/api/export`);
  return handleResponse(response);
}

export async function importDataApi(
  prompts: Prompt[],
  folders: Folder[],
): Promise<{ success: boolean; imported: { prompts: number; folders: number } }> {
  const response = await fetchWithTimeout(`${serverUrl}/api/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompts, folders }),
  });
  return handleResponse(response);
}

// ----- Delta Sync (requires backend enhancement) -----

export async function fetchChangesSince(since: number): Promise<{
  prompts: Prompt[];
  folders: Folder[];
  deletedPromptIds: string[];
  deletedFolderIds: string[];
  serverTime: number;
}> {
  const response = await fetchWithTimeout(
    `${serverUrl}/api/sync/changes?since=${since}`,
  );
  return handleResponse(response);
}
