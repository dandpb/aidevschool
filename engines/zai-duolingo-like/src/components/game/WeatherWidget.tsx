"use client";

import { useEffect, useState } from "react";
import { CloudRain, Thermometer, Droplets, Clock } from "lucide-react";

interface WeatherWidgetProps {
  variant?: "compact" | "full";
}

// Diegetic atmospheric context: humid overcast Tokyo, 34°C, 77% humidity.
// Clock shows Tokyo time (JST) to reinforce the setting.
export function WeatherWidget({ variant = "compact" }: WeatherWidgetProps) {
  const [tokyoTime, setTokyoTime] = useState<string>("--:--");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      // Tokyo is UTC+9
      const tokyo = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000);
      const hh = tokyo.getHours().toString().padStart(2, "0");
      const mm = tokyo.getMinutes().toString().padStart(2, "0");
      setTokyoTime(`${hh}:${mm}`);
    };
    update();
    const t = setInterval(update, 1000 * 30);
    return () => clearInterval(t);
  }, []);

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs backdrop-blur">
        <span className="flex items-center gap-1 text-neon-teal">
          <CloudRain className="h-3.5 w-3.5" />
          Tóquio
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Thermometer className="h-3 w-3" />
          34°
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Droplets className="h-3 w-3" />
          77%
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          {tokyoTime}
        </span>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold tracking-wide text-muted-foreground">
          CONTEXTO ATMOSFÉRICO
        </h3>
        <span className="text-xs text-muted-foreground">Tóquio, JP</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-background/40 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CloudRain className="h-3.5 w-3.5 text-neon-teal" /> Céu
          </div>
          <p className="text-sm font-semibold">Nublado</p>
        </div>
        <div className="rounded-xl bg-background/40 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Thermometer className="h-3.5 w-3.5 text-neon-amber" /> Temp
          </div>
          <p className="text-sm font-semibold">34°C</p>
        </div>
        <div className="rounded-xl bg-background/40 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Droplets className="h-3.5 w-3.5 text-neon-rose" /> Umidade
          </div>
          <p className="text-sm font-semibold">77%</p>
        </div>
        <div className="rounded-xl bg-background/40 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-neon-magenta" /> Hora
          </div>
          <p className="text-sm font-semibold tabular-nums">{tokyoTime}</p>
        </div>
      </div>
      <blockquote className="mt-4 border-l-2 border-neon-teal/50 pl-3 text-sm italic leading-relaxed text-foreground/70">
        &ldquo;O ar é pesado de decadência lógica, e cada respiração parece uma
        transmissão corrompida de pacote de dados.&rdquo;
      </blockquote>
    </div>
  );
}
