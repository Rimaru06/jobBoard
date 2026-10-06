import { z } from "zod";

/** Creator Dashboard "invite a friend" form. */
export const generateInviteSchema = z.object({
  assignedName: z.string().trim().min(1, "Enter a name for the invite.").max(80, "Too long"),
});

export type GenerateInviteValues = z.infer<typeof generateInviteSchema>;
