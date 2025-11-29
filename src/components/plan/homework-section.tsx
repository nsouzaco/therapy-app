"use client";

import { useState } from "react";
import type { Homework } from "@/lib/types/plan";
import { EditableField } from "./editable-field";

interface HomeworkSectionProps {
  homework: Homework[];
  onUpdateHomework: (id: string, field: keyof Homework, value: string) => Promise<void>;
  isEditable?: boolean;
}

export function HomeworkSection({
  homework,
  onUpdateHomework,
  isEditable = true,
}: HomeworkSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="border border-sage-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-sage-50 flex items-center justify-between hover:bg-sage-100 transition-colors"
      >
        <h3 className="font-semibold text-sage-900">
          Homework ({homework.length})
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
        <div className="p-4 space-y-4">
          {homework.map((item) => (
            <div
              key={item.id}
              className="bg-white p-4 rounded-lg border border-sage-200"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                  <svg
                    className="w-3.5 h-3.5 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <EditableField
                      value={item.task}
                      onSave={(value) => onUpdateHomework(item.id, "task", value)}
                      disabled={!isEditable}
                      className="font-medium text-sage-900"
                    />
                    {item.due_date && (
                      <span className="text-xs font-medium px-2 py-1 bg-amber-100 text-amber-700 rounded whitespace-nowrap">
                        Due: {formatDate(item.due_date)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-sage-600">
                    <span className="text-sage-500">Purpose: </span>
                    <EditableField
                      value={item.purpose}
                      onSave={(value) => onUpdateHomework(item.id, "purpose", value)}
                      disabled={!isEditable}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {homework.length === 0 && (
            <p className="text-sage-500 text-center py-4">
              No homework assignments yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}

