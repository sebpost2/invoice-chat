"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { dicts, type Dict, type Lang } from "@/lib/i18n-dicts";

type Ctx = { lang: Lang; t: Dict };

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: ReactNode;
}) {
  return (
    <LanguageContext.Provider value={{ lang, t: dicts[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be inside LanguageProvider");
  return ctx;
}
