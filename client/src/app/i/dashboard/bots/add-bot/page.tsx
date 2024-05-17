"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import botCategoryService from "@/services/bot-category.service";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
  CommandItem,
} from "@/components/ui/command";
import { Check, Loader } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  addBotFormSchema,
  AddBotValues,
} from "@/app/i/dashboard/bots/add-bot/formSchema";
import { BotCategoryType } from "@/types/bot-category.type";
import Image from "next/image";
import { AddCategoryValues } from "@/app/i/dashboard/bots/add-category/formSchema";
import botService from "@/services/bot.service";
import { AxiosError } from "axios";
export default function AddBot() {
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () =>
      botCategoryService.getAll({
        select: ["id", "name", "image_link"],
        include_relations: false,
        take_all: true,
      }),
  });
  const [commandValue, setCommandValue] = useState<BotCategoryType>();
  const {
    mutate,
    data: addBotData,
    error,
  } = useMutation({
    mutationKey: ["add category"],
    mutationFn: (values: AddBotValues) => botService.create(values),
  });
  const { register, handleSubmit, formState, getValues, reset, setValue } =
    useForm<AddBotValues>({
      defaultValues: {},
      resolver: zodResolver(addBotFormSchema),
    });
  const { errors } = formState;
  useEffect(() => {
    for (const key in errors) {
      // @ts-ignore
      toast.error(key + " " + errors[key].message);
    }
  }, [errors]);
  useEffect(() => {
    if (error) {
      const e = error as AxiosError;
      toast.error(
        // @ts-ignore
        e.response?.data?.message ? e.response?.data?.message : e.message,
      );
    }
  }, [error]);
  useEffect(() => {
    console.log(addBotData);
    if (addBotData) {
      reset();
      toast.success("Bot added");
    }
  }, [addBotData]);
  const onSubmit = async (props: AddBotValues) => {
    mutate(props);
  };
  if (!categories) {
    return <Loader className="text-2xl animate-spin" />;
  }
  return (
    <>
      <h1 className="font-bold text-3xl mb-5">Add Bot</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-5 mb-5">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Bot Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="name">Bot name</Label>
                  <Input
                    {...register("name")}
                    id="name"
                    type="text"
                    className="w-full"
                    placeholder="Bot name:"
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="token">Bot token</Label>
                  <Input
                    {...register("token")}
                    id="token"
                    type="text"
                    className="w-full"
                    placeholder="Bot token:"
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="category">Category</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="category"
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-[200px] justify-between",
                          !getValues("category_id") && "text-muted-foreground",
                        )}
                      >
                        {commandValue
                          ? categories.find(
                              (category) => category.id === commandValue.id,
                            )?.name
                          : "Select category"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                      <Command>
                        <CommandInput placeholder="Search category by name..." />
                        <CommandList>
                          <CommandEmpty>No categories found.</CommandEmpty>
                          <CommandGroup>
                            {categories.map((category) => {
                              return (
                                <CommandItem
                                  value={String(category.id)}
                                  key={category.id}
                                  onSelect={() => {
                                    setValue("category_id", category.id);
                                    setCommandValue(category);
                                  }}
                                  className="flex gap-2"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      getValues("category_id") === category.id
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  <Image
                                    src={category.image_link}
                                    height={1000}
                                    width={1000}
                                    className="w-10 h-10"
                                    alt="category image"
                                  />
                                  <p>
                                    #{category.id} {category.name}
                                  </p>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Button type="submit" className="text-lg">
          Create
        </Button>
      </form>
    </>
  );
}
