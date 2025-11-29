interface PlanCardProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "default" | "highlight" | "warm";
}

export function PlanCard({
  title,
  children,
  icon,
  variant = "default",
}: PlanCardProps) {
  const variants = {
    default: "bg-white border-sage-200",
    highlight: "bg-primary-50 border-primary-200",
    warm: "bg-amber-50 border-amber-200",
  };

  return (
    <div className={`rounded-xl border p-6 ${variants[variant]}`}>
      <div className="flex items-center gap-3 mb-4">
        {icon && (
          <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center text-primary-600">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold text-sage-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

