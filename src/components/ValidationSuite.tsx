import React from "react";
import { ValidationReport } from "../types";
import { CheckCircle2, XCircle, ShieldCheck, ShieldAlert } from "lucide-react";

interface ValidationSuiteProps {
  report: ValidationReport;
}

export const ValidationSuite: React.FC<ValidationSuiteProps> = ({ report }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">12-Point Automated Validation Suite</h2>
            {report.validation_passed ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                12 / 12 PASSED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                FAILED
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Formally audits challenge constraints, physical invariants, and anti-future-information separation
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {report.checks.map((c, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
              c.passed ? "bg-slate-50/70 border-slate-200" : "bg-rose-50 border-rose-200"
            }`}
          >
            {c.passed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}

            <div className="min-w-0">
              <div className="font-semibold text-slate-800 font-mono text-[11px] truncate">
                {c.check}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 break-words">
                {c.detail}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
