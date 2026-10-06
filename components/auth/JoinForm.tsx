"use client";

import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { redeemInvite } from "@/lib/actions/auth";
import { setPinSchema, type SetPinValues } from "@/lib/validations/pin";
import { PinInput } from "@/components/auth/PinInput";

export function JoinForm({ token, assignedName }: { token: string; assignedName: string }) {
  const [isPending, startTransition] = useTransition();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isValid },
  } = useForm<SetPinValues>({
    resolver: zodResolver(setPinSchema),
    mode: "onChange",
    defaultValues: { pin: "", confirmPin: "" },
  });

  function onSubmit(values: SetPinValues) {
    startTransition(async () => {
      const result = await redeemInvite(token, values.pin);
      if (result.error) {
        setError("root", { message: result.error.message });
        return;
      }
      window.location.href = "/board"; // full navigation so the new session cookie is picked up everywhere
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex w-full max-w-xs flex-col items-center gap-5 text-center"
    >
      <div>
        <h1 className="text-base font-semibold text-text-primary">Hi {assignedName} 👋</h1>
        <p className="mt-1 text-xs text-text-muted">Create a 6-digit PIN to get into FriendBoard.</p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="text-[11px] text-text-faint">Choose a PIN</span>
        <Controller
          control={control}
          name="pin"
          render={({ field }) => (
            <PinInput value={field.value} onChange={field.onChange} disabled={isPending} />
          )}
        />
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="text-[11px] text-text-faint">Confirm it</span>
        <Controller
          control={control}
          name="confirmPin"
          render={({ field }) => (
            <PinInput value={field.value} onChange={field.onChange} autoFocus={false} disabled={isPending} />
          )}
        />
      </div>

      {(errors.confirmPin || errors.pin) && (
        <p role="alert" className="text-xs text-status-rejected">
          {errors.confirmPin?.message ?? errors.pin?.message}
        </p>
      )}
      {errors.root && (
        <p role="alert" className="text-xs text-status-rejected">
          {errors.root.message}
        </p>
      )}

      <button
        type="submit"
        disabled={!isValid || isPending}
        className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-accent/40 bg-accent/10 px-4 py-2 text-xs font-medium text-accent hover:bg-accent/20 disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
        Join FriendBoard
      </button>
    </form>
  );
}
