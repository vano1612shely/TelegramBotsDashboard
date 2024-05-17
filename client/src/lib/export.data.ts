import * as XLSX from "xlsx";
import { ClientType } from "@/types/client.type";
//
export const exportClientsData = async (data: ClientType[] | undefined) => {
  try {
    if (data && Array.isArray(data)) {
      const dataToExport = data.map((client: any) => ({
        id: client.id,
        name: client.name,
        username: "@" + client.username,
        category: client.category.name,
      }));
      // Create Excel workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils?.json_to_sheet(dataToExport);
      XLSX.utils.book_append_sheet(workbook, worksheet, "clients_data");
      // Save the workbook as an Excel file
      XLSX.writeFile(workbook, `clients_data.xlsx`);
    } else {
      console.log("#==================Export Error");
    }
  } catch (error: any) {
    console.log("#==================Export Error", error.message);
  }
};
