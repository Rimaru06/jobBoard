/**
 * Supabase-generated database types.
 *
 * This file mirrors the shape produced by the Supabase CLI:
 *   npx supabase gen types typescript --local > types/database.ts
 * (or --project-id <ref> for a remote project — see README).
 *
 * It's checked in (hand-maintained to match supabase/migrations/ until
 * the CLI is run against a live database) so the app type-checks
 * without a network/DB dependency. Regenerate after every migration.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          pin_hash: string;
          role: Database["public"]["Enums"]["user_role"];
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          pin_hash: string;
          role?: Database["public"]["Enums"]["user_role"];
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          pin_hash?: string;
          role?: Database["public"]["Enums"]["user_role"];
          created_at?: string;
        };
        Relationships: [];
      };
      invite_tokens: {
        Row: {
          id: string;
          token_hash: string;
          assigned_name: string;
          is_used: boolean;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          token_hash: string;
          assigned_name: string;
          is_used?: boolean;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          token_hash?: string;
          assigned_name?: string;
          is_used?: boolean;
          used_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      jobs: {
        Row: {
          id: string;
          url: string;
          company: string;
          role: string;
          experience: string | null;
          skills: string[];
          salary: string | null;
          added_by_user_id: string;
          is_filled: boolean;
          search_text: string;
          extraction_status: Database["public"]["Enums"]["extraction_status"];
          extraction_raw: Json | null;
          extraction_failure_reason: string | null;
          extraction_retry_count: number;
          extraction_attempted_at: string | null;
          whatsapp_notified_by: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          url: string;
          company: string;
          role: string;
          experience?: string | null;
          skills?: string[];
          salary?: string | null;
          added_by_user_id: string;
          is_filled?: boolean;
          search_text?: string;
          extraction_status?: Database["public"]["Enums"]["extraction_status"];
          extraction_raw?: Json | null;
          extraction_failure_reason?: string | null;
          extraction_retry_count?: number;
          extraction_attempted_at?: string | null;
          whatsapp_notified_by?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          url?: string;
          company?: string;
          role?: string;
          experience?: string | null;
          skills?: string[];
          salary?: string | null;
          added_by_user_id?: string;
          is_filled?: boolean;
          search_text?: string;
          extraction_status?: Database["public"]["Enums"]["extraction_status"];
          extraction_raw?: Json | null;
          extraction_failure_reason?: string | null;
          extraction_retry_count?: number;
          extraction_attempted_at?: string | null;
          whatsapp_notified_by?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_added_by_user_id_fkey";
            columns: ["added_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_job_interactions: {
        Row: {
          user_id: string;
          job_id: string;
          status: Database["public"]["Enums"]["job_status"];
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          job_id: string;
          status?: Database["public"]["Enums"]["job_status"];
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          job_id?: string;
          status?: Database["public"]["Enums"]["job_status"];
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_job_interactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_job_interactions_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      job_connections: {
        Row: {
          user_id: string;
          job_id: string;
          type: Database["public"]["Enums"]["connection_type"];
        };
        Insert: {
          user_id: string;
          job_id: string;
          type: Database["public"]["Enums"]["connection_type"];
        };
        Update: {
          user_id?: string;
          job_id?: string;
          type?: Database["public"]["Enums"]["connection_type"];
        };
        Relationships: [
          {
            foreignKeyName: "job_connections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_connections_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {};
    Functions: {
      append_whatsapp_notifier: {
        Args: { p_job_id: string; p_user_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: "admin" | "friend";
      job_status: "Draft" | "Applied" | "Interviewing" | "Offered" | "Rejected";
      connection_type: "referral" | "knows_someone";
      extraction_status: "pending" | "done" | "failed";
    };
    CompositeTypes: {};
  };
};

// ── Convenience aliases ──────────────────────────────────────────
// Derived from Database rather than hand-duplicated, so schema
// changes only ever need to happen in the Tables/Enums shape above.

export type UserRole = Database["public"]["Enums"]["user_role"];
export type JobStatus = Database["public"]["Enums"]["job_status"];
export type ConnectionType = Database["public"]["Enums"]["connection_type"];
export type ExtractionStatus = Database["public"]["Enums"]["extraction_status"];

export type User = Database["public"]["Tables"]["users"]["Row"];
export type InviteToken = Database["public"]["Tables"]["invite_tokens"]["Row"];
export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type UserJobInteraction = Database["public"]["Tables"]["user_job_interactions"]["Row"];
export type JobConnection = Database["public"]["Tables"]["job_connections"]["Row"];

/** Composite shape used by the UI: a job plus the current viewer's
 *  interaction state and who (if anyone) has a connection to it. */
export interface JobWithContext extends Job {
  added_by: Pick<User, "id" | "name">;
  viewer_interaction: UserJobInteraction | null;
  connections: (JobConnection & { user: Pick<User, "id" | "name"> })[];
}
