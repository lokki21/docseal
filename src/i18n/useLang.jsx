import { createContext, useContext, useEffect, useState } from "react";
import { T } from "./translations.js";

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("docseal_lang") === "en" ? "en" : "es"; } catch { return "es"; }
  });
  useEffect(() => { try { localStorage.setItem("docseal_lang", lang); } catch {} }, [lang]);
  const toggle = () => setLang((l) => (l === "es" ? "en" : "es"));
  return <LangContext.Provider value={{ lang, t: T[lang], toggle }}>{children}</LangContext.Provider>;
}

export function useLang() { return useContext(LangContext); }
