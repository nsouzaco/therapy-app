interface Strength {
  id: string;
  strength: string;
  how_to_leverage: string;
}

interface StrengthsDisplayProps {
  strengths: Strength[];
}

export function StrengthsDisplay({ strengths }: StrengthsDisplayProps) {
  if (strengths.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {strengths.map((strength) => (
        <div
          key={strength.id}
          className="flex items-start gap-3 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200"
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
          </div>
          <div>
            <p className="font-medium text-emerald-800">{strength.strength}</p>
            <p className="text-sm text-emerald-700 mt-1">
              {strength.how_to_leverage}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

