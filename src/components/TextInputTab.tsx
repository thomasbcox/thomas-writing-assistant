"use client";

import { useState, useEffect } from "react";
import { api } from "~/hooks/useIPC";
import { ConceptCandidateList } from "./ConceptCandidateList";
import { ContextualHelp } from "./ui/ContextualHelp";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { ToastContainer, useToast } from "./ui/Toast";
import { PDFUploader } from "./PDFUploader";
import { TextInputForm } from "./TextInputForm";
import { ConceptGenerationStatus } from "./ConceptGenerationStatus";

export function TextInputTab() {
  const [text, setText] = useState("");
  const [instructions, setInstructions] = useState("");
  const [maxCandidates, setMaxCandidates] = useState(5);
  const [defaultCreator, setDefaultCreator] = useState("");
  const [defaultYear, setDefaultYear] = useState("");
  const [candidates, setCandidates] = useState<
    Array<{
      title: string;
      content: string;
      summary: string;
      description?: string;
    }>
  >([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const { toasts, addToast, removeToast } = useToast();

  // Clear all tab state
  const handleClear = () => {
    setText("");
    setInstructions("");
    setMaxCandidates(5);
    setDefaultCreator("");
    setDefaultYear("");
    setCandidates([]);
    setIsGenerating(false);
    setGenerationStartTime(null);
    setElapsedTime(0);
    addToast("Tab cleared", "success");
  };

  const generateMutation = api.concept.generateCandidates.useMutation({
    onSuccess: (result) => {
      setCandidates(result);
      addToast(
        `Successfully generated ${result.length} concept candidate${result.length !== 1 ? "s" : ""}`,
        "success",
      );
    },
    onError: (error) => {
      addToast(
        error.message || "Error generating candidates. Please try again.",
        "error",
      );
    },
  });
  // Timer for generation progress
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isGenerating && generationStartTime !== null) {
      timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - generationStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isGenerating, generationStartTime]);

  const handleTextExtracted = (extractedText: string, fileName: string) => {
    setText(extractedText);
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      addToast("Please enter or upload text first", "error");
      return;
    }

    setIsGenerating(true);
    setGenerationStartTime(Date.now());
    setElapsedTime(0);

    try {
      // Add timeout wrapper (5 minutes max for large PDFs)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                "Request timed out after 5 minutes. The document may be too large. Try reducing the text or splitting it into smaller sections.",
              ),
            ),
          5 * 60 * 1000,
        );
      });

      // The mutation's onSuccess and onError handlers will show toasts
      await Promise.race([
        generateMutation.mutateAsync({
          text,
          instructions: instructions || undefined,
          maxCandidates,
          defaultCreator: defaultCreator || undefined,
          defaultYear: defaultYear || undefined,
        }),
        timeoutPromise,
      ]);
    } catch (error) {
      // Error is handled by onError callback, but we need to catch to prevent unhandled rejection
      // Error is already logged by the mutation's onError handler
      if (error instanceof Error && error.message.includes("timed out")) {
        addToast(error.message, "error");
      }
    } finally {
      setIsGenerating(false);
      setGenerationStartTime(null);
      setElapsedTime(0);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="flex justify-end mb-2">
        <button
          onClick={handleClear}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
          title="Clear all inputs and candidates"
        >
          Clear
        </button>
      </div>
      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-10">
        <div className="flex items-center gap-3 mb-8">
          <h2 className="text-xl font-bold text-gray-900">Input</h2>
          <ContextualHelp
            title="Processing Text and PDFs"
            content="Paste text, upload a .txt file, or upload a .pdf file to extract concepts. PDFs will be processed to extract text first, then the AI will analyze the content and suggest concept candidates. You can provide instructions to guide the extraction process, such as focusing on specific themes or grouping related ideas."
          />
        </div>

        <PDFUploader
          onTextExtracted={handleTextExtracted}
          onError={addToast}
          disabled={isGenerating}
        />

        <TextInputForm
          text={text}
          onTextChange={(newText) => setText(newText)}
          instructions={instructions}
          onInstructionsChange={setInstructions}
          maxCandidates={maxCandidates}
          onMaxCandidatesChange={setMaxCandidates}
          defaultCreator={defaultCreator}
          onDefaultCreatorChange={setDefaultCreator}
          defaultYear={defaultYear}
          onDefaultYearChange={setDefaultYear}
          disabled={isGenerating}
        />

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !text.trim()}
          className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg text-base flex items-center gap-2"
        >
          {isGenerating && <LoadingSpinner size="sm" />}
          <span>
            {isGenerating ? "Generating Concepts..." : "Generate Concepts"}
            {isGenerating && elapsedTime >= 5 && ` (${elapsedTime}s)`}
          </span>
        </button>

        <ConceptGenerationStatus
          isGenerating={isGenerating}
          elapsedTime={elapsedTime}
        />
      </div>

      {candidates.length > 0 && (
        <ConceptCandidateList
          candidates={candidates}
          defaultCreator={defaultCreator}
          defaultYear={defaultYear}
          onCandidateAccepted={(index) => {
            setCandidates((prev) => prev.filter((_, i) => i !== index));
          }}
        />
      )}
      </div>
    </>
  );
}
