export interface BenchmarkMetrics {
  Uwait: number;
  Ucritical: number;
  Ureject: number;
  Uspecialized: number;
  overall_score: number;
  weighted_wait: number;
  critical_wait: number;
  number_admitted: number;
  number_rejected: number;
  number_waiting_at_end: number;
  average_wait: number;
  median_wait: number;
  p95_wait: number;
  max_wait: number;
  general_bed_utilization: number;
  monitored_bed_utilization: number;
  critical_bed_utilization: number;
  total_bed_utilization: number;
  avoidable_specialized_assignments: number;
  runtime_seconds: number;
  seed: number;
  number_of_patients: number;
}

export interface ValidationCheck {
  check: string;
  passed: boolean;
  detail: string;
}

export interface ValidationReport {
  validation_passed: boolean;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  checks: ValidationCheck[];
}

export interface PolicyComparisonItem {
  Policy: string;
  "Overall Score": number;
  Uwait: number;
  Ucritical: number;
  Ureject: number;
  Uspecialized: number;
  Admitted: number;
  Rejected: number;
  "Avg Wait (min)": number;
  "P95 Wait (min)": number;
  "Avoidable Violations": number;
  "Runtime (s)": number;
}

export interface OccupancyPoint {
  time: number;
  general_occupied: number;
  general_capacity: number;
  monitored_occupied: number;
  monitored_capacity: number;
  critical_occupied: number;
  critical_capacity: number;
  total_occupied: number;
  total_capacity: number;
}

export interface PatientRecord {
  patient_id: number;
  arrival_time: number;
  acuity: number;
  terminal_status: "ADMITTED" | "REJECTED";
  admission_time: number | string;
  departure_time: number | string;
  bed_type: string;
  actual_los: number;
  waiting_time: number;
}

export interface DecisionRecord {
  patient_id: number;
  arrival_time: number;
  acuity: number;
  decision_time: number;
  decision: "ADMITTED" | "WAITING" | "REJECTED";
  bed_type: string;
  waiting_time: number;
  priority_score: number;
  reason: string;
  admission_time: number | null;
  departure_time: number | null;
  length_of_stay: number;
}

export interface WaitingPatientInfo {
  patient_id: string;
  acuity: string;
  acuity_raw: number;
  wait: string;
  wait_raw: number;
  weight: string;
  compatible_beds: string;
  preferred_bed: string;
  priority: number;
  status: string;
  location?: string;
  time_to_timeout?: number;
  timeout_threshold?: number;
  shift_target?: string;
}

export interface LivePolicyDecision {
  patient_id: number;
  acuity: number;
  waiting_time: number;
  decision: string;
  bed_type: string;
  reason: string;
  priority_score: number;
  decision_time: number;
}

export interface LiveEventItem {
  time: number;
  type: string;
  title: string;
  patient_id?: number;
  desc: string;
}

export interface LiveSimulationState {
  simulation_time: number;
  event_type: string;
  event_pid?: number | null;
  patients_arrived: number;
  patients_admitted: number;
  patients_rejected: number;
  patients_waiting: number;
  occupancy: {
    General: number;
    Monitored: number;
    Critical: number;
  };
  capacities: {
    General: number;
    Monitored: number;
    Critical: number;
  };
  waiting_patients: WaitingPatientInfo[];
  latest_decision: LivePolicyDecision | null;
  recent_events: LiveEventItem[];
  occupancy_records: Array<{
    time: number;
    general_occupied: number;
    monitored_occupied: number;
    critical_occupied: number;
    total_occupied: number;
  }>;
  metrics: {
    Uwait: number;
    Ucritical: number;
    Ureject: number;
    Uspecialized: number;
    overall_score: number;
    composite_score?: number;
    average_wait: number;
    p95_wait: number;
    number_admitted: number;
    number_rejected: number;
    avoidable_specialized_assignments: number;
  };
  avoidable_violations: number;
  is_finished?: boolean;
}

