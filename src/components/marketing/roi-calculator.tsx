"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm text-muted-foreground">
          {label}
        </label>
        <span className="text-sm font-semibold tabular-nums">
          {value} {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
        style={{
          background: `linear-gradient(to right, var(--color-primary) ${pct}%, var(--color-muted) ${pct}%)`,
        }}
      />
    </div>
  );
}

const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function RoiCalculator() {
  const [clients, setClients] = useState(40);
  const [chases, setChases] = useState(3);
  const [minutes, setMinutes] = useState(10);
  const [rate, setRate] = useState(60);
  const [avoided, setAvoided] = useState(50);

  const hoursLost = (clients * chases * minutes) / 60;
  const hoursSaved = hoursLost * (avoided / 100);
  const value = hoursSaved * rate;
  const plan = clients > 25 ? PLANS.business : PLANS.pro;
  const cost = plan.priceYearlyEur ?? plan.priceEur ?? 0;
  const multiple = cost > 0 ? value / cost : 0;

  return (
    <div className="grid overflow-hidden rounded-3xl border border-border bg-card shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-6 p-6 sm:p-8">
        <Slider label="Clients suivis chaque mois" value={clients} min={5} max={200} suffix="clients" onChange={setClients} />
        <Slider label="Relances et recherches de pièces par client" value={chases} min={1} max={8} suffix="/ mois" onChange={setChases} />
        <Slider label="Temps moyen par relance (e-mail, appel, tri)" value={minutes} min={3} max={30} suffix="min" onChange={setMinutes} />
        <Slider label="Valeur de votre heure" value={rate} min={25} max={200} step={5} suffix="€ HT" onChange={setRate} />
        <Slider label="Part des relances évitées (votre hypothèse)" value={avoided} min={10} max={90} step={5} suffix="%" onChange={setAvoided} />
      </div>

      <div className="relative flex flex-col justify-between gap-6 bg-[#0b1224] p-6 text-white sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_80%_0%,rgba(59,130,246,0.35),transparent)]"
        />
        <div className="relative">
          <p className="text-sm text-slate-400">Temps récupéré chaque mois</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight tabular-nums">
            {fmt.format(hoursSaved)} h
          </p>
          <p className="mt-1 text-sm text-slate-400">
            sur {fmt.format(hoursLost)} h passées aujourd&apos;hui à relancer
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <p className="text-xs text-slate-400">Valeur du temps récupéré</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{fmt.format(value)} €</p>
              <p className="text-xs text-slate-500">HT / mois</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <p className="text-xs text-slate-400">Forfait {plan.name}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{cost} €</p>
              <p className="text-xs text-slate-500">HT / mois (annuel)</p>
            </div>
          </div>
          {multiple >= 1 && (
            <p className="mt-4 text-sm text-blue-200">
              Soit environ <span className="font-semibold text-white">{fmt.format(multiple)}×</span>{" "}le prix de l&apos;abonnement.
            </p>
          )}
        </div>
        <div className="relative space-y-3">
          <Button size="lg" variant="secondary" className="w-full" asChild>
            <Link href="/register">
              Récupérer ce temps
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <p className="text-center text-xs text-slate-500">
            Estimation indicative fondée sur vos propres hypothèses.
          </p>
        </div>
      </div>
    </div>
  );
}
