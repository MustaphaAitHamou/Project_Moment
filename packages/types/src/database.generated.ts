// Fichier généré par `pnpm db:types` — ne pas modifier à la main.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          description: string | null;
          is_public: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          description?: string | null;
          is_public?: boolean;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          description?: string | null;
          is_public?: boolean;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [];
      };
      artists: {
        Row: {
          bio: string | null;
          country_code: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          image_path: string | null;
          is_demo: boolean;
          name: string;
          slug: string;
          updated_at: string;
          website_url: string | null;
        };
        ComputedFields: never;
        Insert: {
          bio?: string | null;
          country_code?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          image_path?: string | null;
          is_demo?: boolean;
          name: string;
          slug: string;
          updated_at?: string;
          website_url?: string | null;
        };
        Update: {
          bio?: string | null;
          country_code?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          image_path?: string | null;
          is_demo?: boolean;
          name?: string;
          slug?: string;
          updated_at?: string;
          website_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'artists_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_role: string | null;
          changes: Json | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: number;
          metadata: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_role?: string | null;
          changes?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: never;
          metadata?: NonNullable<Json>;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_role?: string | null;
          changes?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: never;
          metadata?: NonNullable<Json>;
        };
        Relationships: [];
      };
      beta_feedback: {
        Row: {
          admin_note: string | null;
          app_version: string | null;
          created_at: string;
          device_info: NonNullable<Json>;
          id: string;
          kind: Database['public']['Enums']['feedback_kind'];
          message: string | null;
          platform: string;
          rating: number | null;
          screen: string | null;
          status: Database['public']['Enums']['feedback_status'];
          title: string | null;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          admin_note?: string | null;
          app_version?: string | null;
          created_at?: string;
          device_info?: NonNullable<Json>;
          id?: string;
          kind: Database['public']['Enums']['feedback_kind'];
          message?: string | null;
          platform: string;
          rating?: number | null;
          screen?: string | null;
          status?: Database['public']['Enums']['feedback_status'];
          title?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          admin_note?: string | null;
          app_version?: string | null;
          created_at?: string;
          device_info?: NonNullable<Json>;
          id?: string;
          kind?: Database['public']['Enums']['feedback_kind'];
          message?: string | null;
          platform?: string;
          rating?: number | null;
          screen?: string | null;
          status?: Database['public']['Enums']['feedback_status'];
          title?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      beta_invitations: {
        Row: {
          code_hash: string;
          code_hint: string;
          created_at: string;
          created_by: string | null;
          email: string | null;
          expires_at: string;
          id: string;
          note: string | null;
          redeemed_at: string | null;
          redeemed_by: string | null;
          revoked_at: string | null;
          waitlist_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          code_hash: string;
          code_hint: string;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          expires_at?: string;
          id?: string;
          note?: string | null;
          redeemed_at?: string | null;
          redeemed_by?: string | null;
          revoked_at?: string | null;
          waitlist_id?: string | null;
        };
        Update: {
          code_hash?: string;
          code_hint?: string;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          expires_at?: string;
          id?: string;
          note?: string | null;
          redeemed_at?: string | null;
          redeemed_by?: string | null;
          revoked_at?: string | null;
          waitlist_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'beta_invitations_waitlist_id_fkey';
            columns: ['waitlist_id'];
            isOneToOne: false;
            referencedRelation: 'beta_waitlist';
            referencedColumns: ['id'];
          },
        ];
      };
      beta_waitlist: {
        Row: {
          admin_note: string | null;
          consent_at: string;
          country_code: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          locale: string;
          motivation: string | null;
          platforms: string[];
          social_handle: string | null;
          source: string | null;
          status: Database['public']['Enums']['beta_waitlist_status'];
          updated_at: string;
          user_id: string | null;
          verification_sent_at: string | null;
          verification_token_hash: string | null;
          verified_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          admin_note?: string | null;
          consent_at: string;
          country_code?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          id?: string;
          locale?: string;
          motivation?: string | null;
          platforms?: string[];
          social_handle?: string | null;
          source?: string | null;
          status?: Database['public']['Enums']['beta_waitlist_status'];
          updated_at?: string;
          user_id?: string | null;
          verification_sent_at?: string | null;
          verification_token_hash?: string | null;
          verified_at?: string | null;
        };
        Update: {
          admin_note?: string | null;
          consent_at?: string;
          country_code?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          locale?: string;
          motivation?: string | null;
          platforms?: string[];
          social_handle?: string | null;
          source?: string | null;
          status?: Database['public']['Enums']['beta_waitlist_status'];
          updated_at?: string;
          user_id?: string | null;
          verification_sent_at?: string | null;
          verification_token_hash?: string | null;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'beta_waitlist_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
        ];
      };
      cities: {
        Row: {
          country_code: string;
          created_at: string;
          id: string;
          is_active: boolean;
          is_featured: boolean;
          lat: number;
          lng: number;
          location: unknown;
          names: NonNullable<Json>;
          region_id: string | null;
          slug: string;
          sort_order: number;
          timezone: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          country_code: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          is_featured?: boolean;
          lat: number;
          lng: number;
          location?: never;
          names: NonNullable<Json>;
          region_id?: string | null;
          slug: string;
          sort_order?: number;
          timezone: string;
          updated_at?: string;
        };
        Update: {
          country_code?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          is_featured?: boolean;
          lat?: number;
          lng?: number;
          location?: never;
          names?: NonNullable<Json>;
          region_id?: string | null;
          slug?: string;
          sort_order?: number;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cities_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'cities_region_id_fkey';
            columns: ['region_id'];
            isOneToOne: false;
            referencedRelation: 'regions';
            referencedColumns: ['id'];
          },
        ];
      };
      commercial_agreements: {
        Row: {
          catalog_discount_bps: number;
          commission_bps: number;
          country_code: string | null;
          created_at: string;
          created_by: string | null;
          customer_service_fee_bps: number;
          customer_service_fee_fixed_minor: number;
          event_id: string | null;
          fee_share_bps: number;
          id: string;
          model: Database['public']['Enums']['agreement_model'];
          notes: string | null;
          organizer_id: string | null;
          promo_funding_allowed: boolean;
          promo_max_bps: number;
          provider_id: string;
          status: Database['public']['Enums']['agreement_status'];
          updated_at: string;
          valid_from: string | null;
          valid_to: string | null;
        };
        ComputedFields: never;
        Insert: {
          catalog_discount_bps?: number;
          commission_bps?: number;
          country_code?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_service_fee_bps?: number;
          customer_service_fee_fixed_minor?: number;
          event_id?: string | null;
          fee_share_bps?: number;
          id?: string;
          model: Database['public']['Enums']['agreement_model'];
          notes?: string | null;
          organizer_id?: string | null;
          promo_funding_allowed?: boolean;
          promo_max_bps?: number;
          provider_id: string;
          status?: Database['public']['Enums']['agreement_status'];
          updated_at?: string;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Update: {
          catalog_discount_bps?: number;
          commission_bps?: number;
          country_code?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_service_fee_bps?: number;
          customer_service_fee_fixed_minor?: number;
          event_id?: string | null;
          fee_share_bps?: number;
          id?: string;
          model?: Database['public']['Enums']['agreement_model'];
          notes?: string | null;
          organizer_id?: string | null;
          promo_funding_allowed?: boolean;
          promo_max_bps?: number;
          provider_id?: string;
          status?: Database['public']['Enums']['agreement_status'];
          updated_at?: string;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'commercial_agreements_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'commercial_agreements_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'commercial_agreements_organizer_id_fkey';
            columns: ['organizer_id'];
            isOneToOne: false;
            referencedRelation: 'organizer_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'commercial_agreements_provider_id_fkey';
            columns: ['provider_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_providers';
            referencedColumns: ['id'];
          },
        ];
      };
      countries: {
        Row: {
          code: string;
          created_at: string;
          currency: string;
          default_locale: string;
          default_timezone: string;
          distance_unit: string;
          first_day_of_week: number;
          is_active: boolean;
          locales: string[];
          names: NonNullable<Json>;
          phone_prefix: string;
          region_type: Database['public']['Enums']['region_type'];
          resale_legal_status: string;
          resale_live_enabled: boolean;
          sort_order: number;
          tax_display: string;
          ticket_sales_live_enabled: boolean;
          updated_at: string;
          weekend_days: number[];
        };
        ComputedFields: never;
        Insert: {
          code: string;
          created_at?: string;
          currency: string;
          default_locale: string;
          default_timezone: string;
          distance_unit: string;
          first_day_of_week: number;
          is_active?: boolean;
          locales: string[];
          names: NonNullable<Json>;
          phone_prefix: string;
          region_type: Database['public']['Enums']['region_type'];
          resale_legal_status?: string;
          resale_live_enabled?: boolean;
          sort_order?: number;
          tax_display: string;
          ticket_sales_live_enabled?: boolean;
          updated_at?: string;
          weekend_days: number[];
        };
        Update: {
          code?: string;
          created_at?: string;
          currency?: string;
          default_locale?: string;
          default_timezone?: string;
          distance_unit?: string;
          first_day_of_week?: number;
          is_active?: boolean;
          locales?: string[];
          names?: NonNullable<Json>;
          phone_prefix?: string;
          region_type?: Database['public']['Enums']['region_type'];
          resale_legal_status?: string;
          resale_live_enabled?: boolean;
          sort_order?: number;
          tax_display?: string;
          ticket_sales_live_enabled?: boolean;
          updated_at?: string;
          weekend_days?: number[];
        };
        Relationships: [];
      };
      device_push_tokens: {
        Row: {
          app_version: string | null;
          created_at: string;
          device_name: string | null;
          id: string;
          last_seen_at: string;
          platform: string;
          revoked_at: string | null;
          token: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          app_version?: string | null;
          created_at?: string;
          device_name?: string | null;
          id?: string;
          last_seen_at?: string;
          platform: string;
          revoked_at?: string | null;
          token: string;
          user_id: string;
        };
        Update: {
          app_version?: string | null;
          created_at?: string;
          device_name?: string | null;
          id?: string;
          last_seen_at?: string;
          platform?: string;
          revoked_at?: string | null;
          token?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      event_announcements: {
        Row: {
          author_id: string | null;
          body: string;
          created_at: string;
          event_id: string;
          id: string;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          author_id?: string | null;
          body: string;
          created_at?: string;
          event_id: string;
          id?: string;
          title: string;
        };
        Update: {
          author_id?: string | null;
          body?: string;
          created_at?: string;
          event_id?: string;
          id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_announcements_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      event_artists: {
        Row: {
          artist_id: string;
          billing_order: number;
          event_id: string;
          role: string;
        };
        ComputedFields: never;
        Insert: {
          artist_id: string;
          billing_order?: number;
          event_id: string;
          role?: string;
        };
        Update: {
          artist_id?: string;
          billing_order?: number;
          event_id?: string;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_artists_artist_id_fkey';
            columns: ['artist_id'];
            isOneToOne: false;
            referencedRelation: 'artists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_artists_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      event_categories: {
        Row: {
          color: string;
          created_at: string;
          icon: string;
          is_active: boolean;
          names: NonNullable<Json>;
          slug: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          color: string;
          created_at?: string;
          icon: string;
          is_active?: boolean;
          names: NonNullable<Json>;
          slug: string;
          sort_order?: number;
        };
        Update: {
          color?: string;
          created_at?: string;
          icon?: string;
          is_active?: boolean;
          names?: NonNullable<Json>;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      event_daily_stats: {
        Row: {
          calendar_adds: number;
          day: string;
          event_id: string;
          favorites: number;
          registrations: number;
          shares: number;
          views: number;
        };
        ComputedFields: never;
        Insert: {
          calendar_adds?: number;
          day: string;
          event_id: string;
          favorites?: number;
          registrations?: number;
          shares?: number;
          views?: number;
        };
        Update: {
          calendar_adds?: number;
          day?: string;
          event_id?: string;
          favorites?: number;
          registrations?: number;
          shares?: number;
          views?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'event_daily_stats_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      event_media: {
        Row: {
          alt_text: string | null;
          created_at: string;
          event_id: string;
          id: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          sort_order: number;
          status: Database['public']['Enums']['media_status'];
          storage_path: string;
          uploaded_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          alt_text?: string | null;
          created_at?: string;
          event_id: string;
          id?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sort_order?: number;
          status?: Database['public']['Enums']['media_status'];
          storage_path: string;
          uploaded_by?: string | null;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string;
          event_id?: string;
          id?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sort_order?: number;
          status?: Database['public']['Enums']['media_status'];
          storage_path?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'event_media_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      event_registrations: {
        Row: {
          cancelled_at: string | null;
          created_at: string;
          event_id: string;
          id: string;
          quantity: number;
          status: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          cancelled_at?: string | null;
          created_at?: string;
          event_id: string;
          id?: string;
          quantity?: number;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cancelled_at?: string | null;
          created_at?: string;
          event_id?: string;
          id?: string;
          quantity?: number;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_registrations_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      event_reports: {
        Row: {
          created_at: string;
          details: string | null;
          event_id: string;
          handled_at: string | null;
          handled_by: string | null;
          id: string;
          reason: Database['public']['Enums']['report_reason'];
          reporter_id: string | null;
          resolution_note: string | null;
          status: Database['public']['Enums']['report_status'];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          details?: string | null;
          event_id: string;
          handled_at?: string | null;
          handled_by?: string | null;
          id?: string;
          reason: Database['public']['Enums']['report_reason'];
          reporter_id?: string | null;
          resolution_note?: string | null;
          status?: Database['public']['Enums']['report_status'];
        };
        Update: {
          created_at?: string;
          details?: string | null;
          event_id?: string;
          handled_at?: string | null;
          handled_by?: string | null;
          id?: string;
          reason?: Database['public']['Enums']['report_reason'];
          reporter_id?: string | null;
          resolution_note?: string | null;
          status?: Database['public']['Enums']['report_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'event_reports_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      event_sessions: {
        Row: {
          capacity: number | null;
          created_at: string;
          ends_at: string | null;
          event_id: string;
          id: string;
          note: string | null;
          starts_at: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          capacity?: number | null;
          created_at?: string;
          ends_at?: string | null;
          event_id: string;
          id?: string;
          note?: string | null;
          starts_at: string;
          status?: string;
        };
        Update: {
          capacity?: number | null;
          created_at?: string;
          ends_at?: string | null;
          event_id?: string;
          id?: string;
          note?: string | null;
          starts_at?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_sessions_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      events: {
        Row: {
          accessibility: NonNullable<Json>;
          address_line: string | null;
          age_min: number | null;
          cancellation_policy: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          capacity: number | null;
          category_slug: string;
          city_id: string;
          contact_email: string | null;
          contact_phone: string | null;
          country_code: string;
          cover_path: string | null;
          cover_status: Database['public']['Enums']['media_status'];
          created_at: string;
          created_by: string | null;
          currency: string | null;
          deleted_at: string | null;
          description: string | null;
          ends_at: string | null;
          entry_conditions: string | null;
          favorites_count: number;
          id: string;
          is_demo: boolean;
          is_free: boolean;
          is_online: boolean;
          is_sponsored: boolean;
          lat: number | null;
          lng: number | null;
          location: unknown;
          location_name: string | null;
          moderation_note: string | null;
          official_links: NonNullable<Json>;
          online_url: string | null;
          organizer_id: string;
          postal_code: string | null;
          price_max_minor: number | null;
          price_min_minor: number | null;
          published_at: string | null;
          region_id: string | null;
          registration_mode: Database['public']['Enums']['registration_mode'];
          registrations_count: number;
          reviewed_at: string | null;
          reviewed_by: string | null;
          search_document: string | null;
          search_vector: unknown;
          slug: string;
          starts_at: string;
          status: Database['public']['Enums']['event_status'];
          submitted_at: string | null;
          summary: string | null;
          tags: string[];
          timezone: string;
          title: string;
          updated_at: string;
          venue_id: string | null;
          views_count: number;
          visibility: Database['public']['Enums']['event_visibility'];
          event_search_document: string | null;
        };
        ComputedFields: 'event_search_document';
        Insert: {
          accessibility?: NonNullable<Json>;
          address_line?: string | null;
          age_min?: number | null;
          cancellation_policy?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          capacity?: number | null;
          category_slug: string;
          city_id: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          country_code: string;
          cover_path?: string | null;
          cover_status?: Database['public']['Enums']['media_status'];
          created_at?: string;
          created_by?: string | null;
          currency?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          ends_at?: string | null;
          entry_conditions?: string | null;
          favorites_count?: number;
          id?: string;
          is_demo?: boolean;
          is_free?: boolean;
          is_online?: boolean;
          is_sponsored?: boolean;
          lat?: number | null;
          lng?: number | null;
          location?: never;
          location_name?: string | null;
          moderation_note?: string | null;
          official_links?: NonNullable<Json>;
          online_url?: string | null;
          organizer_id: string;
          postal_code?: string | null;
          price_max_minor?: number | null;
          price_min_minor?: number | null;
          published_at?: string | null;
          region_id?: string | null;
          registration_mode?: Database['public']['Enums']['registration_mode'];
          registrations_count?: number;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          search_document?: string | null;
          search_vector?: unknown;
          slug: string;
          starts_at: string;
          status?: Database['public']['Enums']['event_status'];
          submitted_at?: string | null;
          summary?: string | null;
          tags?: string[];
          timezone: string;
          title: string;
          updated_at?: string;
          venue_id?: string | null;
          views_count?: number;
          visibility?: Database['public']['Enums']['event_visibility'];
        };
        Update: {
          accessibility?: NonNullable<Json>;
          address_line?: string | null;
          age_min?: number | null;
          cancellation_policy?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          capacity?: number | null;
          category_slug?: string;
          city_id?: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          country_code?: string;
          cover_path?: string | null;
          cover_status?: Database['public']['Enums']['media_status'];
          created_at?: string;
          created_by?: string | null;
          currency?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          ends_at?: string | null;
          entry_conditions?: string | null;
          favorites_count?: number;
          id?: string;
          is_demo?: boolean;
          is_free?: boolean;
          is_online?: boolean;
          is_sponsored?: boolean;
          lat?: number | null;
          lng?: number | null;
          location?: never;
          location_name?: string | null;
          moderation_note?: string | null;
          official_links?: NonNullable<Json>;
          online_url?: string | null;
          organizer_id?: string;
          postal_code?: string | null;
          price_max_minor?: number | null;
          price_min_minor?: number | null;
          published_at?: string | null;
          region_id?: string | null;
          registration_mode?: Database['public']['Enums']['registration_mode'];
          registrations_count?: number;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          search_document?: string | null;
          search_vector?: unknown;
          slug?: string;
          starts_at?: string;
          status?: Database['public']['Enums']['event_status'];
          submitted_at?: string | null;
          summary?: string | null;
          tags?: string[];
          timezone?: string;
          title?: string;
          updated_at?: string;
          venue_id?: string | null;
          views_count?: number;
          visibility?: Database['public']['Enums']['event_visibility'];
        };
        Relationships: [
          {
            foreignKeyName: 'events_category_slug_fkey';
            columns: ['category_slug'];
            isOneToOne: false;
            referencedRelation: 'event_categories';
            referencedColumns: ['slug'];
          },
          {
            foreignKeyName: 'events_city_id_fkey';
            columns: ['city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'events_organizer_id_fkey';
            columns: ['organizer_id'];
            isOneToOne: false;
            referencedRelation: 'organizer_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_region_id_fkey';
            columns: ['region_id'];
            isOneToOne: false;
            referencedRelation: 'regions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
      favorites: {
        Row: {
          created_at: string;
          event_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          event_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'favorites_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      geocode_cache: {
        Row: {
          country_code: string;
          created_at: string;
          provider: string;
          query: string;
          query_hash: string;
          results: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          country_code: string;
          created_at?: string;
          provider?: string;
          query: string;
          query_hash: string;
          results: NonNullable<Json>;
        };
        Update: {
          country_code?: string;
          created_at?: string;
          provider?: string;
          query?: string;
          query_hash?: string;
          results?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: 'geocode_cache_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
        ];
      };
      idempotency_keys: {
        Row: {
          created_at: string;
          expires_at: string;
          key: string;
          request_hash: string;
          response_body: Json | null;
          response_status: number | null;
          scope: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          expires_at?: string;
          key: string;
          request_hash: string;
          response_body?: Json | null;
          response_status?: number | null;
          scope: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          key?: string;
          request_hash?: string;
          response_body?: Json | null;
          response_status?: number | null;
          scope?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      moderation_actions: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          id: string;
          metadata: NonNullable<Json>;
          reason: string | null;
          target_id: string;
          target_type: Database['public']['Enums']['moderation_target'];
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: NonNullable<Json>;
          reason?: string | null;
          target_id: string;
          target_type: Database['public']['Enums']['moderation_target'];
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: NonNullable<Json>;
          reason?: string | null;
          target_id?: string;
          target_type?: Database['public']['Enums']['moderation_target'];
        };
        Relationships: [];
      };
      notification_outbox: {
        Row: {
          attempts: number;
          channel: string;
          created_at: string;
          id: string;
          last_error: string | null;
          notification_id: string;
          sent_at: string | null;
          status: Database['public']['Enums']['outbox_status'];
        };
        ComputedFields: never;
        Insert: {
          attempts?: number;
          channel: string;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          notification_id: string;
          sent_at?: string | null;
          status?: Database['public']['Enums']['outbox_status'];
        };
        Update: {
          attempts?: number;
          channel?: string;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          notification_id?: string;
          sent_at?: string | null;
          status?: Database['public']['Enums']['outbox_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'notification_outbox_notification_id_fkey';
            columns: ['notification_id'];
            isOneToOne: false;
            referencedRelation: 'notifications';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_preferences: {
        Row: {
          email_enabled: boolean;
          followed_city_events_enabled: boolean;
          marketing_enabled: boolean;
          organizer_updates_enabled: boolean;
          push_enabled: boolean;
          reminder_lead_hours: number;
          reminders_enabled: boolean;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          email_enabled?: boolean;
          followed_city_events_enabled?: boolean;
          marketing_enabled?: boolean;
          organizer_updates_enabled?: boolean;
          push_enabled?: boolean;
          reminder_lead_hours?: number;
          reminders_enabled?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          email_enabled?: boolean;
          followed_city_events_enabled?: boolean;
          marketing_enabled?: boolean;
          organizer_updates_enabled?: boolean;
          push_enabled?: boolean;
          reminder_lead_hours?: number;
          reminders_enabled?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          data: NonNullable<Json>;
          dedupe_key: string | null;
          id: string;
          is_demo: boolean;
          link: string | null;
          read_at: string | null;
          title: string | null;
          type: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string | null;
          created_at?: string;
          data?: NonNullable<Json>;
          dedupe_key?: string | null;
          id?: string;
          is_demo?: boolean;
          link?: string | null;
          read_at?: string | null;
          title?: string | null;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          data?: NonNullable<Json>;
          dedupe_key?: string | null;
          id?: string;
          is_demo?: boolean;
          link?: string | null;
          read_at?: string | null;
          title?: string | null;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          line_total_minor: number;
          offer_id: string;
          offer_name: string;
          order_id: string;
          quantity: number;
          unit_face_value_minor: number;
          unit_provider_fee_minor: number;
          unit_service_fee_minor: number;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          line_total_minor: number;
          offer_id: string;
          offer_name: string;
          order_id: string;
          quantity: number;
          unit_face_value_minor: number;
          unit_provider_fee_minor?: number;
          unit_service_fee_minor?: number;
        };
        Update: {
          id?: string;
          line_total_minor?: number;
          offer_id?: string;
          offer_name?: string;
          order_id?: string;
          quantity?: number;
          unit_face_value_minor?: number;
          unit_provider_fee_minor?: number;
          unit_service_fee_minor?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'order_items_offer_id_fkey';
            columns: ['offer_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_offers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_items_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          buyer_email: string | null;
          buyer_name: string | null;
          cancelled_at: string | null;
          created_at: string;
          currency: string;
          discount_minor: number;
          environment: Database['public']['Enums']['commerce_environment'];
          event_id: string;
          expires_at: string;
          failure_reason: string | null;
          fulfilled_at: string | null;
          id: string;
          idempotency_key: string;
          order_number: string;
          paid_at: string | null;
          payment_provider: string;
          pricing: NonNullable<Json>;
          promotion_id: string | null;
          provider_fees_minor: number;
          provider_id: string;
          provider_order_ref: string | null;
          refunded_at: string | null;
          reservation_id: string;
          service_fees_minor: number;
          status: Database['public']['Enums']['order_status'];
          subtotal_minor: number;
          tax_added_minor: number;
          tax_included_minor: number;
          total_minor: number;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          buyer_email?: string | null;
          buyer_name?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          currency: string;
          discount_minor?: number;
          environment: Database['public']['Enums']['commerce_environment'];
          event_id: string;
          expires_at: string;
          failure_reason?: string | null;
          fulfilled_at?: string | null;
          id?: string;
          idempotency_key: string;
          order_number: string;
          paid_at?: string | null;
          payment_provider: string;
          pricing: NonNullable<Json>;
          promotion_id?: string | null;
          provider_fees_minor?: number;
          provider_id: string;
          provider_order_ref?: string | null;
          refunded_at?: string | null;
          reservation_id: string;
          service_fees_minor?: number;
          status?: Database['public']['Enums']['order_status'];
          subtotal_minor: number;
          tax_added_minor?: number;
          tax_included_minor?: number;
          total_minor: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          buyer_email?: string | null;
          buyer_name?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          currency?: string;
          discount_minor?: number;
          environment?: Database['public']['Enums']['commerce_environment'];
          event_id?: string;
          expires_at?: string;
          failure_reason?: string | null;
          fulfilled_at?: string | null;
          id?: string;
          idempotency_key?: string;
          order_number?: string;
          paid_at?: string | null;
          payment_provider?: string;
          pricing?: NonNullable<Json>;
          promotion_id?: string | null;
          provider_fees_minor?: number;
          provider_id?: string;
          provider_order_ref?: string | null;
          refunded_at?: string | null;
          reservation_id?: string;
          service_fees_minor?: number;
          status?: Database['public']['Enums']['order_status'];
          subtotal_minor?: number;
          tax_added_minor?: number;
          tax_included_minor?: number;
          total_minor?: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_promotion_id_fkey';
            columns: ['promotion_id'];
            isOneToOne: false;
            referencedRelation: 'promotions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_provider_id_fkey';
            columns: ['provider_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_providers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_reservation_id_fkey';
            columns: ['reservation_id'];
            isOneToOne: true;
            referencedRelation: 'reservations';
            referencedColumns: ['id'];
          },
        ];
      };
      organizer_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          organizer_id: string;
          revoked_at: string | null;
          role: Database['public']['Enums']['organizer_member_role'];
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          organizer_id: string;
          revoked_at?: string | null;
          role: Database['public']['Enums']['organizer_member_role'];
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          organizer_id?: string;
          revoked_at?: string | null;
          role?: Database['public']['Enums']['organizer_member_role'];
        };
        Relationships: [
          {
            foreignKeyName: 'organizer_invitations_organizer_id_fkey';
            columns: ['organizer_id'];
            isOneToOne: false;
            referencedRelation: 'organizer_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      organizer_members: {
        Row: {
          created_at: string;
          invited_by: string | null;
          organizer_id: string;
          role: Database['public']['Enums']['organizer_member_role'];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          invited_by?: string | null;
          organizer_id: string;
          role: Database['public']['Enums']['organizer_member_role'];
          user_id: string;
        };
        Update: {
          created_at?: string;
          invited_by?: string | null;
          organizer_id?: string;
          role?: Database['public']['Enums']['organizer_member_role'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organizer_members_organizer_id_fkey';
            columns: ['organizer_id'];
            isOneToOne: false;
            referencedRelation: 'organizer_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      organizer_profiles: {
        Row: {
          bio: string | null;
          city_id: string | null;
          country_code: string;
          cover_path: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          is_demo: boolean;
          kind: Database['public']['Enums']['organizer_kind'];
          logo_path: string | null;
          name: string;
          public_email: string | null;
          public_phone: string | null;
          slug: string;
          updated_at: string;
          verification_status: Database['public']['Enums']['verification_status'];
          verified_at: string | null;
          verified_by: string | null;
          website_url: string | null;
        };
        ComputedFields: never;
        Insert: {
          bio?: string | null;
          city_id?: string | null;
          country_code: string;
          cover_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          is_demo?: boolean;
          kind: Database['public']['Enums']['organizer_kind'];
          logo_path?: string | null;
          name: string;
          public_email?: string | null;
          public_phone?: string | null;
          slug: string;
          updated_at?: string;
          verification_status?: Database['public']['Enums']['verification_status'];
          verified_at?: string | null;
          verified_by?: string | null;
          website_url?: string | null;
        };
        Update: {
          bio?: string | null;
          city_id?: string | null;
          country_code?: string;
          cover_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          is_demo?: boolean;
          kind?: Database['public']['Enums']['organizer_kind'];
          logo_path?: string | null;
          name?: string;
          public_email?: string | null;
          public_phone?: string | null;
          slug?: string;
          updated_at?: string;
          verification_status?: Database['public']['Enums']['verification_status'];
          verified_at?: string | null;
          verified_by?: string | null;
          website_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'organizer_profiles_city_id_fkey';
            columns: ['city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organizer_profiles_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
        ];
      };
      organizer_verification_requests: {
        Row: {
          created_at: string;
          document_paths: string[];
          id: string;
          legal_name: string;
          message: string | null;
          organizer_id: string;
          registration_number: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database['public']['Enums']['verification_status'];
          submitted_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          document_paths?: string[];
          id?: string;
          legal_name: string;
          message?: string | null;
          organizer_id: string;
          registration_number?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['verification_status'];
          submitted_by?: string | null;
        };
        Update: {
          created_at?: string;
          document_paths?: string[];
          id?: string;
          legal_name?: string;
          message?: string | null;
          organizer_id?: string;
          registration_number?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['verification_status'];
          submitted_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'organizer_verification_requests_organizer_id_fkey';
            columns: ['organizer_id'];
            isOneToOne: false;
            referencedRelation: 'organizer_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_references: {
        Row: {
          amount_minor: number;
          created_at: string;
          currency: string;
          environment: Database['public']['Enums']['commerce_environment'];
          external_ref: string;
          failure_code: string | null;
          id: string;
          order_id: string | null;
          provider: string;
          raw: NonNullable<Json>;
          resale_transaction_id: string | null;
          status: Database['public']['Enums']['payment_status'];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount_minor: number;
          created_at?: string;
          currency: string;
          environment: Database['public']['Enums']['commerce_environment'];
          external_ref: string;
          failure_code?: string | null;
          id?: string;
          order_id?: string | null;
          provider: string;
          raw?: NonNullable<Json>;
          resale_transaction_id?: string | null;
          status: Database['public']['Enums']['payment_status'];
          updated_at?: string;
        };
        Update: {
          amount_minor?: number;
          created_at?: string;
          currency?: string;
          environment?: Database['public']['Enums']['commerce_environment'];
          external_ref?: string;
          failure_code?: string | null;
          id?: string;
          order_id?: string | null;
          provider?: string;
          raw?: NonNullable<Json>;
          resale_transaction_id?: string | null;
          status?: Database['public']['Enums']['payment_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_references_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_references_resale_fk';
            columns: ['resale_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'resale_transactions';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          country_code: string | null;
          created_at: string;
          deleted_at: string | null;
          display_name: string;
          home_city_id: string | null;
          id: string;
          is_suspended: boolean;
          locale: string;
          onboarding_completed_at: string | null;
          suspended_at: string | null;
          suspended_reason: string | null;
          timezone: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_path?: string | null;
          country_code?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          display_name: string;
          home_city_id?: string | null;
          id: string;
          is_suspended?: boolean;
          locale?: string;
          onboarding_completed_at?: string | null;
          suspended_at?: string | null;
          suspended_reason?: string | null;
          timezone?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          country_code?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          display_name?: string;
          home_city_id?: string | null;
          id?: string;
          is_suspended?: boolean;
          locale?: string;
          onboarding_completed_at?: string | null;
          suspended_at?: string | null;
          suspended_reason?: string | null;
          timezone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'profiles_home_city_id_fkey';
            columns: ['home_city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
        ];
      };
      promotions: {
        Row: {
          agreement_id: string;
          code: string;
          created_at: string;
          created_by: string | null;
          description: NonNullable<Json>;
          discount_bps: number;
          ends_at: string | null;
          id: string;
          is_active: boolean;
          is_demo: boolean;
          max_discount_minor: number | null;
          max_redemptions: number | null;
          redemptions_count: number;
          starts_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          agreement_id: string;
          code: string;
          created_at?: string;
          created_by?: string | null;
          description?: NonNullable<Json>;
          discount_bps: number;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          is_demo?: boolean;
          max_discount_minor?: number | null;
          max_redemptions?: number | null;
          redemptions_count?: number;
          starts_at?: string | null;
        };
        Update: {
          agreement_id?: string;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          description?: NonNullable<Json>;
          discount_bps?: number;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          is_demo?: boolean;
          max_discount_minor?: number | null;
          max_redemptions?: number | null;
          redemptions_count?: number;
          starts_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'promotions_agreement_id_fkey';
            columns: ['agreement_id'];
            isOneToOne: false;
            referencedRelation: 'commercial_agreements';
            referencedColumns: ['id'];
          },
        ];
      };
      provider_events: {
        Row: {
          created_at: string;
          event_id: string | null;
          external_event_id: string;
          id: string;
          last_synced_at: string | null;
          payload: NonNullable<Json>;
          provider_id: string;
          sync_status: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          event_id?: string | null;
          external_event_id: string;
          id?: string;
          last_synced_at?: string | null;
          payload?: NonNullable<Json>;
          provider_id: string;
          sync_status?: string;
        };
        Update: {
          created_at?: string;
          event_id?: string | null;
          external_event_id?: string;
          id?: string;
          last_synced_at?: string | null;
          payload?: NonNullable<Json>;
          provider_id?: string;
          sync_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'provider_events_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'provider_events_provider_id_fkey';
            columns: ['provider_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_providers';
            referencedColumns: ['id'];
          },
        ];
      };
      rate_limits: {
        Row: {
          bucket: string;
          hits: number;
          window_start: string;
        };
        ComputedFields: never;
        Insert: {
          bucket: string;
          hits?: number;
          window_start: string;
        };
        Update: {
          bucket?: string;
          hits?: number;
          window_start?: string;
        };
        Relationships: [];
      };
      refunds: {
        Row: {
          amount_minor: number;
          created_at: string;
          currency: string;
          environment: Database['public']['Enums']['commerce_environment'];
          id: string;
          order_id: string | null;
          payment_reference_id: string | null;
          processed_at: string | null;
          provider_refund_ref: string | null;
          reason: string;
          requested_by: string | null;
          resale_transaction_id: string | null;
          status: Database['public']['Enums']['refund_status'];
        };
        ComputedFields: never;
        Insert: {
          amount_minor: number;
          created_at?: string;
          currency: string;
          environment: Database['public']['Enums']['commerce_environment'];
          id?: string;
          order_id?: string | null;
          payment_reference_id?: string | null;
          processed_at?: string | null;
          provider_refund_ref?: string | null;
          reason: string;
          requested_by?: string | null;
          resale_transaction_id?: string | null;
          status?: Database['public']['Enums']['refund_status'];
        };
        Update: {
          amount_minor?: number;
          created_at?: string;
          currency?: string;
          environment?: Database['public']['Enums']['commerce_environment'];
          id?: string;
          order_id?: string | null;
          payment_reference_id?: string | null;
          processed_at?: string | null;
          provider_refund_ref?: string | null;
          reason?: string;
          requested_by?: string | null;
          resale_transaction_id?: string | null;
          status?: Database['public']['Enums']['refund_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'refunds_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'refunds_payment_reference_id_fkey';
            columns: ['payment_reference_id'];
            isOneToOne: false;
            referencedRelation: 'payment_references';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'refunds_resale_fk';
            columns: ['resale_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'resale_transactions';
            referencedColumns: ['id'];
          },
        ];
      };
      regions: {
        Row: {
          code: string;
          country_code: string;
          created_at: string;
          id: string;
          names: NonNullable<Json>;
          parent_id: string | null;
          type: Database['public']['Enums']['region_type'];
        };
        ComputedFields: never;
        Insert: {
          code: string;
          country_code: string;
          created_at?: string;
          id?: string;
          names: NonNullable<Json>;
          parent_id?: string | null;
          type: Database['public']['Enums']['region_type'];
        };
        Update: {
          code?: string;
          country_code?: string;
          created_at?: string;
          id?: string;
          names?: NonNullable<Json>;
          parent_id?: string | null;
          type?: Database['public']['Enums']['region_type'];
        };
        Relationships: [
          {
            foreignKeyName: 'regions_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'regions_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'regions';
            referencedColumns: ['id'];
          },
        ];
      };
      resale_disputes: {
        Row: {
          created_at: string;
          details: string | null;
          id: string;
          opened_by: string | null;
          reason: string;
          resolution: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: Database['public']['Enums']['dispute_status'];
          transaction_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: string;
          opened_by?: string | null;
          reason: string;
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database['public']['Enums']['dispute_status'];
          transaction_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: string;
          opened_by?: string | null;
          reason?: string;
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database['public']['Enums']['dispute_status'];
          transaction_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'resale_disputes_transaction_id_fkey';
            columns: ['transaction_id'];
            isOneToOne: false;
            referencedRelation: 'resale_transactions';
            referencedColumns: ['id'];
          },
        ];
      };
      resale_listings: {
        Row: {
          asking_price_minor: number;
          buyer_fee_minor: number;
          cancelled_at: string | null;
          created_at: string;
          currency: string;
          environment: Database['public']['Enums']['commerce_environment'];
          event_id: string;
          id: string;
          max_allowed_price_minor: number;
          note: string | null;
          offer_id: string | null;
          original_price_minor: number;
          removed_reason: string | null;
          reserved_by: string | null;
          reserved_until: string | null;
          seller_fee_minor: number;
          seller_id: string | null;
          sold_at: string | null;
          status: Database['public']['Enums']['resale_listing_status'];
          ticket_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          asking_price_minor: number;
          buyer_fee_minor?: number;
          cancelled_at?: string | null;
          created_at?: string;
          currency: string;
          environment: Database['public']['Enums']['commerce_environment'];
          event_id: string;
          id?: string;
          max_allowed_price_minor: number;
          note?: string | null;
          offer_id?: string | null;
          original_price_minor: number;
          removed_reason?: string | null;
          reserved_by?: string | null;
          reserved_until?: string | null;
          seller_fee_minor?: number;
          seller_id?: string | null;
          sold_at?: string | null;
          status?: Database['public']['Enums']['resale_listing_status'];
          ticket_id: string;
          updated_at?: string;
        };
        Update: {
          asking_price_minor?: number;
          buyer_fee_minor?: number;
          cancelled_at?: string | null;
          created_at?: string;
          currency?: string;
          environment?: Database['public']['Enums']['commerce_environment'];
          event_id?: string;
          id?: string;
          max_allowed_price_minor?: number;
          note?: string | null;
          offer_id?: string | null;
          original_price_minor?: number;
          removed_reason?: string | null;
          reserved_by?: string | null;
          reserved_until?: string | null;
          seller_fee_minor?: number;
          seller_id?: string | null;
          sold_at?: string | null;
          status?: Database['public']['Enums']['resale_listing_status'];
          ticket_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'resale_listings_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'resale_listings_offer_id_fkey';
            columns: ['offer_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_offers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'resale_listings_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      resale_rules: {
        Row: {
          buyer_fee_bps: number;
          buyer_fee_fixed_minor: number;
          country_code: string | null;
          created_at: string;
          enabled: boolean;
          event_id: string | null;
          id: string;
          legal_status: string;
          listing_cutoff_hours: number;
          max_price_bps: number;
          min_price_bps: number;
          notes: string | null;
          organizer_id: string | null;
          seller_fee_bps: number;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          buyer_fee_bps?: number;
          buyer_fee_fixed_minor?: number;
          country_code?: string | null;
          created_at?: string;
          enabled?: boolean;
          event_id?: string | null;
          id?: string;
          legal_status?: string;
          listing_cutoff_hours?: number;
          max_price_bps?: number;
          min_price_bps?: number;
          notes?: string | null;
          organizer_id?: string | null;
          seller_fee_bps?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          buyer_fee_bps?: number;
          buyer_fee_fixed_minor?: number;
          country_code?: string | null;
          created_at?: string;
          enabled?: boolean;
          event_id?: string | null;
          id?: string;
          legal_status?: string;
          listing_cutoff_hours?: number;
          max_price_bps?: number;
          min_price_bps?: number;
          notes?: string | null;
          organizer_id?: string | null;
          seller_fee_bps?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'resale_rules_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'resale_rules_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'resale_rules_organizer_id_fkey';
            columns: ['organizer_id'];
            isOneToOne: false;
            referencedRelation: 'organizer_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      resale_transaction_events: {
        Row: {
          actor_id: string | null;
          created_at: string;
          from_status: Database['public']['Enums']['resale_tx_status'] | null;
          id: number;
          note: string | null;
          to_status: Database['public']['Enums']['resale_tx_status'];
          transaction_id: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          from_status?: Database['public']['Enums']['resale_tx_status'] | null;
          id?: never;
          note?: string | null;
          to_status: Database['public']['Enums']['resale_tx_status'];
          transaction_id: string;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          from_status?: Database['public']['Enums']['resale_tx_status'] | null;
          id?: never;
          note?: string | null;
          to_status?: Database['public']['Enums']['resale_tx_status'];
          transaction_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'resale_transaction_events_transaction_id_fkey';
            columns: ['transaction_id'];
            isOneToOne: false;
            referencedRelation: 'resale_transactions';
            referencedColumns: ['id'];
          },
        ];
      };
      resale_transactions: {
        Row: {
          buyer_fee_minor: number;
          buyer_id: string | null;
          completed_at: string | null;
          created_at: string;
          currency: string;
          environment: Database['public']['Enums']['commerce_environment'];
          expires_at: string;
          failure_reason: string | null;
          id: string;
          idempotency_key: string;
          listing_id: string;
          new_ticket_id: string | null;
          original_ticket_id: string;
          price_minor: number;
          seller_fee_minor: number;
          seller_id: string | null;
          seller_payout_minor: number;
          status: Database['public']['Enums']['resale_tx_status'];
          total_minor: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          buyer_fee_minor?: number;
          buyer_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          currency: string;
          environment: Database['public']['Enums']['commerce_environment'];
          expires_at: string;
          failure_reason?: string | null;
          id?: string;
          idempotency_key: string;
          listing_id: string;
          new_ticket_id?: string | null;
          original_ticket_id: string;
          price_minor: number;
          seller_fee_minor?: number;
          seller_id?: string | null;
          seller_payout_minor: number;
          status?: Database['public']['Enums']['resale_tx_status'];
          total_minor: number;
          updated_at?: string;
        };
        Update: {
          buyer_fee_minor?: number;
          buyer_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          currency?: string;
          environment?: Database['public']['Enums']['commerce_environment'];
          expires_at?: string;
          failure_reason?: string | null;
          id?: string;
          idempotency_key?: string;
          listing_id?: string;
          new_ticket_id?: string | null;
          original_ticket_id?: string;
          price_minor?: number;
          seller_fee_minor?: number;
          seller_id?: string | null;
          seller_payout_minor?: number;
          status?: Database['public']['Enums']['resale_tx_status'];
          total_minor?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'resale_transactions_listing_id_fkey';
            columns: ['listing_id'];
            isOneToOne: false;
            referencedRelation: 'resale_listings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'resale_transactions_new_ticket_id_fkey';
            columns: ['new_ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'resale_transactions_original_ticket_id_fkey';
            columns: ['original_ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      reservations: {
        Row: {
          created_at: string;
          currency: string;
          environment: Database['public']['Enums']['commerce_environment'];
          event_id: string;
          expires_at: string;
          id: string;
          idempotency_key: string;
          offer_id: string;
          pricing: NonNullable<Json>;
          promotion_id: string | null;
          provider_hold_ref: string;
          provider_id: string;
          quantity: number;
          status: Database['public']['Enums']['reservation_status'];
          total_minor: number;
          unit_face_value_minor: number;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          currency: string;
          environment: Database['public']['Enums']['commerce_environment'];
          event_id: string;
          expires_at: string;
          id?: string;
          idempotency_key: string;
          offer_id: string;
          pricing: NonNullable<Json>;
          promotion_id?: string | null;
          provider_hold_ref: string;
          provider_id: string;
          quantity: number;
          status?: Database['public']['Enums']['reservation_status'];
          total_minor: number;
          unit_face_value_minor: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          environment?: Database['public']['Enums']['commerce_environment'];
          event_id?: string;
          expires_at?: string;
          id?: string;
          idempotency_key?: string;
          offer_id?: string;
          pricing?: NonNullable<Json>;
          promotion_id?: string | null;
          provider_hold_ref?: string;
          provider_id?: string;
          quantity?: number;
          status?: Database['public']['Enums']['reservation_status'];
          total_minor?: number;
          unit_face_value_minor?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reservations_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_offer_id_fkey';
            columns: ['offer_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_offers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_promotion_id_fkey';
            columns: ['promotion_id'];
            isOneToOne: false;
            referencedRelation: 'promotions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_provider_id_fkey';
            columns: ['provider_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_providers';
            referencedColumns: ['id'];
          },
        ];
      };
      ticket_offers: {
        Row: {
          available_estimate: number | null;
          created_at: string;
          currency: string;
          description: string | null;
          environment: Database['public']['Enums']['commerce_environment'];
          event_id: string;
          external_offer_id: string;
          face_value_minor: number;
          id: string;
          max_per_order: number;
          min_per_order: number;
          name: string;
          provider_event_id: string | null;
          provider_fee_minor: number;
          provider_id: string;
          resale_allowed: boolean;
          sales_end_at: string | null;
          sales_start_at: string | null;
          sort_order: number;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          available_estimate?: number | null;
          created_at?: string;
          currency: string;
          description?: string | null;
          environment: Database['public']['Enums']['commerce_environment'];
          event_id: string;
          external_offer_id: string;
          face_value_minor: number;
          id?: string;
          max_per_order?: number;
          min_per_order?: number;
          name: string;
          provider_event_id?: string | null;
          provider_fee_minor?: number;
          provider_id: string;
          resale_allowed?: boolean;
          sales_end_at?: string | null;
          sales_start_at?: string | null;
          sort_order?: number;
          status?: string;
          updated_at?: string;
        };
        Update: {
          available_estimate?: number | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          environment?: Database['public']['Enums']['commerce_environment'];
          event_id?: string;
          external_offer_id?: string;
          face_value_minor?: number;
          id?: string;
          max_per_order?: number;
          min_per_order?: number;
          name?: string;
          provider_event_id?: string | null;
          provider_fee_minor?: number;
          provider_id?: string;
          resale_allowed?: boolean;
          sales_end_at?: string | null;
          sales_start_at?: string | null;
          sort_order?: number;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ticket_offers_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ticket_offers_provider_event_id_fkey';
            columns: ['provider_event_id'];
            isOneToOne: false;
            referencedRelation: 'provider_events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ticket_offers_provider_id_fkey';
            columns: ['provider_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_providers';
            referencedColumns: ['id'];
          },
        ];
      };
      ticket_providers: {
        Row: {
          contract_status: string;
          created_at: string;
          declared_capabilities: NonNullable<Json>;
          display_name: string;
          id: string;
          integration_notes: string | null;
          is_demo: boolean;
          kind: string;
          last_health_check_at: string | null;
          last_health_status: string | null;
          live_enabled: boolean;
          status: Database['public']['Enums']['provider_status'];
          supported_countries: string[];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          contract_status?: string;
          created_at?: string;
          declared_capabilities?: NonNullable<Json>;
          display_name: string;
          id: string;
          integration_notes?: string | null;
          is_demo?: boolean;
          kind: string;
          last_health_check_at?: string | null;
          last_health_status?: string | null;
          live_enabled?: boolean;
          status?: Database['public']['Enums']['provider_status'];
          supported_countries?: string[];
          updated_at?: string;
        };
        Update: {
          contract_status?: string;
          created_at?: string;
          declared_capabilities?: NonNullable<Json>;
          display_name?: string;
          id?: string;
          integration_notes?: string | null;
          is_demo?: boolean;
          kind?: string;
          last_health_check_at?: string | null;
          last_health_status?: string | null;
          live_enabled?: boolean;
          status?: Database['public']['Enums']['provider_status'];
          supported_countries?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      tickets: {
        Row: {
          barcode_format: string | null;
          barcode_value: string | null;
          created_at: string;
          currency: string;
          delivery_mode: string;
          environment: Database['public']['Enums']['commerce_environment'];
          event_id: string;
          holder_name: string | null;
          id: string;
          issued_at: string;
          offer_id: string | null;
          offline_allowed: boolean;
          order_id: string | null;
          order_item_id: string | null;
          original_price_minor: number;
          owner_id: string | null;
          provider_id: string;
          provider_ticket_ref: string;
          seat_label: string | null;
          source: string;
          status: Database['public']['Enums']['ticket_status'];
          transferred_from_ticket_id: string | null;
          transferred_to_ticket_id: string | null;
          voided_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          barcode_format?: string | null;
          barcode_value?: string | null;
          created_at?: string;
          currency: string;
          delivery_mode: string;
          environment: Database['public']['Enums']['commerce_environment'];
          event_id: string;
          holder_name?: string | null;
          id?: string;
          issued_at?: string;
          offer_id?: string | null;
          offline_allowed?: boolean;
          order_id?: string | null;
          order_item_id?: string | null;
          original_price_minor: number;
          owner_id?: string | null;
          provider_id: string;
          provider_ticket_ref: string;
          seat_label?: string | null;
          source?: string;
          status?: Database['public']['Enums']['ticket_status'];
          transferred_from_ticket_id?: string | null;
          transferred_to_ticket_id?: string | null;
          voided_at?: string | null;
        };
        Update: {
          barcode_format?: string | null;
          barcode_value?: string | null;
          created_at?: string;
          currency?: string;
          delivery_mode?: string;
          environment?: Database['public']['Enums']['commerce_environment'];
          event_id?: string;
          holder_name?: string | null;
          id?: string;
          issued_at?: string;
          offer_id?: string | null;
          offline_allowed?: boolean;
          order_id?: string | null;
          order_item_id?: string | null;
          original_price_minor?: number;
          owner_id?: string | null;
          provider_id?: string;
          provider_ticket_ref?: string;
          seat_label?: string | null;
          source?: string;
          status?: Database['public']['Enums']['ticket_status'];
          transferred_from_ticket_id?: string | null;
          transferred_to_ticket_id?: string | null;
          voided_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'tickets_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_offer_id_fkey';
            columns: ['offer_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_offers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_order_item_id_fkey';
            columns: ['order_item_id'];
            isOneToOne: false;
            referencedRelation: 'order_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_provider_id_fkey';
            columns: ['provider_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_providers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_transferred_from_ticket_id_fkey';
            columns: ['transferred_from_ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_transferred_to_ticket_id_fkey';
            columns: ['transferred_to_ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      user_category_interests: {
        Row: {
          category_slug: string;
          created_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          category_slug: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          category_slug?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_category_interests_category_slug_fkey';
            columns: ['category_slug'];
            isOneToOne: false;
            referencedRelation: 'event_categories';
            referencedColumns: ['slug'];
          },
        ];
      };
      user_followed_cities: {
        Row: {
          city_id: string;
          created_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          city_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          city_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_followed_cities_city_id_fkey';
            columns: ['city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
        ];
      };
      user_reports: {
        Row: {
          context_id: string | null;
          context_type: string;
          created_at: string;
          details: string | null;
          handled_at: string | null;
          handled_by: string | null;
          id: string;
          reason: Database['public']['Enums']['report_reason'];
          reported_user_id: string;
          reporter_id: string | null;
          resolution_note: string | null;
          status: Database['public']['Enums']['report_status'];
        };
        ComputedFields: never;
        Insert: {
          context_id?: string | null;
          context_type?: string;
          created_at?: string;
          details?: string | null;
          handled_at?: string | null;
          handled_by?: string | null;
          id?: string;
          reason: Database['public']['Enums']['report_reason'];
          reported_user_id: string;
          reporter_id?: string | null;
          resolution_note?: string | null;
          status?: Database['public']['Enums']['report_status'];
        };
        Update: {
          context_id?: string | null;
          context_type?: string;
          created_at?: string;
          details?: string | null;
          handled_at?: string | null;
          handled_by?: string | null;
          id?: string;
          reason?: Database['public']['Enums']['report_reason'];
          reported_user_id?: string;
          reporter_id?: string | null;
          resolution_note?: string | null;
          status?: Database['public']['Enums']['report_status'];
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          role: Database['public']['Enums']['app_role'];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          role: Database['public']['Enums']['app_role'];
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          role?: Database['public']['Enums']['app_role'];
          user_id?: string;
        };
        Relationships: [];
      };
      venue_media: {
        Row: {
          alt_text: string | null;
          created_at: string;
          credit: string | null;
          id: string;
          license: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          sort_order: number;
          status: Database['public']['Enums']['media_status'];
          storage_path: string;
          uploaded_by: string | null;
          venue_id: string;
        };
        ComputedFields: never;
        Insert: {
          alt_text?: string | null;
          created_at?: string;
          credit?: string | null;
          id?: string;
          license?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sort_order?: number;
          status?: Database['public']['Enums']['media_status'];
          storage_path: string;
          uploaded_by?: string | null;
          venue_id: string;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string;
          credit?: string | null;
          id?: string;
          license?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sort_order?: number;
          status?: Database['public']['Enums']['media_status'];
          storage_path?: string;
          uploaded_by?: string | null;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'venue_media_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
      venues: {
        Row: {
          accessibility: NonNullable<Json>;
          address_line1: string;
          address_line2: string | null;
          capacity: number | null;
          city_id: string;
          country_code: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          description: string | null;
          id: string;
          is_demo: boolean;
          lat: number;
          lng: number;
          location: unknown;
          name: string;
          phone: string | null;
          postal_code: string | null;
          practical_info: string | null;
          region_id: string | null;
          slug: string;
          status: string;
          timezone: string;
          updated_at: string;
          website_url: string | null;
        };
        ComputedFields: never;
        Insert: {
          accessibility?: NonNullable<Json>;
          address_line1: string;
          address_line2?: string | null;
          capacity?: number | null;
          city_id: string;
          country_code: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          is_demo?: boolean;
          lat: number;
          lng: number;
          location?: never;
          name: string;
          phone?: string | null;
          postal_code?: string | null;
          practical_info?: string | null;
          region_id?: string | null;
          slug: string;
          status?: string;
          timezone: string;
          updated_at?: string;
          website_url?: string | null;
        };
        Update: {
          accessibility?: NonNullable<Json>;
          address_line1?: string;
          address_line2?: string | null;
          capacity?: number | null;
          city_id?: string;
          country_code?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          is_demo?: boolean;
          lat?: number;
          lng?: number;
          location?: never;
          name?: string;
          phone?: string | null;
          postal_code?: string | null;
          practical_info?: string | null;
          region_id?: string | null;
          slug?: string;
          status?: string;
          timezone?: string;
          updated_at?: string;
          website_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'venues_city_id_fkey';
            columns: ['city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'venues_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'venues_region_id_fkey';
            columns: ['region_id'];
            isOneToOne: false;
            referencedRelation: 'regions';
            referencedColumns: ['id'];
          },
        ];
      };
      webhook_events: {
        Row: {
          error: string | null;
          event_type: string;
          external_event_id: string;
          id: string;
          payload: NonNullable<Json>;
          processed_at: string | null;
          provider: string;
          received_at: string;
          signature_valid: boolean;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          error?: string | null;
          event_type: string;
          external_event_id: string;
          id?: string;
          payload: NonNullable<Json>;
          processed_at?: string | null;
          provider: string;
          received_at?: string;
          signature_valid: boolean;
          status?: string;
        };
        Update: {
          error?: string | null;
          event_type?: string;
          external_event_id?: string;
          id?: string;
          payload?: NonNullable<Json>;
          processed_at?: string | null;
          provider?: string;
          received_at?: string;
          signature_valid?: boolean;
          status?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_organizer_invitation: {
        Args: { p_invitation_id: string };
        Returns: {
          created_at: string;
          invited_by: string | null;
          organizer_id: string;
          role: Database['public']['Enums']['organizer_member_role'];
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'organizer_members';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_handle_report: {
        Args: {
          p_kind: string;
          p_note: string;
          p_report_id: string;
          p_status: Database['public']['Enums']['report_status'];
        };
        Returns: undefined;
      };
      admin_list_users: {
        Args: { p_limit?: number; p_offset?: number; p_query?: string };
        Returns: {
          created_at: string;
          display_name: string;
          email: string;
          email_confirmed_at: string;
          id: string;
          is_suspended: boolean;
          last_sign_in_at: string;
          roles: Database['public']['Enums']['app_role'][];
          total_count: number;
        }[];
      };
      admin_platform_stats: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_remove_resale_listing: {
        Args: { p_listing_id: string; p_reason: string };
        Returns: undefined;
      };
      admin_review_event: {
        Args: { p_decision: string; p_event_id: string; p_note: string };
        Returns: {
          accessibility: NonNullable<Json>;
          address_line: string | null;
          age_min: number | null;
          cancellation_policy: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          capacity: number | null;
          category_slug: string;
          city_id: string;
          contact_email: string | null;
          contact_phone: string | null;
          country_code: string;
          cover_path: string | null;
          cover_status: Database['public']['Enums']['media_status'];
          created_at: string;
          created_by: string | null;
          currency: string | null;
          deleted_at: string | null;
          description: string | null;
          ends_at: string | null;
          entry_conditions: string | null;
          favorites_count: number;
          id: string;
          is_demo: boolean;
          is_free: boolean;
          is_online: boolean;
          is_sponsored: boolean;
          lat: number | null;
          lng: number | null;
          location: unknown;
          location_name: string | null;
          moderation_note: string | null;
          official_links: NonNullable<Json>;
          online_url: string | null;
          organizer_id: string;
          postal_code: string | null;
          price_max_minor: number | null;
          price_min_minor: number | null;
          published_at: string | null;
          region_id: string | null;
          registration_mode: Database['public']['Enums']['registration_mode'];
          registrations_count: number;
          reviewed_at: string | null;
          reviewed_by: string | null;
          search_document: string | null;
          search_vector: unknown;
          slug: string;
          starts_at: string;
          status: Database['public']['Enums']['event_status'];
          submitted_at: string | null;
          summary: string | null;
          tags: string[];
          timezone: string;
          title: string;
          updated_at: string;
          venue_id: string | null;
          views_count: number;
          visibility: Database['public']['Enums']['event_visibility'];
        };
        SetofOptions: {
          from: '*';
          to: 'events';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_review_media: {
        Args: { p_approve: boolean; p_id: string; p_kind: string; p_note: string };
        Returns: undefined;
      };
      admin_review_organizer: {
        Args: { p_decision: string; p_note: string; p_organizer_id: string };
        Returns: {
          bio: string | null;
          city_id: string | null;
          country_code: string;
          cover_path: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          is_demo: boolean;
          kind: Database['public']['Enums']['organizer_kind'];
          logo_path: string | null;
          name: string;
          public_email: string | null;
          public_phone: string | null;
          slug: string;
          updated_at: string;
          verification_status: Database['public']['Enums']['verification_status'];
          verified_at: string | null;
          verified_by: string | null;
          website_url: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'organizer_profiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_set_event_sponsored: {
        Args: { p_event_id: string; p_sponsored: boolean };
        Returns: undefined;
      };
      admin_set_role: {
        Args: {
          p_grant: boolean;
          p_role: Database['public']['Enums']['app_role'];
          p_user_id: string;
        };
        Returns: undefined;
      };
      admin_set_user_suspension: {
        Args: { p_reason: string; p_suspended: boolean; p_user_id: string };
        Returns: undefined;
      };
      admin_update_setting: {
        Args: { p_key: string; p_value: Json };
        Returns: {
          description: string | null;
          is_public: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        SetofOptions: {
          from: '*';
          to: 'app_settings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      agenda_events: {
        Args: {
          p_categories?: string[];
          p_city_id?: string;
          p_country?: string;
          p_free?: boolean;
          p_from: string;
          p_limit?: number;
          p_query?: string;
          p_to: string;
        };
        Returns: {
          category_slug: string;
          city_id: string;
          city_names: Json;
          country_code: string;
          ends_at: string;
          event_id: string;
          is_demo: boolean;
          is_free: boolean;
          session_id: string;
          slug: string;
          starts_at: string;
          status: Database['public']['Enums']['event_status'];
          timezone: string;
          title: string;
          venue_name: string;
        }[];
      };
      assert_admin: { Args: Record<PropertyKey, never>; Returns: undefined };
      assert_offer_sellable: {
        Args: {
          p_offer: Omit<
            Database['public']['Tables']['ticket_offers']['Row'],
            Database['public']['Tables']['ticket_offers']['ComputedFields']
          >;
          p_quantity: number;
        };
        Returns: {
          accessibility: NonNullable<Json>;
          address_line: string | null;
          age_min: number | null;
          cancellation_policy: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          capacity: number | null;
          category_slug: string;
          city_id: string;
          contact_email: string | null;
          contact_phone: string | null;
          country_code: string;
          cover_path: string | null;
          cover_status: Database['public']['Enums']['media_status'];
          created_at: string;
          created_by: string | null;
          currency: string | null;
          deleted_at: string | null;
          description: string | null;
          ends_at: string | null;
          entry_conditions: string | null;
          favorites_count: number;
          id: string;
          is_demo: boolean;
          is_free: boolean;
          is_online: boolean;
          is_sponsored: boolean;
          lat: number | null;
          lng: number | null;
          location: unknown;
          location_name: string | null;
          moderation_note: string | null;
          official_links: NonNullable<Json>;
          online_url: string | null;
          organizer_id: string;
          postal_code: string | null;
          price_max_minor: number | null;
          price_min_minor: number | null;
          published_at: string | null;
          region_id: string | null;
          registration_mode: Database['public']['Enums']['registration_mode'];
          registrations_count: number;
          reviewed_at: string | null;
          reviewed_by: string | null;
          search_document: string | null;
          search_vector: unknown;
          slug: string;
          starts_at: string;
          status: Database['public']['Enums']['event_status'];
          submitted_at: string | null;
          summary: string | null;
          tags: string[];
          timezone: string;
          title: string;
          updated_at: string;
          venue_id: string | null;
          views_count: number;
          visibility: Database['public']['Enums']['event_visibility'];
        };
        SetofOptions: {
          from: '*';
          to: 'events';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      assert_staff: { Args: Record<PropertyKey, never>; Returns: undefined };
      beta_redeem_invitation: { Args: { p_code_hash: string; p_user_id: string }; Returns: Json };
      beta_stats: { Args: Record<PropertyKey, never>; Returns: Json };
      bps_of: { Args: { p_amount: number; p_bps: number }; Returns: number };
      build_prefix_tsquery: { Args: { p_text: string }; Returns: unknown };
      can_manage_event: { Args: { p_event_id: string }; Returns: boolean };
      cancel_event_registration: {
        Args: { p_event_id: string };
        Returns: {
          cancelled_at: string | null;
          created_at: string;
          event_id: string;
          id: string;
          quantity: number;
          status: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'event_registrations';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      checkout_create_order: {
        Args: {
          p_buyer_email: string;
          p_buyer_name: string;
          p_idempotency_key: string;
          p_payment_provider: string;
          p_reservation_id: string;
          p_user_id: string;
        };
        Returns: {
          buyer_email: string | null;
          buyer_name: string | null;
          cancelled_at: string | null;
          created_at: string;
          currency: string;
          discount_minor: number;
          environment: Database['public']['Enums']['commerce_environment'];
          event_id: string;
          expires_at: string;
          failure_reason: string | null;
          fulfilled_at: string | null;
          id: string;
          idempotency_key: string;
          order_number: string;
          paid_at: string | null;
          payment_provider: string;
          pricing: NonNullable<Json>;
          promotion_id: string | null;
          provider_fees_minor: number;
          provider_id: string;
          provider_order_ref: string | null;
          refunded_at: string | null;
          reservation_id: string;
          service_fees_minor: number;
          status: Database['public']['Enums']['order_status'];
          subtotal_minor: number;
          tax_added_minor: number;
          tax_included_minor: number;
          total_minor: number;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'orders';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      checkout_create_reservation: {
        Args: {
          p_expires_at: string;
          p_idempotency_key: string;
          p_offer_id: string;
          p_pricing: Json;
          p_promotion_id?: string;
          p_provider_hold_ref: string;
          p_quantity: number;
          p_user_id: string;
        };
        Returns: {
          created_at: string;
          currency: string;
          environment: Database['public']['Enums']['commerce_environment'];
          event_id: string;
          expires_at: string;
          id: string;
          idempotency_key: string;
          offer_id: string;
          pricing: NonNullable<Json>;
          promotion_id: string | null;
          provider_hold_ref: string;
          provider_id: string;
          quantity: number;
          status: Database['public']['Enums']['reservation_status'];
          total_minor: number;
          unit_face_value_minor: number;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'reservations';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      checkout_fail_order: {
        Args: {
          p_order_id: string;
          p_reason: string;
          p_status: Database['public']['Enums']['order_status'];
        };
        Returns: {
          buyer_email: string | null;
          buyer_name: string | null;
          cancelled_at: string | null;
          created_at: string;
          currency: string;
          discount_minor: number;
          environment: Database['public']['Enums']['commerce_environment'];
          event_id: string;
          expires_at: string;
          failure_reason: string | null;
          fulfilled_at: string | null;
          id: string;
          idempotency_key: string;
          order_number: string;
          paid_at: string | null;
          payment_provider: string;
          pricing: NonNullable<Json>;
          promotion_id: string | null;
          provider_fees_minor: number;
          provider_id: string;
          provider_order_ref: string | null;
          refunded_at: string | null;
          reservation_id: string;
          service_fees_minor: number;
          status: Database['public']['Enums']['order_status'];
          subtotal_minor: number;
          tax_added_minor: number;
          tax_included_minor: number;
          total_minor: number;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'orders';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      checkout_fulfill_order: {
        Args: { p_order_id: string; p_provider_order_ref: string; p_tickets: Json };
        Returns: {
          buyer_email: string | null;
          buyer_name: string | null;
          cancelled_at: string | null;
          created_at: string;
          currency: string;
          discount_minor: number;
          environment: Database['public']['Enums']['commerce_environment'];
          event_id: string;
          expires_at: string;
          failure_reason: string | null;
          fulfilled_at: string | null;
          id: string;
          idempotency_key: string;
          order_number: string;
          paid_at: string | null;
          payment_provider: string;
          pricing: NonNullable<Json>;
          promotion_id: string | null;
          provider_fees_minor: number;
          provider_id: string;
          provider_order_ref: string | null;
          refunded_at: string | null;
          reservation_id: string;
          service_fees_minor: number;
          status: Database['public']['Enums']['order_status'];
          subtotal_minor: number;
          tax_added_minor: number;
          tax_included_minor: number;
          total_minor: number;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'orders';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      checkout_record_payment: {
        Args: {
          p_amount_minor: number;
          p_currency: string;
          p_external_ref: string;
          p_failure_code?: string;
          p_order_id: string;
          p_provider: string;
          p_raw?: Json;
          p_status: Database['public']['Enums']['payment_status'];
        };
        Returns: {
          buyer_email: string | null;
          buyer_name: string | null;
          cancelled_at: string | null;
          created_at: string;
          currency: string;
          discount_minor: number;
          environment: Database['public']['Enums']['commerce_environment'];
          event_id: string;
          expires_at: string;
          failure_reason: string | null;
          fulfilled_at: string | null;
          id: string;
          idempotency_key: string;
          order_number: string;
          paid_at: string | null;
          payment_provider: string;
          pricing: NonNullable<Json>;
          promotion_id: string | null;
          provider_fees_minor: number;
          provider_id: string;
          provider_order_ref: string | null;
          refunded_at: string | null;
          reservation_id: string;
          service_fees_minor: number;
          status: Database['public']['Enums']['order_status'];
          subtotal_minor: number;
          tax_added_minor: number;
          tax_included_minor: number;
          total_minor: number;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'orders';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      checkout_record_refund: {
        Args: {
          p_amount_minor: number;
          p_order_id: string;
          p_provider_refund_ref: string;
          p_reason: string;
          p_requested_by: string;
          p_status: Database['public']['Enums']['refund_status'];
        };
        Returns: {
          amount_minor: number;
          created_at: string;
          currency: string;
          environment: Database['public']['Enums']['commerce_environment'];
          id: string;
          order_id: string | null;
          payment_reference_id: string | null;
          processed_at: string | null;
          provider_refund_ref: string | null;
          reason: string;
          requested_by: string | null;
          resale_transaction_id: string | null;
          status: Database['public']['Enums']['refund_status'];
        };
        SetofOptions: {
          from: '*';
          to: 'refunds';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      checkout_release_reservation: {
        Args: { p_reservation_id: string; p_user_id: string };
        Returns: {
          created_at: string;
          currency: string;
          environment: Database['public']['Enums']['commerce_environment'];
          event_id: string;
          expires_at: string;
          id: string;
          idempotency_key: string;
          offer_id: string;
          pricing: NonNullable<Json>;
          promotion_id: string | null;
          provider_hold_ref: string;
          provider_id: string;
          quantity: number;
          status: Database['public']['Enums']['reservation_status'];
          total_minor: number;
          unit_face_value_minor: number;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'reservations';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      commerce_live_allowed: {
        Args: { p_country_code: string; p_provider_id: string };
        Returns: boolean;
      };
      demo_provider_availability: { Args: { p_offer_ref: string }; Returns: Json };
      demo_provider_confirm_hold: {
        Args: { p_hold_ref: string; p_holder_ref?: string };
        Returns: Json;
      };
      demo_provider_create_hold: {
        Args: {
          p_client_key?: string;
          p_offer_ref: string;
          p_quantity: number;
          p_ttl_seconds: number;
        };
        Returns: Json;
      };
      demo_provider_get_order: { Args: { p_order_ref: string }; Returns: Json };
      demo_provider_list_offers: { Args: { p_event_ref: string }; Returns: Json };
      demo_provider_refund_order: { Args: { p_order_ref: string }; Returns: Json };
      demo_provider_release_expired: { Args: { p_offer_ref?: string }; Returns: number };
      demo_provider_release_hold: { Args: { p_hold_ref: string }; Returns: Json };
      demo_provider_transfer_ticket: {
        Args: { p_new_holder_ref: string; p_ticket_ref: string };
        Returns: Json;
      };
      demo_provider_upsert_inventory: {
        Args: {
          p_booking_fee_minor: number;
          p_capacity: number;
          p_currency: string;
          p_event_ref: string;
          p_face_value_minor: number;
          p_label: string;
          p_max_per_order?: number;
          p_offer_ref: string;
          p_transferable?: boolean;
        };
        Returns: Json;
      };
      demo_provider_verify_ownership: {
        Args: { p_holder_ref: string; p_ticket_ref: string };
        Returns: boolean;
      };
      demo_reset_data: { Args: Record<PropertyKey, never>; Returns: Json };
      event_audience: {
        Args: { p_event_id: string };
        Returns: {
          user_id: string;
        }[];
      };
      event_organizer_id: { Args: { p_event_id: string }; Returns: string };
      event_search_document: {
        Args: {
          p_event: Omit<
            Database['public']['Tables']['events']['Row'],
            Database['public']['Tables']['events']['ComputedFields']
          >;
        };
        Returns: string;
      };
      find_promotion: {
        Args: { p_agreement_id: string; p_code: string };
        Returns: {
          agreement_id: string;
          code: string;
          created_at: string;
          created_by: string | null;
          description: NonNullable<Json>;
          discount_bps: number;
          ends_at: string | null;
          id: string;
          is_active: boolean;
          is_demo: boolean;
          max_discount_minor: number | null;
          max_redemptions: number | null;
          redemptions_count: number;
          starts_at: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'promotions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      generate_order_number: {
        Args: { p_environment: Database['public']['Enums']['commerce_environment'] };
        Returns: string;
      };
      get_public_settings: { Args: Record<PropertyKey, never>; Returns: Json };
      has_app_access: { Args: Record<PropertyKey, never>; Returns: boolean };
      has_organizer_permission: {
        Args: { p_organizer_id: string; p_permission: string };
        Returns: boolean;
      };
      has_role: { Args: { p_role: Database['public']['Enums']['app_role'] }; Returns: boolean };
      idempotency_abort: {
        Args: { p_key: string; p_scope: string; p_user_id: string };
        Returns: undefined;
      };
      idempotency_begin: {
        Args: { p_key: string; p_request_hash: string; p_scope: string; p_user_id: string };
        Returns: Json;
      };
      idempotency_complete: {
        Args: { p_body: Json; p_key: string; p_scope: string; p_status: number; p_user_id: string };
        Returns: undefined;
      };
      immutable_unaccent: { Args: { input: string }; Returns: string };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_organizer_member: { Args: { p_organizer_id: string }; Returns: boolean };
      is_service_context: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_staff: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_suspended_user: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_valid_slug: { Args: { value: string }; Returns: boolean };
      is_valid_timezone: { Args: { tz: string }; Returns: boolean };
      log_moderation: {
        Args: {
          p_action: string;
          p_metadata?: Json;
          p_reason: string;
          p_target_id: string;
          p_target_type: Database['public']['Enums']['moderation_target'];
        };
        Returns: undefined;
      };
      maintenance_archive_events: { Args: Record<PropertyKey, never>; Returns: number };
      maintenance_cleanup: { Args: Record<PropertyKey, never>; Returns: Json };
      maintenance_expire_commerce: { Args: Record<PropertyKey, never>; Returns: Json };
      maintenance_queue_reminders: { Args: Record<PropertyKey, never>; Returns: number };
      make_geo_point: { Args: { lat: number; lng: number }; Returns: unknown };
      map_events: {
        Args: {
          p_categories?: string[];
          p_free?: boolean;
          p_from?: string;
          p_limit?: number;
          p_max_lat: number;
          p_max_lng: number;
          p_min_lat: number;
          p_min_lng: number;
          p_to?: string;
        };
        Returns: {
          category_slug: string;
          id: string;
          is_demo: boolean;
          is_free: boolean;
          lat: number;
          lng: number;
          slug: string;
          starts_at: string;
          timezone: string;
          title: string;
        }[];
      };
      my_agenda: {
        Args: { p_from: string; p_to: string };
        Returns: {
          category_slug: string;
          city_names: Json;
          ends_at: string;
          event_id: string;
          is_demo: boolean;
          is_favorite: boolean;
          is_registered: boolean;
          slug: string;
          starts_at: string;
          status: Database['public']['Enums']['event_status'];
          tickets_count: number;
          timezone: string;
          title: string;
          venue_name: string;
        }[];
      };
      my_sessions: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          id: string;
          is_current: boolean;
          updated_at: string;
          user_agent: string;
        }[];
      };
      nearby_cities: {
        Args: { p_lat: number; p_limit?: number; p_lng: number };
        Returns: {
          country_code: string;
          distance_km: number;
          id: string;
          names: Json;
          slug: string;
          timezone: string;
        }[];
      };
      notification_is_essential: { Args: { p_type: string }; Returns: boolean };
      notify_user: {
        Args: {
          p_body?: string;
          p_data: Json;
          p_dedupe_key: string;
          p_is_demo?: boolean;
          p_link: string;
          p_title?: string;
          p_type: string;
          p_user_id: string;
        };
        Returns: string;
      };
      organizer_dashboard: { Args: { p_organizer_id: string }; Returns: Json };
      organizer_event_stats: { Args: { p_event_id: string }; Returns: Json };
      organizer_role_has_permission: {
        Args: {
          p_permission: string;
          p_role: Database['public']['Enums']['organizer_member_role'];
        };
        Returns: boolean;
      };
      pricing_is_consistent: {
        Args: {
          p_offer: Omit<
            Database['public']['Tables']['ticket_offers']['Row'],
            Database['public']['Tables']['ticket_offers']['ComputedFields']
          >;
          p_pricing: Json;
          p_quantity: number;
        };
        Returns: boolean;
      };
      public_resale_listings: {
        Args: { p_event_id?: string; p_limit?: number; p_offset?: number };
        Returns: {
          asking_price_minor: number;
          buyer_fee_minor: number;
          city_names: Json;
          created_at: string;
          currency: string;
          environment: Database['public']['Enums']['commerce_environment'];
          event_id: string;
          event_slug: string;
          event_starts_at: string;
          event_timezone: string;
          event_title: string;
          id: string;
          note: string;
          offer_name: string;
          original_price_minor: number;
          seller_alias: string;
          seller_completed_sales: number;
          total_count: number;
        }[];
      };
      rate_limit_hit: {
        Args: { p_bucket: string; p_limit: number; p_window_seconds: number };
        Returns: Json;
      };
      register_for_event: {
        Args: { p_event_id: string; p_quantity?: number };
        Returns: {
          cancelled_at: string | null;
          created_at: string;
          event_id: string;
          id: string;
          quantity: number;
          status: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'event_registrations';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      report_resale_listing: {
        Args: {
          p_details: string;
          p_listing_id: string;
          p_reason: Database['public']['Enums']['report_reason'];
        };
        Returns: string;
      };
      resale_cancel_listing: {
        Args: { p_listing_id: string; p_seller_id: string };
        Returns: {
          asking_price_minor: number;
          buyer_fee_minor: number;
          cancelled_at: string | null;
          created_at: string;
          currency: string;
          environment: Database['public']['Enums']['commerce_environment'];
          event_id: string;
          id: string;
          max_allowed_price_minor: number;
          note: string | null;
          offer_id: string | null;
          original_price_minor: number;
          removed_reason: string | null;
          reserved_by: string | null;
          reserved_until: string | null;
          seller_fee_minor: number;
          seller_id: string | null;
          sold_at: string | null;
          status: Database['public']['Enums']['resale_listing_status'];
          ticket_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'resale_listings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      resale_complete_transfer: {
        Args: { p_new_provider_ticket_ref: string; p_tx_id: string };
        Returns: {
          buyer_fee_minor: number;
          buyer_id: string | null;
          completed_at: string | null;
          created_at: string;
          currency: string;
          environment: Database['public']['Enums']['commerce_environment'];
          expires_at: string;
          failure_reason: string | null;
          id: string;
          idempotency_key: string;
          listing_id: string;
          new_ticket_id: string | null;
          original_ticket_id: string;
          price_minor: number;
          seller_fee_minor: number;
          seller_id: string | null;
          seller_payout_minor: number;
          status: Database['public']['Enums']['resale_tx_status'];
          total_minor: number;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'resale_transactions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      resale_create_listing: {
        Args: {
          p_asking_price_minor: number;
          p_note: string;
          p_seller_id: string;
          p_ticket_id: string;
        };
        Returns: {
          asking_price_minor: number;
          buyer_fee_minor: number;
          cancelled_at: string | null;
          created_at: string;
          currency: string;
          environment: Database['public']['Enums']['commerce_environment'];
          event_id: string;
          id: string;
          max_allowed_price_minor: number;
          note: string | null;
          offer_id: string | null;
          original_price_minor: number;
          removed_reason: string | null;
          reserved_by: string | null;
          reserved_until: string | null;
          seller_fee_minor: number;
          seller_id: string | null;
          sold_at: string | null;
          status: Database['public']['Enums']['resale_listing_status'];
          ticket_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'resale_listings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      resale_effective_rule: {
        Args: { p_event_id: string };
        Returns: {
          buyer_fee_bps: number;
          buyer_fee_fixed_minor: number;
          country_code: string | null;
          created_at: string;
          enabled: boolean;
          event_id: string | null;
          id: string;
          legal_status: string;
          listing_cutoff_hours: number;
          max_price_bps: number;
          min_price_bps: number;
          notes: string | null;
          organizer_id: string | null;
          seller_fee_bps: number;
          updated_at: string;
          updated_by: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'resale_rules';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      resale_fail_transaction: {
        Args: {
          p_reason: string;
          p_status: Database['public']['Enums']['resale_tx_status'];
          p_tx_id: string;
        };
        Returns: {
          buyer_fee_minor: number;
          buyer_id: string | null;
          completed_at: string | null;
          created_at: string;
          currency: string;
          environment: Database['public']['Enums']['commerce_environment'];
          expires_at: string;
          failure_reason: string | null;
          id: string;
          idempotency_key: string;
          listing_id: string;
          new_ticket_id: string | null;
          original_ticket_id: string;
          price_minor: number;
          seller_fee_minor: number;
          seller_id: string | null;
          seller_payout_minor: number;
          status: Database['public']['Enums']['resale_tx_status'];
          total_minor: number;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'resale_transactions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      resale_live_allowed: {
        Args: { p_country_code: string; p_provider_id: string };
        Returns: boolean;
      };
      resale_open_dispute: {
        Args: { p_details: string; p_reason: string; p_tx_id: string; p_user_id: string };
        Returns: {
          created_at: string;
          details: string | null;
          id: string;
          opened_by: string | null;
          reason: string;
          resolution: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: Database['public']['Enums']['dispute_status'];
          transaction_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'resale_disputes';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      resale_quote: { Args: { p_asking_price_minor?: number; p_ticket_id: string }; Returns: Json };
      resale_record_payment: {
        Args: {
          p_amount_minor: number;
          p_currency: string;
          p_external_ref: string;
          p_failure_code?: string;
          p_provider: string;
          p_raw?: Json;
          p_status: Database['public']['Enums']['payment_status'];
          p_tx_id: string;
        };
        Returns: {
          buyer_fee_minor: number;
          buyer_id: string | null;
          completed_at: string | null;
          created_at: string;
          currency: string;
          environment: Database['public']['Enums']['commerce_environment'];
          expires_at: string;
          failure_reason: string | null;
          id: string;
          idempotency_key: string;
          listing_id: string;
          new_ticket_id: string | null;
          original_ticket_id: string;
          price_minor: number;
          seller_fee_minor: number;
          seller_id: string | null;
          seller_payout_minor: number;
          status: Database['public']['Enums']['resale_tx_status'];
          total_minor: number;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'resale_transactions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      resale_start_purchase: {
        Args: {
          p_buyer_id: string;
          p_idempotency_key: string;
          p_listing_id: string;
          p_ttl_seconds?: number;
        };
        Returns: {
          buyer_fee_minor: number;
          buyer_id: string | null;
          completed_at: string | null;
          created_at: string;
          currency: string;
          environment: Database['public']['Enums']['commerce_environment'];
          expires_at: string;
          failure_reason: string | null;
          id: string;
          idempotency_key: string;
          listing_id: string;
          new_ticket_id: string | null;
          original_ticket_id: string;
          price_minor: number;
          seller_fee_minor: number;
          seller_id: string | null;
          seller_payout_minor: number;
          status: Database['public']['Enums']['resale_tx_status'];
          total_minor: number;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'resale_transactions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      resale_tx_transition_allowed: {
        Args: {
          p_from: Database['public']['Enums']['resale_tx_status'];
          p_to: Database['public']['Enums']['resale_tx_status'];
        };
        Returns: boolean;
      };
      resolve_commercial_agreement: {
        Args: { p_event_id: string; p_provider_id: string };
        Returns: {
          catalog_discount_bps: number;
          commission_bps: number;
          country_code: string | null;
          created_at: string;
          created_by: string | null;
          customer_service_fee_bps: number;
          customer_service_fee_fixed_minor: number;
          event_id: string | null;
          fee_share_bps: number;
          id: string;
          model: Database['public']['Enums']['agreement_model'];
          notes: string | null;
          organizer_id: string | null;
          promo_funding_allowed: boolean;
          promo_max_bps: number;
          provider_id: string;
          status: Database['public']['Enums']['agreement_status'];
          updated_at: string;
          valid_from: string | null;
          valid_to: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'commercial_agreements';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      search_events: {
        Args: {
          p_artist_id?: string;
          p_categories?: string[];
          p_city_id?: string;
          p_country?: string;
          p_free?: boolean;
          p_from?: string;
          p_include_past?: boolean;
          p_lat?: number;
          p_limit?: number;
          p_lng?: number;
          p_offset?: number;
          p_organizer_id?: string;
          p_query?: string;
          p_radius_km?: number;
          p_sort?: string;
          p_to?: string;
          p_venue_id?: string;
        };
        Returns: {
          category_slug: string;
          city_id: string;
          city_names: Json;
          city_slug: string;
          country_code: string;
          cover_path: string;
          currency: string;
          distance_km: number;
          ends_at: string;
          favorites_count: number;
          id: string;
          is_demo: boolean;
          is_free: boolean;
          is_sponsored: boolean;
          lat: number;
          lng: number;
          location_name: string;
          organizer_id: string;
          organizer_name: string;
          organizer_slug: string;
          organizer_verified: boolean;
          price_max_minor: number;
          price_min_minor: number;
          rank: number;
          registration_mode: Database['public']['Enums']['registration_mode'];
          slug: string;
          starts_at: string;
          status: Database['public']['Enums']['event_status'];
          summary: string;
          timezone: string;
          title: string;
          total_count: number;
          venue_id: string;
          venue_name: string;
          venue_slug: string;
        }[];
      };
      search_normalize: { Args: { input: string }; Returns: string };
      track_event_interaction: { Args: { p_event_id: string; p_kind: string }; Returns: undefined };
      try_uuid: { Args: { p_value: string }; Returns: string };
    };
    Enums: {
      agreement_model: 'distribution_commission' | 'fee_share' | 'catalog_discount';
      agreement_status: 'draft' | 'simulation' | 'active' | 'expired';
      app_role: 'organizer' | 'moderator' | 'admin' | 'beta_tester';
      beta_waitlist_status:
        | 'pending_verification'
        | 'verified'
        | 'invited'
        | 'accepted'
        | 'declined'
        | 'removed';
      commerce_environment: 'demo' | 'live';
      dispute_status: 'open' | 'investigating' | 'resolved_buyer' | 'resolved_seller' | 'closed';
      event_status:
        | 'draft'
        | 'pending_review'
        | 'published'
        | 'rejected'
        | 'cancelled'
        | 'archived';
      event_visibility: 'public' | 'unlisted' | 'private';
      feedback_kind: 'bug' | 'suggestion' | 'rating';
      feedback_status: 'new' | 'triaged' | 'planned' | 'done' | 'wont_fix';
      media_status: 'pending' | 'approved' | 'rejected';
      moderation_target:
        | 'event'
        | 'organizer'
        | 'user'
        | 'venue'
        | 'artist'
        | 'media'
        | 'resale_listing'
        | 'resale_transaction'
        | 'beta_feedback'
        | 'report';
      order_status:
        | 'pending_payment'
        | 'paid'
        | 'fulfilled'
        | 'payment_failed'
        | 'cancelled'
        | 'refunded'
        | 'expired';
      organizer_kind: 'individual' | 'association' | 'professional';
      organizer_member_role: 'owner' | 'admin' | 'editor' | 'analyst';
      outbox_status: 'pending' | 'sent' | 'failed' | 'skipped';
      payment_status: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded';
      provider_status: 'disabled' | 'demo' | 'sandbox' | 'live';
      refund_status: 'requested' | 'processing' | 'succeeded' | 'failed' | 'rejected';
      region_type:
        | 'region'
        | 'department'
        | 'wilaya'
        | 'state'
        | 'province'
        | 'territory'
        | 'other';
      registration_mode: 'none' | 'free_registration' | 'tickets';
      report_reason:
        | 'fake_event'
        | 'scam'
        | 'inappropriate'
        | 'wrong_information'
        | 'duplicate'
        | 'cancelled_not_updated'
        | 'counterfeit_ticket'
        | 'price_abuse'
        | 'harassment'
        | 'spam'
        | 'other';
      report_status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
      resale_listing_status: 'active' | 'reserved' | 'sold' | 'cancelled' | 'expired' | 'removed';
      resale_tx_status:
        | 'initiated'
        | 'payment_pending'
        | 'paid'
        | 'transfer_pending'
        | 'completed'
        | 'failed'
        | 'cancelled'
        | 'refunded'
        | 'disputed';
      reservation_status: 'active' | 'converted' | 'expired' | 'released' | 'failed';
      ticket_status: 'issued' | 'void' | 'transferred' | 'refunded' | 'used';
      verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      agreement_model: ['distribution_commission', 'fee_share', 'catalog_discount'],
      agreement_status: ['draft', 'simulation', 'active', 'expired'],
      app_role: ['organizer', 'moderator', 'admin', 'beta_tester'],
      beta_waitlist_status: [
        'pending_verification',
        'verified',
        'invited',
        'accepted',
        'declined',
        'removed',
      ],
      commerce_environment: ['demo', 'live'],
      dispute_status: ['open', 'investigating', 'resolved_buyer', 'resolved_seller', 'closed'],
      event_status: ['draft', 'pending_review', 'published', 'rejected', 'cancelled', 'archived'],
      event_visibility: ['public', 'unlisted', 'private'],
      feedback_kind: ['bug', 'suggestion', 'rating'],
      feedback_status: ['new', 'triaged', 'planned', 'done', 'wont_fix'],
      media_status: ['pending', 'approved', 'rejected'],
      moderation_target: [
        'event',
        'organizer',
        'user',
        'venue',
        'artist',
        'media',
        'resale_listing',
        'resale_transaction',
        'beta_feedback',
        'report',
      ],
      order_status: [
        'pending_payment',
        'paid',
        'fulfilled',
        'payment_failed',
        'cancelled',
        'refunded',
        'expired',
      ],
      organizer_kind: ['individual', 'association', 'professional'],
      organizer_member_role: ['owner', 'admin', 'editor', 'analyst'],
      outbox_status: ['pending', 'sent', 'failed', 'skipped'],
      payment_status: ['pending', 'succeeded', 'failed', 'refunded', 'partially_refunded'],
      provider_status: ['disabled', 'demo', 'sandbox', 'live'],
      refund_status: ['requested', 'processing', 'succeeded', 'failed', 'rejected'],
      region_type: ['region', 'department', 'wilaya', 'state', 'province', 'territory', 'other'],
      registration_mode: ['none', 'free_registration', 'tickets'],
      report_reason: [
        'fake_event',
        'scam',
        'inappropriate',
        'wrong_information',
        'duplicate',
        'cancelled_not_updated',
        'counterfeit_ticket',
        'price_abuse',
        'harassment',
        'spam',
        'other',
      ],
      report_status: ['open', 'reviewing', 'resolved', 'dismissed'],
      resale_listing_status: ['active', 'reserved', 'sold', 'cancelled', 'expired', 'removed'],
      resale_tx_status: [
        'initiated',
        'payment_pending',
        'paid',
        'transfer_pending',
        'completed',
        'failed',
        'cancelled',
        'refunded',
        'disputed',
      ],
      reservation_status: ['active', 'converted', 'expired', 'released', 'failed'],
      ticket_status: ['issued', 'void', 'transferred', 'refunded', 'used'],
      verification_status: ['unverified', 'pending', 'verified', 'rejected'],
    },
  },
} as const;
