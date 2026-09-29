"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  CircleCheck,
  CloudUpload,
  Copy,
  FileText,
  Inbox,
  Link2,
  Lock,
  Mail,
  MousePointer2,
  Pause,
  Play,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/brand/logo";

// =============================================================================
// Film produit (motion design codé) : le service Docalio de bout en bout, en
// ~26 s, côté cabinet (ordinateur) et côté client (téléphone).
//
// Tout l'état visuel est une fonction PURE du temps `t` : une seule horloge,
// des segments interpolés et adoucis. Résultat : un mouvement parfaitement
// synchronisé, reproductible, qu'on peut mettre en pause ou rembobiner par
// chapitre. Scène dessinée en 1280×720 puis mise à l'échelle (net partout).
// =============================================================================

const W = 1280;
const H = 720;
const DURATION = 26;

const CHAPTERS = [
  { at: 0, end: 7, title: "Créez l'espace de votre client", sub: "Son nom, les pièces à demander : le lien sécurisé est prêt." },
  { at: 7, end: 11, title: "Envoyez-lui le lien", sub: "Un e-mail pré-rédigé, en un clic. Aucun compte à créer." },
  { at: 11, end: 17, title: "Il dépose ses pièces", sub: "Depuis son téléphone, par simple glisser-déposer." },
  { at: 17, end: 22, title: "Vous validez, il est prévenu", sub: "Notification, validation, progression : tout est tracé." },
  { at: 22, end: DURATION, title: "Sans une seule relance", sub: "Docalio — le portail client des cabinets et agences." },
];

// --- Outils d'animation -------------------------------------------------------
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
/** Progression adoucie 0→1 entre les instants a et b. */
const seg = (t: number, a: number, b: number, ease = easeInOut) => ease(clamp((t - a) / (b - a)));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
/** Apparition puis disparition (0 → 1 → 0). */
const window1 = (t: number, a: number, b: number, fade = 0.35) =>
  Math.min(seg(t, a, a + fade, easeOut), 1 - seg(t, b - fade, b));

// Trajectoire du curseur (coordonnées de scène) ; `click` = instant d'appui.
const CURSOR: { t: number; x: number; y: number; click?: boolean }[] = [
  { t: 0, x: 520, y: 470 },
  { t: 0.9, x: 712, y: 131 },
  { t: 1.05, x: 712, y: 131, click: true },
  { t: 1.6, x: 470, y: 262 },
  { t: 4.6, x: 470, y: 262 },
  { t: 5.25, x: 600, y: 462 },
  { t: 5.35, x: 600, y: 462, click: true },
  { t: 6.5, x: 520, y: 520 },
  { t: 7.2, x: 520, y: 520 },
  { t: 7.9, x: 707, y: 244 },
  { t: 8.0, x: 707, y: 244, click: true },
  { t: 9.5, x: 560, y: 520 },
  { t: 17.9, x: 560, y: 520 },
  { t: 18.7, x: 652, y: 360 },
  { t: 18.85, x: 652, y: 360, click: true },
  { t: 20, x: 600, y: 520 },
  { t: DURATION, x: 600, y: 520 },
];

function cursorAt(t: number) {
  let i = 0;
  while (i < CURSOR.length - 2 && CURSOR[i + 1].t <= t) i++;
  const a = CURSOR[i];
  const b = CURSOR[i + 1];
  const p = easeInOut(clamp((t - a.t) / Math.max(0.001, b.t - a.t)));
  const press = CURSOR.some((k) => k.click && t >= k.t && t < k.t + 0.18);
  return { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), press };
}

const PIECES = ["Relevés bancaires", "Factures d'achat", "Pièce d'identité"];

export function ProductFilm() {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [scale, setScale] = useState(1);
  const frame = useRef<HTMLDivElement>(null);
  const visible = useRef(false);
  const last = useRef<number | null>(null);
  const firstFrame = useRef(true);

  // Mise à l'échelle de la scène 1280×720 à la largeur disponible.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / W));
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  // Horloge : avance seulement si lecture + film visible à l'écran.
  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      if (firstFrame.current) {
        firstFrame.current = false;
        // Préférence « réduire les animations » : image fixe, parcours au clic.
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setPlaying(false);
          setT(20.5);
          return;
        }
      }
      if (last.current !== null && playing && visible.current) {
        const dt = Math.min(0.1, (now - last.current) / 1000);
        setT((x) => (x + dt) % DURATION);
      }
      last.current = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      last.current = null;
    };
  }, [playing]);

  const chapter = CHAPTERS.findIndex((c) => t >= c.at && t < c.end);
  const cur = cursorAt(t);

  // ---------------------------------------------------------------- Scène 1
  const dialog = window1(t, 1.15, 5.7);
  const typed = "SARL Martin".slice(0, Math.floor(seg(t, 1.7, 3.0, (x) => x) * 11));
  const chipsOn = PIECES.map((_, i) => t > 3.3 + i * 0.35);
  const spaceView = seg(t, 5.55, 6.1, easeOut); // vue de l'espace créé
  const linkReveal = seg(t, 5.9, 6.6, easeOut);

  // ---------------------------------------------------------------- Scène 2
  const fly = seg(t, 8.05, 9.6);
  const mailX = lerp(707, 1070, fly);
  const mailY = lerp(244, 190, fly) - Math.sin(fly * Math.PI) * 150;
  const mailOn = t > 8.05 && t < 9.7;
  const phoneNotif = window1(t, 9.55, 11.1);

  // ---------------------------------------------------------------- Scène 3
  const portal = seg(t, 11, 11.6, easeOut);
  const drops = [
    { start: 12, land: 13.4, up: [13.4, 14.4] as const },
    { start: 14.6, land: 15.9, up: [15.9, 16.8] as const },
  ];

  // ---------------------------------------------------------------- Scène 4
  const toast = window1(t, 17.05, 21.4);
  const validated0 = t > 18.9;
  const done = validated0 ? 1 : 0;
  const barPct = lerp(0, 1 / 3, seg(t, 18.9, 19.6)) * 100;

  function laptopStatus(i: number): { label: string; tone: string } {
    if (i === 0 && validated0) return { label: "Validée", tone: "bg-emerald-50 text-emerald-700" };
    if ((i === 0 && t > 14.6) || (i === 1 && t > 17.0)) return { label: "À vérifier", tone: "bg-violet-50 text-violet-700" };
    return { label: "En attente", tone: "bg-slate-100 text-slate-500" };
  }

  // ---------------------------------------------------------------- Fin
  const endCard = seg(t, 22.1, 22.9, easeOut) * (1 - seg(t, 25.5, 26));

  function seek(i: number) {
    setT(CHAPTERS[i].at + 0.01);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div
        ref={frame}
        className="relative w-full overflow-hidden rounded-[28px] border border-border bg-[#f4f6fb] shadow-[0_50px_120px_-50px_rgba(15,23,42,0.55)] ring-1 ring-black/5"
        style={{ height: H * scale }}
        role="img"
        aria-label="Animation : un cabinet crée l'espace d'un client, lui envoie le lien, le client dépose ses pièces depuis son téléphone et le cabinet les valide."
      >
        <div
          className="absolute left-0 top-0 origin-top-left select-none"
          style={{ width: W, height: H, transform: `scale(${scale})` }}
        >
          {/* Décor : halos doux */}
          <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(59,130,246,0.22),transparent)]" />
          <div className="absolute -bottom-52 right-0 h-[560px] w-[560px] rounded-full bg-[radial-gradient(closest-side,rgba(139,92,246,0.14),transparent)]" />

          {/* ============================ ORDINATEUR (cabinet) */}
          <div className="absolute left-[56px] top-[60px] h-[500px] w-[780px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.45)]">
            {/* Barre de fenêtre */}
            <div className="flex h-9 items-center gap-2 border-b border-slate-100 bg-slate-50 px-4">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              <span className="ml-4 flex h-6 flex-1 items-center gap-1.5 rounded-md bg-white px-3 text-[11px] text-slate-400 ring-1 ring-slate-200">
                <Lock className="h-3 w-3" /> docalio.app/dashboard
              </span>
            </div>
            {/* Barre de l'app */}
            <div className="flex h-12 items-center gap-3 border-b border-slate-100 px-5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1c2a4e] text-[9px] font-bold text-white">SR</span>
              <span className="text-[13px] font-semibold text-slate-900">Studio Roy</span>
              <span className="ml-3 rounded-md bg-slate-100 px-2.5 py-1 text-[12px] font-medium text-slate-900">Espaces clients</span>
              <span className="text-[12px] text-slate-400">Réglages</span>
              <span className="ml-auto flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[12px] font-medium text-white" style={{ transform: `scale(${cur.press && t < 2 ? 0.95 : 1})` }}>
                <Plus className="h-3.5 w-3.5" /> Nouveau client
              </span>
            </div>

            {/* Liste des espaces (avant création) */}
            <div className="absolute inset-x-0 top-[84px] bottom-0 bg-[#f6f8fc] p-6" style={{ opacity: 1 - spaceView }}>
              <p className="text-[18px] font-semibold text-slate-900">Vos espaces clients</p>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {[
                  { n: "Cabinet Lenoir", c: "#1e3a8a", s: "2 à vérifier" },
                  { n: "Boulangerie Margot", c: "#d97706", s: "Complet" },
                  { n: "Restaurant Nord", c: "#0f766e", s: "1 attendue" },
                ].map((r) => (
                  <div key={r.n} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
                    <span className="h-8 w-8 rounded-lg" style={{ backgroundColor: r.c }} />
                    <span className="flex-1 text-[13px] font-medium text-slate-800">{r.n}</span>
                    <span className="h-1.5 w-24 rounded-full bg-slate-100"><span className="block h-full w-2/3 rounded-full bg-blue-500" /></span>
                    <span className="w-20 text-right text-[11px] text-slate-500">{r.s}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Espace créé : SARL Martin */}
            <div
              className="absolute inset-x-0 top-[84px] bottom-0 bg-[#f6f8fc] p-6"
              style={{ opacity: spaceView, transform: `translateY(${(1 - spaceView) * 14}px)` }}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-[13px] font-semibold text-white">SM</span>
                <div>
                  <p className="text-[18px] font-semibold leading-tight text-slate-900">SARL Martin</p>
                  <p className="text-[11px] text-slate-500">contact@sarl-martin.fr</p>
                </div>
              </div>
              {/* Carte du lien */}
              <div
                className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3"
                style={{ opacity: linkReveal, transform: `scale(${0.97 + linkReveal * 0.03})` }}
              >
                <span className="flex h-8 flex-1 items-center gap-2 rounded-lg bg-slate-50 px-3 text-[12px] font-medium text-slate-800">
                  <Link2 className="h-3.5 w-3.5 text-blue-600" /> docalio.app/p/k3Jd9s
                </span>
                <span className="flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[11px] font-medium text-white">
                  <Copy className="h-3 w-3" /> Copier
                </span>
                <span
                  className={cn("flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-medium transition-colors", t > 8 && t < 9 ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700")}
                  style={{ transform: `scale(${cur.press && t > 7.9 && t < 8.3 ? 0.94 : 1})` }}
                >
                  <Mail className="h-3 w-3" /> {t > 8.1 ? "Envoyé ✓" : "Envoyer"}
                </span>
              </div>
              {/* À recevoir */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4" style={{ opacity: linkReveal }}>
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-slate-900">À recevoir</p>
                  <p className="text-[11px] text-slate-500 tabular-nums">{done}/3 validée{done > 1 ? "s" : ""}</p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${barPct}%` }} />
                </div>
                <div className="mt-3 divide-y divide-slate-100">
                  {PIECES.map((p, i) => {
                    const st = laptopStatus(i);
                    const showValidate = i === 0 && t > 17.2 && !validated0;
                    return (
                      <div key={p} className="flex items-center gap-3 py-2.5">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span className="flex-1 text-[12px] font-medium text-slate-800">{p}</span>
                        {showValidate ? (
                          <span
                            className="flex h-7 items-center gap-1 rounded-md bg-emerald-600 px-2.5 text-[11px] font-medium text-white"
                            style={{ transform: `scale(${cur.press && t > 18.8 ? 0.93 : 1})` }}
                          >
                            <Check className="h-3 w-3" /> Valider
                          </span>
                        ) : (
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", st.tone)}>{st.label}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Fenêtre « Nouveau client » */}
            {dialog > 0 && (
              <div className="absolute inset-0 top-9 flex items-start justify-center bg-slate-900/25 pt-10" style={{ opacity: dialog }}>
                <div
                  className="w-[420px] rounded-2xl bg-white p-6 shadow-2xl"
                  style={{ transform: `translateY(${(1 - dialog) * 16}px) scale(${0.97 + dialog * 0.03})` }}
                >
                  <p className="text-[16px] font-semibold text-slate-900">Nouveau client</p>
                  <p className="mt-1 text-[11px] text-slate-500">Son espace et son lien sécurisé sont créés en un clic.</p>
                  <p className="mt-4 text-[11px] font-medium text-slate-700">Nom du client</p>
                  <div className="mt-1 flex h-10 items-center rounded-lg border-2 border-blue-500/60 px-3 text-[14px] text-slate-900">
                    {typed}
                    <span className="ml-px inline-block h-4 w-px animate-pulse bg-slate-900" />
                  </div>
                  <p className="mt-4 text-[11px] font-medium text-slate-700">Pièces à lui demander</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {PIECES.map((p, i) => (
                      <span
                        key={p}
                        className={cn(
                          "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-all duration-300",
                          chipsOn[i] ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-400"
                        )}
                      >
                        {chipsOn[i] && <Check className="h-3 w-3" />} {p}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 flex justify-end">
                    <span
                      className="rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-medium text-white"
                      style={{ transform: `scale(${cur.press && t > 5.2 ? 0.95 : 1})` }}
                    >
                      Créer et obtenir le lien →
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Toast « Pièce reçue » */}
            <div
              className="absolute right-4 top-[96px] flex w-[270px] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
              style={{ opacity: toast, transform: `translateX(${(1 - toast) * 40}px)` }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <Inbox className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[12px] font-semibold text-slate-900">Pièce reçue</p>
                <p className="text-[11px] text-slate-500">SARL Martin · Relevés bancaires</p>
              </div>
            </div>
          </div>

          {/* ============================ TÉLÉPHONE (client) */}
          <div className="absolute left-[930px] top-[46px] h-[590px] w-[290px] rounded-[44px] bg-slate-900 p-[10px] shadow-[0_40px_80px_-30px_rgba(15,23,42,0.7)]">
            <div className="relative h-full w-full overflow-hidden rounded-[36px] bg-white">
              <div className="absolute left-1/2 top-2 z-30 h-6 w-24 -translate-x-1/2 rounded-full bg-slate-900" />
              {/* Écran d'accueil */}
              <div className="absolute inset-0 bg-[linear-gradient(160deg,#1e3a8a,#6d28d9_60%,#db2777)]" style={{ opacity: 1 - portal }}>
                <p className="mt-20 text-center text-[52px] font-light text-white/95">09:41</p>
                <p className="text-center text-[12px] text-white/70">mardi 29 septembre</p>
              </div>
              {/* Notification e-mail */}
              <div
                className="absolute inset-x-3 top-12 z-20 rounded-2xl bg-white/95 p-3 shadow-xl backdrop-blur"
                style={{ opacity: phoneNotif, transform: `translateY(${(1 - phoneNotif) * -30}px)` }}
              >
                <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  <Mail className="h-3 w-3" /> Mail · maintenant
                </p>
                <p className="mt-1 text-[12px] font-semibold text-slate-900">Studio Roy</p>
                <p className="text-[11px] leading-snug text-slate-600">Votre espace documentaire — déposez vos pièces ici.</p>
              </div>
              {/* Portail client */}
              <div className="absolute inset-0 bg-[#f6f8fc]" style={{ opacity: portal, transform: `translateY(${(1 - portal) * 24}px)` }}>
                <div className="h-1 bg-[#1c2a4e]" />
                <div className="flex items-center gap-2 bg-white px-4 pb-3 pt-9">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1c2a4e] text-[9px] font-bold text-white">SR</span>
                  <span className="text-[12px] font-semibold text-slate-900">Studio Roy</span>
                  <Lock className="ml-auto h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div className="px-4 pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#1c2a4e]">Votre espace privé</p>
                  <p className="text-[17px] font-semibold text-slate-900">Bonjour SARL Martin</p>
                  <p className="mt-3 text-[11px] font-semibold text-slate-700">Pièces à fournir</p>
                  <div className="mt-2 space-y-2">
                    {PIECES.map((p, i) => {
                      const d = drops[i];
                      const uploading = d && t >= d.up[0] && t < d.up[1];
                      const received = d && t >= d.up[1];
                      const validated = i === 0 && t > 19.9;
                      const pct = d ? seg(t, d.up[0], d.up[1], (x) => x) * 100 : 0;
                      const target = d && t > d.start && t < d.land + 0.1;
                      return (
                        <div
                          key={p}
                          className={cn(
                            "rounded-xl border bg-white p-2.5 transition-colors",
                            target ? "border-dashed border-blue-400 bg-blue-50/60" : "border-slate-200"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-[11px] font-medium text-slate-800">{p}</span>
                            {validated ? (
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600"><CircleCheck className="h-3 w-3" /> Validé</span>
                            ) : received ? (
                              <span className="text-[10px] font-medium text-slate-500">Reçu ✓</span>
                            ) : (
                              <span className="flex items-center gap-1 rounded-md bg-[#1c2a4e] px-2 py-1 text-[9px] font-medium text-white">
                                <CloudUpload className="h-3 w-3" /> Déposer
                              </span>
                            )}
                          </div>
                          {uploading && (
                            <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              {/* Fichiers glissés par le client */}
              {drops.map((d, i) => {
                const p = seg(t, d.start, d.land);
                if (t < d.start || t > d.land + 0.15) return null;
                const y0 = 540;
                const y1 = 212 + i * 50;
                return (
                  <div
                    key={i}
                    className="absolute z-20 flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 text-[10px] font-medium text-slate-700 shadow-lg ring-1 ring-slate-200"
                    style={{
                      left: lerp(150, 120, p),
                      top: lerp(y0, y1, p),
                      opacity: 1 - seg(t, d.land, d.land + 0.15),
                      transform: `rotate(${(1 - p) * -8}deg) scale(${1 - p * 0.1})`,
                    }}
                  >
                    <FileText className="h-3.5 w-3.5 text-red-500" />
                    {i === 0 ? "releves-aout.pdf" : "factures.zip"}
                  </div>
                );
              })}
            </div>
          </div>

          {/* E-mail en vol : de l'ordinateur au téléphone */}
          {mailOn && (
            <div
              className="absolute z-30 flex h-12 w-16 items-center justify-center rounded-lg bg-blue-600 text-white shadow-[0_18px_40px_-10px_rgba(37,99,235,0.8)]"
              style={{ left: mailX - 32, top: mailY - 24, transform: `rotate(${lerp(-10, 12, fly)}deg) scale(${1 - fly * 0.35})` }}
            >
              <Mail className="h-6 w-6" />
            </div>
          )}

          {/* Curseur */}
          {t < 21 && (
            <div className="absolute z-40" style={{ left: cur.x, top: cur.y, transition: "none" }}>
              {cur.press && <span className="absolute -left-4 -top-4 h-8 w-8 animate-ping rounded-full bg-blue-400/40" />}
              <MousePointer2
                className="h-6 w-6 fill-slate-900 text-white drop-shadow-md"
                style={{ transform: `scale(${cur.press ? 0.85 : 1})` }}
              />
            </div>
          )}

          {/* Légende du chapitre */}
          {chapter >= 0 && chapter < 4 && (
            <div key={chapter} className="animate-fade-up absolute bottom-[34px] left-[56px] flex items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-[16px] font-semibold text-white">
                {chapter + 1}
              </span>
              <div>
                <p className="text-[22px] font-semibold tracking-tight text-slate-900">{CHAPTERS[chapter].title}</p>
                <p className="text-[14px] text-slate-500">{CHAPTERS[chapter].sub}</p>
              </div>
            </div>
          )}

          {/* Carte de fin */}
          {endCard > 0 && (
            <div
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[radial-gradient(60%_60%_at_50%_40%,#1d4ed8,#0b1224)] text-center"
              style={{ opacity: endCard }}
            >
              <div className="flex items-center gap-3" style={{ transform: `translateY(${(1 - endCard) * 16}px)` }}>
                <LogoMark className="h-12 w-12" />
                <span className="text-[28px] font-semibold text-white">Docalio</span>
              </div>
              <p className="mt-8 text-[46px] font-semibold leading-tight tracking-tight text-white">
                Vos clients déposent leurs pièces.
              </p>
              <p className="text-[46px] font-semibold leading-tight tracking-tight text-blue-300">Sans relance.</p>
              <div className="mt-10 flex gap-10 text-white/80">
                {["Aucun compte pour vos clients", "Hébergé dans l'UE", "Prêt en 5 minutes"].map((x) => (
                  <span key={x} className="flex items-center gap-2 text-[15px]">
                    <CircleCheck className="h-4 w-4 text-blue-300" />
                    {x}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contrôles : lecture + chapitres */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Mettre en pause" : "Lire"}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
        </button>
        <div className="flex flex-1 gap-1.5">
          {CHAPTERS.slice(0, 4).map((c, i) => {
            const p = clamp((t - c.at) / (c.end - c.at));
            return (
              <button
                key={c.title}
                type="button"
                onClick={() => seek(i)}
                className="group min-w-0 flex-1 text-left"
                aria-label={`Chapitre ${i + 1} : ${c.title}`}
              >
                <span className="block h-1 overflow-hidden rounded-full bg-border">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${p * 100}%` }} />
                </span>
                <span
                  className={cn(
                    "mt-1.5 hidden truncate text-xs sm:block",
                    i === chapter ? "font-medium text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {i + 1}. {c.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
