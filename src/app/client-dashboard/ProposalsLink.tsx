'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

export function ProposalsLink({ href, count }: { href: string; count: number }) {
  const [loading, setLoading] = useState(false)

  return (
    <Link
      href={href}
      onClick={() => setLoading(true)}
      className="inline-flex items-center gap-1.5 text-emerald-600 font-medium hover:underline"
    >
      {loading && <Loader2 className="w-3 h-3 animate-spin" />}
      {count} propuesta{count !== 1 ? 's' : ''}
    </Link>
  )
}
