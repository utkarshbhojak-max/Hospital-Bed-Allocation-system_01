import React from "react";
import { PolicyComparisonItem } from "../types";
import { Award, CheckCircle2, TrendingUp } from "lucide-react";

interface PolicyComparisonProps {
  data: PolicyComparisonItem[];
}

export const PolicyComparison: React.FC<PolicyComparisonProps> = ({ data }) => {
  const minScore = 48;
  const maxScore = 55;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Benchmark Policy Comparison</h2>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              <Award className="w-3.5 h-3.5" />
              Final Hybrid Wins
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Head-to-head performance across standard baselines on identical PCG64 seed (20260911)
          </p>
        </div>
      </div>

      {/* Visual Bar Comparison */}
      <div className="space-y-3 mb-6">
        {data.map((item) => {
          const isWinner = item.Policy === "Final Hybrid Policy";
          const scoreWidth = Math.max(0, Math.min(100, ((item["Overall Score"] - minScore) / (maxScore - minScore)) * 100));

          return (
            <div
              key={item.Policy}
              className={`p-3 rounded-lg border transition-all ${
                isWinner
                  ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400"
                  : "bg-slate-50/60 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  {isWinner ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {item.Policy}
                    </span>
                  ) : (
                    <span className="text-slate-700">{item.Policy}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-mono text-[11px]">
                    Uwait: {item.Uwait.toFixed(4)} • Ucrit: {item.Ucritical.toFixed(4)}
                  </span>
                  <span className={`font-mono text-sm font-bold ${isWinner ? "text-emerald-700" : "text-slate-800"}`}>
                    {item["Overall Score"].toFixed(2)} pts
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    isWinner
                      ? "bg-emerald-500"
                      : item.Policy === "Specialized Preserving"
                      ? "bg-sky-500"
                      : "bg-slate-400"
                  }`}
                  style={{ width: `${scoreWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <th className="py-2 pr-3">Policy Name</th>
              <th className="py-2 px-2 text-right">Overall Score</th>
              <th className="py-2 px-2 text-right">Uwait (45%)</th>
              <th className="py-2 px-2 text-right">Ucrit (20%)</th>
              <th className="py-2 px-2 text-right">Urej (15%)</th>
              <th className="py-2 px-2 text-right">Uspec (15%)</th>
              <th className="py-2 px-2 text-right">Admitted</th>
              <th className="py-2 px-2 text-right">Rejected</th>
              <th className="py-2 px-2 text-right">Avg Wait</th>
              <th className="py-2 pl-2 text-right">Violations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => {
              const isWinner = row.Policy === "Final Hybrid Policy";
              return (
                <tr
                  key={row.Policy}
                  className={`transition-colors ${
                    isWinner ? "bg-emerald-50/40 font-semibold text-emerald-950" : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <td className="py-2.5 pr-3 flex items-center gap-1.5">
                    {isWinner && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                    {row.Policy}
                  </td>
                  <td className={`py-2.5 px-2 text-right font-mono font-bold ${isWinner ? "text-emerald-700" : "text-slate-900"}`}>
                    {row["Overall Score"].toFixed(2)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono">{row.Uwait.toFixed(4)}</td>
                  <td className="py-2.5 px-2 text-right font-mono">{row.Ucritical.toFixed(4)}</td>
                  <td className="py-2.5 px-2 text-right font-mono">{row.Ureject.toFixed(4)}</td>
                  <td className="py-2.5 px-2 text-right font-mono">{row.Uspecialized.toFixed(4)}</td>
                  <td className="py-2.5 px-2 text-right font-mono text-emerald-600">{row.Admitted}</td>
                  <td className="py-2.5 px-2 text-right font-mono text-rose-600">{row.Rejected}</td>
                  <td className="py-2.5 px-2 text-right font-mono">{row["Avg Wait (min)"].toFixed(1)}m</td>
                  <td className="py-2.5 pl-2 text-right font-mono text-emerald-700 font-bold">{row["Avoidable Violations"]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
        <TrendingUp className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold">Why FIFO fails:</span> FIFO greedily admits Level 2 patients into scarce Critical beds whenever Monitored is full. This prematurely exhausts Critical capacity, forcing incoming Level 3 critical arrivals to time out and causing a <strong>-38.3% collapse in U_critical</strong> (from 0.2094 down to 0.1291) and a net <strong>-2.24 point loss</strong> in the composite score.
        </div>
      </div>
    </div>
  );
};
