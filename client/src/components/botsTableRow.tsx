import botService from "@/services/bot.service";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader, Pause, Play, RefreshCcw, Trash } from "lucide-react";
import { BotType } from "@/types/bot.type";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import toast from "react-hot-toast";

export const BotsTableRow = ({
  item,
  refetch,
}: {
  item: BotType;
  refetch: () => void;
}) => {
  const { data, refetch: refetchData } = useQuery({
    queryKey: [`botstatus${item.id}`],
    queryFn: () => botService.getStatus(item.id),
  });
  const { mutate: stop, isSuccess: stopSuccess } = useMutation({
    mutationKey: [`stopbot${item.id}`],
    mutationFn: () => botService.stop(item.id),
  });

  const { mutate: start, isSuccess: startSuccess } = useMutation({
    mutationKey: [`startbot${item.id}`],
    mutationFn: () => botService.start(item.id),
  });

  const { mutate: reload, isSuccess: reloadSuccess } = useMutation({
    mutationKey: [`rebootbot${item.id}`],
    mutationFn: () => botService.reboot(item.id),
  });
  const { mutate: deleteBot, isSuccess: deleteSuccess } = useMutation({
    mutationKey: [`deletebot${item.id}`],
    mutationFn: () => botService.delete(item.id),
  });

  useEffect(() => {
    if (deleteSuccess) {
      toast.success(`Bot ${item.name} deleted`);
      refetch();
    }
  }, [deleteSuccess]);
  useEffect(() => {
    if (startSuccess) {
      toast.success(`Bot ${item.name} started`);
      refetchData();
    }
  }, [startSuccess]);
  useEffect(() => {
    if (reloadSuccess) {
      toast.success(`Bot ${item.name} rebooted`);
      refetchData();
    }
  }, [reloadSuccess]);
  useEffect(() => {
    if (stopSuccess) {
      toast.success(`Bot ${item.name} stopped`);
      refetchData();
    }
  }, [stopSuccess]);
  if (!data) {
    return <Loader className="animate-spin" />;
  }
  return (
    <TableRow>
      <TableCell className="font-medium">{item.name}</TableCell>
      <TableCell className="hidden md:table-cell">
        {item.category.name}
      </TableCell>
      <TableCell className="font-medium">{data}</TableCell>
      <TableCell className="font-medium">
        <div className="flex gap-2 flex-wrap">
          <Button variant="destructive" onClick={() => stop()}>
            <Pause />
          </Button>
          <Button variant="default" onClick={() => start()}>
            <Play />
          </Button>
          <Button variant="secondary" onClick={() => reload()}>
            <RefreshCcw />
          </Button>
          <Button variant="destructive" onClick={() => deleteBot()}>
            <Trash />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};
