import { getGithubContext, githubFetch, parseGithubResponse, encodeBase64Utf8, validateRepoInputs } from "../../shared/github.ts";

export default async function (req) {
  try {
    const ctx = await getGithubContext(req);
    if (ctx.error) return ctx.error;

    const body = await req.json();
    const { owner, repo, path, content, message, sha } = body;
    if (!path) return Response.json({ error: "path es obligatorio" }, { status: 400 });
    if (content === undefined || content === null) {
      return Response.json({ error: "content es obligatorio" }, { status: 400 });
    }
    const validationError = validateRepoInputs({ owner, repo, path });
    if (validationError) return Response.json({ error: validationError }, { status: 400 });

    const payload = {
      message: message || `Update ${path} — SentinelCore sync`,
      content: encodeBase64Utf8(content),
      sha: sha || undefined,
      committer: {
        name: ctx.user.full_name || "SentinelCore Sync",
        email: ctx.user.email || "noreply@base44.app",
      },
    };

    const res = await githubFetch(`/repos/${owner}/${repo}/contents/${path}`, ctx.token, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseGithubResponse(res);
    if (!res.ok) return Response.json({ error: data.message || "Error de GitHub API" }, { status: res.status });

    return Response.json({
      commit: {
        sha: data.commit?.sha,
        message: data.commit?.message,
        html_url: data.commit?.html_url,
      },
      content: {
        sha: data.content?.sha,
        path: data.content?.path,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}