"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LOGO_DATA_URL } from "./logo-data";
import {
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Globe,
} from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";

// ───────────────────────────────
// Negocio
// ───────────────────────────────
const BUSINESS = {
  name: "CMS MEXICAN FOODS, LLC.",
  tagline: "Distribuidores para restaurantes – Harina de maíz, especias y más",
  phone: "(210) 776-9278",
  phone_digits: "12107769278", // para WhatsApp
  email: "cmsmexicanfoods@gmail.com",
  address: "5718 Business Park, San Antonio, TX 78218",
  hours: [
    { d: { es: "Lun–Vie", en: "Mon–Fri" }, h: "05:00–16:00", days: [1, 2, 3, 4, 5] },
    { d: { es: "Sábado", en: "Saturday" }, h: "06:00–13:00", days: [6] },
    { d: { es: "Domingo", en: "Sunday" }, h: "Cerrado / Closed", days: [0] },
  ],
};
const wa = (msg: string) =>
  `https://wa.me/${BUSINESS.phone_digits}?text=${encodeURIComponent(msg)}`;

// ─────────────────────────────────────────────
// CATEGORÍAS Y GRUPOS (orden fijo)
// ─────────────────────────────────────────────
const PRIMARY_CATS = [
  "Tortilla de Maíz",
  "Tortilla de Maseca®",
  "Tortilla cortada para freir",
  "Productos de Harina",
  "Mini tacos",
  "Chips y Shells",
  "Bultos de harina",
] as const;

const SECONDARY_CATS = [
  "Especias",
  "Sazonadores",
  "Caldos",
  "Chilitos",
  "Chile seco",
  "Mole",
  "Más productos",
] as const;

const VIEW_TABS = [
  { key: "all", labelKey: "filters.all" },
  { key: "primary", labelKey: "filters.primary" },
  { key: "secondary", labelKey: "filters.seasonings" },
] as const;

// ───────────────────────────────
// Tipos y datos
// ───────────────────────────────
type Product = {
  code: string;
  group: string;
  name_es: string;
  name_en: string;
  presentation: string;
  description_es: string;
  description_en: string;
  images?: string[];
};

const SAMPLE: Product[] = [
  {
    code: "1108",
    group: "Productos de Harina",
    name_es: 'Tortilla de harina 6" 11ct',
    name_en: 'Flour tortilla 6" 11ct',
    presentation: "Paquete",
    description_es: "Tortilla de harina tamaño 6 pulgadas.",
    description_en: "6-inch flour tortillas.",
    images: [],
  },
  {
    code: "2507",
    group: "Chips y Shells",
    name_es: "Tostada shells 200 ct",
    name_en: "Tostada shells 200 ct",
    presentation: "Caja 200 piezas",
    description_es: "Tostadas listas para servir.",
    description_en: "Ready-to-serve tostada shells.",
    images: [],
  },
  {
    code: "2401/1100",
    group: "Especias",
    name_es: "Ajo granulado",
    name_en: "Granulated garlic",
    presentation: "5 libras",
    description_es: "Ajo granulado calidad foodservice.",
    description_en: "Foodservice-grade granulated garlic.",
    images: [],
  },
];

// ───────────────────────────────
// Hora Texas + abierto/cerrado
// ───────────────────────────────
const TEXAS_TZ = "America/Chicago";
function texasNow() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TEXAS_TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  let wd = "Sun",
    hh = 0,
    mm = 0;
  for (const p of parts) {
    if (p.type === "weekday") wd = p.value;
    if (p.type === "hour") hh = Number(p.value);
    if (p.type === "minute") mm = Number(p.value);
  }
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { dow: map[wd] ?? 0, minutes: hh * 60 + mm };
}
function parseRange(range: string) {
  const c = range.replace(/\s/g, "").replace("–", "-");
  const m = c.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const [, sh, sm, eh, em] = m;
  return { start: +sh * 60 + +sm, end: +eh * 60 + +em };
}
function labelMatchesToday(label?: { es?: string; en?: string }, dow?: number) {
  if (!label) return false;
  const t = (label.es || label.en || "").toLowerCase();
  if (/lun|mon/.test(t)) return dow! >= 1 && dow! <= 5;
  if (/s[áa]b|sat/.test(t)) return dow === 6;
  if (/dom|sun/.test(t)) return dow === 0;
  return false;
}
function isOpenNow(hours: typeof BUSINESS.hours) {
  const { dow, minutes } = texasNow();
  for (const row of hours) {
    const applies = row.days ? row.days.includes(dow) : labelMatchesToday(row.d, dow);
    if (!applies) continue;
    if (/cerrado|closed/i.test(row.h)) continue;
    const r = parseRange(row.h);
    if (r && minutes >= r.start && minutes < r.end) return true;
  }
  return false;
}

// ───────────────────────────────
// Productos (fetch con fallback)
// ───────────────────────────────
function useProducts() {
  const [list, setList] = useState<Product[]>(SAMPLE);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/products.json", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data)) setList(data);
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return { list, loading };
}

// ───────────────────────────────
// Visitas (localStorage) para carrusel
// ───────────────────────────────
type VisitMap = Record<string, number>;
function getVisitMap(): VisitMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("cms_visits");
    return raw ? (JSON.parse(raw) as VisitMap) : {};
  } catch {
    return {};
  }
}
function setVisitMap(m: VisitMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem("cms_visits", JSON.stringify(m));
}
function useVisits() {
  const [visits, setVisits] = useState<VisitMap>({});
  useEffect(() => setVisits(getVisitMap()), []);
  const inc = (code: string) => {
    setVisits((prev) => {
      const next = { ...prev, [code]: (prev[code] || 0) + 1 };
      setVisitMap(next);
      return next;
    });
  };
  return { visits, inc };
}
function topVisitedPrimary(list: Product[], visits: VisitMap, limit = 5) {
  const isPrimary = (g: string) => (PRIMARY_CATS as readonly string[]).includes(g);
  const pool = list.filter((p) => isPrimary(p.group));
  if (!pool.length) return [];
  return [...pool]
    .sort((a, b) => (visits[b.code] || 0) - (visits[a.code] || 0))
    .slice(0, limit);
}

// ───────────────────────────────
// Header
// ───────────────────────────────
function Header({
  lang,
  onToggleLang,
  t,
}: {
  lang: "en" | "es";
  onToggleLang: () => void;
  t: any;
}) {
  return (
    <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        {/* LOGO + texto */}
        <div className="flex items-center gap-3">
          <img
            src={LOGO_DATA_URL}
            alt="CMS Mexican Foods logo"
            style={{ height: 40, width: "auto", objectFit: "contain" }}
          />
          <div>
            <div className="font-bold leading-tight">{BUSINESS.name}</div>
            <div className="text-xs text-slate-500">
              {t?.business?.tagline ?? BUSINESS.tagline}
            </div>
          </div>
        </div>

        {/* MENÚ */}
        <nav className="hidden items-center gap-4 sm:flex">
          <a className="text-sm text-slate-700 hover:underline" href="#products">
            {t?.nav?.products ?? (lang === "es" ? "Productos" : "Products")}
          </a>
          <a className="text-sm text-slate-700 hover:underline" href="#ubicacion">
            {t?.nav?.location ?? (lang === "es" ? "Ubicación" : "Location")}
          </a>
          <a className="text-sm text-slate-700 hover:underline" href="#about">
            {t?.nav?.about ?? (lang === "es" ? "Sobre nosotros" : "About us")}
          </a>

          {/* BOTÓN DE IDIOMA FORMATO BONITO */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <Globe size={16} className="text-teal-500" />
            <span className={lang === "es" ? "text-teal-400" : "text-slate-400"}>ES</span>
            <span className="text-slate-400">/</span>
            <span className={lang === "en" ? "text-teal-400" : "text-slate-400"}>EN</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

// ───────────────────────────────
// Carrusel (igual)
// ───────────────────────────────
function Carousel({
  items,
  onOpen,
  lang,
}: {
  items: Product[];
  onOpen: (code: string) => void;
  lang: "en" | "es";
}) {
  const slides = items.slice(0, 5);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const id = setInterval(() => setI((v) => (v + 1) % slides.length), 4000);
    return () => clearInterval(id);
  }, [paused, slides.length]);

  if (!slides.length) return null;
  const s = slides[i];

  return (
    <div
      className="relative overflow-hidden rounded-2xl border shadow-lg"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <img
        src={s.images?.[0] || "/images/placeholder.jpg"}
        alt={lang === "es" ? s.name_es : s.name_en}
        className="h-80 w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      <div className="absolute bottom-4 left-4 right-4 text-white">
        <div className="text-xl font-extrabold">{lang === "es" ? s.name_es : s.name_en}</div>
        <p className="text-sm opacity-90">
          {lang === "es" ? s.description_es : s.description_en}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={() => onOpen(s.code)}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {lang === "es" ? "Ver ficha" : "View product"}
          </button>
          <a
            href={wa(
              lang === "es"
                ? `Hola, quiero pedir ${s.name_es} (Código ${s.code})`
                : `Hi, I'm interested in ${s.name_en} (code ${s.code})`
            )}
            className="rounded-md border border-white/70 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10"
          >
            WhatsApp
          </a>
        </div>
      </div>
      <button
        aria-label="Prev"
        onClick={() => setI((i - 1 + slides.length) % slides.length)}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        aria-label="Next"
        onClick={() => setI((i + 1) % slides.length)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

// ───────────────────────────────
// Fila horizontal
// ───────────────────────────────
function RowScroller({
  title,
  products,
  onOpen,
  onVisit,
  lang,
}: {
  title: string;
  products: Product[];
  onOpen: (code: string) => void;
  onVisit: (code: string) => void;
  lang: "en" | "es";
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const scrollBy = (dx: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dx, behavior: "smooth" });
  };
  if (!products.length) return null;

  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-base font-bold sm:text-lg">{title}</h4>
        <div className="hidden gap-2 sm:flex">
          <button
            aria-label="prev"
            onClick={() => scrollBy(-400)}
            className="rounded-full border p-1"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            aria-label="next"
            onClick={() => scrollBy(400)}
            className="rounded-full border p-1"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={ref}
          className="flex gap-4 overflow-x-auto scroll-smooth pb-2"
          style={{ scrollSnapType: "x proximity" }}
        >
          {products.map((p) => (
            <div
              key={p.code}
              className="min-w-[240px] max-w-[260px] flex-shrink-0 scroll-snap-align-start overflow-hidden rounded-xl border bg-white"
            >
              <div className="aspect-[4/3] w-full bg-slate-50">
                <img
                  src={p.images?.[0] || "/images/placeholder.jpg"}
                  alt={lang === "es" ? p.name_es : p.name_en}
                  className="h-full w-full object-cover"
                  onClick={() => {
                    onVisit(p.code);
                    onOpen(p.code);
                  }}
                />
              </div>
              <div className="p-3">
                <div className="font-semibold">{lang === "es" ? p.name_es : p.name_en}</div>
                <div className="text-xs text-slate-500">{p.presentation}</div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                  {lang === "es" ? p.description_es : p.description_en}{" "}
                  <span className="text-[11px] text-slate-400">· {p.code}</span>
                </p>
              </div>
              <div className="border-t p-3">
                <a
                  onClick={() => onVisit(p.code)}
                  href={wa(
                    lang === "es"
                      ? `Hola, quiero pedir ${p.name_es} (Código ${p.code})`
                      : `Hi, I'm interested in ${p.name_en} (code ${p.code})`
                  )}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  <MessageCircle size={16} />{" "}
                  {lang === "es" ? "Hacer pedido" : "Order via WhatsApp"}
                </a>
              </div>
            </div>
          ))}
        </div>

        <button
          aria-label="prev"
          onClick={() => scrollBy(-400)}
          className="absolute left-1 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-1 shadow sm:block"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          aria-label="next"
          onClick={() => scrollBy(400)}
          className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-1 shadow sm:block"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────────
// Grid de productos
// ───────────────────────────────
function ProductsGrid({
  data,
  onOpen,
  onVisit,
  lang,
  t,
}: {
  data: Product[];
  onOpen: (code: string) => void;
  onVisit: (code: string) => void;
  lang: "en" | "es";
  t: any;
}) {
  const byCat = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of data) {
      if (!map.has(p.group)) map.set(p.group, []);
      map.get(p.group)!.push(p);
    }
    for (const [k, arr] of map) {
      arr.sort((a, b) => a.name_es.localeCompare(b.name_es, "es"));
      map.set(k, arr);
    }
    return map;
  }, [data]);

  const [q, setQ] = useState("");
  const filteredByCat = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return byCat;
    const map = new Map<string, Product[]>();
    for (const [cat, arr] of byCat) {
      const hit = arr.filter((p) =>
        (p.name_es + p.name_en + p.description_es + p.presentation + p.code)
          .toLowerCase()
          .includes(query)
      );
      if (hit.length) map.set(cat, hit);
    }
    return map;
  }, [byCat, q]);

  const [tab, setTab] = useState<(typeof VIEW_TABS)[number]["key"]>("all");
  const rowsPrimary = PRIMARY_CATS.map((cat) => ({
    title: cat,
    items: filteredByCat.get(cat) || [],
  })).filter((r) => r.items.length);
  const rowsSecondary = SECONDARY_CATS.map((cat) => ({
    title: cat,
    items: filteredByCat.get(cat) || [],
  })).filter((r) => r.items.length);

  const showPrimary = tab === "all" || tab === "primary";
  const showSecondary = tab === "all" || tab === "secondary";

  return (
    <section id="products" className="py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-extrabold">
            {t?.product_groups?.title ?? (lang === "es" ? "Nuestros productos" : "Our products")}
          </h2>
          <div className="flex items-center gap-2">
            <Search size={16} className="text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={lang === "es" ? "Buscar productos..." : "Search products..."}
              className="w-64 rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {VIEW_TABS.map((tbtn) => (
            <button
              key={tbtn.key}
              onClick={() => setTab(tbtn.key)}
              className={`rounded-full border px-3 py-1 text-sm ${
                tab === tbtn.key ? "border-emerald-600 bg-emerald-50 text-emerald-700" : ""
              }`}
            >
              {t?.filters?.[tbtn.key] ??
                (tbtn.key === "all"
                  ? lang === "es"
                    ? "Todas"
                    : "All"
                  : tbtn.key === "primary"
                  ? lang === "es"
                    ? "Productos principales"
                    : "Main products"
                  : lang === "es"
                  ? "Especias, sazonadores y más"
                  : "Spices, seasonings & more")}
            </button>
          ))}
        </div>

        {showPrimary && rowsPrimary.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-3 text-xl font-extrabold">
              {t?.product_groups?.primary_title ??
                (lang === "es" ? "Nuestros productos principales" : "Main product line")}
            </h3>
            {rowsPrimary.map((row) => (
              <RowScroller
                key={row.title}
                title={row.title}
                products={row.items}
                onOpen={onOpen}
                onVisit={onVisit}
                lang={lang}
              />
            ))}
          </div>
        )}

        {showSecondary && rowsSecondary.length > 0 && (
          <div>
            <h3 className="mb-3 text-xl font-extrabold">
              {t?.product_groups?.sec_title ??
                (lang === "es" ? "Especias, sazonadores y más" : "Spices, seasonings & more")}
            </h3>
            {rowsSecondary.map((row) => (
              <RowScroller
                key={row.title}
                title={row.title}
                products={row.items}
                onOpen={onOpen}
                onVisit={onVisit}
                lang={lang}
              />
            ))}
          </div>
        )}

        {!rowsPrimary.length && !rowsSecondary.length && (
          <p className="text-sm text-slate-500">
            {lang === "es" ? "No encontramos productos con ese criterio." : "No products found."}
          </p>
        )}
      </div>
    </section>
  );
}

// ───────────────────────────────
// Ubicación
// ───────────────────────────────
function Location({ lang, t }: { lang: "en" | "es"; t: any }) {
  const open = isOpenNow(BUSINESS.hours);
  return (
    <section id="ubicacion" className="bg-slate-50 py-12">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h2 className="text-2xl font-extrabold">
              {t?.location?.title ?? (lang === "es" ? "Ubicación" : "Location")}
            </h2>
            <span
              className={`inline-block rounded-full border px-2 py-0.5 text-xs ${
                open ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              }`}
            >
              {open
                ? t?.location?.hour_open ?? (lang === "es" ? "Abierto" : "Open")
                : t?.location?.hour_closed ?? (lang === "es" ? "Fuera de horario" : "Closed")}
            </span>
          </div>
          <p className="text-slate-600">{t?.business?.address ?? BUSINESS.address}</p>
          <div className="mt-3 overflow-hidden rounded-xl border">
            <iframe
              title="map"
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                BUSINESS.address
              )}&output=embed`}
              className="aspect-video w-full"
            />
          </div>

          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            {BUSINESS.hours.map((h, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="inline-block w-24 font-semibold">
                  {lang === "es" ? h.d?.es : h.d?.en}
                </span>{" "}
                {h.h}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-slate-500">
            {t?.location?.map_hint ??
              (lang === "es"
                ? "Puedes visitarnos o llamarnos para coordinar tu pedido."
                : "You can visit us or call us to coordinate your order.")}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <h3 className="mb-2 text-lg font-bold">
            {t?.contact?.title ?? (lang === "es" ? "Contáctanos" : "Contact us")}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Phone size={16} />{" "}
              <a href={`tel:${BUSINESS.phone}`} className="text-slate-800">
                {BUSINESS.phone}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={16} />{" "}
              <a href={`mailto:${BUSINESS.email}`} className="text-slate-800">
                {BUSINESS.email}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} /> {BUSINESS.address}
            </div>
          </div>
          <a
            href={wa(lang === "es" ? "Hola, me interesa hacer un pedido" : "Hi, I want to place an order")}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <MessageCircle size={16} />{" "}
            {t?.contact?.whatsapp ?? (lang === "es" ? "WhatsApp" : "WhatsApp")}
          </a>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────
// Página principal
// ───────────────────────────────
export default function Home() {
  const [lang, setLang] = useState<"en" | "es">("en");
  const t = useTranslation(lang);
  const { list, loading } = useProducts();
  const { visits, inc } = useVisits();

  const featured = useMemo(() => {
    const top = topVisitedPrimary(list, visits, 5);
    if (top.length) return top;
    for (const cat of PRIMARY_CATS) {
      const items = list.filter((p) => p.group === cat);
      if (items.length) return items.slice(0, 5);
    }
    return list.slice(0, 5);
  }, [list, visits]);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Header lang={lang} onToggleLang={() => setLang(lang === "es" ? "en" : "es")} t={t} />

      {/* Hero + carrusel */}
      <section className="bg-gradient-to-b from-emerald-50 to-white py-10">
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 sm:grid-cols-2">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight">
              {t?.hero?.title ?? (lang === "es" ? "Catálogo de productos (sin precios)" : "Product catalog (no prices)")}
            </h1>
            <p className="mt-2 text-slate-600">
              {t?.hero?.subtitle ??
                (lang === "es"
                  ? "Somos distribuidores para restaurantes y servicios de alimentos en Texas. Explora y contáctanos para tu pedido."
                  : "We are foodservice distributors in Texas. Browse and contact us to place your order.")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="#products"
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                {t?.hero?.btn_products ?? (lang === "es" ? "Ver productos" : "View products")}
              </a>
              <a
                href="#ubicacion"
                className="rounded-md border px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                {t?.hero?.btn_location ?? (lang === "es" ? "Ubicación" : "Location")}
              </a>
            </div>
          </div>

          <div>
            {featured.length > 0 ? (
              <Carousel
                items={featured}
                lang={lang}
                onOpen={(code) => {
                  inc(code);
                }}
              />
            ) : (
              <div className="rounded-2xl border p-6 text-slate-500">
                {t?.carousel?.empty ??
                  (lang === "es"
                    ? "Agrega productos al primer grupo para ver el carrusel."
                    : "Add products to the main group to show the carousel.")}
              </div>
            )}
          </div>
        </div>
      </section>

      {loading ? (
        <p className="mx-auto max-w-6xl px-4 py-6 text-slate-600">
          {lang === "es" ? "Cargando productos…" : "Loading products…"}
        </p>
      ) : (
        <ProductsGrid data={list} onOpen={inc} onVisit={inc} lang={lang} t={t} />
      )}

      <Location lang={lang} t={t} />

      {/* Sobre nosotros */}
      <section id="about" className="py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-4 text-2xl font-extrabold">
            {t?.about?.title ?? (lang === "es" ? "Sobre nosotros" : "About us")}
          </h2>

          <p className="mb-4 text-slate-600">{t?.about?.p1}</p>
          <p className="mb-4 text-slate-600">{t?.about?.p2}</p>
          <p className="mb-2 font-semibold text-slate-700">{t?.about?.p3}</p>
          <ul className="mb-4 list-disc pl-6 text-slate-600">
            <li>{t?.about?.list1}</li>
            <li>{t?.about?.list2}</li>
            <li>{t?.about?.list3}</li>
          </ul>
          <p className="text-slate-600">{t?.about?.closing}</p>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2">
          <div>
            <div className="font-bold">{t?.business?.name ?? BUSINESS.name}</div>
            <div className="text-sm text-slate-500">
              {t?.business?.tagline ?? BUSINESS.tagline}
            </div>
          </div>
          <div className="text-sm text-slate-500">
            {(t?.footer?.rights || "").replace("{{year}}", String(new Date().getFullYear())) ||
              `© ${new Date().getFullYear()} ${BUSINESS.name}. ${
                lang === "es" ? "Todos los derechos reservados." : "All rights reserved."
              }`}
          </div>
        </div>
      </footer>
    </main>
  );
}
