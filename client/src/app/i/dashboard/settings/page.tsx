"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import {
    formSchema,
    FormValues,
} from "./schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LoginType } from "@/types/login.type";
import authService from "@/services/auth.service";
import { useEffect } from "react";
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { errorCatch } from "@/services/error";

export default function Settings() {
    const { data: userData } = useQuery({
        queryKey: ["user"],
        queryFn: () => authService.getMe(),
    });
    const form = useForm<FormValues>({
        defaultValues: {
            login: "",
            password: "",
        },
        resolver: zodResolver(formSchema),
    });
    const { mutate, data, error, isPending } = useMutation({
        mutationKey: ["login"],
        mutationFn: (d: { id: number; data: LoginType }) =>
            authService.update(d.id, d.data),
    });
    useEffect(() => {
        if (userData) {
            form.setValue("login", userData.login);
            form.setValue("password", userData.password);
        }
    }, [userData]);
    useEffect(() => {
        if (data) {
            toast.success("Дані користувача оновлено!");
        }
    }, [data]);
    useEffect(() => {
        if (error) {
            toast.error(errorCatch(error));
        }
    }, [error]);
    const onSubmit = async (props: FormValues) => {
        mutate({ id: userData.id, data: props });
    };
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Дані користувача</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
                        <div>
                            <FormField
                                control={form.control}
                                name="login"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Логін:</FormLabel>
                                        <Input type="text" id="name" {...field} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div>
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Пароль:</FormLabel>
                                        <Input type="text" id="password" {...field} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div>
                            <Button className="bg-green-700 hover:bg-green-600">
                                Зберегти
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}