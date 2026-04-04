"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { MIGRATION_PHASES, PHASE_LABELS } from "@/lib/utils/constants";

interface PhaseTimelineProps {
  currentPhase: string;
  status: string;
}

export function PhaseTimeline({ currentPhase, status }: PhaseTimelineProps) {
  const currentIndex = MIGRATION_PHASES.indexOf(currentPhase as any);
  const isFailed = status === "FAILED";
  const isCancelled = status === "CANCELLED";

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {MIGRATION_PHASES.map((phase, i) => {
        const isCompleted = i < currentIndex || (currentPhase === "COMPLETED" && i <= currentIndex);
        const isCurrent = i === currentIndex;
        const isErrored = isCurrent && (isFailed || isCancelled);

        return (
          <div key={phase} className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all",
                  isCompleted
                    ? "bg-success text-white"
                    : isErrored
                      ? "bg-destructive text-white"
                      : isCurrent
                        ? "bg-brand text-white ring-4 ring-brand/20"
                        : "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  "mt-1.5 text-[10px] whitespace-nowrap",
                  isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                {PHASE_LABELS[phase]}
              </span>
            </div>
            {i < MIGRATION_PHASES.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-6 sm:w-10 transition-all",
                  i < currentIndex ? "bg-success" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
