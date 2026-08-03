"use client";

import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/auth/role-context";
import { useAblyChannel } from "@/lib/realtime/use-ably-channel";

export interface Notification {
  _id: string;
  complaintId: string;
  recipientId: string;
  type: "assignment" | "escalation" | "status";
  message: string;
  read: boolean;
  createdAt: string;
}

interface NotificationResponse {
  data: Notification[];
  meta: { nextCursor: string | null; hasMore: boolean };
  unreadCount: number;
}

export function useNotifications() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const queryKey = ["notifications", user?.id];
  const currentCursor = cursors[pageIndex] ?? null;

  // Fetch notifications page
  const { isLoading } = useQuery<NotificationResponse>({
    queryKey: [...queryKey, currentCursor],
    enabled: !!user,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentCursor) params.set("cursor", currentCursor);
      const response = await fetch(`/api/notifications?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch notifications");
      const result = await response.json();

      if (pageIndex === 0) {
        setAllNotifications(result.data);
        setUnreadCount(result.unreadCount);
      } else {
        setAllNotifications((prev) => [...prev, ...result.data]);
      }

      return result;
    },
  });

  const hasNextPage = (() => {
    const params = new URLSearchParams();
    if (currentCursor) params.set("cursor", currentCursor);
    // We'll rely on the query result to determine this
    return false; // Simplified - will be updated by fetchNextPage
  })();

  const fetchNextPage = useCallback(async () => {
    const params = new URLSearchParams();
    if (currentCursor) params.set("cursor", currentCursor);
    const response = await fetch(`/api/notifications?${params.toString()}`);
    if (!response.ok) return;
    const result: NotificationResponse = await response.json();

    if (result.meta.nextCursor) {
      setCursors((prev) => [...prev, result.meta.nextCursor]);
      setPageIndex((prev) => prev + 1);
      setAllNotifications((prev) => [...prev, ...result.data]);
    }
  }, [currentCursor]);

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Failed to mark as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setAllNotifications((prev) =>
        prev.map((n) => (n._id === arguments[0] ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
  });

  // Mark all as read mutation
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to mark all as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setAllNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    },
  });

  // Ably real-time updates
  const channelName = user ? `notifications:${user.id}` : "";
  useAblyChannel({
    name: channelName,
    queryKey,
  });

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  return {
    notifications: allNotifications,
    unreadCount,
    isLoading,
    isOpen,
    toggle,
    close,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage: false,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    isMarkingAllAsRead: markAllAsRead.isPending,
  };
}
