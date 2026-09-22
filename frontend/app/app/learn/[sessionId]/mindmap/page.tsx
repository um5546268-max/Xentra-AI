"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, RefreshCw, Info, X } from "lucide-react";
import ReactFlow, {
  Background, Controls, MiniMap, Node, Edge, Position,
  useNodesState, useEdgesState, MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  LearnSessionDetail,
  getLearnSession,
  getSessionMindMap,
  MindMapNode,
  MindMapGraph,
} from "@/lib/learn";

const LEVEL_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  0: { bg: "#7c3aed", border: "#8b5cf6", text: "#ffffff" },   // root — violet
  1: { bg: "#0e7490", border: "#06b6d4", text: "#ffffff" },   // primary — cyan
  2: { bg: "#065f46", border: "#10b981", text: "#ffffff" },   // secondary — emerald
};

// Simple radial layout: root at center, level 1 in a ring, level 2 further out
function layoutNodes(graph: MindMapGraph): { nodes: Node[]; edges: Edge[] } {
  const root = graph.nodes.find((n) => n.level === 0) ?? graph.nodes[0];
  const level1 = graph.nodes.filter((n) => n.level === 1);
  const level2 = graph.nodes.filter((n) => n.level === 2);

  const nodeMap = new Map<string, Node>();

  // Root at center
  nodeMap.set(root.id, {
    id: root.id,
    data: { label: root.label, description: root.description, level: 0 },
    position: { x: 0, y: 0 },
    type: "mindmap",
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  });

  // Level 1: ring around root
  const l1Radius = 260;
  level1.forEach((n, i) => {
    const angle = (i / level1.length) * Math.PI * 2 - Math.PI / 2;
    nodeMap.set(n.id, {
      id: n.id,
      data: { label: n.label, description: n.description, level: 1 },
      position: {
        x: Math.cos(angle) * l1Radius,
        y: Math.sin(angle) * l1Radius,
      },
      type: "mindmap",
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  // Level 2: outer ring
  const l2Radius = 480;
  level2.forEach((n, i) => {
    const angle = (i / level2.length) * Math.PI * 2 - Math.PI / 2;
    nodeMap.set(n.id, {
      id: n.id,
      data: { label: n.label, description: n.description, level: 2 },
      position: {
        x: Math.cos(angle) * l2Radius,
        y: Math.sin(angle) * l2Radius,
      },
      type: "mindmap",
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  const flowNodes: Node[] = Array.from(nodeMap.values());

  const flowEdges: Edge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label ?? undefined,
    type: "smoothstep",
    animated: true,
    style: { stroke: "#475569", strokeWidth: 2 },
    labelStyle: { fill: "#94a3b8", fontSize: 10 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#475569" },
  }));

  return { nodes: flowNodes, edges: flowEdges };
}

// ─── Custom node ───
function MindMapNodeComponent({ data }: any) {
  const colors = LEVEL_COLORS[data.level as number] ?? LEVEL_COLORS[1];
  return (
    <div
      className="rounded-lg px-4 py-2 text-center shadow-lg cursor-pointer hover:scale-105 transition"
      style={{
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        color: colors.text,
        minWidth: 120,
        maxWidth: 200,
      }}
    >
      <div className="text-sm font-medium">{data.label}</div>
    </div>
  );
}

const nodeTypes = { mindmap: MindMapNodeComponent };

export default function MindMapPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<LearnSessionDetail | null>(null);
  const [graph, setGraph] = useState<MindMapGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MindMapNode | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sess, g] = await Promise.all([
        getLearnSession(sessionId),
        getSessionMindMap(sessionId),
      ]);
      setSession(sess);
      setGraph(g);

      const { nodes: fn, edges: fe } = layoutNodes(g);
      setNodes(fn);
      setEdges(fe);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to generate mind map");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [sessionId]);

  const handleNodeClick = (_: any, node: Node) => {
    const match = graph?.nodes.find((n) => n.id === node.id);
    if (match) setSelected(match);
  };

  // Recolor selected node
  const styledNodes = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      style: selected?.id === n.id ? { filter: "brightness(1.3)" } : undefined,
    }));
  }, [nodes, selected]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push(`/app/learn/${sessionId}`)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-medium truncate">
            {session?.title ?? "Mind Map"}
          </h1>
          <p className="text-[11px] text-slate-500">
            Click a node to see its description
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 px-3 py-1.5 text-xs text-slate-400 disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Regenerate
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            <div className="text-sm text-slate-400 mt-3">
              Generating mind map… (15-25 seconds)
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-8">
            <div className="max-w-md text-center space-y-3">
              <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
              <button
                onClick={load}
                className="text-sm text-violet-400 hover:text-violet-300"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {!loading && !error && graph && (
          <ReactFlow
            nodes={styledNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#1e293b" gap={20} size={1} />
            <Controls className="!bg-slate-900 !border-slate-800" />
            <MiniMap
              className="!bg-slate-900"
              nodeColor={(n: any) => {
                const lvl = n.data?.level ?? 1;
                return LEVEL_COLORS[lvl]?.bg ?? "#64748b";
              }}
            />
          </ReactFlow>
        )}

        {/* Node detail sidebar */}
        {selected && (
          <div className="absolute top-4 right-4 w-72 rounded-xl border border-violet-500/40 bg-slate-950 p-4 shadow-2xl space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-violet-300" />
                <span className="text-sm font-medium">{selected.label}</span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1 rounded hover:bg-slate-800 text-slate-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {selected.description && (
              <p className="text-xs text-slate-400 leading-relaxed">
                {selected.description}
              </p>
            )}
            <div className="text-[10px] text-slate-600">
              Level {selected.level}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}