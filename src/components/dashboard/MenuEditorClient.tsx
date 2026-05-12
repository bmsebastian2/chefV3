"use client"

import { useState, useTransition, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Plus, X, ChevronDown, AlertTriangle, Loader2, Info, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/utils/supabase/clients"
import { compressImage } from "@/utils/images"
import { saveMenu, type SelectionMode, type MenuEditData } from "@/app/dashboard/menus/actions"
import type { Course } from "@/app/dashboard/platos/actions"

// ── Constants ────────────────────────────────────────────────────────────────

const CUISINE_OPTIONS = [
  { value: "local",        label: "Local" },
  { value: "french",       label: "Francés" },
  { value: "italian",      label: "italiano" },
  { value: "japanese",     label: "japonés" },
  { value: "mediterranean",label: "mediterráneo" },
  { value: "seafood",      label: "Mariscos/Pescado" },
  { value: "fusion",       label: "Fusión" },
  { value: "chefs_special",label: "Especialidad del chef" },
]

const COURSES_CONFIG: { value: Course; label: string; addLabel: string }[] = [
  { value: "starter",      label: "Motor de arranque",  addLabel: "Agregar entrante" },
  { value: "first_course", label: "Primer plato",       addLabel: "Agregar primer curso" },
  { value: "main",         label: "Plato principal",    addLabel: "Añadir plato principal" },
  { value: "dessert",      label: "Postre",             addLabel: "Añadir postre" },
]

const SELECTION_MODES: { value: SelectionMode; label: string }[] = [
  { value: "all_inclusive", label: "Todo incluido" },
  { value: "choose_1",      label: "El cliente elige 1" },
  { value: "choose_2",      label: "El cliente elige 2" },
  { value: "choose_3",      label: "El cliente elige 3" },
]

const PRICE_RANGES = {
  price2:   { label: "Precio para 2 personas",     min: 210, max: 420 },
  price36:  { label: "Precio para 3-6 personas",   min: 189, max: 336 },
  price720: { label: "Precio para 7-20 personas",  min: 147, max: 294 },
}

const STORAGE_BUCKET = "menu-images"
const MAX_FILE_MB = 10
const MAX_SIDE = 1200

// ── Types ────────────────────────────────────────────────────────────────────

type CourseSetting = { selectionMode: SelectionMode; dishIds: string[] }
type CourseMap = Record<Course, CourseSetting>

type AvailableDish = { id: string; name: string; course: Course }

type Props = {
  menuId: string | null
  availableDishes: AvailableDish[]
  initialData?: MenuEditData
  userId: string
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">
      {children}
    </h2>
  )
}

function PriceInput({
  label, value, onChange, range,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  range: { min: number; max: number }
}) {
  const num = parseFloat(value) || 0
  const outOfRange = num > 0 && (num < range.min || num > range.max)

  return (
    <div>
      <label className="block text-sm mb-1.5">{label}</label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full"
        placeholder="0"
      />
      {outOfRange && (
        <div className="mt-1.5 flex items-start gap-1.5">
          <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground">
            <span className="text-amber-600">Este precio está fuera del rango recomendado. Es posible que reciba menos solicitudes.</span>
            <br />
            Rango recomendado: {range.min} - {range.max} USD
          </div>
        </div>
      )}
      {!outOfRange && num === 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Rango recomendado: {range.min} - {range.max} USD
        </p>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function MenuEditorClient({ menuId, availableDishes, initialData, userId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const [title, setTitle]               = useState(initialData?.title ?? "")
  const [description, setDescription]   = useState(initialData?.description ?? "")
  const [cuisineTypes, setCuisineTypes]  = useState<string[]>(initialData?.cuisine_types ?? [])
  const [imageUrl, setImageUrl]          = useState<string | null>(initialData?.image_url ?? null)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageError, setImageError]      = useState<string | null>(null)
  const [minGuests, setMinGuests]        = useState(initialData?.min_guests ?? 2)
  const [maxGuests, setMaxGuests]        = useState(initialData?.max_guests ?? 20)
  const [price2, setPrice2]              = useState(initialData?.price_2 ? String(initialData.price_2) : "")
  const [price36, setPrice36]            = useState(initialData?.price_3_6 ? String(initialData.price_3_6) : "")
  const [price720, setPrice720]          = useState(initialData?.price_7_20 ? String(initialData.price_7_20) : "")
  const [courseMap, setCourseMap]        = useState<CourseMap>({
    starter:      { selectionMode: initialData?.courseSettings?.starter?.selectionMode      ?? "all_inclusive", dishIds: initialData?.courseSettings?.starter?.dishIds      ?? [] },
    first_course: { selectionMode: initialData?.courseSettings?.first_course?.selectionMode ?? "all_inclusive", dishIds: initialData?.courseSettings?.first_course?.dishIds ?? [] },
    main:         { selectionMode: initialData?.courseSettings?.main?.selectionMode         ?? "all_inclusive", dishIds: initialData?.courseSettings?.main?.dishIds         ?? [] },
    dessert:      { selectionMode: initialData?.courseSettings?.dessert?.selectionMode      ?? "all_inclusive", dishIds: initialData?.courseSettings?.dessert?.dishIds      ?? [] },
  })
  const [openPicker, setOpenPicker]      = useState<Course | null>(null)
  const [saveError, setSaveError]        = useState<string | null>(null)

  // ── Price table ──────────────────────────────────────────────────────────

  const priceRows = useMemo(() => {
    const p2   = parseFloat(price2)   || 0
    const p36  = parseFloat(price36)  || 0
    const p720 = parseFloat(price720) || 0
    return Array.from({ length: maxGuests - minGuests + 1 }, (_, i) => {
      const n = minGuests + i
      const perPerson = n === 2 ? p2 : n <= 6 ? p36 : p720
      const total = Math.round(perPerson * n * 100) / 100
      const chef  = Math.round(total * 0.80 * 100) / 100
      return { n, chef, total }
    })
  }, [minGuests, maxGuests, price2, price36, price720])

  // ── Cuisine type toggle ───────────────────────────────────────────────────

  function toggleCuisine(val: string) {
    setCuisineTypes(prev => {
      if (prev.includes(val)) return prev.filter(v => v !== val)
      if (prev.length >= 3) return prev
      return [...prev, val]
    })
  }

  // ── Image upload ──────────────────────────────────────────────────────────

  async function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setImageError("Solo se permiten imágenes (JPG, PNG, WEBP)")
      return
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setImageError(`La imagen no puede superar ${MAX_FILE_MB} MB`)
      return
    }
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

  // ── Course helpers ────────────────────────────────────────────────────────

  function setSelectionMode(course: Course, mode: SelectionMode) {
    setCourseMap(prev => ({ ...prev, [course]: { ...prev[course], selectionMode: mode } }))
  }

  function addDishToCourse(course: Course, dishId: string) {
    setCourseMap(prev => {
      if (prev[course].dishIds.includes(dishId)) return prev
      return { ...prev, [course]: { ...prev[course], dishIds: [...prev[course].dishIds, dishId] } }
    })
    setOpenPicker(null)
  }

  function removeDishFromCourse(course: Course, dishId: string) {
    setCourseMap(prev => ({
      ...prev,
      [course]: { ...prev[course], dishIds: prev[course].dishIds.filter(id => id !== dishId) },
    }))
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  function handleSave() {
    setSaveError(null)
    startTransition(async () => {
      const result = await saveMenu({
        menuId,
        title: title.trim(),
        description: description.trim(),
        cuisineTypes,
        imageUrl,
        minGuests,
        maxGuests,
        price2: parseFloat(price2) || 0,
        price36: parseFloat(price36) || 0,
        price720: parseFloat(price720) || 0,
        courseData: COURSES_CONFIG.map(c => ({
          course: c.value,
          selectionMode: courseMap[c.value].selectionMode,
          dishIds: courseMap[c.value].dishIds,
        })),
      })
      if (result.error) {
        setSaveError(result.error)
        return
      }
      router.push("/dashboard/menus")
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-2xl">
      {/* Banner */}
      <div className="flex items-center justify-between mb-6 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm">
        <div className="flex items-center gap-2 text-amber-700">
          <Info size={15} className="shrink-0" />
          Completa tu perfil para conseguir reservas.
        </div>
        <a href="/dashboard" className="flex items-center gap-1 text-accent hover:underline font-medium">
          Finalizar <ChevronRight size={14} />
        </a>
      </div>

      <h1 className="text-2xl font-semibold mb-8">Edición de menús</h1>

      {/* ── DESCRIPCIÓN ──────────────────────────────────────────────── */}
      <section className="mb-8">
        <SectionTitle>Descripción</SectionTitle>

        <div className="mb-5">
          <label className="block text-sm font-medium mb-3">
            Tipo de alimento <span className="font-normal text-muted-foreground">(Puede seleccionar hasta 3)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CUISINE_OPTIONS.map(opt => {
              const selected = cuisineTypes.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleCuisine(opt.value)}
                  className={`rounded-xl border px-4 py-3 text-sm text-left transition-colors ${
                    selected
                      ? "border-accent bg-accent/5 text-accent"
                      : "border-border bg-background hover:bg-accent"
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1.5">Nombre del menú</label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value.slice(0, 100))}
            placeholder="Por ejemplo, esencias mediterráneas"
            className="w-full"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">{title.length} / 100</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Descripción del menú <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value.slice(0, 500))}
            placeholder="Por ejemplo, el sabor del mar en su máxima expresión, donde la frescura de los ingredientes se fusiona con sutiles toques gourmet."
            rows={4}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 resize-y"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">{description.length} / 500</p>
          <p className="text-xs text-muted-foreground">
            Puedes escribir el tuyo propio, o podemos generarlo automáticamente usando IA una vez que hayas guardado y añadido tus platos
          </p>
        </div>
      </section>

      {/* ── IMAGEN ───────────────────────────────────────────────────── */}
      <section className="mb-8">
        <label className="block text-sm font-medium mb-1">Imagen del menú</label>
        <p className="text-sm text-muted-foreground mb-3">
          ¿Necesitas ayuda para que tus fotos luzcan increíbles?{" "}
          <span className="text-accent cursor-pointer hover:underline">Consulta nuestro Centro de Ayuda</span>{" "}
          para obtener las mejores prácticas.
        </p>

        <div
          className="w-36 h-36 rounded-xl border-2 border-dashed border-accent/40 bg-accent/5 flex items-center justify-center cursor-pointer overflow-hidden hover:bg-accent/10 transition-colors relative"
          onClick={() => !imageUploading && fileRef.current?.click()}
        >
          {imageUrl ? (
            <>
              <img src={imageUrl} alt="Imagen del menú" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setImageUrl(null) }}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
              >
                <X size={12} />
              </button>
            </>
          ) : imageUploading ? (
            <Loader2 size={24} className="text-accent/60 animate-spin" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
              <Plus size={20} className="text-white" />
            </div>
          )}
        </div>

        {imageError && <p className="mt-1 text-xs text-destructive">{imageError}</p>}

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
      </section>

      {/* ── LÁMINA ───────────────────────────────────────────────────── */}
      <section className="mb-8">
        <SectionTitle>Lámina</SectionTitle>
        <p className="text-sm text-muted-foreground mb-4">Añade al menos un plato a tu menú.</p>

        <div className="space-y-3">
          {COURSES_CONFIG.map(courseConf => {
            const setting = courseMap[courseConf.value]
            const courseDishes = availableDishes.filter(d => d.course === courseConf.value)
            const addedDishes = courseDishes.filter(d => setting.dishIds.includes(d.id))
            const notAdded = courseDishes.filter(d => !setting.dishIds.includes(d.id))

            return (
              <div key={courseConf.value} className="rounded-2xl border border-border p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  {courseConf.label}
                </p>
                <p className="text-sm text-muted-foreground mb-3">
                  Decida si se trata de una propuesta fija o si el cliente podrá elegir entre los platos propuestos.
                </p>

                {/* Selection mode */}
                <div className="relative inline-block mb-4">
                  <select
                    value={setting.selectionMode}
                    onChange={e => setSelectionMode(courseConf.value, e.target.value as SelectionMode)}
                    className="appearance-none rounded-xl border border-input bg-background pl-3 pr-8 py-2 text-sm outline-none focus:border-ring cursor-pointer"
                  >
                    {SELECTION_MODES.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>

                {/* Dishes sub-section */}
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Platos</p>

                {addedDishes.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {addedDishes.map(d => (
                      <div key={d.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
                        <span className="text-sm">{d.name}</span>
                        <button
                          type="button"
                          onClick={() => removeDishFromCourse(courseConf.value, d.id)}
                          className="ml-3 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Picker trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenPicker(openPicker === courseConf.value ? null : courseConf.value)}
                    className="text-sm text-accent hover:underline"
                  >
                    + {courseConf.addLabel}
                  </button>

                  {openPicker === courseConf.value && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenPicker(null)} />
                      <div className="absolute left-0 top-6 z-20 min-w-56 rounded-xl border border-border bg-background shadow-lg py-1">
                        {notAdded.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-muted-foreground">
                            {courseDishes.length === 0
                              ? "No tienes platos de este tipo. Agrégalos en la sección Platos."
                              : "Ya agregaste todos los platos disponibles."}
                          </p>
                        ) : (
                          notAdded.map(d => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => addDishToCourse(courseConf.value, d.id)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                            >
                              {d.name}
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── PRECIOS ──────────────────────────────────────────────────── */}
      <section className="mb-8">
        <SectionTitle>Precios</SectionTitle>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: inputs */}
          <div className="space-y-5">
            <div>
              <SectionTitle>Número de personas</SectionTitle>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm mb-1.5">Número mínimo de huéspedes</label>
                  <div className="relative inline-block w-32">
                    <select
                      value={minGuests}
                      onChange={e => {
                        const v = Number(e.target.value)
                        setMinGuests(v)
                        if (v > maxGuests) setMaxGuests(v)
                      }}
                      className="w-full appearance-none rounded-xl border border-input bg-background pl-3 pr-8 py-2 text-sm outline-none focus:border-ring cursor-pointer"
                    >
                      {Array.from({ length: 19 }, (_, i) => i + 2).map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-1.5">Número máximo de huéspedes</label>
                  <div className="relative inline-block w-32">
                    <select
                      value={maxGuests}
                      onChange={e => setMaxGuests(Number(e.target.value))}
                      className="w-full appearance-none rounded-xl border border-input bg-background pl-3 pr-8 py-2 text-sm outline-none focus:border-ring cursor-pointer"
                    >
                      {Array.from({ length: 19 }, (_, i) => i + 2)
                        .filter(n => n >= minGuests)
                        .map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <SectionTitle>Rangos de precios (USD)</SectionTitle>
              <div className="space-y-4">
                <PriceInput label={PRICE_RANGES.price2.label}   value={price2}   onChange={setPrice2}   range={PRICE_RANGES.price2} />
                <PriceInput label={PRICE_RANGES.price36.label}  value={price36}  onChange={setPrice36}  range={PRICE_RANGES.price36} />
                <PriceInput label={PRICE_RANGES.price720.label} value={price720} onChange={setPrice720} range={PRICE_RANGES.price720} />
              </div>
            </div>
          </div>

          {/* Right: price table */}
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-zinc-50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Gente</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Cocinero</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {priceRows.map(row => (
                  <tr key={row.n} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-1.5 text-xs">{row.n}</td>
                    <td className="px-3 py-1.5 text-xs text-right">{row.chef}</td>
                    <td className="px-3 py-1.5 text-xs text-right">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-3 py-2 text-xs text-muted-foreground border-t border-border/40">
              * Recuerda que Take a Chef cobra una comisión del 20% sobre el importe total del servicio.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-zinc-50 border border-border px-4 py-3 mb-6 text-sm text-center text-muted-foreground">
        <span className="font-medium text-foreground">Su menú debe incluir: </span>
        diseño del menú, compra de las materias primas, preparación en el domicilio del cliente, servicio de mesa y limpieza y orden de la cocina.
      </div>

      {saveError && (
        <p className="mb-4 text-sm text-destructive text-center">{saveError}</p>
      )}

      <div className="flex justify-center">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isPending || imageUploading || !title.trim()}
          className="rounded-full bg-accent hover:bg-accent/90 text-white px-10"
        >
          {isPending ? (
            <><Loader2 size={15} className="mr-2 animate-spin" /> Guardando...</>
          ) : (
            "Guardar menú"
          )}
        </Button>
      </div>
    </div>
  )
}
