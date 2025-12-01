"use client";

import { useState } from "react";
import type { Intervention } from "@/lib/types/plan";
import { EditableField } from "./editable-field";
import { CitationBadge } from "./citation-badge";

interface InterventionsSectionProps {
  interventions: Intervention[];
  onUpdateIntervention: (
    id: string,
    field: keyof Intervention,
    value: string
  ) => Promise<void>;
  isEditable?: boolean;
}

export function InterventionsSection({
  interventions,
  onUpdateIntervention,
  isEditable = true,
}: InterventionsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border border-sage-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-sage-50 flex items-center justify-between hover:bg-sage-100 transition-colors"
      >
        <h3 className="font-semibold text-sage-900">
          Interventions ({interventions.length})
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
          {interventions.map((intervention) => (
            <div
              key={intervention.id}
              className="bg-white p-4 rounded-lg border border-sage-200"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-2 flex-1">
                  <EditableField
                    value={intervention.name}
                    onSave={(value) =>
                      onUpdateIntervention(intervention.id, "name", value)
                    }
                    disabled={!isEditable}
                    className="font-medium text-sage-900"
                  />
                  <CitationBadge citations={intervention.citations} className="flex-shrink-0 mt-0.5" />
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-primary-100 text-primary-700 rounded whitespace-nowrap">
                  {intervention.frequency}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="bg-sage-50 p-3 rounded-lg">
                  <p className="text-xs text-sage-500 mb-1">Clinical Description</p>
                  <EditableField
                    value={intervention.description}
                    onSave={(value) =>
                      onUpdateIntervention(intervention.id, "description", value)
                    }
                    multiline
                    disabled={!isEditable}
                  />
                </div>

                <div className="bg-primary-50/30 p-3 rounded-lg">
                  <p className="text-xs text-sage-500 mb-1">Client-Facing</p>
                  <EditableField
                    value={intervention.client_facing}
                    onSave={(value) =>
                      onUpdateIntervention(intervention.id, "client_facing", value)
                    }
                    multiline
                    disabled={!isEditable}
                  />
                </div>
              </div>
            </div>
          ))}

          {interventions.length === 0 && (
            <p className="text-sage-500 text-center py-4">
              No interventions defined yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}
