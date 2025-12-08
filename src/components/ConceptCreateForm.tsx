"use client";

import { useState } from "react";
import { LoadingSpinner } from "./ui/LoadingSpinner";

interface ConceptCreateFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    content: string;
    creator: string;
    source: string;
    year: string;
  }) => void;
  isPending: boolean;
}

export function ConceptCreateForm({ onSubmit, isPending }: ConceptCreateFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    creator: "",
    source: "",
    year: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      return;
    }
    onSubmit(formData);
    // Reset form after submission
    setFormData({
      title: "",
      description: "",
      content: "",
      creator: "",
      source: "",
      year: "",
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-5">Create New Concept</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-5">
            Title
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-base"
            disabled={isPending}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-5">
            Short Description
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-base"
            disabled={isPending}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-5">
            Content
          </label>
          <textarea
            required
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            rows={8}
            className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-base"
            disabled={isPending}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-5">
              Creator
            </label>
            <input
              type="text"
              required
              value={formData.creator}
              onChange={(e) =>
                setFormData({ ...formData, creator: e.target.value })
              }
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-base"
              disabled={isPending}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-5">
              Source
            </label>
            <input
              type="text"
              required
              value={formData.source}
              onChange={(e) =>
                setFormData({ ...formData, source: e.target.value })
              }
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-base"
              disabled={isPending}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-5">
              Year
            </label>
            <input
              type="text"
              required
              value={formData.year}
              onChange={(e) =>
                setFormData({ ...formData, year: e.target.value })
              }
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-base"
              disabled={isPending}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
        >
          {isPending && <LoadingSpinner size="sm" />}
          {isPending ? "Creating..." : "Create Concept"}
        </button>
      </form>
    </div>
  );
}

