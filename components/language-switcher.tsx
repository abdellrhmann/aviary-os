"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { setLocaleAction } from "@/i18n/actions";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
    const locale = useLocale();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // The button always offers the OTHER language
    const nextLocale = locale === "ar" ? "en" : "ar";
    const label = nextLocale === "ar" ? "العربية" : "English";

    function handleClick() {
        startTransition(async () => {
            const result = await setLocaleAction(nextLocale);
            if (result.ok) {
                router.refresh();
            }
        });
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={isPending}
            className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground border border-border rounded-md hover:bg-muted-surface transition-colors disabled:opacity-60 ${className}`}
        >
            <Languages className="h-4 w-4" aria-hidden="true" />
            <span lang={nextLocale}>{label}</span>
        </button>
    );
}