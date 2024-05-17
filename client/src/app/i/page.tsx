import {cookies} from "next/headers";
import {redirect} from "next/navigation";

export default function I() {
    redirect("/i/dashboard")
}