SET local check_function_bodies = off;

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "service_role";

CREATE EXTENSION "hypopg" SCHEMA "extensions";

CREATE EXTENSION "index_advisor" SCHEMA "extensions";

CREATE EXTENSION "pg_cron";

CREATE EXTENSION "pg_net" SCHEMA "extensions";

CREATE TABLE "public"."booking_table" (
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "rental_price"            numeric,
  "total_amount"            numeric,
  "cycle_id"                uuid,
  "id"                      uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "owner_id"                uuid                     NOT NULL,
  "renter_id"               uuid,
  "start_time"              timestamp with time zone,
  "end_time"                timestamp with time zone,
  "updated_at"              timestamp with time zone DEFAULT now(),
  "returned_at"             timestamp with time zone,
  "cancelled_at"            timestamp with time zone,
  "pickup_otp_expires_at"   timestamp with time zone,
  "return_deadline"         timestamp with time zone,
  "no_of_hours"             bigint                   NOT NULL DEFAULT '0'::bigint,
  "no_of_days"              bigint                   NOT NULL DEFAULT '0'::bigint,
  "return_image_url"        text,
  "pickup_otp"              text,
  "return_otp"              text,
  "return_otp_expires_at"   timestamp with time zone,
  "return_request_deadline" timestamp with time zone,
  "return_accept_deadline"  timestamp with time zone,
  "renter_charge"           numeric                  NOT NULL DEFAULT '0'::numeric,
  "overdue_charge"          numeric(10,2)            DEFAULT 0,
  CONSTRAINT "booking_table_no_of_days_check" CHECK ((no_of_days >= 0)),
  CONSTRAINT "booking_table_no_of_hours_check" CHECK (((no_of_hours >= 0) AND (no_of_hours < 24))),
  CONSTRAINT "booking_table_pkey" PRIMARY KEY (id),
  CONSTRAINT "booking_table_price_check" CHECK ((rental_price > (0)::numeric))
);

ALTER TABLE "public"."booking_table"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."call_sessions" (
  "id"                        uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "booking_id"                uuid                     NOT NULL,
  "renter_id"                 uuid                     NOT NULL,
  "owner_id"                  uuid                     NOT NULL,
  "status"                    text                     NOT NULL DEFAULT 'calling'::text,
  "offer"                     jsonb,
  "answer"                    jsonb,
  "started_at"                timestamp with time zone,
  "ended_at"                  timestamp with time zone,
  "created_at"                timestamp with time zone NOT NULL DEFAULT now(),
  "caller_id"                 uuid,
  "call_notification_sent_at" timestamp with time zone,
  CONSTRAINT "call_sessions_pkey" PRIMARY KEY (id),
  CONSTRAINT "valid_call_status" CHECK ((status = ANY (ARRAY['calling'::text, 'ringing'::text, 'connected'::text, 'rejected'::text, 'ended'::text, 'failed'::text])))
);

ALTER TABLE "public"."call_sessions"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."call_sessions"
  REPLICA IDENTITY FULL;

CREATE TABLE "public"."call_signals" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "call_id"     uuid                     NOT NULL,
  "sender_id"   uuid                     NOT NULL,
  "signal_type" text                     NOT NULL,
  "signal_data" jsonb                    NOT NULL,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "call_signals_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."call_signals"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."call_signals"
  REPLICA IDENTITY FULL;

CREATE TABLE "public"."chat_conversations" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"         uuid                     NOT NULL,
  "owner_id"        uuid                     NOT NULL,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "last_message_at" timestamp with time zone,
  CONSTRAINT "chat_conversations_pkey" PRIMARY KEY (id),
  CONSTRAINT "different_chat_participants" CHECK ((user_id <> owner_id)),
  CONSTRAINT "unique_user_owner_conversation" UNIQUE (user_id, owner_id)
);

ALTER TABLE "public"."chat_conversations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."chat_messages" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "conversation_id" uuid                     NOT NULL,
  "sender_id"       uuid                     NOT NULL,
  "message"         text                     NOT NULL,
  "is_read"         boolean                  NOT NULL DEFAULT false,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "chat_messages_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."chat_messages"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."cycle_availability" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "cycle_id"   uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cycle_availability_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."cycle_availability"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."cycle_images" (
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "image_url"     text,
  "display_order" bigint,
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "cycle_id"      uuid,
  "storage_path"  text,
  CONSTRAINT "cycle images_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."cycle_images"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."cycle_verification" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "cycle_id"          uuid                     NOT NULL,
  "verified_by"       uuid,
  "reason"            text,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "assigned_admin_id" uuid,
  CONSTRAINT "cycle_verification_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."cycle_verification"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."cycles" (
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "owner_id"       uuid,
  "title"          text,
  "description"    text,
  "cycle_type"     text,
  "brand"          text,
  "model"          text,
  "condition"      text,
  "price_per_hour" numeric,
  "price_per_day"  numeric,
  "location"       text,
  "is_verified"    boolean                  NOT NULL,
  "updated_at"     timestamp with time zone DEFAULT now(),
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "rating"         numeric,
  CONSTRAINT "cycles_pkey" PRIMARY KEY (id),
  CONSTRAINT "cycles_price_per_day_check" CHECK (((price_per_day > (0)::numeric) AND (price_per_day <= (500)::numeric))),
  CONSTRAINT "cycles_price_per_hour_check" CHECK (((price_per_hour > (0)::numeric) AND (price_per_hour <= (100)::numeric))),
  CONSTRAINT "cycles_rating_check" CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)))
);

ALTER TABLE "public"."cycles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."damage_reports_table" (
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "booking_id"  uuid,
  "description" text,
  "status"      text,
  "cycle_id"    uuid,
  "reported_by" uuid,
  "resolved_at" timestamp with time zone,
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT "damage_reports_table_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."damage_reports_table"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."notifications" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"     uuid                     NOT NULL,
  "message"     text                     NOT NULL,
  "is_read"     boolean                  NOT NULL DEFAULT false,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "action_data" jsonb,
  CONSTRAINT "notifications_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."notifications"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."payment_table" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone DEFAULT now(),
  "renter_id"           uuid                     NOT NULL,
  "booking_id"          uuid                     NOT NULL,
  "provider"            text                     NOT NULL DEFAULT 'razorpay'::text,
  "provider_order_id"   text,
  "provider_payment_id" text,
  "amount"              numeric(10,2)            NOT NULL,
  "currency"            text                     NOT NULL DEFAULT 'INR'::text,
  "status"              text                     NOT NULL DEFAULT 'created'::text,
  "payment_type"        text,
  CONSTRAINT "payment_table_pkey" PRIMARY KEY (id),
  CONSTRAINT "payment_table_provider_order_id_key" UNIQUE (provider_order_id)
);

ALTER TABLE "public"."payment_table"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."payment_table"
  REPLICA IDENTITY FULL;

CREATE TABLE "public"."profiles" (
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "full_name"   text,
  "email"       text,
  "phone"       text,
  "avatar_url"  text,
  "updated_at"  timestamp with time zone,
  "hostel"      text,
  "id"          uuid                     NOT NULL,
  "is_blocked"  boolean                  NOT NULL DEFAULT false,
  "net_balance" double precision         NOT NULL DEFAULT '0'::double precision,
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."push_subscriptions" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid                     NOT NULL,
  "endpoint"   text                     NOT NULL,
  "p256dh"     text                     NOT NULL,
  "auth"       text                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY (id),
  CONSTRAINT "push_subscriptions_user_id_endpoint_key" UNIQUE (user_id, endpoint)
);

ALTER TABLE "public"."push_subscriptions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."reports" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "reported_by"      uuid                     NOT NULL,
  "reported_user_id" uuid                     NOT NULL,
  "cycle_id"         uuid,
  "booking_id"       uuid,
  "reporter_role"    text                     NOT NULL,
  "reason"           text                     NOT NULL,
  "description"      text                     NOT NULL,
  "status"           text                     NOT NULL DEFAULT 'pending'::text,
  "admin_note"       text,
  "resolved_by"      uuid,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "reports_pkey" PRIMARY KEY (id),
  CONSTRAINT "reports_reporter_role_check" CHECK ((reporter_role = ANY (ARRAY['renter'::text, 'owner'::text]))),
  CONSTRAINT "reports_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'under_review'::text, 'resolved'::text, 'dismissed'::text])))
);

ALTER TABLE "public"."reports"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."reviews" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "booking_id"  uuid                     NOT NULL,
  "reviewer_id" uuid                     NOT NULL,
  "cycle_id"    uuid                     NOT NULL,
  "rating"      integer                  NOT NULL,
  "comment"     text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "reviewee_id" uuid,
  "review_type" text                     NOT NULL DEFAULT 'cycle'::text,
  CONSTRAINT "reviews_pkey" PRIMARY KEY (id),
  CONSTRAINT "reviews_rating_check" CHECK (((rating >= 1) AND (rating <= 5))),
  CONSTRAINT "reviews_review_type_check" CHECK ((review_type = ANY (ARRAY['cycle'::text, 'user'::text]))),
  CONSTRAINT "unique_review_per_booking_type" UNIQUE (booking_id, reviewer_id, review_type)
);

ALTER TABLE "public"."reviews"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."withdrawal" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "amount"     double precision,
  "user_id"    uuid                     DEFAULT gen_random_uuid(),
  "updated_at" timestamp with time zone,
  "status"     text,
  CONSTRAINT "withdrawal_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."withdrawal"
  ENABLE ROW LEVEL SECURITY;

CREATE TYPE "public"."action types" AS ENUM (
  'NONE',
  'enter_rental_OTP',
  'report_owner',
  'view_rental',
  'view_extension',
  'cycle_returned',
  'view_report',
  'view_account',
  'retry_payment',
  'view_cycle',
  'view_despute',
  'view_security',
  'rental_request_received',
  'view_withdrawal',
  'enter_return_OTP',
  'return_request_decision'
);

ALTER TABLE "public"."notifications"
  ADD COLUMN "action_type" public."action types" NOT NULL DEFAULT 'NONE'::public."action types";

CREATE TYPE "public"."booking status" AS ENUM (
  'requested',
  'slot_booked',
  'extra',
  'payment_pending',
  'active',
  'return_pending',
  'completed',
  'cancelled',
  'expired',
  'payment_failed',
  'rejected'
);

ALTER TABLE "public"."booking_table"
  ADD COLUMN "status" public."booking status" NOT NULL DEFAULT 'requested'::public."booking status";

CREATE TYPE "public"."cycle_available_status" AS ENUM (
  'pending',
  'available',
  'unavailable',
  'rented',
  'maintenance',
  'retired',
  'booked'
);

ALTER TABLE "public"."cycle_availability"
  ADD COLUMN "status" public.cycle_available_status NOT NULL DEFAULT 'pending'::public.cycle_available_status;

CREATE TYPE "public"."cycle_status" AS ENUM (
  'pending',
  'available',
  'unavailable',
  'rented',
  'maintenance',
  'suspended',
  'draft',
  'booked',
  'retired'
);

ALTER TABLE "public"."cycles"
  ADD COLUMN "status" public.cycle_status NOT NULL DEFAULT 'pending'::public.cycle_status;

CREATE TYPE "public"."cycle_verification_status" AS ENUM (
  'pending',
  'approved',
  'rejected',
  'resubmitted',
  'cancelled',
  'suspended'
);

ALTER TABLE "public"."cycle_verification"
  ADD COLUMN "status" public.cycle_verification_status NOT NULL DEFAULT 'pending'::public.cycle_verification_status;

CREATE TYPE "public"."notification_title" AS ENUM (
  'RENTAL_REQUEST_RECEIVED',
  'RENTAL_REQUEST_ACCEPTED',
  'RENTAL_REQUEST_REJECTED',
  'RENTAL_REQUEST_CANCELLED',
  'RENTAL_REQUEST_EXPIRED',
  'RENTAL_OTP_GENERATED',
  'RENTAL_OTP_EXPIRED_OWNER_ABSENT',
  'RENTAL_STARTED',
  'RENTAL_ENDING_SOON',
  'RENTAL_EXPIRED',
  'RENTAL_EXTENSION_REQUESTED',
  'RENTAL_EXTENSION_ACCEPTED',
  'RENTAL_EXTENSION_REJECTED',
  'RETURN_REQUIRED',
  'RETURN_COMPLETED',
  'RETURN_PROBLEM_REPORTED',
  'RETURN_ASSISTANCE_REQUIRED',
  'RETURN_ISSUE_RESOLVED',
  'CYCLE_VERIFICATION_ASSIGNED',
  'CYCLE_APPROVED',
  'CYCLE_REJECTED',
  'CYCLE_LISTING_ACTIVATED',
  'CYCLE_LISTING_SUSPENDED',
  'CYCLE_LISTING_REMOVED',
  'CYCLE_REVERIFICATION_REQUIRED',
  'OWNER_REPORTED',
  'RENTER_REPORTED',
  'CYCLE_REPORTED',
  'REPORT_RESOLVED',
  'REPORT_DISMISSED',
  'ACCOUNT_BLOCKED',
  'ACCOUNT_UNBLOCKED',
  'ACCOUNT_WARNING',
  'ACCOUNT_REVIEW_REQUIRED',
  'PAYMENT_SUCCESS',
  'PAYMENT_FAILED',
  'REFUND_INITIATED',
  'REFUND_COMPLETED',
  'REFUND_FAILED',
  'NEW_LOGIN_DETECTED',
  'SECURITY_ALERT',
  'PASSWORD_CHANGED',
  'SYSTEM_ANNOUNCEMENT',
  'SYSTEM_MAINTENANCE',
  'TERMS_UPDATED',
  'PRIVACY_POLICY_UPDATED',
  'PENDING_DUES_REMINDER',
  'USER_PENDING_DUES_ESCALATION',
  'NEW_WITHDRAWAL_REQUEST',
  'REGENERATE_RENTAL_OTP',
  'RETURN_OTP_GENERATED',
  'BOOKING_CANCELLED',
  'RENTAL_COMPLETED',
  'RETURN_DEADLINE_APPROACHING',
  'RETURN_DEADLINE_REACHED',
  'RETURN_REQUEST_DEADLINE_APPROACHING',
  'RETURN_ACCEPT_DEADLINE_APPROACHING',
  'DUE_PAYMENT_SUCCESS',
  'REGENERATE_RETURN_OTP',
  'RETURN_REQUEST_SUBMITTED',
  'RETURN_REQUEST_RECEIVED',
  'RETURN_REQUEST_ACCEPTED'
);

ALTER TABLE "public"."notifications"
  ADD COLUMN "title" public.notification_title NOT NULL;

CREATE TYPE "public"."role" AS ENUM (
  'student',
  'admin'
);

ALTER TABLE "public"."profiles"
  ADD COLUMN "role" public.role NOT NULL DEFAULT 'student'::public.role;

CREATE OR REPLACE FUNCTION public.book_cycle_slot (
  p_booking_id uuid
)
  RETURNS TABLE (
    success boolean,
    message text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$DECLARE
    v_cycle_id uuid;
    v_renter_id uuid;
    v_existing_cycle_booking uuid;
    v_existing_renter_booking uuid;
BEGIN

    -- Get cycle and renter from the requested booking
    SELECT cycle_id, renter_id
    INTO v_cycle_id, v_renter_id
    FROM public.booking_table
    WHERE id = p_booking_id
      AND status = 'requested';

    -- Booking doesn't exist / isn't requestable
    IF v_cycle_id IS NULL OR v_renter_id IS NULL THEN
        RETURN QUERY
        SELECT false, 'Booking not found or is no longer available';
        RETURN;
    END IF;


    -- =========================================================
    -- Check whether this cycle is already occupied
    -- by another booking
    -- =========================================================

    SELECT id
    INTO v_existing_cycle_booking
    FROM public.booking_table
    WHERE cycle_id = v_cycle_id
      AND status IN (
          'slot_booked',
          'payment_pending',
          'active',
          'return_pending',
          'payment_failed'
      )
      AND id <> p_booking_id
    LIMIT 1;

    IF v_existing_cycle_booking IS NOT NULL THEN
        RETURN QUERY
        SELECT false,
               'This cycle has already been booked by another renter';
        RETURN;
    END IF;


    -- =========================================================
    -- Check whether this renter already has another
    -- active/pending booking
    -- =========================================================

    SELECT id
    INTO v_existing_renter_booking
    FROM public.booking_table
    WHERE renter_id = v_renter_id
      AND status IN (
          'slot_booked',
          'payment_pending',
          'active',
          'return_pending',
          'payment_failed'
      )
      AND id <> p_booking_id
    LIMIT 1;

    IF v_existing_renter_booking IS NOT NULL THEN
        RETURN QUERY
        SELECT false,
               'This renter already has an active or pending booking';
        RETURN;
    END IF;


    -- =========================================================
    -- Both cycle and renter are free
    -- =========================================================

    UPDATE public.booking_table
    SET
        status = 'slot_booked',
        updated_at = now()
    WHERE id = p_booking_id
      AND status = 'requested';

    RETURN QUERY
    SELECT true, 'Slot booked';

END;$function$;

CREATE OR REPLACE FUNCTION public.check_nitk_email (
  event jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
declare
    email text;
begin
    email := lower(event->'user'->>'email');

    if email is null or email not like '%@nitk.edu.in' then
        raise exception 'Only NITK email addresses are allowed';
    end if;

    return event;
end;
$function$;

CREATE OR REPLACE FUNCTION public.clear_rental_decision_on_booking_completion()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$DECLARE
    v_occupied_statuses text[] := ARRAY[
        'active',
        'slot_booked',
        'payment_pending',
        'payment_failed',
        'return_pending'
    ];
BEGIN

    -- =========================================================
    -- Only act when the booking status actually changes
    -- =========================================================

    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;


    -- =========================================================
    -- Check whether:
    --
    -- OLD status was one of the occupied statuses
    -- AND
    -- NEW status is no longer one of those statuses
    --
    -- Cast status to text because booking_table.status
    -- uses the custom "booking status" type.
    -- =========================================================

    IF OLD.status::text = ANY(v_occupied_statuses)
       AND NOT (
           NEW.status::text = ANY(v_occupied_statuses)
       )
    THEN

        -- =====================================================
        -- Remove ONLY the rental_decision key
        -- from matching rental request notifications.
        --
        -- Other action_data values remain untouched.
        -- =====================================================

        UPDATE public.notifications
        SET
            action_data = action_data - 'rental_decision'
        WHERE user_id = NEW.owner_id
          AND title = 'RENTAL_REQUEST_RECEIVED'
          AND action_data->>'cycle_id' = NEW.cycle_id::text
          AND action_data ? 'rental_decision';

    END IF;


    RETURN NEW;

END;$function$;

CREATE OR REPLACE FUNCTION public.deduct_overdue_rental_fee()
  RETURNS void
  LANGUAGE plpgsql
  AS $function$BEGIN

    -- =========================================================
    -- 1. ACTIVE BOOKINGS
    -- Charge ₹2 per minute after return_deadline
    -- =========================================================

    UPDATE public.booking_table
    SET
        renter_charge =
            COALESCE(renter_charge, 0)
            +
            GREATEST(
                0,
                FLOOR(
                    EXTRACT(
                        EPOCH FROM (NOW() - return_deadline)
                    ) / 60
                ) * 2
                -
                COALESCE(overdue_charge, 0)
            ),

        overdue_charge =
            FLOOR(
                EXTRACT(
                    EPOCH FROM (NOW() - return_deadline)
                ) / 60
            ) * 2,

        updated_at = NOW()

    WHERE status::text = 'active'
      AND return_deadline IS NOT NULL
      AND NOW() >= return_deadline;


    -- =========================================================
    -- 2. RETURN PENDING BOOKINGS
    -- Charge ₹2 per minute after return_accept_deadline
    -- =========================================================

    UPDATE public.booking_table
    SET
        renter_charge =
            COALESCE(renter_charge, 0)
            +
            GREATEST(
                0,
                FLOOR(
                    EXTRACT(
                        EPOCH FROM (NOW() - return_accept_deadline)
                    ) / 60
                ) * 2
                -
                COALESCE(overdue_charge, 0)
            ),

        overdue_charge =
            FLOOR(
                EXTRACT(
                    EPOCH FROM (NOW() - return_accept_deadline)
                ) / 60
            ) * 2,

        updated_at = NOW()

    WHERE status::text = 'return_pending'
      AND return_accept_deadline IS NOT NULL
      AND NOW() >= return_accept_deadline;

END;$function$;

CREATE OR REPLACE FUNCTION public.expire_old_booking_requests()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN

    UPDATE public.booking_table
    SET
        status = 'expired',
        updated_at = now()
    WHERE status IN ('requested', 'slot_booked')
      AND updated_at <= now() - INTERVAL '15 minutes';

END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_pickup_otp (
  p_booking_id uuid
)
  RETURNS TABLE (
    success boolean,
    message text
  )
  LANGUAGE plpgsql
  AS $function$DECLARE
    v_renter_id uuid;
    v_owner_id uuid;
    v_otp text;
    v_expires_at timestamptz;
BEGIN

    -- Get renter and owner
    SELECT
        b.renter_id,
        c.owner_id
    INTO
        v_renter_id,
        v_owner_id
    FROM public.booking_table b
    JOIN public.cycles c
        ON c.id = b.cycle_id
    WHERE b.id = p_booking_id
      AND b.status = 'slot_booked';

    -- Booking not found / invalid status
    IF v_renter_id IS NULL OR v_owner_id IS NULL THEN
        RETURN QUERY
        SELECT
            false,
            'Booking not found or is not slot booked';

        RETURN;
    END IF;

    -- Generate 6-digit OTP
    v_otp := lpad(
        floor(random() * 1000000)::text,
        6,
        '0'
    );

    -- OTP expires after 15 minutes
    v_expires_at := now() + interval '15 minutes';

    -- Store OTP and expiry time
    UPDATE public.booking_table
    SET
        pickup_otp = v_otp,
        pickup_otp_expires_at = v_expires_at,
        updated_at = now()
    WHERE id = p_booking_id;

    -- Notification to renter
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        action_type,
        action_data,
        is_read
    )
    VALUES (
        v_renter_id,
        'RENTAL_OTP_GENERATED',
        'Your pickup OTP is ' || v_otp,
        'NONE',
        jsonb_build_object(
            'booking_id', p_booking_id,
            'owner_id', v_owner_id,
            'renter_id', v_renter_id
        ),
        false
    );

    -- Notification to owner
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        action_type,
        action_data,
        is_read
    )
    VALUES (
        v_owner_id,
        'RENTAL_OTP_GENERATED',
        'The renter has arrived. Enter the pickup OTP to verify the rental.',
        'enter_rental_OTP',
        jsonb_build_object(
            'booking_id', p_booking_id,
            'owner_id', v_owner_id,
            'renter_id', v_renter_id
        ),
        false
    );

    RETURN QUERY
    SELECT
        true,
        'Pickup OTP generated successfully';

END;$function$;

CREATE OR REPLACE FUNCTION public.generate_return_otp (
  p_booking_id uuid
)
  RETURNS TABLE (
    success boolean,
    message text
  )
  LANGUAGE plpgsql
  AS $function$DECLARE
    v_renter_id uuid;
    v_owner_id uuid;

    v_otp text;
    v_expires_at timestamptz;
    v_return_accept_deadline timestamptz;

    v_now timestamptz;
BEGIN

    -- =========================================================
    -- Current time
    -- =========================================================

    v_now := now();


    -- =========================================================
    -- Get renter, owner and return request deadline
    -- =========================================================

    SELECT
        b.renter_id,
        b.owner_id,
        b.return_request_deadline
    INTO
        v_renter_id,
        v_owner_id,
        v_return_accept_deadline
    FROM public.booking_table b
    WHERE b.id = p_booking_id
      AND b.status = 'return_pending';


    -- =========================================================
    -- Booking not found / invalid status
    -- =========================================================

    IF v_renter_id IS NULL OR v_owner_id IS NULL THEN

        RETURN QUERY
        SELECT
            false,
            'Booking not found or is not return pending';

        RETURN;

    END IF;


    -- =========================================================
    -- Calculate RETURN ACCEPT DEADLINE
    --
    -- If owner accepts before return request deadline:
    --     30 minutes from now
    --
    -- If owner accepts after return request deadline:
    --     1 hour from now
    -- =========================================================

    IF v_return_accept_deadline IS NOT NULL
       AND v_now < v_return_accept_deadline
    THEN

        v_return_accept_deadline :=
            v_now + interval '30 minutes';

    ELSE

        v_return_accept_deadline :=
            v_now + interval '1 hour';

    END IF;


    -- =========================================================
    -- Generate 6-digit return OTP
    -- =========================================================

    v_otp := lpad(
        floor(random() * 1000000)::text,
        6,
        '0'
    );


    -- =========================================================
    -- OTP expiry follows the same deadline condition
    --
    -- Before request deadline:
    --     OTP expires in 30 minutes
    --
    -- After request deadline:
    --     OTP expires in 1 hour
    -- =========================================================

    v_expires_at := v_return_accept_deadline;


    -- =========================================================
    -- Store return OTP, OTP expiry and return accept deadline
    -- =========================================================

    UPDATE public.booking_table
    SET
        return_otp = v_otp,
        return_otp_expires_at = v_expires_at,
        return_accept_deadline = v_return_accept_deadline,
        updated_at = now()
    WHERE id = p_booking_id;


    -- =========================================================
    -- Notification to OWNER
    --
    -- Inform owner to be ready to take the cycle before
    -- the return accept deadline.
    --
    -- Owner must have enter_return_OTP action.
    -- =========================================================

    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        action_type,
        action_data,
        is_read
    )
    VALUES (
        v_owner_id,

        'RETURN_REQUEST_ACCEPTED',

        'The renter is returning the cycle. Please be ready to take your cycle before the return accept deadline.',

        'enter_return_OTP',

        jsonb_build_object(
            'booking_id', p_booking_id,
            'owner_id', v_owner_id,
            'renter_id', v_renter_id,
            'return_accept_deadline', v_return_accept_deadline
        ),

        false
    );


        -- =========================================================
    -- Notification to RENTER
    --
    -- Inform renter that owner has accepted the return request.
    -- Include the generated return OTP.
    -- =========================================================

    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        action_type,
        action_data,
        is_read
    )
    VALUES (
        v_renter_id,

        'RETURN_REQUEST_ACCEPTED',

        'Your owner has accepted your return request. Your return OTP is ' 
        || v_otp 
        || '. Please return the cycle before the return accept deadline.',

        'NONE',

        jsonb_build_object(
            'booking_id', p_booking_id,
            'owner_id', v_owner_id,
            'renter_id', v_renter_id,
            'return_otp', v_otp,
            'return_accept_deadline', v_return_accept_deadline
        ),

        false
    );


    -- =========================================================
    -- Success response
    -- =========================================================

    RETURN QUERY
    SELECT
        true,
        'Return request accepted and return OTP generated successfully';


END;$function$;

CREATE OR REPLACE FUNCTION public.handle_booking_cancellation (
  p_booking_id   uuid,
  p_cancelled_by uuid
)
  RETURNS TABLE (
    success boolean,
    message text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
    v_renter_id uuid;
    v_owner_id uuid;
    v_other_user_id uuid;
BEGIN

    -- =========================================================
    -- Get renter and owner for the booking
    -- =========================================================

    SELECT
        b.renter_id,
        c.owner_id
    INTO
        v_renter_id,
        v_owner_id
    FROM public.booking_table b
    JOIN public.cycles c
        ON c.id = b.cycle_id
    WHERE b.id = p_booking_id;


    -- =========================================================
    -- Booking not found
    -- =========================================================

    IF v_renter_id IS NULL OR v_owner_id IS NULL THEN

        RETURN QUERY
        SELECT
            false,
            'Booking not found';

        RETURN;

    END IF;


    -- =========================================================
    -- Verify that the user cancelling is actually a participant
    -- =========================================================

    IF p_cancelled_by <> v_renter_id
       AND p_cancelled_by <> v_owner_id
    THEN

        RETURN QUERY
        SELECT
            false,
            'User is not a participant of this booking';

        RETURN;

    END IF;


    -- =========================================================
    -- Determine the other participant
    -- =========================================================

    IF p_cancelled_by = v_renter_id THEN

        v_other_user_id := v_owner_id;

    ELSE

        v_other_user_id := v_renter_id;

    END IF;


    -- =========================================================
    -- Notification to the person who cancelled
    -- =========================================================

    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        action_type,
        action_data,
        is_read
    )
    VALUES (
        p_cancelled_by,

        'BOOKING_CANCELLED',

        'Your booking has been cancelled successfully.',

        'NONE',

        '{}'::jsonb,

        false
    );


    -- =========================================================
    -- Notification to the other participant
    -- =========================================================

    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        action_type,
        action_data,
        is_read
    )
    VALUES (
        v_other_user_id,

        'BOOKING_CANCELLED',

        'Unfortunately, the booking has been cancelled by the other participant.',

        'NONE',

        '{}'::jsonb,

        false
    );


    -- =========================================================
    -- Invalidate RENTAL OTP GENERATED notifications
    --
    -- Applies irrespective of who cancelled.
    --
    -- We only modify notifications belonging to this booking.
    -- =========================================================

    UPDATE public.notifications
    SET
        action_type = 'NONE',
        action_data = '{}'::jsonb
    WHERE title = 'RENTAL_OTP_GENERATED'
      AND action_data->>'booking_id' = p_booking_id::text;


    -- =========================================================
    -- Success
    -- =========================================================

    RETURN QUERY
    SELECT
        true,
        'Booking cancellation handled successfully';

END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_cycle_verification_available()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN

    IF NEW.status = 'approved'
       AND OLD.status IS DISTINCT FROM NEW.status THEN

        -- Insert only if this cycle is not already in cycle_availability
        IF NOT EXISTS (
            SELECT 1
            FROM public.cycle_availability
            WHERE cycle_id = NEW.cycle_id
        ) THEN

            INSERT INTO public.cycle_availability
            (
                cycle_id,
                status
            )
            VALUES
            (
                NEW.cycle_id,
                'available'
            );

        END IF;

    END IF;

    RETURN NEW;

END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
    INSERT INTO public.profiles (
        id,
        email
    )
    VALUES (
        NEW.id,
        NEW.email
    );

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.process_pending_dues_notifications()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
    v_admin_id uuid;
BEGIN

    -- =========================================================
    -- STEP 1
    -- Send weekly reminder to users with negative net_balance
    -- Only if they have not received this reminder recently
    -- =========================================================

    INSERT INTO public.notifications
    (
        user_id,
        title,
        message,
        action_type,
        action_data,
        is_read
    )
    SELECT
        p.id,
        'PENDING_DUES_REMINDER',
        'Your dues are still pending. Please make the required payment as soon as possible.',
        'pending_dues_reminder',
        jsonb_build_object(
            'net_balance', p.net_balance
        ),
        false
    FROM public.profiles p
    WHERE p.net_balance < 0
      AND NOT EXISTS (
          SELECT 1
          FROM public.notifications n
          WHERE n.user_id = p.id
            AND n.action_type = 'pending_dues_reminder'
            AND n.created_at >= now() - INTERVAL '7 days'
      );


    -- =========================================================
    -- STEP 2
    -- Find one admin
    -- =========================================================

    SELECT id
    INTO v_admin_id
    FROM public.profiles
    WHERE role = 'admin'
    ORDER BY random()
    LIMIT 1;


    -- =========================================================
    -- STEP 3
    -- Notify an admin about users whose dues have remained
    -- pending for at least one month
    --
    -- We consider a user eligible if they have received a
    -- pending-dues reminder at least 28 days ago and still
    -- have a negative balance.
    -- =========================================================

    IF v_admin_id IS NOT NULL THEN

        INSERT INTO public.notifications
        (
            user_id,
            title,
            message,
            action_type,
            action_data,
            is_read
        )
        SELECT
            v_admin_id,
            'USER_PENDING_DUES_ESCALATION',
            'A user has outstanding dues that have remained unpaid for more than one month.',
            'user_pending_dues_escalation',
            jsonb_build_object(
                'user_id', p.id,
                'net_balance', p.net_balance,
                'email', p.email,
                'full_name', p.full_name
            ),
            false
        FROM public.profiles p
        WHERE p.net_balance < 0

          -- User has had a dues reminder for at least 28 days
          AND EXISTS (
              SELECT 1
              FROM public.notifications n
              WHERE n.user_id = p.id
                AND n.action_type = 'pending_dues_reminder'
                AND n.created_at <= now() - INTERVAL '28 days'
          )

          -- Don't repeatedly notify the admin about the
          -- same user every time this function runs.
          AND NOT EXISTS (
              SELECT 1
              FROM public.notifications n
              WHERE n.user_id = v_admin_id
                AND n.action_type = 'user_pending_dues_escalation'
                AND n.action_data->>'user_id' = p.id::text
                AND n.created_at >= now() - INTERVAL '28 days'
          );

    END IF;

END;
$function$;

CREATE OR REPLACE FUNCTION public.process_rental_time_notifications()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$DECLARE
    v_booking RECORD;
    v_now timestamptz := now();

    v_15_min_title "notification_title" := 'RENTAL_ENDING_SOON'::"notification_title";
    v_end_title "notification_title" := 'RENTAL_COMPLETED'::"notification_title";
    v_2_min_title "notification_title" := 'RETURN_DEADLINE_APPROACHING'::"notification_title";
    v_deadline_title "notification_title" := 'RETURN_DEADLINE_REACHED'::"notification_title";

    v_return_request_10_min_title "notification_title" := 'RETURN_REQUEST_DEADLINE_APPROACHING'::"notification_title";
    v_return_accept_10_min_title "notification_title" := 'RETURN_ACCEPT_DEADLINE_APPROACHING'::"notification_title";

BEGIN

    -- =========================================================
    -- Check ACTIVE and RETURN_PENDING bookings
    -- =========================================================

    FOR v_booking IN
        SELECT
            b.id AS booking_id,
            b.renter_id,
            b.owner_id,
            b.cycle_id,
            b.end_time,
            b.return_deadline,
            b.return_request_deadline,
            b.return_accept_deadline,
            b.status
        FROM public.booking_table b
        WHERE b.status::text IN ('active', 'return_pending')
    LOOP


        -- =====================================================
        -- 1. RENTAL ENDING IN 15 MINUTES
        -- ACTIVE BOOKINGS ONLY
        -- =====================================================

        IF v_booking.end_time IS NOT NULL
           AND v_now >= v_booking.end_time - interval '15 minutes'
           AND v_now < v_booking.end_time - interval '14 minutes'
        THEN

            -- Owner notification
            IF NOT EXISTS (
                SELECT 1
                FROM public.notifications n
                WHERE n.user_id = v_booking.owner_id
                  AND n.title = v_15_min_title
                  AND n.action_data->>'booking_id'
                      = v_booking.booking_id::text
            )
            THEN

                INSERT INTO public.notifications (
                    user_id,
                    title,
                    message,
                    action_type,
                    action_data,
                    is_read
                )
                VALUES (
                    v_booking.owner_id,
                    v_15_min_title,
                    'Your rental is about to end. Please be ready to collect your cycle from the renter.',
                    'NONE',
                    jsonb_build_object(
                        'booking_id', v_booking.booking_id,
                        'cycle_id', v_booking.cycle_id,
                        'renter_id', v_booking.renter_id,
                        'owner_id', v_booking.owner_id
                    ),
                    false
                );

            END IF;


            -- Renter notification
            IF NOT EXISTS (
                SELECT 1
                FROM public.notifications n
                WHERE n.user_id = v_booking.renter_id
                  AND n.title = v_15_min_title
                  AND n.action_data->>'booking_id'
                      = v_booking.booking_id::text
            )
            THEN

                INSERT INTO public.notifications (
                    user_id,
                    title,
                    message,
                    action_type,
                    action_data,
                    is_read
                )
                VALUES (
                    v_booking.renter_id,
                    v_15_min_title,
                    'Your rental is about to end. Please return the cycle before your rental ends.',
                    'NONE',
                    jsonb_build_object(
                        'booking_id', v_booking.booking_id,
                        'cycle_id', v_booking.cycle_id,
                        'renter_id', v_booking.renter_id,
                        'owner_id', v_booking.owner_id
                    ),
                    false
                );

            END IF;

        END IF;


        -- =====================================================
        -- 2. RENTAL END TIME REACHED
        -- ACTIVE BOOKINGS ONLY
        -- =====================================================

        IF v_booking.end_time IS NOT NULL
           AND v_now >= v_booking.end_time
           AND v_now < v_booking.end_time + interval '1 minute'
        THEN

            -- Owner notification
            IF NOT EXISTS (
                SELECT 1
                FROM public.notifications n
                WHERE n.user_id = v_booking.owner_id
                  AND n.title = v_end_title
                  AND n.action_data->>'booking_id'
                      = v_booking.booking_id::text
            )
            THEN

                INSERT INTO public.notifications (
                    user_id,
                    title,
                    message,
                    action_type,
                    action_data,
                    is_read
                )
                VALUES (
                    v_booking.owner_id,
                    v_end_title,
                    'Your rental has been completed. You can be ready to collect your cycle. You can contact your renter through the chat box in the ongoing rental session.',
                    'NONE',
                    jsonb_build_object(
                        'booking_id', v_booking.booking_id,
                        'cycle_id', v_booking.cycle_id,
                        'renter_id', v_booking.renter_id,
                        'owner_id', v_booking.owner_id
                    ),
                    false
                );

            END IF;


            -- Renter notification
            IF NOT EXISTS (
                SELECT 1
                FROM public.notifications n
                WHERE n.user_id = v_booking.renter_id
                  AND n.title = v_end_title
                  AND n.action_data->>'booking_id'
                      = v_booking.booking_id::text
            )
            THEN

                INSERT INTO public.notifications (
                    user_id,
                    title,
                    message,
                    action_type,
                    action_data,
                    is_read
                )
                VALUES (
                    v_booking.renter_id,
                    v_end_title,
                    'Your rental has been completed. You have a 10-minute grace period to return the cycle online through Ongoing Rentals. If you do not return it within the grace period, you will be charged ₹2 per minute.',
                    'NONE',
                    jsonb_build_object(
                        'booking_id', v_booking.booking_id,
                        'cycle_id', v_booking.cycle_id,
                        'renter_id', v_booking.renter_id,
                        'owner_id', v_booking.owner_id
                    ),
                    false
                );

            END IF;

        END IF;


        -- =====================================================
        -- 3. TWO MINUTES BEFORE RETURN DEADLINE
        -- ACTIVE ONLY
        -- =====================================================

        IF v_booking.return_deadline IS NOT NULL
           AND v_now >= v_booking.return_deadline - interval '2 minutes'
           AND v_now < v_booking.return_deadline - interval '1 minute'
           AND v_booking.status::text = 'active'
        THEN

            IF NOT EXISTS (
                SELECT 1
                FROM public.notifications n
                WHERE n.user_id = v_booking.renter_id
                  AND n.title = v_2_min_title
                  AND n.action_data->>'booking_id'
                      = v_booking.booking_id::text
            )
            THEN

                INSERT INTO public.notifications (
                    user_id,
                    title,
                    message,
                    action_type,
                    action_data,
                    is_read
                )
                VALUES (
                    v_booking.renter_id,
                    v_2_min_title,
                    'You have only 2 minutes remaining to return the cycle online. Please complete the return now to avoid any charges.',
                    'NONE',
                    jsonb_build_object(
                        'booking_id', v_booking.booking_id,
                        'cycle_id', v_booking.cycle_id,
                        'renter_id', v_booking.renter_id,
                        'owner_id', v_booking.owner_id
                    ),
                    false
                );

            END IF;

        END IF;


        -- =====================================================
        -- 4. RETURN DEADLINE REACHED
        -- ACTIVE ONLY
        -- =====================================================

        IF v_booking.return_deadline IS NOT NULL
           AND v_now >= v_booking.return_deadline
           AND v_now < v_booking.return_deadline + interval '1 minute'
           AND v_booking.status::text = 'active'
        THEN

            IF NOT EXISTS (
                SELECT 1
                FROM public.notifications n
                WHERE n.user_id = v_booking.renter_id
                  AND n.title = v_deadline_title
                  AND n.action_data->>'booking_id'
                      = v_booking.booking_id::text
            )
            THEN

                INSERT INTO public.notifications (
                    user_id,
                    title,
                    message,
                    action_type,
                    action_data,
                    is_read
                )
                VALUES (
                    v_booking.renter_id,
                    v_deadline_title,
                    'Your return deadline has been reached. Please return the cycle immediately. Further delays may result in additional charges.',
                    'NONE',
                    jsonb_build_object(
                        'booking_id', v_booking.booking_id,
                        'cycle_id', v_booking.cycle_id,
                        'renter_id', v_booking.renter_id,
                        'owner_id', v_booking.owner_id
                    ),
                    false
                );

            END IF;

        END IF;


        -- =====================================================
        -- 5. OWNER - 10 MINUTES BEFORE RETURN REQUEST DEADLINE
        -- RETURN_PENDING ONLY
        -- =====================================================

        IF v_booking.return_request_deadline IS NOT NULL
           AND v_now >= v_booking.return_request_deadline - interval '10 minutes'
           AND v_now < v_booking.return_request_deadline - interval '9 minutes'
           AND v_booking.status::text = 'return_pending'
        THEN

            IF NOT EXISTS (
                SELECT 1
                FROM public.notifications n
                WHERE n.user_id = v_booking.owner_id
                  AND n.title = v_return_request_10_min_title
                  AND n.action_data->>'booking_id'
                      = v_booking.booking_id::text
            )
            THEN

                INSERT INTO public.notifications (
                    user_id,
                    title,
                    message,
                    action_type,
                    action_data,
                    is_read
                )
                VALUES (
                    v_booking.owner_id,
                    v_return_request_10_min_title,
                    'The return request deadline is approaching. Please review and respond to the renter''s return request as soon as possible.',
                    'NONE',
                    jsonb_build_object(
                        'booking_id', v_booking.booking_id,
                        'cycle_id', v_booking.cycle_id,
                        'renter_id', v_booking.renter_id,
                        'owner_id', v_booking.owner_id
                    ),
                    false
                );

            END IF;

        END IF;


        -- =====================================================
        -- 6. RENTER - 10 MINUTES BEFORE RETURN ACCEPT DEADLINE
        -- RETURN_PENDING ONLY
        -- =====================================================

        IF v_booking.return_accept_deadline IS NOT NULL
           AND v_now >= v_booking.return_accept_deadline - interval '10 minutes'
           AND v_now < v_booking.return_accept_deadline - interval '9 minutes'
           AND v_booking.status::text = 'return_pending'
        THEN

            IF NOT EXISTS (
                SELECT 1
                FROM public.notifications n
                WHERE n.user_id = v_booking.renter_id
                  AND n.title = v_return_accept_10_min_title
                  AND n.action_data->>'booking_id'
                      = v_booking.booking_id::text
            )
            THEN

                INSERT INTO public.notifications (
                    user_id,
                    title,
                    message,
                    action_type,
                    action_data,
                    is_read
                )
                VALUES (
                    v_booking.renter_id,
                    v_return_accept_10_min_title,
                    'You have 10 more minutes to return the cycle. If you do not complete the return within this time, you will be charged an additional fine.',
                    'NONE',
                    jsonb_build_object(
                        'booking_id', v_booking.booking_id,
                        'cycle_id', v_booking.cycle_id,
                        'renter_id', v_booking.renter_id,
                        'owner_id', v_booking.owner_id
                    ),
                    false
                );

            END IF;

        END IF;

    END LOOP;

END;$function$;

CREATE OR REPLACE FUNCTION public.regenerate_pickup_otp (
  p_booking_id uuid
)
  RETURNS TABLE (
    success               boolean,
    message               text,
    pickup_otp            text,
    pickup_otp_expires_at timestamp with time zone
  )
  LANGUAGE plpgsql
  AS $function$
DECLARE
    v_otp text;
    v_expires_at timestamptz;
    v_owner_id uuid;
    v_renter_id uuid;
BEGIN

    -- Get owner and renter from the booking
    SELECT
        b.owner_id,
        b.renter_id
    INTO
        v_owner_id,
        v_renter_id
    FROM public.booking_table b
    WHERE b.id = p_booking_id;

    -- Check whether booking exists
    IF v_owner_id IS NULL OR v_renter_id IS NULL THEN
        RETURN QUERY
        SELECT
            false,
            'Booking not found or owner/renter information is missing',
            NULL::text,
            NULL::timestamptz;

        RETURN;
    END IF;

    -- Generate new 6-digit OTP
    v_otp := lpad(
        floor(random() * 1000000)::text,
        6,
        '0'
    );

    -- OTP expires after 15 minutes
    v_expires_at := now() + interval '15 minutes';

    -- Update booking with new OTP and expiry
    UPDATE public.booking_table
    SET
        pickup_otp = v_otp,
        pickup_otp_expires_at = v_expires_at,
        updated_at = now()
    WHERE id = p_booking_id;


    /*
     * UPDATE OWNER NOTIFICATION
     *
     * Find the existing OTP notification belonging
     * to this booking and owner.
     */
    UPDATE public.notifications
    SET
        title = 'RENTAL_OTP_GENERATED',
        message = 'The renter has arrived. Enter the new pickup OTP to verify the rental.',
        is_read = false,
        created_at = now(),
        action_data = jsonb_build_object(
            'booking_id', p_booking_id,
            'owner_id', v_owner_id,
            'renter_id', v_renter_id
        ),
        action_type = 'enter_rental_OTP'
    WHERE user_id = v_owner_id
      AND title = 'RENTAL_OTP_GENERATED'
      AND action_type = 'enter_rental_OTP'
      AND action_data->>'booking_id' = p_booking_id::text;


    /*
     * UPDATE RENTER NOTIFICATION
     *
     * Find the existing OTP notification belonging
     * to this booking and renter.
     */
    UPDATE public.notifications
    SET
        title = 'RENTAL_OTP_GENERATED',
        message = 'Your new pickup OTP is ' || v_otp,
        is_read = false,
        created_at = now(),
        action_data = jsonb_build_object(
            'booking_id', p_booking_id,
            'owner_id', v_owner_id,
            'renter_id', v_renter_id
        ),
        action_type = 'NONE'
    WHERE user_id = v_renter_id
      AND title = 'RENTAL_OTP_GENERATED'
      AND action_type = 'NONE'
      AND action_data->>'booking_id' = p_booking_id::text;


    -- Return result
    RETURN QUERY
    SELECT
        true,
        'Pickup OTP regenerated successfully',
        v_otp,
        v_expires_at;

END;
$function$;

CREATE OR REPLACE FUNCTION public.regenerate_return_otp (
  p_booking_id uuid
)
  RETURNS TABLE (
    success    boolean,
    message    text,
    otp        text,
    expires_at timestamp with time zone
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$

DECLARE
    v_otp text;
    v_expires_at timestamptz;
    v_owner_id uuid;
    v_renter_id uuid;

BEGIN

    -- =========================================================
    -- Get owner and renter from the booking
    -- =========================================================

    SELECT
        b.owner_id,
        b.renter_id
    INTO
        v_owner_id,
        v_renter_id
    FROM public.booking_table b
    WHERE b.id = p_booking_id
      AND b.status = 'return_pending';


    -- =========================================================
    -- Check whether booking exists and is return pending
    -- =========================================================

    IF v_owner_id IS NULL OR v_renter_id IS NULL THEN

        RETURN QUERY
        SELECT
            false,
            'Booking not found or is not return pending',
            NULL::text,
            NULL::timestamptz;

        RETURN;

    END IF;


    -- =========================================================
    -- Generate new 6-digit return OTP
    -- =========================================================

    v_otp := lpad(
        floor(random() * 1000000)::text,
        6,
        '0'
    );


    -- =========================================================
    -- OTP expires after 30 minutes
    -- =========================================================

    v_expires_at := now() + interval '30 minutes';


    -- =========================================================
    -- Update booking with new return OTP and expiry
    -- =========================================================

    UPDATE public.booking_table
    SET
        return_otp = v_otp,
        return_otp_expires_at = v_expires_at,
        updated_at = now()
    WHERE id = p_booking_id;


    -- =========================================================
    -- UPDATE OWNER NOTIFICATION
    -- =========================================================

    UPDATE public.notifications
    SET
        title = 'RETURN_OTP_GENERATED',

        message =
            'The renter is returning the cycle. Enter the new return OTP to verify the return.',

        is_read = false,

        created_at = now(),

        action_data = jsonb_build_object(
            'booking_id', p_booking_id,
            'owner_id', v_owner_id,
            'renter_id', v_renter_id
        ),

        action_type = 'enter_return_OTP'

    WHERE user_id = v_owner_id
      AND title = 'RETURN_OTP_GENERATED'
      AND action_type = 'enter_return_OTP'
      AND action_data->>'booking_id' = p_booking_id::text;


    -- =========================================================
    -- UPDATE RENTER NOTIFICATION
    -- =========================================================

    UPDATE public.notifications
    SET
        title = 'RETURN_OTP_GENERATED',

        message = 'Your new return OTP is ' || v_otp,

        is_read = false,

        created_at = now(),

        action_data = jsonb_build_object(
            'booking_id', p_booking_id,
            'owner_id', v_owner_id,
            'renter_id', v_renter_id
        ),

        action_type = 'NONE'

    WHERE user_id = v_renter_id
      AND title = 'RETURN_OTP_GENERATED'
      AND action_type = 'NONE'
      AND action_data->>'booking_id' = p_booking_id::text;


    -- =========================================================
    -- Return result
    -- =========================================================

    RETURN QUERY
    SELECT
        true,
        'Return OTP regenerated successfully',
        v_otp,
        v_expires_at;

END;

$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_cycle_availability_from_booking()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$BEGIN

    -- Booking status determines cycle availability
    IF NEW.status = 'slot_booked' THEN

        UPDATE public.cycle_availability
        SET
            status = 'booked',
            updated_at = now()
        WHERE cycle_id = NEW.cycle_id;

    ELSIF NEW.status IN (
        'active',
        'payment_pending',
        'return_pending',
        'payment_failed'
    ) THEN

        UPDATE public.cycle_availability
        SET
            status = 'rented',
            updated_at = now()
        WHERE cycle_id = NEW.cycle_id;

    ELSE

        UPDATE public.cycle_availability
        SET
            status = 'available',
            updated_at = now()
        WHERE cycle_id = NEW.cycle_id;

    END IF;

    RETURN NEW;

END;$function$;

CREATE OR REPLACE FUNCTION public.sync_cycle_status_from_availability()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN

    UPDATE public.cycles
    SET
        status =
            CASE NEW.status::text

                WHEN 'available' THEN 'available'::cycle_status
                WHEN 'unavailable' THEN 'unavailable'::cycle_status
                WHEN 'booked' THEN 'booked'::cycle_status
                WHEN 'rented' THEN 'rented'::cycle_status
                WHEN 'maintenance' THEN 'maintenance'::cycle_status
                WHEN 'retired' THEN 'retired'::cycle_status

                ELSE status

            END,
        updated_at = now()
    WHERE id = NEW.cycle_id;

    RETURN NEW;

END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_call_push()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
    request_id bigint;
    function_url text;
    service_role_key text;
BEGIN

    -- Only trigger for newly created calling sessions
    IF NEW.status = 'calling'
       AND NEW.caller_id IS NOT NULL THEN

        -- Get Edge Function URL from Vault
        SELECT decrypted_secret
        INTO function_url
        FROM vault.decrypted_secrets
        WHERE name = 'send_push_url'
        LIMIT 1;

        -- Get service-role key from Vault
        SELECT decrypted_secret
        INTO service_role_key
        FROM vault.decrypted_secrets
        WHERE name = 'send_push_service_role_key'
        LIMIT 1;

        IF function_url IS NULL THEN
            RAISE EXCEPTION
                'send_push_url secret not found in Vault';
        END IF;

        IF service_role_key IS NULL THEN
            RAISE EXCEPTION
                'send_push_service_role_key secret not found in Vault';
        END IF;

        -- Trigger Edge Function asynchronously
        SELECT net.http_post(
            url := function_url,

            headers := jsonb_build_object(
                'Content-Type',
                'application/json',
                'Authorization',
                'Bearer ' || service_role_key
            ),

            body := jsonb_build_object(
                'type', 'INSERT',
                'table', 'call_sessions',
                'schema', 'public',
                'record', to_jsonb(NEW),
                'old_record', NULL
            )
        )
        INTO request_id;

        RAISE LOG
            'Call push Edge Function triggered. request_id=%',
            request_id;

    END IF;

    RETURN NEW;

END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_send_push()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN

    PERFORM net.http_post(
        url := 'https://pddkgrveqwmeohxszuxr.supabase.co/functions/v1/send-push',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZGtncnZlcXdtZW9oeHN6dXhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE2MDk3OCwiZXhwIjoyMTAxNzM2OTc4fQ.C98JTM56u2g4-rvgoiLzaRD-UuFn03oEdztWYWby2Sw'
        ),
        body := jsonb_build_object(
            'user_id', NEW.user_id,
            'title', NEW.title,
            'message', NEW.message,
            'action_type', NEW.action_type,
            'action_data', COALESCE(NEW.action_data, '{}'::jsonb)
        )
    );

    RETURN NEW;

END;
$function$;

CREATE OR REPLACE FUNCTION public.update_chat_last_message()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN

    UPDATE public.chat_conversations
    SET
        last_message_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.conversation_id;

    RETURN NEW;

END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_pickup_otp (
  p_booking_id uuid,
  p_otp        text
)
  RETURNS TABLE (
    success boolean,
    message text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$DECLARE
    v_stored_otp text;
    v_expiry timestamptz;
    v_status text;
BEGIN

    -- Get OTP and booking information
    SELECT
        pickup_otp,
        pickup_otp_expires_at,
        status
    INTO
        v_stored_otp,
        v_expiry,
        v_status
    FROM public.booking_table
    WHERE id = p_booking_id;

    -- Booking doesn't exist
    IF v_stored_otp IS NULL THEN
        RETURN QUERY
        SELECT false, 'Booking or OTP not found';
        RETURN;
    END IF;

    -- Booking must be waiting for OTP verification
    IF v_status <> 'slot_booked' THEN
        RETURN QUERY
        SELECT false, 'Booking is not waiting for OTP verification';
        RETURN;
    END IF;

    -- Check OTP
    IF v_stored_otp <> p_otp THEN
        RETURN QUERY
        SELECT false, 'Incorrect OTP';
        RETURN;
    END IF;

    -- Check expiry
    IF now() > v_expiry THEN
        RETURN QUERY
        SELECT false, 'OTP has expired';
        RETURN;
    END IF;

    -- OTP is valid
    UPDATE public.booking_table
    SET
        status = 'payment_pending',
        updated_at = now()
    WHERE id = p_booking_id;

    RETURN QUERY
    SELECT true, 'OTP verified successfully';

END;$function$;

CREATE OR REPLACE FUNCTION public.verify_razorpay_payment (
  p_order_id       text,
  p_payment_id     text,
  p_amount         numeric,
  p_payment_status text
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_payment_id UUID;
    v_booking_id UUID;
    v_expected_amount NUMERIC;
BEGIN

    -- Find the payment record created during Workflow 1
    SELECT
        id,
        booking_id,
        amount
    INTO
        v_payment_id,
        v_booking_id,
        v_expected_amount
    FROM public.payment_table
    WHERE provider_order_id = p_order_id
    LIMIT 1;

    -- Payment/order doesn't exist
    IF v_payment_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Verify amount
    IF v_expected_amount <> p_amount THEN
        RETURN FALSE;
    END IF;

    -- Verify Razorpay payment status
    IF p_payment_status <> 'captured' THEN
        RETURN FALSE;
    END IF;

    -- Everything is valid
    UPDATE public.payment_table
    SET
        provider_payment_id = p_payment_id,
        status = 'paid',
        updated_at = now()
    WHERE id = v_payment_id;

    -- Confirm the booking
    UPDATE public.booking_table
    SET
        status = 'confirmed',
        updated_at = now()
    WHERE id = v_booking_id
      AND status = 'payment_pending';

    RETURN TRUE;

EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_return_otp (
  p_booking_id uuid,
  p_otp        text
)
  RETURNS TABLE (
    success boolean,
    message text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$

DECLARE
    v_stored_otp text;
    v_expiry timestamptz;
    v_status text;

BEGIN

    -- =========================================================
    -- Get return OTP and booking information
    -- =========================================================

    SELECT
        return_otp,
        return_otp_expires_at,
        status
    INTO
        v_stored_otp,
        v_expiry,
        v_status
    FROM public.booking_table
    WHERE id = p_booking_id;


    -- =========================================================
    -- Booking / OTP doesn't exist
    -- =========================================================

    IF v_stored_otp IS NULL THEN

        RETURN QUERY
        SELECT
            false,
            'Booking or return OTP not found';

        RETURN;

    END IF;


    -- =========================================================
    -- Booking must be waiting for return OTP verification
    -- =========================================================

    IF v_status <> 'return_pending' THEN

        RETURN QUERY
        SELECT
            false,
            'Booking is not waiting for return OTP verification';

        RETURN;

    END IF;


    -- =========================================================
    -- Check OTP
    -- =========================================================

    IF v_stored_otp <> p_otp THEN

        RETURN QUERY
        SELECT
            false,
            'Incorrect return OTP';

        RETURN;

    END IF;


    -- =========================================================
    -- Check OTP expiry
    -- =========================================================

    IF v_expiry IS NULL OR now() > v_expiry THEN

        RETURN QUERY
        SELECT
            false,
            'Return OTP has expired';

        RETURN;

    END IF;


    -- =========================================================
    -- Return OTP is valid
    -- Complete the booking
    -- =========================================================

    UPDATE public.booking_table
    SET
        status = 'completed',
        returned_at = now(),
        updated_at = now(),
        return_otp = NULL,
        return_otp_expires_at = NULL
    WHERE id = p_booking_id;


    -- =========================================================
    -- Success response
    -- =========================================================

    RETURN QUERY
    SELECT
        true,
        'Return OTP verified successfully. Booking completed.';


END;

$function$;

ALTER TABLE "public"."call_sessions"
  ADD CONSTRAINT "call_sessions_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES public.booking_table(id) ON DELETE CASCADE;

ALTER TABLE "public"."call_signals"
  ADD CONSTRAINT "call_signals_call_id_fkey" FOREIGN KEY (call_id) REFERENCES public.call_sessions(id) ON DELETE CASCADE;

ALTER TABLE "public"."chat_messages"
  ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;

ALTER TABLE "public"."booking_table"
  ADD CONSTRAINT "booking_table_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id);

ALTER TABLE "public"."cycle_availability"
  ADD CONSTRAINT "cycle_availability_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id) ON DELETE CASCADE;

ALTER TABLE "public"."cycle_images"
  ADD CONSTRAINT "cycle images_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."cycle_verification"
  ADD CONSTRAINT "cycle_verification_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id) ON DELETE CASCADE;

ALTER TABLE "public"."damage_reports_table"
  ADD CONSTRAINT "report_table_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES public.booking_table(id);

ALTER TABLE "public"."damage_reports_table"
  ADD CONSTRAINT "report_table_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id);

ALTER TABLE "public"."payment_table"
  ADD CONSTRAINT "payment_table_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES public.booking_table(id);

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."booking_table"
  ADD CONSTRAINT "booking_table_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES public.profiles(id);

ALTER TABLE "public"."booking_table"
  ADD CONSTRAINT "booking_table_reneter_id_fkey" FOREIGN KEY (renter_id) REFERENCES public.profiles(id);

ALTER TABLE "public"."call_sessions"
  ADD CONSTRAINT "call_sessions_caller_id_fkey" FOREIGN KEY (caller_id) REFERENCES public.profiles(id);

ALTER TABLE "public"."call_sessions"
  ADD CONSTRAINT "call_sessions_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."call_sessions"
  ADD CONSTRAINT "call_sessions_renter_id_fkey" FOREIGN KEY (renter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."call_signals"
  ADD CONSTRAINT "call_signals_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."chat_conversations"
  ADD CONSTRAINT "chat_conversations_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."chat_conversations"
  ADD CONSTRAINT "chat_conversations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."chat_messages"
  ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."cycle_verification"
  ADD CONSTRAINT "cycle_verification_assigned_admin_id_fkey" FOREIGN KEY (assigned_admin_id) REFERENCES public.profiles(id);

ALTER TABLE "public"."cycle_verification"
  ADD CONSTRAINT "cycle_verification_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."cycles"
  ADD CONSTRAINT "cycles_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."damage_reports_table"
  ADD CONSTRAINT "report_table_reported_by_fkey" FOREIGN KEY (reported_by) REFERENCES public.profiles(id);

ALTER TABLE "public"."notifications"
  ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."payment_table"
  ADD CONSTRAINT "payment_table_renter_id_fkey" FOREIGN KEY (renter_id) REFERENCES public.profiles(id);

ALTER TABLE "public"."push_subscriptions"
  ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."reports"
  ADD CONSTRAINT "reports_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES public.booking_table(id) ON DELETE SET NULL;

ALTER TABLE "public"."reports"
  ADD CONSTRAINT "reports_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id) ON DELETE SET NULL;

ALTER TABLE "public"."reports"
  ADD CONSTRAINT "reports_reported_by_fkey" FOREIGN KEY (reported_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."reports"
  ADD CONSTRAINT "reports_reported_user_id_fkey" FOREIGN KEY (reported_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."reports"
  ADD CONSTRAINT "reports_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES public.booking_table(id) ON DELETE CASCADE;

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id) ON DELETE CASCADE;

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_reviewee_id_fkey" FOREIGN KEY (reviewee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."withdrawal"
  ADD CONSTRAINT "withdrawal_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id);

CREATE INDEX cycle_verification_assigned_admin_id_idx ON public.cycle_verification USING btree (assigned_admin_id);

CREATE INDEX idx_chat_conversations_last_message ON public.chat_conversations USING btree (last_message_at DESC);

CREATE INDEX idx_chat_conversations_owner ON public.chat_conversations USING btree (owner_id);

CREATE INDEX idx_chat_conversations_user ON public.chat_conversations USING btree (user_id);

CREATE INDEX idx_chat_messages_conversation ON public.chat_messages USING btree (conversation_id, created_at);

CREATE INDEX idx_chat_messages_sender ON public.chat_messages USING btree (sender_id);

CREATE INDEX reports_booking_idx ON public.reports USING btree (booking_id);

CREATE INDEX reports_created_at_idx ON public.reports USING btree (created_at DESC);

CREATE INDEX reports_cycle_idx ON public.reports USING btree (cycle_id);

CREATE INDEX reports_reported_by_idx ON public.reports USING btree (reported_by);

CREATE INDEX reports_reported_user_idx ON public.reports USING btree (reported_user_id);

CREATE INDEX reports_status_idx ON public.reports USING btree (status);

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER sync_cycle_availability_from_booking_trigger
  AFTER INSERT OR UPDATE OF status ON public.booking_table
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_cycle_availability_from_booking();

CREATE TRIGGER trg_clear_rental_decision_on_booking_status_change
  AFTER UPDATE OF status ON public.booking_table
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_rental_decision_on_booking_completion();

CREATE TRIGGER call_sessions_push_trigger
  AFTER INSERT ON public.call_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_call_push();

CREATE TRIGGER update_chat_last_message_trigger
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_last_message();

CREATE TRIGGER sync_cycle_status_from_availability_trigger
  AFTER INSERT OR UPDATE OF status ON public.cycle_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_cycle_status_from_availability();

CREATE TRIGGER cycle_verification_available_trigger
  AFTER UPDATE OF status ON public.cycle_verification
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_cycle_verification_available();

CREATE TRIGGER trigger_notification_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_send_push();

CREATE POLICY "Admins can view all bookings" ON "public"."booking_table"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles admin_profile
  WHERE ((admin_profile.id = auth.uid()) AND (admin_profile.role = 'admin'::public.role)))));

CREATE POLICY "Users can delete their own bookings" ON "public"."booking_table"
  FOR DELETE
  TO "authenticated"
  USING (((auth.uid() = renter_id) OR (auth.uid() = owner_id)));

CREATE POLICY "only render and buyer can see" ON "public"."booking_table"
  FOR SELECT
  TO "authenticated"
  USING (((renter_id = auth.uid()) OR (owner_id = auth.uid())));

CREATE POLICY "Participants can create calls" ON "public"."call_sessions"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((auth.uid() = renter_id) OR (auth.uid() = owner_id)));

CREATE POLICY "Participants can update calls" ON "public"."call_sessions"
  FOR UPDATE
  TO "authenticated"
  USING (((auth.uid() = renter_id) OR (auth.uid() = owner_id)))
  WITH CHECK (((auth.uid() = renter_id) OR (auth.uid() = owner_id)));

CREATE POLICY "Participants can view their calls" ON "public"."call_sessions"
  FOR SELECT
  TO "authenticated"
  USING (((auth.uid() = renter_id) OR (auth.uid() = owner_id)));

CREATE POLICY "Call participants can read signals" ON "public"."call_signals"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.call_sessions c
  WHERE ((c.id = call_signals.call_id) AND ((c.renter_id = auth.uid()) OR (c.owner_id = auth.uid()))))));

CREATE POLICY "Call participants can send signals" ON "public"."call_signals"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((sender_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.call_sessions c
  WHERE ((c.id = call_signals.call_id) AND ((c.renter_id = auth.uid()) OR (c.owner_id = auth.uid())))))));

CREATE POLICY "chat_conversations_insert_participant" ON "public"."chat_conversations"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((auth.uid() = user_id) OR (auth.uid() = owner_id)));

CREATE POLICY "chat_conversations_select_participants" ON "public"."chat_conversations"
  FOR SELECT
  TO "authenticated"
  USING (((auth.uid() = user_id) OR (auth.uid() = owner_id)));

CREATE POLICY "chat_conversations_update_participants" ON "public"."chat_conversations"
  FOR UPDATE
  TO "authenticated"
  USING (((auth.uid() = user_id) OR (auth.uid() = owner_id)))
  WITH CHECK (((auth.uid() = user_id) OR (auth.uid() = owner_id)));

CREATE POLICY "chat_messages_insert_participant" ON "public"."chat_messages"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((sender_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.chat_conversations c
  WHERE ((c.id = chat_messages.conversation_id) AND ((c.user_id = auth.uid()) OR (c.owner_id = auth.uid())))))));

CREATE POLICY "chat_messages_select_participants" ON "public"."chat_messages"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.chat_conversations c
  WHERE ((c.id = chat_messages.conversation_id) AND ((c.user_id = auth.uid()) OR (c.owner_id = auth.uid()))))));

CREATE POLICY "chat_messages_update_participants" ON "public"."chat_messages"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.chat_conversations c
  WHERE ((c.id = chat_messages.conversation_id) AND ((c.user_id = auth.uid()) OR (c.owner_id = auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.chat_conversations c
  WHERE ((c.id = chat_messages.conversation_id) AND ((c.user_id = auth.uid()) OR (c.owner_id = auth.uid()))))));

CREATE POLICY "Anyone can view cycle availability" ON "public"."cycle_availability"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "Owners can update their cycle availability" ON "public"."cycle_availability"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.cycles c
  WHERE ((c.id = cycle_availability.cycle_id) AND (c.owner_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.cycles c
  WHERE ((c.id = cycle_availability.cycle_id) AND (c.owner_id = auth.uid())))));

CREATE POLICY "anyone can view cycle image records" ON "public"."cycle_images"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "authenticated users can delete cycle image records" ON "public"."cycle_images"
  FOR DELETE
  TO "authenticated"
  USING (true);

CREATE POLICY "authenticated users can insert cycle images" ON "public"."cycle_images"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (true);

CREATE POLICY "authenticated users can update cycle image records" ON "public"."cycle_images"
  FOR UPDATE
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view cycles" ON "public"."cycles"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "Owners can delete their own cycles" ON "public"."cycles"
  FOR DELETE
  TO "authenticated"
  USING ((auth.uid() = owner_id));

CREATE POLICY "Owners can update their own cycles" ON "public"."cycles"
  FOR UPDATE
  TO "authenticated"
  USING ((auth.uid() = owner_id))
  WITH CHECK ((auth.uid() = owner_id));

CREATE POLICY "Users can insert their own cycles" ON "public"."cycles"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((auth.uid() = owner_id));

CREATE POLICY "Users can update own notifications" ON "public"."notifications"
  FOR UPDATE
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view own notifications" ON "public"."notifications"
  FOR SELECT
  TO "authenticated"
  USING ((auth.uid() = user_id));

CREATE POLICY "users can delete their nottifications" ON "public"."notifications"
  FOR DELETE
  TO "authenticated"
  USING ((auth.uid() = user_id));

CREATE POLICY "renter can view own payments" ON "public"."payment_table"
  FOR SELECT
  TO "authenticated"
  USING ((renter_id = auth.uid()));

CREATE POLICY "Admins can view all profiles" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (public.is_admin());

CREATE POLICY "Authenticated users can view all profiles" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Users can update own profile" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ((auth.uid() = id))
  WITH CHECK ((auth.uid() = id));

CREATE POLICY "Users can delete their own push subscriptions" ON "public"."push_subscriptions"
  FOR DELETE
  TO "authenticated"
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert their own push subscriptions" ON "public"."push_subscriptions"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update their own push subscriptions" ON "public"."push_subscriptions"
  FOR UPDATE
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own push subscriptions" ON "public"."push_subscriptions"
  FOR SELECT
  TO "authenticated"
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins can delete reports" ON "public"."reports"
  FOR DELETE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::public.role)))));

CREATE POLICY "Admins can update reports" ON "public"."reports"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::public.role)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::public.role)))));

CREATE POLICY "Admins can view all reports" ON "public"."reports"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::public.role)))));

CREATE POLICY "Users can create their own reports" ON "public"."reports"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((auth.uid() = reported_by));

CREATE POLICY "Users can submit reports" ON "public"."reports"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((reported_by = auth.uid()));

CREATE POLICY "Users can view their own reports" ON "public"."reports"
  FOR SELECT
  TO "authenticated"
  USING ((reported_by = auth.uid()));

CREATE POLICY "Anyone can view reviews" ON "public"."reviews"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "Owner can review renter" ON "public"."reviews"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((reviewer_id = auth.uid()) AND (review_type = 'user'::text) AND (reviewee_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.booking_table b
  WHERE ((b.id = reviews.booking_id) AND (b.owner_id = auth.uid()) AND (b.renter_id = reviews.reviewee_id) AND (b.cycle_id = reviews.cycle_id) AND (b.returned_at IS NOT NULL))))));

CREATE POLICY "Renter can review cycle" ON "public"."reviews"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((reviewer_id = auth.uid()) AND (review_type = 'cycle'::text) AND (reviewee_id IS NULL) AND (EXISTS ( SELECT 1
   FROM public.booking_table b
  WHERE ((b.id = reviews.booking_id) AND (b.renter_id = auth.uid()) AND (b.cycle_id = reviews.cycle_id) AND (b.returned_at IS NOT NULL))))));

CREATE POLICY "Authenticated users can delete return images" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING ((bucket_id = 'return-images'::text));

CREATE POLICY "Authenticated users can update return images" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING ((bucket_id = 'return-images'::text))
  WITH CHECK ((bucket_id = 'return-images'::text));

CREATE POLICY "Authenticated users can upload return images" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((bucket_id = 'return-images'::text));

CREATE POLICY "Users can delete own profile image" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'profile-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can update own profile image" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'profile-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
  WITH CHECK (((bucket_id = 'profile-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can upload own profile image" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'profile-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can view profile images" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING ((bucket_id = 'profile-images'::text));

CREATE POLICY "authenticated users can delete cycle images" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING ((bucket_id = 'cycle-images'::text));

CREATE POLICY "authenticated users can update cycle images" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING ((bucket_id = 'cycle-images'::text))
  WITH CHECK ((bucket_id = 'cycle-images'::text));

CREATE POLICY "authenticated users can upload cycle images" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((bucket_id = 'cycle-images'::text));

CREATE POLICY "authenticated users can view cycle images" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING ((bucket_id = 'cycle-images'::text));

CREATE EVENT TRIGGER "ensure_rls"
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION "public"."rls_auto_enable"();

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."call_sessions";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."call_signals";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."chat_messages";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."notifications";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."payment_table";

COMMENT ON COLUMN "public"."booking_table"."no_of_days" IS 'it stores the no of days the students have asked the cycle for';

COMMENT ON COLUMN "public"."booking_table"."no_of_hours" IS 'this stores the no of hours the renter has requested for the cycle';

COMMENT ON COLUMN "public"."cycles"."rating" IS 'it stores the rating of the cycle';

COMMENT ON EXTENSION "hypopg" IS 'Hypothetical indexes for PostgreSQL';

COMMENT ON EXTENSION "index_advisor" IS 'Query index advisor';

COMMENT ON EXTENSION "pg_cron" IS 'Job scheduler for PostgreSQL';

COMMENT ON EXTENSION "pg_net" IS 'Async HTTP';

COMMENT ON TABLE "public"."profiles" IS 'stores data of students common for both admin and students';

GRANT EXECUTE ON FUNCTION "public"."book_cycle_slot"(uuid) TO PUBLIC, "postgres";

REVOKE ALL ON FUNCTION "public"."check_nitk_email"(jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."check_nitk_email"(jsonb) TO "postgres", "supabase_auth_admin";

GRANT EXECUTE ON FUNCTION "public"."clear_rental_decision_on_booking_completion"() TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."deduct_overdue_rental_fee"() TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."expire_old_booking_requests"() TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."generate_pickup_otp"(uuid) TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."generate_return_otp"(uuid) TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_booking_cancellation"(uuid, uuid) TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_cycle_verification_available"() TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."process_pending_dues_notifications"() TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."process_rental_time_notifications"() TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."regenerate_pickup_otp"(uuid) TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."regenerate_return_otp"(uuid) TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."sync_cycle_availability_from_booking"() TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."sync_cycle_status_from_availability"() TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."trigger_call_push"() TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."trigger_send_push"() TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."update_chat_last_message"() TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."verify_pickup_otp"(uuid, text) TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."verify_razorpay_payment"(text, text, numeric, text) TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."verify_return_otp"(uuid, text) TO PUBLIC, "postgres";

REVOKE ALL ON SCHEMA "public" FROM "supabase_auth_admin";

GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."booking_table" TO "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."booking_table" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."booking_table" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."booking_table" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."call_sessions" TO "anon";

GRANT INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."call_sessions" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."call_sessions" TO "postgres", "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."call_signals" TO "anon";

GRANT INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."call_signals" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."call_signals" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."call_signals" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."chat_conversations" TO "anon";

GRANT INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."chat_conversations" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."chat_conversations" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."chat_conversations" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."chat_messages" TO "anon";

GRANT INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."chat_messages" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."chat_messages" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."chat_messages" TO "service_role";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."cycle_availability" TO "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cycle_availability" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cycle_availability" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."cycle_availability" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cycle_images" TO "anon", "authenticated", "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."cycle_images" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."cycle_verification" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cycle_verification" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."cycle_verification" TO "service_role";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."cycles" TO "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cycles" TO "authenticated", "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."cycles" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."damage_reports_table" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."damage_reports_table" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."damage_reports_table" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."notifications" TO "anon";

GRANT DELETE, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notifications" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notifications" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."notifications" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."payment_table" TO "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."payment_table" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."payment_table" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."payment_table" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."profiles" TO "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."profiles" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."push_subscriptions" TO "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."push_subscriptions" TO "authenticated", "postgres";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."push_subscriptions" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."reports" TO "anon";

GRANT INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."reports" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."reports" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."reports" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."reviews" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."reviews" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."reviews" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."withdrawal" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."withdrawal" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."withdrawal" TO "service_role";

GRANT USAGE ON TYPE "public"."action types" TO "postgres";

GRANT USAGE ON TYPE "public"."booking status" TO "postgres";

GRANT USAGE ON TYPE "public"."cycle_available_status" TO "postgres";

GRANT USAGE ON TYPE "public"."cycle_status" TO "postgres";

GRANT USAGE ON TYPE "public"."cycle_verification_status" TO "postgres";

GRANT USAGE ON TYPE "public"."notification_title" TO "postgres";

GRANT USAGE ON TYPE "public"."role" TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLES TO "service_role";

SELECT cron.schedule_in_database('deduct-overdue-rental-fee', '* * * * *', 'SELECT public.deduct_overdue_rental_fee();', 'postgres', NULL, true);

SELECT cron.schedule_in_database('expire-old-booking-requests', '* * * * *', 'SELECT public.expire_old_booking_requests();', 'postgres', NULL, true);

SELECT cron.schedule_in_database('process-pending-dues-notifications', '0 9 * * 1', 'SELECT public.process_pending_dues_notifications();', 'postgres', NULL, true);

SELECT cron.schedule_in_database('process-rental-time-notifications', '* * * * *', 'SELECT public.process_rental_time_notifications();', 'postgres', NULL, true);

