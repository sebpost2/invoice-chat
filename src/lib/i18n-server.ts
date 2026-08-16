import "server-only";
import { cookies } from "next/headers";
import { dicts, type Dict, type Lang, LANG_COOKIE } from "./i18n-dicts";

export async function getLang(): Promise<Lang> {
  const c = await cookies();
  const v = c.get(LANG_COOKIE)?.value;
  return v === "es" || v === "en" ? v : "es";
}

export async function getDict(): Promise<Dict> {
  const lang = await getLang();
  return dicts[lang];
}
