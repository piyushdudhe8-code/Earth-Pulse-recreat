import Link from "next/link";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

export default function PlaceholderPage({
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <main className="placeholder-page">
      <Link className="back-link" href="/">
        ← Back to Earth Pulse
      </Link>
      <p className="eyebrow">EARTH PULSE</p>
      <h1>{title}</h1>
      <p className="placeholder-page__description">{description}</p>
      <Link className="big-button big-button--primary" href="/">
        Explore the homepage
      </Link>
    </main>
  );
}
