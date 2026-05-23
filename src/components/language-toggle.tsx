"use client";

import { useTransition } from "react";
import { setLangAction } from "@/app/actions/i18n";
import { useLanguage } from "./language-provider";

export function LanguageToggle() {
  const { lang, t } = useLanguage();
  const [pending, start] = useTransition();

  return (
    <div
      role="group"
      aria-label={t.toggle.aria}
      className="fixed right-4 top-4 z-50 inline-flex items-center gap-0.5 rounded-full border border-zinc-800 bg-zinc-900/80 p-0.5 text-xs font-medium backdrop-blur-md md:right-6 md:top-5"
    >
      {(["en", "es"] as const).map((l) => {
        const active = lang === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => start(() => setLangAction(l))}
            disabled={pending}
            aria-pressed={active}
            className={`rounded-full px-3 py-1 uppercase tracking-wide transition-colors disabled:opacity-60 ${
              active
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
