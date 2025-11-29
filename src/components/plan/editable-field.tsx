"use client";

import { useState, useRef, useEffect } from "react";

interface EditableFieldProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  label?: string;
  multiline?: boolean;
  disabled?: boolean;
  className?: string;
}

export function EditableField({
  value,
  onSave,
  label,
  multiline = false,
  disabled = false,
  className = "",
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save:", error);
      setEditValue(value);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    } else if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Enter" && e.metaKey && multiline) {
      e.preventDefault();
      handleSave();
    }
  };

  if (isEditing) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-sage-600">
            {label}
          </label>
        )}
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y min-h-[100px] text-sage-900"
            rows={4}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className="w-full px-3 py-2 border border-sage-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sage-900"
          />
        )}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-3 py-1 text-sm border border-sage-300 rounded-md hover:bg-sage-50 text-sage-700"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-sage-600 mb-1">
          {label}
        </label>
      )}
      <div
        className={`group relative ${
          disabled ? "" : "cursor-pointer hover:bg-sage-50"
        } p-2 -m-2 rounded-lg transition-colors`}
        onClick={() => !disabled && setIsEditing(true)}
      >
        <p className="text-sage-900 whitespace-pre-wrap">{value || <span className="text-sage-400 italic">Click to add content</span>}</p>
        {!disabled && (
          <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg
              className="w-4 h-4 text-sage-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}

