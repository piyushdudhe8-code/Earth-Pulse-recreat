"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { checkBackendConnection } from "@/lib/api";
import { useLanguage } from "@/lib/language";

type ToolHeaderProps = {
  currentPage: string;
};

export default function ToolHeader({ currentPage }: ToolHeaderProps) {
  const { language, setLanguage } = useLanguage();
  const [backendStatus, setBackendStatus] = useState<
    "checking" | "connected" | "unavailable"
  >("checking");
  const localizedPage =
    language === "hi"
      ? {
          "Investigate My Surroundings": "अपने आसपास की जाँच करें",
          "Imagine the Future": "भविष्य की कल्पना करें",
          "Research Lab": "रिसर्च लैब",
          "Research Report": "रिसर्च रिपोर्ट",
          "Methodology & Data Sources": "तरीके और डेटा स्रोत",
          "About Earth Pulse": "Earth Pulse के बारे में",
        }[currentPage] ?? currentPage
      : currentPage;

  useEffect(() => {
    let active = true;
    const checkConnection = async () => {
      try {
        await checkBackendConnection();
        if (active) setBackendStatus("connected");
      } catch {
        if (active) setBackendStatus("unavailable");
      }
    };

    void checkConnection();
    const intervalId = window.setInterval(() => void checkConnection(), 30_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const statusLabel =
    language === "hi"
      ? {
          checking: "API: कनेक्शन जाँच रहे हैं",
          connected: "API: कनेक्टेड",
          unavailable: "API: उपलब्ध नहीं",
        }[backendStatus]
      : {
          checking: "Backend: Checking connection",
          connected: "Backend: Connected",
          unavailable: "Backend: Unavailable",
        }[backendStatus];

  return (
    <header className="tool-header">
      <Link className="brand tool-header__brand" href="/">
        <span className="brand__mark" aria-hidden="true">
          <svg viewBox="0 0 40 40" focusable="false">
            <circle cx="20" cy="20" r="17" />
            <path d="M8 21c4-5 8-3 10-7 2-3 6-3 8-1 2 2 6 1 7 5-3 1-4 4-7 5-3 2-4 7-9 7-3-3-6-4-9-9Z" />
          </svg>
        </span>
        <span className="brand__name">Earth <b>Pulse</b></span>
      </Link>
      <span className="tool-header__current">{localizedPage}</span>
      <div className="tool-header__actions">
        <span
          className={`backend-connection-status backend-connection-status--${backendStatus}`}
          role="status"
          aria-live="polite"
        >
          <span className="backend-connection-status__dot" aria-hidden="true" />
          {statusLabel}
        </span>
        <div className="language-toggle" role="group" aria-label="Choose language / भाषा चुनें">
          <button
            type="button"
            lang="en"
            aria-pressed={language === "en"}
            onClick={() => setLanguage("en")}
          >
            English
          </button>
          <span aria-hidden="true">|</span>
          <button
            type="button"
            lang="hi"
            aria-pressed={language === "hi"}
            onClick={() => setLanguage("hi")}
          >
            हिन्दी
          </button>
        </div>
        <Link className="tool-header__methodology" href="/methodology">
          {language === "hi" ? "तरीके" : "Methodology"}
        </Link>
        <Link className="tool-header__methodology" href="/about">
          {language === "hi" ? "परिचय" : "About"}
        </Link>
        <Link className="tool-header__back" href="/">
          <span aria-hidden="true">←</span> {language === "hi" ? "Earth Pulse मुखपृष्ठ" : "Earth Pulse home"}
        </Link>
      </div>
    </header>
  );
}
