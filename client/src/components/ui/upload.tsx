"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Loader, UploadIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ComponentPropsWithoutRef, FC, useEffect, useState } from "react";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import fileService from "@/services/file.service";

interface UploadProps extends ComponentPropsWithoutRef<"input"> {
  isPending: boolean;
  imageUrl: string;
  onUpload: (file: File) => void;
}
const Upload: FC<UploadProps> = ({ onUpload, isPending, imageUrl }) => {
  const [image, setImage] = useState<File | null>(null);
  useEffect(() => {
    if (image) {
      onUpload(image);
    }
  }, [image]);
  console.log(imageUrl);
  return (
    <div>
      <Label
        htmlFor="image"
        className="flex aspect-square w-40 items-center justify-center rounded-md border border-dashed"
      >
        {isPending && <Loader className="animate-spin" />}
        {imageUrl ? (
          <Image
            src={imageUrl}
            width={1000}
            height={1000}
            alt="image"
            className="w-40 h-40"
          />
        ) : (
          !image && <UploadIcon className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="sr-only">Upload</span>
      </Label>
      <Input
        id="image"
        type="file"
        className="hidden"
        onChange={(e) => e.target.files && setImage(e.target.files[0])}
      />
    </div>
  );
};

export { Upload };
