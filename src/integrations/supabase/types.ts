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
      admin_activity_logs: {
        Row: {
          action_description: string | null
          action_type: string
          admin_email: string | null
          admin_id: string | null
          admin_name: string | null
          branch: string | null
          created_at: string
          device_info: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          role: string | null
          status: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action_description?: string | null
          action_type: string
          admin_email?: string | null
          admin_id?: string | null
          admin_name?: string | null
          branch?: string | null
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          role?: string | null
          status?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action_description?: string | null
          action_type?: string
          admin_email?: string | null
          admin_id?: string | null
          admin_name?: string | null
          branch?: string | null
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          role?: string | null
          status?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          description: string | null
          file_type: string | null
          file_url: string
          id: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          event_date: string | null
          id: string
          nomination_url: string | null
          status: string
          theme: string | null
          title: string
          updated_at: string
          venue: string | null
          voting_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          nomination_url?: string | null
          status?: string
          theme?: string | null
          title: string
          updated_at?: string
          venue?: string | null
          voting_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          nomination_url?: string | null
          status?: string
          theme?: string | null
          title?: string
          updated_at?: string
          venue?: string | null
          voting_url?: string | null
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string
          title: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      partner_inquiries: {
        Row: {
          company: string
          created_at: string
          email: string
          id: string
          name: string
          phone: string
          proposal: string | null
          status: string
        }
        Insert: {
          company: string
          created_at?: string
          email: string
          id?: string
          name: string
          phone: string
          proposal?: string | null
          status?: string
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          proposal?: string | null
          status?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          id: string
          logo_url: string | null
          name: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          mpesa_code: string | null
          payment_method: string
          phone: string | null
          registration_id: string
          source: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          mpesa_code?: string | null
          payment_method?: string
          phone?: string | null
          registration_id: string
          source?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          mpesa_code?: string | null
          payment_method?: string
          phone?: string | null
          registration_id?: string
          source?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "code_payment_summary"
            referencedColumns: ["registration_id"]
          },
          {
            foreignKeyName: "payments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          branch: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          user_id: string
        }
        Insert: {
          branch?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          user_id: string
        }
        Update: {
          branch?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_redemptions: {
        Row: {
          code: string
          created_at: string
          discount_amount: number | null
          email: string | null
          id: string
          phone: string | null
          promotion_id: string | null
          reason: string | null
          registration_id: string | null
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          discount_amount?: number | null
          email?: string | null
          id?: string
          phone?: string | null
          promotion_id?: string | null
          reason?: string | null
          registration_id?: string | null
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          discount_amount?: number | null
          email?: string | null
          id?: string
          phone?: string | null
          promotion_id?: string | null
          reason?: string | null
          registration_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          eligible_users: string
          expires_at: string
          id: string
          is_active: boolean
          max_uses: number | null
          segment_tag: string | null
          start_at: string
          title: string
          updated_at: string
          updated_by: string | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          eligible_users?: string
          expires_at: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          segment_tag?: string | null
          start_at?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          eligible_users?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          segment_tag?: string | null
          start_at?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          used_count?: number
        }
        Relationships: []
      }
      referral_usage: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          id: string
          ip_address: string | null
          reason: string | null
          referral_code: string
          referred_email: string | null
          referred_user_id: string | null
          referrer_user_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          reason?: string | null
          referral_code: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_user_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          reason?: string | null
          referral_code?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_user_id?: string | null
          status?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_referrals: number | null
          referral_code: string
          referrer_email: string | null
          referrer_user_id: string | null
          reward_type: string
          reward_value: number
          total_referrals: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_referrals?: number | null
          referral_code: string
          referrer_email?: string | null
          referrer_user_id?: string | null
          reward_type?: string
          reward_value?: number
          total_referrals?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_referrals?: number | null
          referral_code?: string
          referrer_email?: string | null
          referrer_user_id?: string | null
          reward_type?: string
          reward_value?: number
          total_referrals?: number
        }
        Relationships: []
      }
      registrations: {
        Row: {
          created_at: string
          email: string
          event_id: string
          id: string
          institution: string | null
          name: string
          package_type: string
          payment_status: string
          payment_type: string
          phone: string
          quantity: number
          secure_ticket_token: string | null
          ticket_code: string | null
          ticket_issued: boolean
          total_cost: number
          total_paid: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          event_id: string
          id?: string
          institution?: string | null
          name: string
          package_type: string
          payment_status?: string
          payment_type?: string
          phone: string
          quantity?: number
          secure_ticket_token?: string | null
          ticket_code?: string | null
          ticket_issued?: boolean
          total_cost?: number
          total_paid?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          event_id?: string
          id?: string
          institution?: string | null
          name?: string
          package_type?: string
          payment_status?: string
          payment_type?: string
          phone?: string
          quantity?: number
          secure_ticket_token?: string | null
          ticket_code?: string | null
          ticket_issued?: boolean
          total_cost?: number
          total_paid?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          body: string | null
          id: string
          image_url: string | null
          section_key: string
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string | null
          id?: string
          image_url?: string | null
          section_key: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string | null
          id?: string
          image_url?: string | null
          section_key?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      speakers: {
        Row: {
          active: boolean
          bio: string | null
          created_at: string
          display_order: number
          id: string
          name: string
          photo_url: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          bio?: string | null
          created_at?: string
          display_order?: number
          id?: string
          name: string
          photo_url?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          bio?: string | null
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          photo_url?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sponsorships: {
        Row: {
          amount: number
          created_at: string
          id: string
          level: string
          mpesa_code: string | null
          num_students: number
          payment_method: string
          payment_status: string
          secure_ticket_token: string | null
          sponsor_code: string | null
          sponsor_email: string | null
          sponsor_name: string
          sponsor_phone: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          level: string
          mpesa_code?: string | null
          num_students?: number
          payment_method?: string
          payment_status?: string
          secure_ticket_token?: string | null
          sponsor_code?: string | null
          sponsor_email?: string | null
          sponsor_name: string
          sponsor_phone: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          level?: string
          mpesa_code?: string | null
          num_students?: number
          payment_method?: string
          payment_status?: string
          secure_ticket_token?: string | null
          sponsor_code?: string | null
          sponsor_email?: string | null
          sponsor_name?: string
          sponsor_phone?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      ticket_packages: {
        Row: {
          active: boolean
          capacity: number | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          installment_mode: string
          installments: Json
          name: string
          partial_allowed: boolean
          perks: Json
          price: number
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          capacity?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          installment_mode?: string
          installments?: Json
          name: string
          partial_allowed?: boolean
          perks?: Json
          price?: number
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          capacity?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          installment_mode?: string
          installments?: Json
          name?: string
          partial_allowed?: boolean
          perks?: Json
          price?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      code_payment_summary: {
        Row: {
          balance: number | null
          created_at: string | null
          email: string | null
          last_paid_at: string | null
          name: string | null
          package_type: string | null
          payment_status: string | null
          phone: string | null
          quantity: number | null
          registration_id: string | null
          secure_ticket_token: string | null
          ticket_code: string | null
          ticket_issued: boolean | null
          total_cost: number | null
          total_paid: number | null
          verified_payment_count: number | null
        }
        Insert: {
          balance?: never
          created_at?: string | null
          email?: string | null
          last_paid_at?: never
          name?: string | null
          package_type?: string | null
          payment_status?: string | null
          phone?: string | null
          quantity?: number | null
          registration_id?: string | null
          secure_ticket_token?: string | null
          ticket_code?: string | null
          ticket_issued?: boolean | null
          total_cost?: number | null
          total_paid?: number | null
          verified_payment_count?: never
        }
        Update: {
          balance?: never
          created_at?: string | null
          email?: string | null
          last_paid_at?: never
          name?: string | null
          package_type?: string | null
          payment_status?: string | null
          phone?: string | null
          quantity?: number | null
          registration_id?: string | null
          secure_ticket_token?: string | null
          ticket_code?: string | null
          ticket_issued?: boolean | null
          total_cost?: number | null
          total_paid?: number | null
          verified_payment_count?: never
        }
        Relationships: []
      }
    }
    Functions: {
      admin_wipe_data: {
        Args: { _confirm: string; _scope: string }
        Returns: Json
      }
      generate_secure_token: { Args: never; Returns: string }
      get_active_promotion: {
        Args: never
        Returns: {
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          eligible_users: string
          expires_at: string
          id: string
          is_active: boolean
          max_uses: number | null
          segment_tag: string | null
          start_at: string
          title: string
          updated_at: string
          updated_by: string | null
          used_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "promotions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validate_promo_code:
        | { Args: { _code: string; _email?: string }; Returns: Json }
        | {
            Args: {
              _code: string
              _email?: string
              _is_first_installment?: boolean
              _phone?: string
              _registration_id?: string
            }
            Returns: Json
          }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin"
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
      app_role: ["admin", "user", "super_admin"],
    },
  },
} as const
