"use client";

import type { SwapResult } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FeedbackBannerProps {
  result: SwapResult | null;
}

const VARIANT_BY_CODE: Record<string, string> = {
  OK_VALID: "feedback-success",
  OK_INVALID: "feedback-danger",
  OK_USED: "feedback-warning",
  OK_BLOCKED: "feedback-info",
  OK_ADMIN: "feedback-warning",
};

function variantOf(result: SwapResult): string {
  if (result.code === "OK" && !result.valid && result.candidate === result.original) {
    return VARIANT_BY_CODE.OK_ADMIN;
  }
  if (result.valid) return VARIANT_BY_CODE.OK_VALID;
  if (result.code === "USED_THIS_ROUND") return VARIANT_BY_CODE.OK_USED;
  if (result.code === "FORMAT_ERROR" || result.code === "NOT_A_CHANGE" || result.code === "NOT_EXACTLY_ONE_CHANGE") {
    return VARIANT_BY_CODE.OK_BLOCKED;
  }
  return VARIANT_BY_CODE.OK_INVALID;
}

function iconOf(result: SwapResult): string {
  if (result.code === "OK" && !result.valid && result.candidate === result.original) return "⏭";
  if (result.valid) return "✓";
  if (result.code === "USED_THIS_ROUND") return "↺";
  return "✕";
}

export default function FeedbackBanner({ result }: FeedbackBannerProps) {
  if (!result) {
    return (
      <div className={cn("feedback", "feedback-info")}>
        <span className="feedback-icon" aria-hidden="true">🤖</span>
        <div className="stack stack-xs">
          <span className="text-label">AI Referee ready</span>
          <span className="text-body-sm">
            Swap one letter for a new one and submit a valid English word.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("feedback", variantOf(result), "animate-enter")}>
      <span className="feedback-icon" aria-hidden="true">{iconOf(result)}</span>
      <div className="stack stack-xs">
        <span className="text-label">
          {result.valid
            ? `${result.playerName} played ${result.candidate}`
            : `${result.playerName}'s attempt: ${result.candidate || "—"}`}
        </span>
        <span className="text-body-sm">{result.message}</span>
        {result.valid ? (
          <span className="text-caption text-success">+1 point — next player is up.</span>
        ) : null}
      </div>
    </div>
  );
}
