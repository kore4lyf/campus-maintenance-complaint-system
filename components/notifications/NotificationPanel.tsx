"use client";

import { useEffect, useRef } from "react";
import { CheckCheck, Bell } from "lucide-react";
import { NotificationRow } from "./NotificationRow";
import { NotificationEmpty } from "./NotificationEmpty";
import { NotificationSkeleton } from "./NotificationSkeleton";
import type { useNotifications, Notification } from "./useNotifications";

interface NotificationPanelProps {
  notifications: ReturnType<typeof useNotifications>["notifications"];
  unreadCount: ReturnType<typeof useNotifications>["unreadCount"];
  isLoading: ReturnType<typeof useNotifications>["isLoading"];
  isOpen: ReturnType<typeof useNotifications>["isOpen"];
  onClose: ReturnType<typeof useNotifications>["close"];
  fetchNextPage: ReturnType<typeof useNotifications>["fetchNextPage"];
  hasNextPage: ReturnType<typeof useNotifications>["hasNextPage"];
  isFetchingNextPage: ReturnType<typeof useNotifications>["isFetchingNextPage"];
  markAsRead: ReturnType<typeof useNotifications>["markAsRead"];
  markAllAsRead: ReturnType<typeof useNotifications>["markAllAsRead"];
  isMarkingAllAsRead: ReturnType<typeof useNotifications>["isMarkingAllAsRead"];
}

export function NotificationPanel({
  notifications,
  unreadCount,
  isLoading,
  isOpen,
  onClose,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  markAsRead,
  markAllAsRead,
  isMarkingAllAsRead,
}: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !(e.target as Element)?.closest("[data-notification-bell]")
      ) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Infinite scroll observer
  useEffect(() => {
    if (!isOpen || !hasNextPage) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "100px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isOpen, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!isOpen) return null;

  // Group notifications by time
  const grouped = groupByTime(notifications);

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-lg sm:w-96"
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground-strong">
            Notifications
          </h2>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllAsRead()}
            disabled={isMarkingAllAsRead}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-strong transition-colors hover:bg-surface-raised hover:text-foreground-strong disabled:opacity-50"
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Mark all read
          </button>
        )}
      </div>

      {/* Content */}
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <NotificationSkeleton />
        ) : notifications.length === 0 ? (
          <NotificationEmpty />
        ) : (
          <div>
            {grouped.map((group) => (
              <div key={group.label}>
                <div className="sticky top-0 z-10 border-b border-border bg-surface/95 px-4 py-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    {group.label}
                  </p>
                </div>
                <ul className="divide-y divide-border">
                  {group.items.map((notification) => (
                    <NotificationRow
                      key={notification._id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onClose={onClose}
                    />
                  ))}
                </ul>
              </div>
            ))}

            {/* Infinite scroll sentinel */}
            {hasNextPage && (
              <div ref={sentinelRef} className="py-3">
                {isFetchingNextPage && (
                  <div className="flex justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-transparent" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function groupByTime(notifications: Notification[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: Notification[] }[] = [];
  const todayItems: Notification[] = [];
  const yesterdayItems: Notification[] = [];
  const olderItems: Notification[] = [];

  for (const n of notifications) {
    const date = new Date(n.createdAt);
    if (date >= today) {
      todayItems.push(n);
    } else if (date >= yesterday) {
      yesterdayItems.push(n);
    } else {
      olderItems.push(n);
    }
  }

  if (todayItems.length > 0) groups.push({ label: "Today", items: todayItems });
  if (yesterdayItems.length > 0)
    groups.push({ label: "Yesterday", items: yesterdayItems });
  if (olderItems.length > 0) groups.push({ label: "Earlier", items: olderItems });

  return groups;
}
