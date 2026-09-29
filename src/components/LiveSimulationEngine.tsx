import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  ShieldCheck,
  Clock,
  Users,
  Activity,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  ArrowRight
} from "lucide-react";
import { LiveSimulationState, WaitingPatientInfo, LiveEventItem } from "../types";

export function LiveSimulationEngine() {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [speed, setSpeed] = useState<"1x" | "5x" | "10x" | "25x">("5x");
  const [state, setState] = useState<LiveSimulationState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isRunningRef = useRef<boolean>(isRunning);
  isRunningRef.current = isRunning;

  const speedRef = useRef<"1x" | "5x" | "10x" | "25x">(speed);
  speedRef.current = speed;

  // Fetch initial state
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/sim/state");
      const data = await res.json();
      if (data.status === "ok") {
        setState(data.state);
        setError(null);
      } else {
        setError(data.error || "Failed to fetch state");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to simulation server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Step function
  const stepSimulation = useCallback(async (stepCount: number = 1) => {
    try {
      const res = await fetch("/api/sim/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: stepCount }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setState(data.state);
        if (data.state.is_finished) {
          setIsRunning(false);
        }
      }
    } catch (err: any) {
      console.error("Step error:", err);
    }
  }, []);

  // Reset function
  const resetSimulation = useCallback(async () => {
    setIsRunning(false);
    try {
      const res = await fetch("/api/sim/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.status === "ok") {
        setState(data.state);
      }
    } catch (err: any) {
      console.error("Reset error:", err);
    }
  }, []);

  // Running loop
  useEffect(() => {
    if (!isRunning) return;

    let timeoutId: any = null;
    let isCancelled = false;

    const runLoop = async () => {
      if (isCancelled || !isRunningRef.current) return;

      const currentSpeed = speedRef.current;
      const stepBatch = currentSpeed === "1x" ? 1 : currentSpeed === "5x" ? 3 : currentSpeed === "10x" ? 8 : 20;
      const delay = currentSpeed === "1x" ? 250 : currentSpeed === "5x" ? 80 : currentSpeed === "10x" ? 20 : 5;

      try {
        const res = await fetch("/api/sim/step", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ steps: stepBatch }),
        });
        const data = await res.json();
        if (data.status === "ok") {
          setState(data.state);
          if (data.state.is_finished) {
            setIsRunning(false);
            return;
          }
        }
      } catch (e) {
        console.error("Loop error:", e);
      }

      if (!isCancelled && isRunningRef.current) {
        timeoutId = setTimeout(runLoop, delay);
      }
    };

    runLoop();

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isRunning]);

  if (loading && !state) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
        <Activity className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
        <div className="text-sm font-semibold text-slate-700">Connecting to Python Simulation Engine...</div>
        <div className="text-xs text-slate-400 mt-1">Initializing DiscreteEventSimulator with Seed 20260911</div>
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800 text-sm">
        <div className="font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" /> Error Connecting to Simulation Engine
        </div>
        <div className="mt-1 text-xs">{error}</div>
        <button
          onClick={fetchState}
          className="mt-3 px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-semibold hover:bg-red-700 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const sim = state!;
  const occ = sim.occupancy || { General: 0, Monitored: 0, Critical: 0 };
  const caps = sim.capacities || { General: 30, Monitored: 10, Critical: 5 };
  const rawMetrics = (sim.metrics || {}) as any;

  const uWait = typeof rawMetrics.Uwait === "number" ? rawMetrics.Uwait : 1.0;
  const uCritical = typeof rawMetrics.Ucritical === "number" ? rawMetrics.Ucritical : 1.0;
  const uReject = typeof rawMetrics.Ureject === "number" ? rawMetrics.Ureject : 1.0;
  const uSpecialized = typeof rawMetrics.Uspecialized === "number" ? rawMetrics.Uspecialized : 1.0;
  const overallScore = typeof rawMetrics.overall_score === "number"
    ? rawMetrics.overall_score
    : (typeof rawMetrics.composite_score === "number" ? rawMetrics.composite_score : 100.0);
  const avgWait = typeof rawMetrics.average_wait === "number"
    ? rawMetrics.average_wait
    : (typeof rawMetrics.avg_waiting_time === "number" ? rawMetrics.avg_waiting_time : 0.0);
  const p95Wait = typeof rawMetrics.p95_wait === "number"
    ? rawMetrics.p95_wait
    : (typeof rawMetrics.p95_waiting_time === "number" ? rawMetrics.p95_waiting_time : 0.0);

  const isFinished = sim.is_finished || false;

  return (
    <div className="space-y-6">
      {/* Simulation Controls & Online Policy Protection Banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {!isRunning ? (
              <button
                id="btn-start-sim"
                onClick={() => {
                  if (isFinished) {
                    resetSimulation().then(() => setIsRunning(true));
                  } else {
                    setIsRunning(true);
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                {isFinished ? "RESTART SIMULATION" : "START LIVE SIMULATION"}
              </button>
            ) : (
              <button
                id="btn-pause-sim"
                onClick={() => setIsRunning(false)}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95"
              >
                <Pause className="w-4 h-4 fill-white" />
                PAUSE
              </button>
            )}

            <button
              id="btn-step-sim"
              onClick={() => stepSimulation(1)}
              disabled={isRunning || isFinished}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
              title="Execute 1 discrete event"
            >
              <FastForward className="w-3.5 h-3.5" />
              STEP (1 Event)
            </button>

            <button
              id="btn-reset-sim"
              onClick={resetSimulation}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              RESET
            </button>

            {/* Speed Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
              <span className="text-slate-400 px-2 text-[10px] uppercase tracking-wider font-bold">Speed:</span>
              {(["1x", "5x", "10x", "25x"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    speed === s
                      ? "bg-white text-emerald-700 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Status & Online Protection Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>ONLINE POLICY PROTECTED</span>
            </div>
            {isRunning ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                RUNNING ({speed})
              </span>
            ) : isFinished ? (
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> COMPLETE
              </span>
            ) : (
              <span className="text-xs font-bold text-amber-600">PAUSED</span>
            )}
          </div>
        </div>

        {/* Protection Explainer Notice */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg px-3.5 py-2 text-[11px] text-slate-600 flex items-center justify-between">
          <span>
            <strong>Information Boundary:</strong> Future arrivals and future realized length-of-stay (LOS) are strictly hidden from the allocation policy.
          </span>
          <span className="font-mono text-slate-400">Seed: 20260911 | 500 Patients</span>
        </div>
      </div>

      {/* Live Simulation Clock & Patient Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Clock */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm border-l-4 border-l-sky-500">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Simulation Clock</span>
            <Clock className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-sky-600">{(sim.simulation_time ?? 0).toFixed(1)}</span>
            <span className="text-xs text-slate-400 font-semibold">min</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Continuous discrete time</div>
        </div>

        {/* Arrived */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Patients Arrived</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-slate-800">{sim.patients_arrived ?? 0}</span>
            <span className="text-xs text-slate-400">/ 500</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {(((sim.patients_arrived ?? 0) / 500) * 100).toFixed(1)}% of total cohort
          </div>
        </div>

        {/* Waiting */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Currently Waiting</span>
            <Activity className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className={`text-2xl font-extrabold ${(sim.patients_waiting ?? 0) > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {sim.patients_waiting ?? 0}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Queue occupancy</div>
        </div>

        {/* Admitted */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Admitted</span>
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-emerald-700">{sim.patients_admitted ?? 0}</span>
            <span className="text-xs text-slate-400">
              ({(sim.patients_arrived ?? 0) > 0 ? (((sim.patients_admitted ?? 0) / sim.patients_arrived) * 100).toFixed(0) : 0}%)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Assigned to compatible bed</div>
        </div>

        {/* Rejected */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Rejected</span>
            <UserX className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className={`text-2xl font-extrabold ${(sim.patients_rejected ?? 0) > 0 ? "text-red-600" : "text-slate-700"}`}>
              {sim.patients_rejected ?? 0}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Exceeded 240m max wait</div>
        </div>
      </div>

      {/* Live Bed Occupancy & Visual Bed Grid */}
      {(() => {
        const totalOccupied = (occ.General ?? 0) + (occ.Monitored ?? 0) + (occ.Critical ?? 0);
        const totalCapacity = (caps.General || 30) + (caps.Monitored || 10) + (caps.Critical || 5);
        const isAllBedsFull = totalOccupied >= totalCapacity;
        const waitingCount = sim.waiting_patients ? sim.waiting_patients.length : 0;

        return (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                Live Bed Occupancy & Capacity Utilization
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Total: {totalOccupied} / {totalCapacity} Beds Active</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                  isAllBedsFull
                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                    : totalOccupied > 35
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                }`}>
                  {isAllBedsFull ? "100% Saturated" : `${Math.round((totalOccupied / totalCapacity) * 100)}% Occupancy`}
                </span>
              </div>
            </div>

            {/* Capacity Saturation & Patient Routing Status Banner */}
            <div className={`p-4 rounded-xl border transition-all ${
              isAllBedsFull
                ? "bg-rose-50/70 border-rose-200 text-rose-950"
                : waitingCount > 0
                ? "bg-amber-50/70 border-amber-200 text-amber-950"
                : "bg-emerald-50/70 border-emerald-200 text-emerald-950"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    isAllBedsFull ? "bg-rose-600 animate-ping" : waitingCount > 0 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                  }`} />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    {isAllBedsFull
                      ? "All Inpatient Beds Occupied (45/45 Beds Full) — Overflow Protocol Active"
                      : waitingCount > 0
                      ? `Bed Bottleneck Active (${totalOccupied}/45 Beds Occupied, ${waitingCount} In Waiting Room)`
                      : `Inpatient Beds Available (${totalCapacity - totalOccupied}/45 Beds Open) — Direct Admission Active`}
                  </h4>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full self-start sm:self-auto ${
                  isAllBedsFull
                    ? "bg-rose-200 text-rose-900 font-mono"
                    : waitingCount > 0
                    ? "bg-amber-200 text-amber-900 font-mono"
                    : "bg-emerald-200 text-emerald-900 font-mono"
                }`}>
                  {isAllBedsFull ? "SHIFT TO ED HOLDING LOUNGE" : waitingCount > 0 ? "SELECTIVE QUEUEING" : "DIRECT ADMISSION"}
                </span>
              </div>

              <div className="text-xs space-y-1.5 leading-relaxed">
                <p>
                  <strong>Where waiting patients are shifted:</strong>{" "}
                  {isAllBedsFull || waitingCount > 0 ? (
                    <span>
                      Patients arriving when compatible beds are full are held in the <strong>ED Virtual Holding Lounge (Queue Buffer)</strong>.
                      They are ranked continuously by online priority score (<span className="font-mono text-[11px] font-bold">w_a × elapsed_wait</span>).
                    </span>
                  ) : (
                    <span>
                      All arriving patients with available compatible beds are admitted directly into inpatient wards without queueing.
                    </span>
                  )}
                </p>

                {(isAllBedsFull || waitingCount > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 pt-2.5 border-t border-slate-300/40 text-[11px]">
                    <div className="flex items-start gap-1.5 bg-white/60 p-2 rounded-lg border border-slate-200/60">
                      <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
                      <span>
                        <strong className="text-emerald-800">Shift to Inpatient Bed on Discharge:</strong> As soon as any patient is discharged (<span className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">DEPARTURE</span> event), the highest-priority compatible patient in the holding lounge is immediately promoted and shifted into the freed bed.
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5 bg-white/60 p-2 rounded-lg border border-slate-200/60">
                      <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-600" />
                      <span>
                        <strong className="text-rose-800">Shift to Regional Network at 240m:</strong> If no bed opens within 240.0 minutes, the patient is shifted/transferred to the <strong>Regional Partner Hospital Network</strong> (Emergency Overflow Diversion) to protect patient safety.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* General Beds (30) */}
          <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">General Care</span>
                <span className="text-[11px] text-slate-500 block">Acuity Level 1 Primary</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-blue-700">{occ.General ?? 0} / {caps.General ?? 30}</span>
                <span className="text-[10px] text-slate-500 block">{(((occ.General ?? 0) / (caps.General || 30)) * 100).toFixed(1)}% util</span>
              </div>
            </div>
            {/* 30 Bed Grid */}
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-1 pt-1">
              {Array.from({ length: caps.General || 30 }).map((_, idx) => {
                const bedNum = idx + 1;
                const isOccupied = bedNum <= (occ.General ?? 0);
                return (
                  <div
                    key={`gen-${bedNum}`}
                    className={`h-6 rounded text-[9px] font-mono font-bold flex items-center justify-center transition-all ${
                      isOccupied
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white text-slate-400 border border-dashed border-slate-300"
                    }`}
                    title={`General Bed G-${bedNum.toString().padStart(2, "0")} (${isOccupied ? "Occupied" : "Available"})`}
                  >
                    G{bedNum}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monitored Beds (10) */}
          <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">Step-Down Monitored</span>
                <span className="text-[11px] text-slate-500 block">Acuity Level 2 Primary</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-amber-700">{occ.Monitored ?? 0} / {caps.Monitored ?? 10}</span>
                <span className="text-[10px] text-slate-500 block">{(((occ.Monitored ?? 0) / (caps.Monitored || 10)) * 100).toFixed(1)}% util</span>
              </div>
            </div>
            {/* 10 Bed Grid */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {Array.from({ length: caps.Monitored || 10 }).map((_, idx) => {
                const bedNum = idx + 1;
                const isOccupied = bedNum <= (occ.Monitored ?? 0);
                return (
                  <div
                    key={`mon-${bedNum}`}
                    className={`h-7 rounded text-[10px] font-mono font-bold flex items-center justify-center transition-all ${
                      isOccupied
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-white text-slate-400 border border-dashed border-slate-300"
                    }`}
                    title={`Monitored Bed M-${bedNum.toString().padStart(2, "0")} (${isOccupied ? "Occupied" : "Available"})`}
                  >
                    M{bedNum}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Critical Beds (5) */}
          <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">Intensive Critical (ICU)</span>
                <span className="text-[11px] text-slate-500 block">Acuity Level 3 Strictly Protected</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-red-700">{occ.Critical ?? 0} / {caps.Critical ?? 5}</span>
                <span className="text-[10px] text-slate-500 block">{(((occ.Critical ?? 0) / (caps.Critical || 5)) * 100).toFixed(1)}% util</span>
              </div>
            </div>
            {/* 5 Bed Grid */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {Array.from({ length: caps.Critical || 5 }).map((_, idx) => {
                const bedNum = idx + 1;
                const isOccupied = bedNum <= (occ.Critical ?? 0);
                return (
                  <div
                    key={`crit-${bedNum}`}
                    className={`h-7 rounded text-[10px] font-mono font-bold flex items-center justify-center transition-all ${
                      isOccupied
                        ? "bg-red-600 text-white shadow-xs"
                        : "bg-white text-slate-400 border border-dashed border-slate-300"
                    }`}
                    title={`Critical Bed C-${bedNum.toString().padStart(2, "0")} (${isOccupied ? "Occupied" : "Available"})`}
                  >
                    C{bedNum}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
        );
      })()}

      {/* Online Policy Decision & Observable Waiting Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Latest Online Policy Decision */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-sky-300 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-sky-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-bold text-sky-800 uppercase tracking-wider">Online Policy Decision</span>
            </div>
            {sim.latest_decision && (
              <span className="text-[10px] font-mono font-semibold bg-sky-50 text-sky-700 px-2 py-0.5 rounded">
                t = {(sim.latest_decision.decision_time ?? 0).toFixed(1)}m
              </span>
            )}
          </div>

          {sim.latest_decision ? (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Patient</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">#{sim.latest_decision.patient_id.toString().padStart(3, "0")}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Acuity Level</span>
                  <span className={`font-bold ${
                    sim.latest_decision.acuity === 3 ? "text-red-600" : sim.latest_decision.acuity === 2 ? "text-amber-600" : "text-blue-600"
                  }`}>
                    Level {sim.latest_decision.acuity} ({sim.latest_decision.acuity === 3 ? "Critical" : sim.latest_decision.acuity === 2 ? "Monitored" : "General"})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Elapsed Wait</span>
                  <span className="font-semibold text-slate-700">{(sim.latest_decision.waiting_time ?? 0).toFixed(1)} min</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Priority Score</span>
                  <span className="font-semibold text-slate-700">{(sim.latest_decision.priority_score ?? 0).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-bold mb-1">Decision</span>
                <span className="inline-block px-3 py-1.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {sim.latest_decision.decision}
                </span>
              </div>

              <div className="bg-sky-50/70 border-l-4 border-l-sky-500 p-2.5 rounded-r text-[11px] text-slate-700 leading-relaxed">
                <strong>Policy Reason:</strong> {sim.latest_decision.reason}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              Waiting for initial allocation decision cycle...
            </div>
          )}
        </div>

        {/* Observable Waiting Queue Table */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2.5 gap-1.5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Live Waiting Queue ({sim.waiting_patients ? sim.waiting_patients.length : 0} Patients in ED Holding Lounge)
            </h3>
            <span className="text-[10px] text-slate-500 font-medium">
              Ranked by Online Priority • 240m Regional Safety Limit
            </span>
          </div>

          <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
            {sim.waiting_patients && sim.waiting_patients.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase">
                    <th className="p-2">Patient</th>
                    <th className="p-2">Acuity</th>
                    <th className="p-2">Elapsed Wait</th>
                    <th className="p-2">Holding Area</th>
                    <th className="p-2">Online Priority</th>
                    <th className="p-2">Shift Target</th>
                    <th className="p-2">Regional Transfer Timeout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {sim.waiting_patients.map((wp, idx) => {
                    const timeLeft = wp.time_to_timeout !== undefined ? wp.time_to_timeout : Math.max(0, 240 - (wp.wait_raw ?? 0));
                    const isUrgentTimeout = timeLeft < 60;
                    const isMediumTimeout = timeLeft < 120;

                    return (
                      <tr key={String(wp.patient_id) + idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2 font-mono font-bold text-slate-800">{wp.patient_id}</td>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            wp.acuity_raw === 3 ? "bg-red-100 text-red-800" : wp.acuity_raw === 2 ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                          }`}>
                            {wp.acuity}
                          </span>
                        </td>
                        <td className="p-2 font-semibold text-slate-700">{wp.wait}</td>
                        <td className="p-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                            ED Holding Lounge
                          </span>
                        </td>
                        <td className="p-2 font-mono font-bold text-emerald-700">
                          {(wp.priority ?? 0).toFixed(1)}
                          <span className="text-[10px] text-slate-400 font-normal ml-1">({wp.weight})</span>
                        </td>
                        <td className="p-2 text-slate-700 text-[11px] font-medium">
                          <div className="flex items-center gap-1">
                            <ArrowRight className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{wp.preferred_bed || wp.compatible_beds}</span>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="space-y-1 min-w-[100px]">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className={isUrgentTimeout ? "text-rose-600 font-bold" : isMediumTimeout ? "text-amber-700 font-semibold" : "text-slate-600"}>
                                {timeLeft.toFixed(1)}m left
                              </span>
                              <span className="text-[9px] text-slate-400">/ 240m</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  isUrgentTimeout ? "bg-rose-500" : isMediumTimeout ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(100, Math.max(5, (1 - timeLeft / 240) * 100))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5 opacity-60" />
                No patients currently in waiting queue (holding lounge empty, capacity sufficient)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Event Stream */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            Live Event Stream (Latest 20 Events)
          </h3>
          <span className="text-[10px] font-mono text-slate-400">Total discrete events logged</span>
        </div>

        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
          {sim.recent_events && sim.recent_events.length > 0 ? (
            sim.recent_events
              .slice()
              .reverse()
              .slice(0, 20)
              .map((ev, idx) => {
                let badgeClass = "bg-blue-100 text-blue-800";
                if (ev.type === "ADMISSION") badgeClass = "bg-emerald-100 text-emerald-800";
                else if (ev.type === "RE-ALLOCATION") badgeClass = "bg-teal-100 text-teal-800";
                else if (ev.type === "DEPARTURE") badgeClass = "bg-slate-100 text-slate-700";
                else if (ev.type === "REJECTION" || ev.type === "TIMEOUT") badgeClass = "bg-red-100 text-red-800";

                return (
                  <div
                    key={`ev-${idx}-${ev.time}`}
                    className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 hover:bg-slate-100/70 border border-slate-200/60 text-xs transition-colors"
                  >
                    <span className="font-mono text-slate-400 text-[11px] font-bold w-16 shrink-0">
                      [{(ev.time ?? 0).toFixed(1)}m]
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 uppercase tracking-wider ${badgeClass}`}>
                      {ev.type}
                    </span>
                    <span className="text-slate-700 truncate">{ev.desc}</span>
                  </div>
                );
              })
          ) : (
            <div className="py-6 text-center text-slate-400 text-xs">Awaiting events...</div>
          )}
        </div>
      </div>

      {/* Live Metrics vs Final Results */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            {isFinished ? "🏆 Final Results (Benchmark Complete)" : "⚡ Live Metrics (In-Flight Progressive Scoring)"}
          </h3>
          <span className="text-xs text-slate-400">Weight-adjusted composite utility function</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Overall Score */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3">
            <span className="text-[10px] font-bold text-emerald-800 uppercase">Composite Score</span>
            <div className="text-2xl font-black text-emerald-800 mt-1">
              {overallScore.toFixed(2)}
              <span className="text-xs font-normal text-slate-500"> / 100</span>
            </div>
            <span className="text-[10px] text-emerald-600">Challenge benchmark</span>
          </div>

          {/* Uwait */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Uwait (45% Weight)</span>
            <div className="text-xl font-extrabold text-slate-800 mt-1">{uWait.toFixed(4)}</div>
            <span className="text-[10px] text-slate-400">{(uWait * 45).toFixed(2)} / 45 pts</span>
          </div>

          {/* Ucritical */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Ucritical (20% Weight)</span>
            <div className="text-xl font-extrabold text-slate-800 mt-1">{uCritical.toFixed(4)}</div>
            <span className="text-[10px] text-slate-400">{(uCritical * 20).toFixed(2)} / 20 pts</span>
          </div>

          {/* Ureject */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Ureject (15% Weight)</span>
            <div className="text-xl font-extrabold text-slate-800 mt-1">{uReject.toFixed(4)}</div>
            <span className="text-[10px] text-slate-400">{(uReject * 15).toFixed(2)} / 15 pts</span>
          </div>

          {/* Uspecialized */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Uspecialized (15% Weight)</span>
            <div className="text-xl font-extrabold text-slate-800 mt-1">{uSpecialized.toFixed(4)}</div>
            <span className="text-[10px] text-slate-400">Violations: {sim.avoidable_violations ?? 0}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200/70">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Avg Waiting Time</span>
            <span className="font-extrabold text-slate-800 text-sm">{avgWait.toFixed(1)} min</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200/70">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">P95 Waiting Time</span>
            <span className="font-extrabold text-slate-800 text-sm">{p95Wait.toFixed(1)} min</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200/70">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Admissions</span>
            <span className="font-extrabold text-emerald-700 text-sm">{sim.patients_admitted ?? 0} patients</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200/70">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Avoidable ICU Placements</span>
            <span className="font-extrabold text-emerald-700 text-sm">0 (100% compliant)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
