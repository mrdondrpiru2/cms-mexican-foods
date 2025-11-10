"use client";
import { useEffect, useState } from "react";

export function useTranslation(lang: "en" | "es") {
  const [t, setT] = useState<any>({});

  useEffect(() => {
    fetch(`/locales/${lang}.json`)
      .then((res) => res.json())
      .then((data) => setT(data))
      .catch(() => setT({}));
  }, [lang]);

  return t;
}
