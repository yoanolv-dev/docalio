import Image from "next/image";
import { CircleCheck, Eye, Inbox } from "lucide-react";
import { Tilt } from "@/components/marketing/scroll-fx";

const LIVE = [
  {
    icon: Inbox,
    tone: "bg-violet-50 text-violet-600",
    title: "Pièce reçue",
    text: "Relevés bancaires · SARL Martin",
    time: "à l'instant",
    pos: "left-[-4%] top-[18%] sm:left-[-7%]",
    delay: "300ms",
  },
  {
    icon: CircleCheck,
    tone: "bg-emerald-50 text-emerald-600",
    title: "Document approuvé",
    text: "Bilan 2025 · Cabinet Lenoir",
    time: "il y a 2 min",
    pos: "right-[-3%] top-[46%] sm:right-[-6%]",
    delay: "700ms",
  },
  {
    icon: Eye,
    tone: "bg-sky-50 text-sky-600",
    title: "Portail ouvert",
    text: "Boulangerie Margot",
    time: "il y a 5 min",
    pos: "bottom-[8%] left-[6%]",
    delay: "1100ms",
  },
];

export function HeroVisual() {
  return (
    <div className="relative isolate mx-auto max-w-5xl">
      <div
        aria-hidden
        className="absolute inset-x-10 -bottom-10 top-10 -z-10 rounded-[3rem] bg-[radial-gradient(50%_50%_at_50%_50%,rgba(37,99,235,0.35),transparent)] blur-3xl"
      />
      <div className="relative z-0 [perspective:1800px]">
      <Tilt max={5}>
        <div className="overflow-hidden rounded-2xl border border-white/60 bg-card shadow-[0_50px_120px_-40px_rgba(15,23,42,0.55)] ring-1 ring-black/5">
          <Image
            src="/product/collecte.png"
            alt="Docalio : pièces demandées à un client et activité en temps réel"
            width={2360}
            height={1800}
            priority
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="h-auto w-full"
          />
        </div>
      </Tilt>
      </div>

      {LIVE.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.title}
            className={`animate-pop-in absolute z-20 hidden sm:block ${c.pos}`}
            style={{ animationDelay: c.delay }}
          >
            <div className="animate-float flex w-72 items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.45)] backdrop-blur">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline justify-between gap-2 text-sm font-semibold">
                  {c.title}
                  <span className="whitespace-nowrap text-[10px] font-normal text-muted-foreground">{c.time}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">{c.text}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
