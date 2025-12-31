"use client";

import { useState, useEffect, useCallback } from "react";
// import { useRouter } from "next/navigation"; // Not available in Electron - using callback prop instead
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
import { api } from "~/hooks/useIPC";
import { EnrichmentChatPanel } from "./EnrichmentChatPanel";
import { EnrichmentEditorPanel } from "./EnrichmentEditorPanel";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import type { ConceptFormData } from "~/server/services/conceptEnricher";

// Use API types for component state, but ensure id is always present
type ChatMessage = Omit<APIChatMessage, 'id'> & { id: string };

interface ConceptEnrichmentStudioProps {
  conceptId?: string; // If undefined, this is a new concept from candidate
  initialData?: Partial<ConceptFormData>; // For new concepts from candidates
}

export function ConceptEnrichmentStudio({ conceptId, initialData }: ConceptEnrichmentStudioProps) {
  // const router = useRouter(); // Not available in Electron
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
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Chat persistence - load session for existing concepts
  const { data: chatSession, refetch: refetchSession } = api.chat.getOrCreateSession.useQuery(
    { conceptId: conceptId ?? "" },
    { enabled: !!conceptId && !isNewConcept }
  );

  const addMessageMutation = api.chat.addMessage.useMutation();

  // Load persisted messages when session is available
  useEffect(() => {
    if (chatSession && typeof chatSession === "object" && "id" in chatSession) {
      const session = chatSession as { id: string; messages?: Array<{ id: string; role: string; content: string; createdAt: string; suggestions?: string; actions?: string }> };
      setSessionId(session.id);
      // Convert persisted messages to component format
      if (session.messages && session.messages.length > 0) {
        const loadedMessages: ChatMessage[] = session.messages.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          timestamp: new Date(msg.createdAt),
          suggestions: msg.suggestions ? JSON.parse(msg.suggestions) : undefined,
          actions: msg.actions ? JSON.parse(msg.actions) : undefined,
        }));
        setMessages(loadedMessages);
      }
    }
  }, [chatSession]);

  // Helper to persist a message
  const persistMessage = useCallback(async (message: ChatMessage) => {
    if (sessionId) {
      try {
        await addMessageMutation.mutateAsync({
          sessionId,
          role: message.role,
          content: message.content,
          suggestions: message.suggestions ? JSON.stringify(message.suggestions) : undefined,
          actions: message.actions ? JSON.stringify(message.actions) : undefined,
        });
      } catch (error) {
        console.error("Failed to persist message:", error);
      }
    }
  }, [sessionId, addMessageMutation]);

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
    } else if (existingConcept && typeof existingConcept === "object") {
      const concept = existingConcept as { title: string; description?: string | null; content: string; creator: string; source: string; year: string };
      setFormData({
        title: concept.title,
        description: concept.description ?? "",
        content: concept.content,
        creator: concept.creator || "",
        source: concept.source || "",
        year: concept.year || "",
      });
    }
  }, [existingConcept, initialData, isNewConcept]);

  // Initial analysis when concept loads (only if no existing messages)
  useEffect(() => {
    // Skip if we have loaded messages from session
    if (messages.length > 0) return;
    // Skip if session is still loading (for existing concepts)
    if (!isNewConcept && conceptId && !chatSession) return;
    
    if (formData.title && (isNewConcept || existingConcept)) {
      setIsAIThinking(true);
      analyzeMutation.mutate(formData, {
        onSuccess: (result) => {
          setIsAIThinking(false);
          const initialMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: "assistant" as const,
            content: result.initialMessage,
            timestamp: new Date(),
            suggestions: result.suggestions,
            actions: result.quickActions,
          };
          setMessages([initialMessage]);
          // Persist initial analysis message (only for existing concepts with session)
          if (sessionId) {
            void persistMessage(initialMessage);
          }
          setPendingSuggestions(result.suggestions);
          setQuickActions(result.quickActions);
        },
        onError: () => {
          setIsAIThinking(false);
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.title, isNewConcept, !!existingConcept, sessionId, messages.length, chatSession]);

  // Auto-save for existing concepts (every 30 seconds)
  useEffect(() => {
    if (!isNewConcept && hasUnsavedChanges && conceptId) {
      const timer = setTimeout(() => {
        updateMutation.mutate(
          {
            id: conceptId,
            title: formData.title,
            description: formData.description,
            content: formData.content,
            creator: formData.creator,
            source: formData.source,
            year: formData.year,
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
              conceptId: conceptId || "",
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
              conceptId: conceptId || "",
              currentDefinition: formData.description,
            });
            handleFormChange({ description: expanded.expandedDefinition });

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
              conceptId: conceptId || "",
              message: `Please ${action.label.toLowerCase()}`,
              history: messages,
            });
            setMessages((prev) => [
              ...prev,
              {
                id: `msg-${Date.now()}`,
                role: "assistant" as const,
                content: chatResult.content,
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
        role: "user" as const,
        content: message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      // Persist user message
      void persistMessage(userMessage);
      setIsAIThinking(true);

      try {
        const result = await chatMutation.mutateAsync({
          conceptId: conceptId || "",
          message,
          history: [...messages, userMessage],
        });

        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: "assistant" as const,
          content: result.content,
          timestamp: new Date(),
          suggestions: result.suggestions,
          actions: result.actions,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        // Persist assistant message
        void persistMessage(assistantMessage);
        if (result.suggestions) {
          setPendingSuggestions((prev) => [...prev, ...result.suggestions!]);
        }
        if (result.actions) {
          setQuickActions((prev) => [...prev, ...result.actions!]);
        }
      } catch (error) {
        const errorMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: "assistant" as const,
          content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        // Persist error message too
        void persistMessage(errorMessage);
      } finally {
        setIsAIThinking(false);
      }
    },
    [formData, messages, chatMutation, persistMessage],
  );

  const handleSave = useCallback(() => {
    if (isNewConcept) {
      createMutation.mutate(formData, {
        onSuccess: () => {
          // router.push("/?tab=concepts"); // TODO: Implement navigation in Electron app
          window.location.reload(); // Temporary: reload to go back
        },
      });
    } else if (conceptId) {
      updateMutation.mutate(
        {
          id: conceptId,
          title: formData.title,
          description: formData.description,
          content: formData.content,
          creator: formData.creator,
          source: formData.source,
          year: formData.year,
        },
        {
          onSuccess: () => {
            setHasUnsavedChanges(false);
            setLastSavedAt(new Date());
          },
        },
      );
    }
  }, [isNewConcept, conceptId, formData, createMutation, updateMutation]);

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
            onClick={() => window.history.back()} // Use browser history instead of Next.js router
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={createMutation.isLoading || updateMutation.isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {(createMutation.isLoading || updateMutation.isLoading) && <LoadingSpinner size="sm" />}
            <span>
              {createMutation.isLoading || updateMutation.isLoading
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

