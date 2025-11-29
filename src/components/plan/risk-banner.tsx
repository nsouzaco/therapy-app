"use client";

import { useState } from "react";
import type { RiskFactors } from "@/lib/types/plan";

interface RiskBannerProps {
  riskFactors: RiskFactors;
}

export function RiskBanner({ riskFactors }: RiskBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (riskFactors.level === "low" && riskFactors.flags.length === 0) {
    return null;
  }

  const levelColors = {
    low: "bg-emerald-50 border-emerald-200 text-emerald-800",
    moderate: "bg-amber-50 border-amber-200 text-amber-800",
    high: "bg-red-50 border-red-200 text-red-800",
  };

  const levelIcons = {
    low: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    moderate: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    high: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className={`rounded-lg border p-4 ${levelColors[riskFactors.level]}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {levelIcons[riskFactors.level]}
          <div>
            <h3 className="font-semibold">
              Risk Level: {riskFactors.level.charAt(0).toUpperCase() + riskFactors.level.slice(1)}
            </h3>
            <p className="text-sm mt-1">
              {riskFactors.flags.length} risk indicator{riskFactors.flags.length !== 1 ? "s" : ""} detected
              {riskFactors.safety_plan_needed && " • Safety plan recommended"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm font-medium hover:underline flex items-center gap-1"
        >
          {isExpanded ? "Hide" : "Show"} details
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3 border-t pt-4 border-current/20">
          {riskFactors.flags.map((flag, index) => (
            <div key={index} className="pl-8">
              <h4 className="font-medium text-sm">{flag.category}</h4>
              <p className="text-sm opacity-90">{flag.description}</p>
              {flag.detected_keywords && flag.detected_keywords.length > 0 && (
                <p className="text-xs mt-1 opacity-75">
                  Keywords: {flag.detected_keywords.join(", ")}
                </p>
              )}
            </div>
          ))}
          {riskFactors.notes && (
            <div className="pl-8 pt-2 border-t border-current/20">
              <h4 className="font-medium text-sm">Clinical Notes</h4>
              <p className="text-sm opacity-90">{riskFactors.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

