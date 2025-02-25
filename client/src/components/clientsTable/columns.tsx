"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ClientType } from "@/types/client.type";
import { ArrowUpDown, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import dayjs from "dayjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import clientService from "@/services/client.service";

export const columns: ColumnDef<ClientType>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "username",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Username
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      if (row.original.username)
        return (
          <Link href={`https://t.me/${row.original.username}`} target="_blank">
            @{row.original.username}
          </Link>
        );
    },
  },
  {
    accessorKey: "chat_id",
    header: "Chat ID",
  },
  {
    accessorKey: "category",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Category
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <>
          {row.original.category_name
            ? row.original.category_name
            : row.original.category && row.original.category.name
              ? row.original.category.name
              : "Unknown"}
        </>
      );
    },
  },
  {
    accessorKey: "create_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <p>{dayjs(row.original.created_at).format("YYYY.MM.DD HH:mm:ss")}</p>
      );
    },
  },
  {
    accessorKey: "delete",
    header: "Delete",
    cell: ({ row }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const queryClient = useQueryClient();
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { mutate, isPending } = useMutation({
        mutationKey: ["delete"],
        mutationFn: () => clientService.delete(row.original.id),
        onSuccess: () => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          queryClient.refetchQueries({ queryKey: ["clients"] });
        },
      });
      return (
        <Button
          variant="destructive"
          onClick={() => mutate()}
          disabled={isPending}
        >
          <Trash />
        </Button>
      );
    },
  },
];
