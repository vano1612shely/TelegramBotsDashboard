"use client";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Textarea} from "@/components/ui/textarea";
import {useState} from "react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import Link from "next/link";
import {ChevronLeft, Loader2, Trash2} from "lucide-react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import botService from "@/services/bot.service";
import {useParams} from "next/navigation";
import toast from "react-hot-toast";
import axios from "axios";
import {SendTarget} from "@/types/bot.type";

export default function SendMessage() {
    const [text, setText] = useState<string>("");
    const [files, setFiles] = useState<FileList | null>(null);
    const [buttons, setButtons] = useState<{ title: string; link: string }[]>([]);
    const [target, setTarget] = useState<SendTarget>("clients");
    const [newChat, setNewChat] = useState<string>("");
    const [suggestOpen, setSuggestOpen] = useState<boolean>(false);

    const MAX_LENGTH_WITH_FILES = 1024;
    const MAX_LENGTH_WITHOUT_FILES = 4096;

    const param = useParams() as any;
    const categoryId = param.id as number;
    const queryClient = useQueryClient();

    const sendsToChats = target === "chats" || target === "all";

    const {data: chats, isLoading: chatsLoading} = useQuery({
        queryKey: ["botChats", categoryId],
        queryFn: () => botService.getChats(categoryId),
        enabled: sendsToChats,
    });

    const {data: suggestions, isFetching: suggestionsLoading} = useQuery({
        queryKey: ["chatSuggestions", categoryId, newChat],
        queryFn: () => botService.getChatSuggestions(categoryId, newChat),
        enabled: sendsToChats,
    });

    const {mutate: addChat, isPending: addingChat} = useMutation({
        mutationKey: ["addChat", categoryId],
        mutationFn: (identifier: string) => botService.addChat(categoryId, identifier),
        onError: (e) => {
            if (axios.isAxiosError(e)) {
                toast.error(e.response?.data?.message || e.response?.data || e.message);
            }
        },
        onSuccess: () => {
            setNewChat("");
            setSuggestOpen(false);
            queryClient.invalidateQueries({queryKey: ["botChats", categoryId]});
            queryClient.invalidateQueries({queryKey: ["chatSuggestions", categoryId]});
        },
    });

    const statusLabel = (status: string) =>
        status === "creator" ? "власник" : status === "administrator" ? "адмін" : "учасник";

    const {mutate: removeChat} = useMutation({
        mutationKey: ["deleteChat", categoryId],
        mutationFn: (id: number) => botService.deleteChat(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["botChats", categoryId]});
        },
    });

    const {mutate, isPending} = useMutation({
        mutationKey: ["sendMessage"],
        mutationFn: () =>
            botService.sendMessage(
                categoryId,
                text,
                files,
                buttons.filter((btn) => btn.title && btn.link),
                target
            ),
        onError: (e) => {
            if (axios.isAxiosError(e)) {
                toast.error(e.response?.data || e.message);
            }
        },
        onSuccess: () => {
            toast.success("Повідомлення відправлено");
        },
    });

    const addButton = () => {
        setButtons([...buttons, {title: "", link: ""}]);
    };

    const updateButton = (index: number, field: "title" | "link", value: string) => {
        const updated = [...buttons];
        updated[index][field] = value;
        setButtons(updated);
    };

    const removeButton = (index: number) => {
        setButtons(buttons.filter((_, i) => i !== index));
    };

    const handleAddChat = () => {
        const value = newChat.trim();
        if (!value) {
            toast.error("Вкажіть id чату або @username каналу");
            return;
        }
        addChat(value);
    };

    const validateForm = (): boolean => {
        const trimmedText = text.trim();
        const hasFiles = Boolean(files && files.length);
        const maxMessageLength = hasFiles ? MAX_LENGTH_WITH_FILES : MAX_LENGTH_WITHOUT_FILES;

        if (!trimmedText && !hasFiles) {
            toast.error("Повідомлення не може бути пустим");
            return false;
        }

        const overLimit = text.length - maxMessageLength;
        if (overLimit > 0) {
            toast.error(`Текст перевищує максимальну довжину на ${overLimit} символів (максимум ${maxMessageLength})`);
            return false;
        }

        if (sendsToChats && (!chats || chats.length === 0)) {
            toast.error("Додайте хоча б один чат або канал для розсилки");
            return false;
        }

        for (let i = 0; i < buttons.length; i++) {
            const btn = buttons[i];
            if (!btn.title.trim()) {
                toast.error(`Кнопка #${i + 1}: текст не може бути пустим`);
                return false;
            }

            try {
                new URL(btn.link); // Перевірка на валідне посилання
            } catch {
                toast.error(`Кнопка #${i + 1}: посилання не є валідним`);
                return false;
            }
        }

        return true;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;
        mutate();
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    Відправити повідомлення
                    <Link href="/i/dashboard/bots">
                        <Button className="flex gap-2">
                            <ChevronLeft/>
                            Назад
                        </Button>
                    </Link>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 mb-5">
                <div className="flex flex-col gap-2">
                    <h4 className="font-medium">Кому відправити</h4>
                    <Select value={target} onValueChange={(v) => setTarget(v as SendTarget)}>
                        <SelectTrigger>
                            <SelectValue/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="clients">Клієнтам (особисті повідомлення)</SelectItem>
                            <SelectItem value="chats">Чати та канали</SelectItem>
                            <SelectItem value="all">Клієнтам + чати та канали</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Textarea
                    placeholder="Повідомлення"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />

                <div className="flex flex-col gap-1">
                    <Input
                        multiple
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => setFiles(e.target.files)}
                    />
                    <span className="text-xs text-muted-foreground">
                        Можна додати фото та/або відео (до 10 файлів)
                    </span>
                </div>

                {sendsToChats && (
                    <div className="flex flex-col gap-3 border rounded-md p-4">
                        <h4 className="font-medium">Чати та канали</h4>
                        <p className="text-xs text-muted-foreground">
                            Вкажіть id групового чату (напр. -1001234567890) або канал через @username.
                            Боти категорії мають бути додані адмінами у ці чати/канали — повідомлення
                            відправить той бот, який має право публікації.
                        </p>

                        <div className="grid grid-cols-[1fr_auto] gap-3">
                            <Popover open={suggestOpen} onOpenChange={setSuggestOpen}>
                                <PopoverTrigger asChild>
                                    <Input
                                        placeholder="@channel або -1001234567890"
                                        value={newChat}
                                        onChange={(e) => {
                                            setNewChat(e.target.value);
                                            setSuggestOpen(true);
                                        }}
                                        onFocus={() => setSuggestOpen(true)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddChat();
                                            }
                                        }}
                                    />
                                </PopoverTrigger>
                                <PopoverContent
                                    align="start"
                                    onOpenAutoFocus={(e) => e.preventDefault()}
                                    className="p-0 w-[var(--radix-popover-trigger-width)]"
                                >
                                    <Command shouldFilter={false}>
                                        <CommandList>
                                            {suggestionsLoading ? (
                                                <div className="py-4 text-center text-sm text-muted-foreground">
                                                    Пошук...
                                                </div>
                                            ) : (
                                                <>
                                                    <CommandEmpty>
                                                        Нічого не знайдено. Можна ввести id або @username вручну.
                                                    </CommandEmpty>
                                                    {suggestions && suggestions.length > 0 && (
                                                        <CommandGroup heading="Де присутній бот">
                                                            {suggestions.map((s) => (
                                                                <CommandItem
                                                                    key={s.chat_id}
                                                                    value={s.identifier}
                                                                    onSelect={() => addChat(s.identifier)}
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-medium">
                                                                            {s.title || s.identifier}
                                                                        </span>
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {s.identifier} ·{" "}
                                                                            {s.type === "channel" ? "канал" : "група"} ·{" "}
                                                                            {statusLabel(s.bestStatus)}
                                                                        </span>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    )}
                                                </>
                                            )}
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <Button type="button" onClick={handleAddChat} disabled={addingChat}>
                                Додати
                                {addingChat && <Loader2 className="animate-spin ml-2 w-4 h-4"/>}
                            </Button>
                        </div>

                        {chatsLoading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="animate-spin w-4 h-4"/>
                                Завантаження...
                            </div>
                        ) : chats && chats.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {chats.map((chat) => (
                                    <div
                                        key={chat.id}
                                        className="flex items-center justify-between gap-3 border rounded-md px-3 py-2"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">
                                                {chat.title || chat.identifier}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {chat.identifier} · {chat.type === "channel" ? "канал" : "група"}
                                                {chat.adminBots && chat.adminBots.length > 0
                                                    ? ` · адміни: ${chat.adminBots.join(", ")}`
                                                    : " · немає ботів-адмінів"}
                                            </span>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            onClick={() => removeChat(chat.id)}
                                        >
                                            <Trash2 className="w-4 h-4"/>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <span className="text-sm text-muted-foreground">
                                Ще не додано жодного чату чи каналу
                            </span>
                        )}
                    </div>
                )}

                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h4 className="font-medium">Кнопки</h4>
                        <Button type="button" onClick={addButton} size="sm" variant="outline">
                            Додати кнопку
                        </Button>
                    </div>

                    {buttons.map((btn, index) => (
                        <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center">
                            <Input
                                placeholder="Текст кнопки"
                                value={btn.title}
                                onChange={(e) => updateButton(index, "title", e.target.value)}
                            />
                            <Input
                                placeholder="Посилання"
                                value={btn.link}
                                type="url"
                                onChange={(e) => updateButton(index, "link", e.target.value)}
                            />
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => removeButton(index)}
                            >
                                <Trash2 className="w-4 h-4"/>
                            </Button>
                        </div>
                    ))}
                </div>

                <Button
                    className="bg-green-600"
                    onClick={handleSubmit}
                    disabled={isPending}
                >
                    Відправити
                    {isPending && <Loader2 className="animate-spin ml-2"/>}
                </Button>
            </CardContent>
        </Card>
    );
}
