import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

const variantClassMap: Record<ButtonVariant, string> = {
  primary: "glass-btn-primary",
  secondary: "glass-btn-secondary",
  danger: "glass-btn-danger",
  ghost: "glass-card"
};

export function Button({
  children,
  className,
  variant = "primary",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn("rounded-xl px-3 py-2", variantClassMap[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

