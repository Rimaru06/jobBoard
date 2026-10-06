"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";

const LENGTH = 6;

/**
 * Six-box PIN entry. Reports the full string via onChange on every
 * keystroke; parent components decide when it's "complete" (length
 * === 6) and submit. Handles digit-only input, auto-advance/back, and
 * paste (e.g. from a password manager or a shared clipboard).
 */
export function PinInput({
  value,
  onChange,
  autoFocus = true,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value
    .padEnd(LENGTH, " ")
    .split("")
    .map((d) => (d === " " ? "" : d));

  function setDigit(index: number, digit: string) {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join("").trimEnd());
    if (digit && index < LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    inputRefs.current[Math.min(pasted.length, LENGTH - 1)]?.focus();
  }

  return (
    <div className="flex gap-2" onPaste={handlePaste}>
      {Array.from({ length: LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="password"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          value={digits[i]}
          onChange={(e) => setDigit(i, e.target.value.replace(/\D/g, "").slice(-1))}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={cn(
            "h-11 w-9 rounded-sm border border-border bg-bg text-center text-base text-text-primary",
            "focus:border-accent focus:shadow-glow-sm disabled:opacity-50"
          )}
          style={{ "--glow-color": "rgba(91,141,239,0.4)" } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
