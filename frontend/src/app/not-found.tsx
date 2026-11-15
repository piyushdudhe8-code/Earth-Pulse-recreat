import Link from "next/link";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <div className="tool-page">
      <main className="placeholder-page">
        <p className="eyebrow">EARTH PULSE</p>
        <h1>We could not find that page.</h1>
        <p className="placeholder-page__description">
          The link may be old or the page may have moved.
        </p>
        <Link className="big-button big-button--primary" href="/">
          Go to Earth Pulse home
        </Link>
      </main>
      <Footer>Earth Pulse page not found.</Footer>
    </div>
  );
}
