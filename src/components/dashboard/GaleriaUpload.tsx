"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2, AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/clients";
import { addGalleryPhoto, deleteGalleryPhoto } from "@/app/dashboard/fotos/actions";
import { compressImage } from "@/utils/images";

const STORAGE_BUCKET = "chef-photos";
const MAX_GALLERY = 12;
const MAX_FILE_MB = 10;

type Photo = { id: string; url: string };

export function GaleriaUpload({
  userId,
  initialPhotos,
}: {
  userId: string;
  initialPhotos: Photo[];
}) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync when server re-renders after add/delete
  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  async function handleFile(file: File) {
    if (photos.length >= MAX_GALLERY) {
      setError(`Máximo ${MAX_GALLERY} fotos permitidas`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes (JPG, PNG, WEBP)");
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`La imagen no puede superar ${MAX_FILE_MB} MB`);
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const blob = await compressImage(file, 1200);
      const supabase = createClient();
      const path = `${userId}/gallery-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, blob, { contentType: "image/jpeg" });

      if (uploadError) throw new Error(uploadError.message);

      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);

      const result = await addGalleryPhoto(publicUrl);
      if (result.error) throw new Error(result.error);

      // Add to local state immediately using the id returned by the server
      if (result.photo) {
        setPhotos((prev) => [...prev, result.photo!]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(photo: Photo) {
    setDeletingId(photo.id);
    setError(null);
    try {
      const result = await deleteGalleryPhoto(photo.id, photo.url);
      if (result.error) throw new Error(result.error);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al eliminar la foto");
    } finally {
      setDeletingId(null);
    }
  }

  const canAdd = photos.length < MAX_GALLERY && !uploading;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

        {/* Existing photos */}
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative group aspect-square rounded-2xl overflow-hidden bg-zinc-100 shadow-sm"
          >
            <img
              src={photo.url}
              alt=""
              className="w-full h-full object-cover"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-150 rounded-2xl" />

            {/* Delete button */}
            <button
              type="button"
              disabled={deletingId === photo.id}
              onClick={() => handleDelete(photo)}
              className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 disabled:cursor-not-allowed"
              aria-label="Eliminar foto"
            >
              {deletingId === photo.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              )}
            </button>
          </div>
        ))}

        {/* Upload loading placeholder */}
        {uploading && (
          <div className="aspect-square rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
          </div>
        )}

        {/* Add slot */}
        {canAdd && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="aspect-square rounded-2xl border-2 border-dashed border-zinc-200 hover:border-accent hover:bg-accent/5 transition-all duration-150 flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-accent"
          >
            <Plus className="w-6 h-6" />
            <span className="text-xs font-semibold uppercase tracking-[0.1em]">Añadir</span>
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Count + hint */}
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold tabular-nums ${photos.length >= MAX_GALLERY ? "text-amber-500" : "text-zinc-400"}`}>
          {photos.length} / {MAX_GALLERY}
        </span>
        <span className="text-xs text-zinc-300">·</span>
        <span className="text-xs text-zinc-400">JPG, PNG o WEBP · Máx. {MAX_FILE_MB} MB por foto</span>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
