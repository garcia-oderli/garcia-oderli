import Link from 'next/link'
import { Factory } from 'lucide-react'

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
            <Factory className="h-6 w-6 text-blue-600" />
            <span className="text-lg">Apontamento de Produção</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/apontamentos"
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              Apontamentos
            </Link>
            <Link
              href="/apontamentos/novo"
              className="ml-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              + Novo Apontamento
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
