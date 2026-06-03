export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          brand_color: string | null
          brand_color_fg: string | null
          brand_color_light: string | null
          created_at: string
          created_by: string | null
          document: string | null
          email: string | null
          id: string
          legal_name: string | null
          logo_url: string | null
          name: string
          phone: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          brand_color?: string | null
          brand_color_fg?: string | null
          brand_color_light?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          brand_color?: string | null
          brand_color_fg?: string | null
          brand_color_light?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: Json
          agency_id: string
          birth_date: string | null
          created_at: string
          document: string | null
          email: string | null
          full_name: string
          id: string
          kind: Database["public"]["Enums"]["client_kind"]
          legal_name: string | null
          nationality: string | null
          notes: string | null
          owner_id: string | null
          phone: string | null
          tags: string[]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: Json
          agency_id: string
          birth_date?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          full_name: string
          id?: string
          kind?: Database["public"]["Enums"]["client_kind"]
          legal_name?: string | null
          nationality?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: Json
          agency_id?: string
          birth_date?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          full_name?: string
          id?: string
          kind?: Database["public"]["Enums"]["client_kind"]
          legal_name?: string | null
          nationality?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          agency_id: string
          author_id: string | null
          content: string | null
          created_at: string
          id: string
          lead_id: string
          metadata: Json
          type: Database["public"]["Enums"]["lead_activity_type"]
        }
        Insert: {
          agency_id: string
          author_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          lead_id: string
          metadata?: Json
          type: Database["public"]["Enums"]["lead_activity_type"]
        }
        Update: {
          agency_id?: string
          author_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          metadata?: Json
          type?: Database["public"]["Enums"]["lead_activity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_stages: {
        Row: {
          agency_id: string
          color: string
          created_at: string
          id: string
          is_lost: boolean
          is_won: boolean
          name: string
          position: number
        }
        Insert: {
          agency_id: string
          color?: string
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name: string
          position: number
        }
        Update: {
          agency_id?: string
          color?: string
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_stages_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          agency_id: string
          client_id: string | null
          closed_at: string | null
          converted_at: string | null
          created_at: string
          destination: string | null
          email: string | null
          estimated_value: number | null
          id: string
          lost_reason: string | null
          name: string
          notes: string | null
          owner_id: string | null
          pax_count: number | null
          phone: string | null
          position: number
          source: string | null
          stage_id: string
          travel_end: string | null
          travel_start: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          client_id?: string | null
          closed_at?: string | null
          converted_at?: string | null
          created_at?: string
          destination?: string | null
          email?: string | null
          estimated_value?: number | null
          id?: string
          lost_reason?: string | null
          name: string
          notes?: string | null
          owner_id?: string | null
          pax_count?: number | null
          phone?: string | null
          position?: number
          source?: string | null
          stage_id: string
          travel_end?: string | null
          travel_start?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          client_id?: string | null
          closed_at?: string | null
          converted_at?: string | null
          created_at?: string
          destination?: string | null
          email?: string | null
          estimated_value?: number | null
          id?: string
          lost_reason?: string | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          pax_count?: number | null
          phone?: string | null
          position?: number
          source?: string | null
          stage_id?: string
          travel_end?: string | null
          travel_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "lead_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_agency_id: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_agency_id?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_agency_id?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_agency_id_fkey"
            columns: ["default_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_items: {
        Row: {
          agency_id: string
          cost_price: number
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          kind: Database["public"]["Enums"]["proposal_item_kind"]
          metadata: Json
          position: number
          proposal_id: string
          quantity: number
          start_date: string | null
          supplier_id: string | null
          title: string
          total: number | null
          unit_price: number
        }
        Insert: {
          agency_id: string
          cost_price?: number
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["proposal_item_kind"]
          metadata?: Json
          position?: number
          proposal_id: string
          quantity?: number
          start_date?: string | null
          supplier_id?: string | null
          title: string
          total?: number | null
          unit_price?: number
        }
        Update: {
          agency_id?: string
          cost_price?: number
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["proposal_item_kind"]
          metadata?: Json
          position?: number
          proposal_id?: string
          quantity?: number
          start_date?: string | null
          supplier_id?: string | null
          title?: string
          total?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          agency_id: string
          client_id: string | null
          created_at: string
          currency: string
          decided_at: string | null
          destination: string | null
          discount: number
          id: string
          lead_id: string | null
          notes: string | null
          number: number
          owner_id: string | null
          pax_adults: number
          pax_children: number
          pax_infants: number
          public_token: string
          sent_at: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          subtotal: number
          terms: string | null
          title: string
          total: number
          travel_end: string | null
          travel_start: string | null
          updated_at: string
          valid_until: string | null
          viewed_at: string | null
        }
        Insert: {
          agency_id: string
          client_id?: string | null
          created_at?: string
          currency?: string
          decided_at?: string | null
          destination?: string | null
          discount?: number
          id?: string
          lead_id?: string | null
          notes?: string | null
          number?: number
          owner_id?: string | null
          pax_adults?: number
          pax_children?: number
          pax_infants?: number
          public_token?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          subtotal?: number
          terms?: string | null
          title: string
          total?: number
          travel_end?: string | null
          travel_start?: string | null
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
        }
        Update: {
          agency_id?: string
          client_id?: string | null
          created_at?: string
          currency?: string
          decided_at?: string | null
          destination?: string | null
          discount?: number
          id?: string
          lead_id?: string | null
          notes?: string | null
          number?: number
          owner_id?: string | null
          pax_adults?: number
          pax_children?: number
          pax_infants?: number
          public_token?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          subtotal?: number
          terms?: string | null
          title?: string
          total?: number
          travel_end?: string | null
          travel_start?: string | null
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          agency_id: string
          commission_rate: number
          contact_name: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["supplier_kind"]
          legal_name: string | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          agency_id: string
          commission_rate?: number
          contact_name?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["supplier_kind"]
          legal_name?: string | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          agency_id?: string
          commission_rate?: number
          contact_name?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["supplier_kind"]
          legal_name?: string | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_passengers: {
        Row: {
          agency_id: string
          birth_date: string | null
          client_id: string | null
          created_at: string
          document: string | null
          document_type: string | null
          email: string | null
          full_name: string
          id: string
          is_lead_passenger: boolean
          kind: Database["public"]["Enums"]["passenger_kind"]
          nationality: string | null
          notes: string | null
          phone: string | null
          trip_id: string
        }
        Insert: {
          agency_id: string
          birth_date?: string | null
          client_id?: string | null
          created_at?: string
          document?: string | null
          document_type?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_lead_passenger?: boolean
          kind?: Database["public"]["Enums"]["passenger_kind"]
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          trip_id: string
        }
        Update: {
          agency_id?: string
          birth_date?: string | null
          client_id?: string | null
          created_at?: string
          document?: string | null
          document_type?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_lead_passenger?: boolean
          kind?: Database["public"]["Enums"]["passenger_kind"]
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_passengers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_passengers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_passengers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          agency_id: string
          client_id: string | null
          code: string | null
          created_at: string
          currency: string
          destination: string | null
          id: string
          notes: string | null
          number: number
          owner_id: string | null
          proposal_id: string | null
          status: Database["public"]["Enums"]["trip_status"]
          title: string
          total_cost: number
          total_sale: number
          travel_end: string | null
          travel_start: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          client_id?: string | null
          code?: string | null
          created_at?: string
          currency?: string
          destination?: string | null
          id?: string
          notes?: string | null
          number?: number
          owner_id?: string | null
          proposal_id?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          title: string
          total_cost?: number
          total_sale?: number
          travel_end?: string | null
          travel_start?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          client_id?: string | null
          code?: string | null
          created_at?: string
          currency?: string
          destination?: string | null
          id?: string
          notes?: string | null
          number?: number
          owner_id?: string | null
          proposal_id?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          title?: string
          total_cost?: number
          total_sale?: number
          travel_end?: string | null
          travel_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          agency_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      agency_id_by_slug: { Args: { _slug: string }; Returns: string }
      has_role: {
        Args: {
          _agency_id?: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_agency_member: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "agency_admin" | "agent" | "client"
      client_kind: "individual" | "company"
      lead_activity_type:
        | "note"
        | "stage_change"
        | "call"
        | "email"
        | "whatsapp"
        | "meeting"
        | "task"
      passenger_kind: "adult" | "child" | "infant"
      proposal_item_kind:
        | "flight"
        | "hotel"
        | "transfer"
        | "tour"
        | "insurance"
        | "car_rental"
        | "cruise"
        | "visa"
        | "fee"
        | "discount"
        | "other"
      proposal_status:
        | "draft"
        | "sent"
        | "viewed"
        | "accepted"
        | "rejected"
        | "expired"
        | "converted"
      supplier_kind:
        | "airline"
        | "hotel"
        | "operator"
        | "insurance"
        | "transfer"
        | "car_rental"
        | "cruise"
        | "activity"
        | "visa"
        | "other"
      trip_status:
        | "planning"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "agency_admin", "agent", "client"],
      client_kind: ["individual", "company"],
      lead_activity_type: [
        "note",
        "stage_change",
        "call",
        "email",
        "whatsapp",
        "meeting",
        "task",
      ],
      passenger_kind: ["adult", "child", "infant"],
      proposal_item_kind: [
        "flight",
        "hotel",
        "transfer",
        "tour",
        "insurance",
        "car_rental",
        "cruise",
        "visa",
        "fee",
        "discount",
        "other",
      ],
      proposal_status: [
        "draft",
        "sent",
        "viewed",
        "accepted",
        "rejected",
        "expired",
        "converted",
      ],
      supplier_kind: [
        "airline",
        "hotel",
        "operator",
        "insurance",
        "transfer",
        "car_rental",
        "cruise",
        "activity",
        "visa",
        "other",
      ],
      trip_status: [
        "planning",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
