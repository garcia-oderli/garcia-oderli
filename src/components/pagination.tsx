'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  currentPage: number
  totalPages: number
}

export function Pagination({ currentPage, totalPages }: Props) {
  const params = useSearchParams()

  const buildUrl = (page: number) => {
    const next = new URLSearchParams(params.toString())
    next.set('page', String(page))
    return `/apontamentos?${next.toString()}`
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between px-2">
      <p className="text-sm text-gray-500">
        Página {currentPage} de {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild disabled={currentPage <= 1}>
          <Link href={buildUrl(currentPage - 1)}>
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild disabled={currentPage >= totalPages}>
          <Link href={buildUrl(currentPage + 1)}>
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
