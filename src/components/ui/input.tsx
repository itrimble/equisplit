import * as React from "react"

import { cn } from "@/utils/cn"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputMode, ...props }, ref) => {
    // Auto-determine inputMode based on type if not explicitly provided
    const getInputMode = () => {
      if (inputMode) return inputMode
      
      switch (type) {
        case 'number':
          return 'numeric'
        case 'tel':
          return 'tel'
        case 'email':
          return 'email'
        case 'url':
          return 'url'
        case 'search':
          return 'search'
        default:
          return 'text'
      }
    }

    // Auto-determine pattern for iOS numeric keyboards
    const getPattern = () => {
      if (props.pattern) return props.pattern
      
      switch (type) {
        case 'number':
          return '[0-9]*'
        case 'tel':
          return '[0-9]*'
        default:
          return undefined
      }
    }

    return (
      <input
        type={type}
        inputMode={getInputMode()}
        pattern={getPattern()}
        className={cn(
          "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }