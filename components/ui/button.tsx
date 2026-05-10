import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type ButtonBaseProps = {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
};

type ButtonProps = ButtonBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type ButtonLinkProps = ButtonBaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

const variants = {
  primary:
    "border-accent bg-accent text-white shadow-[0_14px_35px_rgba(47,123,255,0.28)] hover:bg-blue-500",
  secondary:
    "border-white/12 bg-white/[0.06] text-ink hover:border-accent/50 hover:bg-white/[0.09]",
  ghost: "border-transparent bg-transparent text-muted hover:text-ink",
};

export function Button(props: ButtonProps | ButtonLinkProps) {
  const { children, className, variant = "primary" } = props;
  const buttonClassName = cn(
    "inline-flex min-h-11 items-center justify-center rounded-md border px-5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-accent/70 focus:ring-offset-2 focus:ring-offset-background",
    variants[variant],
    className,
  );

  if ("href" in props && props.href) {
    const { href, children: _children, className: _className, variant: _variant, ...linkProps } =
      props as ButtonLinkProps;

    return (
      <Link className={buttonClassName} href={href} {...linkProps}>
        {children}
      </Link>
    );
  }

  const {
    children: _children,
    className: _className,
    variant: _variant,
    ...buttonProps
  } = props as ButtonProps;

  return (
    <button className={buttonClassName} {...buttonProps}>
      {children}
    </button>
  );
}
