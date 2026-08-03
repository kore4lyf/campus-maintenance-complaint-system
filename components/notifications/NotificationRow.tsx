"use client";

import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { UserPlus, AlertTriangle, RefreshCw } from "lucide-react";
import type { Notification } from "./useNotifications";

const TYPE_CONFIG: Record<
  Notification["type"],
  { icon: typeof UserPlus; color: string; label: string }
> = {
  assignment: {
    icon: UserPlus,
    color: "text-info-strong bg-info/15",
    label: "Assigned",
  },
  escalation: {
    icon: AlertTriangle,
    color: "text-danger-strong bg-danger/15",
    label: "Escalated",
  },
  status: {
    icon: RefreshCw,
    color: "text-muted-strong bg-muted/15",
    label: "Status update",
  },
};

interface NotificationRowProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onClose: () => void;
}

export function NotificationRow({
  notification,
  onMarkAsRead,
  onClose,
}: NotificationRowProps) {
  const config = TYPE_CONFIG[notification.type];
  const Icon = config.icon;

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification._id);
    }
    onClose();
  };

  return (
    <li>
      <Link
        href={`/complaints/${notification.complaintId}`}
        onClick={handleClick}
        className={`flex gap-3 px-4 py-3 transition-colors hover:bg-surface-raised/60 ${
          !notification.read ? "bg-brand/5" : ""
        }`}
      >
        {/* Icon */}
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${config.color}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground-strong line-clamp-2">
            {notification.message}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-muted">
              {formatDistanceToNowStrict(new Date(notification.createdAt), {
                addSuffix: true,
              })}
            </span>
            <span className="text-xs text-muted">·</span>
            <span className="text-xs text-muted">{config.label}</span>
          </div>
        </div>

        {/* Unread dot */}
        {!notification.read && (
          <div className="flex-shrink-0 pt-1">
            <span className="block h-2 w-2 rounded-full bg-brand" aria-label="Unread" />
          </div>
        )}
      </Link>
    </li>
  );
}
