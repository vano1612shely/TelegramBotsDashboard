import { api } from "@/services/api";
import { BotKeys, BotType } from "@/types/bot.type";
import { AddBotValues } from "@/app/i/dashboard/bots/add-bot/formSchema";
import { GetDataWithTypedSelect } from "@/types/types";

class BotService {
  async create(data: AddBotValues): Promise<BotType> {
    const res = await api.post(`/bots/create`, data);
    return res.data;
  }

  async getAll(
    data: GetDataWithTypedSelect<BotKeys> | null = null,
  ): Promise<BotType[]> {
    const res = await api.get(`/bots`, {
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

  async getById(id: number): Promise<BotType> {
    const res = await api.get(`/bots/${id}`);
    return res.data;
  }
  async delete(id: number): Promise<boolean> {
    const res = await api.delete(`/bots/${id}`);
    return res.data;
  }
  async stop(id: number): Promise<boolean> {
    const res = await api.get(`/bots/stop/${id}`);
    return res.data;
  }
  async start(id: number): Promise<boolean> {
    const res = await api.get(`/bots/start/${id}`);
    return res.data;
  }
  async reboot(id: number): Promise<boolean> {
    const res = await api.get(`/bots/reboot/${id}`);
    return res.data;
  }
  async getStatus(id: number): Promise<false | "stopped" | "started"> {
    const res = await api.get(`/bots/status/${id}`);
    return res.data;
  }
}

const botService = new BotService();
export default botService;
