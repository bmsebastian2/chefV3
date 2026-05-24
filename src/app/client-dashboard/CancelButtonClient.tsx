'use client'

import dynamic from 'next/dynamic'

export const CancelButton = dynamic(
  () => import('./CancelButton').then((m) => ({ default: m.CancelButton })),
  { ssr: false, loading: () => <div className="w-9 h-9 shrink-0" /> }
)
