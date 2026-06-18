const fs = require("fs");
const path = require("path");

const typesPath = path.join(__dirname, "src/integrations/supabase/types.ts");
let content = fs.readFileSync(typesPath, "utf8");

// 1. Add employee_id and operator_id to financial_records types
content = content.replace(
  `          is_third_party: boolean | null;`,
  `          is_third_party: boolean | null;\n          employee_id: string | null;\n          operator_id: string | null;`
);
content = content.replace(
  `          is_third_party?: boolean | null;`,
  `          is_third_party?: boolean | null;\n          employee_id?: string | null;\n          operator_id?: string | null;`
);

// 2. Add ads_budget and target_poupanca_balance to group_tours types
content = content.replace(
  `          title: string;\n          transport_details: string | null;\n          transport_type: string | null;\n          updated_at: string;`,
  `          title: string;\n          transport_details: string | null;\n          transport_type: string | null;\n          updated_at: string;\n          ads_budget: number;\n          target_poupanca_balance: number;`
);
content = content.replace(
  `          title: string;\n          transport_details?: string | null;\n          transport_type?: string | null;\n          updated_at?: string;`,
  `          title: string;\n          transport_details?: string | null;\n          transport_type?: string | null;\n          updated_at?: string;\n          ads_budget?: number;\n          target_poupanca_balance?: number;`
);

// 3. Definitions of the new tables
const newTables = `      cash_registers: {
        Row: {
          id: string;
          agency_id: string;
          name: string;
          type: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          agency_id: string;
          name: string;
          type?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          agency_id?: string;
          name?: string;
          type?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cash_registers_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          }
        ];
      };
      cash_sessions: {
        Row: {
          id: string;
          agency_id: string;
          cash_register_id: string;
          opened_by: string;
          closed_by: string | null;
          opened_at: string;
          closed_at: string | null;
          opening_balance: number;
          closing_balance: number | null;
          reported_balance: number | null;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          agency_id: string;
          cash_register_id: string;
          opened_by: string;
          closed_by?: string | null;
          opened_at?: string;
          closed_at?: string | null;
          opening_balance?: number;
          closing_balance?: number | null;
          reported_balance?: number | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          agency_id?: string;
          cash_register_id?: string;
          opened_by?: string;
          closed_by?: string | null;
          opened_at?: string;
          closed_at?: string | null;
          opening_balance?: number;
          closing_balance?: number | null;
          reported_balance?: number | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cash_sessions_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_sessions_cash_register_id_fkey";
            columns: ["cash_register_id"];
            isOneToOne: false;
            referencedRelation: "cash_registers";
            referencedColumns: ["id"];
          }
        ];
      };
      financial_transactions: {
        Row: {
          id: string;
          agency_id: string;
          record_id: string | null;
          cash_session_id: string | null;
          cash_register_id: string | null;
          amount: number;
          type: string;
          payment_method: string;
          transaction_date: string;
          receipt_url: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          employee_id: string | null;
          operator_id: string | null;
        };
        Insert: {
          id?: string;
          agency_id: string;
          record_id?: string | null;
          cash_session_id?: string | null;
          cash_register_id?: string | null;
          amount: number;
          type: string;
          payment_method: string;
          transaction_date?: string;
          receipt_url?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          employee_id?: string | null;
          operator_id?: string | null;
        };
        Update: {
          id?: string;
          agency_id?: string;
          record_id?: string | null;
          cash_session_id?: string | null;
          cash_register_id?: string | null;
          amount?: number;
          type?: string;
          payment_method?: string;
          transaction_date?: string;
          receipt_url?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          employee_id?: string | null;
          operator_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "financial_transactions_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "financial_transactions_cash_register_id_fkey";
            columns: ["cash_register_id"];
            isOneToOne: false;
            referencedRelation: "cash_registers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "financial_transactions_cash_session_id_fkey";
            columns: ["cash_session_id"];
            isOneToOne: false;
            referencedRelation: "cash_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "financial_transactions_record_id_fkey";
            columns: ["record_id"];
            isOneToOne: false;
            referencedRelation: "financial_records";
            referencedColumns: ["id"];
          }
        ];
      };
      invoices: {
        Row: {
          id: string;
          agency_id: string;
          client_id: string | null;
          financial_record_id: string | null;
          trip_id: string | null;
          invoice_number: string | null;
          amount: number;
          status: string;
          issue_date: string | null;
          cancellation_date: string | null;
          xml_url: string | null;
          pdf_url: string | null;
          tax_amount: number | null;
          iss_retido: boolean;
          error_message: string | null;
          provider_data: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          agency_id: string;
          client_id?: string | null;
          financial_record_id?: string | null;
          trip_id?: string | null;
          invoice_number?: string | null;
          amount: number;
          status?: string;
          issue_date?: string | null;
          cancellation_date?: string | null;
          xml_url?: string | null;
          pdf_url?: string | null;
          tax_amount?: number | null;
          iss_retido?: boolean;
          error_message?: string | null;
          provider_data?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          agency_id?: string;
          client_id?: string | null;
          financial_record_id?: string | null;
          trip_id?: string | null;
          invoice_number?: string | null;
          amount?: number;
          status?: string;
          issue_date?: string | null;
          cancellation_date?: string | null;
          xml_url?: string | null;
          pdf_url?: string | null;
          tax_amount?: number | null;
          iss_retido?: boolean;
          error_message?: string | null;
          provider_data?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_financial_record_id_fkey";
            columns: ["financial_record_id"];
            isOneToOne: false;
            referencedRelation: "financial_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          }
        ];
      };
      group_tour_costs: {
        Row: {
          id: string;
          group_tour_id: string;
          agency_id: string;
          description: string;
          amount: number;
          type: string;
          allocated_per_pax: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_tour_id: string;
          agency_id: string;
          description: string;
          amount?: number;
          type?: string;
          allocated_per_pax?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_tour_id?: string;
          agency_id?: string;
          description?: string;
          amount?: number;
          type?: string;
          allocated_per_pax?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_tour_costs_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_tour_costs_group_tour_id_fkey";
            columns: ["group_tour_id"];
            isOneToOne: false;
            referencedRelation: "group_tours";
            referencedColumns: ["id"];
          }
        ];
      };`;

if (!content.includes("cash_registers: {")) {
  const insertMarker = "      profiles: {";
  const index = content.indexOf(insertMarker);
  if (index !== -1) {
    content = content.slice(0, index) + newTables + "\n" + content.slice(index);
    fs.writeFileSync(typesPath, content, "utf8");
    console.log("Types patched successfully for cash registers and sessions.");
  } else {
    console.log('Could not find marker "profiles: {"');
  }
} else {
  console.log("cash_registers already exists in types");
}
