"use client";

interface TextInputFormProps {
  text: string;
  onTextChange: (text: string) => void;
  instructions: string;
  onInstructionsChange: (instructions: string) => void;
  maxCandidates: number;
  onMaxCandidatesChange: (max: number) => void;
  defaultCreator: string;
  onDefaultCreatorChange: (creator: string) => void;
  defaultYear: string;
  onDefaultYearChange: (year: string) => void;
  disabled?: boolean;
}

export function TextInputForm({
  text,
  onTextChange,
  instructions,
  onInstructionsChange,
  maxCandidates,
  onMaxCandidatesChange,
  defaultCreator,
  onDefaultCreatorChange,
  defaultYear,
  onDefaultYearChange,
  disabled = false,
}: TextInputFormProps) {
  return (
    <>
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-900 mb-5">
          Or Paste Text
        </label>
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          rows={12}
          placeholder="Paste your text here, or upload a file above..."
          className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base leading-relaxed"
          disabled={disabled}
        />
        {text && (
          <div className="mt-2 text-xs text-gray-500">
            {text.length.toLocaleString()} characters
          </div>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-900 mb-5">
          Instructions (optional)
        </label>
        <textarea
          value={instructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
          rows={4}
          placeholder="How should the AI process this text? (e.g., 'Focus on extracting distinct mental models', 'Group related concepts together')"
          className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base leading-relaxed"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-5">
            Max Concepts
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={maxCandidates}
            onChange={(e) => onMaxCandidatesChange(parseInt(e.target.value) || 5)}
            className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-5">
            Default Creator
          </label>
          <input
            type="text"
            value={defaultCreator}
            onChange={(e) => onDefaultCreatorChange(e.target.value)}
            placeholder="Author name"
            className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-5">
            Default Year
          </label>
          <input
            type="text"
            value={defaultYear}
            onChange={(e) => onDefaultYearChange(e.target.value)}
            placeholder="Year"
            className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            disabled={disabled}
          />
        </div>
      </div>
    </>
  );
}

