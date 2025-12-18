"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage, QuickAction } from "~/server/services/conceptEnricher";

interface EnrichmentChatPanelProps {
  messages: ChatMessage[];
  quickActions: QuickAction[];
  isAIThinking: boolean;
  onSendMessage: (message: string) => void;
  onQuickAction: (action: QuickAction) => void;
}

export function EnrichmentChatPanel({
  messages,
  quickActions,
  isAIThinking,
  onSendMessage,
  onQuickAction,
}: EnrichmentChatPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAIThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isAIThinking) {
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">AI Assistant</h2>
        <p className="text-sm text-gray-500">Chat with AI to enrich your concept</p>
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Quick Actions
          </div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => onQuickAction(action)}
                disabled={isAIThinking}
                className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title={action.description}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !isAIThinking && (
          <div className="text-center text-gray-500 mt-8">
            <p>Start a conversation to enrich your concept!</p>
            <p className="text-sm mt-2">Try asking: "Who created this?" or "Can you expand the definition?"</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-2 text-xs opacity-75">
                  {message.suggestions.length} suggestion(s) available
                </div>
              )}
            </div>
          </div>
        ))}

        {isAIThinking && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="animate-pulse">●</div>
                <span className="text-gray-600">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            disabled={isAIThinking}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isAIThinking}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

