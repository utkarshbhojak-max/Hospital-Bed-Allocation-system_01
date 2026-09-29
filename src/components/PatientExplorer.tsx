import React, { useState } from "react";
import { PatientRecord, DecisionRecord } from "../types";
import { Search, UserCheck, UserX, Clock, Bed, ArrowRight } from "lucide-react";

interface PatientExplorerProps {
  patients: PatientRecord[];
  decisions: DecisionRecord[];
}

export const PatientExplorer: React.FC<PatientExplorerProps> = ({ patients, decisions }) => {
  const [selectedId, setSelectedId] = useState<number>(11);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [acuityFilter, setAcuityFilter] = useState<string>("ALL");

  const filteredPatients = patients.filter((p) => {
    if (searchTerm && !p.patient_id.toString().includes(searchTerm)) return false;
    if (statusFilter !== "ALL" && p.terminal_status !== statusFilter) return false;
    if (acuityFilter !== "ALL" && p.acuity.toString() !== acuityFilter) return false;
    return true;
  });

  const selectedPatient = patients.find((p) => p.patient_id === selectedId) || patients[0];
  const patientDecisions = decisions.filter((d) => d.patient_id === selectedId);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Patient Decision Timeline Explorer</h2>
          <p className="text-xs text-slate-500">
            Inspect granular online decisions, priority formulas, and audit explanations for any patient
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID (1-500)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-2.5 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 w-32"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-md py-1 px-2 text-slate-700 bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="ADMITTED">Admitted</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={acuityFilter}
            onChange={(e) => setAcuityFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-md py-1 px-2 text-slate-700 bg-white"
          >
            <option value="ALL">All Acuities</option>
            <option value="1">Level 1</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Patient Selection List */}
        <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col h-80">
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 text-xs font-semibold text-slate-700 flex justify-between">
            <span>Patient Roster</span>
            <span className="text-slate-400">{filteredPatients.length} shown</span>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
            {filteredPatients.slice(0, 80).map((p) => {
              const isSelected = p.patient_id === selectedId;
              const isAdmitted = p.terminal_status === "ADMITTED";

              return (
                <button
                  key={p.patient_id}
                  onClick={() => setSelectedId(p.patient_id)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors ${
                    isSelected ? "bg-emerald-50 text-emerald-900 font-semibold" : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono">#{p.patient_id}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${
                        p.acuity === 3
                          ? "bg-rose-100 text-rose-800"
                          : p.acuity === 2
                          ? "bg-amber-100 text-amber-800"
                          : "bg-sky-100 text-sky-800"
                      }`}
                    >
                      L{p.acuity}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-400 font-mono">{(p.waiting_time ?? 0).toFixed(1)}m wait</span>
                    {isAdmitted ? (
                      <span className="text-emerald-600 font-medium">{p.bed_type}</span>
                    ) : (
                      <span className="text-rose-600 font-medium">REJ</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Patient Details & Decision History */}
        <div className="lg:col-span-2 border border-slate-200 rounded-lg p-4 flex flex-col justify-between">
          <div>
            {/* Header info */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-900 font-mono">
                    Patient #{selectedPatient?.patient_id ?? selectedId}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      selectedPatient?.acuity === 3
                        ? "bg-rose-100 text-rose-800 border border-rose-200"
                        : selectedPatient?.acuity === 2
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-sky-100 text-sky-800 border border-sky-200"
                    }`}
                  >
                    Acuity Level {selectedPatient?.acuity ?? 1} (Weight: {selectedPatient?.acuity === 3 ? "8x" : selectedPatient?.acuity === 2 ? "3x" : "1x"})
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Arrived at simulation clock: <span className="font-mono font-medium">{(selectedPatient?.arrival_time ?? 0).toFixed(2)} min</span>
                </p>
              </div>

              <div>
                {selectedPatient?.terminal_status === "ADMITTED" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <UserCheck className="w-3.5 h-3.5" />
                    ADMITTED ({selectedPatient?.bed_type || "Bed"})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                    <UserX className="w-3.5 h-3.5" />
                    DIVERTED (Regional Network at 240m)
                  </span>
                )}
              </div>
            </div>

            {/* Metric grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Total Wait</span>
                <span className="text-sm font-bold text-slate-900 font-mono">{(selectedPatient?.waiting_time ?? 0).toFixed(2)} min</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Realized LOS</span>
                <span className="text-sm font-bold text-slate-900 font-mono">{(selectedPatient?.actual_los ?? 0).toFixed(2)} min</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Admission Time</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {selectedPatient?.admission_time && !isNaN(Number(selectedPatient.admission_time)) ? `${Number(selectedPatient.admission_time).toFixed(2)} min` : "N/A"}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Departure Time</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {selectedPatient?.departure_time && !isNaN(Number(selectedPatient.departure_time)) ? `${Number(selectedPatient.departure_time).toFixed(2)} min` : "N/A"}
                </span>
              </div>
            </div>

            {/* Decision sequence log */}
            <div>
              <span className="text-xs font-semibold text-slate-700 block mb-2">Audit Decision Trail:</span>
              <div className="space-y-2">
                {patientDecisions.map((d, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-md border border-slate-200 bg-slate-50 text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        t = {(d.decision_time ?? 0).toFixed(2)} min
                      </span>
                      <span
                        className={`font-semibold px-2 py-0.2 rounded text-[10px] ${
                          d.decision === "ADMITTED"
                            ? "bg-emerald-100 text-emerald-800"
                            : d.decision === "REJECTED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {d.decision} {d.bed_type !== "NONE" ? `→ ${d.bed_type}` : ""}
                      </span>
                    </div>

                    <p className="text-slate-600 italic">"{d.reason}"</p>

                    {d.decision === "ADMITTED" && (
                      <div className="text-[11px] text-slate-500 font-mono mt-1 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                        <span>Online Priority Score: <strong className="text-emerald-700">{(d.priority_score ?? 0).toFixed(1)}</strong></span>
                        <span>Wait at Decision: {(d.waiting_time ?? 0).toFixed(1)} min</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            {selectedPatient?.terminal_status === "REJECTED" ? (
              <span className="text-amber-800 font-medium">
                Hospital Overflow Protocol: Patient #{selectedPatient?.patient_id} was held in the ED Virtual Holding Lounge while compatible inpatient beds were full. Upon reaching the clinical safety limit (240.0 minutes elapsed wait), the patient was shifted/diverted to the Regional Partner Hospital Network.
              </span>
            ) : (
              <span>
                Observation boundary: The allocation policy strictly operated without observing realized LOS ({(selectedPatient?.actual_los ?? 0).toFixed(1)}m) until after bed assignment occurred.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
