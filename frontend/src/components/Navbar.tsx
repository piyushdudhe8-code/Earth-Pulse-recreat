"use client";

import Link from "next/link";

type Language = "en" | "hi";

type NavbarProps = {
  language: Language;
  onLanguageChange: (language: Language) => void;
};

export default function Navbar({
  language,
  onLanguageChange,
}: NavbarProps) {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label={language === "en" ? "Earth Pulse home" : "Earth Pulse मुखपृष्ठ"}>
        <span className="brand__mark" aria-hidden="true">
          <svg viewBox="0 0 40 40" focusable="false">
            <circle cx="20" cy="20" r="17" />
            <path d="M8 21c4-5 8-3 10-7 2-3 6-3 8-1 2 2 6 1 7 5-3 1-4 4-7 5-3 2-4 7-9 7-3-3-6-4-9-9Z" />
          </svg>
        </span>
        <span className="brand__name">Earth <b>Pulse</b></span>
      </Link>
      <div className="language-toggle" role="group" aria-label="Choose language / भाषा चुनें">
        <button
          type="button"
          lang="en"
          aria-pressed={language === "en"}
          onClick={() => onLanguageChange("en")}
        >
          English
        </button>
        <span aria-hidden="true">|</span>
        <button
          type="button"
          lang="hi"
          aria-pressed={language === "hi"}
          onClick={() => onLanguageChange("hi")}
        >
          हिन्दी
        </button>
      </div>
    </header>
  );
}
