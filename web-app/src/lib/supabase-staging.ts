// Supabase types for staging tables

export type StagingItem = {
  id: string;
  airtable_id: string;
  brand_name: string | null;
  model: string | null;
  primary_use: string | null;
  surface_type: string | null;
  heel_height: number | null;
  forefoot_height: number | null;
  drop: number | null;
  weight: number | null;
  price: number | null;
  carbon_plate: boolean | null;
  waterproof: boolean | null;
  date: string | null;
  source_link: string | null;
  cushioning_type: string | null;
  foot_width: string | null;
  upper_breathability: string | null;
  is_edited: boolean;
  created_at: string;
};

export type ApprovalLog = {
  id: string;
  approved_at: string;
  approved_by: string | null;
  total_approved: number;
  brand_counts: Record<string, number>;
  total_in_shoe_results: number;
  metadata: Record<string, any> | null;
};

export type StagingInsert = Omit<StagingItem, 'id' | 'created_at'>;

export type ApprovalLogInsert = Omit<ApprovalLog, 'id' | 'approved_at'>;
