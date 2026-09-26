"use client";

import { useState } from "react";
import MobileCodeHome from "./MobileCodeHome";
import MobileFileExplorer from "./MobileFileExplorer";
import MobileCodeEditor from "./MobileCodeEditor";
import MobileAIAssistant from "./MobileAIAssistant";
import MobileRunOutput from "./MobileRunOutput";
import MobileTemplates from "./MobileTemplates";
import MobileNewFile from "./MobileNewFile";
import MobileCodeSettings from "./MobileCodeSettings";
import MobileCodeTools from "./MobileCodeTools";
import { writeFile } from "@/lib/code";

type Screen =
  | "home"
  | "explorer"
  | "editor"
  | "templates"
  | "settings"
  | "tools";

export default function MobileCodeWrapper() {
  const [screen, setScreen] = useState<Screen>("home");
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [explorerKey, setExplorerKey] = useState(0);

  const [showAI, setShowAI] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileParent, setNewFileParent] = useState<string>("");
  const [runSheet, setRunSheet] = useState<{ type: "run" | "debug" } | null>(
    null
  );

  const openFile = (path: string) => {
    setActiveFile(path);
    setScreen("editor");
  };

  const handleApplyAI = async (newContent: string) => {
    if (!activeFile) return;
    try {
      await writeFile(activeFile, newContent);
      setEditorKey((k) => k + 1);
    } catch (e) {
      console.error("[apply ai] write failed:", e);
      alert("Failed to apply changes");
    }
  };

  const handleNewFileCreated = (path: string) => {
    setEditorKey((k) => k + 1);
    setExplorerKey((k) => k + 1);
    setActiveFile(path);
    setScreen("editor");
  };

  const handleTemplateCreated = () => {
    setExplorerKey((k) => k + 1);
    setScreen("explorer");
  };

  const handleNewProjectCreated = () => {
    setExplorerKey((k) => k + 1);
    setScreen("explorer");
  };

  const openNewFileModal = (parentPath: string = "") => {
    setNewFileParent(parentPath);
    setShowNewFile(true);
  };

  // ─── Settings ───
  if (screen === "settings") {
    return <MobileCodeSettings onBack={() => setScreen("home")} />;
  }

  // ─── Tools ───
  if (screen === "tools") {
    return (
      <MobileCodeTools
        onBack={() => setScreen("home")}
        onOpenAI={() => {
          if (!activeFile) {
            alert("Open a file first to use the AI Assistant");
            return;
          }
          setShowAI(true);
        }}
        onOpenGenerate={() => {
          if (!activeFile) {
            alert("Open a file first to generate code");
            return;
          }
          setShowAI(true);
        }}
        onOpenDebug={() => {
          if (!activeFile) {
            alert("Open a file first to debug");
            return;
          }
          setRunSheet({ type: "debug" });
        }}
        onOpenSearch={() => {
          alert("Search in files coming soon");
        }}
        onOpenFormatter={() => {
          alert("Code formatter coming soon");
        }}
        onOpenGit={() => {
          alert("Git integration coming soon");
        }}
      />
    );
  }

  // ─── Templates ───
  if (screen === "templates") {
    return (
      <MobileTemplates
        onBack={() => setScreen("home")}
        onCreated={handleTemplateCreated}
      />
    );
  }

  // ─── Editor ───
  if (screen === "editor" && activeFile) {
    return (
      <>
        <MobileCodeEditor
          key={editorKey}
          path={activeFile}
          onBack={() => setScreen("explorer")}
          onAskAI={() => setShowAI(true)}
          onRunOutput={(opts) => setRunSheet({ type: opts.type })}
          onOpenTools={() => setScreen("tools")}
          onOpenSettings={() => setScreen("settings")}
        />

        {showAI && (
          <MobileAIAssistant
            filePath={activeFile}
            fileContent=""
            onClose={() => setShowAI(false)}
            onApplyProposal={handleApplyAI}
          />
        )}

        {runSheet && (
          <MobileRunOutput
            filePath={activeFile}
            mode={runSheet.type}
            onClose={() => setRunSheet(null)}
          />
        )}
      </>
    );
  }

  // ─── Explorer ───
  if (screen === "explorer") {
    return (
      <>
        <MobileFileExplorer
          key={explorerKey}
          onOpenFile={openFile}
          onBack={() => setScreen("home")}
          onNewFile={openNewFileModal}
          refreshKey={explorerKey}
        />

        {showNewFile && (
          <MobileNewFile
            parentPath={newFileParent}
            onClose={() => setShowNewFile(false)}
            onCreated={handleNewFileCreated}
          />
        )}
      </>
    );
  }

  // ─── Home ───
  return (
    <MobileCodeHome
      onOpenExplorer={() => setScreen("explorer")}
      onOpenTemplates={() => setScreen("templates")}
      onOpenAssistant={() => setScreen("tools")}
      onNewProjectCreated={handleNewProjectCreated}
    />
  );
}