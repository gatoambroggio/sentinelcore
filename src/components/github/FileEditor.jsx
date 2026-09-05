import React, { useState, useEffect } from "react";
import { Upload, Download, FileText, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function FileEditor({ file, content, sha, loading, onPull, onPush }) {
  const [localContent, setLocalContent] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    setLocalContent(content);
    setResult(null);
  }, [content, file?.path]);

  const dirty = localContent !== content;

  const handlePush = async () => {
    setPushing(true);
    setResult(null);
    try {
      const res = await onPush(localContent, commitMessage, sha);
      setResult({
        type: "ok",
        message: `Commit: ${res.commit?.sha?.slice(0, 7) || "ok"}`,
        html_url: res.commit?.html_url,
      });
      setCommitMessage("");
    } catch (e) {
      setResult({ type: "error", message: e.message || "Error al subir" });
    } finally {
      setPushing(false);
    }
  };

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <FileText className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm text-center">Seleccioná un archivo del explorador para ver y editar su contenido.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-sm font-medium truncate flex-1">{file.path}</span>
        {dirty && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600">Modificado</span>
        )}
      </div>

      <div className="flex-1 p-3 overflow-hidden">
        <Textarea
          value={localContent}
          onChange={(e) => setLocalContent(e.target.value)}
          className="w-full h-full min-h-[300px] font-mono text-xs resize-none"
          placeholder="Contenido del archivo…"
          disabled={loading}
        />
      </div>

      {result && (
        <div
          className={`flex items-center gap-2 px-3 py-2 text-xs ${
            result.type === "ok"
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-red-500/10 text-red-600"
          }`}
        >
          {result.type === "ok" ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          <span className="truncate">{result.message}</span>
          {result.type === "ok" && result.html_url && (
            <a href={result.html_url} target="_blank" rel="noopener noreferrer" className="ml-auto underline">
              Ver commit
            </a>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 p-3 border-t border-border">
        <Input
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Mensaje de commit…"
          className="flex-1 h-9 text-sm"
          disabled={pushing}
        />
        <Button variant="outline" size="sm" onClick={onPull} disabled={loading}>
          <Download className="w-3.5 h-3.5 mr-1" />
          Pull
        </Button>
        <Button size="sm" onClick={handlePush} disabled={pushing || loading}>
          <Upload className="w-3.5 h-3.5 mr-1" />
          {pushing ? "Subiendo…" : "Push"}
        </Button>
      </div>
    </div>
  );
}