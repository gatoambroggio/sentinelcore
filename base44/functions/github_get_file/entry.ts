import { getGithubContext, githubFetch, parseGithubResponse, decodeBase64Utf8, validateRepoInputs } from "../../shared/github.ts";

export default async function (req) {
  try {
    const ctx = await getGithubContext(req);
    if (ctx.error) return ctx.error;

    const body = await req.json();
    const { owner, repo, path } = body;
    if (!path) return Response.json({ error: "path es obligatorio" }, { status: 400 });
    const validationError = validateRepoInputs({ owner, repo, path });
    if (validationError) return Response.json({ error: validationError }, { status: 400 });

    const res = await githubFetch(`/repos/${owner}/${repo}/contents/${path}`, ctx.token);
    const data = await parseGithubResponse(res);
    if (!res.ok) return Response.json({ error: data.message || "Error de GitHub API" }, { status: res.status });

    if (data.type !== "file") {
      return Response.json({ error: "La ruta no es un archivo" }, { status: 400 });
    }

    let content = "";
    if (data.encoding === "base64" && data.content) {
      content = decodeBase64Utf8(data.content);
    } else {
      content = data.content || "";
    }

    return Response.json({
      content,
      sha: data.sha,
      path: data.path,
      size: data.size,
      html_url: data.html_url,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}