'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'

export function BackLink({ href }: { href: string }) {
  const [loading, setLoading] = useState(false)

  return (
    <Link
      href={href}
      onClick={() => setLoading(true)}
      className="pl-12 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-8 py-6 -mx-3 rounded-lg hover:bg-zinc-100"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <ArrowLeft className="w-4 h-4 " />
      )}
      Mis solicitudes
    </Link>
  )
}
