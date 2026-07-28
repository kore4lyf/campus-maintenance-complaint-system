import { Tag } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/Badge";

interface CategoryBadgeProps {
  name: string;
  systemType: string;
  className?: string | undefined;
}

const TONE_BY_SYSTEM: Record<string, BadgeProps["tone"]> = {
  Electrical: "warning",
  Plumbing: "info",
  Carpentry: "warning",
  HVAC: "danger",
  ICT: "info",
  Cleaning: "success",
  Security: "danger",
  Other: "neutral",
};

export function CategoryBadge({ name, systemType, className }: CategoryBadgeProps) {
  const tone = TONE_BY_SYSTEM[systemType] ?? "neutral";
  return (
    <Badge tone={tone} leadingIcon={<Tag className="h-3 w-3" />} className={className}>
      {name}
    </Badge>
  );
}
