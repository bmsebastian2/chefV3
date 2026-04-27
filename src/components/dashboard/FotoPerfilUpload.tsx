"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, MoreHorizontal } from "lucide-react";
import { createClient } from "@/utils/supabase/clients";
import { saveProfilePhotoUrl } from "@/app/dashboard/fotos/actions";
import { compressImage } from "@/utils/images";

const STORAGE_BUCKET = "chef-photos";
const MAX_SIDE = 900;
const MAX_FILE_MB = 10;

export function FotoPerfilUpload({
  userId,
  initialUrl,
}: {
  userId: string;
  initialUrl: string | null;
}) {
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync when the server re-renders and passes a new initialUrl
  useEffect(() => {
    setCurrentUrl(initialUrl);
  }, [initialUrl]);

  async function handleFile(file: File) {
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
      const blob = await compressImage(file, MAX_SIDE);
      const supabase = createClient();

      const path = `${userId}/profile-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, blob, { contentType: "image/jpeg" });

      if (uploadError) throw new Error(uploadError.message);

      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);

      const result = await saveProfilePhotoUrl(publicUrl);
      if (result.error) throw new Error(result.error);

      setCurrentUrl(publicUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative inline-block">
        <div className="w-52 h-52 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200">
          {currentUrl ? (
            <img
              src={currentUrl}
              alt="Foto de perfil"
              className="w-full h-full object-cover"
            />
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 transition-colors"
            >
              <Camera className="w-8 h-8" />
              <span className="text-xs font-medium">Subir foto</span>
            </button>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* ··· menu */}
        <div className="absolute top-2 right-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => setMenuOpen((v) => !v)}
            className="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            <MoreHorizontal className="w-4 h-4 text-zinc-600" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-10 z-20 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 min-w-44">
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                  onClick={() => {
                    setMenuOpen(false);
                    fileRef.current?.click();
                  }}
                >
                  {currentUrl ? "Reemplazar imagen" : "Subir imagen"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <p className="text-xs text-muted-foreground max-w-xs">
        JPG, PNG o WEBP · Máx. {MAX_FILE_MB} MB · Se comprime automáticamente a {MAX_SIDE}px
      </p>

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
