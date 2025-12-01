interface DisclaimerProps {
  variant?: "therapist" | "client";
  className?: string;
}

export function Disclaimer({ variant = "therapist", className = "" }: DisclaimerProps) {
  const isTherapist = variant === "therapist";
  
  const content = isTherapist
    ? "AI-generated content requires clinical review. This tool supports but does not replace professional judgment."
    : "Your data is stored securely and handled in compliance with HIPAA regulations. All information is encrypted and protected.";

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border ${
        isTherapist
          ? "bg-amber-50 border-amber-200 text-amber-800"
          : "bg-primary-50 border-primary-200 text-primary-800"
      } ${className}`}
    >
      {isTherapist ? (
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
      ) : (
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
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      )}
      <p className="text-sm">{content}</p>
    </div>
  );
}

