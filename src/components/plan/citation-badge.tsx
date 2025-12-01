"use client";

import { useState, useRef, useEffect } from "react";
import type { Citation } from "@/lib/types/plan";

interface CitationBadgeProps {
  citations?: Citation[];
  className?: string;
}

export function CitationBadge({ citations, className = "" }: CitationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Update position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: Math.min(rect.bottom + 8, window.innerHeight - 340),
        left: Math.max(8, Math.min(rect.left - 150, window.innerWidth - 400)),
      });
    }
  }, [isOpen]);

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

  // Count sources by type
  const transcriptCount = citations.filter(c => !c.source || c.source === "transcript").length;
  const knowledgeBaseCount = citations.filter(c => c.source === "knowledge_base").length;

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded transition-colors"
        title="View evidence"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {citations.length} source{citations.length > 1 ? "s" : ""}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="fixed z-[100] w-96 max-h-80 overflow-y-auto bg-white rounded-lg shadow-xl border border-sage-200 p-4"
          style={{ top: position.top, left: position.left }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-sage-900">
              Evidence Sources
            </h4>
            <button
              onClick={() => setIsOpen(false)}
              className="text-sage-400 hover:text-sage-600 p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Source type counts */}
          <div className="flex gap-2 mb-3 text-xs">
            {transcriptCount > 0 && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                {transcriptCount} from session
              </span>
            )}
            {knowledgeBaseCount > 0 && (
              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">
                {knowledgeBaseCount} from knowledge base
              </span>
            )}
          </div>

          <div className="space-y-3">
            {citations.map((citation, index) => {
              const isKnowledgeBase = citation.source === "knowledge_base";
              return (
                <div key={index} className="text-sm">
                  {/* Source label */}
                  <div className="flex items-center gap-1.5 mb-1">
                    {isKnowledgeBase ? (
                      <>
                        <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span className="text-xs font-medium text-purple-700">
                          {citation.document_title || "Knowledge Base"}
                        </span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="text-xs font-medium text-blue-700">Session Transcript</span>
                      </>
                    )}
                  </div>
                  <blockquote className={`border-l-2 pl-3 py-2 text-sage-700 italic rounded-r ${
                    isKnowledgeBase 
                      ? "border-purple-300 bg-purple-50" 
                      : "border-blue-300 bg-blue-50"
                  }`}>
                    &ldquo;{citation.excerpt}&rdquo;
                  </blockquote>
                  {citation.context && (
                    <p className="mt-1.5 text-xs text-sage-500 pl-3">
                      {citation.context}
                    </p>
                  )}
                </div>
              );
            })}
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

