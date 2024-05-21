"use client";
import Link from "next/link";
import {
  Bot,
  FolderKanban,
  LogOut,
  Users,
  Menu as MenuIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import authService from "@/services/auth.service";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function Menu() {
  const router = useRouter();
  return (
    <>
      <TooltipProvider>
        <Sheet>
          <SheetTrigger className="sm:hidden p-2">
            <MenuIcon size={30} />
          </SheetTrigger>
          <SheetContent side="left" className="sm:hidden">
            <nav className="flex flex-col items-start gap-4 px-2 py-5">
              <SheetClose asChild>
                <Link
                  href="/i/dashboard"
                  className="flex items-center justify-center gap-2"
                >
                  <FolderKanban className="h-5 w-5" />
                  <span>Overview</span>
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link
                  href="/i/dashboard/users"
                  className="flex items-center justify-center gap-2"
                >
                  <Users className="h-5 w-5" />
                  <span>Users</span>
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link
                  href="/i/dashboard/bots"
                  className="flex items-center justify-center gap-2"
                >
                  <Bot className="h-5 w-5" />
                  <span>Bots</span>
                </Link>
              </SheetClose>
            </nav>
            <nav className="mt-auto flex flex-col items-start gap-4 px-2 py-5">
              <SheetClose asChild>
                <Link
                  href="#"
                  onClick={async (e) => {
                    e.preventDefault();
                    const res = await authService.logout();
                    if (res) {
                      router.push("/login", { scroll: false });
                    }
                  }}
                  className="flex items-center justify-center gap-2"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </Link>
              </SheetClose>
            </nav>
          </SheetContent>
        </Sheet>
        <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
          <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/i/dashboard"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <FolderKanban className="h-5 w-5" />
                  <span className="sr-only">Overview</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Overview</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/i/dashboard/users"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <Users className="h-5 w-5" />
                  <span className="sr-only">Users</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Users</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/i/dashboard/bots"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <Bot className="h-5 w-5" />
                  <span className="sr-only">Bots</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Bots</TooltipContent>
            </Tooltip>
          </nav>
          <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="#"
                  onClick={async (e) => {
                    e.preventDefault();
                    const res = await authService.logout();
                    if (res) {
                      router.push("/login", { scroll: false });
                    }
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Logout</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Logout</TooltipContent>
            </Tooltip>
          </nav>
        </aside>
      </TooltipProvider>
    </>
  );
}
