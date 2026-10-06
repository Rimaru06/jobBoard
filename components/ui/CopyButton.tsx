"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-sm border border-border px-2 py-1 text-[11px] text-text-muted hover:border-border-hover hover:text-text-primary",
        className
      )}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-status-offered" aria-hidden /> Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" aria-hidden /> Copy
        </>
      )}
    </button>
  );
}
