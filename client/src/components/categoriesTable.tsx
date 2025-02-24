import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import { BotCategoryType } from "@/types/bot-category.type";
import { Button } from "@/components/ui/button";
import {Pencil, Send, Trash} from "lucide-react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import BotCategoryService from "@/services/bot-category.service";
import { useEffect } from "react";
import BotService from "@/services/bot.service";

export default function CategoriesTable({ data }: { data: BotCategoryType[] }) {
  const { mutate, data: deleteData } = useMutation({
    mutationKey: ["deleteCategory"],
    mutationFn: (id: number) => BotCategoryService.delete(id),
  });
  const { refetch: refetchCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => BotCategoryService.getAll(),
  });
  const { refetch: refetchBots } = useQuery({
    queryKey: ["bots"],
    queryFn: () => BotService.getAll(),
  });
  useEffect(() => {
    if (deleteData) {
      refetchCategories();
      refetchBots();
    }
  }, [deleteData]);
  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>Categories</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden sm:table-cell">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Text</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="hidden sm:table-cell">
                  <Image
                    alt="Category image"
                    className="aspect-square rounded-md object-cover w-10 h-10"
                    height={1000}
                    src={item.image_link}
                    width={1000}
                  />
                </TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {item.text}
                </TableCell>
                <TableCell className="flex items-center gap-2">
                  <Link href={`/i/dashboard/bots/edit-category/${item.id}`}>
                    <Button>
                      <Pencil />
                    </Button>
                  </Link>
                  <Button variant="destructive" onClick={() => mutate(item.id)}>
                    <Trash />
                  </Button>
                  <Link href={`/i/dashboard/bots/send-message/${item.id}`}>
                    <Button>
                      <Send />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
