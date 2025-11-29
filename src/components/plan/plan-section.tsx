"use client";

import { useState } from "react";
import { EditableField } from "./editable-field";

interface PlanSectionProps {
  title: string;
  clinicalContent: string;
  clientContent: string;
  onSaveClinical: (value: string) => Promise<void>;
  onSaveClient: (value: string) => Promise<void>;
  isEditable?: boolean;
  defaultExpanded?: boolean;
}

export function PlanSection({
  title,
  clinicalContent,
  clientContent,
  onSaveClinical,
  onSaveClient,
  isEditable = true,
  defaultExpanded = true,
}: PlanSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-sage-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-sage-50 flex items-center justify-between hover:bg-sage-100 transition-colors"
      >
        <h3 className="font-semibold text-sage-900">{title}</h3>
        <svg
          className={`w-5 h-5 text-sage-500 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-white p-4 rounded-lg border border-sage-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium px-2 py-0.5 bg-sage-100 text-sage-600 rounded">
                  Clinical
                </span>
              </div>
              <EditableField
                value={clinicalContent}
                onSave={onSaveClinical}
                multiline
                disabled={!isEditable}
              />
            </div>

            <div className="bg-primary-50/30 p-4 rounded-lg border border-primary-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium px-2 py-0.5 bg-primary-100 text-primary-700 rounded">
                  Client-Facing
                </span>
              </div>
              <EditableField
                value={clientContent}
                onSave={onSaveClient}
                multiline
                disabled={!isEditable}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

