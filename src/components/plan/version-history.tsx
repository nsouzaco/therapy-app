"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { PlanDiff, DiffType, FieldDiff, ArrayItemDiff } from "@/lib/utils/diff-plans";

interface Version {
  id: string;
  version_number: number;
  status: string;
  created_at: string;
  source_session_date?: string;
  diff_summary: string;
  is_first_version: boolean;
}

interface VersionHistoryProps {
  planId: string;
  currentVersionId: string;
  onClose: () => void;
}

export function VersionHistory({ planId, currentVersionId, onClose }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVersions, setSelectedVersions] = useState<[string | null, string | null]>([null, null]);
  const [diff, setDiff] = useState<PlanDiff | null>(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, [planId]);

  const fetchVersions = async () => {
    try {
      const response = await fetch(`/api/plans/${planId}/versions`);
      const data = await response.json();
      setVersions(data.versions || []);
      
      // Pre-select latest two versions for comparison
      if (data.versions?.length >= 2) {
        setSelectedVersions([data.versions[1].id, data.versions[0].id]);
      }
    } catch (error) {
      console.error("Failed to fetch versions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!selectedVersions[0] || !selectedVersions[1]) return;
    
    setIsLoadingDiff(true);
    try {
      const response = await fetch(
        `/api/plans/${planId}/compare?v1=${selectedVersions[0]}&v2=${selectedVersions[1]}`
      );
      const data = await response.json();
      setDiff(data.diff);
    } catch (error) {
      console.error("Failed to compare versions:", error);
    } finally {
      setIsLoadingDiff(false);
    }
  };

  useEffect(() => {
    if (selectedVersions[0] && selectedVersions[1]) {
      handleCompare();
    }
  }, [selectedVersions]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDiffColor = (type: DiffType) => {
    switch (type) {
      case "added": return "bg-green-50 border-green-200 text-green-800";
      case "removed": return "bg-red-50 border-red-200 text-red-800";
      case "changed": return "bg-amber-50 border-amber-200 text-amber-800";
      default: return "bg-sage-50 border-sage-200 text-sage-700";
    }
  };

  const getDiffBadge = (type: DiffType) => {
    switch (type) {
      case "added": return <span className="px-1.5 py-0.5 text-xs rounded bg-green-100 text-green-700">Added</span>;
      case "removed": return <span className="px-1.5 py-0.5 text-xs rounded bg-red-100 text-red-700">Removed</span>;
      case "changed": return <span className="px-1.5 py-0.5 text-xs rounded bg-amber-100 text-amber-700">Changed</span>;
      default: return null;
    }
  };

  const renderFieldDiff = (label: string, fieldDiff: FieldDiff) => {
    if (fieldDiff.type === "unchanged") return null;
    
    return (
      <div className={`p-3 rounded-lg border ${getDiffColor(fieldDiff.type)} mb-2`}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-sm">{label}</span>
          {getDiffBadge(fieldDiff.type)}
        </div>
        {fieldDiff.type === "changed" && (
          <div className="space-y-1 text-sm">
            <div className="line-through text-red-600/70">{fieldDiff.oldValue}</div>
            <div className="text-green-700">{fieldDiff.newValue}</div>
          </div>
        )}
        {fieldDiff.type === "added" && (
          <div className="text-sm text-green-700">{fieldDiff.newValue}</div>
        )}
        {fieldDiff.type === "removed" && (
          <div className="text-sm line-through text-red-600/70">{fieldDiff.oldValue}</div>
        )}
      </div>
    );
  };

  const renderArrayDiff = <T extends { id: string }>(
    title: string,
    items: ArrayItemDiff<T>[],
    getItemLabel: (item: T) => string
  ) => {
    const hasChanges = items.some(item => item.type !== "unchanged");
    if (!hasChanges) return null;

    return (
      <div className="mb-4">
        <h4 className="font-medium text-sage-800 mb-2">{title}</h4>
        <div className="space-y-2">
          {items.filter(item => item.type !== "unchanged").map((item) => (
            <div key={item.id} className={`p-3 rounded-lg border ${getDiffColor(item.type)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {item.type === "removed" && item.oldItem && getItemLabel(item.oldItem)}
                  {item.type === "added" && item.newItem && getItemLabel(item.newItem)}
                  {item.type === "changed" && item.newItem && getItemLabel(item.newItem)}
                </span>
                {getDiffBadge(item.type)}
              </div>
              {item.type === "changed" && item.fieldChanges && (
                <div className="mt-2 text-xs space-y-1">
                  {item.fieldChanges
                    .filter(f => f.type !== "unchanged")
                    .map((field, idx) => (
                      <div key={idx} className="text-sage-600">
                        <span className="font-medium">{field.field}:</span>{" "}
                        <span className="line-through text-red-500">{field.oldValue || "(empty)"}</span>{" → "}
                        <span className="text-green-600">{field.newValue || "(empty)"}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-sage-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-sage-900">Version History</h2>
          <button onClick={onClose} className="text-sage-400 hover:text-sage-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Version List */}
          <div className="w-72 border-r border-sage-200 overflow-y-auto p-4">
            <h3 className="text-sm font-medium text-sage-600 mb-3">Select versions to compare</h3>
            {isLoading ? (
              <div className="text-center py-4 text-sage-500">Loading...</div>
            ) : (
              <div className="space-y-2">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedVersions.includes(version.id)
                        ? "border-primary-500 bg-primary-50"
                        : "border-sage-200 hover:border-sage-300 hover:bg-sage-50"
                    }`}
                    onClick={() => {
                      if (selectedVersions[0] === version.id) {
                        setSelectedVersions([null, selectedVersions[1]]);
                      } else if (selectedVersions[1] === version.id) {
                        setSelectedVersions([selectedVersions[0], null]);
                      } else if (!selectedVersions[0]) {
                        setSelectedVersions([version.id, selectedVersions[1]]);
                      } else if (!selectedVersions[1]) {
                        setSelectedVersions([selectedVersions[0], version.id]);
                      } else {
                        setSelectedVersions([selectedVersions[1], version.id]);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sage-900">
                        Version {version.version_number}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        version.status === "approved"
                          ? "bg-primary-100 text-primary-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {version.status}
                      </span>
                    </div>
                    <div className="text-xs text-sage-500">
                      {formatDate(version.created_at)}
                    </div>
                    {!version.is_first_version && version.diff_summary !== "No changes" && (
                      <div className="text-xs text-sage-600 mt-1">
                        {version.diff_summary}
                      </div>
                    )}
                    {version.id === currentVersionId && (
                      <div className="text-xs text-primary-600 mt-1">Current</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Diff View */}
          <div className="flex-1 overflow-y-auto p-4">
            {!selectedVersions[0] || !selectedVersions[1] ? (
              <div className="flex items-center justify-center h-full text-sage-500">
                Select two versions to compare
              </div>
            ) : isLoadingDiff ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              </div>
            ) : diff ? (
              <div>
                {/* Summary */}
                <div className="mb-4 p-3 bg-sage-50 rounded-lg">
                  <div className="flex gap-4 text-sm">
                    {diff.summary.added > 0 && (
                      <span className="text-green-600">+{diff.summary.added} added</span>
                    )}
                    {diff.summary.removed > 0 && (
                      <span className="text-red-600">-{diff.summary.removed} removed</span>
                    )}
                    {diff.summary.changed > 0 && (
                      <span className="text-amber-600">~{diff.summary.changed} changed</span>
                    )}
                    {diff.summary.added === 0 && diff.summary.removed === 0 && diff.summary.changed === 0 && (
                      <span className="text-sage-500">No changes</span>
                    )}
                  </div>
                </div>

                {/* Detailed Diffs */}
                <div className="space-y-4">
                  {renderFieldDiff("Presenting Concerns (Clinical)", diff.presenting_concerns.clinical)}
                  {renderFieldDiff("Presenting Concerns (Client-Facing)", diff.presenting_concerns.client_facing)}
                  {renderFieldDiff("Clinical Impressions (Clinical)", diff.clinical_impressions.clinical)}
                  {renderFieldDiff("Clinical Impressions (Client-Facing)", diff.clinical_impressions.client_facing)}
                  
                  {renderArrayDiff("Goals", diff.goals, (g) => (g as { goal?: string }).goal || "Goal")}
                  {renderArrayDiff("Interventions", diff.interventions, (i) => (i as { name?: string }).name || "Intervention")}
                  {renderArrayDiff("Homework", diff.homework, (h) => (h as { task?: string }).task || "Task")}
                  {renderArrayDiff("Strengths", diff.strengths, (s) => (s as { strength?: string }).strength || "Strength")}
                  
                  {renderFieldDiff("Risk Level", diff.risk_factors.level)}
                  {renderFieldDiff("Risk Notes", diff.risk_factors.notes)}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-sage-500">
                Unable to load diff
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-sage-200 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

