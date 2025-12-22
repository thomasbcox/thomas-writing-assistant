"use client";

import { api } from "~/lib/trpc/react";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { HealthStatusCard } from "./ui/HealthStatusCard";
import { useHealthStatus } from "~/lib/api/health";
import { useDatabaseToggle } from "~/hooks/useDatabaseToggle";
import { ToastContainer, useToast } from "./ui/Toast";
import type { ConceptListItem, LinkWithConcepts, CapsuleWithAnchors } from "~/types/database";

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { data: health } = useHealthStatus();
  const { toasts, addToast, removeToast } = useToast();
  const { currentDatabase, isLoading: isToggling, toggleDatabase, isProd: isDbProd } = useDatabaseToggle({ addToast });
  const { data: concepts, isLoading: conceptsLoading } = api.concept.list.useQuery({
    includeTrash: false,
  });

  // Use summary mode for dashboard - only load counts, not full nested data
  const { data: links, isLoading: linksLoading } = api.link.getAll.useQuery({ summary: true });

  // Only load summary data for dashboard (counts only, not full nested data)
  // Use summary mode for dashboard - only load counts, not full nested data
  const { data: capsules, isLoading: capsulesLoading } = api.capsule.list.useQuery({ summary: true });

  const recentConcepts = (concepts && Array.isArray(concepts)) ? concepts.slice(0, 5) : [];
  const conceptCount = concepts?.length || 0;
  const linkCount = links?.length || 0;
  const capsuleCount = capsules?.length || 0;
  const anchorCount = (capsules && Array.isArray(capsules)) 
    ? capsules.reduce((acc: number, cap: CapsuleWithAnchors) => acc + (cap.anchors?.length || 0), 0) 
    : 0;

  const isLoading = conceptsLoading || linksLoading || capsulesLoading;

  const linkedConcepts = (concepts && Array.isArray(concepts) && links && Array.isArray(links))
    ? concepts.filter((c: ConceptListItem) => {
        const hasOutgoing = links.some((l: LinkWithConcepts) => l.sourceId === c.id);
        const hasIncoming = links.some((l: LinkWithConcepts) => l.targetId === c.id);
        return hasOutgoing || hasIncoming;
      }).length
    : 0;

  const linkPercentage = conceptCount > 0 ? Math.round((linkedConcepts / conceptCount) * 100) : 0;

  // Status colors based on health
  const getHealthColor = () => {
    if (conceptCount === 0) return "text-gray-500";
    if (linkPercentage < 30) return "text-red-600";
    if (linkPercentage < 70) return "text-yellow-600";
    return "text-green-600";
  };

  const getHealthBgColor = () => {
    if (conceptCount === 0) return "bg-gray-200";
    if (linkPercentage < 30) return "bg-red-200";
    if (linkPercentage < 70) return "bg-yellow-200";
    return "bg-green-200";
  };

  const getHealthMessage = () => {
    if (conceptCount === 0) return "Start building your knowledge base by creating concepts.";
    if (linkCount === 0) return "Connect your concepts to build a knowledge graph.";
    if (linkPercentage < 30) return "Your knowledge base needs more connections. Link concepts to strengthen it.";
    if (linkPercentage < 70) return "Keep linking concepts to strengthen your knowledge base.";
    return "Your knowledge base is well-connected and healthy.";
  };

  // Environment badge shows NODE_ENV (runtime environment)
  const environment = health?.environment || "development";
  const isProd = environment === "production";

  return (
    <div className="space-y-3 relative">
      {/* Environment Badge and Database Toggle - Top Right */}
      <div className="absolute top-0 right-0 z-10 flex flex-col gap-2 items-end">
        {/* Environment Badge - Shows NODE_ENV (runtime environment, not database file) */}
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
          isProd 
            ? "bg-yellow-500 text-yellow-900" 
            : "bg-green-500 text-green-900"
        }`} title={`Runtime Environment (NODE_ENV): ${environment}. This shows your Node.js environment, not which database file is active.`}>
          {isProd ? "PROD" : "DEV"}
        </div>
        
        {/* Database Toggle Button - Shows which database file is active (dev.db vs prod.db) */}
        <button
          onClick={toggleDatabase}
          disabled={isToggling}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
            isDbProd
              ? "bg-yellow-500 text-yellow-900 hover:bg-yellow-600"
              : "bg-green-500 text-green-900 hover:bg-green-600"
          } disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1`}
          title={`Active Database File: ${currentDatabase === "dev" ? "dev.db" : "prod.db"}. Click to switch to ${currentDatabase === "dev" ? "prod.db" : "dev.db"}`}
        >
          {isToggling ? (
            <>
              <LoadingSpinner size="sm" />
              <span>Switching...</span>
            </>
          ) : (
            <span>DB: {currentDatabase.toUpperCase()}</span>
          )}
        </button>
      </div>
      {/* Welcome Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 shadow-sm">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-1">
            Welcome to Your Writing Assistant
          </h1>
          <p className="text-lg text-gray-700 mb-3 leading-relaxed">
            Build your knowledge base, connect ideas, and create content that reflects your unique voice and values.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => onNavigate?.("concepts")}
              className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all shadow-md hover:shadow-lg text-base"
            >
              Create Your First Concept
            </button>
            <button
              onClick={() => onNavigate?.("text-input")}
              className="px-8 py-4 bg-white text-gray-900 font-bold border-2 border-blue-400 rounded-lg hover:bg-blue-50 hover:border-blue-500 active:bg-blue-100 transition-all shadow-md hover:shadow-lg text-base"
            >
              Process PDF or Text
            </button>
          </div>
        </div>
      </div>

      {/* Stats - With Color Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigate?.("concepts")}
          className="bg-white border-2 border-blue-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer text-left group active:bg-blue-50"
        >
          <div className="text-sm font-semibold text-gray-600 mb-1 uppercase tracking-wide group-hover:text-blue-700 transition-colors">
            Concepts
          </div>
          <div className="text-5xl font-bold text-blue-600 mb-1 group-hover:text-blue-700 transition-colors">
            {isLoading ? <LoadingSpinner size="sm" /> : conceptCount}
          </div>
          <div className={`text-xs font-medium ${conceptCount > 0 ? "text-green-600" : "text-gray-400"}`}>
            {conceptCount > 0 ? "Active" : "Empty"}
          </div>
        </button>
        <button
          onClick={() => onNavigate?.("links")}
          className="bg-white border-2 border-blue-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer text-left group active:bg-blue-50"
        >
          <div className="text-sm font-semibold text-gray-600 mb-1 uppercase tracking-wide group-hover:text-blue-700 transition-colors">
            Links
          </div>
          <div className="text-5xl font-bold text-blue-600 mb-1 group-hover:text-blue-700 transition-colors">
            {isLoading ? <LoadingSpinner size="sm" /> : linkCount}
          </div>
          <div className={`text-xs font-medium ${linkCount > 0 ? "text-green-600" : "text-gray-400"}`}>
            {linkCount > 0 ? "Connected" : "None"}
          </div>
        </button>
        <button
          onClick={() => onNavigate?.("capsules")}
          className="bg-white border-2 border-blue-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer text-left group active:bg-blue-50"
        >
          <div className="text-sm font-semibold text-gray-600 mb-1 uppercase tracking-wide group-hover:text-blue-700 transition-colors">
            Capsules
          </div>
          <div className="text-5xl font-bold text-blue-600 mb-1 group-hover:text-blue-700 transition-colors">
            {isLoading ? <LoadingSpinner size="sm" /> : capsuleCount}
          </div>
          <div className={`text-xs font-medium ${capsuleCount > 0 ? "text-green-600" : "text-gray-400"}`}>
            {capsuleCount > 0 ? "Active" : "Empty"}
          </div>
        </button>
        <button
          onClick={() => onNavigate?.("capsules")}
          className="bg-white border-2 border-blue-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer text-left group active:bg-blue-50"
        >
          <div className="text-sm font-semibold text-gray-600 mb-1 uppercase tracking-wide group-hover:text-blue-700 transition-colors">
            Anchors
          </div>
          <div className="text-5xl font-bold text-blue-600 mb-1 group-hover:text-blue-700 transition-colors">
            {isLoading ? <LoadingSpinner size="sm" /> : anchorCount}
          </div>
          <div className={`text-xs font-medium ${anchorCount > 0 ? "text-green-600" : "text-gray-400"}`}>
            {anchorCount > 0 ? "Active" : "None"}
          </div>
        </button>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Concepts - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white border-2 border-gray-300 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-bold text-gray-900">Recent Concepts</h2>
            {recentConcepts.length > 0 && (
              <button
                onClick={() => onNavigate?.("concepts")}
                className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                View All →
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : recentConcepts.length === 0 ? (
            <div className="py-8 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-100 mb-1">
                <svg
                  className="w-12 h-12 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                No concepts yet
              </h3>
              <p className="text-base text-gray-700 mb-1 max-w-md mx-auto leading-relaxed">
                Get started by creating your first concept or processing a PDF.
              </p>
              <button
                onClick={() => onNavigate?.("concepts")}
                className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all shadow-md hover:shadow-lg text-base"
              >
                Create Concept
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.isArray(recentConcepts) && recentConcepts.length > 0 ? (
                recentConcepts.map((concept: ConceptListItem) => (
                  <div
                    key={concept.id}
                    onClick={() => onNavigate?.("concepts")}
                    className="p-4 border-2 border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group"
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-700 transition-colors">
                      {concept.title}
                    </h3>
                    {concept.description && (
                      <p className="text-sm text-gray-700 mb-1 line-clamp-2 leading-relaxed">
                        {concept.description}
                      </p>
                    )}
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {concept.creator || "Unknown"} • {concept.source || "Unknown"} • {concept.year || "Unknown"}
                    </div>
                  </div>
                ))
              ) : null}
            </div>
          )}
        </div>

        {/* Sidebar - Quick Actions & Health */}
        <div className="space-y-3">
          {/* System Health */}
          <HealthStatusCard onNavigate={onNavigate} />

          {/* Quick Actions */}
          <div className="bg-white border-2 border-gray-300 rounded-xl p-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => onNavigate?.("concepts")}
                className="w-full px-6 py-5 text-left border-2 border-blue-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-all group shadow-sm hover:shadow-md"
              >
                <div className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors mb-1">
                  Create Concept
                </div>
                <div className="text-xs text-gray-600">Add to knowledge base</div>
              </button>
              <button
                onClick={() => onNavigate?.("text-input")}
                className="w-full px-6 py-5 text-left border-2 border-blue-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-all group shadow-sm hover:shadow-md"
              >
                <div className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors mb-1">
                  Process Text/PDF
                </div>
                <div className="text-xs text-gray-600">Extract concepts</div>
              </button>
              <button
                onClick={() => onNavigate?.("links")}
                className="w-full px-6 py-5 text-left border-2 border-blue-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-all group shadow-sm hover:shadow-md"
              >
                <div className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors mb-1">
                  Propose Links
                </div>
                <div className="text-xs text-gray-600">AI suggestions</div>
              </button>
              <button
                onClick={() => onNavigate?.("capsules")}
                className="w-full px-6 py-5 text-left border-2 border-blue-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-all group shadow-sm hover:shadow-md"
              >
                <div className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors mb-1">
                  Create Capsule
                </div>
                <div className="text-xs text-gray-600">Anchor content</div>
              </button>
            </div>
          </div>

          {/* Knowledge Base Health */}
          <div className="bg-white border-2 border-gray-300 rounded-xl p-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Knowledge Base</h2>
            {conceptCount === 0 ? (
              <div className="text-sm text-gray-700 leading-relaxed">
                Start building your knowledge base by creating concepts.
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-gray-900">Connection Status</span>
                    <span className={`text-sm font-bold ${getHealthColor()}`}>
                      {linkedConcepts} / {conceptCount}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                    <div
                      className={`h-4 rounded-full transition-all shadow-sm ${getHealthBgColor()}`}
                      style={{ width: `${linkPercentage}%` }}
                    />
                  </div>
                  <div className={`mt-3 text-xs font-bold ${getHealthColor()} uppercase tracking-wide`}>
                    {linkPercentage}% Connected
                  </div>
                </div>
                <div className={`text-sm leading-relaxed p-4 rounded-lg ${getHealthBgColor()} ${getHealthColor()}`}>
                  {getHealthMessage()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
