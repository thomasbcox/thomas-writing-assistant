"use client";

import { useState, useEffect } from "react";
import { api } from "~/hooks/useIPC";
import type { CapsuleWithAnchors, AnchorWithRepurposed } from "~/types/database";
import { safeJsonParseArray } from "~/lib/json-utils";

interface AnchorEditorProps {
  anchorId: string;
  onClose: () => void;
  onSave: () => void;
}

export function AnchorEditor({ anchorId, onClose, onSave }: AnchorEditorProps) {
  // Get anchor from the capsule query
  // Need full data to find the anchor being edited
  const { data: capsules } = api.capsule.list.useQuery({ summary: false });
  const anchor = capsules
    ?.flatMap((c) => c.anchors || [])
    .find((a) => a.id === anchorId);

  const updateMutation = api.capsule.updateAnchor.useMutation({
    onSuccess: () => {
      onSave();
      onClose();
    },
  });

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    painPoints: [] as string[],
    solutionSteps: [] as string[],
    proof: "",
  });

  useEffect(() => {
    if (anchor) {
      setFormData({
        title: anchor.title,
        content: anchor.content,
        painPoints: safeJsonParseArray<string>(anchor.painPoints, []),
        solutionSteps: safeJsonParseArray<string>(anchor.solutionSteps, []),
        proof: anchor.proof || "",
      });
    }
  }, [anchor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: anchorId,
      ...formData,
    });
  };

  const addPainPoint = () => {
    setFormData({
      ...formData,
      painPoints: [...formData.painPoints, ""],
    });
  };

  const removePainPoint = (index: number) => {
    setFormData({
      ...formData,
      painPoints: formData.painPoints.filter((_, i) => i !== index),
    });
  };

  const updatePainPoint = (index: number, value: string) => {
    const newPainPoints = [...formData.painPoints];
    newPainPoints[index] = value;
    setFormData({ ...formData, painPoints: newPainPoints });
  };

  const addSolutionStep = () => {
    setFormData({
      ...formData,
      solutionSteps: [...formData.solutionSteps, ""],
    });
  };

  const removeSolutionStep = (index: number) => {
    setFormData({
      ...formData,
      solutionSteps: formData.solutionSteps.filter((_, i) => i !== index),
    });
  };

  const updateSolutionStep = (index: number, value: string) => {
    const newSolutionSteps = [...formData.solutionSteps];
    newSolutionSteps[index] = value;
    setFormData({ ...formData, solutionSteps: newSolutionSteps });
  };

  if (!anchor) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-semibold mb-5">Edit Anchor Post</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content
            </label>
            <textarea
              required
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              rows={12}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Pain Points
              </label>
              <button
                type="button"
                onClick={addPainPoint}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + Add
              </button>
            </div>
            <div className="space-y-2">
              {formData.painPoints.map((point, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={point}
                    onChange={(e) => updatePainPoint(index, e.target.value)}
                    placeholder="Pain point"
                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removePainPoint(index)}
                    className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
              {formData.painPoints.length === 0 && (
                <p className="text-sm text-gray-500">No pain points added</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Solution Steps
              </label>
              <button
                type="button"
                onClick={addSolutionStep}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + Add
              </button>
            </div>
            <div className="space-y-2">
              {formData.solutionSteps.map((step, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => updateSolutionStep(index, e.target.value)}
                    placeholder="Solution step"
                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeSolutionStep(index)}
                    className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
              {formData.solutionSteps.length === 0 && (
                <p className="text-sm text-gray-500">No solution steps added</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proof (optional)
            </label>
            <textarea
              value={formData.proof}
              onChange={(e) =>
                setFormData({ ...formData, proof: e.target.value })
              }
              rows={3}
              placeholder="Proof points, statistics, or evidence"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {updateMutation.isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

