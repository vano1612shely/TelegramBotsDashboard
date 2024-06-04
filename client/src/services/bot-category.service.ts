import { api } from "@/services/api";
import { AddCategoryValues } from "@/app/i/dashboard/bots/add-category/formSchema";
import { BotCategoryKeys, BotCategoryType } from "@/types/bot-category.type";
import { GetDataWithTypedSelect } from "@/types/types";
import { EditCategoryValues } from "@/app/i/dashboard/bots/edit-category/[id]/formSchema";
class BotCategoryService {
  async create(data: AddCategoryValues): Promise<BotCategoryType> {
    const res = await api.post(`/categories/create`, data);
    return res.data;
  }

  async getAll(
    data: GetDataWithTypedSelect<BotCategoryKeys> | null = null,
  ): Promise<BotCategoryType[]> {
    const res = await api.get(`/categories`, {
      params: {
        per_page: data?.perPage,
        page: data?.page,
        take_all: true,
        select: data?.select,
        include_relations: data?.include_relations,
      },
    });
    return res.data;
  }

  async getById(id: number): Promise<BotCategoryType> {
    const res = await api.get(`/categories/${id}`);
    return res.data;
  }

  async update(data: EditCategoryValues): Promise<BotCategoryType> {
    const res = await api.patch(`/categories/${data.id}`, data);
    return res.data;
  }

  async delete(id: number) {
    const res = await api.delete(`/categories/${id}`);
    return res.data;
  }
}

const botCategoryService = new BotCategoryService();
export default botCategoryService;
