/**
 * ConfigTab component for managing writing configuration
 * Last Updated: 2025-12-11
 */

"use client";

import { useState, useEffect } from "react";
import { api } from "~/lib/trpc/react";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { ToastContainer, type ToastType } from "./ui/Toast";
import { translateError } from "~/lib/error-messages";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export function ConfigTab() {
  const [activeSection, setActiveSection] = useState<"style" | "credo" | "constraints">("style");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { data: configStatus, isLoading: statusLoading } = api.config.getStatus.useQuery();

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 10000); // 10 seconds for better UX
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getConfigStatusBadge = (status: { loaded: boolean; isEmpty: boolean } | undefined) => {
    if (!status) return null;
    if (status.loaded) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✓ Loaded
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        ⚠️ Using defaults
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Writing Configuration</h2>
          {!statusLoading && configStatus && (
            <div className="flex items-center gap-2">
              {getConfigStatusBadge(configStatus.styleGuide)}
              {getConfigStatusBadge(configStatus.credo)}
              {getConfigStatusBadge(configStatus.constraints)}
            </div>
          )}
        </div>

        {/* Config Status Warning */}
        {!statusLoading && configStatus && (
          (configStatus.styleGuide.isEmpty || configStatus.credo.isEmpty || configStatus.constraints.isEmpty) && (
            <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-semibold text-yellow-800 mb-1">
                    Configuration Incomplete
                  </h3>
                  <p className="text-sm text-yellow-700">
                    {configStatus.styleGuide.isEmpty && "Style Guide is missing. "}
                    {configStatus.credo.isEmpty && "Credo is missing. "}
                    {configStatus.constraints.isEmpty && "Constraints are missing. "}
                    Content generation will use default settings. Set up your writing style below for personalized content.
                  </p>
                </div>
              </div>
            </div>
          )
        )}
        
        {/* Section Tabs */}
        <div className="flex gap-2 mb-6 border-b-2 border-gray-200">
          <button
            onClick={() => setActiveSection("style")}
            className={`px-6 py-3 font-semibold transition-all ${
              activeSection === "style"
                ? "text-white bg-blue-600 border-b-4 border-blue-800"
                : "text-gray-600 hover:text-blue-700 hover:bg-blue-50"
            } rounded-t-lg`}
          >
            Style Guide
          </button>
          <button
            onClick={() => setActiveSection("credo")}
            className={`px-6 py-3 font-semibold transition-all ${
              activeSection === "credo"
                ? "text-white bg-blue-600 border-b-4 border-blue-800"
                : "text-gray-600 hover:text-blue-700 hover:bg-blue-50"
            } rounded-t-lg`}
          >
            Credo & Values
          </button>
          <button
            onClick={() => setActiveSection("constraints")}
            className={`px-6 py-3 font-semibold transition-all ${
              activeSection === "constraints"
                ? "text-white bg-blue-600 border-b-4 border-blue-800"
                : "text-gray-600 hover:text-blue-700 hover:bg-blue-50"
            } rounded-t-lg`}
          >
            Constraints
          </button>
        </div>

        {/* Content */}
        <div className="mt-6">
          {activeSection === "style" && <StyleGuideEditor onToast={addToast} />}
          {activeSection === "credo" && <CredoEditor onToast={addToast} />}
          {activeSection === "constraints" && <ConstraintsEditor onToast={addToast} />}
        </div>
      </div>
    </div>
  );
}

function StyleGuideEditor({ onToast }: { onToast: (message: string, type: ToastType) => void }) {
  const { data, isLoading, refetch } = api.config.getStyleGuideRaw.useQuery();
  const updateMutation = api.config.updateStyleGuide.useMutation({
    onSuccess: () => {
      onToast("Style guide updated and reloaded successfully!", "success");
      refetch();
    },
    onError: (error) => {
      onToast(translateError(error, { operation: "update style guide" }), "error");
    },
  });

  const [content, setContent] = useState("");

  useEffect(() => {
    if (data) {
      setContent(data.content);
    }
  }, [data]);

  const handleSave = () => {
    updateMutation.mutate({ content });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Style Guide (YAML)
        </label>
        <p className="text-sm text-gray-600 mb-4">
          Edit your writing voice, style preferences, vocabulary, and techniques. Changes are saved and immediately applied to all AI-generated content.
        </p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={25}
          className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          placeholder="Loading style guide..."
        />
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending || !content}
          className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg text-base flex items-center gap-2"
        >
          {updateMutation.isPending && <LoadingSpinner size="sm" />}
          {updateMutation.isPending ? "Saving..." : "Save & Reload Style Guide"}
        </button>
      </div>
    </div>
  );
}

function CredoEditor({ onToast }: { onToast: (message: string, type: ToastType) => void }) {
  const { data, isLoading, refetch } = api.config.getCredoRaw.useQuery();
  const updateMutation = api.config.updateCredo.useMutation({
    onSuccess: () => {
      onToast("Credo updated and reloaded successfully!", "success");
      refetch();
    },
    onError: (error) => {
      onToast(translateError(error, { operation: "update credo" }), "error");
    },
  });

  const [content, setContent] = useState("");

  useEffect(() => {
    if (data) {
      setContent(data.content);
    }
  }, [data]);

  const handleSave = () => {
    updateMutation.mutate({ content });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Credo & Core Values (YAML)
        </label>
        <p className="text-sm text-gray-600 mb-4">
          Edit your core beliefs, values, ethical guidelines, and content philosophy. Changes are saved and immediately applied to all AI-generated content.
        </p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={25}
          className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          placeholder="Loading credo..."
        />
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending || !content}
          className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg text-base flex items-center gap-2"
        >
          {updateMutation.isPending && <LoadingSpinner size="sm" />}
          {updateMutation.isPending ? "Saving..." : "Save & Reload Credo"}
        </button>
      </div>
    </div>
  );
}

function ConstraintsEditor({ onToast }: { onToast: (message: string, type: ToastType) => void }) {
  const { data, isLoading, refetch } = api.config.getConstraintsRaw.useQuery();
  const updateMutation = api.config.updateConstraints.useMutation({
    onSuccess: () => {
      onToast("Constraints updated and reloaded successfully!", "success");
      refetch();
    },
    onError: (error) => {
      onToast(translateError(error, { operation: "update constraints" }), "error");
    },
  });

  const [content, setContent] = useState("");

  useEffect(() => {
    if (data) {
      setContent(data.content);
    }
  }, [data]);

  const handleSave = () => {
    updateMutation.mutate({ content });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Constraints & Rules (YAML)
        </label>
        <p className="text-sm text-gray-600 mb-4">
          Edit your content constraints, formatting rules, and hard boundaries. Changes are saved and immediately applied to all AI-generated content.
        </p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={25}
          className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          placeholder="Loading constraints..."
        />
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending || !content}
          className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg text-base flex items-center gap-2"
        >
          {updateMutation.isPending && <LoadingSpinner size="sm" />}
          {updateMutation.isPending ? "Saving..." : "Save & Reload Constraints"}
        </button>
      </div>
    </div>
  );
}

