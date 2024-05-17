"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formSchema, FormValues } from "@/app/login/formSchema";
import { useMutation } from "@tanstack/react-query";
import authService from "@/services/auth.service";
import { LoginType } from "@/types/login.type";
import { useEffect } from "react";
import { redirect } from "next/navigation";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { LoaderCircle } from "lucide-react";
export default function Login() {
  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      login: "",
      password: "",
    },
    resolver: zodResolver(formSchema),
  });
  const { mutate, data, error, isPending } = useMutation({
    mutationKey: ["login"],
    mutationFn: (data: LoginType) => authService.login(data),
  });
  useEffect(() => {
    if (data?.access_token) {
      redirect("/i");
    }
  }, [data]);
  useEffect(() => {
    if (error) {
      const e = error as AxiosError;
      toast.error(
        // @ts-ignore
        e?.response?.data?.message ? e?.response?.data?.message : e.message,
      );
    }
  }, [error]);
  const onSubmit = async (props: FormValues) => {
    mutate(props);
  };
  return (
    <main className="w-full min-h-screen flex">
      <Card className="w-full max-w-sm m-auto relative">
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="login">login</Label>
              <Input id="login" type="text" required {...register("login")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                {...register("password")}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full flex gap-2 items-center"
              type="submit"
              disabled={isPending}
            >
              Sign in
              {isPending && <LoaderCircle className="animate-spin" />}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
