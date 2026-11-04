"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Camera, Trash2 } from "lucide-react";
import {
    uploadBirdPhotoAction,
    deleteBirdPhotoAction,
} from "../photo-actions";

const MAX_DIMENSION = 1200;
const WEBP_QUALITY = 0.82;
const MAX_INPUT_BYTES = 15 * 1024 * 1024; // guard against huge originals

interface PhotoUploadProps {
    birdId: string;
    hasPhoto: boolean;
}

/**
 * Shrinks the chosen image in the browser (max 1200px, WebP) so uploads stay
 * small and storage usage stays low.
 */
async function compressImage(file: File): Promise<Blob | null> {
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) return null;

    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        bitmap.close();
        return null;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    return new Promise((resolve) =>
        canvas.toBlob((blob) => resolve(blob), "image/webp", WEBP_QUALITY)
    );
}

export function PhotoUpload({ birdId, hasPhoto }: PhotoUploadProps) {
    const t = useTranslations("Photo");
    const tErrors = useTranslations("Errors");
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function errorText(code?: string): string {
        return code && tErrors.has(code) ? tErrors(code) : tErrors("unexpected");
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = ""; // allow choosing the same file again
        if (!file) return;
        setError(null);

        if (!file.type.startsWith("image/") || file.size > MAX_INPUT_BYTES) {
            setError(errorText(file.size > MAX_INPUT_BYTES ? "photo_too_large" : "photo_invalid"));
            return;
        }

        startTransition(async () => {
            const blob = await compressImage(file);
            if (!blob) {
                setError(errorText("photo_invalid"));
                return;
            }

            const formData = new FormData();
            formData.append("birdId", birdId);
            formData.append("file", new File([blob], "photo.webp", { type: "image/webp" }));

            const result = await uploadBirdPhotoAction(formData);
            if (!result.success) {
                setError(errorText(result.errorCode));
                return;
            }
            router.refresh();
        });
    }

    function handleDelete() {
        setError(null);
        startTransition(async () => {
            const result = await deleteBirdPhotoAction(birdId);
            if (!result.success) {
                setError(errorText(result.errorCode));
                return;
            }
            router.refresh();
        });
    }

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/webp,image/png"
                    className="hidden"
                    onChange={handleFileChange}
                />
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 text-xs font-medium bg-surface text-foreground hover:bg-muted-surface border border-border px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                >
                    <Camera className="w-3.5 h-3.5" />
                    <span>
                        {isPending ? t("uploading") : hasPhoto ? t("change") : t("add")}
                    </span>
                </button>
                {hasPhoto && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-danger hover:bg-danger-subtle px-3 py-1.5 rounded-md border border-danger/30 transition-colors disabled:opacity-50"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t("remove")}</span>
                    </button>
                )}
            </div>
            <p className="text-[11px] text-muted">{t("hint")}</p>
            {error && <p className="text-xs text-danger">{error}</p>}
        </div>
    );
}