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
          title?: string | null
          personality?: string | null
          letter_content?: string
          theme?: string
          image_url?: string | null
          pdf_url?: string | null
          is_favorite?: boolean
          content: string
          status: 'published' | 'draft'
          favorite: boolean
          share_slug: string | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          title?: string | null
          receiver_name: string
          relationship?: string | null
          emotion?: string | null
          personality?: string | null
          style?: string | null
          era_style?: string | null
          language?: string
          memory_context?: string | null
          letter_content?: string
          content: string
          theme?: string
          image_url?: string | null
          pdf_url?: string | null
          status?: 'published' | 'draft'
          is_favorite?: boolean
          favorite?: boolean
          share_slug?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          title?: string | null
          receiver_name?: string
          relationship?: string | null
          emotion?: string | null
          personality?: string | null
          style?: string | null
          era_style?: string | null
          language?: string
          memory_context?: string | null
          letter_content?: string
          content?: string
          theme?: string
          image_url?: string | null
          pdf_url?: string | null
          status?: 'published' | 'draft'
          is_favorite?: boolean
          favorite?: boolean
          share_slug?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'letters_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
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
      plans: {
        Row: {
          id: string
          name: string
          name_bn: string
          price: number
          daily_letter_limit: number
          features: Json
          created_at: string
        }
        Insert: {
          id: string
          name: string
          name_bn: string
          price?: number
          daily_letter_limit?: number
          features?: Json
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_bn?: string
          price?: number
          daily_letter_limit?: number
          features?: Json
          created_at?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          status: 'active' | 'canceled' | 'past_due'
          current_period_start: string
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id?: string
          status?: 'active' | 'canceled' | 'past_due'
          current_period_start?: string
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          status?: 'active' | 'canceled' | 'past_due'
          current_period_start?: string
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_subscriptions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_subscriptions_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'plans'
            referencedColumns: ['id']
          }
        ]
      }
      user_usage: {
        Row: {
          id: string
          identifier: string
          date: string
          letters_generated: number
          refinements_used: number
          voice_letters_used: number
          hd_exports_used: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          identifier: string
          date?: string
          letters_generated?: number
          refinements_used?: number
          voice_letters_used?: number
          hd_exports_used?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          identifier?: string
          date?: string
          letters_generated?: number
          refinements_used?: number
          voice_letters_used?: number
          hd_exports_used?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      public_letters: {
        Row: {
          id: string
          short_id: string
          user_id: string | null
          letter_id: string | null
          title: string
          receiver_name: string
          letter_content: string
          theme: string
          is_public: boolean
          expiration: '24h' | '7d' | 'permanent'
          expires_at: string | null
          views: number
          created_at: string
        }
        Insert: {
          id?: string
          short_id: string
          user_id?: string | null
          letter_id?: string | null
          title: string
          receiver_name: string
          letter_content: string
          theme?: string
          is_public?: boolean
          expiration?: '24h' | '7d' | 'permanent'
          expires_at?: string | null
          views?: number
          created_at?: string
        }
        Update: {
          id?: string
          short_id?: string
          user_id?: string | null
          letter_id?: string | null
          title?: string
          receiver_name?: string
          letter_content?: string
          theme?: string
          is_public?: boolean
          expiration?: '24h' | '7d' | 'permanent'
          expires_at?: string | null
          views?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'public_letters_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'public_letters_letter_id_fkey'
            columns: ['letter_id']
            isOneToOne: false
            referencedRelation: 'letters'
            referencedColumns: ['id']
          }
        ]
      }
      download_history: {
        Row: {
          id: string
          user_id: string
          letter_id: string | null
          format: 'pdf' | 'png' | 'txt'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          letter_id?: string | null
          format: 'pdf' | 'png' | 'txt'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          letter_id?: string | null
          format?: 'pdf' | 'png' | 'txt'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'download_history_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      shares: {
        Row: {
          id: string
          letter_id: string
          user_id: string | null
          share_token: string
          is_public: boolean
          expiration: '24h' | '7d' | 'never'
          expires_at: string | null
          views: number
          shares_count: number
          downloads_count: number
          audio_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          letter_id: string
          user_id?: string | null
          share_token: string
          is_public?: boolean
          expiration?: '24h' | '7d' | 'never'
          expires_at?: string | null
          views?: number
          shares_count?: number
          downloads_count?: number
          audio_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          letter_id?: string
          user_id?: string | null
          share_token?: string
          is_public?: boolean
          expiration?: '24h' | '7d' | 'never'
          expires_at?: string | null
          views?: number
          shares_count?: number
          downloads_count?: number
          audio_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'shares_letter_id_fkey'
            columns: ['letter_id']
            isOneToOne: false
            referencedRelation: 'letters'
            referencedColumns: ['id']
          }
        ]
      }
      share_analytics: {
        Row: {
          id: string
          share_id: string | null
          share_token: string
          event_type: 'view' | 'share' | 'download' | 'audio_play' | 'audio_generate'
          platform: string | null
          created_at: string
        }
        Insert: {
          id?: string
          share_id?: string | null
          share_token: string
          event_type: 'view' | 'share' | 'download' | 'audio_play' | 'audio_generate'
          platform?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          share_id?: string | null
          share_token?: string
          event_type?: 'view' | 'share' | 'download' | 'audio_play' | 'audio_generate'
          platform?: string | null
          created_at?: string
        }
        Relationships: []
      }
      voice_cache: {
        Row: {
          id: string
          content_hash: string
          voice_style: string
          audio_url: string
          audio_format: string
          file_size_bytes: number | null
          created_at: string
        }
        Insert: {
          id?: string
          content_hash: string
          voice_style: string
          audio_url: string
          audio_format?: string
          file_size_bytes?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          content_hash?: string
          voice_style?: string
          audio_url?: string
          audio_format?: string
          file_size_bytes?: number | null
          created_at?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          id: string
          user_id: string | null
          identifier: string
          action_type: string
          model: string
          tokens_used: number
          success: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          identifier: string
          action_type: string
          model: string
          tokens_used?: number
          success?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          identifier?: string
          action_type?: string
          model?: string
          tokens_used?: number
          success?: boolean
          created_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          letter_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          letter_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          letter_id?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      users: {
        Row: {
          id: string
          email: string | null
          name: string | null
          avatar: string | null
          created_at: string
        }
      }
    }
    Functions: {
      increment_public_letter_views: {
        Args: { target_short_id: string }
        Returns: void
      }
      increment_share_event: {
        Args: { target_token: string; event_type_param: string }
        Returns: void
      }
      get_shared_letter_by_token: {
        Args: { token_param: string }
        Returns: Json
      }
      consume_ai_quota: {
        Args: {
          p_identifier: string
          p_date: string
          p_action_type: string
          p_limit: number
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
}

export type LetterRow = Database['public']['Tables']['letters']['Row']
export type LetterInsert = Database['public']['Tables']['letters']['Insert']
export type LetterUpdate = Database['public']['Tables']['letters']['Update']
export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type PlanRow = Database['public']['Tables']['plans']['Row']
export type UserSubscriptionRow = Database['public']['Tables']['user_subscriptions']['Row']
export type UserUsageRow = Database['public']['Tables']['user_usage']['Row']
export type PublicLetterRow = Database['public']['Tables']['public_letters']['Row']
export type PublicLetterInsert = Database['public']['Tables']['public_letters']['Insert']
export type PublicLetterUpdate = Database['public']['Tables']['public_letters']['Update']
export type DownloadHistoryRow = Database['public']['Tables']['download_history']['Row']
export type ShareRow = Database['public']['Tables']['shares']['Row']
export type ShareInsert = Database['public']['Tables']['shares']['Insert']
export type ShareUpdate = Database['public']['Tables']['shares']['Update']
export type ShareAnalyticsRow = Database['public']['Tables']['share_analytics']['Row']
export type VoiceCacheRow = Database['public']['Tables']['voice_cache']['Row']
export type FavoriteRow = Database['public']['Tables']['favorites']['Row']
export type AIUsageRow = Database['public']['Tables']['ai_usage']['Row']
export type AIUsageInsert = Database['public']['Tables']['ai_usage']['Insert']
export type AIUsageUpdate = Database['public']['Tables']['ai_usage']['Update']
