import { useQuery } from "@tanstack/react-query";
import clientService from "@/services/client.service";

export function useGetClients() {
  return useQuery({
    queryFn: () => clientService.getAll(),
    queryKey: ["clients"],
  });
}
