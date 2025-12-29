"use client";

import { useState, useCallback } from "react";
import { useConceptList } from "~/lib/api/concepts";
import { useGenerateBlogPost } from "~/lib/api/blog-posts";
import { ToastContainer, type ToastType } from "./ui/Toast";
import { ContextualHelp } from "./ui/ContextualHelp";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import type { BlogPost } from "~/server/services/blogPostGenerator";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export function BlogPostsTab() {
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [selectedConceptIds, setSelectedConceptIds] = useState<Set<string>>(new Set());
  const [targetLength, setTargetLength] = useState<"short" | "medium" | "long">("medium");
  const [tone, setTone] = useState<"informative" | "conversational" | "authoritative" | "personal">("conversational");
  const [includeCTA, setIncludeCTA] = useState(false);
  const [ctaText, setCtaText] = useState("");
  const [generatedPost, setGeneratedPost] = useState<BlogPost | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const { data: concepts, isLoading: conceptsLoading } = useConceptList({
    includeTrash: false,
  });

  const generateMutation = useGenerateBlogPost();

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleConcept = (conceptId: string) => {
    setSelectedConceptIds((prev) => {
      const next = new Set(prev);
      if (next.has(conceptId)) {
        next.delete(conceptId);
      } else {
        next.add(conceptId);
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      addToast("Please enter a topic", "error");
      return;
    }

    if (selectedConceptIds.size === 0) {
      addToast("Please select at least one concept", "error");
      return;
    }

    try {
      const data = await generateMutation.mutateAsync({
        topic: topic.trim(),
        title: title.trim() || undefined,
        conceptIds: Array.from(selectedConceptIds),
        targetLength,
        tone,
        includeCTA,
        ctaText: ctaText.trim() || undefined,
      });
      setGeneratedPost(data);
      addToast("Blog post generated successfully!", "success");
    } catch (error: any) {
      addToast(error.message || "Failed to generate blog post", "error");
    }
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast("Copied to clipboard!", "success");
    } catch (error) {
      addToast("Failed to copy to clipboard", "error");
    }
  };

  const handleCopyFullPost = () => {
    if (!generatedPost) return;
    const fullPost = `${generatedPost.title}\n\n${generatedPost.introduction}\n\n${generatedPost.body}\n\n${generatedPost.conclusion}${generatedPost.cta ? `\n\n${generatedPost.cta}` : ""}`;
    handleCopyToClipboard(fullPost);
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="space-y-8">
        {/* Generation Form */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-10">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-bold text-gray-900">Generate Blog Post</h2>
            <ContextualHelp
              title="Blog Post Generation"
              content="Generate complete blog posts from your knowledge base concepts. Select concepts to weave together, set your topic and preferences, and the AI will create a cohesive blog post that maintains your unique voice, values, and style."
            />
          </div>

          <div className="space-y-6">
            {/* Topic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., 'How to build effective writing habits'"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                The main theme or subject of your blog post
              </p>
            </div>

            {/* Optional Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Leave empty to let AI generate a title"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Concept Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Concepts <span className="text-red-500">*</span>
              </label>
              {conceptsLoading ? (
                <LoadingSpinner />
              ) : (
                <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-4 space-y-2">
                  {concepts && Array.isArray(concepts) && concepts.length > 0 ? (
                    concepts.map((concept: any) => (
                      <label
                        key={concept.id}
                        className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedConceptIds.has(concept.id)}
                          onChange={() => toggleConcept(concept.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{concept.title}</div>
                          {concept.description && (
                            <div className="text-sm text-gray-600 mt-1">
                              {concept.description.slice(0, 100)}
                              {concept.description.length > 100 ? "..." : ""}
                            </div>
                          )}
                        </div>
                      </label>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      No concepts available. Create concepts first in the Concepts tab.
                    </p>
                  )}
                </div>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Selected: {selectedConceptIds.size} concept{selectedConceptIds.size !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Target Length */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Length
              </label>
              <div className="flex gap-4">
                {(["short", "medium", "long"] as const).map((length) => (
                  <label key={length} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="targetLength"
                      value={length}
                      checked={targetLength === length}
                      onChange={() => setTargetLength(length)}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {length} ({length === "short" ? "~500-800" : length === "medium" ? "~1500-2000" : "~3000-4000"} words)
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as typeof tone)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="informative">Informative</option>
                <option value="conversational">Conversational</option>
                <option value="authoritative">Authoritative</option>
                <option value="personal">Personal</option>
              </select>
            </div>

            {/* CTA */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCTA}
                  onChange={(e) => setIncludeCTA(e.target.checked)}
                  className="text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">Include Call-to-Action</span>
              </label>
              {includeCTA && (
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Custom CTA text (optional)"
                  className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              )}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={generateMutation.isLoading || !topic.trim() || selectedConceptIds.size === 0}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {generateMutation.isLoading ? "Generating..." : "Generate Blog Post"}
            </button>
          </div>
        </div>

        {/* Generated Post */}
        {generatedPost && (
          <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Generated Blog Post</h2>
              <button
                onClick={handleCopyFullPost}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Copy Full Post
              </button>
            </div>

            <div className="space-y-6">
              {/* Title */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{generatedPost.title}</h3>
                <button
                  onClick={() => handleCopyToClipboard(generatedPost.title)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Copy title
                </button>
              </div>

              {/* Introduction */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-2">Introduction</h4>
                <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                  {generatedPost.introduction}
                </div>
                <button
                  onClick={() => handleCopyToClipboard(generatedPost.introduction)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Copy introduction
                </button>
              </div>

              {/* Body */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-2">Body</h4>
                <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                  {generatedPost.body}
                </div>
                <button
                  onClick={() => handleCopyToClipboard(generatedPost.body)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Copy body
                </button>
              </div>

              {/* Conclusion */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-2">Conclusion</h4>
                <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                  {generatedPost.conclusion}
                </div>
                <button
                  onClick={() => handleCopyToClipboard(generatedPost.conclusion)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Copy conclusion
                </button>
              </div>

              {/* CTA */}
              {generatedPost.cta && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">Call-to-Action</h4>
                  <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                    {generatedPost.cta}
                  </div>
                  <button
                    onClick={() => handleCopyToClipboard(generatedPost.cta!)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    Copy CTA
                  </button>
                </div>
              )}

              {/* Metadata */}
              {generatedPost.metadata && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Estimated word count: {generatedPost.metadata.estimatedWordCount} | Tone:{" "}
                    {generatedPost.metadata.tone} | Concepts referenced:{" "}
                    {generatedPost.metadata.conceptsReferenced.length}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
