"use client";

import { useState } from "react";
import type { Goal } from "@/lib/types/plan";
import { EditableField } from "./editable-field";
import { CitationBadge } from "./citation-badge";

interface GoalsSectionProps {
  goals: Goal[];
  onUpdateGoal: (goalId: string, field: keyof Goal, value: string) => Promise<void>;
  isEditable?: boolean;
}

export function GoalsSection({ goals, onUpdateGoal, isEditable = true }: GoalsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const shortTermGoals = goals.filter((g) => g.type === "short_term");
  const longTermGoals = goals.filter((g) => g.type === "long_term");

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

  const GoalCard = ({ goal }: { goal: Goal }) => (
    <div className="bg-white p-4 rounded-lg border border-sage-200 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1">
          <EditableField
            value={goal.goal}
            onSave={(value) => onUpdateGoal(goal.id, "goal", value)}
            disabled={!isEditable}
            className="flex-1"
          />
          <CitationBadge citations={goal.citations} className="flex-shrink-0 mt-0.5" />
        </div>
        {goal.target_date && (
          <span className="text-xs font-medium px-2 py-1 bg-sage-100 text-sage-600 rounded whitespace-nowrap">
            Target: {formatDate(goal.target_date)}
          </span>
        )}
      </div>
      <div className="pl-4 border-l-2 border-primary-200">
        <p className="text-xs text-sage-500 mb-1">Client-facing:</p>
        <EditableField
          value={goal.client_facing}
          onSave={(value) => onUpdateGoal(goal.id, "client_facing", value)}
          disabled={!isEditable}
        />
      </div>
    </div>
  );

  return (
    <div className="border border-sage-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-sage-50 flex items-center justify-between hover:bg-sage-100 transition-colors"
      >
        <h3 className="font-semibold text-sage-900">
          Goals ({goals.length})
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
        <div className="p-4 space-y-6">
          {shortTermGoals.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-sage-600 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Short-term Goals (1-4 weeks)
              </h4>
              <div className="space-y-3">
                {shortTermGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            </div>
          )}

          {longTermGoals.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-sage-600 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Long-term Goals (1-6 months)
              </h4>
              <div className="space-y-3">
                {longTermGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            </div>
          )}

          {goals.length === 0 && (
            <p className="text-sage-500 text-center py-4">No goals defined yet</p>
          )}
        </div>
      )}
    </div>
  );
}
