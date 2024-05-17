import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BotType } from "@/types/bot.type";
import { BotsTableRow } from "@/components/botsTableRow";

export default function BotsTable({
  data,
  refetch,
}: {
  data: BotType[];
  refetch: () => void;
}) {
  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>Bots</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">
                Category name
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <BotsTableRow item={item} key={index} refetch={refetch} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
