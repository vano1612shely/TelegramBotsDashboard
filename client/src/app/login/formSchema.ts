import { z } from "zod";

export const formSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

export type FormValues = z.infer<typeof formSchema>;
