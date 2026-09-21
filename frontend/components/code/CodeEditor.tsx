"use client";

import CodeMirror from "@uiw/react-codemirror";
import {
  EditorView,
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { RangeSetBuilder, EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { rust } from "@codemirror/lang-rust";
import { php } from "@codemirror/lang-php";
import {
  indentUnit,
  HighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { useMemo } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  fileName: string;
  readOnly?: boolean;
};

// ═══════════════════════════════════════════════════════════════
// INDENT GUIDE WIDGET + VIEWPLUGIN
// ═══════════════════════════════════════════════════════════════
class IndentGuideWidget extends WidgetType {
  constructor(readonly level: number, readonly active: boolean) {
    super();
  }

  eq(other: IndentGuideWidget) {
    return other.level === this.level && other.active === this.active;
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-indent-guide-widget" + (this.active ? " cm-indent-guide-active" : "");
    span.setAttribute("aria-hidden", "true");
    return span;
  }

  ignoreEvent() {
    return true;
  }
}

function buildIndentGuides(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  const cursorLine = doc.lineAt(view.state.selection.main.head).number;

  // Determine active indent levels from cursor line
  const cursorLineText = doc.line(cursorLine).text;
  const cursorIndentMatch = cursorLineText.match(/^[ \t]*/);
  const cursorIndentLevel = cursorIndentMatch
    ? Math.floor(cursorIndentMatch[0].replace(/\t/g, "  ").length / 2)
    : 0;

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const text = line.text;
    if (!text.trim()) continue;

    const indentMatch = text.match(/^[ \t]*/);
    if (!indentMatch) continue;

    const indentStr = indentMatch[0];
    const spaceCount = indentStr.replace(/\t/g, "  ").length;
    const levels = Math.floor(spaceCount / 2);

    if (levels === 0) continue;

    // Draw a widget at each indent level column
    for (let lvl = 0; lvl < levels; lvl++) {
      const pos = line.from + lvl * 2;

      // Widget is "active" if this indent level is at or below the cursor indent
      // on the cursor's line, or if the current line is inside the cursor's block
      const isActive =
        i === cursorLine
          ? lvl < cursorIndentLevel
          : isWithinActiveBlock(doc, i, lvl, cursorLine, cursorIndentLevel);

      builder.add(
        pos,
        pos,
        Decoration.widget({
          widget: new IndentGuideWidget(lvl, isActive),
          side: -1,
        })
      );
    }
  }

  return builder.finish();
}

function isWithinActiveBlock(
  doc: any,
  lineNum: number,
  level: number,
  cursorLine: number,
  cursorLevel: number
): boolean {
  // For lines below the cursor, check if they're inside the cursor's block
  if (cursorLevel === 0) return false;

  // Find the block boundaries of the cursor level
  let start = cursorLine;
  while (start > 1) {
    const prevText = doc.line(start - 1).text;
    if (!prevText.trim()) {
      start--;
      continue;
    }
    const prevIndent = prevText.match(/^[ \t]*/)?.[0].replace(/\t/g, "  ").length ?? 0;
    if (Math.floor(prevIndent / 2) < cursorLevel) break;
    start--;
  }

  let end = cursorLine;
  while (end < doc.lines) {
    const nextText = doc.line(end + 1).text;
    if (!nextText.trim()) {
      end++;
      continue;
    }
    const nextIndent = nextText.match(/^[ \t]*/)?.[0].replace(/\t/g, "  ").length ?? 0;
    if (Math.floor(nextIndent / 2) < cursorLevel) break;
    end++;
  }

  // Active if this line is within the block range
  if (lineNum < start || lineNum > end) return false;

  // And it's the deepest indent so far
  const thisLineText = doc.line(lineNum).text;
  const thisIndent = thisLineText.match(/^[ \t]*/)?.[0].replace(/\t/g, "  ").length ?? 0;
  const thisLevel = Math.floor(thisIndent / 2);

  return level === cursorLevel - 1 && thisLevel >= cursorLevel;
}

const indentGuidePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildIndentGuides(view);
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged
      ) {
        this.decorations = buildIndentGuides(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

// ═══════════════════════════════════════════════════════════════
// LANGUAGE SELECTOR
// ═══════════════════════════════════════════════════════════════
function getLanguageExtension(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "js":
    case "mjs":
    case "cjs":
      return javascript({ jsx: false, typescript: false });
    case "jsx":
      return javascript({ jsx: true });
    case "ts":
    case "mts":
    case "cts":
      return javascript({ typescript: true });
    case "tsx":
      return javascript({ jsx: true, typescript: true });
    case "py":
      return python();
    case "html":
    case "htm":
      return html();
    case "css":
    case "scss":
    case "sass":
    case "less":
      return css();
    case "json":
      return json();
    case "md":
    case "markdown":
      return markdown();
    case "c":
    case "h":
    case "cpp":
    case "cc":
    case "cxx":
    case "hpp":
      return cpp();
    case "java":
      return java();
    case "rs":
      return rust();
    case "php":
      return php();
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// DARK THEME
// ═══════════════════════════════════════════════════════════════
const darkTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#0d1117 !important",
      color: "#c9d1d9",
      height: "100%",
      fontSize: "13px",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-editor": { backgroundColor: "#0d1117 !important" },
    ".cm-scroller": {
      backgroundColor: "#0d1117 !important",
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      lineHeight: "1.55",
      overflow: "auto",
    },
    ".cm-content": {
      backgroundColor: "#0d1117 !important",
      caretColor: "#58a6ff",
      padding: "12px 0",
    },
    ".cm-line": {
      padding: "0 12px",
      position: "relative",
    },
    ".cm-gutters": {
      backgroundColor: "#0d1117 !important",
      color: "#484f58",
      border: "none",
      paddingRight: "4px",
    },
    ".cm-lineNumbers": { backgroundColor: "#0d1117 !important" },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 12px 0 8px",
      fontSize: "12px",
      minWidth: "36px",
      color: "#484f58",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(88, 166, 255, 0.1) !important",
      color: "#c9d1d9",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(88, 166, 255, 0.04) !important",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#58a6ff",
      borderLeftWidth: "2px",
    },
    ".cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "rgba(88, 166, 255, 0.35) !important",
    },
    ".cm-matchingBracket": {
      backgroundColor: "rgba(88, 166, 255, 0.25) !important",
      outline: "1px solid rgba(88, 166, 255, 0.6)",
      borderRadius: "2px",
    },
    ".cm-tooltip": {
      backgroundColor: "#161b22 !important",
      border: "1px solid #30363d",
      borderRadius: "6px",
      color: "#c9d1d9",
    },
    ".cm-tooltip-autocomplete > ul": {
      backgroundColor: "#161b22 !important",
    },
    ".cm-panels": {
      backgroundColor: "#161b22 !important",
      color: "#c9d1d9",
      borderTop: "1px solid #30363d",
    },
    ".cm-textfield": {
      backgroundColor: "#0d1117 !important",
      border: "1px solid #30363d",
      color: "#c9d1d9",
      borderRadius: "4px",
      padding: "3px 6px",
    },
    ".cm-button": {
      backgroundColor: "#21262d !important",
      backgroundImage: "none",
      border: "1px solid #30363d",
      color: "#c9d1d9",
      borderRadius: "4px",
      padding: "3px 8px",
    },

    // ── Indent guide widget (fixed) ──
    ".cm-indent-guide-widget": {
      display: "inline-block",
      width: "0px",
      height: "1.55em",
      position: "relative",
      verticalAlign: "text-top",
      borderLeft: "1px solid rgba(139, 92, 246, 0.35)",
      pointerEvents: "none",
    },
    ".cm-indent-guide-widget.cm-indent-guide-active": {
      borderLeft: "1px solid rgba(139, 92, 246, 1) !important",
      boxShadow: "-1px 0 4px rgba(139, 92, 246, 0.6)",
    },
  },
  { dark: true }
);

// ═══════════════════════════════════════════════════════════════
// SYNTAX HIGHLIGHTING
// ═══════════════════════════════════════════════════════════════
const highlightStyle = HighlightStyle.define([
  { tag: t.comment, color: "#8b949e", fontStyle: "italic" },
  { tag: t.lineComment, color: "#8b949e", fontStyle: "italic" },
  { tag: t.blockComment, color: "#8b949e", fontStyle: "italic" },
  { tag: t.keyword, color: "#ff7b72" },
  { tag: t.controlKeyword, color: "#ff7b72" },
  { tag: t.moduleKeyword, color: "#ff7b72" },
  { tag: t.operatorKeyword, color: "#ff7b72" },
  { tag: t.string, color: "#a5d6ff" },
  { tag: t.special(t.string), color: "#a5d6ff" },
  { tag: t.regexp, color: "#a5d6ff" },
  { tag: t.number, color: "#79c0ff" },
  { tag: t.bool, color: "#79c0ff" },
  { tag: t.null, color: "#79c0ff" },
  { tag: t.atom, color: "#79c0ff" },
  { tag: t.function(t.variableName), color: "#d2a8ff" },
  { tag: t.function(t.definition(t.variableName)), color: "#d2a8ff" },
  { tag: t.function(t.propertyName), color: "#d2a8ff" },
  { tag: t.variableName, color: "#ffa657" },
  { tag: t.definition(t.variableName), color: "#c9d1d9" },
  { tag: t.propertyName, color: "#79c0ff" },
  { tag: t.typeName, color: "#ffa657" },
  { tag: t.className, color: "#ffa657" },
  { tag: t.namespace, color: "#ffa657" },
  { tag: t.operator, color: "#ff7b72" },
  { tag: t.punctuation, color: "#c9d1d9" },
  { tag: t.bracket, color: "#c9d1d9" },
  { tag: t.tagName, color: "#7ee787" },
  { tag: t.attributeName, color: "#79c0ff" },
  { tag: t.attributeValue, color: "#a5d6ff" },
  { tag: t.heading, color: "#1f6feb", fontWeight: "bold" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.link, color: "#58a6ff", textDecoration: "underline" },
  { tag: t.meta, color: "#8b949e" },
  { tag: t.invalid, color: "#f85149" },
]);

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════
export function CodeEditor({
  value,
  onChange,
  fileName,
  readOnly = false,
}: Props) {
  const extensions = useMemo(() => {
    const exts = [
      darkTheme,
      syntaxHighlighting(highlightStyle),
      EditorView.lineWrapping,
      indentUnit.of("  "),
      indentGuidePlugin,
    ];
    const lang = getLanguageExtension(fileName);
    if (lang) exts.push(lang);
    return exts;
  }, [fileName]);

  return (
    <div
      className="flex-1 overflow-hidden"
      style={{ backgroundColor: "#0d1117" }}
    >
      <CodeMirror
        value={value}
        height="100%"
        extensions={extensions}
        onChange={onChange}
        editable={!readOnly}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          history: true,
          foldGutter: true,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          syntaxHighlighting: false,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: false,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          defaultKeymap: true,
          searchKeymap: true,
          historyKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: true,
        }}
        style={{
          height: "100%",
          fontSize: "13px",
          backgroundColor: "#0d1117",
        }}
      />
    </div>
  );
}