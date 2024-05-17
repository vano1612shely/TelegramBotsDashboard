import { useQuery } from "@tanstack/react-query";
import botCategoryService from "@/services/bot-category.service";

export function useGetCategories() {
  return useQuery({
    queryFn: () => botCategoryService.getAll(),
    queryKey: ["categories"],
  });
}
