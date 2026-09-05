import React, { useState, useEffect, useCallback } from "react";
import { GitBranch, Settings, RefreshCw, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import FileBrowser from "@/components/github/FileBrowser";
import FileEditor from "@/components/github/FileEditor";

const STORAGE_KEY = "sentinelcore_github_config";

export default function GitHubSync() {
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("SentinelCore");
  const [configSaved, setConfigSaved] = useState(false);

  const [path, setPath] = useState("");
  const [items, setItems] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [fileSha, setFileSha] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);

  // Load config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { owner: o, repo: r } = JSON.parse(saved);
        if (o) setOwner(o);
        if (r) setRepo(r);
        setConfigSaved(true);
      } catch {
        // ignore
      }
    }
  }, []);

  const saveConfig = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ owner, repo }));
    setConfigSaved(true);
    loadContents("");
  };

  const loadContents = useCallback(
    async (targetPath) => {
      if (!owner || !repo) return;
      setListLoading(true);
      setListError(null);
      try {
        const res = await base44.functions.invoke("github_list_contents", {
          owner,
          repo,
          path: targetPath,
        });
        setItems(res.data.items || []);
        setPath(targetPath || "");
      } catch (e) {
        setListError(e.response?.data?.error || e.message || "Error al cargar");
        setItems([]);
      } finally {
        setListLoading(false);
      }
    },
    [owner, repo]
  );

  // Auto-load when config is ready
  useEffect(() => {
    if (configSaved && owner && repo) {
      loadContents("");
    }
  }, [configSaved, owner, repo, loadContents]);

  const handleNavigate = (targetPath) => {
    setSelectedFile(null);
    setFileContent("");
    setFileSha(null);
    loadContents(targetPath);
  };

  const handleSelectFile = async (file) => {
    setSelectedFile(file);
    setFileContent("");
    setFileSha(null);
    setFileLoading(true);
    try {
      const res = await base44.functions.invoke("github_get_file", {
        owner,
        repo,
        path: file.path,
      });
      setFileContent(res.data.content || "");
      setFileSha(res.data.sha);
    } catch (e) {
      setFileContent("");
    } finally {
      setFileLoading(false);
    }
  };

  const handlePull = async () => {
    if (selectedFile) handleSelectFile(selectedFile);
  };

  const handlePush = async (content, message, sha) => {
    const res = await base44.functions.invoke("github_update_file", {
      owner,
      repo,
      path: selectedFile.path,
      content,
      message,
      sha,
    });
    if (res.data.error) throw new Error(res.data.error);
    // Update sha after push
    if (res.data.content?.sha) setFileSha(res.data.content.sha);
    // Refresh file content
    await handleSelectFile(selectedFile);
    return res.data;
  };

  const showConfig = !configSaved || !owner;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <GitBranch className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">SentinelCore Sync</h1>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {owner}/{repo}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setConfigSaved(false)}
          >
            <Settings className="w-4 h-4 mr-1" />
            Config
          </Button>
        </div>
      </header>

      {/* Config bar */}
      {showConfig && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-3">
              Configurá el repositorio de GitHub a sincronizar.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Owner (usuario u organización)"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Repositorio"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                className="flex-1"
              />
              <Button onClick={saveConfig} disabled={!owner || !repo}>
                Conectar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Main content */}
      {!showConfig && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground">Explorador de archivos</h2>
            <Button variant="outline" size="sm" onClick={() => loadContents(path)} disabled={listLoading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${listLoading ? "animate-spin" : ""}`} />
              Refrescar
            </Button>
          </div>

          {listError && (
            <div className="flex items-center gap-2 p-3 mb-3 rounded-md bg-red-500/10 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{listError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-180px)]">
            <Card className="overflow-hidden flex flex-col">
              <FileBrowser
                items={items}
                currentPath={path}
                onNavigate={handleNavigate}
                onSelectFile={handleSelectFile}
                loading={listLoading}
              />
            </Card>
            <Card className="overflow-hidden flex flex-col">
              <FileEditor
                file={selectedFile}
                content={fileContent}
                sha={fileSha}
                loading={fileLoading}
                onPull={handlePull}
                onPush={handlePush}
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}