import { Bot, FolderKanban } from "lucide-react";

export default function Dashboard() {
  return (
    <>
      <h1 className="font-bold text-3xl mb-5 flex gap-2 items-center">
        Overview <FolderKanban size={35} />
      </h1>
      <div className="flex gap-5 w-full mb-5 flex-wrap justify-between"></div>
    </>
  );
}
