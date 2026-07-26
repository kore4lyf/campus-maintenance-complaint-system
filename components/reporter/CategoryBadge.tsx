import { Tag } from "lucide-react";

interface CategoryBadgeProps {
  name: string;
  systemType: string;
  className?: string;
}

const TYPE_COLOR: Record<string, string> = {
  Electrical: "bg-warning/15 text-warning",
  Plumbing: "bg-accent/15 text-accent",
  Carpentry: "bg-warning/10 text-warning",
  HVAC: "bg-danger/15 text-danger",
  ICT: "bg-accent/15 text-accent",
  Cleaning: "bg-success/15 text-success",
  Security: "bg-danger/15 text-danger",
  Other: "bg-muted/15 text-muted",
};

export function CategoryBadge({ name, systemType, className }: CategoryBadgeProps) {
  const color = TYPE_COLOR[systemType] ?? "bg-muted/15 text-muted";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color} ${className ?? ""}`}
      aria-label={`Category ${name} (${systemType})`}
    >
      <Tag className="h-3 w-3" aria-hidden="true" />
      <span>{name}</span>
    </span>
  );
}
