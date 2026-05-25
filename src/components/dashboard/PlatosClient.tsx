"use client"

import { useState, useTransition } from "react"
import { Pencil, Trash2, X, Plus, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  | { type: "edit"; dish: Dish }
  | { type: "delete"; dish: Dish }

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-border bg-background p-6 shadow-xl shadow-slate-950/10">
        {children}
      </div>
    </div>
  )
}

function DishForm({
  title,
  initialName = "",
  initialCourse = "starter",
  initialDescription = "",
  onSave,
  onCancel,
  pending,
  error,
}: {
  title: string
  initialName?: string
  initialCourse?: Course
  initialDescription?: string
  onSave: (name: string, course: Course, description: string) => void
  onCancel: () => void
  pending: boolean
  error?: string
}) {
  const [name, setName] = useState(initialName)
  const [course, setCourse] = useState<Course>(initialCourse)
  const [description, setDescription] = useState(initialDescription)

  return (
    <Overlay>
      <button
        type="button"
        onClick={onCancel}
        className="absolute right-5 top-5 text-muted-foreground hover:text-foreground"
      >
        <X size={18} />
      </button>

      <h2 className="text-center text-xl font-semibold mb-6">{title}</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Nombre del plato</label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nombre del plato"
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Categoría de plato</label>
          <div className="relative">
            <select
              value={course}
              onChange={e => setCourse(e.target.value as Course)}
              className="w-full appearance-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 cursor-pointer"
            >
              <option value="" disabled>Seleccione el tipo de plato</option>
              {COURSES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Descripción <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Ingredientes, preparación, alérgenos..."
            rows={3}
            className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="mt-6 flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1 rounded-full"
          onClick={onCancel}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          className="flex-1 rounded-full bg-accent hover:bg-accent/90 text-white"
          onClick={() => onSave(name, course, description)}
          disabled={pending || !name.trim() || !course}
        >
          {pending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </Overlay>
  )
}

function DeleteConfirm({
  dish,
  onConfirm,
  onCancel,
  pending,
  error,
}: {
  dish: Dish
  onConfirm: () => void
  onCancel: () => void
  pending: boolean
  error?: string
}) {
  return (
    <Overlay>
      <button
        type="button"
        onClick={onCancel}
        className="absolute right-5 top-5 text-muted-foreground hover:text-foreground"
      >
        <X size={18} />
      </button>

      <h2 className="text-center text-xl font-semibold mb-3">Eliminar plato</h2>
      <p className="text-center text-sm text-muted-foreground mb-1">
        ¿Estás seguro de que quieres retirar el plato?
      </p>
      <p className="text-center text-sm font-semibold mb-6">{dish.name}</p>

      {error && <p className="mb-4 text-sm text-destructive text-center">{error}</p>}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1 rounded-full"
          onClick={onCancel}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          className="flex-1 rounded-full bg-accent hover:bg-accent/90 text-white"
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? "Borrando..." : "Borrar"}
        </Button>
      </div>
    </Overlay>
  )
}

export function PlatosClient({ initialDishes }: { initialDishes: Dish[] }) {
  const [dishes, setDishes] = useState<Dish[]>(initialDishes)
  const [modal, setModal] = useState<ModalState>({ type: "none" })
  const [error, setError] = useState<string | undefined>()
  const [filter, setFilter] = useState<Course | "all">("all")
  const [isPending, startTransition] = useTransition()

  const closeModal = () => {
    setModal({ type: "none" })
    setError(undefined)
  }

  const handleAdd = (name: string, course: Course, description: string) => {
    setError(undefined)
    startTransition(async () => {
      const result = await addDish(name, course, description)
      if (result.error) {
        setError(result.error)
        return
      }
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
      if (result.error) {
        setError(result.error)
        return
      }
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
      if (result.error) {
        setError(result.error)
        return
      }
      setDishes(prev => prev.filter(d => d.id !== dishId))
      closeModal()
    })
  }

  const visibleCourses = filter === "all"
    ? COURSES
    : COURSES.filter(c => c.value === filter)

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          type="button"
          onClick={() => setModal({ type: "add" })}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-accent text-white shadow hover:bg-accent/90 transition-colors"
        >
          <Plus size={20} />
        </button>
        <span className="text-sm font-medium text-accent">Agregar plato</span>
      </div>

      {/* Section header + filter */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Tus platos
        </h2>
        <div className="relative">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as Course | "all")}
            className="appearance-none rounded-xl border border-input bg-background pl-3 pr-8 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 cursor-pointer"
          >
            <option value="all">Todos los platos</option>
            {COURSES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      {/* Dish list */}
      <div className="rounded-2xl border border-border overflow-hidden">
        {visibleCourses.map((courseItem, ci) => {
          const courseDishes = dishes.filter(d => d.course === courseItem.value)
          if (courseDishes.length === 0) return null
          return (
            <div key={courseItem.value}>
              {ci > 0 && <div className="h-px bg-border" />}
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {courseItem.label}
                </p>
              </div>
              {courseDishes.map((dish, di) => (
                <div
                  key={dish.id}
                  className={`flex items-center justify-between px-4 py-3 ${di < courseDishes.length - 1 ? "border-b border-border/50" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm">{dish.name}</p>
                    {dish.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{dish.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4 shrink-0">
                    <button
                      type="button"
                      onClick={() => setModal({ type: "edit", dish })}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setModal({ type: "delete", dish })}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        })}

        {dishes.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            Todavía no tienes platos. ¡Agrega el primero!
          </div>
        )}
      </div>

      {/* Modals */}
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
