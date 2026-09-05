import React from "react";
import { Folder, File as FileIcon, ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FileBrowser({ items, currentPath, onNavigate, onSelectFile, loading }) {
  const segments = currentPath ? currentPath.split("/").filter(Boolean) : [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 p-3 border-b border-border overflow-x-auto whitespace-nowrap">
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onNavigate("")}>
          <Home className="w-3.5 h-3.5" />
        </Button>
        {segments.map((seg, i) => {
          const path = segments.slice(0, i + 1).join("/");
          return (
            <React.Fragment key={path}>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onNavigate(path)}>
                {seg}
              </Button>
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Cargando…</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">Carpeta vacía</div>
        ) : (
          <ul className="divide-y divide-border">
            {items
              .sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === "dir" ? -1 : 1;
              })
              .map((item) => (
                <li key={item.sha + item.path}>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent transition-colors text-left"
                    onClick={() =>
                      item.type === "dir" ? onNavigate(item.path) : onSelectFile(item)
                    }
                  >
                    {item.type === "dir" ? (
                      <Folder className="w-4 h-4 text-primary flex-shrink-0" />
                    ) : (
                      <FileIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-sm truncate">{item.name}</span>
                    {item.size !== undefined && item.type === "file" && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {item.size < 1024 ? `${item.size} B` : `${(item.size / 1024).toFixed(1)} KB`}
                      </span>
                    )}
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}