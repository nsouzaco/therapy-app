interface Goal {
  id: string;
  type: "short_term" | "long_term";
  goal: string;
  target_date?: string;
}

interface GoalsDisplayProps {
  goals: Goal[];
}

export function GoalsDisplay({ goals }: GoalsDisplayProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return null;
    }
  };

  const shortTerm = goals.filter((g) => g.type === "short_term");
  const longTerm = goals.filter((g) => g.type === "long_term");

  const GoalItem = ({ goal }: { goal: Goal }) => (
    <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-sage-100">
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-5 h-5 rounded-full border-2 border-primary-400 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-primary-400" />
        </div>
      </div>
      <div className="flex-1">
        <p className="text-sage-800">{goal.goal}</p>
        {goal.target_date && (
          <p className="text-sm text-sage-500 mt-1">
            Target: {formatDate(goal.target_date)}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {shortTerm.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-sage-600 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Coming Up Soon
          </h4>
          <div className="space-y-2">
            {shortTerm.map((goal) => (
              <GoalItem key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      )}

      {longTerm.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-sage-600 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Bigger Picture
          </h4>
          <div className="space-y-2">
            {longTerm.map((goal) => (
              <GoalItem key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

