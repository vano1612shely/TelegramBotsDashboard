import { useQuery } from "@tanstack/react-query";
import botService from "@/services/bot.service";

export function useGetBots() {
  return useQuery({
    queryFn: () => botService.getAll(),
    queryKey: ["bots"],
  });
}
