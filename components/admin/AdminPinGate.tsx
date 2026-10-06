"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { verifyAdminPin } from "@/lib/actions/admin";
import { adminPinSchema, type AdminPinValues } from "@/lib/validations/pin";

/**
 * Not the same component as PinInput/JoinForm's 6-box UI on purpose —
 * the Master Admin PIN is a deploy-time secret, not a per-person
 * 6-digit code, so it's a plain masked field rather than boxes sized
 * to exactly 6 digits.
 */
export function AdminPinGate() {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    resetField,
    formState: { errors, isValid },
  } = useForm<AdminPinValues>({
    resolver: zodResolver(adminPinSchema),
    mode: "onChange",
    defaultValues: { pin: "" },
  });

  function onSubmit(values: AdminPinValues) {
    startTransition(async () => {
      const result = await verifyAdminPin(values.pin);
      if (result.error) {
        setError("root", { message: result.error.message });
        resetField("pin");
        return;
      }
      window.location.reload(); // re-render the page server-side now that the admin cookie is set
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex w-full max-w-xs flex-col items-center gap-4 text-center"
    >
      <ShieldCheck className="h-5 w-5 text-text-faint" aria-hidden />
      <div>
        <h1 className="text-sm font-medium text-text-primary">Admin access</h1>
        <p className="mt-1 text-xs text-text-muted">Enter the Master Admin PIN to continue.</p>
      </div>

      <input
        type="password"
        inputMode="numeric"
        autoFocus
        disabled={isPending}
        aria-invalid={Boolean(errors.pin)}
        {...register("pin")}
        className="w-full rounded-sm border border-border bg-bg px-3 py-2 text-center text-sm tracking-widest text-text-primary focus:border-accent disabled:opacity-50"
      />

      {(errors.pin || errors.root) && (
        <p role="alert" className="text-xs text-status-rejected">
          {errors.pin?.message ?? errors.root?.message}
        </p>
      )}

      <button
        type="submit"
        disabled={!isValid || isPending}
        className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-accent/40 bg-accent/10 px-4 py-2 text-xs font-medium text-accent hover:bg-accent/20 disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
        Enter
      </button>
    </form>
  );
}
