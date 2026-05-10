import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  as?: "div" | "article" | "aside";
};

export function Card({
  as: Component = "div",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Component
      className={cn(
        "rounded-lg border premium-border bg-surface/88 shadow-soft backdrop-blur transition",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
