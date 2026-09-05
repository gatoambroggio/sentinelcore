const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:5000';

/**
 * Request a face embedding from the AI engine.
 * @param {string} imageUrl - URL of the uploaded image accessible by the AI engine
 * @returns {Promise<{embedding: number[], bbox: number[]}>}
 */
export async function getFaceEmbedding(imageUrl) {
  const res = await fetch(`${AI_ENGINE_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI engine error: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * Check AI engine health.
 */
export async function checkAiHealth() {
  try {
    const res = await fetch(`${AI_ENGINE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Notify AI engine to reload known faces.
 */
export async function reloadFaces() {
  try {
    await fetch(`${AI_ENGINE_URL}/faces/reload`, { method: 'POST' });
  } catch {
    // non-fatal
  }
}