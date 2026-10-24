import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const LOCALE_COOKIE = "NEXT_LOCALE";
const SUPPORTED = ["en", "ar"] as const;
type Locale = (typeof SUPPORTED)[number];

function isSupported(value: string | undefined): value is Locale {
    return SUPPORTED.some((l) => l === value);
}

// Pick the first supported language from the Accept-Language header
function pickFromHeader(header: string | null): Locale {
    if (!header) return "en";
    const tags = header
        .split(",")
        .map((part) => {
            const [tag, q] = part.trim().split(";q=");
            return { base: tag.toLowerCase().split("-")[0], q: q ? parseFloat(q) : 1 };
        })
        .sort((a, b) => b.q - a.q);
    for (const { base } of tags) {
        if (isSupported(base)) return base;
    }
    return "en";
}

export default getRequestConfig(async () => {
    const cookieStore = await cookies();
    const headerStore = await headers();

    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale: Locale = isSupported(cookieLocale)
        ? cookieLocale
        : pickFromHeader(headerStore.get("accept-language"));

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default,
    };
});