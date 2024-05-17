import { z } from "zod";

export const editCategoryFormSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  text: z.string().max(200),
  image_link: z.string().min(1),
  buttons: z.array(
    z.object({
      title: z.string().min(1),
      link: z.string().min(1),
    }),
  ),
});

export type EditCategoryValues = z.infer<typeof editCategoryFormSchema>;
