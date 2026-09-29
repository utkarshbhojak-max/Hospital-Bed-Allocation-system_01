import React from "react";
import { CheckCircle2, Terminal, Activity } from "lucide-react";

interface HeaderProps {
  validationPassed: boolean;
  totalChecks: number;
}

export const Header: React.FC<HeaderProps> = ({ validationPassed, totalChecks }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                <Activity className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                HC-03 | Intelligent Hospital Bed Allocation
              </h1>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Online capacity-aware allocation under uncertainty • Seed: <span className="font-mono font-medium text-slate-800">20260911</span> • Cohort: <span className="font-mono font-medium text-slate-800">500 patients</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {validationPassed && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>ALL {totalChecks}/{totalChecks} VALIDATION CHECKS PASSED</span>
              </div>
            )}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200">
              <Terminal className="w-3.5 h-3.5 text-slate-500" />
              <span>python run_experiment.py</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
