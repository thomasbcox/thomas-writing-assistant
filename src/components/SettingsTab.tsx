"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "~/hooks/useIPC";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { ToastContainer, type ToastType } from "./ui/Toast";
import { useTimer } from "~/hooks/useTimer";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export function SettingsTab() {
  const { data: settings, isLoading, refetch } = api.ai.getSettings.useQuery();
  const { data: availableModels } = api.ai.getAvailableModels.useQuery();
  const { data: embeddingStatus, refetch: refetchEmbeddingStatus } = api.ai.getEmbeddingStatus.useQuery();
  const updateMutation = api.ai.updateSettings.useMutation({
    onSuccess: () => {
      refetch();
    },
  });
  const generateEmbeddingsMutation = api.ai.generateMissingEmbeddings.useMutation({
    onSuccess: () => {
      refetchEmbeddingStatus();
      addToast("Embedding generation started. Check status below.", "success");
    },
    onError: (error) => {
      addToast(`Failed to start embedding generation: ${error.message}`, "error");
    },
  });

  const { formattedTime, showCounter } = useTimer(generateEmbeddingsMutation.isLoading);

  const [provider, setProvider] = useState<"openai" | "gemini">("openai");
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (settings) {
      setProvider(settings.provider);
      setModel(settings.model);
      setTemperature(settings.temperature);
    }
  }, [settings]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Reset form to saved settings
  const handleReset = () => {
    if (settings) {
      setProvider(settings.provider);
      setModel(settings.model);
      setTemperature(settings.temperature);
      addToast("Settings reset to saved values", "success");
    } else {
      addToast("No saved settings to reset to", "info");
    }
  };

  const handleSave = () => {
    updateMutation.mutate({
      provider,
      model: model || undefined,
      temperature,
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-10">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">AI Settings</h2>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
            title="Reset form to saved settings"
            disabled={!settings}
          >
            Reset
          </button>
        </div>
        <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Provider
          </label>
          <select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value as "openai" | "gemini");
              // Update model list when provider changes
              if (availableModels) {
                const firstModel = availableModels.models[0]?.value;
                if (firstModel) setModel(firstModel);
              }
            }}
            className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          >
            {settings?.availableProviders?.openai && (
              <option value="openai">OpenAI</option>
            )}
            {settings?.availableProviders?.gemini && (
              <option value="gemini">Google Gemini</option>
            )}
          </select>
          {!settings?.availableProviders?.openai && !settings?.availableProviders?.gemini && (
            <p className="text-sm text-red-600 mt-2">
              No API keys configured. Set OPENAI_API_KEY or GOOGLE_API_KEY in your .env file.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={!availableModels}
            className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {availableModels?.models.map((m: { value: string; label: string }) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Temperature: {temperature.toFixed(1)}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>More Focused (0)</span>
            <span>More Creative (2)</span>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={updateMutation.isLoading}
            className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg text-base flex items-center gap-2"
          >
            {updateMutation.isLoading && <LoadingSpinner size="sm" />}
            {updateMutation.isLoading ? "Saving..." : "Save Settings"}
          </button>
        </div>

        {settings && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Current Settings</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <div>Provider: <strong>{settings.provider}</strong></div>
              <div>Model: <strong>{settings.model}</strong></div>
              <div>Temperature: <strong>{settings.temperature.toFixed(1)}</strong></div>
            </div>
          </div>
        )}

        {/* Embedding Status Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Embedding Status</h3>
          
          {embeddingStatus && (
            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-700 space-y-2">
                <div className="flex justify-between">
                  <span>Total Concepts:</span>
                  <strong>{embeddingStatus.totalConcepts}</strong>
                </div>
                <div className="flex justify-between">
                  <span>With Embeddings:</span>
                  <strong className="text-green-600">{embeddingStatus.conceptsWithEmbeddings}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Without Embeddings:</span>
                  <strong className={embeddingStatus.conceptsWithoutEmbeddings > 0 ? "text-orange-600" : "text-green-600"}>
                    {embeddingStatus.conceptsWithoutEmbeddings}
                  </strong>
                </div>
                {embeddingStatus.isIndexing && (
                  <div className="mt-2 text-xs text-blue-600">
                    ⏳ Embedding generation in progress...
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => {
                generateEmbeddingsMutation.mutate({ batchSize: 10 });
              }}
              disabled={generateEmbeddingsMutation.isLoading || (embeddingStatus?.conceptsWithoutEmbeddings ?? 0) === 0}
              className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {generateEmbeddingsMutation.isLoading && <LoadingSpinner size="sm" />}
              {generateEmbeddingsMutation.isLoading 
                ? `Generating${showCounter ? ` (${formattedTime})` : "..."}${embeddingStatus?.conceptsWithoutEmbeddings ? ` - ${embeddingStatus.conceptsWithoutEmbeddings} remaining` : ""}`
                : `Generate Missing Embeddings${embeddingStatus?.conceptsWithoutEmbeddings ? ` (${embeddingStatus.conceptsWithoutEmbeddings} remaining)` : ""}`}
            </button>
            
            <button
              onClick={() => refetchEmbeddingStatus()}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
            >
              Refresh Status
            </button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
            <strong>What are embeddings?</strong> They're numerical "fingerprints" that help the app find similar concepts. 
            New and updated concepts get embeddings automatically. This button generates them for existing concepts.
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
