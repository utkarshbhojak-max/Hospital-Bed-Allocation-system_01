import React, { useState } from "react";
import {
  METRICS,
  VALIDATION,
  POLICY_COMPARISON,
  OCCUPANCY_TIMESERIES,
  PATIENTS_DATA,
  DECISIONS_DATA
} from "./data/simulationData";
import { Header } from "./components/Header";
import { LiveSimulationEngine } from "./components/LiveSimulationEngine";
import { KpiGrid } from "./components/KpiGrid";
import { OccupancyChart } from "./components/OccupancyChart";
import { AcuityAndWaiting } from "./components/AcuityAndWaiting";
import { PolicyComparison } from "./components/PolicyComparison";
import { PatientExplorer } from "./components/PatientExplorer";
import { ValidationSuite } from "./components/ValidationSuite";
import { ArchitectureFlow } from "./components/ArchitectureFlow";
import { BenchmarkMetrics, ValidationReport, PolicyComparisonItem, OccupancyPoint, PatientRecord, DecisionRecord } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<"live" | "overview" | "occupancy" | "comparison" | "patients" | "validation">("live");

  const metrics: BenchmarkMetrics = METRICS as BenchmarkMetrics;
  const validation: ValidationReport = VALIDATION as ValidationReport;
  const comparison: PolicyComparisonItem[] = POLICY_COMPARISON as PolicyComparisonItem[];
  const occupancy: OccupancyPoint[] = OCCUPANCY_TIMESERIES as OccupancyPoint[];
  const patients: PatientRecord[] = PATIENTS_DATA as unknown as PatientRecord[];
  const decisions: DecisionRecord[] = DECISIONS_DATA as unknown as DecisionRecord[];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      <Header validationPassed={validation.validation_passed} totalChecks={validation.total_checks} />

      {/* Navigation Sub-bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-6 text-xs font-semibold overflow-x-auto py-2.5">
            <button
              onClick={() => setActiveTab("live")}
              className={`pb-1 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "live"
                  ? "text-emerald-700 border-b-2 border-emerald-600 font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Live Simulation Engine</span>
            </button>
            <button
              onClick={() => setActiveTab("overview")}
              className={`pb-1 transition-colors whitespace-nowrap ${
                activeTab === "overview"
                  ? "text-emerald-700 border-b-2 border-emerald-600 font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Overview & KPIs
            </button>
            <button
              onClick={() => setActiveTab("occupancy")}
              className={`pb-1 transition-colors whitespace-nowrap ${
                activeTab === "occupancy"
                  ? "text-emerald-700 border-b-2 border-emerald-600 font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Bed Occupancy Dynamics
            </button>
            <button
              onClick={() => setActiveTab("comparison")}
              className={`pb-1 transition-colors whitespace-nowrap ${
                activeTab === "comparison"
                  ? "text-emerald-700 border-b-2 border-emerald-600 font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Baseline Benchmarks
            </button>
            <button
              onClick={() => setActiveTab("patients")}
              className={`pb-1 transition-colors whitespace-nowrap ${
                activeTab === "patients"
                  ? "text-emerald-700 border-b-2 border-emerald-600 font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Patient Decision Explorer
            </button>
            <button
              onClick={() => setActiveTab("validation")}
              className={`pb-1 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "validation"
                  ? "text-emerald-700 border-b-2 border-emerald-600 font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <span>Validation Suite</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">12/12</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Render Live Simulation as default */}
        {activeTab === "live" && <LiveSimulationEngine />}

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <KpiGrid metrics={metrics} />
            <OccupancyChart data={occupancy} />
            <AcuityAndWaiting patients={patients} />
            <PolicyComparison data={comparison} />
            <ArchitectureFlow />
          </div>
        )}

        {/* Occupancy Tab */}
        {activeTab === "occupancy" && (
          <div className="space-y-6">
            <OccupancyChart data={occupancy} />
            <AcuityAndWaiting patients={patients} />
          </div>
        )}

        {/* Comparison Tab */}
        {activeTab === "comparison" && (
          <div className="space-y-6">
            <PolicyComparison data={comparison} />
            <ArchitectureFlow />
          </div>
        )}

        {/* Patient Decision Explorer Tab */}
        {activeTab === "patients" && (
          <div className="space-y-6">
            <PatientExplorer patients={patients} decisions={decisions} />
          </div>
        )}

        {/* Validation Tab */}
        {activeTab === "validation" && (
          <div className="space-y-6">
            <ValidationSuite report={validation} />
            <ArchitectureFlow />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          HC-03 | Synthetic cohort (PCG64 Seed: 20260911) | Online allocation policy | Discrete-event simulation
        </div>
      </footer>
    </div>
  );
}
