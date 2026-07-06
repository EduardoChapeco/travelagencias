import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ExtendedDatabase = Database & {
  public: {
    Tables: Database["public"]["Tables"] & {
      channels: {
        Row: {
          id: string;
          agency_id: string;
          type: "whatsapp" | "email" | "webchat";
          display_name: string;
          external_id: string;
          credentials_encrypted: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          agency_id: string;
          type: "whatsapp" | "email" | "webchat";
          display_name: string;
          external_id: string;
          credentials_encrypted?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          agency_id?: string;
          type?: "whatsapp" | "email" | "webchat";
          display_name?: string;
          external_id?: string;
          credentials_encrypted?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          agency_id: string;
          name: string | null;
          phone: string | null;
          email: string | null;
          metadata: any | null;
          lead_id: string | null;
          client_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agency_id: string;
          name?: string | null;
          phone?: string | null;
          email?: string | null;
          metadata?: any | null;
          lead_id?: string | null;
          client_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          agency_id?: string;
          name?: string | null;
          phone?: string | null;
          email?: string | null;
          metadata?: any | null;
          lead_id?: string | null;
          client_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          agency_id: string;
          channel_id: string;
          contact_id: string;
          assigned_user_id: string | null;
          assigned_team: string | null;
          status: "open" | "pending" | "snoozed" | "closed";
          ai_mode: boolean;
          last_message_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agency_id: string;
          channel_id: string;
          contact_id: string;
          assigned_user_id?: string | null;
          assigned_team?: string | null;
          status?: "open" | "pending" | "snoozed" | "closed";
          ai_mode?: boolean;
          last_message_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          agency_id?: string;
          channel_id?: string;
          contact_id?: string;
          assigned_user_id?: string | null;
          assigned_team?: string | null;
          status?: "open" | "pending" | "snoozed" | "closed";
          ai_mode?: boolean;
          last_message_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          agency_id: string;
          direction: "inbound" | "outbound";
          sender_user_id: string | null;
          body: string | null;
          media_url: string | null;
          status: "queued" | "sent" | "delivered" | "read" | "failed";
          external_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          agency_id: string;
          direction: "inbound" | "outbound";
          sender_user_id?: string | null;
          body?: string | null;
          media_url?: string | null;
          status?: "queued" | "sent" | "delivered" | "read" | "failed";
          external_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          agency_id?: string;
          direction?: "inbound" | "outbound";
          sender_user_id?: string | null;
          body?: string | null;
          media_url?: string | null;
          status?: "queued" | "sent" | "delivered" | "read" | "failed";
          external_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
  };
};

export type InboxClient = SupabaseClient<ExtendedDatabase>;
