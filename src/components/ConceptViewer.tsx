"use client";

interface ConceptViewerProps {
  concept: {
    id: string;
    title: string;
    description: string | null;
    content: string;
    creator: string;
    source: string;
    year: string;
    createdAt: Date | string;
    updatedAt: Date | string;
  };
  onClose: () => void;
}

export function ConceptViewer({ concept, onClose }: ConceptViewerProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-5">
          <h2 className="text-2xl font-semibold">{concept.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        {concept.description && (
          <p className="text-gray-600 italic mb-5">{concept.description}</p>
        )}
        <div className="text-sm text-gray-500 mb-5">
          {concept.creator} | {concept.source} | {concept.year}
        </div>
        <div className="prose max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-gray-800">
            {concept.content}
          </pre>
        </div>
      </div>
    </div>
  );
}

