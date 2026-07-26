"use client";

import { type ComponentType, type ReactNode } from "react";

interface LinkProviderProps {
  component?: ComponentType<{ href: string; children: ReactNode }>;
  children: ReactNode;
}

export function LinkProvider({ children }: LinkProviderProps) {
  return <>{children}</>;
}