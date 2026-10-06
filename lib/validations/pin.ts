import { z } from "zod";

/** Shared 6-digit PIN shape — invite redemption, login, and the admin gate. */
export const pinSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "PIN must be exactly 6 digits.");

/** Join flow: choose a PIN and confirm it before it's ever sent to the server. */
export const setPinSchema = z
  .object({
    pin: pinSchema,
    confirmPin: pinSchema,
  })
  .refine((v) => v.pin === v.confirmPin, {
    message: "PINs don't match.",
    path: ["confirmPin"],
  });

export type SetPinValues = z.infer<typeof setPinSchema>;

/** Login flow: just the PIN (the browser already remembers *who*). */
export const loginPinSchema = z.object({ pin: pinSchema });
export type LoginPinValues = z.infer<typeof loginPinSchema>;

/** Master Admin PIN gate — a deploy-time secret, not tied to the 6-digit shape. */
export const adminPinSchema = z.object({
  pin: z.string().trim().min(1, "Enter the admin PIN."),
});
export type AdminPinValues = z.infer<typeof adminPinSchema>;
