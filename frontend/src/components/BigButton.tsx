import Link from "next/link";
import type { ReactNode } from "react";

type BigButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
};

export default function BigButton({
  href,
  children,
  variant = "primary",
}: BigButtonProps) {
  return (
    <Link className={`big-button big-button--${variant}`} href={href}>
      {children}
    </Link>
  );
}
