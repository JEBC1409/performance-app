import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export function Card({ children, className = "", padded = true, ...rest }: CardProps) {
  return (
    <div className={`panel-surface ${padded ? "p-4" : ""} ${className}`} {...rest}>
      {children}
    </div>
  );
}
