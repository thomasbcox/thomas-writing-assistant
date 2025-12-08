"use client";

import { useState } from "react";

interface ContextualHelpProps {
  title: string;
  content: string | React.ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
}

export function ContextualHelp({ title, content, placement = "bottom" }: ContextualHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  const placementClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 text-xs font-bold transition-colors"
        aria-label="Help"
      >
        ?
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={`absolute z-50 w-64 p-4 bg-white border-2 border-blue-200 rounded-lg shadow-xl ${placementClasses[placement]}`}
          >
            <div className="flex items-start justify-between mb-5">
              <h4 className="text-sm font-bold text-gray-900">{title}</h4>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="text-sm text-gray-700 leading-relaxed">
              {content}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

