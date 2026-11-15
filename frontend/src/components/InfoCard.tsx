import Link from "next/link";
import type { ReactNode } from "react";

type InfoCardProps = {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
};

export default function InfoCard({
  href,
  icon,
  title,
  description,
}: InfoCardProps) {
  return (
    <Link className="info-card" href={href}>
      <span className="info-card__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="info-card__copy">
        <span className="info-card__title">{title}</span>
        <span className="info-card__description">{description}</span>
      </span>
      <span className="info-card__arrow" aria-hidden="true">
        ↗
      </span>
    </Link>
  );
}
