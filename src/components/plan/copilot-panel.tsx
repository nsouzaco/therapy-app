"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import type { Goal, Intervention, Homework } from "@/lib/types/plan";
import type { SuggestedIntervention, SuggestedHomework, ChatMessage } from "@/lib/types/copilot";
import { CopilotLoading, CopilotError } from "./copilot-modal";

type CopilotMode = "actions" | "chat";
type CopilotAction = "suggest_interventions" | "suggest_homework" | "explain_evidence";

interface CopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  goals: Goal[];
  interventions: Intervention[];
  onAddIntervention?: (intervention: Omit<Intervention, "id" | "citations">) => Promise<void>;
  onAddHomework?: (homework: Omit<Homework, "id" | "citations" | "due_date">) => Promise<void>;
}

interface ActionOption {
  id: CopilotAction;
  label: string;
  description: string;
  icon: React.ReactNode;
  requiresSelection: "goal" | "intervention" | null;
}

const ACTIONS: ActionOption[] = [
  {
    id: "suggest_interventions",
    label: "Suggest Interventions",
    description: "Get 3 evidence-based intervention ideas for a goal",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    requiresSelection: "goal",
  },
  {
    id: "suggest_homework",
    label: "Suggest Homework",
    description: "Get homework ideas that reinforce an intervention",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    requiresSelection: "intervention",
  },
  {
    id: "explain_evidence",
    label: "Explain Evidence Base",
    description: "Get the research behind an intervention",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    requiresSelection: "intervention",
  },
];

export function CopilotPanel({
  isOpen,
  onClose,
  planId,
  goals,
  interventions,
  onAddIntervention,
  onAddHomework,
}: CopilotPanelProps) {
  // Mode: actions or chat
  const [mode, setMode] = useState<CopilotMode>("chat");
  
  // Actions state
  const [selectedAction, setSelectedAction] = useState<CopilotAction | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedInterventionId, setSelectedInterventionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interventionSuggestions, setInterventionSuggestions] = useState<SuggestedIntervention[]>([]);
  const [homeworkSuggestions, setHomeworkSuggestions] = useState<SuggestedHomework[]>([]);
  const [evidenceExplanation, setEvidenceExplanation] = useState<string | null>(null);
  const [addedItems, setAddedItems] = useState<Set<number>>(new Set());

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentAction = ACTIONS.find((a) => a.id === selectedAction);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Focus input when switching to chat
  useEffect(() => {
    if (mode === "chat" && isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [mode, isOpen]);

  const resetActionResults = () => {
    setInterventionSuggestions([]);
    setHomeworkSuggestions([]);
    setEvidenceExplanation(null);
    setAddedItems(new Set());
    setError(null);
  };

  const handleActionSelect = (action: CopilotAction) => {
    setSelectedAction(action);
    resetActionResults();
  };

  const handleBack = () => {
    if (interventionSuggestions.length > 0 || homeworkSuggestions.length > 0 || evidenceExplanation) {
      resetActionResults();
    } else if (selectedGoalId || selectedInterventionId) {
      setSelectedGoalId(null);
      setSelectedInterventionId(null);
    } else {
      setSelectedAction(null);
    }
  };

  const canSubmitAction = () => {
    if (!selectedAction) return false;
    const action = ACTIONS.find((a) => a.id === selectedAction);
    if (action?.requiresSelection === "goal") return !!selectedGoalId;
    if (action?.requiresSelection === "intervention") return !!selectedInterventionId;
    return true;
  };

  const handleActionSubmit = async () => {
    if (!canSubmitAction()) return;

    setIsLoading(true);
    setError(null);
    resetActionResults();

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: selectedAction,
          planId,
          goalId: selectedGoalId,
          interventionId: selectedInterventionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.result?.suggestions) {
          setInterventionSuggestions(data.result.suggestions);
        }
        if (data.result?.homeworkSuggestions) {
          setHomeworkSuggestions(data.result.homeworkSuggestions);
        }
        if (data.result?.evidenceExplanation) {
          setEvidenceExplanation(data.result.evidenceExplanation);
        }
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Failed to connect to AI assistant");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: chatInput.trim(),
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          planId,
          userQuery: userMessage.content,
        }),
      });

      const data = await response.json();

      if (data.success && data.result?.chatResponse) {
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.result.chatResponse,
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: ChatMessage = {
          role: "assistant",
          content: `Sorry, I encountered an error: ${data.error || "Unknown error"}. Please try again.`,
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, errorMessage]);
      }
    } catch {
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Sorry, I couldn't connect to the AI service. Please try again.",
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
    }
  };

  const handleAddIntervention = async (suggestion: SuggestedIntervention, index: number) => {
    if (onAddIntervention) {
      await onAddIntervention({
        name: suggestion.name,
        description: suggestion.description,
        frequency: suggestion.frequency,
        client_facing: suggestion.client_facing,
      });
      setAddedItems((prev) => new Set(Array.from(prev).concat(index)));
    }
  };

  const handleAddHomework = async (suggestion: SuggestedHomework, index: number) => {
    if (onAddHomework) {
      await onAddHomework({
        task: suggestion.task,
        purpose: suggestion.purpose,
      });
      setAddedItems((prev) => new Set(Array.from(prev).concat(index + 100)));
    }
  };

  if (!isOpen) return null;

  const hasActionResults = interventionSuggestions.length > 0 || homeworkSuggestions.length > 0 || evidenceExplanation;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sage-200 bg-gradient-to-r from-primary-500 to-primary-600">
          <div className="flex items-center gap-3">
            {mode === "actions" && (selectedAction || hasActionResults) && (
              <button
                onClick={handleBack}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-white">AI Copilot</h2>
                <p className="text-xs text-white/70">
                  {mode === "chat" ? "Ask me anything about this plan" : currentAction?.label || "Quick actions"}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-sage-200">
          <button
            onClick={() => setMode("chat")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              mode === "chat"
                ? "text-primary-600 border-b-2 border-primary-600"
                : "text-sage-500 hover:text-sage-700"
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setMode("actions")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              mode === "actions"
                ? "text-primary-600 border-b-2 border-primary-600"
                : "text-sage-500 hover:text-sage-700"
            }`}
          >
            ⚡ Quick Actions
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* ===== CHAT MODE ===== */}
          {mode === "chat" && (
            <div className="flex flex-col h-full">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="font-medium text-sage-900 mb-2">Ask me anything</h3>
                    <p className="text-sm text-sage-600 max-w-xs mx-auto">
                      I have context on this client&apos;s treatment plan and your knowledge base.
                    </p>
                    <div className="mt-6 space-y-2">
                      <p className="text-xs text-sage-500">Try asking:</p>
                      {[
                        "What if we tried DBT instead of CBT?",
                        "Suggest modifications for a client with ADHD",
                        "How can I address treatment resistance?",
                      ].map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => setChatInput(suggestion)}
                          className="block w-full text-left px-3 py-2 text-sm text-sage-700 bg-sage-50 hover:bg-sage-100 rounded-lg transition-colors"
                        >
                          &ldquo;{suggestion}&rdquo;
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary-600 text-white"
                          : "bg-sage-100 text-sage-900"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <div className="prose prose-sm prose-sage max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                          <ReactMarkdown
                            components={{
                              h1: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-2">{children}</h3>,
                              h2: ({ children }) => <h4 className="text-sm font-semibold mt-3 mb-2">{children}</h4>,
                              h3: ({ children }) => <h5 className="text-sm font-semibold mt-2 mb-1">{children}</h5>,
                              p: ({ children }) => <p className="text-sm mb-2">{children}</p>,
                              ul: ({ children }) => <ul className="text-sm list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="text-sm list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                              li: ({ children }) => <li className="text-sm">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              em: ({ children }) => <em className="italic">{children}</em>,
                              code: ({ children }) => <code className="text-xs bg-sage-200 px-1 py-0.5 rounded">{children}</code>,
                              blockquote: ({ children }) => <blockquote className="border-l-2 border-sage-300 pl-3 italic text-sage-600">{children}</blockquote>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-sage-100 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-sage-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 bg-sage-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 bg-sage-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="border-t border-sage-200 p-4">
                <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about this treatment plan..."
                    rows={1}
                    className="flex-1 resize-none rounded-lg border border-sage-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isChatLoading}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-sage-300 text-white rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ===== ACTIONS MODE ===== */}
          {mode === "actions" && (
            <div className="p-6">
              {/* Step 1: Select Action */}
              {!selectedAction && (
                <div className="space-y-3">
                  <p className="text-sage-600 text-sm mb-4">
                    Select what you&apos;d like AI assistance with:
                  </p>
                  {ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleActionSelect(action.id)}
                      className="w-full flex items-start gap-4 p-4 bg-sage-50 hover:bg-sage-100 rounded-lg border border-sage-200 transition-colors text-left"
                    >
                      <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                        {action.icon}
                      </div>
                      <div>
                        <h3 className="font-medium text-sage-900">{action.label}</h3>
                        <p className="text-sm text-sage-600">{action.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Step 2: Select Element */}
              {selectedAction && !hasActionResults && !isLoading && (
                <div className="space-y-4">
                  {currentAction?.requiresSelection === "goal" && (
                    <>
                      <p className="text-sage-600 text-sm">Select a goal:</p>
                      <div className="space-y-2">
                        {goals.map((goal) => (
                          <button
                            key={goal.id}
                            onClick={() => setSelectedGoalId(goal.id)}
                            className={`w-full text-left p-4 rounded-lg border transition-colors ${
                              selectedGoalId === goal.id
                                ? "border-primary-500 bg-primary-50"
                                : "border-sage-200 hover:border-primary-300 hover:bg-sage-50"
                            }`}
                          >
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                              goal.type === "short_term" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                            }`}>
                              {goal.type === "short_term" ? "Short-term" : "Long-term"}
                            </span>
                            <p className="text-sage-900 mt-2">{goal.goal}</p>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {currentAction?.requiresSelection === "intervention" && (
                    <>
                      <p className="text-sage-600 text-sm">Select an intervention:</p>
                      <div className="space-y-2">
                        {interventions.map((intervention) => (
                          <button
                            key={intervention.id}
                            onClick={() => setSelectedInterventionId(intervention.id)}
                            className={`w-full text-left p-4 rounded-lg border transition-colors ${
                              selectedInterventionId === intervention.id
                                ? "border-primary-500 bg-primary-50"
                                : "border-sage-200 hover:border-primary-300 hover:bg-sage-50"
                            }`}
                          >
                            <p className="font-medium text-sage-900">{intervention.name}</p>
                            <p className="text-sm text-sage-600 mt-1">{intervention.description}</p>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {canSubmitAction() && (
                    <button
                      onClick={handleActionSubmit}
                      className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate
                    </button>
                  )}
                </div>
              )}

              {/* Loading */}
              {isLoading && <CopilotLoading />}

              {/* Error */}
              {error && <CopilotError message={error} onRetry={handleActionSubmit} />}

              {/* Results */}
              {interventionSuggestions.length > 0 && (
                <div className="space-y-4">
                  <p className="text-sage-600 text-sm">Intervention suggestions:</p>
                  {interventionSuggestions.map((suggestion, index) => (
                    <div key={index} className="bg-white border border-sage-200 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="font-medium text-sage-900">{suggestion.name}</h4>
                        <span className="text-xs font-medium px-2 py-1 bg-primary-100 text-primary-700 rounded">
                          {suggestion.frequency}
                        </span>
                      </div>
                      <p className="text-sm text-sage-700 mb-2">{suggestion.description}</p>
                      <p className="text-sm text-sage-500 italic mb-3">&ldquo;{suggestion.client_facing}&rdquo;</p>
                      {suggestion.evidence_source && (
                        <div className="text-xs p-2 bg-amber-50 rounded border border-amber-100 mb-3">
                          <strong className="text-amber-800">📚 {suggestion.evidence_source.document_title}</strong>
                        </div>
                      )}
                      {onAddIntervention && (
                        <button
                          onClick={() => handleAddIntervention(suggestion, index)}
                          disabled={addedItems.has(index)}
                          className={`w-full py-2 rounded-lg text-sm font-medium ${
                            addedItems.has(index)
                              ? "bg-green-100 text-green-700"
                              : "bg-primary-600 text-white hover:bg-primary-700"
                          }`}
                        >
                          {addedItems.has(index) ? "✓ Added" : "Add to Plan"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {homeworkSuggestions.length > 0 && (
                <div className="space-y-4">
                  <p className="text-sage-600 text-sm">Homework suggestions:</p>
                  {homeworkSuggestions.map((suggestion, index) => (
                    <div key={index} className="bg-white border border-sage-200 rounded-lg p-4">
                      <h4 className="font-medium text-sage-900 mb-2">{suggestion.task}</h4>
                      <p className="text-sm text-sage-600 mb-3">{suggestion.purpose}</p>
                      {onAddHomework && (
                        <button
                          onClick={() => handleAddHomework(suggestion, index)}
                          disabled={addedItems.has(index + 100)}
                          className={`w-full py-2 rounded-lg text-sm font-medium ${
                            addedItems.has(index + 100)
                              ? "bg-green-100 text-green-700"
                              : "bg-primary-600 text-white hover:bg-primary-700"
                          }`}
                        >
                          {addedItems.has(index + 100) ? "✓ Added" : "Add to Homework"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {evidenceExplanation && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <h4 className="font-medium text-amber-800">Evidence Base</h4>
                  </div>
                  <div className="text-sm text-amber-900 whitespace-pre-wrap">{evidenceExplanation}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
