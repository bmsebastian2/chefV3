"use client"

import { useState, useTransition } from "react"
import { Pencil, Trash2, X, Plus, ChevronDown, UtensilsCrossed, AlertCircle } from "lucide-react"
import { addDish, updateDish, deleteDish, type Dish, type Course } from "@/app/dashboard/platos/actions"

const COURSES: { value: Course; label: string }[] = [
  { value: "starter",      label: "Motor de arranque" },
  { value: "first_course", label: "Primer plato" },
  { value: "main",         label: "Plato principal" },
  { value: "dessert",      label: "Postre" },
]

type ModalState =
  | { type: "none" }
  | { type: "add" }
  | { type: "edit";   dish: Dish }
  | { type: "delete"; dish: Dish }

// ── Helpers ──────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 mb-2">
      {children}
    </label>
  )
}

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

// ── DishForm ─────────────────────────────────────────────────────────────────

function DishForm({
  title,
  initialName        = "",
  initialCourse      = "starter",
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
          <FieldLabel>Nombre del plato</FieldLabel>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Risotto de hongos"
            className="w-full h-11 px-4 border border-zinc-200 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150"
          />
        </div>

        <div>
          <FieldLabel>Categoría</FieldLabel>
          <div className="relative">
            <select
              value={course}
              onChange={e => setCourse(e.target.value as Course)}
              className="w-full h-11 appearance-none px-4 pr-10 border border-zinc-200 rounded-xl text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150 cursor-pointer"
            >
              <option value="" disabled>Seleccioná la categoría</option>
              {COURSES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          </div>
        </div>

        <div>
          <FieldLabel>
            Descripción{" "}
            <span className="text-zinc-400 normal-case tracking-normal font-normal">(opcional)</span>
          </FieldLabel>
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
          disabled={pending || !name.trim() || !course}
          className="flex-1 h-10 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-semibold hover:shadow-md hover:shadow-accent/20 transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </Overlay>
  )
}

// ── DeleteConfirm ─────────────────────────────────────────────────────────────

function DeleteConfirm({
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
        ¿Estás seguro de que querés eliminar este plato?
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

// ── Main component ────────────────────────────────────────────────────────────

export function PlatosClient({ initialDishes }: { initialDishes: Dish[] }) {
  const [dishes, setDishes]     = useState<Dish[]>(initialDishes)
  const [modal, setModal]       = useState<ModalState>({ type: "none" })
  const [error, setError]       = useState<string | undefined>()
  const [filter, setFilter]     = useState<Course | "all">("all")
  const [isPending, startTransition] = useTransition()

  const closeModal = () => {
    setModal({ type: "none" })
    setError(undefined)
  }

  const handleAdd = (name: string, course: Course, description: string) => {
    setError(undefined)
    startTransition(async () => {
      const result = await addDish(name, course, description)
      if (result.error) { setError(result.error); return }
      setDishes(prev => [...prev, { id: result.id!, name, course, description: description || null }])
      closeModal()
    })
  }

  const handleEdit = (name: string, course: Course, description: string) => {
    if (modal.type !== "edit") return
    const dishId = modal.dish.id
    setError(undefined)
    startTransition(async () => {
      const result = await updateDish(dishId, name, course, description)
      if (result.error) { setError(result.error); return }
      setDishes(prev => prev.map(d => d.id === dishId ? { ...d, name, course, description: description || null } : d))
      closeModal()
    })
  }

  const handleDelete = () => {
    if (modal.type !== "delete") return
    const dishId = modal.dish.id
    setError(undefined)
    startTransition(async () => {
      const result = await deleteDish(dishId)
      if (result.error) { setError(result.error); return }
      setDishes(prev => prev.filter(d => d.id !== dishId))
      closeModal()
    })
  }

  const visibleCourses = filter === "all"
    ? COURSES
    : COURSES.filter(c => c.value === filter)

  return (
    <>
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="relative">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as Course | "all")}
              className="h-9 appearance-none pl-3 pr-8 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150 cursor-pointer"
            >
              <option value="all">Todos</option>
              {COURSES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          </div>
          {dishes.length > 0 && (
            <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-100 px-2 py-1 rounded-full">
              {dishes.length}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setModal({ type: "add" })}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold text-xs h-9 px-4 rounded-xl transition-all duration-150 hover:shadow-md hover:shadow-accent/20 hover:-translate-y-0.5"
        >
          <Plus size={13} />
          Agregar plato
        </button>
      </div>

      {/* ── Empty state ── */}
      {dishes.length === 0 ? (
        <div className="text-center py-16 bg-white border border-zinc-100 rounded-2xl shadow-sm">
          <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed size={24} className="text-zinc-300" />
          </div>
          <p className="text-sm font-medium text-zinc-600 mb-1">Todavía no tenés platos</p>
          <p className="text-xs text-zinc-400">Agregá el primero para poder armar tus menús.</p>
        </div>
      ) : (
        /* ── Dish list grouped by course ── */
        <div className="space-y-3">
          {visibleCourses.map((courseItem) => {
            const courseDishes = dishes.filter(d => d.course === courseItem.value)
            if (courseDishes.length === 0) return null
            return (
              <div
                key={courseItem.value}
                className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden"
              >
                {/* Course header */}
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-50">
                  <div className="h-px w-4 bg-accent/40 rounded-full" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                    {courseItem.label}
                  </p>
                  <span className="ml-auto text-[10px] font-semibold text-zinc-300">
                    {courseDishes.length}
                  </span>
                </div>

                {/* Dish rows */}
                {courseDishes.map((dish, di) => (
                  <div
                    key={dish.id}
                    className={`flex items-center justify-between px-4 py-3 group hover:bg-zinc-50/50 transition-colors ${
                      di < courseDishes.length - 1 ? "border-b border-zinc-50" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-800">{dish.name}</p>
                      {dish.description && (
                        <p className="text-xs text-zinc-400 truncate max-w-[240px] mt-0.5">
                          {dish.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 ml-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setModal({ type: "edit", dish })}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                        aria-label="Editar plato"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setModal({ type: "delete", dish })}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        aria-label="Eliminar plato"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modals ── */}
      {modal.type === "add" && (
        <DishForm
          title="Agregar plato"
          onSave={handleAdd}
          onCancel={closeModal}
          pending={isPending}
          error={error}
        />
      )}

      {modal.type === "edit" && (
        <DishForm
          key={modal.dish.id}
          title="Editar plato"
          initialName={modal.dish.name}
          initialCourse={modal.dish.course}
          initialDescription={modal.dish.description ?? ""}
          onSave={handleEdit}
          onCancel={closeModal}
          pending={isPending}
          error={error}
        />
      )}

      {modal.type === "delete" && (
        <DeleteConfirm
          dish={modal.dish}
          onConfirm={handleDelete}
          onCancel={closeModal}
          pending={isPending}
          error={error}
        />
      )}
    </>
  )
}
