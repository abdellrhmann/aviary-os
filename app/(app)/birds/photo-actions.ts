"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ErrorCode } from "@/lib/validation/errors";

const BUCKET = "bird-photos";
const MAX_BYTES = 2 * 1024 * 1024; // matches the bucket limit
const SIGNED_URL_SECONDS = 60 * 60;
const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EXTENSIONS: Record<string, "jpg" | "webp"> = {
    "image/jpeg": "jpg",
    "image/webp": "webp",
};

export interface PhotoActionResponse<T = unknown> {
    success: boolean;
    data?: T;
    errorCode?: ErrorCode | "photo_invalid" | "photo_too_large" | "photo_upload_failed";
}

/**
 * Uploads (or replaces) the photo of one bird.
 * The storage path is always built on the server from user.id and bird id:
 * the client never chooses it.
 */
export async function uploadBirdPhotoAction(
    formData: FormData
): Promise<PhotoActionResponse<{ photo_path: string }>> {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
        return { success: false, errorCode: "not_signed_in" };
    }

    const birdId = formData.get("birdId");
    const file = formData.get("file");

    if (typeof birdId !== "string" || !UUID_RE.test(birdId)) {
        return { success: false, errorCode: "invalid_id" };
    }
    if (!(file instanceof File)) {
        return { success: false, errorCode: "photo_invalid" };
    }

    const extension = EXTENSIONS[file.type];
    if (!extension) {
        return { success: false, errorCode: "photo_invalid" };
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
        return { success: false, errorCode: "photo_too_large" };
    }

    // RLS makes this return nothing for birds that belong to someone else.
    const { data: bird, error: birdError } = await supabase
        .from("birds")
        .select("id, photo_path")
        .eq("id", birdId)
        .single();
    if (birdError || !bird) {
        return { success: false, errorCode: "bird_not_found" };
    }

    const newPath = `${user.id}/${birdId}.${extension}`;

    const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(newPath, file, { upsert: true, contentType: file.type });
    if (uploadError) {
        console.error("Photo upload failed:", uploadError);
        return { success: false, errorCode: "photo_upload_failed" };
    }

    const { error: updateError } = await supabase
        .from("birds")
        .update({ photo_path: newPath })
        .eq("id", birdId);
    if (updateError) {
        console.error("Saving photo_path failed:", updateError);
        // Do not leave an orphaned file behind
        await supabase.storage.from(BUCKET).remove([newPath]);
        return { success: false, errorCode: "photo_upload_failed" };
    }

    // If the extension changed (jpg <-> webp), remove the old file
    if (bird.photo_path && bird.photo_path !== newPath) {
        await supabase.storage.from(BUCKET).remove([bird.photo_path]);
    }

    revalidatePath("/birds");
    revalidatePath(`/birds/${birdId}`);
    return { success: true, data: { photo_path: newPath } };
}

export async function deleteBirdPhotoAction(
    birdId: string
): Promise<PhotoActionResponse<null>> {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
        return { success: false, errorCode: "not_signed_in" };
    }

    if (typeof birdId !== "string" || !UUID_RE.test(birdId)) {
        return { success: false, errorCode: "invalid_id" };
    }

    const { data: bird, error: birdError } = await supabase
        .from("birds")
        .select("id, photo_path")
        .eq("id", birdId)
        .single();
    if (birdError || !bird) {
        return { success: false, errorCode: "bird_not_found" };
    }

    if (bird.photo_path) {
        const { error: removeError } = await supabase.storage
            .from(BUCKET)
            .remove([bird.photo_path]);
        if (removeError) {
            console.error("Photo removal failed:", removeError);
            return { success: false, errorCode: "photo_upload_failed" };
        }
    }

    const { error: updateError } = await supabase
        .from("birds")
        .update({ photo_path: null })
        .eq("id", birdId);
    if (updateError) {
        console.error("Clearing photo_path failed:", updateError);
        return { success: false, errorCode: "unexpected" };
    }

    revalidatePath("/birds");
    revalidatePath(`/birds/${birdId}`);
    return { success: true };
}

/**
 * Returns short-lived signed URLs for a list of photo paths.
 * RLS on storage.objects ensures only the owner's files are signed.
 */
export async function getBirdPhotoUrls(
    paths: string[]
): Promise<Record<string, string>> {
    const unique = Array.from(new Set(paths.filter(Boolean)));
    if (unique.length === 0) return {};

    const supabase = await createClient();
    const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(unique, SIGNED_URL_SECONDS);

    if (error || !data) {
        console.error("Signing photo URLs failed:", error);
        return {};
    }

    const result: Record<string, string> = {};
    for (const item of data) {
        if (item.path && item.signedUrl) result[item.path] = item.signedUrl;
    }
    return result;
}