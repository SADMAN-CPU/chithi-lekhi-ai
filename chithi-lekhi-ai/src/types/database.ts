export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      letters: {
        Row: {
          id: string
          user_id: string | null
          receiver_name: string
          relationship: string | null
          emotion: string | null
          style: string | null
          era_style: string | null
          language: string
          memory_context: string | null
          content: string
          favorite: boolean
          share_slug: string | null
          is_public: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          receiver_name: string
          relationship?: string | null
          emotion?: string | null
          style?: string | null
          era_style?: string | null
          language?: string
          memory_context?: string | null
          content: string
          favorite?: boolean
          share_slug?: string | null
          is_public?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          receiver_name?: string
          relationship?: string | null
          emotion?: string | null
          style?: string | null
          era_style?: string | null
          language?: string
          memory_context?: string | null
          content?: string
          favorite?: boolean
          share_slug?: string | null
          is_public?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "letters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          name: string | null
          avatar: string | null
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          name?: string | null
          avatar?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          name?: string | null
          avatar?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type LetterRow = Database['public']['Tables']['letters']['Row']
export type LetterInsert = Database['public']['Tables']['letters']['Insert']
export type LetterUpdate = Database['public']['Tables']['letters']['Update']
export type ProfileRow = Database['public']['Tables']['profiles']['Row']
