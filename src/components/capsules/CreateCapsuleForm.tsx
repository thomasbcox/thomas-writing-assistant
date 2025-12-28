"use client";

import { useState } from "react";
import { api } from "~/hooks/useIPC";

interface CreateCapsuleFormProps {
  onSuccess?: () => void;
}

export function CreateCapsuleForm({ onSuccess }: CreateCapsuleFormProps) {
  const [showForm, setShowForm] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    title: "",
    promise: "",
    cta: "",
    offerMapping: "",
  });

  const createCapsuleMutation = api.capsule.create.useMutation({
    onSuccess: () => {
      setFormData({ title: "", promise: "", cta: "", offerMapping: "" });
      setShowForm(false);
      onSuccess?.();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCapsuleMutation.mutate({
      title: formData.title,
      promise: formData.promise,
      cta: formData.cta,
      offerMapping: formData.offerMapping || undefined,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold">Create New Capsule</h2>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          {showForm ? "Hide Form" : "Show Form"}
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-5">
              Title/Topic
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-5">
              Promise
            </label>
            <textarea
              required
              value={formData.promise}
              onChange={(e) =>
                setFormData({ ...formData, promise: e.target.value })
              }
              rows={3}
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-5">
              CTA (Call-to-Action)
            </label>
            <input
              type="text"
              required
              value={formData.cta}
              onChange={(e) =>
                setFormData({ ...formData, cta: e.target.value })
              }
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-5">
              Offer Mapping (optional)
            </label>
            <input
              type="text"
              value={formData.offerMapping}
              onChange={(e) =>
                setFormData({ ...formData, offerMapping: e.target.value })
              }
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={createCapsuleMutation.isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {createCapsuleMutation.isLoading ? "Creating..." : "Create Capsule"}
          </button>
        </form>
      )}
    </div>
  );
}

