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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
          integrations_config: Json | null
          logo_url: string | null
          module_names: Json | null
          name: string
          onboarding_completed: boolean | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          brand_color?: string | null
          brand_color_fg?: string | null
          brand_color_light?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          integrations_config?: Json | null
          logo_url?: string | null
          module_names?: Json | null
          name: string
          onboarding_completed?: boolean | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          brand_color?: string | null
          brand_color_fg?: string | null
          brand_color_light?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          integrations_config?: Json | null
          logo_url?: string | null
          module_names?: Json | null
          name?: string
          onboarding_completed?: boolean | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      agency_billing_invoices: {
        Row: {
          agency_id: string
          amount: number
          billing_period_end: string | null
          billing_period_start: string | null
          created_at: string
          due_date: string
          id: string
          paid_at: string | null
          status: string
        }
        Insert: {
          agency_id: string
          amount: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          due_date: string
          id?: string
          paid_at?: string | null
          status: string
        }
        Update: {
          agency_id?: string
          amount?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          due_date?: string
          id?: string
          paid_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_billing_invoices_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_integrations: {
        Row: {
          agency_id: string
          config: Json
          created_at: string
          id: string
          is_active: boolean
          provider: string
          secret_id: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          provider: string
          secret_id?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          provider?: string
          secret_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_integrations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
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
          address_city: string | null
          address_complement: string | null
          address_country: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip_code: string | null
          agency_id: string
          business_hours: Json | null
          created_at: string
          document: string | null
          email: string | null
          legal_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_country?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          agency_id: string
          business_hours?: Json | null
          created_at?: string
          document?: string | null
          email?: string | null
          legal_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_country?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          agency_id?: string
          business_hours?: Json | null
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
      agency_reviews: {
        Row: {
          agency_id: string
          author_name: string
          author_role: string | null
          avatar_url: string | null
          created_at: string
          id: string
          review_text: string
          stars: number
          status: string
        }
        Insert: {
          agency_id: string
          author_name: string
          author_role?: string | null
          avatar_url?: string | null
          created_at?: string
          id?: string
          review_text: string
          stars: number
          status?: string
        }
        Update: {
          agency_id?: string
          author_name?: string
          author_role?: string | null
          avatar_url?: string | null
          created_at?: string
          id?: string
          review_text?: string
          stars?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_reviews_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_subscriptions: {
        Row: {
          agency_id: string
          cancel_at_period_end: boolean | null
          current_period_end: string | null
          plan_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          cancel_at_period_end?: boolean | null
          current_period_end?: string | null
          plan_id?: string | null
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          cancel_at_period_end?: boolean | null
          current_period_end?: string | null
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_subscriptions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
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
      agent_commission_rules: {
        Row: {
          agency_id: string
          commission_type: string
          created_at: string
          fixed_pct: number | null
          id: string
          scale_ranges: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id: string
          commission_type: string
          created_at?: string
          fixed_pct?: number | null
          id?: string
          scale_ranges?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          commission_type?: string
          created_at?: string
          fixed_pct?: number | null
          id?: string
          scale_ranges?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_commission_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_commission_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tasks: {
        Row: {
          agency_id: string
          agent_id: string | null
          created_at: string
          description: string | null
          difficulty_score: number
          due_date: string
          id: string
          reference_id: string | null
          resolved_at: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          agent_id?: string | null
          created_at?: string
          description?: string | null
          difficulty_score?: number
          due_date?: string
          id?: string
          reference_id?: string | null
          resolved_at?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          agent_id?: string | null
          created_at?: string
          description?: string | null
          difficulty_score?: number
          due_date?: string
          id?: string
          reference_id?: string | null
          resolved_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agency_memories: {
        Row: {
          agency_id: string
          category: string
          content: string
          created_at: string
          embedding: string | null
          id: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          category: string
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          category?: string
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agency_memories_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_api_credentials: {
        Row: {
          agency_id: string | null
          cooldown_until: string | null
          created_at: string
          created_by: string | null
          daily_limit: number | null
          fingerprint: string
          id: string
          label: string | null
          last_error_at: string | null
          last_error_code: string | null
          last_success_at: string | null
          last_used_at: string | null
          masked_hint: string
          monthly_limit: number | null
          priority: number
          provider_id: string | null
          secret_reference: string
          status: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          cooldown_until?: string | null
          created_at?: string
          created_by?: string | null
          daily_limit?: number | null
          fingerprint: string
          id?: string
          label?: string | null
          last_error_at?: string | null
          last_error_code?: string | null
          last_success_at?: string | null
          last_used_at?: string | null
          masked_hint: string
          monthly_limit?: number | null
          priority?: number
          provider_id?: string | null
          secret_reference: string
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          cooldown_until?: string | null
          created_at?: string
          created_by?: string | null
          daily_limit?: number | null
          fingerprint?: string
          id?: string
          label?: string | null
          last_error_at?: string | null
          last_error_code?: string | null
          last_success_at?: string | null
          last_used_at?: string | null
          masked_hint?: string
          monthly_limit?: number | null
          priority?: number
          provider_id?: string | null
          secret_reference?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_api_credentials_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_api_credentials_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_feedback: {
        Row: {
          agency_id: string
          comment: string | null
          created_at: string
          id: string
          message_id: string | null
          rating: number
          user_id: string
        }
        Insert: {
          agency_id: string
          comment?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          rating: number
          user_id: string
        }
        Update: {
          agency_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_feedback_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_messages"
            referencedColumns: ["id"]
          },
        ]
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
      ai_generation_logs: {
        Row: {
          agency_id: string
          conversation_history: Json | null
          created_at: string
          error_message: string | null
          id: string
          model_used: string | null
          sections_generated: string[] | null
          site_id: string | null
          status: string | null
          tokens_used: number | null
          user_prompt: string
        }
        Insert: {
          agency_id: string
          conversation_history?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          model_used?: string | null
          sections_generated?: string[] | null
          site_id?: string | null
          status?: string | null
          tokens_used?: number | null
          user_prompt: string
        }
        Update: {
          agency_id?: string
          conversation_history?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          model_used?: string | null
          sections_generated?: string[] | null
          site_id?: string | null
          status?: string | null
          tokens_used?: number | null
          user_prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generation_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generation_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "portal_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_job_attempts: {
        Row: {
          attempt: number
          created_at: string
          credential_id: string | null
          error_message: string | null
          estimated_cost: number | null
          http_status: number | null
          id: string
          input_tokens: number | null
          job_id: string
          latency_ms: number | null
          model_id: string | null
          output_tokens: number | null
          provider_id: string | null
          success: boolean
        }
        Insert: {
          attempt: number
          created_at?: string
          credential_id?: string | null
          error_message?: string | null
          estimated_cost?: number | null
          http_status?: number | null
          id?: string
          input_tokens?: number | null
          job_id: string
          latency_ms?: number | null
          model_id?: string | null
          output_tokens?: number | null
          provider_id?: string | null
          success: boolean
        }
        Update: {
          attempt?: number
          created_at?: string
          credential_id?: string | null
          error_message?: string | null
          estimated_cost?: number | null
          http_status?: number | null
          id?: string
          input_tokens?: number | null
          job_id?: string
          latency_ms?: number | null
          model_id?: string | null
          output_tokens?: number | null
          provider_id?: string | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ai_job_attempts_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "ai_api_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_job_attempts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_job_attempts_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_job_attempts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_jobs: {
        Row: {
          agency_id: string
          completed_at: string | null
          created_at: string
          error_payload: Json | null
          feature: string
          id: string
          idempotency_key: string | null
          input_reference: string
          priority: number
          requested_by: string | null
          result_payload: Json | null
          started_at: string | null
          status: string
        }
        Insert: {
          agency_id: string
          completed_at?: string | null
          created_at?: string
          error_payload?: Json | null
          feature: string
          id?: string
          idempotency_key?: string | null
          input_reference: string
          priority?: number
          requested_by?: string | null
          result_payload?: Json | null
          started_at?: string | null
          status?: string
        }
        Update: {
          agency_id?: string
          completed_at?: string | null
          created_at?: string
          error_payload?: Json | null
          feature?: string
          id?: string
          idempotency_key?: string | null
          input_reference?: string
          priority?: number
          requested_by?: string | null
          result_payload?: Json | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_jobs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_models: {
        Row: {
          context_limit: number | null
          created_at: string
          id: string
          modalities: string[]
          model_code: string
          output_limit: number | null
          provider_id: string | null
          status: string
          supports_json_schema: boolean
        }
        Insert: {
          context_limit?: number | null
          created_at?: string
          id?: string
          modalities?: string[]
          model_code: string
          output_limit?: number | null
          provider_id?: string | null
          status?: string
          supports_json_schema?: boolean
        }
        Update: {
          context_limit?: number | null
          created_at?: string
          id?: string
          modalities?: string[]
          model_code?: string
          output_limit?: number | null
          provider_id?: string | null
          status?: string
          supports_json_schema?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ai_models_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_providers: {
        Row: {
          auth_type: string | null
          base_url: string | null
          code: string
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          auth_type?: string | null
          base_url?: string | null
          code: string
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          auth_type?: string | null
          base_url?: string | null
          code?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
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
          deleted_at: string | null
          excerpt: string | null
          gbp_post_id: string | null
          google_post_id: string | null
          google_posted_at: string | null
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
          deleted_at?: string | null
          excerpt?: string | null
          gbp_post_id?: string | null
          google_post_id?: string | null
          google_posted_at?: string | null
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
          deleted_at?: string | null
          excerpt?: string | null
          gbp_post_id?: string | null
          google_post_id?: string | null
          google_posted_at?: string | null
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
      boarding_card_activities: {
        Row: {
          action: string
          card_id: string
          created_at: string
          description: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          card_id: string
          created_at?: string
          description: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          card_id?: string
          created_at?: string
          description?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boarding_card_activities_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "boarding_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      boarding_cards: {
        Row: {
          agency_id: string
          airline: string | null
          alerts: string[]
          arrival_airport: string | null
          briefing_date: string | null
          briefing_url: string | null
          checkin_opens_at: string | null
          checklist: Json
          created_at: string
          deleted_at: string | null
          departure_airport: string | null
          departure_date: string | null
          destination: string | null
          destination_type: string | null
          documents_checklist: Json
          emergency_phone: string | null
          flight_class: string | null
          flight_date: string | null
          flight_number: string | null
          guide_name: string | null
          guide_phone: string | null
          guide_whatsapp: string | null
          hotel_address: string | null
          hotel_checkin: string | null
          hotel_checkout: string | null
          hotel_name: string | null
          hotel_phone: string | null
          hotel_stars: number | null
          id: string
          internal_ref: string | null
          notes: string | null
          notes_internal: string | null
          passengers_count: number | null
          pax_count: number | null
          pnr: string | null
          position: number
          status: string
          tags: string[] | null
          transfer_provider: string | null
          transfer_time: string | null
          transfer_vehicle: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          airline?: string | null
          alerts?: string[]
          arrival_airport?: string | null
          briefing_date?: string | null
          briefing_url?: string | null
          checkin_opens_at?: string | null
          checklist?: Json
          created_at?: string
          deleted_at?: string | null
          departure_airport?: string | null
          departure_date?: string | null
          destination?: string | null
          destination_type?: string | null
          documents_checklist?: Json
          emergency_phone?: string | null
          flight_class?: string | null
          flight_date?: string | null
          flight_number?: string | null
          guide_name?: string | null
          guide_phone?: string | null
          guide_whatsapp?: string | null
          hotel_address?: string | null
          hotel_checkin?: string | null
          hotel_checkout?: string | null
          hotel_name?: string | null
          hotel_phone?: string | null
          hotel_stars?: number | null
          id?: string
          internal_ref?: string | null
          notes?: string | null
          notes_internal?: string | null
          passengers_count?: number | null
          pax_count?: number | null
          pnr?: string | null
          position?: number
          status?: string
          tags?: string[] | null
          transfer_provider?: string | null
          transfer_time?: string | null
          transfer_vehicle?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          airline?: string | null
          alerts?: string[]
          arrival_airport?: string | null
          briefing_date?: string | null
          briefing_url?: string | null
          checkin_opens_at?: string | null
          checklist?: Json
          created_at?: string
          deleted_at?: string | null
          departure_airport?: string | null
          departure_date?: string | null
          destination?: string | null
          destination_type?: string | null
          documents_checklist?: Json
          emergency_phone?: string | null
          flight_class?: string | null
          flight_date?: string | null
          flight_number?: string | null
          guide_name?: string | null
          guide_phone?: string | null
          guide_whatsapp?: string | null
          hotel_address?: string | null
          hotel_checkin?: string | null
          hotel_checkout?: string | null
          hotel_name?: string | null
          hotel_phone?: string | null
          hotel_stars?: number | null
          id?: string
          internal_ref?: string | null
          notes?: string | null
          notes_internal?: string | null
          passengers_count?: number | null
          pax_count?: number | null
          pnr?: string | null
          position?: number
          status?: string
          tags?: string[] | null
          transfer_provider?: string | null
          transfer_time?: string | null
          transfer_vehicle?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      boarding_events: {
        Row: {
          actor_id: string | null
          event_type: string
          flight_segment_id: string | null
          id: string
          metadata: Json | null
          occurred_at: string
          status: string | null
          traveler_id: string | null
          trip_id: string | null
        }
        Insert: {
          actor_id?: string | null
          event_type: string
          flight_segment_id?: string | null
          id?: string
          metadata?: Json | null
          occurred_at?: string
          status?: string | null
          traveler_id?: string | null
          trip_id?: string | null
        }
        Update: {
          actor_id?: string | null
          event_type?: string
          flight_segment_id?: string | null
          id?: string
          metadata?: Json | null
          occurred_at?: string
          status?: string | null
          traveler_id?: string | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boarding_events_flight_segment_id_fkey"
            columns: ["flight_segment_id"]
            isOneToOne: false
            referencedRelation: "flight_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boarding_events_traveler_id_fkey"
            columns: ["traveler_id"]
            isOneToOne: false
            referencedRelation: "trip_passengers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boarding_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      boarding_rooming_list: {
        Row: {
          agency_id: string
          card_id: string | null
          checkin_date: string | null
          checkout_date: string | null
          created_at: string
          group_tour_id: string | null
          hotel_name: string | null
          id: string
          is_confirmed: boolean
          notes: string | null
          order_index: number
          passengers: Json
          room_number: string
          room_type: string
          updated_at: string
          version: number
        }
        Insert: {
          agency_id: string
          card_id?: string | null
          checkin_date?: string | null
          checkout_date?: string | null
          created_at?: string
          group_tour_id?: string | null
          hotel_name?: string | null
          id?: string
          is_confirmed?: boolean
          notes?: string | null
          order_index?: number
          passengers?: Json
          room_number: string
          room_type?: string
          updated_at?: string
          version?: number
        }
        Update: {
          agency_id?: string
          card_id?: string | null
          checkin_date?: string | null
          checkout_date?: string | null
          created_at?: string
          group_tour_id?: string | null
          hotel_name?: string | null
          id?: string
          is_confirmed?: boolean
          notes?: string | null
          order_index?: number
          passengers?: Json
          room_number?: string
          room_type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "boarding_rooming_list_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boarding_rooming_list_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "boarding_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boarding_rooming_list_group_tour_id_fkey"
            columns: ["group_tour_id"]
            isOneToOne: false
            referencedRelation: "group_tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boarding_rooming_list_group_tour_id_fkey"
            columns: ["group_tour_id"]
            isOneToOne: false
            referencedRelation: "group_tours_financial_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      boarding_tickets: {
        Row: {
          agency_id: string
          card_id: string
          created_at: string
          date_time: string | null
          extracted_data: Json
          file_path: string | null
          file_url: string | null
          id: string
          kind: string
          notes: string | null
          passenger_id: string | null
          passenger_name: string
          seat: string | null
          status: string
          ticket_code: string | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          agency_id: string
          card_id: string
          created_at?: string
          date_time?: string | null
          extracted_data?: Json
          file_path?: string | null
          file_url?: string | null
          id?: string
          kind: string
          notes?: string | null
          passenger_id?: string | null
          passenger_name: string
          seat?: string | null
          status?: string
          ticket_code?: string | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          agency_id?: string
          card_id?: string
          created_at?: string
          date_time?: string | null
          extracted_data?: Json
          file_path?: string | null
          file_url?: string | null
          id?: string
          kind?: string
          notes?: string | null
          passenger_id?: string | null
          passenger_name?: string
          seat?: string | null
          status?: string
          ticket_code?: string | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boarding_tickets_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boarding_tickets_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "boarding_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boarding_tickets_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "trip_passengers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_installments: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string | null
          due_date: string
          external_link: string | null
          id: string
          paid_at: string | null
          payment_method: string | null
          status: string
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string | null
          due_date: string
          external_link?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string | null
          due_date?: string
          external_link?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_installments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit: {
        Row: {
          accent_color: string | null
          agency_id: string
          background_color: string | null
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
          logo_white_url: string | null
          primary_color: string | null
          proposal_header_img: string | null
          proposal_template: string | null
          secondary_color: string | null
          text_color: string | null
          updated_at: string
          voucher_theme: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          accent_color?: string | null
          agency_id: string
          background_color?: string | null
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
          logo_white_url?: string | null
          primary_color?: string | null
          proposal_header_img?: string | null
          proposal_template?: string | null
          secondary_color?: string | null
          text_color?: string | null
          updated_at?: string
          voucher_theme?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          accent_color?: string | null
          agency_id?: string
          background_color?: string | null
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
          logo_white_url?: string | null
          primary_color?: string | null
          proposal_header_img?: string | null
          proposal_template?: string | null
          secondary_color?: string | null
          text_color?: string | null
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
          created_at: string | null
          deleted_at: string | null
          id: string
          name: string
          rows: number
          seat_map: Json | null
          updated_at: string | null
          vehicle_type: string | null
        }
        Insert: {
          agency_id: string
          cols?: number
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          rows?: number
          seat_map?: Json | null
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Update: {
          agency_id?: string
          cols?: number
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          rows?: number
          seat_map?: Json | null
          updated_at?: string | null
          vehicle_type?: string | null
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
      bus_seat_assignments: {
        Row: {
          booking_id: string | null
          created_at: string | null
          group_trip_id: string
          id: string
          is_blocked: boolean | null
          seat_label: string
          traveler_name: string | null
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          group_trip_id: string
          id?: string
          is_blocked?: boolean | null
          seat_label: string
          traveler_name?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          group_trip_id?: string
          id?: string
          is_blocked?: boolean | null
          seat_label?: string
          traveler_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bus_seat_assignments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "group_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_seat_assignments_group_trip_id_fkey"
            columns: ["group_trip_id"]
            isOneToOne: false
            referencedRelation: "group_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_audit_logs: {
        Row: {
          action: string
          agency_id: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          operator_id: string | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          agency_id: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operator_id?: string | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          agency_id?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operator_id?: string | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_audit_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          agency_id: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          agency_id: string
          cash_register_id: string
          closed_at: string | null
          closed_by: string | null
          closing_balance: number | null
          created_at: string
          deleted_at: string | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string
          opening_balance: number
          reported_balance: number | null
          status: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          cash_register_id: string
          closed_at?: string | null
          closed_by?: string | null
          closing_balance?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by: string
          opening_balance?: number
          reported_balance?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          cash_register_id?: string
          closed_at?: string | null
          closed_by?: string | null
          closing_balance?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string
          opening_balance?: number
          reported_balance?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transactions: {
        Row: {
          agency_id: string
          amount: number
          cash_register_id: string
          cash_session_id: string | null
          category: string | null
          created_at: string
          created_by: string | null
          employee_id: string | null
          id: string
          notes: string | null
          operator_id: string | null
          payment_method: string
          receipt_url: string | null
          transaction_date: string
          type: string
        }
        Insert: {
          agency_id: string
          amount: number
          cash_register_id: string
          cash_session_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          operator_id?: string | null
          payment_method?: string
          receipt_url?: string | null
          transaction_date?: string
          type: string
        }
        Update: {
          agency_id?: string
          amount?: number
          cash_register_id?: string
          cash_session_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          operator_id?: string | null
          payment_method?: string
          receipt_url?: string | null
          transaction_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_links: {
        Row: {
          agency_id: string | null
          created_at: string
          expires_at: string | null
          flight_segment_id: string | null
          generated_url: string | null
          id: string
          last_verified_at: string | null
          link_type: string
          parameters: Json | null
          provider: string
          raw_url: string | null
          source: string | null
          updated_at: string
          validation_status: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          expires_at?: string | null
          flight_segment_id?: string | null
          generated_url?: string | null
          id?: string
          last_verified_at?: string | null
          link_type?: string
          parameters?: Json | null
          provider: string
          raw_url?: string | null
          source?: string | null
          updated_at?: string
          validation_status?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          expires_at?: string | null
          flight_segment_id?: string | null
          generated_url?: string | null
          id?: string
          last_verified_at?: string | null
          link_type?: string
          parameters?: Json | null
          provider?: string
          raw_url?: string | null
          source?: string | null
          updated_at?: string
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkin_links_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_links_flight_segment_id_fkey"
            columns: ["flight_segment_id"]
            isOneToOne: false
            referencedRelation: "flight_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          agency_id: string
          client_id: string
          created_at: string
          doc_number: string | null
          doc_type: string
          expires_at: string | null
          file_url: string | null
          id: string
          issued_at: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          client_id: string
          created_at?: string
          doc_number?: string | null
          doc_type: string
          expires_at?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          client_id?: string
          created_at?: string
          doc_number?: string | null
          doc_type?: string
          expires_at?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_relationships: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          related_client_id: string | null
          relationship_type: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          related_client_id?: string | null
          relationship_type: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          related_client_id?: string | null
          relationship_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_relationships_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_relationships_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: Json
          agency_id: string
          autism: boolean
          avatar_url: string | null
          birth_date: string | null
          brain_data: Json
          cpf: string | null
          created_at: string
          deleted_at: string | null
          document: string | null
          document_images: string[]
          email: string | null
          full_name: string
          health_notes: string | null
          id: string
          kind: Database["public"]["Enums"]["client_kind"]
          legal_name: string | null
          login_token: string | null
          login_token_expires_at: string | null
          metadata: Json
          nationality: string | null
          notes: string | null
          owner_id: string | null
          passport_country: string | null
          passport_expiry: string | null
          passport_number: string | null
          pcd: boolean
          phone: string | null
          preferences: Json
          preferred_agent_id: string | null
          reduced_mobility: boolean
          rg: string | null
          source: string | null
          tags: string[]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: Json
          agency_id: string
          autism?: boolean
          avatar_url?: string | null
          birth_date?: string | null
          brain_data?: Json
          cpf?: string | null
          created_at?: string
          deleted_at?: string | null
          document?: string | null
          document_images?: string[]
          email?: string | null
          full_name: string
          health_notes?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["client_kind"]
          legal_name?: string | null
          login_token?: string | null
          login_token_expires_at?: string | null
          metadata?: Json
          nationality?: string | null
          notes?: string | null
          owner_id?: string | null
          passport_country?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          pcd?: boolean
          phone?: string | null
          preferences?: Json
          preferred_agent_id?: string | null
          reduced_mobility?: boolean
          rg?: string | null
          source?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: Json
          agency_id?: string
          autism?: boolean
          avatar_url?: string | null
          birth_date?: string | null
          brain_data?: Json
          cpf?: string | null
          created_at?: string
          deleted_at?: string | null
          document?: string | null
          document_images?: string[]
          email?: string | null
          full_name?: string
          health_notes?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["client_kind"]
          legal_name?: string | null
          login_token?: string | null
          login_token_expires_at?: string | null
          metadata?: Json
          nationality?: string | null
          notes?: string | null
          owner_id?: string | null
          passport_country?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          pcd?: boolean
          phone?: string | null
          preferences?: Json
          preferred_agent_id?: string | null
          reduced_mobility?: boolean
          rg?: string | null
          source?: string | null
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
      cms_templates: {
        Row: {
          agency_id: string | null
          blocks: Json
          category: string
          created_at: string
          id: string
          is_public: boolean
          name: string
          seo_defaults: Json
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          blocks?: Json
          category?: string
          created_at?: string
          id?: string
          is_public?: boolean
          name: string
          seo_defaults?: Json
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          blocks?: Json
          category?: string
          created_at?: string
          id?: string
          is_public?: boolean
          name?: string
          seo_defaults?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_templates_agency_id_fkey"
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
          google_review_url: string | null
          google_reviews_embed: string | null
          google_synced_at: string | null
          id: string
          instagram: string | null
          is_published: boolean | null
          last_synced_google_at: string | null
          linkedin: string | null
          logo_url: string | null
          name: string
          partner_operators: Json
          payment_methods: string[]
          phone: string | null
          portal_theme: Json
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
          google_review_url?: string | null
          google_reviews_embed?: string | null
          google_synced_at?: string | null
          id?: string
          instagram?: string | null
          is_published?: boolean | null
          last_synced_google_at?: string | null
          linkedin?: string | null
          logo_url?: string | null
          name: string
          partner_operators?: Json
          payment_methods?: string[]
          phone?: string | null
          portal_theme?: Json
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
          google_review_url?: string | null
          google_reviews_embed?: string | null
          google_synced_at?: string | null
          id?: string
          instagram?: string | null
          is_published?: boolean | null
          last_synced_google_at?: string | null
          linkedin?: string | null
          logo_url?: string | null
          name?: string
          partner_operators?: Json
          payment_methods?: string[]
          phone?: string | null
          portal_theme?: Json
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
      contract_addendums: {
        Row: {
          cancelled_at: string | null
          content: string
          contract_id: string
          created_at: string
          id: string
          pdf_url: string | null
          signatures: Json
          signed_at: string | null
          status: string
          title: string
        }
        Insert: {
          cancelled_at?: string | null
          content: string
          contract_id: string
          created_at?: string
          id?: string
          pdf_url?: string | null
          signatures?: Json
          signed_at?: string | null
          status?: string
          title: string
        }
        Update: {
          cancelled_at?: string | null
          content?: string
          contract_id?: string
          created_at?: string
          id?: string
          pdf_url?: string | null
          signatures?: Json
          signed_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_addendums_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_audit_chain: {
        Row: {
          action: string
          contract_id: string
          created_at: string
          id: number
          metadata: Json
          prev_hash: string | null
          row_hash: string | null
        }
        Insert: {
          action: string
          contract_id: string
          created_at?: string
          id?: number
          metadata?: Json
          prev_hash?: string | null
          row_hash?: string | null
        }
        Update: {
          action?: string
          contract_id?: string
          created_at?: string
          id?: number
          metadata?: Json
          prev_hash?: string | null
          row_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_audit_chain_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_clauses: {
        Row: {
          agency_id: string | null
          body: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          kind: string
          order_index: number
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          agency_id?: string | null
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          kind: string
          order_index?: number
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          agency_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          kind?: string
          order_index?: number
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_clauses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
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
          audit_trail: Json
          cancellation_reason: string | null
          cancelled_at: string | null
          certificate: Json | null
          clause_snapshot: Json | null
          client_data: Json
          content_hash: string | null
          created_at: string
          custom_clauses: Json
          deleted_at: string | null
          fixed_clauses: Json
          id: string
          is_custom_clauses: boolean
          last_viewed_at: string | null
          package_summary: string | null
          passengers_data: Json
          payment_terms: string | null
          pdf_url: string | null
          public_token: string | null
          signatures: Json
          signed_at: string | null
          signed_hash: string | null
          status: string
          template_id: string | null
          total_value: number
          trip_id: string
          version: string
          view_count: number | null
          viewed_at: string | null
        }
        Insert: {
          agency_data?: Json
          agency_id: string
          audit_trail?: Json
          cancellation_reason?: string | null
          cancelled_at?: string | null
          certificate?: Json | null
          clause_snapshot?: Json | null
          client_data?: Json
          content_hash?: string | null
          created_at?: string
          custom_clauses?: Json
          deleted_at?: string | null
          fixed_clauses?: Json
          id?: string
          is_custom_clauses?: boolean
          last_viewed_at?: string | null
          package_summary?: string | null
          passengers_data?: Json
          payment_terms?: string | null
          pdf_url?: string | null
          public_token?: string | null
          signatures?: Json
          signed_at?: string | null
          signed_hash?: string | null
          status?: string
          template_id?: string | null
          total_value?: number
          trip_id: string
          version?: string
          view_count?: number | null
          viewed_at?: string | null
        }
        Update: {
          agency_data?: Json
          agency_id?: string
          audit_trail?: Json
          cancellation_reason?: string | null
          cancelled_at?: string | null
          certificate?: Json | null
          clause_snapshot?: Json | null
          client_data?: Json
          content_hash?: string | null
          created_at?: string
          custom_clauses?: Json
          deleted_at?: string | null
          fixed_clauses?: Json
          id?: string
          is_custom_clauses?: boolean
          last_viewed_at?: string | null
          package_summary?: string | null
          passengers_data?: Json
          payment_terms?: string | null
          pdf_url?: string | null
          public_token?: string | null
          signatures?: Json
          signed_at?: string | null
          signed_hash?: string | null
          status?: string
          template_id?: string | null
          total_value?: number
          trip_id?: string
          version?: string
          view_count?: number | null
          viewed_at?: string | null
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
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
          id?: string
          industry?: string | null
          payment_terms?: number | null
          status?: string
          travel_policy?: Json
          updated_at?: string
        }
        Relationships: []
      }
      corporate_policies: {
        Row: {
          agency_id: string
          allowed_cabin_classes: string[] | null
          client_id: string
          created_at: string
          id: string
          max_hotel_daily_rate: number | null
          require_approval_over: number
          updated_at: string
        }
        Insert: {
          agency_id: string
          allowed_cabin_classes?: string[] | null
          client_id: string
          created_at?: string
          id?: string
          max_hotel_daily_rate?: number | null
          require_approval_over?: number
          updated_at?: string
        }
        Update: {
          agency_id?: string
          allowed_cabin_classes?: string[] | null
          client_id?: string
          created_at?: string
          id?: string
          max_hotel_daily_rate?: number | null
          require_approval_over?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corporate_policies_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_policies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_rfps: {
        Row: {
          agency_id: string
          approval_token: string | null
          approved_at: string | null
          approved_by: string | null
          approved_option_id: string | null
          assigned_to: string | null
          budget: number | null
          company_name: string
          corporate_client_id: string | null
          created_at: string
          destination: string
          id: string
          passenger_name: string | null
          passengers_count: number | null
          proposed_options: Json | null
          rejection_reason: string | null
          requirements: string | null
          status: string
          title: string | null
          travel_dates: string | null
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          approval_token?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_option_id?: string | null
          assigned_to?: string | null
          budget?: number | null
          company_name: string
          corporate_client_id?: string | null
          created_at?: string
          destination: string
          id?: string
          passenger_name?: string | null
          passengers_count?: number | null
          proposed_options?: Json | null
          rejection_reason?: string | null
          requirements?: string | null
          status?: string
          title?: string | null
          travel_dates?: string | null
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          approval_token?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_option_id?: string | null
          assigned_to?: string | null
          budget?: number | null
          company_name?: string
          corporate_client_id?: string | null
          created_at?: string
          destination?: string
          id?: string
          passenger_name?: string | null
          passengers_count?: number | null
          proposed_options?: Json | null
          rejection_reason?: string | null
          requirements?: string | null
          status?: string
          title?: string | null
          travel_dates?: string | null
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corporate_rfps_corporate_client_id_fkey"
            columns: ["corporate_client_id"]
            isOneToOne: false
            referencedRelation: "corporate_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_rfps_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          agency_id: string
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      customer_travel_decisions: {
        Row: {
          accepted_at: string | null
          change_case_id: string
          created_at: string
          decision_status: string
          decision_text_snapshot: string | null
          disclosures_snapshot: string[] | null
          id: string
          ip_address: string | null
          otp_verified_at: string | null
          portal_session_id: string | null
          selected_alternative_id: string | null
          signature_hash: string | null
          trip_id: string
          typed_name: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          accepted_at?: string | null
          change_case_id: string
          created_at?: string
          decision_status?: string
          decision_text_snapshot?: string | null
          disclosures_snapshot?: string[] | null
          id?: string
          ip_address?: string | null
          otp_verified_at?: string | null
          portal_session_id?: string | null
          selected_alternative_id?: string | null
          signature_hash?: string | null
          trip_id: string
          typed_name?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          accepted_at?: string | null
          change_case_id?: string
          created_at?: string
          decision_status?: string
          decision_text_snapshot?: string | null
          disclosures_snapshot?: string[] | null
          id?: string
          ip_address?: string | null
          otp_verified_at?: string | null
          portal_session_id?: string | null
          selected_alternative_id?: string | null
          signature_hash?: string | null
          trip_id?: string
          typed_name?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_travel_decisions_change_case_id_fkey"
            columns: ["change_case_id"]
            isOneToOne: false
            referencedRelation: "flight_change_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_travel_decisions_selected_alternative_id_fkey"
            columns: ["selected_alternative_id"]
            isOneToOne: false
            referencedRelation: "flight_alternatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_travel_decisions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_records: {
        Row: {
          created_at: string
          decision_source: string
          id: string
          outcome: string
          quote_request_id: string
          reason: string | null
          rejected_packages: Json
          selected_package_id: string | null
          sent_packages: Json
        }
        Insert: {
          created_at?: string
          decision_source?: string
          id?: string
          outcome?: string
          quote_request_id: string
          reason?: string | null
          rejected_packages?: Json
          selected_package_id?: string | null
          sent_packages?: Json
        }
        Update: {
          created_at?: string
          decision_source?: string
          id?: string
          outcome?: string
          quote_request_id?: string
          reason?: string | null
          rejected_packages?: Json
          selected_package_id?: string | null
          sent_packages?: Json
        }
        Relationships: [
          {
            foreignKeyName: "decision_records_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_records_selected_package_id_fkey"
            columns: ["selected_package_id"]
            isOneToOne: false
            referencedRelation: "package_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_rule_versions: {
        Row: {
          approved_by: string | null
          confidence: number | null
          created_at: string
          effect: Json
          expression: Json
          id: string
          rule_id: string
          source: string
          valid_from: string
          valid_until: string | null
          version: number
        }
        Insert: {
          approved_by?: string | null
          confidence?: number | null
          created_at?: string
          effect: Json
          expression: Json
          id?: string
          rule_id: string
          source?: string
          valid_from?: string
          valid_until?: string | null
          version?: number
        }
        Update: {
          approved_by?: string | null
          confidence?: number | null
          created_at?: string
          effect?: Json
          expression?: Json
          id?: string
          rule_id?: string
          source?: string
          valid_from?: string
          valid_until?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "decision_rule_versions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "decision_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_rules: {
        Row: {
          agency_id: string | null
          code: string
          created_at: string
          current_version_id: string | null
          id: string
          scope: string
          status: string
        }
        Insert: {
          agency_id?: string | null
          code: string
          created_at?: string
          current_version_id?: string | null
          id?: string
          scope?: string
          status?: string
        }
        Update: {
          agency_id?: string | null
          code?: string
          created_at?: string
          current_version_id?: string | null
          id?: string
          scope?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      destination_info: {
        Row: {
          agency_id: string | null
          ai_generated_at: string | null
          ai_model: string | null
          best_season: string | null
          budget_range: string | null
          confidence_level: string | null
          country_code: string | null
          created_at: string
          cultural_tips: string | null
          currency: string | null
          currency_code: string | null
          destination: string
          entry_requirements: string | null
          expires_at: string | null
          health_notes: string | null
          id: string
          language: string | null
          plug_type: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          safety_level: string | null
          safety_notes: string | null
          slug: string | null
          source: string | null
          source_url: string | null
          time_zone: string | null
          tourist_tax: string | null
          tourist_tax_amount: number | null
          tourist_tax_currency: string | null
          updated_at: string
          utc_offset: string | null
          vaccinations_recommended: string[] | null
          vaccinations_required: string[] | null
          visa_info: string | null
          visa_required: boolean | null
        }
        Insert: {
          agency_id?: string | null
          ai_generated_at?: string | null
          ai_model?: string | null
          best_season?: string | null
          budget_range?: string | null
          confidence_level?: string | null
          country_code?: string | null
          created_at?: string
          cultural_tips?: string | null
          currency?: string | null
          currency_code?: string | null
          destination: string
          entry_requirements?: string | null
          expires_at?: string | null
          health_notes?: string | null
          id?: string
          language?: string | null
          plug_type?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          safety_level?: string | null
          safety_notes?: string | null
          slug?: string | null
          source?: string | null
          source_url?: string | null
          time_zone?: string | null
          tourist_tax?: string | null
          tourist_tax_amount?: number | null
          tourist_tax_currency?: string | null
          updated_at?: string
          utc_offset?: string | null
          vaccinations_recommended?: string[] | null
          vaccinations_required?: string[] | null
          visa_info?: string | null
          visa_required?: boolean | null
        }
        Update: {
          agency_id?: string | null
          ai_generated_at?: string | null
          ai_model?: string | null
          best_season?: string | null
          budget_range?: string | null
          confidence_level?: string | null
          country_code?: string | null
          created_at?: string
          cultural_tips?: string | null
          currency?: string | null
          currency_code?: string | null
          destination?: string
          entry_requirements?: string | null
          expires_at?: string | null
          health_notes?: string | null
          id?: string
          language?: string | null
          plug_type?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          safety_level?: string | null
          safety_notes?: string | null
          slug?: string | null
          source?: string | null
          source_url?: string | null
          time_zone?: string | null
          tourist_tax?: string | null
          tourist_tax_amount?: number | null
          tourist_tax_currency?: string | null
          updated_at?: string
          utc_offset?: string | null
          vaccinations_recommended?: string[] | null
          vaccinations_required?: string[] | null
          visa_info?: string | null
          visa_required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "destination_info_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      destination_review_logs: {
        Row: {
          action: string
          agency_id: string | null
          created_at: string | null
          destination_id: string
          details: string | null
          id: string
          reviewed_by: string | null
        }
        Insert: {
          action: string
          agency_id?: string | null
          created_at?: string | null
          destination_id: string
          details?: string | null
          id?: string
          reviewed_by?: string | null
        }
        Update: {
          action?: string
          agency_id?: string | null
          created_at?: string | null
          destination_id?: string
          details?: string | null
          id?: string
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "destination_review_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destination_review_logs_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destination_info"
            referencedColumns: ["id"]
          },
        ]
      }
      external_entity_links: {
        Row: {
          agency_id: string
          created_at: string | null
          entity_type: string
          external_id: string
          id: string
          internal_id: string
          last_sync_at: string | null
          metadata: Json | null
          provider: string
          sync_status: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          entity_type: string
          external_id: string
          id?: string
          internal_id: string
          last_sync_at?: string | null
          metadata?: Json | null
          provider: string
          sync_status?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          entity_type?: string
          external_id?: string
          id?: string
          internal_id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          provider?: string
          sync_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_entity_links_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          agency_id: string
          category_type: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          category_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          category_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_ledger_entries: {
        Row: {
          account_code: string
          agency_id: string
          created_at: string
          credit_amount: number
          debit_amount: number
          description: string
          entry_date: string
          id: string
          source_event: string
          source_id: string
        }
        Insert: {
          account_code: string
          agency_id: string
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          description: string
          entry_date?: string
          id?: string
          source_event: string
          source_id: string
        }
        Update: {
          account_code?: string
          agency_id?: string
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          description?: string
          entry_date?: string
          id?: string
          source_event?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_ledger_entries_agency_id_fkey"
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
          client_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          employee_id: string | null
          exchange_rate: number | null
          id: string
          installment_value: number | null
          installments: number
          invoice_number: string | null
          is_third_party: boolean | null
          operator_id: string | null
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
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          employee_id?: string | null
          exchange_rate?: number | null
          id?: string
          installment_value?: number | null
          installments?: number
          invoice_number?: string | null
          is_third_party?: boolean | null
          operator_id?: string | null
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
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          employee_id?: string | null
          exchange_rate?: number | null
          id?: string
          installment_value?: number | null
          installments?: number
          invoice_number?: string | null
          is_third_party?: boolean | null
          operator_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          public_token?: string | null
          receipt_url?: string | null
          status?: string
          trip_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          agency_id: string
          amount: number
          cash_register_id: string | null
          cash_session_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          employee_id: string | null
          id: string
          notes: string | null
          operator_id: string | null
          payment_method: string
          receipt_url: string | null
          record_id: string | null
          transaction_date: string
          type: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          amount: number
          cash_register_id?: string | null
          cash_session_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          operator_id?: string | null
          payment_method: string
          receipt_url?: string | null
          record_id?: string | null
          transaction_date?: string
          type: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          amount?: number
          cash_register_id?: string | null
          cash_session_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          operator_id?: string | null
          payment_method?: string
          receipt_url?: string | null
          record_id?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "financial_records"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_alternatives: {
        Row: {
          availability_status: string
          change_case_id: string
          created_at: string
          customer_visible: boolean
          expires_at: string | null
          id: string
          itinerary_id: string
          ranking: number
          source: string
          updated_at: string
        }
        Insert: {
          availability_status?: string
          change_case_id: string
          created_at?: string
          customer_visible?: boolean
          expires_at?: string | null
          id?: string
          itinerary_id: string
          ranking?: number
          source?: string
          updated_at?: string
        }
        Update: {
          availability_status?: string
          change_case_id?: string
          created_at?: string
          customer_visible?: boolean
          expires_at?: string | null
          id?: string
          itinerary_id?: string
          ranking?: number
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_alternatives_change_case_id_fkey"
            columns: ["change_case_id"]
            isOneToOne: false
            referencedRelation: "flight_change_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_alternatives_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "flight_itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_change_cases: {
        Row: {
          agency_id: string
          assigned_to: string | null
          change_reason: string | null
          created_at: string
          detected_at: string
          detected_by: string | null
          id: string
          original_itinerary_id: string | null
          priority: string
          resolved_at: string | null
          trip_id: string
          updated_at: string
          workflow_status: string
        }
        Insert: {
          agency_id: string
          assigned_to?: string | null
          change_reason?: string | null
          created_at?: string
          detected_at?: string
          detected_by?: string | null
          id?: string
          original_itinerary_id?: string | null
          priority?: string
          resolved_at?: string | null
          trip_id: string
          updated_at?: string
          workflow_status?: string
        }
        Update: {
          agency_id?: string
          assigned_to?: string | null
          change_reason?: string | null
          created_at?: string
          detected_at?: string
          detected_by?: string | null
          id?: string
          original_itinerary_id?: string | null
          priority?: string
          resolved_at?: string | null
          trip_id?: string
          updated_at?: string
          workflow_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_change_cases_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_change_cases_original_itinerary_id_fkey"
            columns: ["original_itinerary_id"]
            isOneToOne: false
            referencedRelation: "flight_itineraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_change_cases_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_difference_analysis: {
        Row: {
          ai_summary: string | null
          airport_changed: boolean
          alternative_itinerary_id: string
          baggage_changed: boolean
          cabin_changed: boolean
          created_at: string
          date_changed: boolean
          deterministic_summary: string | null
          id: string
          layover_delta_minutes: number
          original_itinerary_id: string
          overnight_connection: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          risk_score: number
          segment_count_delta: number
          time_changed: boolean
          total_duration_delta_minutes: number
          updated_at: string
          warnings: string[] | null
        }
        Insert: {
          ai_summary?: string | null
          airport_changed?: boolean
          alternative_itinerary_id: string
          baggage_changed?: boolean
          cabin_changed?: boolean
          created_at?: string
          date_changed?: boolean
          deterministic_summary?: string | null
          id?: string
          layover_delta_minutes?: number
          original_itinerary_id: string
          overnight_connection?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_score?: number
          segment_count_delta?: number
          time_changed?: boolean
          total_duration_delta_minutes?: number
          updated_at?: string
          warnings?: string[] | null
        }
        Update: {
          ai_summary?: string | null
          airport_changed?: boolean
          alternative_itinerary_id?: string
          baggage_changed?: boolean
          cabin_changed?: boolean
          created_at?: string
          date_changed?: boolean
          deterministic_summary?: string | null
          id?: string
          layover_delta_minutes?: number
          original_itinerary_id?: string
          overnight_connection?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_score?: number
          segment_count_delta?: number
          time_changed?: boolean
          total_duration_delta_minutes?: number
          updated_at?: string
          warnings?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "flight_difference_analysis_alternative_itinerary_id_fkey"
            columns: ["alternative_itinerary_id"]
            isOneToOne: false
            referencedRelation: "flight_itineraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_difference_analysis_original_itinerary_id_fkey"
            columns: ["original_itinerary_id"]
            isOneToOne: false
            referencedRelation: "flight_itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_itineraries: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string | null
          id: string
          source: string
          source_document_id: string | null
          status: string
          trip_id: string
          type: string
          updated_at: string
          version: number
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          source?: string
          source_document_id?: string | null
          status?: string
          trip_id: string
          type?: string
          updated_at?: string
          version?: number
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          source?: string
          source_document_id?: string | null
          status?: string
          trip_id?: string
          type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "flight_itineraries_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_itineraries_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_segments: {
        Row: {
          airline_code: string
          airport_terminal: string | null
          arrival_at: string
          baggage: string | null
          cabin: string | null
          created_at: string
          departure_at: string
          destination_iata: string
          flight_number: string
          id: string
          itinerary_id: string
          origin_iata: string
          raw_source: Json | null
          record_locator: string | null
          segment_order: number
          status: string
          updated_at: string
        }
        Insert: {
          airline_code: string
          airport_terminal?: string | null
          arrival_at: string
          baggage?: string | null
          cabin?: string | null
          created_at?: string
          departure_at: string
          destination_iata: string
          flight_number: string
          id?: string
          itinerary_id: string
          origin_iata: string
          raw_source?: Json | null
          record_locator?: string | null
          segment_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          airline_code?: string
          airport_terminal?: string | null
          arrival_at?: string
          baggage?: string | null
          cabin?: string | null
          created_at?: string
          departure_at?: string
          destination_iata?: string
          flight_number?: string
          id?: string
          itinerary_id?: string
          origin_iata?: string
          raw_source?: Json | null
          record_locator?: string | null
          segment_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_segments_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "flight_itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          agency_id: string
          balance: number
          code: string
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      group_bookings: {
        Row: {
          client_id: string | null
          created_at: string | null
          group_trip_id: string
          id: string
          lead_cpf: string | null
          lead_email: string | null
          lead_name: string
          lead_phone: string | null
          pax_count: number
          public_token: string | null
          status: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          group_trip_id: string
          id?: string
          lead_cpf?: string | null
          lead_email?: string | null
          lead_name: string
          lead_phone?: string | null
          pax_count?: number
          public_token?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          group_trip_id?: string
          id?: string
          lead_cpf?: string | null
          lead_email?: string | null
          lead_name?: string
          lead_phone?: string | null
          pax_count?: number
          public_token?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_bookings_group_trip_id_fkey"
            columns: ["group_trip_id"]
            isOneToOne: false
            referencedRelation: "group_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      group_tour_costs: {
        Row: {
          agency_id: string
          allocated_per_pax: boolean
          amount: number
          created_at: string
          description: string
          group_tour_id: string
          id: string
          type: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          allocated_per_pax?: boolean
          amount?: number
          created_at?: string
          description: string
          group_tour_id: string
          id?: string
          type?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          allocated_per_pax?: boolean
          amount?: number
          created_at?: string
          description?: string
          group_tour_id?: string
          id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_tour_costs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_tour_costs_group_tour_id_fkey"
            columns: ["group_tour_id"]
            isOneToOne: false
            referencedRelation: "group_tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_tour_costs_group_tour_id_fkey"
            columns: ["group_tour_id"]
            isOneToOne: false
            referencedRelation: "group_tours_financial_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      group_tour_enrollments: {
        Row: {
          agency_id: string
          client_id: string | null
          created_at: string
          email: string | null
          group_tour_id: string
          id: string
          notes: string | null
          passenger_cpf: string | null
          passenger_name: string
          payment_plan_id: string | null
          payment_routing: string
          phone: string | null
          receipt_url: string | null
          room_type: string | null
          seat_number: string | null
          segment_type: string
          selected_extras: Json | null
          selected_pricing_tier: Json | null
          status: string
          total_paid: number
          updated_at: string
        }
        Insert: {
          agency_id: string
          client_id?: string | null
          created_at?: string
          email?: string | null
          group_tour_id: string
          id?: string
          notes?: string | null
          passenger_cpf?: string | null
          passenger_name: string
          payment_plan_id?: string | null
          payment_routing?: string
          phone?: string | null
          receipt_url?: string | null
          room_type?: string | null
          seat_number?: string | null
          segment_type?: string
          selected_extras?: Json | null
          selected_pricing_tier?: Json | null
          status?: string
          total_paid?: number
          updated_at?: string
        }
        Update: {
          agency_id?: string
          client_id?: string | null
          created_at?: string
          email?: string | null
          group_tour_id?: string
          id?: string
          notes?: string | null
          passenger_cpf?: string | null
          passenger_name?: string
          payment_plan_id?: string | null
          payment_routing?: string
          phone?: string | null
          receipt_url?: string | null
          room_type?: string | null
          seat_number?: string | null
          segment_type?: string
          selected_extras?: Json | null
          selected_pricing_tier?: Json | null
          status?: string
          total_paid?: number
          updated_at?: string
        }
        Relationships: []
      }
      group_tours: {
        Row: {
          ads_budget: number
          agency_id: string
          agent_id: string | null
          base_price: number
          bus_layout_id: string | null
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
          departure_date: string | null
          description: string | null
          destination: string | null
          excludes: string[]
          extra_options: Json | null
          financial: Json
          gallery: string[]
          hotel_details: Json | null
          id: string
          important_notes: string | null
          includes: string[]
          is_public: boolean
          itinerary: Json
          payment_options: Json
          pricing_tiers: Json | null
          promo_media: Json | null
          registration_deadline: string | null
          reserved_seats: number
          return_date: string | null
          rooming_list_sent_bus: boolean | null
          rooming_list_sent_hotel: boolean | null
          rooming_list_status: string | null
          seat_map: Json
          seo: Json
          slug: string
          status: string
          target_poupanca_balance: number
          title: string
          total_seats: number
          transport_details: string | null
          transport_type: string | null
          updated_at: string
        }
        Insert: {
          ads_budget?: number
          agency_id: string
          agent_id?: string | null
          base_price?: number
          bus_layout_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          departure_date?: string | null
          description?: string | null
          destination?: string | null
          excludes?: string[]
          extra_options?: Json | null
          financial?: Json
          gallery?: string[]
          hotel_details?: Json | null
          id?: string
          important_notes?: string | null
          includes?: string[]
          is_public?: boolean
          itinerary?: Json
          payment_options?: Json
          pricing_tiers?: Json | null
          promo_media?: Json | null
          registration_deadline?: string | null
          reserved_seats?: number
          return_date?: string | null
          rooming_list_sent_bus?: boolean | null
          rooming_list_sent_hotel?: boolean | null
          rooming_list_status?: string | null
          seat_map?: Json
          seo?: Json
          slug: string
          status?: string
          target_poupanca_balance?: number
          title: string
          total_seats?: number
          transport_details?: string | null
          transport_type?: string | null
          updated_at?: string
        }
        Update: {
          ads_budget?: number
          agency_id?: string
          agent_id?: string | null
          base_price?: number
          bus_layout_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          departure_date?: string | null
          description?: string | null
          destination?: string | null
          excludes?: string[]
          extra_options?: Json | null
          financial?: Json
          gallery?: string[]
          hotel_details?: Json | null
          id?: string
          important_notes?: string | null
          includes?: string[]
          is_public?: boolean
          itinerary?: Json
          payment_options?: Json
          pricing_tiers?: Json | null
          promo_media?: Json | null
          registration_deadline?: string | null
          reserved_seats?: number
          return_date?: string | null
          rooming_list_sent_bus?: boolean | null
          rooming_list_sent_hotel?: boolean | null
          rooming_list_status?: string | null
          seat_map?: Json
          seo?: Json
          slug?: string
          status?: string
          target_poupanca_balance?: number
          title?: string
          total_seats?: number
          transport_details?: string | null
          transport_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_tours_bus_layout_id_fkey"
            columns: ["bus_layout_id"]
            isOneToOne: false
            referencedRelation: "bus_layouts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_trip_days: {
        Row: {
          created_at: string | null
          day_number: number
          description_md: string | null
          group_trip_id: string
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_number: number
          description_md?: string | null
          group_trip_id: string
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_number?: number
          description_md?: string | null
          group_trip_id?: string
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_trip_days_group_trip_id_fkey"
            columns: ["group_trip_id"]
            isOneToOne: false
            referencedRelation: "group_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      group_trips: {
        Row: {
          agency_id: string
          bus_layout_id: string | null
          cover_image_url: string | null
          created_at: string | null
          currency: string | null
          current_pax: number | null
          departure_date: string | null
          destination: string | null
          excludes: string[] | null
          gallery_urls: string[] | null
          id: string
          important_notes: string | null
          includes: string[] | null
          installments_count: number | null
          is_public: boolean | null
          max_pax: number
          payment_due_offset_days: number | null
          price_per_pax: number
          return_date: string | null
          slug: string
          status: string | null
          subtitle: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          bus_layout_id?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          currency?: string | null
          current_pax?: number | null
          departure_date?: string | null
          destination?: string | null
          excludes?: string[] | null
          gallery_urls?: string[] | null
          id?: string
          important_notes?: string | null
          includes?: string[] | null
          installments_count?: number | null
          is_public?: boolean | null
          max_pax?: number
          payment_due_offset_days?: number | null
          price_per_pax?: number
          return_date?: string | null
          slug: string
          status?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          bus_layout_id?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          currency?: string | null
          current_pax?: number | null
          departure_date?: string | null
          destination?: string | null
          excludes?: string[] | null
          gallery_urls?: string[] | null
          id?: string
          important_notes?: string | null
          includes?: string[] | null
          installments_count?: number | null
          is_public?: boolean | null
          max_pax?: number
          payment_due_offset_days?: number | null
          price_per_pax?: number
          return_date?: string | null
          slug?: string
          status?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_trips_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_trips_bus_layout_id_fkey"
            columns: ["bus_layout_id"]
            isOneToOne: false
            referencedRelation: "bus_layouts"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_queues: {
        Row: {
          agency_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_queues_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_team_members: {
        Row: {
          role: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          role?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          role?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "inbox_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_teams: {
        Row: {
          agency_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_teams_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          agency_id: string
          amount: number
          cancellation_date: string | null
          client_id: string | null
          created_at: string
          deleted_at: string | null
          error_message: string | null
          financial_record_id: string | null
          id: string
          invoice_number: string | null
          iss_retido: boolean
          issue_date: string | null
          pdf_url: string | null
          provider_data: Json
          status: string
          tax_amount: number | null
          trip_id: string | null
          updated_at: string
          xml_url: string | null
        }
        Insert: {
          agency_id: string
          amount: number
          cancellation_date?: string | null
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          error_message?: string | null
          financial_record_id?: string | null
          id?: string
          invoice_number?: string | null
          iss_retido?: boolean
          issue_date?: string | null
          pdf_url?: string | null
          provider_data?: Json
          status?: string
          tax_amount?: number | null
          trip_id?: string | null
          updated_at?: string
          xml_url?: string | null
        }
        Update: {
          agency_id?: string
          amount?: number
          cancellation_date?: string | null
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          error_message?: string | null
          financial_record_id?: string | null
          id?: string
          invoice_number?: string | null
          iss_retido?: boolean
          issue_date?: string | null
          pdf_url?: string | null
          provider_data?: Json
          status?: string
          tax_amount?: number | null
          trip_id?: string | null
          updated_at?: string
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_financial_record_id_fkey"
            columns: ["financial_record_id"]
            isOneToOne: false
            referencedRelation: "financial_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_article_votes: {
        Row: {
          article_id: string
          created_at: string
          ip_address: string
        }
        Insert: {
          article_id: string
          created_at?: string
          ip_address: string
        }
        Update: {
          article_id?: string
          created_at?: string
          ip_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_article_votes_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "knowledge_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_articles: {
        Row: {
          agency_id: string
          category: string | null
          content: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_internal: boolean
          search_vector: unknown
          slug: string | null
          tags: string[]
          title: string
          updated_at: string
          views: number
          votes_down: number
          votes_up: number
        }
        Insert: {
          agency_id: string
          category?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_internal?: boolean
          search_vector?: unknown
          slug?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          views?: number
          votes_down?: number
          votes_up?: number
        }
        Update: {
          agency_id?: string
          category?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_internal?: boolean
          search_vector?: unknown
          slug?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          views?: number
          votes_down?: number
          votes_up?: number
        }
        Relationships: []
      }
      knowledge_chunks: {
        Row: {
          agency_id: string | null
          content: string
          created_at: string
          document_id: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          agency_id?: string | null
          content: string
          created_at?: string
          document_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          agency_id?: string | null
          content?: string
          created_at?: string
          document_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          agency_id: string | null
          category: string
          content: string | null
          created_at: string
          id: string
          metadata: Json | null
          scope: string
          source_id: string | null
          title: string
        }
        Insert: {
          agency_id?: string | null
          category?: string
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          scope?: string
          source_id?: string | null
          title: string
        }
        Update: {
          agency_id?: string | null
          category?: string
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          scope?: string
          source_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_documents_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_embeddings: {
        Row: {
          agency_id: string | null
          chunk_id: string | null
          created_at: string
          embedding: string
          embedding_model: string
          id: string
        }
        Insert: {
          agency_id?: string | null
          chunk_id?: string | null
          created_at?: string
          embedding: string
          embedding_model?: string
          id?: string
        }
        Update: {
          agency_id?: string | null
          chunk_id?: string | null
          created_at?: string
          embedding?: string
          embedding_model?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_embeddings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_embeddings_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "knowledge_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_playbook_steps: {
        Row: {
          ai_guidelines: string | null
          cancellation_provider: string | null
          created_at: string
          description: string | null
          id: string
          playbook_id: string | null
          step_number: number
          title: string
        }
        Insert: {
          ai_guidelines?: string | null
          cancellation_provider?: string | null
          created_at?: string
          description?: string | null
          id?: string
          playbook_id?: string | null
          step_number: number
          title: string
        }
        Update: {
          ai_guidelines?: string | null
          cancellation_provider?: string | null
          created_at?: string
          description?: string | null
          id?: string
          playbook_id?: string | null
          step_number?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_playbook_steps_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "knowledge_playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_playbooks: {
        Row: {
          agency_id: string | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_playbooks_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_sources: {
        Row: {
          agency_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          name: string
          scope: string
          source_type: string
          source_url: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          name: string
          scope?: string
          source_type?: string
          source_url?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          name?: string
          scope?: string
          source_type?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_sources_agency_id_fkey"
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
      lead_forms: {
        Row: {
          agency_id: string
          created_at: string
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      lead_insights: {
        Row: {
          agency_id: string | null
          budget_signals: Json | null
          desires: Json | null
          fears: Json | null
          general_profile: string | null
          id: string
          last_analyzed_message_id: string | null
          lead_id: string | null
          next_best_action: string | null
          objections: Json | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          budget_signals?: Json | null
          desires?: Json | null
          fears?: Json | null
          general_profile?: string | null
          id?: string
          last_analyzed_message_id?: string | null
          lead_id?: string | null
          next_best_action?: string | null
          objections?: Json | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          budget_signals?: Json | null
          desires?: Json | null
          fears?: Json | null
          general_profile?: string | null
          id?: string
          last_analyzed_message_id?: string | null
          lead_id?: string | null
          next_best_action?: string | null
          objections?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_insights_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_insights_last_analyzed_message_id_fkey"
            columns: ["last_analyzed_message_id"]
            isOneToOne: false
            referencedRelation: "omnichannel_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_insights_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_meetings: {
        Row: {
          agency_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          google_event_id: string | null
          id: string
          invite_sent: boolean
          lead_id: string | null
          meeting_type: string
          scheduled_at: string
          title: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          google_event_id?: string | null
          id?: string
          invite_sent?: boolean
          lead_id?: string | null
          meeting_type?: string
          scheduled_at: string
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          google_event_id?: string | null
          id?: string
          invite_sent?: boolean
          lead_id?: string | null
          meeting_type?: string
          scheduled_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_meetings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_meetings_lead_id_fkey"
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
          attachments: Json
          autism: boolean
          avatar_url: string | null
          checklist: Json
          click_id: string | null
          client_id: string | null
          closed_at: string | null
          converted_at: string | null
          created_at: string
          custom_fields: Json
          deleted_at: string | null
          destination: string | null
          email: string | null
          estimated_value: number | null
          form_id: string | null
          health_notes: string | null
          id: string
          interest_type: string | null
          last_contact_at: string | null
          last_contacted_at: string | null
          lead_source_detail: string | null
          lgpd_accepted: boolean
          lgpd_accepted_at: string | null
          lost_reason: string | null
          name: string
          notes: string | null
          owner_id: string | null
          pax_adults: number
          pax_ages: Json
          pax_children: number
          pax_count: number | null
          pax_infants: number
          pax_list: Json
          pcd: boolean
          phone: string | null
          position: number
          preferences: Json
          proposal_id: string | null
          reduced_mobility: boolean
          source: string | null
          stage_id: string
          staleness_status: string
          tags: string[]
          travel_end: string | null
          travel_start: string | null
          trip_id: string | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          agency_id: string
          attachments?: Json
          autism?: boolean
          avatar_url?: string | null
          checklist?: Json
          click_id?: string | null
          client_id?: string | null
          closed_at?: string | null
          converted_at?: string | null
          created_at?: string
          custom_fields?: Json
          deleted_at?: string | null
          destination?: string | null
          email?: string | null
          estimated_value?: number | null
          form_id?: string | null
          health_notes?: string | null
          id?: string
          interest_type?: string | null
          last_contact_at?: string | null
          last_contacted_at?: string | null
          lead_source_detail?: string | null
          lgpd_accepted?: boolean
          lgpd_accepted_at?: string | null
          lost_reason?: string | null
          name: string
          notes?: string | null
          owner_id?: string | null
          pax_adults?: number
          pax_ages?: Json
          pax_children?: number
          pax_count?: number | null
          pax_infants?: number
          pax_list?: Json
          pcd?: boolean
          phone?: string | null
          position?: number
          preferences?: Json
          proposal_id?: string | null
          reduced_mobility?: boolean
          source?: string | null
          stage_id: string
          staleness_status?: string
          tags?: string[]
          travel_end?: string | null
          travel_start?: string | null
          trip_id?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          agency_id?: string
          attachments?: Json
          autism?: boolean
          avatar_url?: string | null
          checklist?: Json
          click_id?: string | null
          client_id?: string | null
          closed_at?: string | null
          converted_at?: string | null
          created_at?: string
          custom_fields?: Json
          deleted_at?: string | null
          destination?: string | null
          email?: string | null
          estimated_value?: number | null
          form_id?: string | null
          health_notes?: string | null
          id?: string
          interest_type?: string | null
          last_contact_at?: string | null
          last_contacted_at?: string | null
          lead_source_detail?: string | null
          lgpd_accepted?: boolean
          lgpd_accepted_at?: string | null
          lost_reason?: string | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          pax_adults?: number
          pax_ages?: Json
          pax_children?: number
          pax_count?: number | null
          pax_infants?: number
          pax_list?: Json
          pcd?: boolean
          phone?: string | null
          position?: number
          preferences?: Json
          proposal_id?: string | null
          reduced_mobility?: boolean
          source?: string | null
          stage_id?: string
          staleness_status?: string
          tags?: string[]
          travel_end?: string | null
          travel_start?: string | null
          trip_id?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
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
            foreignKeyName: "leads_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "lead_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "lead_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_acceptances: {
        Row: {
          accepted_at: string
          agency_id: string | null
          client_id: string | null
          context: string | null
          document_id: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          accepted_at?: string
          agency_id?: string | null
          client_id?: string | null
          context?: string | null
          document_id: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          accepted_at?: string
          agency_id?: string | null
          client_id?: string | null
          context?: string | null
          document_id?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_acceptances_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_acceptances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_acceptances_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "policy_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_closing_periods: {
        Row: {
          agency_id: string
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          month: number
          opened_at: string
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          agency_id: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          month: number
          opened_at?: string
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          agency_id?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          month?: number
          opened_at?: string
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_closing_periods_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_closing_periods_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      normalized_offers: {
        Row: {
          currency: string
          expires_at: string | null
          external_offer_id: string | null
          fetched_at: string
          id: string
          normalized_data: Json
          price_total: number
          product_type: string
          provider: string
          quote_request_id: string
          scenario_id: string | null
          status: string
        }
        Insert: {
          currency?: string
          expires_at?: string | null
          external_offer_id?: string | null
          fetched_at?: string
          id?: string
          normalized_data: Json
          price_total?: number
          product_type: string
          provider: string
          quote_request_id: string
          scenario_id?: string | null
          status?: string
        }
        Update: {
          currency?: string
          expires_at?: string | null
          external_offer_id?: string | null
          fetched_at?: string
          id?: string
          normalized_data?: Json
          price_total?: number
          product_type?: string
          provider?: string
          quote_request_id?: string
          scenario_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "normalized_offers_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "normalized_offers_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "quote_scenarios"
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
      omnichannel_message_embeddings: {
        Row: {
          agency_id: string | null
          content: string
          created_at: string
          embedding: string | null
          id: string
          lead_id: string | null
          message_id: string | null
        }
        Insert: {
          agency_id?: string | null
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          lead_id?: string | null
          message_id?: string | null
        }
        Update: {
          agency_id?: string | null
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          lead_id?: string | null
          message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "omnichannel_message_embeddings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omnichannel_message_embeddings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omnichannel_message_embeddings_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "omnichannel_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      omnichannel_messages: {
        Row: {
          agency_id: string | null
          channel: string
          content: string | null
          created_at: string
          delivered_at: string | null
          direction: string
          external_message_id: string | null
          failed_at: string | null
          failure_code: string | null
          failure_message: string | null
          id: string
          lead_id: string | null
          media_type: string | null
          media_url: string | null
          read_at: string | null
          reply_to: string | null
          sender_id: string | null
          session_id: string | null
          source: string | null
          status: string
          updated_at: string
          wamid: string | null
        }
        Insert: {
          agency_id?: string | null
          channel?: string
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          direction: string
          external_message_id?: string | null
          failed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          lead_id?: string | null
          media_type?: string | null
          media_url?: string | null
          read_at?: string | null
          reply_to?: string | null
          sender_id?: string | null
          session_id?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          wamid?: string | null
        }
        Update: {
          agency_id?: string | null
          channel?: string
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          direction?: string
          external_message_id?: string | null
          failed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          lead_id?: string | null
          media_type?: string | null
          media_url?: string | null
          read_at?: string | null
          reply_to?: string | null
          sender_id?: string | null
          session_id?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          wamid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "omnichannel_messages_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omnichannel_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omnichannel_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "omnichannel_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omnichannel_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "omnichannel_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      omnichannel_sessions: {
        Row: {
          agency_id: string | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          assignment_status: string | null
          channel: string
          connection_id: string | null
          contact_avatar_url: string | null
          contact_id: string | null
          contact_name: string | null
          created_at: string
          id: string
          last_assignment_reason: string | null
          last_message_at: string | null
          last_message_preview: string | null
          phone_number: string | null
          priority: number | null
          provider: string
          qr_code: string | null
          queue_id: string | null
          session_name: string
          status: string
          tags: string[] | null
          team_id: string | null
          unread_count: number
          updated_at: string
          visibility_scope: string | null
        }
        Insert: {
          agency_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          assignment_status?: string | null
          channel?: string
          connection_id?: string | null
          contact_avatar_url?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          last_assignment_reason?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          phone_number?: string | null
          priority?: number | null
          provider?: string
          qr_code?: string | null
          queue_id?: string | null
          session_name: string
          status?: string
          tags?: string[] | null
          team_id?: string | null
          unread_count?: number
          updated_at?: string
          visibility_scope?: string | null
        }
        Update: {
          agency_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          assignment_status?: string | null
          channel?: string
          connection_id?: string | null
          contact_avatar_url?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          last_assignment_reason?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          phone_number?: string | null
          priority?: number | null
          provider?: string
          qr_code?: string | null
          queue_id?: string | null
          session_name?: string
          status?: string
          tags?: string[] | null
          team_id?: string | null
          unread_count?: number
          updated_at?: string
          visibility_scope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "omnichannel_sessions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omnichannel_sessions_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omnichannel_sessions_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "inbox_queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omnichannel_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "inbox_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_reaccommodation_requests: {
        Row: {
          change_case_id: string
          confirmed_at: string | null
          confirmed_itinerary_id: string | null
          created_at: string
          customer_decision_id: string | null
          email_thread_id: string | null
          id: string
          operator_id: string | null
          requested_at: string
          response_snapshot: Json | null
          status: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          change_case_id: string
          confirmed_at?: string | null
          confirmed_itinerary_id?: string | null
          created_at?: string
          customer_decision_id?: string | null
          email_thread_id?: string | null
          id?: string
          operator_id?: string | null
          requested_at?: string
          response_snapshot?: Json | null
          status?: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          change_case_id?: string
          confirmed_at?: string | null
          confirmed_itinerary_id?: string | null
          created_at?: string
          customer_decision_id?: string | null
          email_thread_id?: string | null
          id?: string
          operator_id?: string | null
          requested_at?: string
          response_snapshot?: Json | null
          status?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_reaccommodation_requests_change_case_id_fkey"
            columns: ["change_case_id"]
            isOneToOne: false
            referencedRelation: "flight_change_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_reaccommodation_requests_confirmed_itinerary_id_fkey"
            columns: ["confirmed_itinerary_id"]
            isOneToOne: false
            referencedRelation: "flight_itineraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_reaccommodation_requests_customer_decision_id_fkey"
            columns: ["customer_decision_id"]
            isOneToOne: false
            referencedRelation: "customer_travel_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_reaccommodation_requests_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_reaccommodation_requests_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      package_candidate_components: {
        Row: {
          component_type: string
          id: string
          metadata: Json | null
          offer_id: string
          package_candidate_id: string
          price_allocation: number
          sort_order: number
        }
        Insert: {
          component_type: string
          id?: string
          metadata?: Json | null
          offer_id: string
          package_candidate_id: string
          price_allocation?: number
          sort_order?: number
        }
        Update: {
          component_type?: string
          id?: string
          metadata?: Json | null
          offer_id?: string
          package_candidate_id?: string
          price_allocation?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_candidate_components_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "normalized_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_candidate_components_package_candidate_id_fkey"
            columns: ["package_candidate_id"]
            isOneToOne: false
            referencedRelation: "package_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      package_candidates: {
        Row: {
          composition_version: number
          created_at: string
          currency: string
          id: string
          name: string
          quote_request_id: string
          score: number
          score_profile_id: string | null
          status: string
          total_price: number
          warnings: Json | null
        }
        Insert: {
          composition_version?: number
          created_at?: string
          currency?: string
          id?: string
          name: string
          quote_request_id: string
          score?: number
          score_profile_id?: string | null
          status?: string
          total_price?: number
          warnings?: Json | null
        }
        Update: {
          composition_version?: number
          created_at?: string
          currency?: string
          id?: string
          name?: string
          quote_request_id?: string
          score?: number
          score_profile_id?: string | null
          status?: string
          total_price?: number
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "package_candidates_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      package_scorecards: {
        Row: {
          bonuses: Json
          confidence: number | null
          created_at: string
          dimensions: Json
          explanation: string | null
          final_score: number
          id: string
          package_candidate_id: string
          penalties: Json
          rule_version_set: string
        }
        Insert: {
          bonuses?: Json
          confidence?: number | null
          created_at?: string
          dimensions?: Json
          explanation?: string | null
          final_score?: number
          id?: string
          package_candidate_id: string
          penalties?: Json
          rule_version_set: string
        }
        Update: {
          bonuses?: Json
          confidence?: number | null
          created_at?: string
          dimensions?: Json
          explanation?: string | null
          final_score?: number
          id?: string
          package_candidate_id?: string
          penalties?: Json
          rule_version_set?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_scorecards_package_candidate_id_fkey"
            columns: ["package_candidate_id"]
            isOneToOne: false
            referencedRelation: "package_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      passenger_documents: {
        Row: {
          agency_id: string
          created_at: string
          document_type: string
          expiration_date: string | null
          extracted_metadata: Json
          file_path: string
          id: string
          passenger_id: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          document_type: string
          expiration_date?: string | null
          extracted_metadata?: Json
          file_path: string
          id?: string
          passenger_id: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          document_type?: string
          expiration_date?: string | null
          extracted_metadata?: Json
          file_path?: string
          id?: string
          passenger_id?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "passenger_documents_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passenger_documents_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "trip_passengers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passenger_documents_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_installments: {
        Row: {
          agency_id: string
          amount: number
          barcode: string | null
          boleto_url: string | null
          due_date: string
          id: string
          is_third_party: boolean | null
          late_fee: number
          number: number
          ocr_data: Json | null
          paid_at: string | null
          payment_method: string | null
          payment_plan_id: string
          payment_warning: string | null
          receipt_status: string
          receipt_uploaded_at: string | null
          receipt_url: string | null
          rejection_reason: string | null
          status: string
        }
        Insert: {
          agency_id: string
          amount?: number
          barcode?: string | null
          boleto_url?: string | null
          due_date: string
          id?: string
          is_third_party?: boolean | null
          late_fee?: number
          number: number
          ocr_data?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          payment_plan_id: string
          payment_warning?: string | null
          receipt_status?: string
          receipt_uploaded_at?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          status?: string
        }
        Update: {
          agency_id?: string
          amount?: number
          barcode?: string | null
          boleto_url?: string | null
          due_date?: string
          id?: string
          is_third_party?: boolean | null
          late_fee?: number
          number?: number
          ocr_data?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          payment_plan_id?: string
          payment_warning?: string | null
          receipt_status?: string
          receipt_uploaded_at?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
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
      payment_receipt_snapshots: {
        Row: {
          agency_id: string
          amount: number
          created_at: string
          description: string | null
          enrollment_id: string | null
          id: string
          payer_cpf: string | null
          payer_name: string
          payment_date: string
          payment_method: string | null
          receipt_id: string
          seat_number: string | null
          trip_title: string
        }
        Insert: {
          agency_id: string
          amount: number
          created_at?: string
          description?: string | null
          enrollment_id?: string | null
          id?: string
          payer_cpf?: string | null
          payer_name: string
          payment_date?: string
          payment_method?: string | null
          receipt_id: string
          seat_number?: string | null
          trip_title: string
        }
        Update: {
          agency_id?: string
          amount?: number
          created_at?: string
          description?: string | null
          enrollment_id?: string | null
          id?: string
          payer_cpf?: string | null
          payer_name?: string
          payment_date?: string
          payment_method?: string | null
          receipt_id?: string
          seat_number?: string | null
          trip_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipt_snapshots_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipt_snapshots_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "group_tour_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          badge: string | null
          created_at: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          is_featured: boolean | null
          max_agents: number | null
          max_clients: number | null
          max_storage_gb: number | null
          max_trips_per_month: number | null
          name: string
          price_annual: number
          price_monthly: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          badge?: string | null
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_featured?: boolean | null
          max_agents?: number | null
          max_clients?: number | null
          max_storage_gb?: number | null
          max_trips_per_month?: number | null
          name: string
          price_annual?: number
          price_monthly?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          badge?: string | null
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_featured?: boolean | null
          max_agents?: number | null
          max_clients?: number | null
          max_storage_gb?: number | null
          max_trips_per_month?: number | null
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
          is_published: boolean
          kind: string
          version: string
        }
        Insert: {
          content_md: string
          created_at?: string
          created_by?: string | null
          effective_at?: string
          id?: string
          is_published?: boolean
          kind: string
          version: string
        }
        Update: {
          content_md?: string
          created_at?: string
          created_by?: string | null
          effective_at?: string
          id?: string
          is_published?: boolean
          kind?: string
          version?: string
        }
        Relationships: []
      }
      portal_page_analytics: {
        Row: {
          agency_id: string
          created_at: string
          device_type: string | null
          event_type: string
          id: string
          link_url: string | null
          page_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          device_type?: string | null
          event_type: string
          id?: string
          link_url?: string | null
          page_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          device_type?: string | null
          event_type?: string
          id?: string
          link_url?: string | null
          page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_page_analytics_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_page_analytics_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "portal_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_page_versions: {
        Row: {
          agency_id: string
          blocks: Json
          created_at: string
          created_by: string | null
          id: string
          page_id: string
          seo: Json
          slug: string | null
          template: string | null
          title: string
        }
        Insert: {
          agency_id: string
          blocks?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          page_id: string
          seo?: Json
          slug?: string | null
          template?: string | null
          title: string
        }
        Update: {
          agency_id?: string
          blocks?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          page_id?: string
          seo?: Json
          slug?: string | null
          template?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_page_versions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "portal_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_pages: {
        Row: {
          agency_id: string
          blocks: Json
          canvas_format: string | null
          category: string | null
          content: Json | null
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_published: boolean
          published_at: string | null
          published_blocks: Json | null
          published_seo: Json | null
          published_title: string | null
          seo: Json
          slug: string
          sort_order: number
          status: string | null
          template: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          blocks?: Json
          canvas_format?: string | null
          category?: string | null
          content?: Json | null
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          published_blocks?: Json | null
          published_seo?: Json | null
          published_title?: string | null
          seo?: Json
          slug: string
          sort_order?: number
          status?: string | null
          template?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          blocks?: Json
          canvas_format?: string | null
          category?: string | null
          content?: Json | null
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          published_blocks?: Json | null
          published_seo?: Json | null
          published_title?: string | null
          seo?: Json
          slug?: string
          sort_order?: number
          status?: string | null
          template?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_pages_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_settings: {
        Row: {
          agency_id: string
          analytics_id: string | null
          created_at: string
          custom_domain: string | null
          custom_head_script: string | null
          footer_links: Json | null
          footer_text: string | null
          header_cta_label: string | null
          header_cta_url: string | null
          header_style: string | null
          id: string
          meta_pixel_id: string | null
          nav_links: Json | null
          pix_key: string | null
          seo_default_description: string | null
          seo_og_image_url: string | null
          seo_title_suffix: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          analytics_id?: string | null
          created_at?: string
          custom_domain?: string | null
          custom_head_script?: string | null
          footer_links?: Json | null
          footer_text?: string | null
          header_cta_label?: string | null
          header_cta_url?: string | null
          header_style?: string | null
          id?: string
          meta_pixel_id?: string | null
          nav_links?: Json | null
          pix_key?: string | null
          seo_default_description?: string | null
          seo_og_image_url?: string | null
          seo_title_suffix?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          analytics_id?: string | null
          created_at?: string
          custom_domain?: string | null
          custom_head_script?: string | null
          footer_links?: Json | null
          footer_text?: string | null
          header_cta_label?: string | null
          header_cta_url?: string | null
          header_style?: string | null
          id?: string
          meta_pixel_id?: string | null
          nav_links?: Json | null
          pix_key?: string | null
          seo_default_description?: string | null
          seo_og_image_url?: string | null
          seo_title_suffix?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_settings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
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
      promotion_candidates: {
        Row: {
          created_at: string
          detected_at: string
          id: string
          package_candidate_id: string
          reason: string | null
          score: number
          status: string
          watch_profile_id: string
        }
        Insert: {
          created_at?: string
          detected_at?: string
          id?: string
          package_candidate_id: string
          reason?: string | null
          score?: number
          status?: string
          watch_profile_id: string
        }
        Update: {
          created_at?: string
          detected_at?: string
          id?: string
          package_candidate_id?: string
          reason?: string | null
          score?: number
          status?: string
          watch_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_candidates_package_candidate_id_fkey"
            columns: ["package_candidate_id"]
            isOneToOne: false
            referencedRelation: "package_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_candidates_watch_profile_id_fkey"
            columns: ["watch_profile_id"]
            isOneToOne: false
            referencedRelation: "promotion_watch_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_watch_profiles: {
        Row: {
          agency_id: string
          created_at: string
          criteria: Json
          id: string
          limits: Json
          name: string
          schedule: string
          status: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          criteria?: Json
          id?: string
          limits?: Json
          name: string
          schedule: string
          status?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          criteria?: Json
          id?: string
          limits?: Json
          name?: string
          schedule?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_watch_profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_history: {
        Row: {
          action: string
          agency_id: string
          agent_id: string | null
          created_at: string
          details: Json | null
          id: string
          proposal_id: string
        }
        Insert: {
          action: string
          agency_id: string
          agent_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          proposal_id: string
        }
        Update: {
          action?: string
          agency_id?: string
          agent_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          proposal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_history_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_history_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
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
          agent_name: string | null
          agent_photo_url: string | null
          agent_whatsapp: string | null
          canvas_format: string | null
          client_id: string | null
          cover_image_url: string | null
          cover_prompt: string | null
          created_at: string
          currency: string
          custom_payments: Json | null
          decided_at: string | null
          deleted_at: string | null
          destination: string | null
          discount: number
          emergency_contacts: Json | null
          excludes: Json
          extra_pages: Json | null
          flights: Json
          group_tour_id: string | null
          hotels: Json
          id: string
          includes: Json
          installments_boleto: number
          installments_card: number
          insurance: Json | null
          is_public_template: boolean
          itinerary: Json
          lead_id: string | null
          map_image_url: string | null
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
          visibility: string
          waypoints: Json | null
        }
        Insert: {
          agency_id: string
          agent_name?: string | null
          agent_photo_url?: string | null
          agent_whatsapp?: string | null
          canvas_format?: string | null
          client_id?: string | null
          cover_image_url?: string | null
          cover_prompt?: string | null
          created_at?: string
          currency?: string
          custom_payments?: Json | null
          decided_at?: string | null
          deleted_at?: string | null
          destination?: string | null
          discount?: number
          emergency_contacts?: Json | null
          excludes?: Json
          extra_pages?: Json | null
          flights?: Json
          group_tour_id?: string | null
          hotels?: Json
          id?: string
          includes?: Json
          installments_boleto?: number
          installments_card?: number
          insurance?: Json | null
          is_public_template?: boolean
          itinerary?: Json
          lead_id?: string | null
          map_image_url?: string | null
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
          visibility?: string
          waypoints?: Json | null
        }
        Update: {
          agency_id?: string
          agent_name?: string | null
          agent_photo_url?: string | null
          agent_whatsapp?: string | null
          canvas_format?: string | null
          client_id?: string | null
          cover_image_url?: string | null
          cover_prompt?: string | null
          created_at?: string
          currency?: string
          custom_payments?: Json | null
          decided_at?: string | null
          deleted_at?: string | null
          destination?: string | null
          discount?: number
          emergency_contacts?: Json | null
          excludes?: Json
          extra_pages?: Json | null
          flights?: Json
          group_tour_id?: string | null
          hotels?: Json
          id?: string
          includes?: Json
          installments_boleto?: number
          installments_card?: number
          insurance?: Json | null
          is_public_template?: boolean
          itinerary?: Json
          lead_id?: string | null
          map_image_url?: string | null
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
          visibility?: string
          waypoints?: Json | null
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
            foreignKeyName: "proposals_group_tour_id_fkey"
            columns: ["group_tour_id"]
            isOneToOne: false
            referencedRelation: "group_tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_group_tour_id_fkey"
            columns: ["group_tour_id"]
            isOneToOne: false
            referencedRelation: "group_tours_financial_summary"
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
      public_leads: {
        Row: {
          agency_id: string
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          site_id: string | null
          subject: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          site_id?: string | null
          subject?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          site_id?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_leads_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_leads_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "portal_pages"
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
      quote_preferences: {
        Row: {
          confidence: number | null
          created_at: string
          hard_constraint: boolean
          id: string
          preference_key: string
          preference_value: string
          priority: number
          quote_request_id: string
          source: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          hard_constraint?: boolean
          id?: string
          preference_key: string
          preference_value: string
          priority?: number
          quote_request_id: string
          source?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          hard_constraint?: boolean
          id?: string
          preference_key?: string
          preference_value?: string
          priority?: number
          quote_request_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_preferences_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_raw_results: {
        Row: {
          endpoint: string
          expires_at: string
          fetched_at: string
          id: string
          provider: string
          quote_request_id: string
          raw_payload: Json
          scenario_id: string | null
        }
        Insert: {
          endpoint: string
          expires_at: string
          fetched_at?: string
          id?: string
          provider: string
          quote_request_id: string
          raw_payload: Json
          scenario_id?: string | null
        }
        Update: {
          endpoint?: string
          expires_at?: string
          fetched_at?: string
          id?: string
          provider?: string
          quote_request_id?: string
          raw_payload?: Json
          scenario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_raw_results_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_raw_results_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "quote_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          agency_id: string
          assigned_agent_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          lead_id: string | null
          normalized_intent: Json | null
          raw_request: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          assigned_agent_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          normalized_intent?: Json | null
          raw_request?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          assigned_agent_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          normalized_intent?: Json | null
          raw_request?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_scenarios: {
        Row: {
          created_at: string
          id: string
          name: string
          parameters: Json
          priority: number
          reason: string | null
          scenario_type: string
          search_plan_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parameters?: Json
          priority?: number
          reason?: string | null
          scenario_type: string
          search_plan_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parameters?: Json
          priority?: number
          reason?: string | null
          scenario_type?: string
          search_plan_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_scenarios_search_plan_id_fkey"
            columns: ["search_plan_id"]
            isOneToOne: false
            referencedRelation: "quote_search_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_search_plans: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          limits: Json | null
          quote_request_id: string
          status: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          limits?: Json | null
          quote_request_id: string
          status?: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          limits?: Json | null
          quote_request_id?: string
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_search_plans_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_snapshots: {
        Row: {
          created_at: string
          data: Json
          hash: string
          id: string
          quote_request_id: string
          snapshot_type: string
          version: number
        }
        Insert: {
          created_at?: string
          data: Json
          hash: string
          id?: string
          quote_request_id: string
          snapshot_type: string
          version?: number
        }
        Update: {
          created_at?: string
          data?: Json
          hash?: string
          id?: string
          quote_request_id?: string
          snapshot_type?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_snapshots_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_travelers: {
        Row: {
          age: number | null
          attributes: Json | null
          client_traveler_id: string | null
          created_at: string
          id: string
          quote_request_id: string
          traveler_type: string
        }
        Insert: {
          age?: number | null
          attributes?: Json | null
          client_traveler_id?: string | null
          created_at?: string
          id?: string
          quote_request_id: string
          traveler_type?: string
        }
        Update: {
          age?: number | null
          attributes?: Json | null
          client_traveler_id?: string | null
          created_at?: string
          id?: string
          quote_request_id?: string
          traveler_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_travelers_client_traveler_id_fkey"
            columns: ["client_traveler_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_travelers_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_candidates: {
        Row: {
          agency_id: string
          confidence: number
          created_at: string
          id: string
          pattern: string
          proposed_rule: Json
          reviewed_by: string | null
          sample_size: number
          simulated_impact: Json | null
          status: string
        }
        Insert: {
          agency_id: string
          confidence?: number
          created_at?: string
          id?: string
          pattern: string
          proposed_rule: Json
          reviewed_by?: string | null
          sample_size?: number
          simulated_impact?: Json | null
          status?: string
        }
        Update: {
          agency_id?: string
          confidence?: number
          created_at?: string
          id?: string
          pattern?: string
          proposed_rule?: Json
          reviewed_by?: string | null
          sample_size?: number
          simulated_impact?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_candidates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      score_profiles: {
        Row: {
          agency_id: string | null
          constraints: Json
          created_at: string
          id: string
          name: string
          scope: string
          status: string
          version: number
          weights: Json
        }
        Insert: {
          agency_id?: string | null
          constraints?: Json
          created_at?: string
          id?: string
          name: string
          scope?: string
          status?: string
          version?: number
          weights?: Json
        }
        Update: {
          agency_id?: string | null
          constraints?: Json
          created_at?: string
          id?: string
          name?: string
          scope?: string
          status?: string
          version?: number
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "score_profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_adjustments: {
        Row: {
          adjustment_type: string
          agency_id: string
          amount: number
          created_at: string
          description: string
          effective_period: string
          id: string
          sale_id: string | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          adjustment_type: string
          agency_id: string
          amount?: number
          created_at?: string
          description: string
          effective_period: string
          id?: string
          sale_id?: string | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          adjustment_type?: string
          agency_id?: string
          amount?: number
          created_at?: string
          description?: string
          effective_period?: string
          id?: string
          sale_id?: string | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_adjustments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_adjustments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_adjustments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_commission_plans: {
        Row: {
          agency_id: string
          approved_by: string | null
          commission_base_rule: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          over_share_rule: string
          seller_id: string
          status: string
          tier_mode: string
          updated_at: string
          valid_from: string
          valid_until: string | null
          version: number
        }
        Insert: {
          agency_id: string
          approved_by?: string | null
          commission_base_rule?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          over_share_rule?: string
          seller_id: string
          status?: string
          tier_mode?: string
          updated_at?: string
          valid_from: string
          valid_until?: string | null
          version?: number
        }
        Update: {
          agency_id?: string
          approved_by?: string | null
          commission_base_rule?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          over_share_rule?: string
          seller_id?: string
          status?: string
          tier_mode?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "seller_commission_plans_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_commission_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_commission_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_commission_plans_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_commission_tiers: {
        Row: {
          bonus_amount: number
          commission_rate: number
          id: string
          maximum_volume: number | null
          minimum_volume: number
          plan_id: string
          sort_order: number
        }
        Insert: {
          bonus_amount?: number
          commission_rate?: number
          id?: string
          maximum_volume?: number | null
          minimum_volume?: number
          plan_id: string
          sort_order?: number
        }
        Update: {
          bonus_amount?: number
          commission_rate?: number
          id?: string
          maximum_volume?: number | null
          minimum_volume?: number
          plan_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "seller_commission_tiers_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "seller_commission_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_results: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          objections: string[]
          package_candidate_id: string
          persona: string
          score: number
          simulation_run_id: string
          strengths: string[]
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          objections?: string[]
          package_candidate_id: string
          persona: string
          score?: number
          simulation_run_id: string
          strengths?: string[]
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          objections?: string[]
          package_candidate_id?: string
          persona?: string
          score?: number
          simulation_run_id?: string
          strengths?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "simulation_results_package_candidate_id_fkey"
            columns: ["package_candidate_id"]
            isOneToOne: false
            referencedRelation: "package_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_results_simulation_run_id_fkey"
            columns: ["simulation_run_id"]
            isOneToOne: false
            referencedRelation: "simulation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_runs: {
        Row: {
          created_at: string
          id: string
          model: string | null
          personas: string[]
          quote_request_id: string
          status: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          model?: string | null
          personas?: string[]
          quote_request_id: string
          status?: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          model?: string | null
          personas?: string[]
          quote_request_id?: string
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "simulation_runs_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contacts: {
        Row: {
          agency_id: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          role: string | null
          supplier_id: string
          whatsapp: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          role?: string | null
          supplier_id: string
          whatsapp?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          role?: string | null
          supplier_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contacts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_contacts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_files: {
        Row: {
          agency_id: string
          created_at: string
          expires_at: string | null
          file_path: string | null
          file_url: string
          id: string
          kind: string | null
          name: string
          ocr_data: Json | null
          ocr_reviewed: boolean
          ocr_reviewed_at: string | null
          supplier_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          expires_at?: string | null
          file_path?: string | null
          file_url: string
          id?: string
          kind?: string | null
          name: string
          ocr_data?: Json | null
          ocr_reviewed?: boolean
          ocr_reviewed_at?: string | null
          supplier_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          expires_at?: string | null
          file_path?: string | null
          file_url?: string
          id?: string
          kind?: string | null
          name?: string
          ocr_data?: Json | null
          ocr_reviewed?: boolean
          ocr_reviewed_at?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_files_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_files_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_products: {
        Row: {
          agency_id: string
          capacity: number | null
          city: string | null
          country: string | null
          created_at: string
          currency: string
          description: string | null
          destination: string | null
          duration_days: number | null
          id: string
          images: string[] | null
          is_active: boolean
          kind: string
          metadata: Json
          name: string
          price_from: number | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          capacity?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          destination?: string | null
          duration_days?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          kind: string
          metadata?: Json
          name: string
          price_from?: number | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          capacity?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          destination?: string | null
          duration_days?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          kind?: string
          metadata?: Json
          name?: string
          price_from?: number | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_products_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_reviews: {
        Row: {
          agency_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          supplier_id: string
          tags: string[] | null
          trip_id: string | null
          user_id: string | null
        }
        Insert: {
          agency_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          supplier_id: string
          tags?: string[] | null
          trip_id?: string | null
          user_id?: string | null
        }
        Update: {
          agency_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          supplier_id?: string
          tags?: string[] | null
          trip_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_reviews_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_reviews_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_reviews_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          agency_id: string
          city: string | null
          commission_rate: number
          contract_url: string | null
          country: string | null
          cover_url: string | null
          created_at: string
          deleted_at: string | null
          document: string | null
          email: string | null
          id: string
          instagram: string | null
          is_active: boolean
          kind: Database["public"]["Enums"]["supplier_kind"]
          legal_name: string | null
          logo_url: string | null
          metadata: Json
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          rating: number | null
          sla_hours: number
          state: string | null
          tags: string[] | null
          updated_at: string
          website: string | null
          whatsapp: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          agency_id: string
          city?: string | null
          commission_rate?: number
          contract_url?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          document?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          kind?: Database["public"]["Enums"]["supplier_kind"]
          legal_name?: string | null
          logo_url?: string | null
          metadata?: Json
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          sla_hours?: number
          state?: string | null
          tags?: string[] | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          agency_id?: string
          city?: string | null
          commission_rate?: number
          contract_url?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          document?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          kind?: Database["public"]["Enums"]["supplier_kind"]
          legal_name?: string | null
          logo_url?: string | null
          metadata?: Json
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          sla_hours?: number
          state?: string | null
          tags?: string[] | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          zip?: string | null
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
          assignee_id: string | null
          attachments: string[]
          cancellation_credit_remaining: number | null
          cancellation_penalty_pct: number | null
          cancellation_penalty_value: number | null
          cancellation_refund_method: string | null
          client_id: string | null
          code: string
          created_at: string
          csat_comment: string | null
          csat_score: number | null
          deleted_at: string | null
          description: string | null
          email_thread_id: string | null
          id: string
          priority: string
          refund_amount: number | null
          refund_requested: boolean
          refund_status: string | null
          resolved_at: string | null
          sla_breach_at: string | null
          sla_deadline: string | null
          stage: string | null
          status: string
          title: string
          trip_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          agent_id?: string | null
          assignee_id?: string | null
          attachments?: string[]
          cancellation_credit_remaining?: number | null
          cancellation_penalty_pct?: number | null
          cancellation_penalty_value?: number | null
          cancellation_refund_method?: string | null
          client_id?: string | null
          code?: string
          created_at?: string
          csat_comment?: string | null
          csat_score?: number | null
          deleted_at?: string | null
          description?: string | null
          email_thread_id?: string | null
          id?: string
          priority?: string
          refund_amount?: number | null
          refund_requested?: boolean
          refund_status?: string | null
          resolved_at?: string | null
          sla_breach_at?: string | null
          sla_deadline?: string | null
          stage?: string | null
          status?: string
          title: string
          trip_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          agent_id?: string | null
          assignee_id?: string | null
          attachments?: string[]
          cancellation_credit_remaining?: number | null
          cancellation_penalty_pct?: number | null
          cancellation_penalty_value?: number | null
          cancellation_refund_method?: string | null
          client_id?: string | null
          code?: string
          created_at?: string
          csat_comment?: string | null
          csat_score?: number | null
          deleted_at?: string | null
          description?: string | null
          email_thread_id?: string | null
          id?: string
          priority?: string
          refund_amount?: number | null
          refund_requested?: boolean
          refund_status?: string | null
          resolved_at?: string | null
          sla_breach_at?: string | null
          sla_deadline?: string | null
          stage?: string | null
          status?: string
          title?: string
          trip_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_support_tickets_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_support_tickets_trip"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_checkpoints: {
        Row: {
          agency_id: string
          created_at: string | null
          cursor_value: string | null
          id: string
          last_run_at: string | null
          metadata: Json | null
          provider: string
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          cursor_value?: string | null
          id?: string
          last_run_at?: string | null
          metadata?: Json | null
          provider: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          cursor_value?: string | null
          id?: string
          last_run_at?: string | null
          metadata?: Json | null
          provider?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_checkpoints_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_jobs: {
        Row: {
          agency_id: string
          created_at: string | null
          errors_log: Json | null
          finished_at: string | null
          id: string
          job_type: string
          provider: string
          records_processed: number | null
          started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          errors_log?: Json | null
          finished_at?: string | null
          id?: string
          job_type: string
          provider: string
          records_processed?: number | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          errors_log?: Json | null
          finished_at?: string | null
          id?: string
          job_type?: string
          provider?: string
          records_processed?: number | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_jobs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          attachments: Json
          content: string
          created_at: string
          id: string
          is_internal: boolean
          sender: string
          ticket_id: string
        }
        Insert: {
          attachments?: Json
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          sender: string
          ticket_id: string
        }
        Update: {
          attachments?: Json
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          sender?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_commissions: {
        Row: {
          agency_commission_brl: number | null
          agency_commission_pct: number
          agency_id: string
          agent_commission_brl: number | null
          agent_commission_pct: number | null
          agent_id: string | null
          base_comissionavel: number | null
          created_at: string
          embarque_tax: number
          id: string
          items_commission: Json
          net_profit: number | null
          notes: string | null
          total_bonus: number
          trip_id: string
          updated_at: string
        }
        Insert: {
          agency_commission_brl?: number | null
          agency_commission_pct?: number
          agency_id: string
          agent_commission_brl?: number | null
          agent_commission_pct?: number | null
          agent_id?: string | null
          base_comissionavel?: number | null
          created_at?: string
          embarque_tax?: number
          id?: string
          items_commission?: Json
          net_profit?: number | null
          notes?: string | null
          total_bonus?: number
          trip_id: string
          updated_at?: string
        }
        Update: {
          agency_commission_brl?: number | null
          agency_commission_pct?: number
          agency_id?: string
          agent_commission_brl?: number | null
          agent_commission_pct?: number | null
          agent_id?: string | null
          base_comissionavel?: number | null
          created_at?: string
          embarque_tax?: number
          id?: string
          items_commission?: Json
          net_profit?: number | null
          notes?: string | null
          total_bonus?: number
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_commissions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_commissions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_confirmation_items: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string | null
          details: string | null
          id: string
          item_type: string
          locator_code: string
          notes: string | null
          provider_name: string
          service_date: string | null
          sort_order: number
          status: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by?: string | null
          details?: string | null
          id?: string
          item_type?: string
          locator_code: string
          notes?: string | null
          provider_name: string
          service_date?: string | null
          sort_order?: number
          status?: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string | null
          details?: string | null
          id?: string
          item_type?: string
          locator_code?: string
          notes?: string | null
          provider_name?: string
          service_date?: string | null
          sort_order?: number
          status?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_confirmation_items_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_confirmation_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_memories: {
        Row: {
          agency_id: string
          caption: string | null
          client_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          image_url: string
          trip_id: string
        }
        Insert: {
          agency_id: string
          caption?: string | null
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url: string
          trip_id: string
        }
        Update: {
          agency_id?: string
          caption?: string | null
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_memories_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_memories_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_memories_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_passengers: {
        Row: {
          accommodation_notes: string | null
          accommodation_status: string | null
          accommodation_updated_at: string | null
          agency_id: string
          birth_date: string | null
          client_id: string | null
          cpf: string | null
          created_at: string
          data_complete: boolean
          deleted_at: string | null
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
          relationship: string | null
          status: string | null
          trip_id: string
          vaccination_certificates: Json
        }
        Insert: {
          accommodation_notes?: string | null
          accommodation_status?: string | null
          accommodation_updated_at?: string | null
          agency_id: string
          birth_date?: string | null
          client_id?: string | null
          cpf?: string | null
          created_at?: string
          data_complete?: boolean
          deleted_at?: string | null
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
          relationship?: string | null
          status?: string | null
          trip_id: string
          vaccination_certificates?: Json
        }
        Update: {
          accommodation_notes?: string | null
          accommodation_status?: string | null
          accommodation_updated_at?: string | null
          agency_id?: string
          birth_date?: string | null
          client_id?: string | null
          cpf?: string | null
          created_at?: string
          data_complete?: boolean
          deleted_at?: string | null
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
          relationship?: string | null
          status?: string | null
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
          airline: string | null
          archived_at: string | null
          assigned_agent_id: string | null
          boarding_status: string
          booking_reference: string | null
          checklist: Json
          client_id: string | null
          code: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          destination: string | null
          excludes: Json | null
          flights: Json | null
          group_tour_id: string | null
          hotels: Json | null
          id: string
          includes: Json | null
          insurance: Json | null
          itinerary: Json | null
          lead_id: string | null
          lifecycle_status: string | null
          notes: string | null
          number: number
          operator: string | null
          operator_booking_id: string | null
          owner_id: string | null
          pax_adults: number
          pax_children: number
          pax_infants: number
          pax_seniors: number
          pnr: string | null
          portal_enabled: boolean | null
          proposal_id: string | null
          rooms: Json
          status: Database["public"]["Enums"]["trip_status"]
          tags: string[]
          title: string
          total_cost: number
          total_paid: number
          total_sale: number
          tours: Json | null
          transfers: Json | null
          travel_end: string | null
          travel_start: string | null
          trip_type: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          airline?: string | null
          archived_at?: string | null
          assigned_agent_id?: string | null
          boarding_status?: string
          booking_reference?: string | null
          checklist?: Json
          client_id?: string | null
          code?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          destination?: string | null
          excludes?: Json | null
          flights?: Json | null
          group_tour_id?: string | null
          hotels?: Json | null
          id?: string
          includes?: Json | null
          insurance?: Json | null
          itinerary?: Json | null
          lead_id?: string | null
          lifecycle_status?: string | null
          notes?: string | null
          number?: number
          operator?: string | null
          operator_booking_id?: string | null
          owner_id?: string | null
          pax_adults?: number
          pax_children?: number
          pax_infants?: number
          pax_seniors?: number
          pnr?: string | null
          portal_enabled?: boolean | null
          proposal_id?: string | null
          rooms?: Json
          status?: Database["public"]["Enums"]["trip_status"]
          tags?: string[]
          title: string
          total_cost?: number
          total_paid?: number
          total_sale?: number
          tours?: Json | null
          transfers?: Json | null
          travel_end?: string | null
          travel_start?: string | null
          trip_type?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          airline?: string | null
          archived_at?: string | null
          assigned_agent_id?: string | null
          boarding_status?: string
          booking_reference?: string | null
          checklist?: Json
          client_id?: string | null
          code?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          destination?: string | null
          excludes?: Json | null
          flights?: Json | null
          group_tour_id?: string | null
          hotels?: Json | null
          id?: string
          includes?: Json | null
          insurance?: Json | null
          itinerary?: Json | null
          lead_id?: string | null
          lifecycle_status?: string | null
          notes?: string | null
          number?: number
          operator?: string | null
          operator_booking_id?: string | null
          owner_id?: string | null
          pax_adults?: number
          pax_children?: number
          pax_infants?: number
          pax_seniors?: number
          pnr?: string | null
          portal_enabled?: boolean | null
          proposal_id?: string | null
          rooms?: Json
          status?: Database["public"]["Enums"]["trip_status"]
          tags?: string[]
          title?: string
          total_cost?: number
          total_paid?: number
          total_sale?: number
          tours?: Json | null
          transfers?: Json | null
          travel_end?: string | null
          travel_start?: string | null
          trip_type?: string | null
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
            foreignKeyName: "trips_group_tour_id_fkey"
            columns: ["group_tour_id"]
            isOneToOne: false
            referencedRelation: "group_tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_group_tour_id_fkey"
            columns: ["group_tour_id"]
            isOneToOne: false
            referencedRelation: "group_tours_financial_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
      visa_documents: {
        Row: {
          agency_id: string
          created_at: string
          file_url: string
          id: string
          is_approved: boolean | null
          title: string
          uploaded_by: string | null
          visa_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          file_url: string
          id?: string
          is_approved?: boolean | null
          title: string
          uploaded_by?: string | null
          visa_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          file_url?: string
          id?: string
          is_approved?: boolean | null
          title?: string
          uploaded_by?: string | null
          visa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visa_documents_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visa_documents_visa_id_fkey"
            columns: ["visa_id"]
            isOneToOne: false
            referencedRelation: "visas"
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
          deleted_at: string | null
          denied_at: string | null
          expected_approval_at: string | null
          id: string
          notes: string | null
          passport_expiry: string | null
          passport_number: string | null
          price: number
          requested_at: string | null
          required_documents: Json
          requirement_id: string | null
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
          deleted_at?: string | null
          denied_at?: string | null
          expected_approval_at?: string | null
          id?: string
          notes?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          price?: number
          requested_at?: string | null
          required_documents?: Json
          requirement_id?: string | null
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
          deleted_at?: string | null
          denied_at?: string | null
          expected_approval_at?: string | null
          id?: string
          notes?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          price?: number
          requested_at?: string | null
          required_documents?: Json
          requirement_id?: string | null
          status?: string
          submitted_at?: string | null
          travel_date?: string | null
          trip_id?: string | null
          visa_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visa_requests_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "visa_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      visa_requirements: {
        Row: {
          agency_id: string | null
          category: string
          destination_country: string
          id: string
          last_updated: string
          notes: string | null
          official_url: string | null
          origin_nationality: string
          price_estimate: number | null
          processing_days: number | null
          required_documents: string[]
          rule_title: string | null
          visa_required: boolean
          visa_type: string | null
        }
        Insert: {
          agency_id?: string | null
          category?: string
          destination_country: string
          id?: string
          last_updated?: string
          notes?: string | null
          official_url?: string | null
          origin_nationality: string
          price_estimate?: number | null
          processing_days?: number | null
          required_documents?: string[]
          rule_title?: string | null
          visa_required?: boolean
          visa_type?: string | null
        }
        Update: {
          agency_id?: string | null
          category?: string
          destination_country?: string
          id?: string
          last_updated?: string
          notes?: string | null
          official_url?: string | null
          origin_nationality?: string
          price_estimate?: number | null
          processing_days?: number | null
          required_documents?: string[]
          rule_title?: string | null
          visa_required?: boolean
          visa_type?: string | null
        }
        Relationships: []
      }
      visa_stages: {
        Row: {
          agency_id: string
          color: string
          created_at: string
          id: string
          is_final: boolean
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          agency_id: string
          color?: string
          created_at?: string
          id?: string
          is_final?: boolean
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          agency_id?: string
          color?: string
          created_at?: string
          id?: string
          is_final?: boolean
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visa_stages_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      visas: {
        Row: {
          agency_id: string
          category: string
          client_id: string
          country: string
          created_at: string
          deleted_at: string | null
          expected_date: string | null
          id: string
          interview_date: string | null
          notes: string | null
          owner_id: string | null
          position: number
          stage_id: string
          status: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          category: string
          client_id: string
          country: string
          created_at?: string
          deleted_at?: string | null
          expected_date?: string | null
          id?: string
          interview_date?: string | null
          notes?: string | null
          owner_id?: string | null
          position?: number
          stage_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          category?: string
          client_id?: string
          country?: string
          created_at?: string
          deleted_at?: string | null
          expected_date?: string | null
          id?: string
          interview_date?: string | null
          notes?: string | null
          owner_id?: string | null
          position?: number
          stage_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visas_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visas_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visas_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "visa_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          accommodation: Json
          agency_id: string
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      web_push_subscriptions: {
        Row: {
          agency_id: string | null
          auth: string
          created_at: string
          device_info: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          auth: string
          created_at?: string
          device_info?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          auth?: string
          created_at?: string
          device_info?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "web_push_subscriptions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_connections: {
        Row: {
          agency_id: string | null
          app_id: string
          business_id: string
          coexistence_enabled: boolean | null
          connection_name: string
          created_at: string
          created_by: string | null
          display_phone_number: string
          graph_api_version: string | null
          health_status: Json | null
          id: string
          last_error_at: string | null
          last_success_at: string | null
          last_webhook_at: string | null
          phone_number_id: string
          secret_reference: string | null
          status: string
          token_reference: string | null
          updated_at: string
          updated_by: string | null
          verify_token_reference: string | null
          waba_id: string
          webhook_status: string | null
        }
        Insert: {
          agency_id?: string | null
          app_id: string
          business_id: string
          coexistence_enabled?: boolean | null
          connection_name: string
          created_at?: string
          created_by?: string | null
          display_phone_number: string
          graph_api_version?: string | null
          health_status?: Json | null
          id?: string
          last_error_at?: string | null
          last_success_at?: string | null
          last_webhook_at?: string | null
          phone_number_id: string
          secret_reference?: string | null
          status?: string
          token_reference?: string | null
          updated_at?: string
          updated_by?: string | null
          verify_token_reference?: string | null
          waba_id: string
          webhook_status?: string | null
        }
        Update: {
          agency_id?: string | null
          app_id?: string
          business_id?: string
          coexistence_enabled?: boolean | null
          connection_name?: string
          created_at?: string
          created_by?: string | null
          display_phone_number?: string
          graph_api_version?: string | null
          health_status?: Json | null
          id?: string
          last_error_at?: string | null
          last_success_at?: string | null
          last_webhook_at?: string | null
          phone_number_id?: string
          secret_reference?: string | null
          status?: string
          token_reference?: string | null
          updated_at?: string
          updated_by?: string | null
          verify_token_reference?: string | null
          waba_id?: string
          webhook_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_definitions: {
        Row: {
          agency_id: string | null
          config: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_definitions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          agency_id: string | null
          created_at: string
          id: string
          logs: Json
          status: string
          workflow_id: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          id?: string
          logs?: Json
          status?: string
          workflow_id?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          id?: string
          logs?: Json
          status?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      agency_members: {
        Row: {
          agency_id: string | null
          created_at: string | null
          id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
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
      client_documents_expiring: {
        Row: {
          agency_id: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string | null
          days_until_expiry: number | null
          doc_number: string | null
          doc_type: string | null
          expires_at: string | null
          file_url: string | null
          id: string | null
          issued_at: string | null
          notes: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      group_tours_financial_summary: {
        Row: {
          ads_budget: number | null
          agency_id: string | null
          base_price: number | null
          departure_date: string | null
          destination: string | null
          id: string | null
          net_profit: number | null
          pax_count: number | null
          return_date: string | null
          revenue: number | null
          roi: number | null
          slug: string | null
          status: string | null
          target_poupanca_balance: number | null
          title: string | null
          total_cost: number | null
          total_seats: number | null
        }
        Relationships: []
      }
      vw_admin_agents: {
        Row: {
          agency_id: string | null
          agency_name: string | null
          agency_slug: string | null
          created_at: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          role_id: string | null
          user_id: string | null
          user_name: string | null
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
      vw_admin_audit: {
        Row: {
          action: string | null
          actor_id: string | null
          actor_name: string | null
          actor_type: string | null
          agency_id: string | null
          agency_name: string | null
          agency_slug: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: number | null
          ip_address: string | null
          metadata: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_agency_invite: { Args: { _token: string }; Returns: string }
      accept_public_reaccommodation: {
        Args: { p_boarding_card_id: string; p_itinerary_id: string }
        Returns: undefined
      }
      admin_calculate_billing_summary: {
        Args: never
        Returns: {
          agency_id: string
          agency_name: string
          expense: number
          income: number
          net: number
          pending: number
        }[]
      }
      admin_create_agency_and_invite: {
        Args: {
          _cnpj?: string
          _name: string
          _owner_email: string
          _phone?: string
          _slug: string
        }
        Returns: Json
      }
      agency_id_by_slug: { Args: { _slug: string }; Returns: string }
      append_contract_audit: {
        Args: {
          _action: string
          _contract_id: string
          _description: string
          _user_id?: string
        }
        Returns: undefined
      }
      approve_group_enrollment: {
        Args: { _agent_id: string; _enrollment_id: string }
        Returns: Json
      }
      calculate_cash_summary: {
        Args: { _agency_id: string; _filter?: string }
        Returns: Json
      }
      calculate_dre_summary: {
        Args: { _agency_id: string; _period: string }
        Returns: Json
      }
      calculate_progressive_commission: {
        Args: { _billing: number; _ranges: Json }
        Returns: number
      }
      calculate_proration_credit: {
        Args: { _agency_id: string; _new_plan_id: string }
        Returns: Json
      }
      can_manage_agency_finances: {
        Args: { _agency_id: string }
        Returns: boolean
      }
      check_agency_limits: { Args: { _agency_id: string }; Returns: boolean }
      close_cash_session: {
        Args: {
          p_notes?: string
          p_reported_balance: number
          p_session_id: string
        }
        Returns: undefined
      }
      confirm_ocr_supplier_data: {
        Args: {
          _agency_id: string
          _commission_rate: number
          _contacts: Json
          _email: string
          _file_id: string
          _payment_terms: string
          _phone: string
          _products: Json
          _supplier_id: string
          _website: string
        }
        Returns: undefined
      }
      confirm_payment_with_token: {
        Args: { _payment_method: string; _receipt_url: string; _token: string }
        Returns: string
      }
      contract_template_clauses: { Args: never; Returns: Json }
      convert_proposal_to_trip: {
        Args: { p_agency_id: string; p_proposal_id: string }
        Returns: string
      }
      convert_quote_to_proposal: {
        Args: {
          p_owner_id: string
          p_proposal_payload: Json
          p_quote_request_id: string
        }
        Returns: string
      }
      create_agency_onboarding: {
        Args: {
          _address_city?: string
          _address_complement?: string
          _address_country?: string
          _address_neighborhood?: string
          _address_number?: string
          _address_state?: string
          _address_street?: string
          _address_zip_code?: string
          _business_hours?: Json
          _document?: string
          _email?: string
          _full_name?: string
          _legal_name?: string
          _name: string
          _onboarding_completed?: boolean
          _phone?: string
          _slug: string
        }
        Returns: {
          id: string
          slug: string
        }[]
      }
      create_public_boarding_event: {
        Args: {
          p_boarding_card_id: string
          p_event_type: string
          p_flight_segment_id: string
          p_metadata?: Json
          p_traveler_id: string
        }
        Returns: undefined
      }
      duplicate_portal_page: { Args: { p_page_id: string }; Returns: string }
      duplicate_trip: { Args: { p_trip_id: string }; Returns: string }
      enroll_public_tour: {
        Args: {
          _agency_id: string
          _destination: string
          _email: string
          _notes: string
          _passenger_cpf: string
          _passenger_name: string
          _pax_count: number
          _phone: string
          _receipt_url?: string
          _selected_seats: string[]
          _source: string
          _tour_id: string
          _unit_price: number
        }
        Returns: Json
      }
      generate_client_login_token: {
        Args: { p_client_id: string }
        Returns: string
      }
      get_auth_user_id_by_email: { Args: { p_email: string }; Returns: string }
      get_client_boarding_card: {
        Args: { p_trip_id: string }
        Returns: {
          agency_id: string
          airline: string
          alerts: string[]
          briefing_date: string
          briefing_url: string
          checkin_links: Json
          checkin_opens_at: string
          checklist: Json
          id: string
          pnr: string
          status: string
          trip_id: string
        }[]
      }
      get_contracts_by_payer_info: {
        Args: { p_agency_id: string; p_document: string; p_email: string }
        Returns: {
          created_at: string
          id: string
          public_token: string
          status: string
          title: string
          total_value: number
        }[]
      }
      get_crm_leads: {
        Args: { p_agency_id: string }
        Returns: {
          agency_id: string
          client_id: string
          created_at: string
          expected_close_date: string
          id: string
          stage_id: string
          status: string
          title: string
          updated_at: string
          value: number
        }[]
      }
      get_lead_id_for_whatsapp: {
        Args: { _agency_id: string; _client_id: string; _trip_id: string }
        Returns: string
      }
      get_my_agency_id: { Args: never; Returns: string }
      get_my_room_allocation: {
        Args: { _trip_id: string }
        Returns: {
          checkin_date: string
          checkout_date: string
          hotel_name: string
          id: string
          is_confirmed: boolean
          notes: string
          room_number: string
          room_type: string
        }[]
      }
      get_public_agency_by_id: {
        Args: { _id: string }
        Returns: {
          accent_color: string
          brand_color: string
          brand_color_fg: string
          font_body: string
          font_heading: string
          id: string
          logo_url: string
          logo_white_url: string
          name: string
          secondary_color: string
          slug: string
        }[]
      }
      get_public_agency_by_slug: {
        Args: { _slug: string }
        Returns: {
          accent_color: string
          brand_color: string
          brand_color_fg: string
          font_body: string
          font_heading: string
          id: string
          logo_url: string
          logo_white_url: string
          name: string
          secondary_color: string
          slug: string
        }[]
      }
      get_public_boarding_card: {
        Args: { p_id: string }
        Returns: {
          agency_id: string
          airline: string
          alerts: string[]
          checklist: Json
          id: string
          pnr: string
          status: string
          trip_id: string
        }[]
      }
      get_public_boarding_card_details: {
        Args: { p_id: string }
        Returns: Json
      }
      global_search: {
        Args: { p_agency_id: string; p_term: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _agency_id?: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ka_views: { Args: { p_article_id: string }; Returns: undefined }
      increment_post_views: { Args: { p_post_id: string }; Returns: undefined }
      is_agency_member: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          _action: string
          _agency_id: string
          _entity_id: string
          _entity_type: string
          _metadata?: Json
        }
        Returns: undefined
      }
      log_contract_activity: {
        Args: { _action: string; _metadata?: Json; _token: string }
        Returns: undefined
      }
      mark_contract_viewed: { Args: { _token: string }; Returns: undefined }
      mark_session_read: { Args: { p_session_id: string }; Returns: undefined }
      match_knowledge_embeddings: {
        Args: {
          match_count: number
          match_threshold: number
          p_agency_id: string
          p_category?: string
          query_embedding: string
        }
        Returns: {
          category: string
          chunk_id: string
          content: string
          document_title: string
          scope: string
          similarity: number
        }[]
      }
      match_memories: {
        Args: {
          _agency_id: string
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          id: string
          similarity: number
        }[]
      }
      merge_clients: {
        Args: { p_source_id: string; p_target_id: string }
        Returns: undefined
      }
      open_cash_session: {
        Args: {
          p_agency_id: string
          p_notes?: string
          p_opening_balance: number
          p_register_id: string
        }
        Returns: string
      }
      persist_boarding_card_move: {
        Args: { _card_id: string; _reordered_ids: string[]; _to_status: string }
        Returns: undefined
      }
      persist_lead_move: {
        Args: {
          _lead_id: string
          _reordered_ids: string[]
          _to_stage_id: string
        }
        Returns: undefined
      }
      persist_visa_move: {
        Args: {
          _reordered_ids: string[]
          _to_stage_id: string
          _visa_id: string
        }
        Returns: undefined
      }
      pick_active_api_key: {
        Args: { _agency_id: string; _provider: string }
        Returns: {
          id: string
          key_value: string
          scope: string
        }[]
      }
      promote_lead_to_client: { Args: { _lead_id: string }; Returns: string }
      promote_lead_to_client_v2: {
        Args: { _client_payload: Json; _lead_id: string }
        Returns: string
      }
      public_addendums_by_token: {
        Args: { _token: string }
        Returns: {
          cancelled_at: string | null
          content: string
          contract_id: string
          created_at: string
          id: string
          pdf_url: string | null
          signatures: Json
          signed_at: string | null
          status: string
          title: string
        }[]
        SetofOptions: {
          from: "*"
          to: "contract_addendums"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      public_audit_chain_by_token: {
        Args: { _token: string }
        Returns: {
          action: string
          created_at: string
          id: number
          metadata: Json
          prev_hash: string
          row_hash: string
        }[]
      }
      public_contract_by_token: {
        Args: { _token: string }
        Returns: {
          agency_id: string
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
      public_installments_by_token: {
        Args: { _token: string }
        Returns: {
          amount: number
          due_date: string
          external_link: string
          id: string
          paid_at: string
          payment_method: string
          status: string
        }[]
      }
      public_lead_by_id: {
        Args: { _lead_id: string }
        Returns: {
          agency_logo: string
          agency_name: string
          autism: boolean
          custom_fields: Json
          destination: string
          email: string
          health_notes: string
          id: string
          interest_type: string
          lgpd_accepted: boolean
          name: string
          notes: string
          pax_adults: number
          pax_ages: Json
          pax_children: number
          pax_infants: number
          pax_list: Json
          pcd: boolean
          phone: string
          reduced_mobility: boolean
          travel_end: string
          travel_start: string
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
      public_save_lead: {
        Args: { _lead_id: string; _payload: Json }
        Returns: undefined
      }
      publish_portal_page: { Args: { p_page_id: string }; Returns: undefined }
      recalculate_proposal_totals: {
        Args: { _proposal_id: string }
        Returns: undefined
      }
      record_legal_acceptance: {
        Args: {
          _agency_id?: string
          _client_id?: string
          _context?: string
          _document_id: string
        }
        Returns: string
      }
      request_trip_cancellation: {
        Args: { p_client_id: string; p_reason: string; p_trip_id: string }
        Returns: undefined
      }
      resolve_agent_commission: {
        Args: {
          p_agency_id: string
          p_agent_id: string
          p_base_amount: number
          p_monthly_billing: number
        }
        Returns: Json
      }
      revert_portal_page: {
        Args: { p_page_id: string; p_version_id: string }
        Returns: undefined
      }
      save_infotravel_booking_normalized:
        | { Args: { p_agency_id: string; p_normalized: Json }; Returns: string }
        | {
            Args: {
              p_agency_id: string
              p_normalized: Json
              p_override_trip_id?: string
            }
            Returns: string
          }
      save_lead_stages_updates: {
        Args: { _agency_id: string; _stages: Json }
        Returns: undefined
      }
      save_passenger_with_token: {
        Args: { _payload: Json; _token: string }
        Returns: string
      }
      search_knowledge_articles: {
        Args: { p_agency_id: string; p_is_internal?: boolean; p_query: string }
        Returns: {
          agency_id: string
          category: string | null
          content: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_internal: boolean
          search_vector: unknown
          slug: string | null
          tags: string[]
          title: string
          updated_at: string
          views: number
          votes_down: number
          votes_up: number
        }[]
        SetofOptions: {
          from: "*"
          to: "knowledge_articles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      seed_default_visa_stages: {
        Args: { p_agency_id: string }
        Returns: undefined
      }
      sign_addendum_with_token: {
        Args: {
          _addendum_id: string
          _ip: string
          _pdf_path?: string
          _selfie_image: string
          _signature_image: string
          _signer_document: string
          _signer_name: string
          _token: string
          _user_agent: string
        }
        Returns: undefined
      }
      sign_contract_with_token:
        | {
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
        | {
            Args: {
              _ip: string
              _pdf_path?: string
              _selfie_image: string
              _signature_image: string
              _signed_hash?: string
              _signer_document: string
              _signer_name: string
              _token: string
              _user_agent: string
            }
            Returns: string
          }
        | {
            Args: {
              _doc_back?: string
              _doc_front?: string
              _ip: string
              _pdf_path?: string
              _selfie_image: string
              _signature_image: string
              _signed_hash?: string
              _signer_document: string
              _signer_name: string
              _token: string
              _user_agent: string
              _video_kyc?: string
            }
            Returns: string
          }
      submit_emergency_flight_issue: {
        Args: {
          p_boarding_card_id: string
          p_description?: string
          p_issue_type: string
        }
        Returns: string
      }
      submit_public_lead: {
        Args: {
          _agency_slug: string
          _destination: string
          _email: string
          _estimated_value: number
          _name: string
          _notes: string
          _pax_count: number
          _phone: string
          _source: string
          _tags?: string[]
          _travel_end: string
          _travel_start: string
        }
        Returns: string
      }
      submit_public_ticket: {
        Args: {
          _agency_slug: string
          _description: string
          _email: string
          _subject: string
        }
        Returns: string
      }
      sync_flight_to_boarding_ticket: {
        Args: { p_itinerary_id: string }
        Returns: undefined
      }
      tags_to_string: { Args: { tags: string[] }; Returns: string }
      trip_financial_summary: {
        Args: { _trip_id: string }
        Returns: {
          cost: number
          expense_breakdown: Json
          income_breakdown: Json
          margin: number
          margin_percent: number
          outstanding: number
          revenue: number
          total_paid: number
        }[]
      }
      update_client_boarding_checklist: {
        Args: { p_boarding_card_id: string; p_checklist: Json }
        Returns: undefined
      }
      update_contract_pdf_path: {
        Args: { _contract_id: string; _pdf_path: string }
        Returns: undefined
      }
      update_public_boarding_card_checklist: {
        Args: { p_checklist: Json; p_id: string }
        Returns: undefined
      }
      update_rooming_list_versioned: {
        Args: {
          _agency_id?: string
          _passengers: Json
          _room_id: string
          _version: number
        }
        Returns: boolean
      }
      upgrade_agency_plan: {
        Args: { _agency_id: string; _is_annual?: boolean; _new_plan_id: string }
        Returns: Json
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
      vote_knowledge_article: {
        Args: { p_article_id: string; p_is_upvote: boolean }
        Returns: undefined
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
  graphql_public: {
    Enums: {},
  },
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
