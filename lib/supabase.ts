import { createClient } from "@supabase/supabase-js";

export type RoomRow = {
  id: string;
  name: string;
  short_name: string;
  rate: number;
  sleeps: string;
  outlook: string;
  available_count: number;
  summary: string;
  amenities: string[];
  tone: "courtyard" | "garden" | "veranda" | "attic";
  image_url: string | null;
  gallery_urls: string[];
  sort_order: number;
  ical_export_token: string | null;
  updated_at: string;
};

export type BookingRequestRow = {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  room_id: string;
  room_name: string;
  arrival_date: string;
  departure_date: string;
  nights: number;
  estimated_total: number;
  note: string | null;
  staff_note: string | null;
  stay_status: "expected" | "checked-in" | "checked-out";
  status:
    | "new"
    | "pending_payment"
    | "awaiting"
    | "confirmed"
    | "needs-reply"
    | "declined";
  deposit_amount: number | null;
  deposit_paid_at: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  bank_transfer_claimed_at: string | null;
  conversation_token: string | null;
  room_unit_id: string | null;
  created_at: string;
  updated_at: string;
};

export type RoomUnitRow = {
  id: string;
  number: string;
  sort_order: number;
  ical_export_token: string | null;
  created_at: string;
};

export type RoomUnitTypeRow = {
  room_unit_id: string;
  room_id: string;
};

export type BookingMessageRow = {
  id: string;
  booking_request_id: string;
  sender: "staff" | "guest";
  sender_email: string | null;
  body: string;
  source_email_id: string | null;
  created_at: string;
};

export type RoomBlockRow = {
  id: string;
  room_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  staff_note: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  ical_feed_id: string | null;
  ical_uid: string | null;
  room_unit_id: string | null;
  created_at: string;
};

export type RoomIcalFeedRow = {
  id: string;
  room_id: string;
  room_unit_id: string | null;
  label: string;
  import_url: string;
  last_synced_at: string | null;
  last_sync_error: string | null;
  created_at: string;
};

export type RoomDayInventoryRow = {
  id: string;
  room_id: string;
  date: string;
  rooms_to_sell: number;
  created_at: string;
};

export type RoomDayRateRow = {
  id: string;
  room_id: string;
  date: string;
  nightly_rate: number;
  created_at: string;
};

export type StaffCalendarAccess = "read" | "read_write";

export type StaffNotificationEmailRow = {
  id: string;
  email: string;
  label: string | null;
  calendar_access: StaffCalendarAccess;
  created_at: string;
};

export type RoomPromotionRow = {
  id: string;
  room_id: string;
  start_date: string;
  end_date: string;
  percent_off: number;
  label: string | null;
  created_at: string;
};

export type PropertySettingsRow = {
  id: string;
  property_name: string;
  property_tagline: string;
  contact_email: string | null;
  contact_phone: string | null;
  address_line: string | null;
  check_in_from: string;
  check_in_until: string;
  quiet_hours: string;
  currency: "thb" | "usd";
  allow_pay_on_arrival: boolean;
  house_rules: string[];
  cancellation_policy: string;
  privacy_policy: string;
  terms_summary: string;
  line_url: string | null;
  whatsapp_url: string | null;
  promptpay_id: string | null;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  calendar_color_available: string;
  calendar_color_closed: string;
  calendar_color_booking: string;
  calendar_color_sold_out?: string | null;
  hero_image_url: string | null;
  hero_image_storage_path: string | null;
  updated_at: string;
};

export type PropertyGalleryPhotoRow = {
  id: string;
  storage_path: string;
  url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
};

export type TourRow = {
  id: string;
  title: string;
  summary: string;
  duration_label: string | null;
  price_label: string | null;
  image_url: string | null;
  image_storage_path: string | null;
  gallery_urls: string[];
  link_url: string | null;
  link_label: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: RoomRow;
        Insert: Omit<
          RoomRow,
          "updated_at" | "image_url" | "gallery_urls" | "sort_order" | "ical_export_token"
        > & {
          updated_at?: string;
          image_url?: string | null;
          gallery_urls?: string[];
          sort_order?: number;
          ical_export_token?: string | null;
        };
        Update: Partial<Omit<RoomRow, "id" | "updated_at">>;
        Relationships: [];
      };
      booking_requests: {
        Row: BookingRequestRow;
        Insert: Omit<
          BookingRequestRow,
          | "id"
          | "created_at"
          | "updated_at"
          | "staff_note"
          | "stay_status"
          | "deposit_amount"
          | "deposit_paid_at"
          | "stripe_checkout_session_id"
          | "stripe_payment_intent_id"
          | "bank_transfer_claimed_at"
          | "room_unit_id"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          staff_note?: string | null;
          stay_status?: BookingRequestRow["stay_status"];
          deposit_amount?: number | null;
          deposit_paid_at?: string | null;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          bank_transfer_claimed_at?: string | null;
          conversation_token?: string | null;
          room_unit_id?: string | null;
        };
        Update: Partial<Omit<BookingRequestRow, "id" | "created_at">>;
        Relationships: [];
      };
      room_units: {
        Row: RoomUnitRow;
        Insert: Omit<RoomUnitRow, "id" | "created_at" | "ical_export_token"> & {
          id?: string;
          created_at?: string;
          ical_export_token?: string | null;
        };
        Update: Partial<Omit<RoomUnitRow, "id" | "created_at">>;
        Relationships: [];
      };
      room_unit_types: {
        Row: RoomUnitTypeRow;
        Insert: RoomUnitTypeRow;
        Update: Partial<RoomUnitTypeRow>;
        Relationships: [];
      };
      booking_messages: {
        Row: BookingMessageRow;
        Insert: Omit<BookingMessageRow, "id" | "created_at" | "source_email_id"> & {
          id?: string;
          created_at?: string;
          source_email_id?: string | null;
        };
        Update: Partial<Omit<BookingMessageRow, "id" | "created_at">>;
        Relationships: [];
      };
      room_blocks: {
        Row: RoomBlockRow;
        Insert: Omit<
          RoomBlockRow,
          | "id"
          | "created_at"
          | "guest_name"
          | "guest_email"
          | "guest_phone"
          | "ical_feed_id"
          | "ical_uid"
          | "room_unit_id"
        > & {
          id?: string;
          created_at?: string;
          guest_name?: string | null;
          guest_email?: string | null;
          guest_phone?: string | null;
          ical_feed_id?: string | null;
          ical_uid?: string | null;
          room_unit_id?: string | null;
        };
        Update: Partial<Omit<RoomBlockRow, "id" | "created_at">>;
        Relationships: [];
      };
      room_ical_feeds: {
        Row: RoomIcalFeedRow;
        Insert: Omit<
          RoomIcalFeedRow,
          "id" | "created_at" | "last_synced_at" | "last_sync_error" | "room_unit_id"
        > & {
          id?: string;
          created_at?: string;
          last_synced_at?: string | null;
          last_sync_error?: string | null;
          room_unit_id?: string | null;
        };
        Update: Partial<Omit<RoomIcalFeedRow, "id" | "created_at">>;
        Relationships: [];
      };
      room_day_inventory: {
        Row: RoomDayInventoryRow;
        Insert: Omit<RoomDayInventoryRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<RoomDayInventoryRow, "id" | "created_at">>;
        Relationships: [];
      };
      room_day_rates: {
        Row: RoomDayRateRow;
        Insert: Omit<RoomDayRateRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<RoomDayRateRow, "id" | "created_at">>;
        Relationships: [];
      };
      staff_notification_emails: {
        Row: StaffNotificationEmailRow;
        Insert: Omit<StaffNotificationEmailRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<StaffNotificationEmailRow, "id" | "created_at">>;
        Relationships: [];
      };
      room_promotions: {
        Row: RoomPromotionRow;
        Insert: Omit<RoomPromotionRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<RoomPromotionRow, "id" | "created_at">>;
        Relationships: [];
      };
      property_settings: {
        Row: PropertySettingsRow;
        Insert: Omit<
          PropertySettingsRow,
          | "updated_at"
          | "hero_image_url"
          | "hero_image_storage_path"
          | "promptpay_id"
          | "bank_name"
          | "account_name"
          | "account_number"
        > & {
          updated_at?: string;
          hero_image_url?: string | null;
          hero_image_storage_path?: string | null;
          promptpay_id?: string | null;
          bank_name?: string | null;
          account_name?: string | null;
          account_number?: string | null;
        };
        Update: Partial<Omit<PropertySettingsRow, "id">>;
        Relationships: [];
      };
      property_gallery_photos: {
        Row: PropertyGalleryPhotoRow;
        Insert: Omit<PropertyGalleryPhotoRow, "id" | "created_at" | "caption" | "sort_order"> & {
          id?: string;
          created_at?: string;
          caption?: string | null;
          sort_order?: number;
        };
        Update: Partial<Omit<PropertyGalleryPhotoRow, "id" | "created_at">>;
        Relationships: [];
      };
      tours: {
        Row: TourRow;
        Insert: Omit<
          TourRow,
          "id" | "created_at" | "updated_at" | "duration_label" | "price_label" | "image_url" | "image_storage_path" | "gallery_urls" | "link_url" | "link_label" | "sort_order"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          duration_label?: string | null;
          price_label?: string | null;
          image_url?: string | null;
          image_storage_path?: string | null;
          gallery_urls?: string[];
          link_url?: string | null;
          link_label?: string;
          sort_order?: number;
        };
        Update: Partial<Omit<TourRow, "id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_guest_booking_if_capacity: {
        Args: {
          p_guest_name: string;
          p_guest_email: string;
          p_guest_phone: string;
          p_room_id: string;
          p_room_name: string;
          p_arrival_date: string;
          p_departure_date: string;
          p_nights: number;
          p_estimated_total: number;
          p_deposit_amount: number;
          p_note: string | null;
          p_conversation_token: string;
          p_available_count: number;
        };
        Returns: {
          ok: boolean;
          reason?: string;
          message?: string;
          booking?: BookingRequestRow;
        };
      };
      staff_set_booking_room_unit: {
        Args: {
          p_booking_id: string;
          p_room_unit_id: string | null;
        };
        Returns: undefined;
      };
      staff_update_channel_reservation: {
        Args: {
          p_block_id: string;
          p_guest_name: string | null;
          p_guest_email: string | null;
          p_guest_phone: string | null;
          p_start_date: string;
          p_end_date: string;
          p_staff_note: string | null;
          p_room_unit_id: string | null;
        };
        Returns: undefined;
      };
      staff_booking_room_unit_map: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          room_unit_id: string;
        }[];
      };
      staff_room_block_unit_map: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          room_unit_id: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

function requireSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  return url;
}

export function createGuestSupabaseClient() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient<Database>(requireSupabaseUrl(), anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createStaffSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient<Database>(requireSupabaseUrl(), serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function hasStaffSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
