import type { ComponentProps, ReactNode } from "react"
import { Button } from "@/components/ui/button"
export function Action({
  className = "",
  children,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={`min-h-12 min-w-12 gap-2 rounded-[var(--control-radius)] px-5 text-[14px] font-medium transition-[color,background-color,transform] duration-150 active:scale-[0.96] motion-reduce:transition-none ${className}`}
    >
      {children}
    </Button>
  )
}
export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={`text-[12px] font-medium tracking-[0.13em] text-muted-foreground uppercase ${className}`}
    >
      {children}
    </p>
  )
}
