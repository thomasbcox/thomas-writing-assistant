"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useConcept, useCreateConcept, useUpdateConcept } from "~/lib/api/concepts";
import {
  useAnalyzeConcept,
  useEnrichMetadata,
  useChatEnrich,
  useExpandDefinition,
  type AISuggestion,
  type QuickAction,
  type ChatMessage as APIChatMessage,
} from "~/lib/api/enrichment";
import { EnrichmentChatPanel } from "./EnrichmentChatPanel";
import { EnrichmentEditorPanel } from "./EnrichmentEditorPanel";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import type { ConceptFormData } from "~/server/services/conceptEnricher";

// Use API types for component state
type ChatMessage = APIChatMessage;

interface ConceptEnrichmentStudioProps {
  conceptId?: string; // If undefined, this is a new concept from candidate
  initialData?: Partial<ConceptFormData>; // For new concepts from candidates
}

export function ConceptEnrichmentStudio({ conceptId, initialData }: ConceptEnrichmentStudioProps) {
  const router = useRouter();
  const isNewConcept = !conceptId;

  // Load existing concept if conceptId provided
  const { data: existingConcept, isLoading: conceptLoading } = useConcept(conceptId ?? null);

  // Form state
  const [formData, setFormData] = useState<ConceptFormData>({
    title: "",
    description: "",
    content: "",
    creator: "",
    source: "",
    year: "",
  });

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingSuggestions, setPendingSuggestions] = useState<AISuggestion[]>([]);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Mutations
  const createMutation = useCreateConcept();
  const updateMutation = useUpdateConcept();
  const analyzeMutation = useAnalyzeConcept();
  const enrichMetadataMutation = useEnrichMetadata();
  const chatMutation = useChatEnrich();
  const expandDefinitionMutation = useExpandDefinition();

  // Initialize form data
  useEffect(() => {
    if (isNewConcept && initialData) {
      setFormData({
        title: initialData.title ?? "",
        description: initialData.description ?? "",
        content: initialData.content ?? "",
        creator: initialData.creator ?? "",
        source: initialData.source ?? "",
        year: initialData.year ?? "",
      });
    } else if (existingConcept) {
      setFormData({
        title: existingConcept.title,
        description: existingConcept.description ?? "",
        content: existingConcept.content,
        creator: existingConcept.creator || "",
        source: existingConcept.source || "",
        year: existingConcept.year || "",
      });
    }
  }, [existingConcept, initialData, isNewConcept]);

  // Initial analysis when concept loads
  useEffect(() => {
    if (formData.title && (isNewConcept || existingConcept)) {
      setIsAIThinking(true);
      analyzeMutation.mutate(formData, {
        onSuccess: (result) => {
          setIsAIThinking(false);
          setMessages([
            {
              id: `msg-${Date.now()}`,
              role: "assistant",
              content: result.initialMessage,
              timestamp: new Date(),
              suggestions: result.suggestions,
              actions: result.quickActions,
            },
          ]);
          setPendingSuggestions(result.suggestions);
          setQuickActions(result.quickActions);
        },
        onError: () => {
          setIsAIThinking(false);
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.title, isNewConcept, !!existingConcept]);

  // Auto-save for existing concepts (every 30 seconds)
  useEffect(() => {
    if (!isNewConcept && hasUnsavedChanges && conceptId) {
      const timer = setTimeout(() => {
        updateMutation.mutate(
          {
            id: conceptId,
            data: formData,
          },
          {
            onSuccess: () => {
              setHasUnsavedChanges(false);
              setLastSavedAt(new Date());
            },
          },
        );
      }, 30000); // 30 seconds

      return () => clearTimeout(timer);
    }
  }, [formData, hasUnsavedChanges, isNewConcept, conceptId, updateMutation]);

  const handleFormChange = useCallback((updates: Partial<ConceptFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  }, []);

  const handleApplySuggestion = useCallback((suggestion: AISuggestion) => {
    handleFormChange({ [suggestion.field]: suggestion.suggestedValue });
    setPendingSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
  }, [handleFormChange]);

  const handleQuickAction = useCallback(
    async (action: QuickAction) => {
      setIsAIThinking(true);

      try {
        switch (action.action) {
          case "fetchMetadata":
            const metadata = await enrichMetadataMutation.mutateAsync({
              title: formData.title,
              description: formData.description,
            });
            if (metadata.creator) handleFormChange({ creator: metadata.creator });
            if (metadata.year) handleFormChange({ year: metadata.year });
            if (metadata.source) handleFormChange({ source: metadata.source });

            setMessages((prev) => [
              ...prev,
              {
                id: `msg-${Date.now()}`,
                role: "assistant",
                content: `Found metadata: ${metadata.creator} (${metadata.year}) - ${metadata.source}`,
                timestamp: new Date(),
              },
            ]);
            break;

          case "expandDefinition":
            const expanded = await expandDefinitionMutation.mutateAsync({
              currentDefinition: formData.description,
              conceptTitle: formData.title,
            });
            handleFormChange({ description: expanded.expanded });

            setMessages((prev) => [
              ...prev,
              {
                id: `msg-${Date.now()}`,
                role: "assistant",
                content: "I've expanded the definition. Check the description field!",
                timestamp: new Date(),
              },
            ]);
            break;

          default:
            // For other actions, use chat
            const chatResult = await chatMutation.mutateAsync({
              message: `Please ${action.label.toLowerCase()}`,
              conceptData: formData,
              chatHistory: messages,
            });
            setMessages((prev) => [
              ...prev,
              {
                id: `msg-${Date.now()}`,
                role: "assistant",
                content: chatResult.response,
                timestamp: new Date(),
                suggestions: chatResult.suggestions,
              },
            ]);
            if (chatResult.suggestions) {
              setPendingSuggestions((prev) => [...prev, ...chatResult.suggestions!]);
            }
        }
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsAIThinking(false);
      }
    },
    [formData, messages, handleFormChange, enrichMetadataMutation, expandDefinitionMutation, chatMutation],
  );

  const handleChatMessage = useCallback(
    async (message: string) => {
      // Add user message
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsAIThinking(true);

      try {
        const result = await chatMutation.mutateAsync({
          message,
          conceptData: formData,
          chatHistory: [...messages, userMessage],
        });

        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: "assistant",
          content: result.response,
          timestamp: new Date(),
          suggestions: result.suggestions,
          actions: result.actions,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        if (result.suggestions) {
          setPendingSuggestions((prev) => [...prev, ...result.suggestions!]);
        }
        if (result.actions) {
          setQuickActions((prev) => [...prev, ...result.actions!]);
        }
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            role: "assistant",
            content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsAIThinking(false);
      }
    },
    [formData, messages, chatMutation],
  );

  const handleSave = useCallback(() => {
    if (isNewConcept) {
      createMutation.mutate(formData, {
        onSuccess: () => {
          router.push("/?tab=concepts");
        },
      });
    } else if (conceptId) {
      updateMutation.mutate(
        {
          id: conceptId,
          data: formData,
        },
        {
          onSuccess: () => {
            setHasUnsavedChanges(false);
            setLastSavedAt(new Date());
          },
        },
      );
    }
  }, [isNewConcept, conceptId, formData, createMutation, updateMutation, router]);

  if (conceptLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading concept...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {isNewConcept ? "Enrich New Concept" : "Enrich Concept"}
        </h1>
        <div className="flex items-center gap-4">
          {hasUnsavedChanges && (
            <span className="text-sm text-gray-500">
              {lastSavedAt ? `Last saved: ${lastSavedAt.toLocaleTimeString()}` : "Unsaved changes"}
            </span>
          )}
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {(createMutation.isPending || updateMutation.isPending) && <LoadingSpinner size="sm" />}
            <span>
              {createMutation.isPending || updateMutation.isPending
                ? isNewConcept ? "Creating..." : "Saving..."
                : isNewConcept ? "Save as Concept" : "Save Changes"}
            </span>
          </button>
        </div>
      </div>

      {/* Split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat Panel */}
        <div className="w-[60%] border-r border-gray-200">
          <EnrichmentChatPanel
            messages={messages}
            quickActions={quickActions}
            isAIThinking={isAIThinking}
            onSendMessage={handleChatMessage}
            onQuickAction={handleQuickAction}
          />
        </div>

        {/* Right: Editor Panel */}
        <div className="w-[40%] overflow-y-auto">
          <EnrichmentEditorPanel
            formData={formData}
            pendingSuggestions={pendingSuggestions}
            onChange={handleFormChange}
            onApplySuggestion={handleApplySuggestion}
          />
        </div>
      </div>
    </div>
  );
}

