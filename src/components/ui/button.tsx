import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/utils/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        legal: "bg-blue-600 text-white hover:bg-blue-700 border border-blue-600",
        warning: "bg-yellow-600 text-white hover:bg-yellow-700 border border-yellow-600",
        success: "bg-green-600 text-white hover:bg-green-700 border border-green-600",
      },
      size: {
        default: "h-11 px-4 py-2", // Increased from 40px to 44px for WCAG 2.1 AA compliance
        sm: "h-11 rounded-md px-3",  // Increased from 36px to 44px for WCAG 2.1 AA compliance
        lg: "h-12 rounded-md px-8",  // Increased from 44px to 48px for better touch experience
        xl: "h-14 rounded-md px-12 text-base", // Increased from 48px to 56px for better touch experience
        icon: "h-11 w-11", // Increased from 40px to 44px for WCAG 2.1 AA compliance
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
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
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }