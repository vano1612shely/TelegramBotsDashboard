"use client";
import { Button } from "@/components/ui/button";
import { Bot, Loader, Plus } from "lucide-react";
import Link from "next/link";
import { useGetCategories } from "@/data/get-categories";
import CategoriesTable from "@/components/categoriesTable";
import { useGetBots } from "@/data/get-bots";
import BotsTable from "@/components/botsTable";
export default function Bots() {
  const { data: categoryData } = useGetCategories();
  const { data: botsData, refetch: refetchBotData } = useGetBots();
  return (
    <>
      <h1 className="font-bold text-3xl mb-5 flex gap-2 items-center">
        Bots <Bot size={35} />
      </h1>
      <div className="flex gap-5 w-full sm:justify-end mb-5 flex-wrap">
        <Link href="/i/dashboard/bots/add-category">
          <Button className="flex gap-2">
            Add Category <Plus />
          </Button>
        </Link>
        <Link href="/i/dashboard/bots/add-bot">
          <Button className="flex gap-2">
            Add Bot <Plus />
          </Button>
        </Link>
      </div>
      <div className="flex gap-5 w-full flex-wrap">
        {categoryData ? <CategoriesTable data={categoryData} /> : ""}
        {botsData ? <BotsTable data={botsData} refetch={refetchBotData} /> : ""}
      </div>
    </>
  );
}
