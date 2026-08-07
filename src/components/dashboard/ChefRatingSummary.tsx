'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { RatingLine, Stars } from '@/components/Chefs'
import { createClient } from '@/utils/supabase/clients'

type Review = {
  id: string
  reviewer_name: string | null
  rating_chef: number
  rating_food: number
  rating_presentation: number
  rating_cleanliness: number
  comment: string | null
  created_at: string
}

function reviewAverage(r: Review): number {
  return (r.rating_chef + r.rating_food + r.rating_presentation + r.rating_cleanliness) / 4
}

// Promedio + cantidad llegan ya calculados desde chef_profiles (mantenidos por
// trigger, ver MIGRATION_rating_count.sql) — cero query extra al cargar el
// dashboard. Los comentarios completos solo se piden al abrir el popup, y se
// cachean en estado para no repetir la consulta si se reabre.
export function ChefRatingSummary({
  chefId,
  average,
  count,
}: {
  chefId: string
  average: number
  count: number
}) {
  const [open, setOpen] = useState(false)
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [loading, setLoading] = useState(false)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next && reviews === null && !loading) {
      setLoading(true)
      const supabase = createClient()
      supabase
        .from('reviews')
        .select('id, reviewer_name, rating_chef, rating_food, rating_presentation, rating_cleanliness, comment, created_at')
        .eq('chef_id', chefId)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setReviews((data as Review[] | null) ?? [])
          setLoading(false)
        })
    }
  }

  if (count === 0) {
    return <RatingLine rating={{ average, count }} />
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button type="button" className="cursor-pointer text-left">
          <RatingLine rating={{ average, count }} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tus reseñas</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {loading && (
            <p className="text-sm text-muted-foreground">Cargando reseñas…</p>
          )}
          {!loading && reviews?.length === 0 && (
            <p className="text-sm text-muted-foreground">Todavía no hay comentarios.</p>
          )}
          {!loading &&
            reviews?.map((r) => (
              <div key={r.id} className="border-b border-zinc-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-zinc-800">
                    {r.reviewer_name || 'Cliente'}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {new Date(r.created_at).toLocaleDateString('es', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <Stars rating={reviewAverage(r)} className="mt-1" />
                {r.comment && (
                  <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{r.comment}</p>
                )}
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
