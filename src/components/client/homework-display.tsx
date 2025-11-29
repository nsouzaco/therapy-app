interface Homework {
  id: string;
  task: string;
  purpose: string;
  due_date?: string;
}

interface HomeworkDisplayProps {
  homework: Homework[];
}

export function HomeworkDisplay({ homework }: HomeworkDisplayProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return null;
    }
  };

  if (homework.length === 0) {
    return (
      <p className="text-sage-500 text-center py-4">
        No homework assignments right now. Enjoy your week!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {homework.map((item, index) => (
        <div
          key={item.id}
          className="relative pl-8 pb-4 last:pb-0"
        >
          {/* Timeline line */}
          {index < homework.length - 1 && (
            <div className="absolute left-3 top-6 w-0.5 h-full bg-primary-200" />
          )}
          
          {/* Checkbox circle */}
          <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-primary-100 border-2 border-primary-400 flex items-center justify-center">
            <span className="text-primary-600 font-bold text-xs">{index + 1}</span>
          </div>

          <div className="bg-white rounded-lg border border-sage-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="font-medium text-sage-800">{item.task}</p>
                <p className="text-sm text-sage-600 mt-1">{item.purpose}</p>
              </div>
              {item.due_date && (
                <span className="flex-shrink-0 text-xs font-medium px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                  {formatDate(item.due_date)}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

