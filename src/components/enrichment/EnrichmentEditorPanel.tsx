"use client";

import { useState } from "react";
import type { ConceptFormData, AISuggestion } from "~/server/services/conceptEnricher";

interface EnrichmentEditorPanelProps {
  formData: ConceptFormData;
  pendingSuggestions: AISuggestion[];
  onChange: (updates: Partial<ConceptFormData>) => void;
  onApplySuggestion: (suggestion: AISuggestion) => void;
}

export function EnrichmentEditorPanel({
  formData,
  pendingSuggestions,
  onChange,
  onApplySuggestion,
}: EnrichmentEditorPanelProps) {
  const [showSuggestions, setShowSuggestions] = useState(true);

  const getSuggestionsForField = (field: keyof ConceptFormData): AISuggestion[] => {
    return pendingSuggestions.filter((s) => s.field === field);
  };

  const hasSuggestions = (field: keyof ConceptFormData): boolean => {
    return getSuggestionsForField(field).length > 0;
  };

  return (
    <div className="h-full bg-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Concept Editor</h2>
          {pendingSuggestions.length > 0 && (
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showSuggestions ? "Hide" : "Show"} Suggestions ({pendingSuggestions.length})
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="px-6 py-4 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title
            {hasSuggestions("title") && (
              <span className="ml-2 text-xs text-blue-600">💡 {getSuggestionsForField("title").length} suggestion(s)</span>
            )}
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasSuggestions("title") ? "border-blue-300 bg-blue-50" : "border-gray-300"
            }`}
          />
          {showSuggestions &&
            getSuggestionsForField("title").map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} onApply={onApplySuggestion} />
            ))}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
            {hasSuggestions("description") && (
              <span className="ml-2 text-xs text-blue-600">💡 {getSuggestionsForField("description").length} suggestion(s)</span>
            )}
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={3}
            className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasSuggestions("description") ? "border-blue-300 bg-blue-50" : "border-gray-300"
            }`}
          />
          {showSuggestions &&
            getSuggestionsForField("description").map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} onApply={onApplySuggestion} />
            ))}
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content
            {hasSuggestions("content") && (
              <span className="ml-2 text-xs text-blue-600">💡 {getSuggestionsForField("content").length} suggestion(s)</span>
            )}
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => onChange({ content: e.target.value })}
            rows={12}
            className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
              hasSuggestions("content") ? "border-blue-300 bg-blue-50" : "border-gray-300"
            }`}
          />
          {showSuggestions &&
            getSuggestionsForField("content").map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} onApply={onApplySuggestion} />
            ))}
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-3 gap-4">
          {/* Creator */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Creator
              {hasSuggestions("creator") && (
                <span className="ml-1 text-xs text-blue-600">💡</span>
              )}
            </label>
            <input
              type="text"
              value={formData.creator}
              onChange={(e) => onChange({ creator: e.target.value })}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasSuggestions("creator") ? "border-blue-300 bg-blue-50" : "border-gray-300"
              }`}
            />
            {showSuggestions &&
              getSuggestionsForField("creator").map((suggestion) => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} onApply={onApplySuggestion} />
              ))}
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source
              {hasSuggestions("source") && (
                <span className="ml-1 text-xs text-blue-600">💡</span>
              )}
            </label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) => onChange({ source: e.target.value })}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasSuggestions("source") ? "border-blue-300 bg-blue-50" : "border-gray-300"
              }`}
            />
            {showSuggestions &&
              getSuggestionsForField("source").map((suggestion) => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} onApply={onApplySuggestion} />
              ))}
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year
              {hasSuggestions("year") && (
                <span className="ml-1 text-xs text-blue-600">💡</span>
              )}
            </label>
            <input
              type="text"
              value={formData.year}
              onChange={(e) => onChange({ year: e.target.value })}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasSuggestions("year") ? "border-blue-300 bg-blue-50" : "border-gray-300"
              }`}
            />
            {showSuggestions &&
              getSuggestionsForField("year").map((suggestion) => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} onApply={onApplySuggestion} />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onApply,
}: {
  suggestion: AISuggestion;
  onApply: (suggestion: AISuggestion) => void;
}) {
  return (
    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="text-xs text-blue-700 mb-1">{suggestion.reason}</div>
      <div className="text-sm text-gray-700 mb-2">
        <span className="line-through text-gray-400">{suggestion.currentValue || "(empty)"}</span>
        {" → "}
        <span className="font-semibold">{suggestion.suggestedValue}</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onApply(suggestion)}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Apply
        </button>
        <span className="text-xs text-gray-500 mt-1">
          Confidence: {suggestion.confidence || "medium"}
        </span>
      </div>
    </div>
  );
}

