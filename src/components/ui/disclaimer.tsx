interface DisclaimerProps {
  variant?: "therapist" | "client";
  className?: string;
}

export function Disclaimer({ variant = "therapist", className = "" }: DisclaimerProps) {
  const content =
    variant === "therapist"
      ? "AI-generated content requires clinical review. This tool supports but does not replace professional judgment."
      : "This plan was created by your therapist with the help of AI tools. It is not medical advice. Please discuss any questions with your therapist directly.";

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border ${
        variant === "therapist"
          ? "bg-amber-50 border-amber-200 text-amber-800"
          : "bg-sage-50 border-sage-200 text-sage-700"
      } ${className}`}
    >
      <svg
        className="w-5 h-5 flex-shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="text-sm">{content}</p>
    </div>
  );
}

