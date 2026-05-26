'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Loader2 } from 'lucide-react'

type Props = {
  href: string
  photoUrl: string | null
  chefName: string
  priceText: string
}

export function ProposalCard({ href, photoUrl, chefName, priceText }: Props) {
  const [loading, setLoading] = useState(false)

  return (
    <Link
      href={href}
      onClick={() => setLoading(true)}
      className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 transition-colors group"
    >
      <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-100 flex-shrink-0 ring-1 ring-zinc-200">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={chefName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400 text-base font-semibold">
            {chefName[0]?.toUpperCase() ?? 'C'}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-700">{chefName}</p>
        <p className="text-sm text-zinc-500 mt-0.5">{priceText}</p>
      </div>

      <div className="flex items-center gap-0.5 text-sm text-accent font-medium flex-shrink-0">
        Ver propuesta
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </div>
    </Link>
  )
}
