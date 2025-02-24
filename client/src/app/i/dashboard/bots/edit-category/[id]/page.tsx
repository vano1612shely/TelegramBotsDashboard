"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "@/components/ui/upload";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import fileService from "@/services/file.service";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import botCategoryService from "@/services/bot-category.service";
import BotCategoryService from "@/services/bot-category.service";
import toast from "react-hot-toast";
import {
  editCategoryFormSchema,
  EditCategoryValues,
} from "@/app/i/dashboard/bots/edit-category/[id]/formSchema";
import { useParams } from "next/navigation";

export default function EditCategory() {
  const param = useParams();
  const [imageUrl, setImageUrl] = useState<string>("");
  const { data: categoryData } = useQuery({
    queryKey: [`getCategory${param.id}`],
    queryFn: () => BotCategoryService.getById(Number(param.id)),
  });
  const {
    mutate: uploadImage,
    data,
    isPending,
  } = useMutation({
    mutationKey: ["uploadImage"],
    mutationFn: (image: File) => fileService.upload(image),
  });
  const { register, handleSubmit, control, formState, reset, setValue } =
    useForm<EditCategoryValues>({
      resolver: zodResolver(editCategoryFormSchema),
    });
  const { errors } = formState;
  const { append, fields, remove } = useFieldArray({
    control: control,
    name: "buttons",
  });
  const { mutate, data: editCategoryData } = useMutation({
    mutationKey: ["edit category"],
    mutationFn: (values: EditCategoryValues) =>
      botCategoryService.update(values),
  });
  useEffect(() => {
    if (categoryData) {
      setValue("id", categoryData.id);
      setValue("name", categoryData.name);
      setValue("text", categoryData.text);
      setValue("image_link", categoryData.image_link);
      setImageUrl(categoryData.image_link);
      setValue("buttons", categoryData.buttons);
    }
  }, [categoryData]);
  useEffect(() => {
    if (data) {
      setValue("image_link", data.full_link);
      setImageUrl(data.full_link);
    }
  }, [data]);
  useEffect(() => {
    for (const key in errors) {
      // @ts-ignore
      toast.error(key + " " + errors[key].message);
    }
  }, [errors]);
  useEffect(() => {
    if (editCategoryData) {
      toast.success("Category updated");
    }
  }, [editCategoryData]);
  const onSubmit = async (props: EditCategoryValues) => {
    mutate(props);
  };
  return (
    <>
      <h1 className="font-bold text-3xl mb-5">Update Category</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col lg:grid-cols-5 lg:grid gap-5 mb-5">
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Category Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    {...register("name")}
                    id="name"
                    type="text"
                    className="w-full"
                    placeholder="Name: "
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="message">Message Text</Label>
                  <Textarea
                    {...register("text")}
                    id="message"
                    className="min-h-32"
                    placeholder="Text: "
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="image">Image</Label>
                  <Upload
                    imageUrl={imageUrl}
                    onUpload={uploadImage}
                    isPending={isPending}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 mb-5">
                {fields.map((field, index) => {
                  return (
                    <div className="flex gap-5 items-center" key={index}>
                      <div className="grid gap-3 flex-1">
                        <Input
                          {...register(`buttons.${index}.title`)}
                          type="text"
                          className="w-full"
                          placeholder="Name: "
                        />
                      </div>
                      <div className="grid gap-3 flex-1">
                        <Input
                          {...register(`buttons.${index}.link`)}
                          type="text"
                          className="w-full"
                          placeholder="Link: "
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => remove(index)}
                      >
                        <Trash />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <Button
                type="button"
                onClick={() => append({ title: "", link: "" })}
              >
                Add Button
              </Button>
            </CardContent>
          </Card>
        </div>
        <Button className="text-lg" type="submit">
          Save
        </Button>
      </form>
    </>
  );
}
