import type { RefObject, ReactNode } from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger

export function PopoverContent({
  container,
  children,
  ...props
}: {
  container: RefObject<HTMLDivElement | null>
  children: ReactNode
  "aria-label": string
}) {
  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Positioner
        side="top"
        align="start"
        sideOffset={12}
        collisionBoundary={container.current ?? undefined}
        collisionPadding={16}
        className="isolate z-[var(--z-dropdown)]"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className="max-h-(--available-height) w-[380px] origin-[var(--transform-origin)] overflow-y-auto overscroll-contain rounded-[var(--control-radius)] border border-border bg-card p-6 text-foreground shadow-2xl transition-[opacity,transform] duration-150 outline-none focus-visible:outline-2 focus-visible:outline-foreground data-[ending-style]:translate-y-1 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-1 data-[starting-style]:opacity-0 motion-reduce:transition-none"
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}
