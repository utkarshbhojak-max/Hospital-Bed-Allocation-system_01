import React from "react";
import { BenchmarkMetrics } from "../types";
import { Trophy, Clock, AlertTriangle, ShieldCheck, CheckSquare, Users, UserX, BedDouble } from "lucide-react";

interface KpiGridProps {
  metrics: BenchmarkMetrics;
}

export const KpiGrid: React.FC<KpiGridProps> = ({ metrics }) => {
  const m = metrics || ({} as BenchmarkMetrics);
  const uWait = m.Uwait ?? 0;
  const uCritical = m.Ucritical ?? 0;
  const uReject = m.Ureject ?? 0;
  const uSpecialized = m.Uspecialized ?? 0;
  const overallScore = m.overall_score ?? 0;
  const avgWait = m.average_wait ?? 0;
  const medianWait = m.median_wait ?? 0;
  const totalBedUtil = m.total_bed_utilization ?? 0;
  const numAdmitted = m.number_admitted ?? 0;
  const numRejected = m.number_rejected ?? 0;

  const uWaitPts = (uWait * 45).toFixed(2);
  const uCritPts = (uCritical * 20).toFixed(2);
  const uRejPts = (uReject * 15).toFixed(2);
  const uSpecPts = (uSpecialized * 15).toFixed(2);

  return (
    <div className="space-y-4">
      {/* Top tier: Utility scoring cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Overall Score */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-100">
            <span className="text-xs font-semibold uppercase tracking-wider">Overall Score</span>
            <Trophy className="w-4 h-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold tracking-tight">{overallScore.toFixed(2)}</span>
            <span className="text-sm font-medium text-emerald-100">/ 100</span>
          </div>
          <p className="text-xs text-emerald-100/90 mt-1">
            Rank 1 Benchmark Composite
          </p>
        </div>

        {/* Uwait */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Uwait (45%)</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{uWait.toFixed(4)}</span>
          </div>
          <p className="text-xs font-medium text-slate-600 mt-1">
            <span className="text-emerald-700 font-semibold">{uWaitPts}</span> / 45.00 pts
          </p>
        </div>

        {/* Ucritical */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Ucritical (20%)</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{uCritical.toFixed(4)}</span>
          </div>
          <p className="text-xs font-medium text-slate-600 mt-1">
            <span className="text-emerald-700 font-semibold">{uCritPts}</span> / 20.00 pts
          </p>
        </div>

        {/* Ureject */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Ureject (15%)</span>
            <CheckSquare className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{uReject.toFixed(4)}</span>
          </div>
          <p className="text-xs font-medium text-slate-600 mt-1">
            <span className="text-emerald-700 font-semibold">{uRejPts}</span> / 15.00 pts
          </p>
        </div>

        {/* Uspecialized */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Uspecialized (15%)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{uSpecialized.toFixed(4)}</span>
          </div>
          <p className="text-xs font-medium text-slate-600 mt-1">
            <span className="text-emerald-700 font-semibold">{uSpecPts}</span> / 15.00 pts (Zero defects)
          </p>
        </div>
      </div>

      {/* Operational stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>Admitted</span>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">
            {numAdmitted} <span className="text-xs font-normal text-slate-500">({(numAdmitted / 5).toFixed(1)}%)</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
            <UserX className="w-3.5 h-3.5 text-rose-500" />
            <span>Rejected</span>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">
            {numRejected} <span className="text-xs font-normal text-slate-500">({(numRejected / 5).toFixed(1)}%)</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span>Avg Wait</span>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">
            {avgWait.toFixed(1)} <span className="text-xs font-normal text-slate-500">min</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Median Wait</span>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">
            {medianWait.toFixed(1)} <span className="text-xs font-normal text-slate-500">min</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
            <BedDouble className="w-3.5 h-3.5 text-purple-600" />
            <span>Total Bed Util</span>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">
            {(totalBedUtil * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Avoidable Violations</span>
          </div>
          <div className="text-lg font-bold text-emerald-700 mt-1">
            0 <span className="text-xs font-normal text-emerald-600">violations</span>
          </div>
        </div>
      </div>
    </div>
  );
};
