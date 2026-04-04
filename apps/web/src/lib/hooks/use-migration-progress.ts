"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSSE } from "./use-sse";
import type { MigrationProgressEvent } from "@m365-migration/types";
import { QUERY_KEYS } from "@/lib/utils/constants";

export function useMigrationProgress(jobId: string, enabled = true) {
  const [progress, setProgress] = useState<MigrationProgressEvent | null>(null);
  const queryClient = useQueryClient();

  const onMessage = useCallback(
    (event: MigrationProgressEvent) => {
      setProgress(event);

      // Invalidate migration query when status changes to a terminal state
      if (["COMPLETED", "FAILED", "CANCELLED"].includes(event.status)) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MIGRATION(jobId) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MIGRATION_TASKS(jobId) });
      }
    },
    [jobId, queryClient]
  );

  useSSE<MigrationProgressEvent>({
    url: `/api/v1/migrations/${jobId}/stream`,
    enabled: enabled && !!jobId,
    onMessage,
  });

  return progress;
}
