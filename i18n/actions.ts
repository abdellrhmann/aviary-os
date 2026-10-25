"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE } from "./request";

const SUPPORTED = ["en", "ar"];

export async function setLocaleAction(locale: string) {
    // Never trust client input: only accept known locales
    if (!SUPPORTED.includes(locale)) {
        return { ok: false as const };
    }

    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE, locale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
    });

    revalidatePath("/", "layout");
    return { ok: true as const };
}