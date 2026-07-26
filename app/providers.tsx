"use client";

import Link from "next/link";
import { Theme } from "@astryxdesign/core/theme";
import { LinkProvider } from "@astryxdesign/core/Link";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { ThemeProvider } from "next-themes";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { RoleProvider } from "@/lib/auth/role-context";
import { queryClient } from "@/lib/query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Theme theme={neutralTheme}>
      <LinkProvider component={Link}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="theme"
          disableTransitionOnChange
        >
          <QueryClientProvider client={queryClient}>
            <RoleProvider>{children}</RoleProvider>
          </QueryClientProvider>
          <Toaster
            position="top-right"
            richColors
            expand={false}
            closeButton
            duration={5000}
          />
        </ThemeProvider>
      </LinkProvider>
    </Theme>
  );
}
