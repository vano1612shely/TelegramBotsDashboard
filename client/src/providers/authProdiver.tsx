"use client"
import React, {useEffect} from "react";
import {redirect, usePathname} from "next/navigation";
import { useCookies } from 'next-client-cookies';
export default function AuthProvider({children}: {children: React.ReactNode}) {
    const cookies = useCookies();
    const path =usePathname();
    useEffect(() => {
        if(!cookies.get("access_token") && path != "/login") {
            redirect("/login")
        } else if(cookies.get("access_token") && path == "/login"){
            redirect("/i")
        }
    }, [path, cookies]);

    return <>{children}</>
}