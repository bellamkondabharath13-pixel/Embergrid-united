import React, { useState, useEffect, useRef } from "react";
import { Battery, BatteryCharging, TrendingUp, TrendingDown, ShieldAlert } from "lucide-react";

function useSmoothValue(target, duration = 800) {
  const [val, setVal] = useState(target);
  const startRef = useRef(target);
  const startTimeRef = useRef(null);

  useEffect(() => {
    startRef.current = val;
    startTimeRef.current = null;
    let animId;

    const animate = (time) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const progress = Math.min((time - startTimeRef.current) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(startRef.current + (target - startRef.current) * ease);
      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [target, duration]);

  return val;
}

export function CarnotBatteryGauge({ level, capacity, charging, discharging, isThermalSurge }) {
  const smoothLevel = useSmoothValue(level, 1200);
  const percentage = Math.max(0, Math.min(100, (smoothLevel / capacity) * 100));

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const color = isThermalSurge
    ? "#f97316"
    : percentage < 20
    ? "#ef4444"
    : percentage < 50
    ? "#fbbf24"
    : "#06b6d4";

  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="mb-2 flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <Battery className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Carnot Battery</h3>
        </div>
        <span className="text-xs text-slate-500 font-mono">{capacity} kWh capacity</span>
      </div>

      <div className="relative my-4 h-44 w-44">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200">
          {/* Background circle track */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="rgba(30,41,59,0.8)"
            strokeWidth="12"
          />

          {/* Active progress bar */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.8s",
              filter: `drop-shadow(0 0 8px ${color}88)`
            }}
          />

          {/* Dial ticks */}
          {[0, 25, 50, 75, 100].map((t) => {
            const rad = ((t / 100) * 360 - 90) * (Math.PI / 180);
            const x1 = 100 + (radius - 8) * Math.cos(rad);
            const y1 = 100 + (radius - 8) * Math.sin(rad);
            const x2 = 100 + (radius + 8) * Math.cos(rad);
            const y2 = 100 + (radius + 8) * Math.sin(rad);
            return (
              <line
                key={t}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(71,85,105,0.5)"
                strokeWidth="1.5"
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums text-white">
            {percentage.toFixed(0)}%
          </span>
          <span className="text-xs text-slate-400">charged</span>
          <span className="mt-1 text-xs tabular-nums text-slate-500 font-mono">
            {smoothLevel.toFixed(1)} kWh
          </span>
        </div>

        {/* Dynamic status badge */}
        {(charging || discharging || isThermalSurge) && (
          <div
            className={`absolute -bottom-1 flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold ${
              isThermalSurge
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                : charging
                ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                : "bg-orange-500/15 text-orange-400 border border-orange-500/30"
            }`}
          >
            {isThermalSurge ? (
              <ShieldAlert className="h-3 w-3" />
            ) : charging ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>
              {isThermalSurge ? "Thermal Buffer" : charging ? "Charging" : "Discharging"}
            </span>
          </div>
        )}
      </div>

      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Round-trip Thermal Efficiency</span>
          <span className="font-medium text-slate-300 font-mono">70.0%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400"
            style={{ width: "70%", transition: "width 0.6s ease" }}
          />
        </div>
      </div>
    </div>
  );
}
