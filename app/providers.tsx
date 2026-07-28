"use client";

import Link from "next/link";
import { Theme } from "@astryxdesign/core/theme";
import { LinkProvider } from "@astryxdesign/core/Link";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { RoleProvider } from "@/lib/auth/role-context";
import { queryClient } from "@/lib/query-client";
import { AblyClientProvider } from "./ably-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  // ThemeProvider (next-themes) was removed 2026-07-28. Light mode is the
  // single source of truth; the previous attribute="class" implementation
  // wrote a "dark" class on <html> on every render and produced rendering
  // inconsistencies. Astryx still provides a separate <Theme> wrapper above
  // for its own neutral theme tokens; that is unrelated to dark-mode and
  // is preserved.
  return (
    <Theme theme={neutralTheme}>
      <LinkProvider component={Link}>
        <QueryClientProvider client={queryClient}>
          <AblyClientProvider>
            <RoleProvider>{children}</RoleProvider>
          </AblyClientProvider>
        </QueryClientProvider>
        <Toaster
          position="top-right"
          richColors
          expand={false}
          closeButton
          duration={5000}
        />
      </LinkProvider>
    </Theme>
  );
}
