"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Camera, Trash2 } from "lucide-react";
import {
    uploadBirdPhotoAction,
    deleteBirdPhotoAction,
} from "../photo-actions";

const MAX_INPUT_BYTES = 15 * 1024 * 1024; // guard against huge originals
const TARGET_BYTES = 1024 * 1024; // the compressed result must fit in 1 MB

// Tried in order until the result is small enough
const ATTEMPTS = [
    { maxDimension: 1200, quality: 0.82 },
    { maxDimension: 1200, quality: 0.65 },
    { maxDimension: 900, quality: 0.6 },
];

type CompressResult =
    | { ok: true; blob: Blob; extension: "webp" | "jpg" }
    | { ok: false; reason: "invalid" | "too_large" };

interface PhotoUploadProps {
    birdId: string;
    hasPhoto: boolean;
}

function canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality: number
): Promise<Blob | null> {
    return new Promise((resolve) =>
        canvas.toBlob((blob) => resolve(blob), type, quality)
    );
}

/**
 * Shrinks the chosen image in the browser. Prefers WebP, but some browsers
 * (Safari) cannot encode WebP and silently return PNG, so in that case we
 * fall back to JPEG. The real type of the produced blob is always checked.
 */
async function compressImage(file: File): Promise<CompressResult> {
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) return { ok: false, reason: "invalid" };

    try {
        for (const attempt of ATTEMPTS) {
            const scale = Math.min(
                1,
                attempt.maxDimension / Math.max(bitmap.width, bitmap.height)
            );
            const width = Math.max(1, Math.round(bitmap.width * scale));
            const height = Math.max(1, Math.round(bitmap.height * scale));

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return { ok: false, reason: "invalid" };
            ctx.drawImage(bitmap, 0, 0, width, height);

            let blob = await canvasToBlob(canvas, "image/webp", attempt.quality);
            if (!blob || blob.type !== "image/webp") {
                blob = await canvasToBlob(canvas, "image/jpeg", attempt.quality);
            }
            if (!blob) continue;

            const isWebp = blob.type === "image/webp";
            const isJpeg = blob.type === "image/jpeg";
            if ((isWebp || isJpeg) && blob.size > 0 && blob.size <= TARGET_BYTES) {
                return { ok: true, blob, extension: isWebp ? "webp" : "jpg" };
            }
        }
        return { ok: false, reason: "too_large" };
    } finally {
        bitmap.close();
    }
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

        if (file.size > MAX_INPUT_BYTES) {
            setError(errorText("photo_too_large"));
            return;
        }

        startTransition(async () => {
            const result = await compressImage(file);
            if (!result.ok) {
                setError(
                    errorText(
                        result.reason === "too_large" ? "photo_too_large" : "photo_invalid"
                    )
                );
                return;
            }

            const formData = new FormData();
            formData.append("birdId", birdId);
            formData.append(
                "file",
                new File([result.blob], `photo.${result.extension}`, {
                    type: result.blob.type,
                })
            );

            const upload = await uploadBirdPhotoAction(formData);
            if (!upload.success) {
                setError(errorText(upload.errorCode));
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
                    accept="image/*"
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