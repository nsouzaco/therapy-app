"use client";

import { useState } from "react";

interface Goal {
  id: string;
  type: "short_term" | "long_term";
  goal: string;
}

interface Intervention {
  id: string;
  name: string;
  description: string;
}

interface ClientCopilotProps {
  planId: string;
  goals: Goal[];
  interventions: Intervention[];
}

type ItemType = "goal" | "intervention";

export function ClientCopilot({ planId, goals, interventions }: ClientCopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setSelectedType(null);
    setSelectedId(null);
    setExplanation(null);
    setError(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(resetState, 300); // Reset after animation
  };

  const handleItemSelect = async (type: ItemType, id: string) => {
    setSelectedType(type);
    setSelectedId(id);
    setIsLoading(true);
    setError(null);
    setExplanation(null);

    try {
      const action = type === "goal" ? "explain_goal" : "explain_intervention";
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          planId,
          ...(type === "goal" ? { goalId: id } : { interventionId: id }),
        }),
      });

      const data = await response.json();

      if (data.success && data.result?.simplifiedText) {
        setExplanation(data.result.simplifiedText);
      } else {
        setError(data.error || "Couldn't get an explanation right now");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedItem = selectedType === "goal"
    ? goals.find((g) => g.id === selectedId)
    : interventions.find((i) => i.id === selectedId);

  return (
    <>
      {/* Floating Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-40 group"
        aria-label="Need help understanding something?"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-sage-800 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Need help understanding?
        </span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal content */}
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {explanation && (
                    <button
                      onClick={resetState}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  <div className="p-2 bg-white/20 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold">Need help understanding?</h2>
                    <p className="text-sm text-white/80">
                      {explanation ? "Here's a simpler explanation" : "Pick something to explain"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Selection View */}
              {!explanation && !isLoading && !error && (
                <div className="space-y-6">
                  {/* Goals */}
                  {goals.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-sage-600 mb-3">Your Goals</h3>
                      <div className="space-y-2">
                        {goals.map((goal) => (
                          <button
                            key={goal.id}
                            onClick={() => handleItemSelect("goal", goal.id)}
                            className="w-full text-left p-3 bg-sage-50 hover:bg-sage-100 rounded-lg border border-sage-200 transition-colors"
                          >
                            <p className="text-sage-800">{goal.goal}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interventions */}
                  {interventions.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-sage-600 mb-3">How We&apos;re Working Together</h3>
                      <div className="space-y-2">
                        {interventions.map((intervention) => (
                          <button
                            key={intervention.id}
                            onClick={() => handleItemSelect("intervention", intervention.id)}
                            className="w-full text-left p-3 bg-sage-50 hover:bg-sage-100 rounded-lg border border-sage-200 transition-colors"
                          >
                            <p className="font-medium text-sage-800">{intervention.name}</p>
                            <p className="text-sm text-sage-600 mt-1">{intervention.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Loading */}
              {isLoading && (
                <div className="flex flex-col items-center py-8">
                  <div className="w-10 h-10 border-3 border-primary-200 rounded-full animate-spin border-t-primary-600" />
                  <p className="mt-4 text-sage-500 text-sm">
                    Thinking of a simpler way to explain...
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-sage-600 mb-4">{error}</p>
                  <button
                    onClick={() => selectedId && handleItemSelect(selectedType!, selectedId)}
                    className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Explanation Result */}
              {explanation && selectedItem && (
                <div>
                  {/* Original item */}
                  <div className="p-4 bg-sage-50 rounded-lg border border-sage-100 mb-4">
                    <p className="text-xs text-sage-500 mb-1">You asked about:</p>
                    <p className="text-sage-700">
                      {selectedType === "goal"
                        ? (selectedItem as Goal).goal
                        : (selectedItem as Intervention).name}
                    </p>
                  </div>

                  {/* Explanation */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sage-800 leading-relaxed">{explanation}</p>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-primary-50 rounded-lg border border-primary-100">
                    <p className="text-sm text-primary-800">
                      💡 Still have questions? Feel free to discuss this with your therapist at your next session.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-sage-50 border-t border-sage-100">
              <button
                onClick={handleClose}
                className="w-full py-2.5 px-4 bg-sage-200 hover:bg-sage-300 text-sage-700 rounded-lg font-medium transition-colors"
              >
                {explanation ? "Got it, thanks!" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

