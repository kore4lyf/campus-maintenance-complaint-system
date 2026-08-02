"use client";

import { useState, useRef, useMemo } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  PageShell,
  HeroBand,
  HeroBody,
} from "@/components/shared/PageShell";
import {
  Users,
  Shield,
  Wrench,
  FileText,
  Check,
  X,
  Search,
  SlidersHorizontal,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

interface User {
  _id: string;
  name: string;
  email: string;
  role: "reporter" | "dicht_admin" | "dicht_technician";
  createdAt: string;
}

interface UsersResponse {
  data: User[];
  meta: { page: number; pageSize: number; totalCount: number; totalPages: number };
}

const ROLE_LABELS: Record<User["role"], string> = {
  reporter: "Reporter",
  dicht_admin: "DICT Admin",
  dicht_technician: "DICT Technician",
};

const ROLE_BADGE_TONE: Record<User["role"], "neutral" | "brand" | "info"> = {
  reporter: "neutral",
  dicht_admin: "brand",
  dicht_technician: "info",
};

const ROLE_OPTIONS: { value: User["role"]; label: string }[] = [
  { value: "reporter", label: "Reporter" },
  { value: "dicht_admin", label: "DICT Admin" },
  { value: "dicht_technician", label: "DICT Technician" },
];

const ROLE_FILTER_OPTIONS: {
  value: User["role"] | "all";
  label: string;
}[] = [
  { value: "all", label: "All roles" },
  { value: "reporter", label: "Reporter" },
  { value: "dicht_admin", label: "DICT Admin" },
  { value: "dicht_technician", label: "DICT Technician" },
];

const QUERY_KEY_PREFIX = ["admin", "users"] as const;

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      {active ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white shadow-sm ring-1 ring-inset ring-brand-strong">
          {label}
          <X className="h-3 w-3" aria-hidden="true" />
        </span>
      ) : (
        <Badge tone="neutral">{label}</Badge>
      )}
    </button>
  );
}

async function fetchUsers(
  search: string,
  role: string,
  page: number,
): Promise<UsersResponse> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (role && role !== "all") params.set("role", role);
  params.set("page", String(page));

  const res = await fetch(`/api/admin/users?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load users");
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Header — reads meta from cache, never causes list re-render        */
/* ------------------------------------------------------------------ */

function UserListHeader({
  searchDebounced,
  roleFilter,
}: {
  searchDebounced: string;
  roleFilter: User["role"] | "all";
}) {
  const queryClient = useQueryClient();
  const cache = queryClient.getQueryData<UsersResponse>(
    [...QUERY_KEY_PREFIX, searchDebounced, roleFilter],
  );
  const meta = cache?.meta;

  const { isLoading, isFetching } = useQuery<UsersResponse>({
    queryKey: [...QUERY_KEY_PREFIX, searchDebounced, roleFilter],
    queryFn: () => fetchUsers(searchDebounced, roleFilter, 1),
    refetchOnWindowFocus: false,
    enabled: false,
  });

  return (
    <div className="mb-3 flex items-center justify-between">
      <p className="text-xs font-medium text-muted-strong">
        {isLoading
          ? "Loading..."
          : meta
            ? `${meta.totalCount} user${meta.totalCount !== 1 ? "s" : ""} — page ${meta.page} of ${meta.totalPages}`
            : "0 users"}
      </p>
      {isFetching && !isLoading ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-strong">
          <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
          refreshing
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pagination — page buttons, only re-renders on meta change          */
/* ------------------------------------------------------------------ */

function UserPagination({
  searchDebounced,
  roleFilter,
  page,
  setPage,
}: {
  searchDebounced: string;
  roleFilter: User["role"] | "all";
  page: number;
  setPage: (fn: (p: number) => number) => void;
}) {
  const queryClient = useQueryClient();
  const cache = queryClient.getQueryData<UsersResponse>(
    [...QUERY_KEY_PREFIX, searchDebounced, roleFilter, page],
  );
  const meta = cache?.meta;

  if (!meta || meta.totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(meta.page, meta.totalPages);

  return (
    <nav
      className="flex items-center justify-between border-t border-border px-5 py-3"
      aria-label="Pagination"
    >
      <Button
        variant="ghost"
        size="sm"
        disabled={meta.page <= 1}
        onClick={() => setPage((p) => p - 1)}
        leadingIcon={<ChevronLeft className="h-4 w-4" />}
      >
        Previous
      </Button>

      <div className="flex items-center gap-1">
        {pageNumbers.map((num, i) =>
          num === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="px-2 text-xs text-muted-strong"
            >
              …
            </span>
          ) : (
            <button
              key={num}
              type="button"
              onClick={() => setPage(() => num)}
              aria-current={num === meta.page ? "page" : undefined}
              className={`min-w-[2rem] rounded px-2 py-1 text-sm font-medium transition-colors ${
                num === meta.page
                  ? "bg-brand text-white"
                  : "text-muted-strong hover:bg-surface-raised hover:text-foreground-strong"
              }`}
            >
              {num}
            </button>
          ),
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        disabled={meta.page >= meta.totalPages}
        onClick={() => setPage((p) => p + 1)}
        trailingIcon={<ChevronRight className="h-4 w-4" />}
      >
        Next
      </Button>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  UserList — the only part that re-renders with new page data        */
/* ------------------------------------------------------------------ */

function UserList({
  searchDebounced,
  roleFilter,
  page,
  editingId,
  setEditingId,
  saving,
  assignRole,
}: {
  searchDebounced: string;
  roleFilter: User["role"] | "all";
  page: number;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  saving: boolean;
  assignRole: (userId: string, role: User["role"]) => void;
}) {
  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: [...QUERY_KEY_PREFIX, searchDebounced, roleFilter, page],
    queryFn: () => fetchUsers(searchDebounced, roleFilter, page),
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const users = data?.data ?? [];
  const meta = data?.meta;

  if (isLoading) {
    return (
      <div className="divide-y divide-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="h-9 w-9 animate-pulse rounded-full bg-surface-raised" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-surface-raised" />
              <div className="h-3 w-48 animate-pulse rounded bg-surface-raised" />
            </div>
            <div className="h-6 w-20 animate-pulse rounded-full bg-surface-raised" />
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="mb-3 h-10 w-10 text-muted-strong" />
        <p className="text-sm text-muted-strong">
          {meta?.totalCount
            ? "No users match your filters."
            : "No users found."}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {users.map((user) => (
        <div
          key={user._id}
          className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-raised/50"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
            {user.name?.[0]?.toUpperCase() ??
              user.email?.[0]?.toUpperCase() ??
              "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground-strong">
              {user.name}
            </p>
            <p className="truncate text-xs text-muted-strong">
              {user.email}
            </p>
          </div>

          {editingId === user._id ? (
            <div className="flex items-center gap-2">
              <select
                defaultValue={user.role}
                id={`role-${user._id}`}
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground-strong focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  const sel = document.getElementById(
                    `role-${user._id}`,
                  ) as HTMLSelectElement | null;
                  if (sel)
                    assignRole(
                      user._id,
                      sel.value as User["role"],
                    );
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-success/15 text-success-strong transition-colors hover:bg-success/25 disabled:opacity-50"
                aria-label="Confirm role change"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-danger/15 text-danger-strong transition-colors hover:bg-danger/25"
                aria-label="Cancel role change"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Badge tone={ROLE_BADGE_TONE[user.role]}>
                {user.role === "dicht_admin" && (
                  <Shield className="mr-0.5 inline h-3 w-3" />
                )}
                {user.role === "dicht_technician" && (
                  <Wrench className="mr-0.5 inline h-3 w-3" />
                )}
                {user.role === "reporter" && (
                  <FileText className="mr-0.5 inline h-3 w-3" />
                )}
                {ROLE_LABELS[user.role]}
              </Badge>
              <button
                type="button"
                onClick={() => setEditingId(user._id)}
                className="rounded-md border border-border px-2 py-1 text-xs text-muted-strong transition-colors hover:border-border-strong hover:bg-surface-raised hover:text-foreground-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

export function UsersManager() {
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<User["role"] | "all">("all");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [page, setPage] = useState(1);

  const activeFilterCount = (roleFilter !== "all" ? 1 : 0) + (search ? 1 : 0);

  function handleSearch(value: string) {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchDebounced(value);
      setPage(1);
    }, 300);
  }

  function handleRoleFilter(newRole: User["role"] | "all") {
    setRoleFilter(newRole);
    setPage(1);
  }

  function clearAll() {
    setSearch("");
    setSearchDebounced("");
    setRoleFilter("all");
    setPage(1);
  }

  async function assignRole(userId: string, newRole: User["role"]) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Failed to update role");
        return;
      }
      toast.success(`Role updated to ${ROLE_LABELS[newRole]}`);
      setEditingId(null);
    } catch {
      toast.error("Network error — try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell>
      <HeroBand
        kicker="DICT Console"
        title="User Management"
        subtitle="Assign roles to reporters, technicians, and admins."
      />
      <HeroBody>
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Filter sidebar */}
          <aside className="w-full flex-shrink-0 lg:w-64">
            <Card padding="md" className="sticky top-24">
              <header className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <SlidersHorizontal
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground-strong">
                      Filters
                    </h2>
                    <p className="numeric text-xs text-muted-strong">
                      {activeFilterCount === 0
                        ? "No filters applied"
                        : `${activeFilterCount} active`}
                    </p>
                  </div>
                </div>
                {activeFilterCount > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    trailingIcon={<X className="h-3 w-3" />}
                  >
                    Clear
                  </Button>
                ) : null}
              </header>

              <div className="space-y-5">
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-strong">
                    Role
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {ROLE_FILTER_OPTIONS.map((option) => (
                      <FilterChip
                        key={option.value}
                        label={option.label}
                        active={
                          option.value === "all"
                            ? roleFilter === "all"
                            : roleFilter === option.value
                        }
                        onClick={() =>
                          handleRoleFilter(
                            option.value === "all"
                              ? "all"
                              : option.value === roleFilter
                                ? "all"
                                : option.value,
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </aside>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {/* Search bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-strong" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-strong focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <UserListHeader
              searchDebounced={searchDebounced}
              roleFilter={roleFilter}
            />

            <Card variant="surface" padding="none">
              <UserList
                searchDebounced={searchDebounced}
                roleFilter={roleFilter}
                page={page}
                editingId={editingId}
                setEditingId={setEditingId}
                saving={saving}
                assignRole={assignRole}
              />
              <UserPagination
                searchDebounced={searchDebounced}
                roleFilter={roleFilter}
                page={page}
                setPage={setPage}
              />
            </Card>
          </div>
        </div>
      </HeroBody>
    </PageShell>
  );
}
