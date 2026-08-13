"use client"

import { useState, useEffect, useMemo, useRef, useTransition, useSyncExternalStore } from "react"
import Image from "next/image"
import {
  Plus, X, ChevronDown, Pencil, Trash2, UtensilsCrossed, AlertCircle,
  AlertTriangle, Loader2, Camera, CheckCircle2,
} from "lucide-react"
import { addDish, updateDish, deleteDish, type Dish, type Course } from "@/app/dashboard/platos/actions"
import {
  createMenuQuick, updateMenuMeta, updateCourseSelectionMode,
  addDishToMenu, removeDishFromMenu,
  type MenuBuilderData, type SelectionMode,
} from "@/app/dashboard/menus/actions"
import { createClient } from "@/utils/supabase/clients"
import { compressImage } from "@/utils/images"
import { menuPriceBounds } from "@/lib/pricing"
import { MIN_DISHES, MIN_MENUS } from "@/lib/chefRequirements"

// ── Constantes ───────────────────────────────────────────────────────────────

// "Primer plato" es el único curso obligatorio para que un menú cuente en
// los mínimos de activación (ver menusWithDishesCount y lib/menuCompletion) —
// el resto, incluido "Segundo plato", queda a criterio del chef.
const COURSES: { value: Course; label: string; required: boolean }[] = [
  { value: "starter",      label: "Entradas",     required: false },
  { value: "first_course", label: "Primer plato", required: true },
  { value: "main",         label: "Segundo plato", required: false },
  { value: "dessert",      label: "Postres",      required: false },
]

const CUISINE_OPTIONS = [
  { value: "local",         label: "Local" },
  { value: "french",        label: "Francés" },
  { value: "italian",       label: "Italiano" },
  { value: "japanese",      label: "Japonés" },
  { value: "mediterranean", label: "Mediterráneo" },
  { value: "seafood",       label: "Mariscos/Pescado" },
  { value: "fusion",        label: "Fusión" },
  { value: "chefs_special", label: "Especialidad del chef" },
]

const SELECTION_MODES: { value: SelectionMode; label: string }[] = [
  { value: "all_inclusive", label: "Todo incluido" },
  { value: "choose_1",      label: "El cliente elige 1" },
  { value: "choose_2",      label: "El cliente elige 2" },
  { value: "choose_3",      label: "El cliente elige 3" },
]

const PRICE_RANGES = {
  price2:   { label: "Precio para 2 personas",       ...menuPriceBounds("2") },
  price36:  { label: "Precio para 3–6 personas",     ...menuPriceBounds("3_6") },
  price720: { label: "Precio para 7 o más personas", ...menuPriceBounds("7_plus") },
}

const STORAGE_BUCKET = "menu-images"
const MAX_FILE_MB = 10
const MAX_SIDE = 1200

// Drag & drop nativo solo tiene sentido con mouse — en touch no dispara bien.
// El tap en "＋" es la vía principal en todos los dispositivos; esto solo
// habilita el gesto de arrastrar como mejora en desktop.
function subscribePointerFine(callback: () => void) {
  const mq = window.matchMedia("(pointer: fine)")
  mq.addEventListener("change", callback)
  return () => mq.removeEventListener("change", callback)
}
function getPointerFineSnapshot() {
  return window.matchMedia("(pointer: fine)").matches
}
function getPointerFineServerSnapshot() {
  return false
}
function usePointerFine() {
  return useSyncExternalStore(subscribePointerFine, getPointerFineSnapshot, getPointerFineServerSnapshot)
}

// ── Modal de plato (crear / editar / eliminar) ──────────────────────────────

type DishModalState =
  | { type: "none" }
  | { type: "add" }
  | { type: "edit"; dish: Dish }
  | { type: "delete"; dish: Dish }

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-zinc-100 bg-white p-6 shadow-xl">
        {children}
      </div>
    </div>
  )
}

function ModalFieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 mb-2">
      {children}
    </label>
  )
}

function DishFormModal({
  title,
  initialName = "",
  initialCourse = "starter",
  initialDescription = "",
  onSave,
  onCancel,
  pending,
  error,
}: {
  title:               string
  initialName?:        string
  initialCourse?:      Course
  initialDescription?: string
  onSave:    (name: string, course: Course, description: string) => void
  onCancel:  () => void
  pending:   boolean
  error?:    string
}) {
  const [name, setName]               = useState(initialName)
  const [course, setCourse]           = useState<Course>(initialCourse)
  const [description, setDescription] = useState(initialDescription)

  return (
    <Overlay>
      <button
        type="button"
        onClick={onCancel}
        className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
      >
        <X size={16} />
      </button>

      <h2 className="font-serif text-xl font-semibold text-zinc-900 text-center mb-6">{title}</h2>

      <div className="space-y-5">
        <div>
          <ModalFieldLabel>Nombre del plato</ModalFieldLabel>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Risotto de hongos"
            className="w-full h-11 px-4 border border-zinc-200 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150"
          />
        </div>

        <div>
          <ModalFieldLabel>Categoría</ModalFieldLabel>
          <div className="relative">
            <select
              value={course}
              onChange={e => setCourse(e.target.value as Course)}
              className="w-full h-11 appearance-none px-4 pr-10 border border-zinc-200 rounded-xl text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150 cursor-pointer"
            >
              {COURSES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          </div>
        </div>

        <div>
          <ModalFieldLabel>
            Descripción{" "}
            <span className="text-zinc-400 normal-case tracking-normal font-normal">(opcional)</span>
          </ModalFieldLabel>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Ingredientes, preparación, alérgenos…"
            rows={3}
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent resize-none transition-all duration-150"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle size={13} className="shrink-0" />
            {error}
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="flex-1 h-10 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-40"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onSave(name, course, description)}
          disabled={pending || !name.trim()}
          className="flex-1 h-10 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-semibold hover:shadow-md hover:shadow-accent/20 transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </Overlay>
  )
}

function DeleteConfirmModal({
  dish,
  onConfirm,
  onCancel,
  pending,
  error,
}: {
  dish:      Dish
  onConfirm: () => void
  onCancel:  () => void
  pending:   boolean
  error?:    string
}) {
  return (
    <Overlay>
      <button
        type="button"
        onClick={onCancel}
        className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
      >
        <X size={16} />
      </button>

      <h2 className="font-serif text-xl font-semibold text-zinc-900 text-center mb-3">
        Eliminar plato
      </h2>
      <p className="text-center text-sm text-zinc-500 mb-3">
        ¿Estás seguro de que querés eliminar este plato? Se quita de todos los menús donde esté.
      </p>
      <div className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-2.5 text-center mb-6">
        <span className="text-sm font-semibold text-zinc-800">{dish.name}</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 mb-4">
          <AlertCircle size={13} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="flex-1 h-10 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-40"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
        >
          {pending ? "Eliminando…" : "Eliminar"}
        </button>
      </div>
    </Overlay>
  )
}

// ── Tarjeta de plato (repertorio, izquierda) ────────────────────────────────

function DishCard({
  dish, usageCount, onAdd, onEdit, onDelete, draggable,
}: {
  dish: Dish
  usageCount: number
  onAdd: () => void
  onEdit: () => void
  onDelete: () => void
  draggable: boolean
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-dish-id", dish.id)
        e.dataTransfer.setData("application/x-dish-course", dish.course)
        e.dataTransfer.effectAllowed = "copy"
      }}
      className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl border border-zinc-100 bg-white hover:border-zinc-200 hover:shadow-sm transition-all duration-150 ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-800 truncate">{dish.name}</p>
        <p className="text-[11px] text-zinc-400 mt-0.5">
          <span className="font-bold text-zinc-500">{COURSES.find(c => c.value === dish.course)?.label}</span>
          {usageCount > 0 && ` · en ${usageCount} ${usageCount === 1 ? "menú" : "menús"}`}
        </p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 rounded-lg text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Editar plato"
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Eliminar plato"
        >
          <Trash2 size={13} />
        </button>
        <button
          type="button"
          onClick={onAdd}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-accent/10 text-accent hover:bg-accent hover:text-white transition-colors duration-150 ml-1"
          aria-label={`Agregar ${dish.name} al menú`}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Sección de curso (constructor de menú, derecha) ─────────────────────────

function CourseSection({
  label, required, sectionDishes, selectionMode, onModeChange,
  onRemove, onDropDish, pulsing, rejecting, dropEnabled,
}: {
  label: string
  required: boolean
  sectionDishes: Dish[]
  selectionMode: SelectionMode
  onModeChange: (mode: SelectionMode) => void
  onRemove: (dishId: string) => void
  onDropDish: (dishId: string, dishCourse: Course) => void
  pulsing: boolean
  rejecting: boolean
  dropEnabled: boolean
}) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      onDragOver={(e) => { if (dropEnabled) { e.preventDefault(); setDragOver(true) } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!dropEnabled) return
        e.preventDefault()
        setDragOver(false)
        const dishId = e.dataTransfer.getData("application/x-dish-id")
        const dishCourse = e.dataTransfer.getData("application/x-dish-course") as Course
        if (dishId) onDropDish(dishId, dishCourse)
      }}
      className={[
        "rounded-2xl border p-4 transition-all duration-200",
        pulsing
          ? "border-accent bg-accent/5"
          : rejecting
          ? "border-red-300 bg-red-50/60"
          : dragOver
          ? "border-accent/50 bg-accent/5"
          : "border-zinc-100 bg-white",
      ].join(" ")}
    >
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-px w-4 bg-accent/40 rounded-full shrink-0" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 truncate">{label}</p>
          {!required && (
            <span className="text-[9px] font-medium normal-case tracking-normal text-zinc-300 shrink-0">(opcional)</span>
          )}
        </div>
        <div className="relative shrink-0">
          <select
            value={selectionMode}
            onChange={e => onModeChange(e.target.value as SelectionMode)}
            className="appearance-none h-7 pl-2.5 pr-6 border border-zinc-200 rounded-lg text-[11px] font-medium text-zinc-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent/15 cursor-pointer"
          >
            {SELECTION_MODES.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <ChevronDown size={10} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400" />
        </div>
      </div>

      {sectionDishes.length === 0 ? (
        <p className="text-xs text-zinc-400 py-3 text-center border border-dashed border-zinc-200 rounded-xl">
          Tocá ＋ en un plato de {label.toLowerCase()}
          {required && " — obligatorio para que el menú cuente"}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {sectionDishes.map(d => (
            <span
              key={d.id}
              className="inline-flex items-center gap-1.5 bg-zinc-50 border border-zinc-100 rounded-full pl-3 pr-1.5 py-1 text-xs text-zinc-700 animate-in zoom-in-95 duration-200"
            >
              {d.name}
              <button
                type="button"
                onClick={() => onRemove(d.id)}
                className="w-4 h-4 flex items-center justify-center rounded-full text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                aria-label={`Quitar ${d.name}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Detalles del menú (título, precios, imagen…) ────────────────────────────

function PriceInput({
  label, value, onChange, range,
}: {
  label:    string
  value:    string
  onChange: (v: string) => void
  range:    { min: number; max: number }
}) {
  const num        = parseFloat(value) || 0
  const outOfRange = num > 0 && (num < range.min || num > range.max)

  return (
    <div>
      <ModalFieldLabel>{label}</ModalFieldLabel>
      <input
        type="number"
        min={0}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
        className="w-full h-11 px-4 border border-zinc-200 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150"
      />
      {outOfRange ? (
        <div className="mt-2 flex items-start gap-1.5">
          <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-600">
            Precio fuera del rango recomendado. Rango: {range.min}–{range.max} USD
          </p>
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-zinc-400">
          Rango recomendado: {range.min}–{range.max} USD
        </p>
      )}
    </div>
  )
}

function MenuDetailsPanel({
  menu, userId, commissionRatePercent, onSaved,
}: {
  menu: MenuBuilderData
  userId: string
  commissionRatePercent: number
  onSaved: (patch: Partial<MenuBuilderData>) => void
}) {
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const didMountRef = useRef(false)

  const [title, setTitle]             = useState(menu.title)
  const [description, setDescription] = useState(menu.description)
  const [cuisineTypes, setCuisineTypes] = useState<string[]>(menu.cuisineTypes)
  const [imageUrl, setImageUrl]       = useState<string | null>(menu.imageUrl)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageError, setImageError]   = useState<string | null>(null)
  const [minGuests, setMinGuests]     = useState(menu.minGuests)
  const [maxGuests, setMaxGuests]     = useState(menu.maxGuests)
  const [price2, setPrice2]           = useState(menu.price2   ? String(menu.price2)   : "")
  const [price36, setPrice36]         = useState(menu.price36  ? String(menu.price36)  : "")
  const [price720, setPrice720]       = useState(menu.price720 ? String(menu.price720) : "")
  const [saveStatus, setSaveStatus]   = useState<"idle" | "saving" | "saved">("idle")
  const [saveError, setSaveError]     = useState<string | null>(null)

  const priceOrderError = useMemo(() => {
    const p2 = parseFloat(price2) || 0, p36 = parseFloat(price36) || 0, p720 = parseFloat(price720) || 0
    if (p2 > 0 && p36 > 0 && p36 > p2) return "El precio para 3–6 personas no puede superar el de 2 personas."
    if (p36 > 0 && p720 > 0 && p720 > p36) return "El precio para 7 o más personas no puede superar el de 3–6 personas."
    if (p2 > 0 && p720 > 0 && p720 > p2) return "El precio para 7 o más personas no puede superar el de 2 personas."
    return null
  }, [price2, price36, price720])

  const priceRows = useMemo(() => {
    const p2 = parseFloat(price2) || 0, p36 = parseFloat(price36) || 0, p720 = parseFloat(price720) || 0
    const chefCut = 1 - commissionRatePercent / 100
    return Array.from({ length: Math.max(0, maxGuests - minGuests + 1) }, (_, i) => {
      const n = minGuests + i
      const perPerson = n === 2 ? p2 : n <= 6 ? p36 : p720
      const total = Math.round(perPerson * n * 100) / 100
      const chef  = Math.round(total * chefCut * 100) / 100
      return { n, chef, total }
    })
  }, [minGuests, maxGuests, price2, price36, price720, commissionRatePercent])

  function toggleCuisine(val: string) {
    setCuisineTypes(prev => {
      if (prev.includes(val)) return prev.filter(v => v !== val)
      if (prev.length >= 3) return prev
      return [...prev, val]
    })
  }

  async function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) { setImageError("Solo se permiten imágenes (JPG, PNG, WEBP)"); return }
    if (file.size > MAX_FILE_MB * 1024 * 1024) { setImageError(`La imagen no puede superar ${MAX_FILE_MB} MB`); return }
    setImageError(null)
    setImageUploading(true)
    try {
      const blob = await compressImage(file, MAX_SIDE)
      const supabase = createClient()
      const path = `${userId}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, blob, { contentType: "image/jpeg" })
      if (uploadError) throw new Error(uploadError.message)
      const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
      setImageUrl(publicUrl)
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Error al subir la imagen")
    } finally {
      setImageUploading(false)
    }
  }

  // Autoguardado con debounce — se salta el primer render para no reescribir
  // el menú con los mismos datos apenas se abre este panel.
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return }
    if (!title.trim() || priceOrderError) return

    const timer = setTimeout(() => {
      setSaveStatus("saving")
      startTransition(async () => {
        const patch = {
          title: title.trim(),
          description: description.trim(),
          cuisineTypes,
          imageUrl,
          minGuests,
          maxGuests,
          price2:   parseFloat(price2)   || 0,
          price36:  parseFloat(price36)  || 0,
          price720: parseFloat(price720) || 0,
        }
        const result = await updateMenuMeta(menu.id, patch)
        if (result.error) { setSaveError(result.error); return }
        setSaveError(null)
        setSaveStatus("saved")
        onSaved(patch)
      })
    }, 900)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, cuisineTypes, imageUrl, minGuests, maxGuests, price2, price36, price720])

  return (
    <div className="space-y-8">
      {/* Cocina */}
      <div>
        <ModalFieldLabel>Tipo de cocina <span className="text-zinc-400 normal-case tracking-normal font-normal">(hasta 3)</span></ModalFieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {CUISINE_OPTIONS.map(opt => {
            const selected = cuisineTypes.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleCuisine(opt.value)}
                className={[
                  "rounded-xl border px-3.5 py-2 text-sm font-medium text-left transition-all duration-150",
                  selected
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50",
                ].join(" ")}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Título + descripción */}
      <div className="space-y-5">
        <div>
          <ModalFieldLabel>Nombre del menú</ModalFieldLabel>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value.slice(0, 100))}
            placeholder="Ej: Esencias mediterráneas"
            className="w-full h-11 px-4 border border-zinc-200 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150"
          />
        </div>
        <div>
          <ModalFieldLabel>Descripción <span className="text-zinc-400 normal-case tracking-normal font-normal">(opcional)</span></ModalFieldLabel>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value.slice(0, 500))}
            placeholder="Describí la propuesta gastronómica de este menú…"
            rows={3}
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent resize-y transition-all duration-150"
          />
        </div>
      </div>

      {/* Imagen */}
      <div>
        <ModalFieldLabel>Imagen del menú</ModalFieldLabel>
        <div
          className="w-32 h-32 rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 hover:border-accent hover:bg-accent/5 flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-150 relative"
          onClick={() => !imageUploading && fileRef.current?.click()}
        >
          {imageUrl ? (
            <>
              <Image src={imageUrl} alt="Imagen del menú" fill sizes="128px" className="object-cover" />
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setImageUrl(null) }}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <X size={12} />
              </button>
            </>
          ) : imageUploading ? (
            <Loader2 size={20} className="text-accent/50 animate-spin" />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-zinc-400">
              <Camera size={20} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em]">Subir foto</span>
            </div>
          )}
        </div>
        {imageError && (
          <div className="flex items-center gap-2 mt-2 text-xs text-red-600">
            <AlertCircle size={12} className="shrink-0" />
            {imageError}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) handleImageFile(f)
            e.target.value = ""
          }}
        />
      </div>

      {/* Cupos + precios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="flex gap-4">
            <div>
              <ModalFieldLabel>Mínimo</ModalFieldLabel>
              <div className="relative inline-block w-24">
                <select
                  value={minGuests}
                  onChange={e => {
                    const v = Number(e.target.value)
                    setMinGuests(v)
                    if (v > maxGuests) setMaxGuests(v)
                  }}
                  className="w-full appearance-none h-10 px-3 pr-8 border border-zinc-200 rounded-xl text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150 cursor-pointer"
                >
                  {Array.from({ length: 19 }, (_, i) => i + 2).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>
            <div>
              <ModalFieldLabel>Máximo</ModalFieldLabel>
              <div className="relative inline-block w-24">
                <select
                  value={maxGuests}
                  onChange={e => setMaxGuests(Number(e.target.value))}
                  className="w-full appearance-none h-10 px-3 pr-8 border border-zinc-200 rounded-xl text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150 cursor-pointer"
                >
                  {Array.from({ length: 19 }, (_, i) => i + 2)
                    .filter(n => n >= minGuests)
                    .map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <PriceInput label={PRICE_RANGES.price2.label}   value={price2}   onChange={setPrice2}   range={PRICE_RANGES.price2} />
            <PriceInput label={PRICE_RANGES.price36.label}  value={price36}  onChange={setPrice36}  range={PRICE_RANGES.price36} />
            <PriceInput label={PRICE_RANGES.price720.label} value={price720} onChange={setPrice720} range={PRICE_RANGES.price720} />
          </div>
          {priceOrderError && (
            <div className="flex items-start gap-1.5">
              <AlertTriangle size={12} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-600">
                {priceOrderError} A más personas, el precio por persona baja (o queda igual), nunca sube.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-100 overflow-hidden shadow-sm h-fit">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">Personas</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">Chef</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">Total</th>
              </tr>
            </thead>
            <tbody>
              {priceRows.map(row => (
                <tr key={row.n} className="border-b border-zinc-50 last:border-0">
                  <td className="px-4 py-2 text-xs text-zinc-600 tabular-nums">{row.n}</td>
                  <td className="px-4 py-2 text-xs text-right text-zinc-600 tabular-nums">${row.chef}</td>
                  <td className="px-4 py-2 text-xs text-right font-semibold text-zinc-900 tabular-nums">${row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2.5 text-xs text-zinc-400 border-t border-zinc-50 leading-relaxed">
            * GetChef cobra una comisión del {commissionRatePercent}% sobre el importe total del servicio.
          </p>
        </div>
      </div>

      {saveError && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3.5">
          <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{saveError}</p>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs">
        {isPending || saveStatus === "saving" ? (
          <span className="text-zinc-400">Guardando…</span>
        ) : saveStatus === "saved" && !saveError ? (
          <span className="flex items-center gap-1 text-emerald-600">
            <CheckCircle2 size={12} /> Cambios guardados automáticamente
          </span>
        ) : null}
      </div>
    </div>
  )
}

// ── Panel principal ──────────────────────────────────────────────────────────

export function MenuBuilderPanel({
  initialDishes, initialMenus, initialDishUsage, userId, commissionRatePercent,
}: {
  initialDishes: Dish[]
  initialMenus: MenuBuilderData[]
  initialDishUsage: Record<string, number>
  userId: string
  commissionRatePercent: number
}) {
  const isPointerFine = usePointerFine()
  const [dishes, setDishes] = useState<Dish[]>(initialDishes)
  const [menus, setMenus]   = useState<MenuBuilderData[]>(initialMenus)
  const [dishUsage, setDishUsage] = useState<Record<string, number>>(initialDishUsage)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(initialMenus[0]?.id ?? null)
  const [dishFilter, setDishFilter] = useState<Course | "all">("all")
  const [dishModal, setDishModal] = useState<DishModalState>({ type: "none" })
  const [dishError, setDishError] = useState<string | undefined>()
  const [isPending, startTransition] = useTransition()

  const [newMenuOpen, setNewMenuOpen]     = useState(initialMenus.length === 0)
  const [newMenuTitle, setNewMenuTitle]   = useState("")
  const [newMenuSaving, setNewMenuSaving] = useState(false)
  const [newMenuError, setNewMenuError]   = useState<string | null>(null)

  const [pulseCourse, setPulseCourse]   = useState<Course | null>(null)
  const [rejectCourse, setRejectCourse] = useState<Course | null>(null)
  const [detailsOpen, setDetailsOpen]   = useState(initialMenus.length === 0)
  const [placeError, setPlaceError]     = useState<string | null>(null)

  const activeMenu = menus.find(m => m.id === activeMenuId) ?? null

  // ── CRUD de platos ─────────────────────────────────────────────────────
  function closeDishModal() { setDishModal({ type: "none" }); setDishError(undefined) }

  function handleAddDish(name: string, course: Course, description: string) {
    setDishError(undefined)
    startTransition(async () => {
      const result = await addDish(name, course, description)
      if (result.error) { setDishError(result.error); return }
      setDishes(prev => [...prev, { id: result.id!, name, course, description: description || null }])
      closeDishModal()
    })
  }

  function handleEditDish(name: string, course: Course, description: string) {
    if (dishModal.type !== "edit") return
    const dishId = dishModal.dish.id
    setDishError(undefined)
    startTransition(async () => {
      const result = await updateDish(dishId, name, course, description)
      if (result.error) { setDishError(result.error); return }
      setDishes(prev => prev.map(d => d.id === dishId ? { ...d, name, course, description: description || null } : d))
      closeDishModal()
    })
  }

  function handleDeleteDish() {
    if (dishModal.type !== "delete") return
    const dishId = dishModal.dish.id
    setDishError(undefined)
    startTransition(async () => {
      const result = await deleteDish(dishId)
      if (result.error) { setDishError(result.error); return }
      setDishes(prev => prev.filter(d => d.id !== dishId))
      // El DELETE ya borró en cascada las referencias en menu_dishes — se
      // refleja acá para que el estado local no muestre un plato fantasma.
      setMenus(prev => prev.map(m => ({
        ...m,
        courseSettings: Object.fromEntries(
          COURSES.map(c => [c.value, {
            ...m.courseSettings[c.value],
            dishIds: m.courseSettings[c.value].dishIds.filter(id => id !== dishId),
          }])
        ) as MenuBuilderData["courseSettings"],
      })))
      closeDishModal()
    })
  }

  // ── Nuevo menú ───────────────────────────────────────────────────────────
  function handleCreateMenu() {
    const t = newMenuTitle.trim()
    if (!t) return
    setNewMenuSaving(true)
    setNewMenuError(null)
    startTransition(async () => {
      const result = await createMenuQuick(t)
      setNewMenuSaving(false)
      if (result.error || !result.menu) { setNewMenuError(result.error ?? "Error al crear el menú"); return }
      setMenus(prev => [result.menu!, ...prev])
      setActiveMenuId(result.menu!.id)
      setNewMenuTitle("")
      setNewMenuOpen(false)
      setDetailsOpen(true)
    })
  }

  function handleMenuMetaSaved(menuId: string, patch: Partial<MenuBuilderData>) {
    setMenus(prev => prev.map(m => m.id === menuId ? { ...m, ...patch } : m))
  }

  // ── Colocar un plato en el menú activo (tap "＋" o soltar) ─────────────────
  function placeDish(dish: Dish) {
    if (!activeMenu) { setPlaceError("Creá o elegí un menú primero"); return }
    const course = dish.course
    if (activeMenu.courseSettings[course].dishIds.includes(dish.id)) return

    setPlaceError(null)
    const menuId = activeMenu.id
    setMenus(prev => prev.map(m => m.id !== menuId ? m : {
      ...m,
      courseSettings: {
        ...m.courseSettings,
        [course]: { ...m.courseSettings[course], dishIds: [...m.courseSettings[course].dishIds, dish.id] },
      },
    }))
    setDishUsage(prev => ({ ...prev, [dish.id]: (prev[dish.id] ?? 0) + 1 }))
    setPulseCourse(course)
    setTimeout(() => setPulseCourse(null), 500)

    startTransition(async () => {
      const result = await addDishToMenu(menuId, dish.id)
      if (result.error) {
        setMenus(prev => prev.map(m => m.id !== menuId ? m : {
          ...m,
          courseSettings: {
            ...m.courseSettings,
            [course]: { ...m.courseSettings[course], dishIds: m.courseSettings[course].dishIds.filter(id => id !== dish.id) },
          },
        }))
        setDishUsage(prev => ({ ...prev, [dish.id]: Math.max(0, (prev[dish.id] ?? 1) - 1) }))
        setPlaceError(result.error)
      }
    })
  }

  function handleDrop(dishId: string, dishCourse: Course, targetCourse: Course) {
    if (dishCourse !== targetCourse) {
      setRejectCourse(targetCourse)
      setTimeout(() => setRejectCourse(null), 500)
      return
    }
    const dish = dishes.find(d => d.id === dishId)
    if (dish) placeDish(dish)
  }

  function removeDish(course: Course, dishId: string) {
    if (!activeMenu) return
    const menuId = activeMenu.id
    setMenus(prev => prev.map(m => m.id !== menuId ? m : {
      ...m,
      courseSettings: {
        ...m.courseSettings,
        [course]: { ...m.courseSettings[course], dishIds: m.courseSettings[course].dishIds.filter(id => id !== dishId) },
      },
    }))
    setDishUsage(prev => ({ ...prev, [dishId]: Math.max(0, (prev[dishId] ?? 1) - 1) }))

    startTransition(async () => {
      const result = await removeDishFromMenu(menuId, dishId)
      if (result.error) {
        setMenus(prev => prev.map(m => m.id !== menuId ? m : {
          ...m,
          courseSettings: {
            ...m.courseSettings,
            [course]: { ...m.courseSettings[course], dishIds: [...m.courseSettings[course].dishIds, dishId] },
          },
        }))
        setDishUsage(prev => ({ ...prev, [dishId]: (prev[dishId] ?? 0) + 1 }))
        setPlaceError(result.error)
      }
    })
  }

  function handleModeChange(course: Course, mode: SelectionMode) {
    if (!activeMenu) return
    const menuId = activeMenu.id
    setMenus(prev => prev.map(m => m.id !== menuId ? m : {
      ...m,
      courseSettings: { ...m.courseSettings, [course]: { ...m.courseSettings[course], selectionMode: mode } },
    }))
    startTransition(async () => {
      await updateCourseSelectionMode(menuId, course, mode)
    })
  }

  const visibleDishes = dishFilter === "all" ? dishes : dishes.filter(d => d.course === dishFilter)
  const dishesMet = dishes.length >= MIN_DISHES
  // Un menú cuenta si tiene al menos un plato en "Primer plato" (first_course)
  // — es el único curso obligatorio; el resto queda a criterio del chef.
  // Debe coincidir con countMenusWithDishes en lib/menuCompletion.ts.
  const menusWithDishesCount = menus.filter(m =>
    m.courseSettings.first_course.dishIds.length > 0
  ).length
  const menusMet = menusWithDishesCount >= MIN_MENUS

  return (
    <>
      {/* ── Mínimos para activar el perfil ── */}
      <div className="flex flex-wrap items-center gap-2.5 mb-6">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
            dishesMet ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-white border-zinc-200 text-zinc-500"
          }`}
        >
          {dishesMet && <CheckCircle2 size={12} />}
          Platos {dishes.length}/{MIN_DISHES}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
            menusMet ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-white border-zinc-200 text-zinc-500"
          }`}
        >
          {menusMet && <CheckCircle2 size={12} />}
          Menús {menusWithDishesCount}/{MIN_MENUS}
        </span>
        {dishesMet && menusMet && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 text-accent px-3 py-1.5 text-xs font-bold">
            <CheckCircle2 size={12} /> Completado
          </span>
        )}
      </div>

    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">

      {/* ── IZQUIERDA: repertorio de platos ── */}
      <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm p-5 lg:sticky lg:top-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Tus platos</h2>
          <button
            type="button"
            onClick={() => setDishModal({ type: "add" })}
            className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white font-semibold text-xs h-8 px-3 rounded-lg transition-all duration-150 hover:shadow-md hover:shadow-accent/20"
          >
            <Plus size={13} /> Nuevo plato
          </button>
        </div>

        <div className="relative mb-4">
          <select
            value={dishFilter}
            onChange={e => setDishFilter(e.target.value as Course | "all")}
            className="w-full appearance-none h-9 pl-3 pr-8 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150 cursor-pointer"
          >
            <option value="all">Todas las categorías</option>
            {COURSES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        </div>

        {visibleDishes.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <UtensilsCrossed size={20} className="text-zinc-300" />
            </div>
            <p className="text-sm text-zinc-500">Todavía no tenés platos</p>
            <p className="text-xs text-zinc-400 mt-1">Creá el primero para poder armar tus menús.</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
            {visibleDishes.map(d => (
              <DishCard
                key={d.id}
                dish={d}
                usageCount={dishUsage[d.id] ?? 0}
                draggable={isPointerFine}
                onAdd={() => placeDish(d)}
                onEdit={() => setDishModal({ type: "edit", dish: d })}
                onDelete={() => setDishModal({ type: "delete", dish: d })}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── DERECHA: constructor de menú ── */}
      <div className="space-y-5">

        {/* Selector / creador de menú */}
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2">Tus menús</h2>
        <div className="flex flex-wrap items-center gap-2">
          {menus.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => { setActiveMenuId(m.id); setPlaceError(null) }}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-150 ${
                m.id === activeMenuId
                  ? "bg-accent/10 border-accent text-accent"
                  : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"
              }`}
            >
              {m.title || "Sin título"}
            </button>
          ))}

          {newMenuOpen ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={newMenuTitle}
                onChange={e => setNewMenuTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCreateMenu() }}
                placeholder="Nombre del menú"
                className="h-9 px-3 border border-zinc-200 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150"
              />
              <button
                type="button"
                disabled={!newMenuTitle.trim() || newMenuSaving}
                onClick={handleCreateMenu}
                className="h-9 px-3 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                {newMenuSaving ? "Creando…" : "Crear"}
              </button>
              {menus.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setNewMenuOpen(false); setNewMenuTitle(""); setNewMenuError(null) }}
                  className="h-9 w-9 flex items-center justify-center text-zinc-400 hover:text-zinc-700"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setNewMenuOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-zinc-300 text-sm font-medium text-zinc-500 hover:border-accent hover:text-accent transition-all duration-150"
            >
              <Plus size={14} /> Nuevo menú
            </button>
          )}
        </div>
        {newMenuError && <p className="text-xs text-red-600">{newMenuError}</p>}

        {!activeMenu ? (
          <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm py-16 text-center">
            <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed size={24} className="text-zinc-300" />
            </div>
            <p className="text-sm text-zinc-500">Creá tu primer menú para empezar a agregarle platos.</p>
          </div>
        ) : (
          <>
            {placeError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                <AlertCircle size={14} className="shrink-0" /> {placeError}
              </div>
            )}

            {/* Secciones por curso */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {COURSES.map(c => (
                <CourseSection
                  key={c.value}
                  label={c.label}
                  required={c.required}
                  sectionDishes={
                    activeMenu.courseSettings[c.value].dishIds
                      .map(id => dishes.find(d => d.id === id))
                      .filter((d): d is Dish => !!d)
                  }
                  selectionMode={activeMenu.courseSettings[c.value].selectionMode}
                  onModeChange={mode => handleModeChange(c.value, mode)}
                  onRemove={dishId => removeDish(c.value, dishId)}
                  onDropDish={(dishId, dishCourse) => handleDrop(dishId, dishCourse, c.value)}
                  pulsing={pulseCourse === c.value}
                  rejecting={rejectCourse === c.value}
                  dropEnabled={isPointerFine}
                />
              ))}
            </div>

            {/* Detalles del menú, plegable */}
            <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setDetailsOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4"
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Detalles del menú</span>
                <ChevronDown size={15} className={`text-zinc-400 transition-transform duration-200 ${detailsOpen ? "rotate-180" : ""}`} />
              </button>
              {detailsOpen && (
                <div className="px-5 pb-6 border-t border-zinc-50 pt-5">
                  <MenuDetailsPanel
                    key={activeMenu.id}
                    menu={activeMenu}
                    userId={userId}
                    commissionRatePercent={commissionRatePercent}
                    onSaved={patch => handleMenuMetaSaved(activeMenu.id, patch)}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Modales de plato ── */}
      {dishModal.type === "add" && (
        <DishFormModal
          title="Agregar plato"
          onSave={handleAddDish}
          onCancel={closeDishModal}
          pending={isPending}
          error={dishError}
        />
      )}
      {dishModal.type === "edit" && (
        <DishFormModal
          key={dishModal.dish.id}
          title="Editar plato"
          initialName={dishModal.dish.name}
          initialCourse={dishModal.dish.course}
          initialDescription={dishModal.dish.description ?? ""}
          onSave={handleEditDish}
          onCancel={closeDishModal}
          pending={isPending}
          error={dishError}
        />
      )}
      {dishModal.type === "delete" && (
        <DeleteConfirmModal
          dish={dishModal.dish}
          onConfirm={handleDeleteDish}
          onCancel={closeDishModal}
          pending={isPending}
          error={dishError}
        />
      )}
    </div>
    </>
  )
}
