export interface Worker {
  id: string;
  collectionId: string;
  collectionName: string;
  name: string;
  email: string;
  phone?: string;
  worker_level: number;
  hourly_rate: number;
  experience_hours: number;
  location_lat?: number;
  location_lng?: number;
  available: boolean;
  certifications: Certification[];
  trainings: Training[];
  business_id: string;
  created: string;
  updated: string;
}

export interface Participant {
  id: string;
  collectionId: string;
  collectionName: string;
  name: string;
  date_of_birth?: string;
  ndis_number?: string;
  funding_budget_total: number;
  funding_spent: number;
  location_lat?: number;
  location_lng?: number;
  care_requirements: any;
  business_id: string;
  created: string;
  updated: string;
}

export interface Shift {
  id: string;
  collectionId: string;
  collectionName: string;
  start_time: string;
  end_time: string;
  status: 'draft' | 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  estimated_cost?: number;
  participant_id: string;
  assigned_worker_id?: string;
  required_certifications: any;
  required_trainings: any;
  business_id: string;
  created: string;
  updated: string;
}

export interface Certification {
  certification_id: string;
  name: string;
  expiry_date?: string;
  is_valid: boolean;
}

export interface Training {
  training_id: string;
  name: string;
  completed_date?: string;
  status: 'completed' | 'in_progress' | 'not_started';
}

export interface Business {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  abn?: string;
}

export interface ComplianceOverride {
  id: string;
  rule_name: string;
  is_overridden: boolean;
  override_reason?: string;
  overridden_by?: string;
  overridden_at?: string;
  expires_at?: string;
  business_id: string;
}

export interface AuditLog {
  id: string;
  action: 'create' | 'update' | 'delete' | 'override';
  entity_type: string;
  entity_id: string;
  changes?: any;
  performed_by?: string;
  performed_at: string;
  ip_address?: string;
  business_id: string;
}
