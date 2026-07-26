import type { ButtonHTMLAttributes } from "react";

export function Button({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`bg-action-primary text-inverse hover:bg-action-primary-hover rounded-control min-h-11 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}
