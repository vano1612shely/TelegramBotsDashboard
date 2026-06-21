import {api} from "@/services/api";
import {BotChat, BotKeys, BotType, ChatSuggestion, SendTarget} from "@/types/bot.type";
import {AddBotValues} from "@/app/i/dashboard/bots/add-bot/formSchema";
import {GetDataWithTypedSelect} from "@/types/types";

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
                take_all: true,
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

    async sendMessage(
        categoryId: number,
        message: string,
        files?: FileList | null,
        buttons?: any[],
        target: SendTarget = "clients",
        chats?: string[],
        buttonsMessageTitle?: string,
    ) {
        const formData = new FormData();
        formData.append("categoryId", categoryId.toString()); // ⚡ Перетворюємо в рядок
        formData.append("message", message);
        formData.append("target", target);
        if (buttons && buttons.length > 0) {
            formData.append("buttons", JSON.stringify(buttons)); // ✅ Сюди йде масив
        }
        if (chats && chats.length > 0) {
            formData.append("chats", JSON.stringify(chats));
        }
        if (buttonsMessageTitle) {
            formData.append("buttonsMessageTitle", buttonsMessageTitle);
        }
        if (files)
            Array.from(files).forEach((file) => {
                formData.append("files", file); // Ensure 'files' matches @UploadedFiles()
            });
        const res = await api.post(`/bots/send-message`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        return res.data;
    }

    async getChats(categoryId: number): Promise<BotChat[]> {
        const res = await api.get(`/bots/chats/${categoryId}`);
        return res.data;
    }

    async addChat(categoryId: number, identifier: string): Promise<BotChat> {
        const res = await api.post(`/bots/chats/create`, {categoryId, identifier});
        return res.data;
    }

    async deleteChat(id: number): Promise<boolean> {
        const res = await api.delete(`/bots/chats/${id}`);
        return res.data;
    }

    async getChatSuggestions(categoryId: number, query?: string): Promise<ChatSuggestion[]> {
        const res = await api.get(`/bots/chats/suggestions/${categoryId}`, {
            params: {query: query || undefined},
        });
        return res.data;
    }
}

const botService = new BotService();
export default botService;
