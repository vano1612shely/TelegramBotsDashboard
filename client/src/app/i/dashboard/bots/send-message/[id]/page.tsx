"use client";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Textarea} from "@/components/ui/textarea";
import {useState} from "react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import Link from "next/link";
import {ChevronLeft, Loader2} from "lucide-react";
import {useMutation} from "@tanstack/react-query";
import botService from "@/services/bot.service";
import {useParams} from "next/navigation";
import toast from "react-hot-toast";
import axios from "axios";

export default function SendMessage() {
    const [text, setText] = useState<string>("");
    const [files, setFiles] = useState<FileList | null>(null);
    const [buttons, setButtons] = useState<{ title: string; link: string }[]>([]);

    const param = useParams() as any;

    const {mutate, isPending} = useMutation({
        mutationKey: ["sendMessage"],
        mutationFn: () =>
            botService.sendMessage(
                param.id as number,
                text,
                files as FileList,
                buttons.filter((btn) => btn.title && btn.link) // очищаємо пусті кнопки
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
                <Textarea
                    placeholder="Повідомлення"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />

                <Input
                    multiple
                    type="file"
                    onChange={(e) => setFiles(e.target.files)}
                />

                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h4 className="font-medium">Кнопки</h4>
                        <Button type="button" onClick={addButton} size="sm" variant="outline">
                            Додати кнопку
                        </Button>
                    </div>

                    {buttons.map((btn, index) => (
                        <div key={index} className="grid grid-cols-2 gap-3">
                            <Input
                                placeholder="Текст кнопки"
                                value={btn.title}
                                onChange={(e) => updateButton(index, "title", e.target.value)}
                            />
                            <Input
                                placeholder="Посилання"
                                value={btn.link}
                                onChange={(e) => updateButton(index, "link", e.target.value)}
                            />
                        </div>
                    ))}
                </div>

                <Button
                    className="bg-green-600"
                    onClick={() => mutate()}
                    disabled={isPending}
                >
                    Відправити
                    {isPending && <Loader2 className="animate-spin ml-2"/>}
                </Button>
            </CardContent>
        </Card>
    );
}