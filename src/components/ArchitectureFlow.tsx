import React from "react";
import { Terminal, Shield, ArrowRight, Layers, Clock, Cpu } from "lucide-react";

export const ArchitectureFlow: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-900">System Architecture & Information Firewall</h2>
        <p className="text-xs text-slate-500">
          Strict separation of discrete-event simulator environment from online decision policy
        </p>
      </div>

      {/* Visual Pipeline Flow */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs mb-6">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 relative">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold mb-1">
            <Clock className="w-4 h-4 text-sky-600" />
            <span>1. Patient Arrival</span>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            Patient arrives via Poisson process (t_arr). Realized LOS is sealed in simulator state; never revealed to policy.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 relative">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold mb-1">
            <Shield className="w-4 h-4 text-amber-600" />
            <span>2. Immutable View</span>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            Policy receives frozen <code className="font-mono text-[10px] bg-slate-200 px-1 rounded">PatientObservation</code>: elapsed wait, acuity, order. Zero future queue access.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 relative">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold mb-1">
            <Cpu className="w-4 h-4 text-emerald-600" />
            <span>3. Online Priority Engine</span>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            Computes priority = weight * urgency + aging. Critical bed reservation strictly protects Level 3 patients from starvation.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 relative">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold mb-1">
            <Layers className="w-4 h-4 text-purple-600" />
            <span>4. Bed Allocation & Free</span>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            Admitted patient stays for full realized LOS. Departure at t_dep frees bed capacity, immediately re-triggering allocation.
          </p>
        </div>
      </div>

      {/* Overflow Lifecycle: Where Patients Go When Beds Are Full */}
      <div className="mb-6 bg-amber-50/60 border border-amber-200/80 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-600" />
            Patient Shift & Overflow Protocol (When All Beds Are Full)
          </h3>
          <span className="text-[10px] bg-amber-200/70 text-amber-900 font-bold px-2 py-0.5 rounded-full">
            Clinical Safety Protocol
          </span>
        </div>
        <p className="text-xs text-amber-900/80 mb-3 leading-relaxed">
          When all 45 beds (or compatible bed tiers) are occupied, patients are never dropped or left unmanaged. They follow this deterministic 3-stage shift protocol:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-white border border-amber-200 rounded-lg p-3 shadow-xs">
            <div className="flex items-center gap-2 text-slate-800 font-bold mb-1">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] flex items-center justify-center font-mono">1</span>
              <span>Shift to ED Holding Lounge</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-normal">
              Patients are shifted to the <strong>ED Virtual Holding Lounge</strong> (Queue Buffer). They are actively monitored and sorted dynamically by clinical priority score (<span className="font-mono text-amber-800">w_a × elapsed_wait</span>).
            </p>
          </div>

          <div className="bg-white border border-emerald-200 rounded-lg p-3 shadow-xs">
            <div className="flex items-center gap-2 text-slate-800 font-bold mb-1">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] flex items-center justify-center font-mono">2A</span>
              <span>Bed Opens → Promoted to Bed</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-normal">
              When an admitted patient is discharged (<code className="font-mono text-[10px] bg-emerald-50 text-emerald-800 px-1 py-0.5 rounded">DEPARTURE</code> event), the highest-priority compatible patient in the holding lounge is immediately shifted into the vacant bed.
            </p>
          </div>

          <div className="bg-white border border-rose-200 rounded-lg p-3 shadow-xs">
            <div className="flex items-center gap-2 text-slate-800 font-bold mb-1">
              <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 text-[10px] flex items-center justify-center font-mono">2B</span>
              <span>240m Timeout → Regional Transfer</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-normal">
              If beds remain full for 240.0 minutes, the patient reaches the clinical safety threshold and is shifted to the <strong>Regional Partner Hospital Network</strong> (Emergency Transfer / Rejection) to prevent adverse clinical deterioration.
            </p>
          </div>
        </div>
      </div>

      {/* Copyable CLI Commands */}
      <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-xs">
        <div className="flex items-center gap-2 text-slate-400 text-[11px] mb-2 font-sans font-semibold">
          <Terminal className="w-3.5 h-3.5" />
          <span>Reproduce in Terminal:</span>
        </div>
        <div className="space-y-1.5 text-emerald-400">
          <div><span className="text-slate-500"># Run benchmark and export all 6 artifacts to ./output/</span></div>
          <div><span className="text-slate-200">$</span> python run_experiment.py</div>
          <div className="pt-1"><span className="text-slate-500"># Run 12-point formal verification suite</span></div>
          <div><span className="text-slate-200">$</span> python validate.py</div>
          <div className="pt-1"><span className="text-slate-500"># Launch Streamlit dashboard</span></div>
          <div><span className="text-slate-200">$</span> streamlit run dashboard/app.py</div>
        </div>
      </div>
    </div>
  );
};
