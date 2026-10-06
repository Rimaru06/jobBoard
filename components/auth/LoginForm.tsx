"use client";

import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { loginWithPin } from "@/lib/actions/auth";
import { loginPinSchema, type LoginPinValues } from "@/lib/validations/pin";
import { PinInput } from "@/components/auth/PinInput";

export function LoginForm({ userId, name, next }: { userId: string; name: string; next: string }) {
  const [isPending, startTransition] = useTransition();
  const {
    control,
    handleSubmit,
    setError,
    resetField,
    formState: { errors, isValid },
  } = useForm<LoginPinValues>({
    resolver: zodResolver(loginPinSchema),
    mode: "onChange",
    defaultValues: { pin: "" },
  });

  function onSubmit(values: LoginPinValues) {
    startTransition(async () => {
      const result = await loginWithPin(userId, values.pin);
      if (result.error) {
        setError("root", { message: result.error.message });
        resetField("pin");
        return;
      }
      window.location.href = next || "/board";
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex w-full max-w-xs flex-col items-center gap-5 text-center"
    >
      <div>
        <h1 className="text-base font-semibold text-text-primary">Welcome back, {name}</h1>
        <p className="mt-1 text-xs text-text-muted">Enter your PIN to continue.</p>
      </div>

      <Controller
        control={control}
        name="pin"
        render={({ field }) => (
          <PinInput value={field.value} onChange={field.onChange} disabled={isPending} />
        )}
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
        Unlock
      </button>
    </form>
  );
}
