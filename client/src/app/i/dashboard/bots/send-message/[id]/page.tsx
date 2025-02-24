"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import botService from "@/services/bot.service";
import { useParams } from "next/navigation";

export default function SendMessage() {
  const [text, setText] = useState<string>("");
  const param = useParams() as any;
  const [files, setFiles] = useState<FileList | null>(null);
  const { mutate, isPending } = useMutation({
    mutationKey: ["sendMessage"],
    mutationFn: () =>
      botService.sendMessage(param.id as number, text, files as FileList),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Відправити повідомлення
          <Link href="/i/dashboard/bots">
            <Button className="flex gap-2">
              <ChevronLeft />
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
        ></Textarea>
        <Input
          multiple
          type="file"
          onChange={(e) => setFiles(e.target.files)}
        ></Input>
        <Button
          className="bg-green-600"
          onClick={() => mutate()}
          disabled={isPending}
        >
          Відправити
          {isPending && <Loader2 className="animate-spin" />}
        </Button>
      </CardContent>
    </Card>
  );
}
