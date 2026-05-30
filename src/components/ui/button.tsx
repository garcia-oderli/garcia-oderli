'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#F5A623] text-[#111111] hover:bg-[#e09610] focus-visible:ring-[#F5A623] focus-visible:ring-offset-[#111111]',
        destructive: 'bg-[#F44336] text-white hover:bg-[#d32f2f]',
        outline: 'border border-[#2A2A2A] bg-transparent text-[#F5F5F5] hover:bg-[#222222] hover:text-white focus-visible:ring-[#F5A623] focus-visible:ring-offset-[#111111]',
        secondary: 'bg-[#222222] text-[#F5F5F5] hover:bg-[#2A2A2A]',
        ghost: 'hover:bg-[#222222] text-[#888888] hover:text-[#F5F5F5]',
        link: 'text-[#F5A623] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded px-3',
        lg: 'h-11 rounded px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
