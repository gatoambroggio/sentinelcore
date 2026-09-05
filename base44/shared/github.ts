import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const GITHUB_API = "https://api.github.com";

/**
 * Gets the GitHub OAuth token from the shared connector, validating app user auth first.
 * Returns { token, user }.
 */
export async function getGithubContext(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { accessToken } = await base44.asServiceRole.connectors.getConnection("github");
  return { token: accessToken, user };
}

/** Calls the GitHub REST API with proper auth headers. */
export async function githubFetch(path, token, options = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "SentinelCore-Sync",
      ...(options.headers || {}),
    },
  });
  return res;
}

/** Safely parses a JSON response, falling back to text. */
export async function parseGithubResponse(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text || `HTTP ${res.status}` };
  }
}

/** Decodes a base64 string as UTF-8 text. */
export function decodeBase64Utf8(b64) {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

/** Encodes a UTF-8 string to base64. */
export function encodeBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** Validates owner/repo/path inputs. Returns an error string or null. */
export function validateRepoInputs({ owner, repo, path }) {
  if (!owner || !repo) return "owner y repo son obligatorios";
  if (path !== undefined && (typeof path !== "string")) return "path inválido";
  return null;
}