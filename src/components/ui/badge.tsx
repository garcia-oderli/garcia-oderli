import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-[#F5A623] text-[#111111]',
        secondary: 'bg-[#222222] text-[#888888] border border-[#2A2A2A]',
        destructive: 'bg-[#F44336] text-white',
        outline: 'text-[#F5F5F5] border border-[#2A2A2A]',
        manha: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/40',
        tarde: 'bg-blue-900/40 text-blue-300 border border-blue-700/40',
        noite: 'bg-purple-900/40 text-purple-300 border border-purple-700/40',
        aberta: 'bg-blue-900/40 text-blue-300 border border-blue-700/40',
        em_andamento: 'bg-orange-900/40 text-orange-300 border border-orange-700/40',
        concluida: 'bg-green-900/40 text-green-300 border border-green-700/40',
        cancelada: 'bg-red-900/40 text-red-300 border border-red-700/40',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
