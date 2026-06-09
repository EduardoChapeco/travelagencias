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
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          brand_color?: string | null
          brand_color_fg?: string | null
          brand_color_light?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          brand_color?: string | null
          brand_color_fg?: string | null
          brand_color_light?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      agency_invites: {
        Row: {
          accepted_at: string | null
          agency_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          agency_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          agency_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: []
      }
      agency_private: {
        Row: {
          agency_id: string
          created_at: string
          document: string | null
          email: string | null
          legal_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          document?: string | null
          email?: string | null
          legal_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          document?: string | null
          email?: string | null
          legal_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_private_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_tags: {
        Row: {
          agency_id: string
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          agency_id: string
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          agency_id?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          agency_id: string
          content: string
          context: Json
          conversation_id: string
          created_at: string
          id: string
          model: string | null
          provider: string | null
          role: string
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          agency_id: string
          content: string
          context?: Json
          conversation_id: string
          created_at?: string
          id?: string
          model?: string | null
          provider?: string | null
          role: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          agency_id?: string
          content?: string
          context?: Json
          conversation_id?: string
          created_at?: string
          id?: string
          model?: string | null
          provider?: string | null
          role?: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ai_rate_limit: {
        Row: {
          agency_id: string
          bucket_start: string
          count: number
        }
        Insert: {
          agency_id: string
          bucket_start: string
          count?: number
        }
        Update: {
          agency_id?: string
          bucket_start?: string
          count?: number
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          agency_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          key_value: string
          label: string | null
          monthly_limit: number | null
          provider: string
          updated_at: string
          used_count: number
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          key_value: string
          label?: string | null
          monthly_limit?: number | null
          provider: string
          updated_at?: string
          used_count?: number
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          key_value?: string
          label?: string | null
          monthly_limit?: number | null
          provider?: string
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string | null
          agency_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: number
          ip_address: string | null
          metadata: Json
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string | null
          agency_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          ip_address?: string | null
          metadata?: Json
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string | null
          agency_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          ip_address?: string | null
          metadata?: Json
          user_agent?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          agency_id: string
          author_id: string | null
          category: string | null
          content: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          gbp_post_id: string | null
          id: string
          publish_to_gbp: boolean
          published_at: string | null
          scheduled_for: string | null
          seo: Json
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          agency_id: string
          author_id?: string | null
          category?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          gbp_post_id?: string | null
          id?: string
          publish_to_gbp?: boolean
          published_at?: string | null
          scheduled_for?: string | null
          seo?: Json
          slug: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          agency_id?: string
          author_id?: string | null
          category?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          gbp_post_id?: string | null
          id?: string
          publish_to_gbp?: boolean
          published_at?: string | null
          scheduled_for?: string | null
          seo?: Json
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      boarding_cards: {
        Row: {
          agency_id: string
          airline: string | null
          alerts: string[]
          checklist: Json
          created_at: string
          id: string
          pnr: string | null
          position: number
          status: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          airline?: string | null
          alerts?: string[]
          checklist?: Json
          created_at?: string
          id?: string
          pnr?: string | null
          position?: number
          status?: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          airline?: string | null
          alerts?: string[]
          checklist?: Json
          created_at?: string
          id?: string
          pnr?: string | null
          position?: number
          status?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      brand_kit: {
        Row: {
          agency_id: string
          brand_color: string | null
          brand_color_fg: string | null
          brand_color_light: string | null
          contract_header_img: string | null
          facebook: string | null
          favicon_url: string | null
          font_body: string | null
          font_heading: string | null
          google_analytics_id: string | null
          google_business_id: string | null
          id: string
          instagram: string | null
          logo_dark_url: string | null
          logo_url: string | null
          proposal_header_img: string | null
          proposal_template: string | null
          updated_at: string
          voucher_theme: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          agency_id: string
          brand_color?: string | null
          brand_color_fg?: string | null
          brand_color_light?: string | null
          contract_header_img?: string | null
          facebook?: string | null
          favicon_url?: string | null
          font_body?: string | null
          font_heading?: string | null
          google_analytics_id?: string | null
          google_business_id?: string | null
          id?: string
          instagram?: string | null
          logo_dark_url?: string | null
          logo_url?: string | null
          proposal_header_img?: string | null
          proposal_template?: string | null
          updated_at?: string
          voucher_theme?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          agency_id?: string
          brand_color?: string | null
          brand_color_fg?: string | null
          brand_color_light?: string | null
          contract_header_img?: string | null
          facebook?: string | null
          favicon_url?: string | null
          font_body?: string | null
          font_heading?: string | null
          google_analytics_id?: string | null
          google_business_id?: string | null
          id?: string
          instagram?: string | null
          logo_dark_url?: string | null
          logo_url?: string | null
          proposal_header_img?: string | null
          proposal_template?: string | null
          updated_at?: string
          voucher_theme?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      bus_layouts: {
        Row: {
          agency_id: string
          cols: number
          created_at: string
          id: string
          name: string
          rows: number
          seat_map: Json
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          agency_id: string
          cols?: number
          created_at?: string
          id?: string
          name: string
          rows?: number
          seat_map?: Json
          updated_at?: string
          vehicle_type?: string
        }
        Update: {
          agency_id?: string
          cols?: number
          created_at?: string
          id?: string
          name?: string
          rows?: number
          seat_map?: Json
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_layouts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
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
      company_profiles: {
        Row: {
          address: Json
          agency_id: string
          business_hours: Json
          category: string | null
          cnpj: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          email: string | null
          facebook: string | null
          gallery: string[]
          google_business_id: string | null
          google_maps_url: string | null
          google_reviews_embed: string | null
          id: string
          instagram: string | null
          last_synced_google_at: string | null
          linkedin: string | null
          logo_url: string | null
          name: string
          partner_operators: Json
          payment_methods: string[]
          phone: string | null
          reviews: Json
          short_description: string | null
          tiktok: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          address?: Json
          agency_id: string
          business_hours?: Json
          category?: string | null
          cnpj?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          facebook?: string | null
          gallery?: string[]
          google_business_id?: string | null
          google_maps_url?: string | null
          google_reviews_embed?: string | null
          id?: string
          instagram?: string | null
          last_synced_google_at?: string | null
          linkedin?: string | null
          logo_url?: string | null
          name: string
          partner_operators?: Json
          payment_methods?: string[]
          phone?: string | null
          reviews?: Json
          short_description?: string | null
          tiktok?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          address?: Json
          agency_id?: string
          business_hours?: Json
          category?: string | null
          cnpj?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          facebook?: string | null
          gallery?: string[]
          google_business_id?: string | null
          google_maps_url?: string | null
          google_reviews_embed?: string | null
          id?: string
          instagram?: string | null
          last_synced_google_at?: string | null
          linkedin?: string | null
          logo_url?: string | null
          name?: string
          partner_operators?: Json
          payment_methods?: string[]
          phone?: string | null
          reviews?: Json
          short_description?: string | null
          tiktok?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      contract_clauses_template: {
        Row: {
          clause_text: string
          created_at: string
          id: string
          is_immutable: boolean
          number: number
          section: string
        }
        Insert: {
          clause_text: string
          created_at?: string
          id?: string
          is_immutable?: boolean
          number: number
          section: string
        }
        Update: {
          clause_text?: string
          created_at?: string
          id?: string
          is_immutable?: boolean
          number?: number
          section?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          agency_data: Json
          agency_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          certificate: Json | null
          client_data: Json
          content_hash: string | null
          created_at: string
          custom_clauses: Json
          fixed_clauses: Json
          id: string
          package_summary: string | null
          passengers_data: Json
          payment_terms: string | null
          pdf_url: string | null
          public_token: string | null
          signatures: Json
          signed_at: string | null
          signed_hash: string | null
          status: string
          total_value: number
          trip_id: string
          version: string
        }
        Insert: {
          agency_data?: Json
          agency_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          certificate?: Json | null
          client_data?: Json
          content_hash?: string | null
          created_at?: string
          custom_clauses?: Json
          fixed_clauses?: Json
          id?: string
          package_summary?: string | null
          passengers_data?: Json
          payment_terms?: string | null
          pdf_url?: string | null
          public_token?: string | null
          signatures?: Json
          signed_at?: string | null
          signed_hash?: string | null
          status?: string
          total_value?: number
          trip_id: string
          version?: string
        }
        Update: {
          agency_data?: Json
          agency_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          certificate?: Json | null
          client_data?: Json
          content_hash?: string | null
          created_at?: string
          custom_clauses?: Json
          fixed_clauses?: Json
          id?: string
          package_summary?: string | null
          passengers_data?: Json
          payment_terms?: string | null
          pdf_url?: string | null
          public_token?: string | null
          signatures?: Json
          signed_at?: string | null
          signed_hash?: string | null
          status?: string
          total_value?: number
          trip_id?: string
          version?: string
        }
        Relationships: []
      }
      corporate_clients: {
        Row: {
          agency_id: string
          billing_address: Json
          billing_cycle: string | null
          cnpj: string | null
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          credit_limit: number
          id: string
          industry: string | null
          payment_terms: number | null
          status: string
          travel_policy: Json
          updated_at: string
        }
        Insert: {
          agency_id: string
          billing_address?: Json
          billing_cycle?: string | null
          cnpj?: string | null
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          credit_limit?: number
          id?: string
          industry?: string | null
          payment_terms?: number | null
          status?: string
          travel_policy?: Json
          updated_at?: string
        }
        Update: {
          agency_id?: string
          billing_address?: Json
          billing_cycle?: string | null
          cnpj?: string | null
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          credit_limit?: number
          id?: string
          industry?: string | null
          payment_terms?: number | null
          status?: string
          travel_policy?: Json
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          agency_id: string
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          kind: string
          max_discount: number | null
          min_purchase: number | null
          per_client_limit: number | null
          scope: string
          scope_id: string | null
          starts_at: string
          updated_at: string
          usage_limit: number | null
          used_count: number
          value: number
        }
        Insert: {
          agency_id: string
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          max_discount?: number | null
          min_purchase?: number | null
          per_client_limit?: number | null
          scope?: string
          scope_id?: string | null
          starts_at?: string
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Update: {
          agency_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          max_discount?: number | null
          min_purchase?: number | null
          per_client_limit?: number | null
          scope?: string
          scope_id?: string | null
          starts_at?: string
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_records: {
        Row: {
          agency_id: string
          amount: number
          amount_brl: number | null
          category: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          due_date: string | null
          exchange_rate: number | null
          id: string
          installment_value: number | null
          installments: number
          invoice_number: string | null
          paid_at: string | null
          payment_method: string | null
          public_token: string | null
          receipt_url: string | null
          status: string
          trip_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          amount?: number
          amount_brl?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          installment_value?: number | null
          installments?: number
          invoice_number?: string | null
          paid_at?: string | null
          payment_method?: string | null
          public_token?: string | null
          receipt_url?: string | null
          status?: string
          trip_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          amount?: number
          amount_brl?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          installment_value?: number | null
          installments?: number
          invoice_number?: string | null
          paid_at?: string | null
          payment_method?: string | null
          public_token?: string | null
          receipt_url?: string | null
          status?: string
          trip_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      gift_cards: {
        Row: {
          agency_id: string
          balance: number
          code: string
          created_at: string
          created_by: string | null
          currency: string
          expires_at: string | null
          id: string
          initial_value: number
          message: string | null
          purchased_by_client_id: string | null
          recipient_email: string | null
          recipient_name: string | null
          redeemed_by_client_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          balance?: number
          code: string
          created_at?: string
          created_by?: string | null
          currency?: string
          expires_at?: string | null
          id?: string
          initial_value?: number
          message?: string | null
          purchased_by_client_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          redeemed_by_client_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          balance?: number
          code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          expires_at?: string | null
          id?: string
          initial_value?: number
          message?: string | null
          purchased_by_client_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          redeemed_by_client_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_cards_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_cards_purchased_by_client_id_fkey"
            columns: ["purchased_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_cards_redeemed_by_client_id_fkey"
            columns: ["redeemed_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      global_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      group_tour_enrollments: {
        Row: {
          agency_id: string
          client_id: string | null
          created_at: string
          group_tour_id: string
          id: string
          notes: string | null
          passenger_cpf: string | null
          passenger_name: string
          payment_plan_id: string | null
          room_type: string | null
          seat_number: string | null
          status: string
          total_paid: number
          updated_at: string
        }
        Insert: {
          agency_id: string
          client_id?: string | null
          created_at?: string
          group_tour_id: string
          id?: string
          notes?: string | null
          passenger_cpf?: string | null
          passenger_name: string
          payment_plan_id?: string | null
          room_type?: string | null
          seat_number?: string | null
          status?: string
          total_paid?: number
          updated_at?: string
        }
        Update: {
          agency_id?: string
          client_id?: string | null
          created_at?: string
          group_tour_id?: string
          id?: string
          notes?: string | null
          passenger_cpf?: string | null
          passenger_name?: string
          payment_plan_id?: string | null
          room_type?: string | null
          seat_number?: string | null
          status?: string
          total_paid?: number
          updated_at?: string
        }
        Relationships: []
      }
      group_tours: {
        Row: {
          agency_id: string
          agent_id: string | null
          base_price: number
          cover_image_url: string | null
          created_at: string
          departure_date: string | null
          description: string | null
          destination: string | null
          excludes: string[]
          financial: Json
          gallery: string[]
          id: string
          includes: string[]
          is_public: boolean
          itinerary: Json
          payment_options: Json
          registration_deadline: string | null
          reserved_seats: number
          return_date: string | null
          seat_map: Json
          seo: Json
          slug: string
          status: string
          title: string
          total_seats: number
          transport_details: string | null
          transport_type: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          agent_id?: string | null
          base_price?: number
          cover_image_url?: string | null
          created_at?: string
          departure_date?: string | null
          description?: string | null
          destination?: string | null
          excludes?: string[]
          financial?: Json
          gallery?: string[]
          id?: string
          includes?: string[]
          is_public?: boolean
          itinerary?: Json
          payment_options?: Json
          registration_deadline?: string | null
          reserved_seats?: number
          return_date?: string | null
          seat_map?: Json
          seo?: Json
          slug: string
          status?: string
          title: string
          total_seats?: number
          transport_details?: string | null
          transport_type?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          agent_id?: string | null
          base_price?: number
          cover_image_url?: string | null
          created_at?: string
          departure_date?: string | null
          description?: string | null
          destination?: string | null
          excludes?: string[]
          financial?: Json
          gallery?: string[]
          id?: string
          includes?: string[]
          is_public?: boolean
          itinerary?: Json
          payment_options?: Json
          registration_deadline?: string | null
          reserved_seats?: number
          return_date?: string | null
          seat_map?: Json
          seo?: Json
          slug?: string
          status?: string
          title?: string
          total_seats?: number
          transport_details?: string | null
          transport_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_articles: {
        Row: {
          agency_id: string
          category: string | null
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          is_internal: boolean
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          category?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_internal?: boolean
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          category?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_internal?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      lead_forms: {
        Row: {
          agency_id: string
          created_at: string
          design: Json
          fields: Json
          id: string
          is_active: boolean
          name: string
          slug: string
          submissions_count: number
          target_stage_id: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          design?: Json
          fields?: Json
          id?: string
          is_active?: boolean
          name: string
          slug: string
          submissions_count?: number
          target_stage_id?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          design?: Json
          fields?: Json
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          submissions_count?: number
          target_stage_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
      notifications: {
        Row: {
          agency_id: string
          body: string | null
          created_at: string
          data: Json
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          agency_id: string
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          agency_id?: string
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_installments: {
        Row: {
          agency_id: string
          amount: number
          due_date: string
          id: string
          late_fee: number
          number: number
          paid_at: string | null
          payment_method: string | null
          payment_plan_id: string
          receipt_url: string | null
          status: string
        }
        Insert: {
          agency_id: string
          amount?: number
          due_date: string
          id?: string
          late_fee?: number
          number: number
          paid_at?: string | null
          payment_method?: string | null
          payment_plan_id: string
          receipt_url?: string | null
          status?: string
        }
        Update: {
          agency_id?: string
          amount?: number
          due_date?: string
          id?: string
          late_fee?: number
          number?: number
          paid_at?: string | null
          payment_method?: string | null
          payment_plan_id?: string
          receipt_url?: string | null
          status?: string
        }
        Relationships: []
      }
      payment_plans: {
        Row: {
          agency_id: string
          client_id: string | null
          created_at: string
          id: string
          status: string
          total_amount: number
          trip_id: string | null
        }
        Insert: {
          agency_id: string
          client_id?: string | null
          created_at?: string
          id?: string
          status?: string
          total_amount?: number
          trip_id?: string | null
        }
        Update: {
          agency_id?: string
          client_id?: string | null
          created_at?: string
          id?: string
          status?: string
          total_amount?: number
          trip_id?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          features: string[]
          id: string
          is_active: boolean
          max_agents: number | null
          max_clients: number | null
          name: string
          price_annual: number
          price_monthly: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: string[]
          id?: string
          is_active?: boolean
          max_agents?: number | null
          max_clients?: number | null
          name: string
          price_annual?: number
          price_monthly?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: string[]
          id?: string
          is_active?: boolean
          max_agents?: number | null
          max_clients?: number | null
          name?: string
          price_annual?: number
          price_monthly?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      policy_documents: {
        Row: {
          content_md: string
          created_at: string
          created_by: string | null
          effective_at: string
          id: string
          kind: string
          version: string
        }
        Insert: {
          content_md: string
          created_at?: string
          created_by?: string | null
          effective_at?: string
          id?: string
          kind: string
          version: string
        }
        Update: {
          content_md?: string
          created_at?: string
          created_by?: string | null
          effective_at?: string
          id?: string
          kind?: string
          version?: string
        }
        Relationships: []
      }
      portal_pages: {
        Row: {
          agency_id: string
          blocks: Json
          created_at: string
          id: string
          is_published: boolean
          seo: Json
          slug: string
          template: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          blocks?: Json
          created_at?: string
          id?: string
          is_published?: boolean
          seo?: Json
          slug: string
          template?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          blocks?: Json
          created_at?: string
          id?: string
          is_published?: boolean
          seo?: Json
          slug?: string
          template?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
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
          excludes: Json
          flights: Json
          hotels: Json
          id: string
          includes: Json
          installments_boleto: number
          installments_card: number
          itinerary: Json
          lead_id: string | null
          notes: string | null
          number: number
          owner_id: string | null
          pax_adults: number
          pax_children: number
          pax_infants: number
          pax_seniors: number
          pix_discount_percent: number
          public_token: string
          sent_at: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          subtotal: number
          template: string
          terms: string | null
          title: string
          total: number
          tours: Json
          transfers: Json
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
          excludes?: Json
          flights?: Json
          hotels?: Json
          id?: string
          includes?: Json
          installments_boleto?: number
          installments_card?: number
          itinerary?: Json
          lead_id?: string | null
          notes?: string | null
          number?: number
          owner_id?: string | null
          pax_adults?: number
          pax_children?: number
          pax_infants?: number
          pax_seniors?: number
          pix_discount_percent?: number
          public_token?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          subtotal?: number
          template?: string
          terms?: string | null
          title: string
          total?: number
          tours?: Json
          transfers?: Json
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
          excludes?: Json
          flights?: Json
          hotels?: Json
          id?: string
          includes?: Json
          installments_boleto?: number
          installments_card?: number
          itinerary?: Json
          lead_id?: string | null
          notes?: string | null
          number?: number
          owner_id?: string | null
          pax_adults?: number
          pax_children?: number
          pax_infants?: number
          pax_seniors?: number
          pix_discount_percent?: number
          public_token?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          subtotal?: number
          template?: string
          terms?: string | null
          title?: string
          total?: number
          tours?: Json
          transfers?: Json
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
      push_subscriptions: {
        Row: {
          agency_id: string | null
          created_at: string
          endpoint: string
          id: string
          keys: Json
          user_agent: string | null
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          endpoint: string
          id?: string
          keys?: Json
          user_agent?: string | null
          user_id: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          keys?: Json
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
      support_tickets: {
        Row: {
          agency_id: string
          agent_id: string | null
          attachments: string[]
          client_id: string | null
          code: string
          created_at: string
          description: string | null
          email_thread_id: string | null
          id: string
          messages: Json
          priority: string
          refund_amount: number | null
          refund_requested: boolean
          refund_status: string | null
          resolved_at: string | null
          sla_deadline: string | null
          status: string
          title: string
          trip_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          agent_id?: string | null
          attachments?: string[]
          client_id?: string | null
          code?: string
          created_at?: string
          description?: string | null
          email_thread_id?: string | null
          id?: string
          messages?: Json
          priority?: string
          refund_amount?: number | null
          refund_requested?: boolean
          refund_status?: string | null
          resolved_at?: string | null
          sla_deadline?: string | null
          status?: string
          title: string
          trip_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          agent_id?: string | null
          attachments?: string[]
          client_id?: string | null
          code?: string
          created_at?: string
          description?: string | null
          email_thread_id?: string | null
          id?: string
          messages?: Json
          priority?: string
          refund_amount?: number | null
          refund_requested?: boolean
          refund_status?: string | null
          resolved_at?: string | null
          sla_deadline?: string | null
          status?: string
          title?: string
          trip_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      trip_passengers: {
        Row: {
          agency_id: string
          birth_date: string | null
          client_id: string | null
          cpf: string | null
          created_at: string
          data_complete: boolean
          disabilities: string | null
          document: string | null
          document_images: Json
          document_type: string | null
          email: string | null
          full_name: string
          id: string
          is_lead_passenger: boolean
          kind: Database["public"]["Enums"]["passenger_kind"]
          magic_link_filled_at: string | null
          magic_link_token: string | null
          meal_preference: string | null
          nationality: string | null
          notes: string | null
          passport_expiry: string | null
          passport_number: string | null
          phone: string | null
          trip_id: string
          vaccination_certificates: Json
        }
        Insert: {
          agency_id: string
          birth_date?: string | null
          client_id?: string | null
          cpf?: string | null
          created_at?: string
          data_complete?: boolean
          disabilities?: string | null
          document?: string | null
          document_images?: Json
          document_type?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_lead_passenger?: boolean
          kind?: Database["public"]["Enums"]["passenger_kind"]
          magic_link_filled_at?: string | null
          magic_link_token?: string | null
          meal_preference?: string | null
          nationality?: string | null
          notes?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          trip_id: string
          vaccination_certificates?: Json
        }
        Update: {
          agency_id?: string
          birth_date?: string | null
          client_id?: string | null
          cpf?: string | null
          created_at?: string
          data_complete?: boolean
          disabilities?: string | null
          document?: string | null
          document_images?: Json
          document_type?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_lead_passenger?: boolean
          kind?: Database["public"]["Enums"]["passenger_kind"]
          magic_link_filled_at?: string | null
          magic_link_token?: string | null
          meal_preference?: string | null
          nationality?: string | null
          notes?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          trip_id?: string
          vaccination_certificates?: Json
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
      visa_requests: {
        Row: {
          agency_handling: boolean
          agency_id: string
          approved_at: string | null
          checklist: Json
          client_id: string | null
          country: string
          country_code: string | null
          denied_at: string | null
          expected_approval_at: string | null
          id: string
          notes: string | null
          passport_expiry: string | null
          passport_number: string | null
          price: number
          requested_at: string | null
          required_documents: Json
          status: string
          submitted_at: string | null
          travel_date: string | null
          trip_id: string | null
          visa_type: string | null
        }
        Insert: {
          agency_handling?: boolean
          agency_id: string
          approved_at?: string | null
          checklist?: Json
          client_id?: string | null
          country: string
          country_code?: string | null
          denied_at?: string | null
          expected_approval_at?: string | null
          id?: string
          notes?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          price?: number
          requested_at?: string | null
          required_documents?: Json
          status?: string
          submitted_at?: string | null
          travel_date?: string | null
          trip_id?: string | null
          visa_type?: string | null
        }
        Update: {
          agency_handling?: boolean
          agency_id?: string
          approved_at?: string | null
          checklist?: Json
          client_id?: string | null
          country?: string
          country_code?: string | null
          denied_at?: string | null
          expected_approval_at?: string | null
          id?: string
          notes?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          price?: number
          requested_at?: string | null
          required_documents?: Json
          status?: string
          submitted_at?: string | null
          travel_date?: string | null
          trip_id?: string | null
          visa_type?: string | null
        }
        Relationships: []
      }
      visa_requirements: {
        Row: {
          agency_id: string | null
          destination_country: string
          id: string
          last_updated: string
          notes: string | null
          official_url: string | null
          origin_nationality: string
          price_estimate: number | null
          processing_days: number | null
          required_documents: string[]
          visa_required: boolean
          visa_type: string | null
        }
        Insert: {
          agency_id?: string | null
          destination_country: string
          id?: string
          last_updated?: string
          notes?: string | null
          official_url?: string | null
          origin_nationality: string
          price_estimate?: number | null
          processing_days?: number | null
          required_documents?: string[]
          visa_required?: boolean
          visa_type?: string | null
        }
        Update: {
          agency_id?: string | null
          destination_country?: string
          id?: string
          last_updated?: string
          notes?: string | null
          official_url?: string | null
          origin_nationality?: string
          price_estimate?: number | null
          processing_days?: number | null
          required_documents?: string[]
          visa_required?: boolean
          visa_type?: string | null
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          accommodation: Json
          agency_id: string
          cover_image_url: string | null
          created_at: string
          destination: string | null
          emergency_contacts: Json
          flights: Json
          general_locator: string | null
          generated_at: string | null
          id: string
          insurance: Json
          observations: string | null
          passengers: Json
          pdf_url: string | null
          source_file_url: string | null
          source_type: string
          template: string
          tours: Json
          transfers: Json
          trip_id: string
        }
        Insert: {
          accommodation?: Json
          agency_id: string
          cover_image_url?: string | null
          created_at?: string
          destination?: string | null
          emergency_contacts?: Json
          flights?: Json
          general_locator?: string | null
          generated_at?: string | null
          id?: string
          insurance?: Json
          observations?: string | null
          passengers?: Json
          pdf_url?: string | null
          source_file_url?: string | null
          source_type?: string
          template?: string
          tours?: Json
          transfers?: Json
          trip_id: string
        }
        Update: {
          accommodation?: Json
          agency_id?: string
          cover_image_url?: string | null
          created_at?: string
          destination?: string | null
          emergency_contacts?: Json
          flights?: Json
          general_locator?: string | null
          generated_at?: string | null
          id?: string
          insurance?: Json
          observations?: string | null
          passengers?: Json
          pdf_url?: string | null
          source_file_url?: string | null
          source_type?: string
          template?: string
          tours?: Json
          transfers?: Json
          trip_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_agency_invite: { Args: { _token: string }; Returns: string }
      agency_id_by_slug: { Args: { _slug: string }; Returns: string }
      confirm_payment_with_token: {
        Args: { _payment_method: string; _receipt_url: string; _token: string }
        Returns: string
      }
      contract_template_clauses: { Args: never; Returns: Json }
      create_agency_onboarding: {
        Args: {
          _document?: string
          _email?: string
          _full_name?: string
          _legal_name?: string
          _name: string
          _phone?: string
          _slug: string
        }
        Returns: {
          id: string
          slug: string
        }[]
      }
      get_my_agency_id: { Args: never; Returns: string }
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
      pick_active_api_key: {
        Args: { _agency_id: string; _provider: string }
        Returns: {
          id: string
          key_value: string
          scope: string
        }[]
      }
      public_contract_by_token: {
        Args: { _token: string }
        Returns: {
          agency_logo: string
          agency_name: string
          client_data: Json
          content_hash: string
          custom_clauses: Json
          fixed_clauses: Json
          id: string
          package_summary: string
          passengers_data: Json
          payment_terms: string
          signed_at: string
          status: string
          total_value: number
        }[]
      }
      public_passenger_by_token: {
        Args: { _token: string }
        Returns: {
          agency_logo: string
          agency_name: string
          birth_date: string
          cpf: string
          data_complete: boolean
          disabilities: string
          document: string
          document_type: string
          email: string
          filled_at: string
          full_name: string
          id: string
          meal_preference: string
          nationality: string
          passport_expiry: string
          passport_number: string
          phone: string
          trip_title: string
        }[]
      }
      public_payment_by_token: {
        Args: { _token: string }
        Returns: {
          agency_logo: string
          agency_name: string
          amount: number
          currency: string
          description: string
          due_date: string
          id: string
          status: string
          trip_title: string
        }[]
      }
      save_passenger_with_token: {
        Args: { _payload: Json; _token: string }
        Returns: string
      }
      sign_contract_with_token: {
        Args: {
          _ip: string
          _selfie_image: string
          _signature_image: string
          _signer_document: string
          _signer_name: string
          _token: string
          _user_agent: string
        }
        Returns: string
      }
      verify_contract: {
        Args: { _serial: string }
        Returns: {
          content_hash: string
          issuer: string
          parties_masked: string
          signed_at: string
          signed_hash: string
          status: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "agency_admin"
        | "agent"
        | "client"
        | "agent_viewer"
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
      app_role: [
        "super_admin",
        "agency_admin",
        "agent",
        "client",
        "agent_viewer",
      ],
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
