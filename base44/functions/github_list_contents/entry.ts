import { getGithubContext, githubFetch, parseGithubResponse, validateRepoInputs } from "../../shared/github.ts";

export default async function (req) {
  try {
    const ctx = await getGithubContext(req);
    if (ctx.error) return ctx.error;

    const body = await req.json();
    const { owner, repo, path = "" } = body;
    const validationError = validateRepoInputs({ owner, repo, path });
    if (validationError) return Response.json({ error: validationError }, { status: 400 });

    const apiPath = `/repos/${owner}/${repo}/contents/${path || ""}`;
    const res = await githubFetch(apiPath, ctx.token);
    const data = await parseGithubResponse(res);
    if (!res.ok) return Response.json({ error: data.message || "Error de GitHub API" }, { status: res.status });

    const items = Array.isArray(data)
      ? data.map((item) => ({
          name: item.name,
          path: item.path,
          type: item.type,
          sha: item.sha,
          size: item.size,
        }))
      : [
          {
            name: data.name,
            path: data.path,
            type: data.type,
            sha: data.sha,
            size: data.size,
          },
        ];

    return Response.json({ items, path: path || "" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}