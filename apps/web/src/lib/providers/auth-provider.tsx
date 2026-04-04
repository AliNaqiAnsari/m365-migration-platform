"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { setClerkTokenGetter } from "@/lib/api-client";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    setClerkTokenGetter(() => getToken());
  }, [getToken]);

  return <>{children}</>;
}
