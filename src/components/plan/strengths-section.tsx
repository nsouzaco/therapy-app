"use client";

import { useState } from "react";
import type { Strength } from "@/lib/types/plan";
import { EditableField } from "./editable-field";

interface StrengthsSectionProps {
  strengths: Strength[];
  onUpdateStrength: (id: string, field: keyof Strength, value: string) => Promise<void>;
  isEditable?: boolean;
}

export function StrengthsSection({
  strengths,
  onUpdateStrength,
  isEditable = true,
}: StrengthsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border border-sage-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-sage-50 flex items-center justify-between hover:bg-sage-100 transition-colors"
      >
        <h3 className="font-semibold text-sage-900">
          Client Strengths ({strengths.length})
        </h3>
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
        <div className="p-4 grid gap-4 md:grid-cols-2">
          {strengths.map((strength) => (
            <div
              key={strength.id}
              className="bg-emerald-50 p-4 rounded-lg border border-emerald-200"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <EditableField
                    value={strength.strength}
                    onSave={(value) => onUpdateStrength(strength.id, "strength", value)}
                    disabled={!isEditable}
                    className="font-medium text-emerald-900 mb-2"
                  />
                  <div className="text-sm text-emerald-700">
                    <span className="text-emerald-600 font-medium">How to leverage: </span>
                    <EditableField
                      value={strength.how_to_leverage}
                      onSave={(value) =>
                        onUpdateStrength(strength.id, "how_to_leverage", value)
                      }
                      disabled={!isEditable}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {strengths.length === 0 && (
            <p className="text-sage-500 text-center py-4 md:col-span-2">
              No strengths identified yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}

