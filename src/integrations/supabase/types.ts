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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      arena_attempts: {
        Row: {
          created_at: string | null
          difficulty_tier: number
          feedback_summary: string | null
          hints_used: number | null
          id: string
          marks_estimate: string | null
          question_id: string
          self_rating: string | null
          session_id: string
          status: string | null
          time_spent_sec: number | null
          topic_id: string
          user_id: string | null
          working_image_urls: string[] | null
        }
        Insert: {
          created_at?: string | null
          difficulty_tier: number
          feedback_summary?: string | null
          hints_used?: number | null
          id?: string
          marks_estimate?: string | null
          question_id: string
          self_rating?: string | null
          session_id: string
          status?: string | null
          time_spent_sec?: number | null
          topic_id: string
          user_id?: string | null
          working_image_urls?: string[] | null
        }
        Update: {
          created_at?: string | null
          difficulty_tier?: number
          feedback_summary?: string | null
          hints_used?: number | null
          id?: string
          marks_estimate?: string | null
          question_id?: string
          self_rating?: string | null
          session_id?: string
          status?: string | null
          time_spent_sec?: number | null
          topic_id?: string
          user_id?: string | null
          working_image_urls?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "arena_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "arena_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_attempts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_questions: {
        Row: {
          created_at: string | null
          difficulty_tier: number
          final_answer: string
          id: string
          marking_points: string[]
          question_text: string
          topic_id: string
          worked_solution: string
        }
        Insert: {
          created_at?: string | null
          difficulty_tier: number
          final_answer: string
          id?: string
          marking_points: string[]
          question_text: string
          topic_id: string
          worked_solution: string
        }
        Update: {
          created_at?: string | null
          difficulty_tier?: number
          final_answer?: string
          id?: string
          marking_points?: string[]
          question_text?: string
          topic_id?: string
          worked_solution?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      eval_results: {
        Row: {
          created_at: string
          expected_behavior: string
          failure_reason: string | null
          id: string
          orbit_response: string
          passed: boolean
          red_flags: string[]
          red_flags_found: string[] | null
          run_id: string
          student_input: string
          test_name: string
          test_setup: string
        }
        Insert: {
          created_at?: string
          expected_behavior: string
          failure_reason?: string | null
          id?: string
          orbit_response: string
          passed: boolean
          red_flags: string[]
          red_flags_found?: string[] | null
          run_id: string
          student_input: string
          test_name: string
          test_setup: string
        }
        Update: {
          created_at?: string
          expected_behavior?: string
          failure_reason?: string | null
          id?: string
          orbit_response?: string
          passed?: boolean
          red_flags?: string[]
          red_flags_found?: string[] | null
          run_id?: string
          student_input?: string
          test_name?: string
          test_setup?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          input_method: string | null
          sender: Database["public"]["Enums"]["message_sender"]
          session_id: string
          student_behavior: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          input_method?: string | null
          sender: Database["public"]["Enums"]["message_sender"]
          session_id: string
          student_behavior?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          input_method?: string | null
          sender?: Database["public"]["Enums"]["message_sender"]
          session_id?: string
          student_behavior?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_stats: {
        Row: {
          attempts: number | null
          correct_attempts: number | null
          id: string
          topic_id: string
          user_id: string
        }
        Insert: {
          attempts?: number | null
          correct_attempts?: number | null
          id?: string
          topic_id: string
          user_id: string
        }
        Update: {
          attempts?: number | null
          correct_attempts?: number | null
          id?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_stats_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          exam_board: string | null
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          target_grade: string | null
          tier: string | null
          updated_at: string | null
          user_id: string
          year_group: string | null
        }
        Insert: {
          created_at?: string | null
          exam_board?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          target_grade?: string | null
          tier?: string | null
          updated_at?: string | null
          user_id: string
          year_group?: string | null
        }
        Update: {
          created_at?: string | null
          exam_board?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          target_grade?: string | null
          tier?: string | null
          updated_at?: string | null
          user_id?: string
          year_group?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          beta_feedback: string | null
          beta_tester_name: string | null
          confidence_after: number | null
          created_at: string | null
          first_input_method: string | null
          id: string
          post_confidence: number | null
          question_image_url: string | null
          question_text: string
          session_completed: boolean | null
          topic_id: string | null
          user_id: string
          working_image_url: string | null
          would_use_again: string | null
        }
        Insert: {
          beta_feedback?: string | null
          beta_tester_name?: string | null
          confidence_after?: number | null
          created_at?: string | null
          first_input_method?: string | null
          id?: string
          post_confidence?: number | null
          question_image_url?: string | null
          question_text: string
          session_completed?: boolean | null
          topic_id?: string | null
          user_id: string
          working_image_url?: string | null
          would_use_again?: string | null
        }
        Update: {
          beta_feedback?: string | null
          beta_tester_name?: string | null
          confidence_after?: number | null
          created_at?: string | null
          first_input_method?: string | null
          id?: string
          post_confidence?: number | null
          question_image_url?: string | null
          question_text?: string
          session_completed?: boolean | null
          topic_id?: string | null
          user_id?: string
          working_image_url?: string | null
          would_use_again?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string | null
          id: string
          name: string
          parent_id: string | null
          section: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          section?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          section?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "admin"
      message_sender: "student" | "tutor"
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
      app_role: ["student", "admin"],
      message_sender: ["student", "tutor"],
    },
  },
} as const
