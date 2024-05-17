"use client";
import { ArrowDownToLine, Bot, Plus, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ClientTable from "@/components/clientsTable/ClientTable";
import { useGetClients } from "@/data/get-clients";
import { exportClientsData } from "@/lib/export.data";

export default function UsersPage() {
  const { data } = useGetClients();
  return (
    <>
      <h1 className="font-bold text-3xl mb-5 flex gap-2 items-center">
        Users <Users size={35} />
      </h1>
      <div className="flex gap-5 w-full sm:justify-end mb-5 flex-wrap">
        <Button className="flex gap-2" onClick={() => exportClientsData(data)}>
          Download <ArrowDownToLine />
        </Button>
      </div>
      <div className="">
        <ClientTable data={data} />
      </div>
    </>
  );
}
