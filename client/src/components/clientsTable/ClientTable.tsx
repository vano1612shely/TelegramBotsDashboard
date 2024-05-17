"use client";
import { DataTable } from "@/components/clientsTable/data-table";
import { columns } from "@/components/clientsTable/columns";
import { useGetClients } from "@/data/get-clients";
import { ClientType } from "@/types/client.type";

export default function ClientTable({
  data,
}: {
  data: ClientType[] | undefined;
}) {
  return (
    <div className="container">
      {data && (
        <>
          <DataTable columns={columns} data={data} />
        </>
      )}
    </div>
  );
}
