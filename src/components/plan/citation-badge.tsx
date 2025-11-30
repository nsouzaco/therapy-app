"use client";

import { useState, useRef, useEffect } from "react";
import type { Citation } from "@/lib/types/plan";

interface CitationBadgeProps {
  citations?: Citation[];
  className?: string;
}

export function CitationBadge({ citations, className = "" }: CitationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded transition-colors"
        title="View transcript evidence"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {citations.length} source{citations.length > 1 ? "s" : ""}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute z-50 mt-1 top-full left-0 w-80 max-h-64 overflow-y-auto bg-white rounded-lg shadow-lg border border-sage-200 p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-sage-900">
              Transcript Evidence
            </h4>
            <button
              onClick={() => setIsOpen(false)}
              className="text-sage-400 hover:text-sage-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-3">
            {citations.map((citation, index) => (
              <div key={index} className="text-sm">
                <blockquote className="border-l-2 border-primary-300 pl-3 py-1 text-sage-700 italic bg-sage-50 rounded-r">
                  &ldquo;{citation.excerpt}&rdquo;
                </blockquote>
                {citation.context && (
                  <p className="mt-1 text-xs text-sage-500 pl-3">
                    {citation.context}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper component that adds citation badge to any content
interface WithCitationsProps {
  citations?: Citation[];
  children: React.ReactNode;
  className?: string;
}

export function WithCitations({ citations, children, className = "" }: WithCitationsProps) {
  const hasCitations = citations && citations.length > 0;
  
  return (
    <div className={`group ${className}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1">{children}</div>
        {hasCitations && (
          <CitationBadge citations={citations} className="flex-shrink-0 mt-0.5" />
        )}
      </div>
    </div>
  );
}

