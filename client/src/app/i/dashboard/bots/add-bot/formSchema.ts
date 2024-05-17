import { z } from "zod";

export const addBotFormSchema = z.object({
  name: z.string().min(1),
  token: z.string().min(1),
  category_id: z.number(),
});

export type AddBotValues = z.infer<typeof addBotFormSchema>;
