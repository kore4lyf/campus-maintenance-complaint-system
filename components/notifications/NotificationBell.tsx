"use client";

import { Bell } from "lucide-react";
import { useNotifications } from "./useNotifications";
import { NotificationPanel } from "./NotificationPanel";

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    isLoading,
    isOpen,
    toggle,
    close,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    markAsRead,
    markAllAsRead,
    isMarkingAllAsRead,
  } = useNotifications();

  const displayCount = unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <div className="relative" data-notification-bell>
      <button
        type="button"
        onClick={toggle}
        className="relative inline-flex min-h-[44px] items-center justify-center rounded-md p-2 text-muted-strong transition-colors hover:bg-surface-raised hover:text-foreground-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {displayCount && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
            {displayCount}
          </span>
        )}
      </button>

      <NotificationPanel
        notifications={notifications}
        unreadCount={unreadCount}
        isLoading={isLoading}
        isOpen={isOpen}
        onClose={close}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        markAsRead={markAsRead}
        markAllAsRead={markAllAsRead}
        isMarkingAllAsRead={isMarkingAllAsRead}
      />
    </div>
  );
}
