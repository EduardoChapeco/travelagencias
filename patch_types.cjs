const fs = require("fs");
const path = require("path");

const typesPath = path.join(__dirname, "src/integrations/supabase/types.ts");
let content = fs.readFileSync(typesPath, "utf8");

const omnichannelTypes = `      omnichannel_messages: {
        Row: {
          agency_id: string | null
          channel: string
          content: string | null
          created_at: string
          direction: string
          external_message_id: string | null
          id: string
          lead_id: string | null
          media_type: string | null
          media_url: string | null
          sender_id: string | null
          session_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          channel?: string
          content?: string | null
          created_at?: string
          direction: string
          external_message_id?: string | null
          id?: string
          lead_id?: string | null
          media_type?: string | null
          media_url?: string | null
          sender_id?: string | null
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          channel?: string
          content?: string | null
          created_at?: string
          direction?: string
          external_message_id?: string | null
          id?: string
          lead_id?: string | null
          media_type?: string | null
          media_url?: string | null
          sender_id?: string | null
          session_id?: string | null
          status?: string
          updated_at?: string
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
            foreignKeyName: "omnichannel_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "omnichannel_sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      omnichannel_sessions: {
        Row: {
          agency_id: string | null
          assigned_to: string | null
          channel: string
          contact_avatar_url: string | null
          contact_id: string | null
          contact_name: string | null
          created_at: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          phone_number: string | null
          provider: string
          qr_code: string | null
          session_name: string
          status: string
          tags: string[]
          unread_count: number
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          assigned_to?: string | null
          channel?: string
          contact_avatar_url?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          phone_number?: string | null
          provider?: string
          qr_code?: string | null
          session_name: string
          status?: string
          tags?: string[]
          unread_count?: number
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          assigned_to?: string | null
          channel?: string
          contact_avatar_url?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          phone_number?: string | null
          provider?: string
          qr_code?: string | null
          session_name?: string
          status?: string
          tags?: string[]
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "omnichannel_sessions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          }
        ]
      }`;

if (!content.includes("omnichannel_sessions: {")) {
  // Find where to insert
  const insertMarker = "      profiles: {";
  const index = content.indexOf(insertMarker);
  if (index !== -1) {
    content = content.slice(0, index) + omnichannelTypes + "\n" + content.slice(index);
    fs.writeFileSync(typesPath, content, "utf8");
    console.log("Types patched successfully");
  } else {
    console.log('Could not find marker "profiles: {"');
  }
} else {
  console.log("omnichannel_sessions already exists in types");
}
