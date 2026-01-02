import pb, { getAuthHeaders } from './pocketbase';

// SCHADS Engine API
const SCHADS_BASE_URL = process.env.NEXT_PUBLIC_SCHADS_ENGINE_URL || 'http://localhost:8001';

// Matching Engine API
const MATCHING_BASE_URL = process.env.NEXT_PUBLIC_MATCHING_ENGINE_URL || 'http://localhost:8002';

export interface SCHADSCalculationRequest {
  base_hourly_rate: number;
  worker_level: number;
  start_time: string;
  end_time: string;
  is_sleepover?: boolean;
  public_holiday?: string;
  previous_shift_end?: string;
}

export interface SCHADSCalculationResponse {
  total_hours: number;
  ordinary_hours: number;
  overtime_hours: number;
  shift_type: string;
  penalty_multipliers: any[];
  breakdown: any[];
  total_cost: number;
  min_break_required_hours: number;
  break_compliance?: any;
  warnings: string[];
}

export interface WorkerProfile {
  worker_id: string;
  full_name: string;
  hourly_rate: number;
  certifications: any[];
  trainings: any[];
  experience_hours: number;
  location_lat?: number;
  location_lng?: number;
  available: boolean;
  worker_level: number;
  previous_shift_end?: string;
}

export interface MatchingRequest {
  shift_requirements: {
    shift_id: string;
    participant_id: string;
    participant_location_lat: number;
    participant_location_lng: number;
    required_certifications: any[];
    required_trainings: any[];
    shift_start: string;
    shift_end: string;
    budget_limit?: number;
  };
  candidate_workers: WorkerProfile[];
  include_excluded?: boolean;
}

export interface MatchingResponse {
  shift_id: string;
  total_candidates: number;
  eligible_workers: number;
  ranked_matches: any[];
  weights: any;
  max_distance_km: number;
  timestamp: string;
}

// SCHADS API Functions
export async function calculateSCHADS(
  request: SCHADSCalculationRequest
): Promise<SCHADSCalculationResponse> {
  const response = await fetch(`${SCHADS_BASE_URL}/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`SCHADS calculation failed: ${response.statusText}`);
  }

  return response.json();
}

// Matching API Functions
export async function matchWorkers(
  request: MatchingRequest
): Promise<MatchingResponse> {
  const response = await fetch(`${MATCHING_BASE_URL}/match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Matching failed: ${response.statusText}`);
  }

  return response.json();
}

// PocketBase Functions
export async function getWorkers() {
  return pb.collection('workers').getList(1, 50, {
    expand: 'certifications,trainings',
  });
}

export async function getParticipants() {
  return pb.collection('participants').getList(1, 50);
}

export async function createShift(shiftData: any) {
  return pb.collection('shifts').create(shiftData);
}

export async function getComplianceOverrides(businessId: string) {
  return pb.collection('compliance_overrides').getList(1, 100, {
    filter: `business_id = "${businessId}"`,
  });
}
