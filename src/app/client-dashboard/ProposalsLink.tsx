'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, ArrowRight } from 'lucide-react'

export function ProposalsLink({ href, count }: { href: string; count: number }) {
  const [loading, setLoading] = useState(false)

  return (
    <Link
      href={href}
      onClick={() => setLoading(true)}
      className="group inline-flex items-center gap-1.5 text-emerald-600 font-semibold text-xs hover:text-emerald-700 transition-colors"
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
      ) : (
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold shrink-0">
          {count}
        </span>
      )}
      <span>{count !== 1 ? 'propuestas' : 'propuesta'}</span>
      <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform duration-150" />
    </Link>
  )
}
