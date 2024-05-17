import { api } from "@/services/api";
import { GetDataWithTypedSelect } from "@/types/types";
import { ClientType } from "@/types/client.type";
class ClientService {
  async getAll(
    data: GetDataWithTypedSelect<ClientType> | null = null,
  ): Promise<ClientType[]> {
    const res = await api.get(`/clients`, {
      params: {
        per_page: data?.perPage,
        page: data?.page,
        take_all: data?.take_all,
        select: data?.select,
        include_relations: data?.include_relations,
      },
    });
    return res.data;
  }
  async getById(id: number): Promise<ClientType> {
    const res = await api.get(`/clients/${id}`);
    return res.data;
  }
}

const clientService = new ClientService();
export default clientService;
