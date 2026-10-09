--
-- PostgreSQL database dump
--

\restrict S8ta3IdcqGZnunfXW8pHbRhtcz9MQlJMuqDkVXsba98CpLeamIQYdeffm9u7joA

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    sequence_number bigint NOT NULL,
    id character varying(64) NOT NULL,
    actor_id text NOT NULL,
    actor_name text NOT NULL,
    actor_role text NOT NULL,
    action text NOT NULL,
    resource text NOT NULL,
    resource_id text NOT NULL,
    old_value jsonb,
    new_value jsonb,
    request_id text NOT NULL,
    ip_address text,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    previous_hash character varying(64) NOT NULL,
    hash character varying(64) NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_sequence_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_sequence_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_sequence_number_seq OWNER TO postgres;

--
-- Name: audit_logs_sequence_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_sequence_number_seq OWNED BY public.audit_logs.sequence_number;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id character varying(64) NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    icon text DEFAULT ''::text,
    item_count integer DEFAULT 0 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT categories_item_count_check CHECK ((item_count >= 0))
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: cod_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cod_transactions (
    id character varying(64) NOT NULL,
    order_id character varying(64) NOT NULL,
    order_number character varying(64) NOT NULL,
    delivery_partner_id character varying(64),
    amount_expected numeric(12,2) NOT NULL,
    amount_collected numeric(12,2) DEFAULT 0.00 NOT NULL,
    cash_tendered numeric(12,2),
    change_due numeric(12,2),
    collection_status character varying(32) DEFAULT 'PENDING'::character varying NOT NULL,
    settlement_status character varying(32) DEFAULT 'UNSETTLED'::character varying NOT NULL,
    collected_at timestamp with time zone,
    settled_at timestamp with time zone,
    settled_by character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cod_transactions_amount_collected_check CHECK ((amount_collected >= (0)::numeric)),
    CONSTRAINT cod_transactions_amount_expected_check CHECK ((amount_expected >= (0)::numeric)),
    CONSTRAINT cod_transactions_collection_status_check CHECK (((collection_status)::text = ANY ((ARRAY['PENDING'::character varying, 'COLLECTED'::character varying, 'FAILED'::character varying])::text[]))),
    CONSTRAINT cod_transactions_settlement_status_check CHECK (((settlement_status)::text = ANY ((ARRAY['UNSETTLED'::character varying, 'SETTLED'::character varying])::text[])))
);


ALTER TABLE public.cod_transactions OWNER TO postgres;

--
-- Name: customer_addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_addresses (
    id character varying(64) NOT NULL,
    customer_id character varying(64) NOT NULL,
    type character varying(32) DEFAULT 'HOME'::character varying NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    door_no text NOT NULL,
    street text NOT NULL,
    area text NOT NULL,
    city text NOT NULL,
    pincode text NOT NULL,
    landmark text DEFAULT ''::text,
    instructions text DEFAULT ''::text,
    coordinates text DEFAULT ''::text,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT customer_addresses_type_check CHECK (((type)::text = ANY ((ARRAY['HOME'::character varying, 'WORK'::character varying, 'OTHER'::character varying])::text[])))
);


ALTER TABLE public.customer_addresses OWNER TO postgres;

--
-- Name: delivery_batch_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_batch_orders (
    batch_id character varying(64) NOT NULL,
    order_id character varying(64) NOT NULL,
    sequence_order integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.delivery_batch_orders OWNER TO postgres;

--
-- Name: delivery_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_batches (
    id character varying(64) NOT NULL,
    batch_number character varying(64) NOT NULL,
    delivery_partner_id character varying(64),
    delivery_partner_name text NOT NULL,
    status character varying(32) DEFAULT 'ASSIGNED'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT delivery_batches_status_check CHECK (((status)::text = ANY ((ARRAY['ASSIGNED'::character varying, 'IN_TRANSIT'::character varying, 'COMPLETED'::character varying])::text[])))
);


ALTER TABLE public.delivery_batches OWNER TO postgres;

--
-- Name: idempotency_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.idempotency_records (
    key character varying(255) NOT NULL,
    request_path text NOT NULL,
    request_hash text NOT NULL,
    status character varying(32) NOT NULL,
    response_status integer,
    response_body jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT idempotency_records_status_check CHECK (((status)::text = ANY ((ARRAY['IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying])::text[])))
);


ALTER TABLE public.idempotency_records OWNER TO postgres;

--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_items (
    id character varying(64) NOT NULL,
    menu_item_id character varying(64) NOT NULL,
    available_quantity integer DEFAULT 100 NOT NULL,
    reserved_quantity integer DEFAULT 0 NOT NULL,
    low_stock_threshold integer DEFAULT 10 NOT NULL,
    is_unlimited boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inventory_items_available_quantity_check CHECK ((available_quantity >= 0)),
    CONSTRAINT inventory_items_low_stock_threshold_check CHECK ((low_stock_threshold >= 0)),
    CONSTRAINT inventory_items_reserved_quantity_check CHECK ((reserved_quantity >= 0))
);


ALTER TABLE public.inventory_items OWNER TO postgres;

--
-- Name: inventory_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_transactions (
    id bigint NOT NULL,
    menu_item_id character varying(64) NOT NULL,
    order_id character varying(64),
    change_quantity integer NOT NULL,
    balance_after integer NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inventory_transactions_balance_after_check CHECK ((balance_after >= 0))
);


ALTER TABLE public.inventory_transactions OWNER TO postgres;

--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_transactions_id_seq OWNER TO postgres;

--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_transactions_id_seq OWNED BY public.inventory_transactions.id;


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_items (
    id character varying(64) NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    category_id character varying(64) NOT NULL,
    category_name text NOT NULL,
    price numeric(12,2) NOT NULL,
    discount_price numeric(12,2),
    image_url text DEFAULT ''::text NOT NULL,
    is_veg boolean DEFAULT true NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    prep_time_minutes integer DEFAULT 15 NOT NULL,
    is_popular boolean DEFAULT false NOT NULL,
    is_bestseller boolean DEFAULT false NOT NULL,
    rating numeric(3,2) DEFAULT 5.00 NOT NULL,
    rating_count integer DEFAULT 0 NOT NULL,
    customizations jsonb DEFAULT '[]'::jsonb NOT NULL,
    addons jsonb DEFAULT '[]'::jsonb NOT NULL,
    ingredients jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT menu_items_check CHECK (((discount_price IS NULL) OR ((discount_price >= (0)::numeric) AND (discount_price <= price)))),
    CONSTRAINT menu_items_prep_time_minutes_check CHECK ((prep_time_minutes >= 0)),
    CONSTRAINT menu_items_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT menu_items_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= 5.00))),
    CONSTRAINT menu_items_rating_count_check CHECK ((rating_count >= 0))
);


ALTER TABLE public.menu_items OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    user_role character varying(32) NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type character varying(32) NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    order_id character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_type_check CHECK (((type)::text = ANY ((ARRAY['ORDER'::character varying, 'PAYMENT'::character varying, 'OFFER'::character varying, 'SYSTEM'::character varying])::text[])))
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: order_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_events (
    id character varying(64) NOT NULL,
    order_id character varying(64) NOT NULL,
    status character varying(32) NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text NOT NULL,
    changed_by_role character varying(32) NOT NULL
);


ALTER TABLE public.order_events OWNER TO postgres;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id bigint NOT NULL,
    order_id character varying(64) NOT NULL,
    menu_item_id character varying(64) NOT NULL,
    name text NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    quantity integer NOT NULL,
    is_veg boolean DEFAULT true NOT NULL,
    customizations jsonb DEFAULT '[]'::jsonb NOT NULL,
    addons jsonb DEFAULT '[]'::jsonb NOT NULL,
    special_instructions text DEFAULT ''::text,
    total_price numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_items_quantity_check CHECK ((quantity >= 1)),
    CONSTRAINT order_items_total_price_check CHECK ((total_price >= (0)::numeric)),
    CONSTRAINT order_items_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id character varying(64) NOT NULL,
    order_number character varying(64) NOT NULL,
    customer_id character varying(64),
    customer_name text NOT NULL,
    customer_phone text NOT NULL,
    delivery_address jsonb NOT NULL,
    order_notes text DEFAULT ''::text,
    subtotal numeric(12,2) NOT NULL,
    delivery_fee numeric(12,2) DEFAULT 0.00 NOT NULL,
    tax numeric(12,2) DEFAULT 0.00 NOT NULL,
    discount numeric(12,2) DEFAULT 0.00 NOT NULL,
    grand_total numeric(12,2) NOT NULL,
    payment_method character varying(32) NOT NULL,
    payment_status character varying(32) NOT NULL,
    payment_transaction_id text,
    cod_cash_tendered numeric(12,2),
    cod_change_due numeric(12,2),
    status character varying(32) NOT NULL,
    rejection_reason text,
    cancellation_reason text,
    assigned_staff_id character varying(64),
    assigned_staff_name text,
    assigned_delivery_partner_id character varying(64),
    assigned_delivery_partner_name text,
    assigned_delivery_partner_phone text,
    assigned_delivery_partner_vehicle text,
    batch_id character varying(64),
    checklist jsonb,
    scheduled_slot jsonb,
    has_been_reviewed boolean DEFAULT false NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    accepted_at timestamp with time zone,
    preparing_at timestamp with time zone,
    ready_at timestamp with time zone,
    picked_up_at timestamp with time zone,
    delivered_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT orders_cod_cash_tendered_check CHECK (((cod_cash_tendered IS NULL) OR (cod_cash_tendered >= (0)::numeric))),
    CONSTRAINT orders_cod_change_due_check CHECK (((cod_change_due IS NULL) OR (cod_change_due >= (0)::numeric))),
    CONSTRAINT orders_delivery_fee_check CHECK ((delivery_fee >= (0)::numeric)),
    CONSTRAINT orders_discount_check CHECK ((discount >= (0)::numeric)),
    CONSTRAINT orders_grand_total_check CHECK ((grand_total >= (0)::numeric)),
    CONSTRAINT orders_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['ONLINE'::character varying, 'COD'::character varying])::text[]))),
    CONSTRAINT orders_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['PENDING'::character varying, 'VERIFIED'::character varying, 'COD_PENDING'::character varying, 'PAID_CASH'::character varying, 'FAILED'::character varying, 'REFUNDED'::character varying])::text[]))),
    CONSTRAINT orders_status_check CHECK (((status)::text = ANY ((ARRAY['PLACED'::character varying, 'ACCEPTED'::character varying, 'REJECTED'::character varying, 'PREPARING'::character varying, 'READY'::character varying, 'ASSIGNED'::character varying, 'PICKED_UP'::character varying, 'OUT_FOR_DELIVERY'::character varying, 'DELIVERED'::character varying, 'CANCELLED'::character varying])::text[]))),
    CONSTRAINT orders_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT orders_tax_check CHECK ((tax >= (0)::numeric)),
    CONSTRAINT orders_version_check CHECK ((version >= 1))
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: outbox_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.outbox_events (
    id character varying(64) NOT NULL,
    aggregate_type character varying(64) NOT NULL,
    aggregate_id character varying(64) NOT NULL,
    event_type character varying(64) NOT NULL,
    payload jsonb NOT NULL,
    status character varying(32) DEFAULT 'PENDING'::character varying NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    last_error text,
    processing_started_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    next_retry_at timestamp with time zone,
    CONSTRAINT outbox_events_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'PROCESSING'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying, 'DEAD_LETTER'::character varying])::text[])))
);


ALTER TABLE public.outbox_events OWNER TO postgres;

--
-- Name: restaurant_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.restaurant_settings (
    id character varying(64) DEFAULT 'rest_hunter_01'::character varying NOT NULL,
    restaurant_name text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    address text NOT NULL,
    is_open boolean DEFAULT true NOT NULL,
    temporary_pause boolean DEFAULT false NOT NULL,
    pause_reason text DEFAULT ''::text,
    opening_time text DEFAULT '11:00 AM'::text NOT NULL,
    closing_time text DEFAULT '11:00 PM'::text NOT NULL,
    delivery_radius_km numeric(6,2) DEFAULT 10.00 NOT NULL,
    base_delivery_fee numeric(12,2) DEFAULT 35.00 NOT NULL,
    free_delivery_threshold numeric(12,2) DEFAULT 500.00 NOT NULL,
    cod_enabled boolean DEFAULT true NOT NULL,
    online_payment_enabled boolean DEFAULT true NOT NULL,
    announcement text DEFAULT ''::text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.restaurant_settings OWNER TO postgres;

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    id character varying(64) NOT NULL,
    order_id character varying(64) NOT NULL,
    order_number character varying(64) NOT NULL,
    customer_id character varying(64),
    customer_name text NOT NULL,
    food_rating numeric(2,1) NOT NULL,
    delivery_rating numeric(2,1) NOT NULL,
    overall_rating numeric(2,1) NOT NULL,
    comment text DEFAULT ''::text,
    item_ratings jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_delivery_rating_check CHECK (((delivery_rating >= 1.0) AND (delivery_rating <= 5.0))),
    CONSTRAINT reviews_food_rating_check CHECK (((food_rating >= 1.0) AND (food_rating <= 5.0))),
    CONSTRAINT reviews_overall_rating_check CHECK (((overall_rating >= 1.0) AND (overall_rating <= 5.0)))
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schema_migrations (
    version character varying(255) NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.schema_migrations OWNER TO postgres;

--
-- Name: user_auth_credentials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_auth_credentials (
    user_id character varying(64) NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    reset_password_token text,
    reset_password_expires timestamp with time zone,
    invite_token text,
    invite_expires timestamp with time zone,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    last_failed_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_auth_credentials OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id character varying(64) NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    role character varying(32) NOT NULL,
    staff_role character varying(32),
    avatar text,
    status character varying(32) DEFAULT 'ACTIVE'::character varying NOT NULL,
    partner_status character varying(32) DEFAULT 'OFFLINE'::character varying,
    vehicle_number text,
    vehicle_type text,
    current_rating numeric(3,2) DEFAULT 5.00,
    total_deliveries integer DEFAULT 0 NOT NULL,
    permissions jsonb DEFAULT '[]'::jsonb NOT NULL,
    restaurant_id character varying(64) DEFAULT 'rest_hunter_01'::character varying,
    google_id text,
    email_verified boolean DEFAULT false NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_current_rating_check CHECK (((current_rating >= (0)::numeric) AND (current_rating <= 5.00))),
    CONSTRAINT users_partner_status_check CHECK (((partner_status IS NULL) OR ((partner_status)::text = ANY ((ARRAY['ONLINE'::character varying, 'OFFLINE'::character varying])::text[])))),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['CUSTOMER'::character varying, 'STAFF'::character varying, 'ADMIN'::character varying, 'OWNER'::character varying, 'DELIVERY_PARTNER'::character varying])::text[]))),
    CONSTRAINT users_staff_role_check CHECK (((staff_role IS NULL) OR ((staff_role)::text = ANY ((ARRAY['KITCHEN_STAFF'::character varying, 'GENERAL_MANAGER'::character varying, 'STAFF'::character varying, 'KITCHEN_MANAGER'::character varying, 'HEAD_CHEF'::character varying, 'LINE_COOK'::character varying, 'FRONT_DESK'::character varying, 'KITCHEN_CHEF'::character varying, 'ORDER_BILLER'::character varying, 'STORE_DISPATCHER'::character varying])::text[])))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'INACTIVE'::character varying, 'INVITED'::character varying, 'SUSPENDED'::character varying])::text[]))),
    CONSTRAINT users_total_deliveries_check CHECK ((total_deliveries >= 0))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: audit_logs sequence_number; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN sequence_number SET DEFAULT nextval('public.audit_logs_sequence_number_seq'::regclass);


--
-- Name: inventory_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions ALTER COLUMN id SET DEFAULT nextval('public.inventory_transactions_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (sequence_number, id, actor_id, actor_name, actor_role, action, resource, resource_id, old_value, new_value, request_id, ip_address, "timestamp", previous_hash, hash) FROM stdin;
2	audit_1791013763500_uhkt6	usr_owner_1	Hunter's Kitchen	OWNER	LOGIN_FAILED	AUTH	hunterkitchen777@gmail.com	null	{"reason": "INVALID_CREDENTIALS"}	req_1791013762419_26xcbb	127.0.0.1	2026-10-03 13:19:23.5+05:30	a6b18cf73ed703a733e2e622326174ea9b183863290b2ebbe67e9793303596a9	d52d78e7419cc49a93e801e9af0f268b5365fd04e44a301584fc36e42b4fd34f
3	audit_1791013771810_p7bgn	usr_owner_1	Hunter's Kitchen	OWNER	LOGIN_FAILED	AUTH	hunterkitchen777@gmail.com	null	{"reason": "INVALID_CREDENTIALS"}	req_1791013770617_l2myz3	127.0.0.1	2026-10-03 13:19:31.81+05:30	d52d78e7419cc49a93e801e9af0f268b5365fd04e44a301584fc36e42b4fd34f	f68d3cc45b30f3e4345db62dfb0ded7f68529c52633c96c4e9ff8db33f2c6472
1	audit_1791013759238_s3weo	usr_owner_1	Hunter's Kitchen	OWNER	LOGIN_FAILED	AUTH	hunterkitchen777@gmail.com	null	{"reason": "INVALID_CREDENTIALS"}	req_1791013758061_g2ktcu	127.0.0.1	2026-10-03 13:19:19.238+05:30	0000000000000000000000000000000000000000000000000000000000000000	a6b18cf73ed703a733e2e622326174ea9b183863290b2ebbe67e9793303596a9
4	audit_1791013861714_98n6h	usr_owner_1	Hunter's Kitchen	OWNER	USER_LOGIN	AUTH	usr_owner_1	null	{"userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 Edg/154.0.0.0"}	req_1791013860439_pje3rk	127.0.0.1	2026-10-03 13:21:01.714+05:30	f68d3cc45b30f3e4345db62dfb0ded7f68529c52633c96c4e9ff8db33f2c6472	31f6ec5248812c8dc7c4a3fda521992e47bbde0e155192bddc917c5d8aff34f8
5	audit_1791013894887_343v3	usr_owner_1	Hunter's Kitchen	OWNER	USER_PROFILE_UPDATED	USER	usr_owner_1	null	null	req_1791013894887	\N	2026-10-03 13:21:34.887+05:30	31f6ec5248812c8dc7c4a3fda521992e47bbde0e155192bddc917c5d8aff34f8	653cbd234e37603bc29a5dcd1b2f9f24e03de983f02a5d45bfa46f5e3312d5e3
6	audit_1791013904225_twnze	usr_owner_1	Hunter's Kitchen	OWNER	USER_LOGOUT	AUTH	usr_owner_1	null	null	req_1791013904222_2x9vnf	127.0.0.1	2026-10-03 13:21:44.225+05:30	653cbd234e37603bc29a5dcd1b2f9f24e03de983f02a5d45bfa46f5e3312d5e3	b11b764245468dba5312c12de39de1b268793edd0f12a670be974c8c8cfafd8f
7	audit_1791013907489_s4z4y	usr_owner_1	Hunter's Kitchen	OWNER	USER_LOGIN	AUTH	usr_owner_1	null	{"userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 Edg/154.0.0.0"}	req_1791013907364_bwn0o5	127.0.0.1	2026-10-03 13:21:47.489+05:30	b11b764245468dba5312c12de39de1b268793edd0f12a670be974c8c8cfafd8f	f227eeadeb9b09d2894539680f7ebf4eaade7e694c99ba237586eb0568d88b6b
8	audit_1791013914953_k6sv9	usr_owner_1	Hunter's Kitchen	OWNER	USER_LOGOUT	AUTH	usr_owner_1	null	null	req_1791013914952_xmi0tb	127.0.0.1	2026-10-03 13:21:54.953+05:30	f227eeadeb9b09d2894539680f7ebf4eaade7e694c99ba237586eb0568d88b6b	dcb0da15480679ef06c3470fd6387f1aa6c6d04cfb50b55b5d9100fb0d7cd9f1
9	audit_1791013920229_ck97g	usr_owner_1	Hunter's Kitchen	OWNER	LOGIN_FAILED	AUTH	hunterkitchen777@gmail.com	null	{"reason": "INVALID_CREDENTIALS"}	req_1791013920077_6jqhfx	127.0.0.1	2026-10-03 13:22:00.23+05:30	dcb0da15480679ef06c3470fd6387f1aa6c6d04cfb50b55b5d9100fb0d7cd9f1	ae842f7bcd40e3d968494b0ea722e0e2cab6c949917256b123db6bfc97a0a64b
10	audit_1791013924926_uweu3	usr_owner_1	Hunter's Kitchen	OWNER	LOGIN_FAILED	AUTH	hunterkitchen777@gmail.com	null	{"reason": "INVALID_CREDENTIALS"}	req_1791013923597_pori3r	127.0.0.1	2026-10-03 13:22:04.926+05:30	ae842f7bcd40e3d968494b0ea722e0e2cab6c949917256b123db6bfc97a0a64b	4a052724315a82c5dc231607950efb60ded98c61464b1b08a3c25a4ca5ee0cb1
11	audit_1791013928490_optnm	usr_owner_1	Hunter's Kitchen	OWNER	LOGIN_FAILED	AUTH	hunterkitchen777@gmail.com	null	{"reason": "INVALID_CREDENTIALS"}	req_1791013927371_srwfbx	127.0.0.1	2026-10-03 13:22:08.49+05:30	4a052724315a82c5dc231607950efb60ded98c61464b1b08a3c25a4ca5ee0cb1	557730fde4c4b2a42b8d0f33d9f4e07bfc2418533b086e308fb9a842734fa7a5
12	audit_1791013930432_uiz8s	usr_owner_1	Hunter's Kitchen	OWNER	LOGIN_FAILED	AUTH	hunterkitchen777@gmail.com	null	{"reason": "INVALID_CREDENTIALS"}	req_1791013929265_ijww30	127.0.0.1	2026-10-03 13:22:10.432+05:30	557730fde4c4b2a42b8d0f33d9f4e07bfc2418533b086e308fb9a842734fa7a5	ef72a3de34547a7dffd035cc030f495b8f9041d404398c5a133301c22ba2a4e5
13	audit_1791013932449_rqxt3	usr_owner_1	Hunter's Kitchen	OWNER	LOGIN_FAILED	AUTH	hunterkitchen777@gmail.com	null	{"reason": "INVALID_CREDENTIALS"}	req_1791013931290_k1sl8d	127.0.0.1	2026-10-03 13:22:12.449+05:30	ef72a3de34547a7dffd035cc030f495b8f9041d404398c5a133301c22ba2a4e5	81b6644a2299967d07a799fe65085d50544e156d85c4e3d39177c7d265c8988b
14	audit_1791013960700_y5cz6	usr_owner_1	Hunter's Kitchen	OWNER	OTP_DISPATCHED	AUTH	usr_owner_1	null	{"channel": "GMAIL_SMTP", "purpose": "FORGOT_PASSWORD", "targetEmail": "hunterkitchen777@gmail.com"}	req_1791013956913_3kccna	127.0.0.1	2026-10-03 13:22:40.7+05:30	81b6644a2299967d07a799fe65085d50544e156d85c4e3d39177c7d265c8988b	daab4188e6191ec6ac73537a7bbab7d080772f1863f69c20a18183051ee250d7
15	audit_1791013983362_ictq0	usr_owner_1	Hunter's Kitchen	OWNER	OTP_VERIFIED_SUCCESSFULLY	AUTH	usr_owner_1	null	null	req_1791013982090_2z9nzo	127.0.0.1	2026-10-03 13:23:03.362+05:30	daab4188e6191ec6ac73537a7bbab7d080772f1863f69c20a18183051ee250d7	646548c385e7972fceb9f284424a806b00438d0a2e35a1079821407d41e53608
16	audit_1791014103525_q9nr0	usr_owner_1	Hunter's Kitchen	OWNER	PASSWORD_RESET_COMPLETED	AUTH	usr_owner_1	null	null	req_1791014101916_mt0my2	127.0.0.1	2026-10-03 13:25:03.525+05:30	646548c385e7972fceb9f284424a806b00438d0a2e35a1079821407d41e53608	82952479cf631349774812c1dd61b32dfd4ac3c70445793f363d4014c27b7a7e
17	audit_1791014138240_mk6qa	usr_owner_1	Hunter's Kitchen	OWNER	OTP_DISPATCHED	AUTH	usr_owner_1	null	{"channel": "GMAIL_SMTP", "purpose": "LOGIN", "targetEmail": "hunterkitchen777@gmail.com"}	req_1791014123019_f7cmpm	127.0.0.1	2026-10-03 13:25:38.24+05:30	82952479cf631349774812c1dd61b32dfd4ac3c70445793f363d4014c27b7a7e	b2be4b107737d4f2cd1ce2bdb380e5cd3ad6ac2f35a5730f0d0021c57f5b20b9
18	audit_1791014158524_v2cd5	usr_owner_1	Hunter's Kitchen	OWNER	LOGIN_OTP_SUCCESS	AUTH	usr_owner_1	null	{"userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 Edg/154.0.0.0"}	req_1791014158521_a1mmj2	127.0.0.1	2026-10-03 13:25:58.524+05:30	b2be4b107737d4f2cd1ce2bdb380e5cd3ad6ac2f35a5730f0d0021c57f5b20b9	043964fac1401bd1fc5cddf5c38d74233c5fd05171272833fa754316ef873a7b
19	audit_1791014164264_ot8qn	usr_owner_1	Hunter's Kitchen	OWNER	USER_LOGOUT	AUTH	usr_owner_1	null	null	req_1791014164262_s4y6km	127.0.0.1	2026-10-03 13:26:04.264+05:30	043964fac1401bd1fc5cddf5c38d74233c5fd05171272833fa754316ef873a7b	b7c0eb09b68a8dc963938203ddd4fc7d9626ff990a3a727424c115f5b653eb03
20	audit_1791014171969_esd7w	usr_owner_1	Hunter's Kitchen	OWNER	OTP_DISPATCHED	AUTH	usr_owner_1	null	{"channel": "GMAIL_SMTP", "purpose": "LOGIN", "targetEmail": "hunterkitchen777@gmail.com"}	req_1791014167570_890djd	127.0.0.1	2026-10-03 13:26:11.969+05:30	b7c0eb09b68a8dc963938203ddd4fc7d9626ff990a3a727424c115f5b653eb03	113137b4cb478f1ad0a11c9d98b9286a5b4dd31f82de61bf5c680dcf2af53187
21	audit_1791014192008_xz9j7	usr_owner_1	Hunter's Kitchen	OWNER	LOGIN_OTP_SUCCESS	AUTH	usr_owner_1	null	{"userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 Edg/154.0.0.0"}	req_1791014192005_txrhsw	127.0.0.1	2026-10-03 13:26:32.008+05:30	113137b4cb478f1ad0a11c9d98b9286a5b4dd31f82de61bf5c680dcf2af53187	3fb345a87c0792341a96cf67916fc41268cbc678db1ac7d90029077b33435f14
22	audit_1791015095476_utbhr	usr_owner_1	Hunter's Kitchen	OWNER	USER_LOGIN	AUTH	usr_owner_1	null	{"userAgent": "node"}	req_1791015095401_bno0dt	127.0.0.1	2026-10-03 13:41:35.476+05:30	3fb345a87c0792341a96cf67916fc41268cbc678db1ac7d90029077b33435f14	6ba0bbc5fd23a45cb6b905e02989f317ba5101f32d069ba729879ed68dcd8967
23	audit_1791015112604_apj7f	usr_delivery_1	Arun Kumar	DELIVERY_PARTNER	USER_LOGIN	AUTH	usr_delivery_1	null	{"userAgent": "node"}	req_1791015112543_ee0aqe	127.0.0.1	2026-10-03 13:41:52.604+05:30	6ba0bbc5fd23a45cb6b905e02989f317ba5101f32d069ba729879ed68dcd8967	d0da57cb73e88f559843ab047c4b3b25319ebca228614ccbf027cb0fc962e351
24	audit_1791015120780_b2ecp	usr_delivery_1	Arun Kumar	DELIVERY_PARTNER	USER_LOGIN	AUTH	usr_delivery_1	null	{"userAgent": "node"}	req_1791015120162_2nafnf	127.0.0.1	2026-10-03 13:42:00.78+05:30	d0da57cb73e88f559843ab047c4b3b25319ebca228614ccbf027cb0fc962e351	38aee552eab34a23b3c15b6eb8150f47f93cb61fbd30d260377915ffcba1f1a7
25	audit_1791015137217_6i42i	usr_delivery_1	Arun Kumar	DELIVERY_PARTNER	USER_LOGIN	AUTH	usr_delivery_1	null	{"userAgent": "node"}	req_1791015136610_s0md3z	127.0.0.1	2026-10-03 13:42:17.217+05:30	38aee552eab34a23b3c15b6eb8150f47f93cb61fbd30d260377915ffcba1f1a7	32db41a1f044c0d79c636ef9be9787a20b0f2213e7a6058d9404a502176543f5
26	audit_1791015138355_eqxtp	usr_owner_1	Hunter's Kitchen	OWNER	USER_LOGIN	AUTH	usr_owner_1	null	{"userAgent": "node"}	req_1791015138296_4c8igm	127.0.0.1	2026-10-03 13:42:18.355+05:30	32db41a1f044c0d79c636ef9be9787a20b0f2213e7a6058d9404a502176543f5	b516b5a401f07b29aac87b9bca15c2793512d096bbda5c7da13f2fe528c49a8f
27	audit_1791015154243_cs2nf	system	Test Runner	SYSTEM	TEST_INIT_VERIFICATION	SYSTEM	SYS_01	null	null	req_test_001	\N	2026-10-03 13:42:34.243+05:30	b516b5a401f07b29aac87b9bca15c2793512d096bbda5c7da13f2fe528c49a8f	696c9af9cfb0b9b15fd423d18d95335e63b640a938cdc22a3334c21e771456d6
28	audit_1791015154244_c4fnk	system	Test Runner	SYSTEM	TEST_MUTATION_STEP_2	ORDER	ORD_TEST_001	{"status": "PLACED"}	{"status": "ACCEPTED"}	req_test_002	\N	2026-10-03 13:42:34.244+05:30	696c9af9cfb0b9b15fd423d18d95335e63b640a938cdc22a3334c21e771456d6	7ddc0483bd66a831cced3717d7ed8c9327ab43506d65777d370cbadce723d278
29	audit_1791015154250_9kxqa	staff_1	Chef Raj	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_ACCEPTED	ORDER	ord_1791015154247	{"status": "PLACED"}	{"status": "ACCEPTED", "orderNumber": "HK-20261003-000101", "customerName": "Test Customer"}	req_fsm_01	\N	2026-10-03 13:42:34.25+05:30	7ddc0483bd66a831cced3717d7ed8c9327ab43506d65777d370cbadce723d278	a1e55b16114866a069f3abbcbefc30717678222b106af95604d6e3b20bd5d63b
30	audit_1791015154252_i0no5	staff_1	Chef Raj	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_PREPARING	ORDER	ord_1791015154247	{"status": "ACCEPTED"}	{"status": "PREPARING", "orderNumber": "HK-20261003-000101", "customerName": "Test Customer"}	req_fsm_02	\N	2026-10-03 13:42:34.252+05:30	a1e55b16114866a069f3abbcbefc30717678222b106af95604d6e3b20bd5d63b	0126441e86907eaa7953442907b2a521a440a0fa4e99c78a313b600d7bcd4a61
31	audit_1791015154255_gpe38	staff_1	Chef Raj	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_READY	ORDER	ord_1791015154247	{"status": "PREPARING"}	{"status": "READY", "orderNumber": "HK-20261003-000101", "customerName": "Test Customer"}	req_fsm_03	\N	2026-10-03 13:42:34.255+05:30	0126441e86907eaa7953442907b2a521a440a0fa4e99c78a313b600d7bcd4a61	c73dd43ecf37f677aeac0a6cabf43fc4a768025c8a2153f36904baf04c165683
32	audit_1791015154259_18fbt	staff_1	Chef Raj	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_ASSIGNED	ORDER	ord_1791015154247	{"status": "READY", "assignedDeliveryPartnerId": "usr_delivery_1"}	{"status": "ASSIGNED", "orderNumber": "HK-20261003-000101", "customerName": "Test Customer"}	req_fsm_04	\N	2026-10-03 13:42:34.259+05:30	c73dd43ecf37f677aeac0a6cabf43fc4a768025c8a2153f36904baf04c165683	6a7e1042ac99f895d75dfb5b5ca046896b411478b680a37897193beaf2db220b
33	audit_1791015203126_020lu	usr_owner_1	Hunter's Kitchen	OWNER	USER_LOGIN	AUTH	usr_owner_1	null	{"userAgent": "node"}	req_1791015201938_ceklms	127.0.0.1	2026-10-03 13:43:23.126+05:30	6a7e1042ac99f895d75dfb5b5ca046896b411478b680a37897193beaf2db220b	9e9ea496e82459fdf3c557d14667760f7b79f6581e13091f5193e021995afdbb
34	audit_1791015827695_d0fhu	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_ACCEPTED	ORDER	ord_1791015827683_d0rex	{"status": "PLACED"}	{"status": "ACCEPTED", "orderNumber": "HK-20261003-520437", "customerName": "Priya Sharma"}	req_v1	\N	2026-10-03 13:53:47.695+05:30	9e9ea496e82459fdf3c557d14667760f7b79f6581e13091f5193e021995afdbb	061e66911bafa286369c619b3d113be567a7f5f431926c0239a02b5b560ed29b
35	audit_1791015827702_oqf6e	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_PREPARING	ORDER	ord_1791015827683_d0rex	{"status": "ACCEPTED"}	{"status": "PREPARING", "orderNumber": "HK-20261003-520437", "customerName": "Priya Sharma"}	req_v2	\N	2026-10-03 13:53:47.702+05:30	061e66911bafa286369c619b3d113be567a7f5f431926c0239a02b5b560ed29b	35b812ae16b06967b9786938175172220392037a0ed448a98363daa3d381fa5b
36	audit_1791015827707_pa1dj	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_READY	ORDER	ord_1791015827683_d0rex	{"status": "PREPARING"}	{"status": "READY", "orderNumber": "HK-20261003-520437", "customerName": "Priya Sharma"}	req_v3	\N	2026-10-03 13:53:47.707+05:30	35b812ae16b06967b9786938175172220392037a0ed448a98363daa3d381fa5b	89957d47eaafe573d608fbbcce468a8dda5a8fd43b1ba3cc9f5262505e962859
37	audit_1791015827712_8tu1d	staff_mgr_01	Manager Kumar	STAFF (GENERAL_MANAGER)	TRANSITION_ORDER_ASSIGNED	ORDER	ord_1791015827683_d0rex	{"status": "READY"}	{"status": "ASSIGNED", "orderNumber": "HK-20261003-520437", "customerName": "Priya Sharma"}	req_v4	\N	2026-10-03 13:53:47.712+05:30	89957d47eaafe573d608fbbcce468a8dda5a8fd43b1ba3cc9f5262505e962859	c93ed16f324a110b35e6c9a541373bc2b178b8964b52324c1bb7defc68074b4e
41	audit_1791015854676_g1n16	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_READY	ORDER	ord_1791015854651_zm2gf	{"status": "PREPARING"}	{"status": "READY", "orderNumber": "HK-20261003-573011", "customerName": "Priya Sharma"}	req_v3	\N	2026-10-03 13:54:14.676+05:30	6c49af5cebb2aad9b0cb50cee85daff1c89aa68db8c1d3017b249ea3ba987f3f	9543c2db97ea5aaa6386d9db454b018a08fc8d1f2dd89d1e345045d49dc37602
38	audit_1791015827727_vsuqy	system	Verification Suite	SYSTEM	VERIFY_PRODUCTION_SUITE	POSTGRESQL	PG_18	null	null	req_ver_1791015827727	\N	2026-10-03 13:53:47.727+05:30	c93ed16f324a110b35e6c9a541373bc2b178b8964b52324c1bb7defc68074b4e	2335bb84575099bf7716b2a76d155f1a31bbc63a2f64da3bfb5893fb680b85a5
39	audit_1791015854663_vil1q	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_ACCEPTED	ORDER	ord_1791015854651_zm2gf	{"status": "PLACED"}	{"status": "ACCEPTED", "orderNumber": "HK-20261003-573011", "customerName": "Priya Sharma"}	req_v1	\N	2026-10-03 13:54:14.663+05:30	2335bb84575099bf7716b2a76d155f1a31bbc63a2f64da3bfb5893fb680b85a5	28301b08b8dbb887ebececb89a0a8a0d2c901f8b327319551f0ac814085bc220
40	audit_1791015854671_9qmkb	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_PREPARING	ORDER	ord_1791015854651_zm2gf	{"status": "ACCEPTED"}	{"status": "PREPARING", "orderNumber": "HK-20261003-573011", "customerName": "Priya Sharma"}	req_v2	\N	2026-10-03 13:54:14.671+05:30	28301b08b8dbb887ebececb89a0a8a0d2c901f8b327319551f0ac814085bc220	6c49af5cebb2aad9b0cb50cee85daff1c89aa68db8c1d3017b249ea3ba987f3f
42	audit_1791015854681_b7qxn	staff_mgr_01	Manager Kumar	STAFF (GENERAL_MANAGER)	TRANSITION_ORDER_ASSIGNED	ORDER	ord_1791015854651_zm2gf	{"status": "READY"}	{"status": "ASSIGNED", "orderNumber": "HK-20261003-573011", "customerName": "Priya Sharma"}	req_v4	\N	2026-10-03 13:54:14.681+05:30	9543c2db97ea5aaa6386d9db454b018a08fc8d1f2dd89d1e345045d49dc37602	d925abe3dfebc78eae8d69a1217fc5c53c734a74c0408d70a98322df6bd3eb1d
44	audit_1791015861440_d5whl	system	Test Runner	SYSTEM	TEST_INIT_VERIFICATION	SYSTEM	SYS_01	null	null	req_test_001	\N	2026-10-03 13:54:21.44+05:30	4a353943934284da6499f26008ed60d0bf7e27f12c079f2d9fd9153d9ee5b456	6252527373922f1fd405d29c5d565ed31c26df72506196b694705e24da96336d
43	audit_1791015854696_r68lq	system	Verification Suite	SYSTEM	VERIFY_PRODUCTION_SUITE	POSTGRESQL	PG_18	null	null	req_ver_1791015854696	\N	2026-10-03 13:54:14.696+05:30	d925abe3dfebc78eae8d69a1217fc5c53c734a74c0408d70a98322df6bd3eb1d	4a353943934284da6499f26008ed60d0bf7e27f12c079f2d9fd9153d9ee5b456
62	audit_1791015916223_jevpl	usr_customer_1	Priya Sundaram	CUSTOMER	PASSWORD_RESET_COMPLETED	AUTH	usr_customer_1	null	null	req_auth_test_7	127.0.0.1	2026-10-03 13:55:16.223+05:30	d7323242030eaaa8a43fe7478227ab75a76b9df9d93c3726749fd7f4bd5d2525	ead1b346aaa07c67f8ecd647b7b0bee9bbdd56758332962d753dca11c6fdd344
45	audit_1791015861446_kb9s3	system	Test Runner	SYSTEM	TEST_MUTATION_STEP_2	ORDER	ORD_TEST_001	{"status": "PLACED"}	{"status": "ACCEPTED"}	req_test_002	\N	2026-10-03 13:54:21.446+05:30	6252527373922f1fd405d29c5d565ed31c26df72506196b694705e24da96336d	2e60d270a9fdd1844a66a5944ae3de55255742cc124839dd136d6fc106118946
46	audit_1791015881491_ufx5i	system	Test Runner	SYSTEM	TEST_INIT_VERIFICATION	SYSTEM	SYS_01	null	null	req_test_001	\N	2026-10-03 13:54:41.491+05:30	2e60d270a9fdd1844a66a5944ae3de55255742cc124839dd136d6fc106118946	a0815da5fbba378835e5c9b42fc1423f2473188e7e28d088470e316e5a7c014d
63	audit_1791015916290_vnucy	usr_customer_1	Priya Sundaram	CUSTOMER	USER_LOGIN	AUTH	usr_customer_1	null	{"userAgent": "test-agent"}	req_auth_test_8	127.0.0.1	2026-10-03 13:55:16.29+05:30	ead1b346aaa07c67f8ecd647b7b0bee9bbdd56758332962d753dca11c6fdd344	6cf34299872f97defdfd3c730c30a85651caca6dd769dd0901fcad93f37d851d
47	audit_1791015881496_btefk	system	Test Runner	SYSTEM	TEST_MUTATION_STEP_2	ORDER	ORD_TEST_001	{"status": "PLACED"}	{"status": "ACCEPTED"}	req_test_002	\N	2026-10-03 13:54:41.496+05:30	a0815da5fbba378835e5c9b42fc1423f2473188e7e28d088470e316e5a7c014d	d29e250697adaf37ffc525a83dc56b04621520fb1729a3630dfa71fe2cc2d041
48	audit_1791015881531_6ldzd	staff_1	Chef Raj	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_ACCEPTED	ORDER	ord_1791015881519_f4nz4	{"status": "PLACED"}	{"status": "ACCEPTED", "orderNumber": "HK-20261003-902331", "customerName": "Priya Sundaram"}	req_fsm_01	\N	2026-10-03 13:54:41.531+05:30	d29e250697adaf37ffc525a83dc56b04621520fb1729a3630dfa71fe2cc2d041	844188e50d829c67a65b123dd6825fdb857142018afc767d4eec91751ce54459
49	audit_1791015881538_9s55p	staff_1	Chef Raj	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_PREPARING	ORDER	ord_1791015881519_f4nz4	{"status": "ACCEPTED"}	{"status": "PREPARING", "orderNumber": "HK-20261003-902331", "customerName": "Priya Sundaram"}	req_fsm_02	\N	2026-10-03 13:54:41.538+05:30	844188e50d829c67a65b123dd6825fdb857142018afc767d4eec91751ce54459	f806db1ce57dfe105d2070fbbdddfb8bcb06ef51533869ebb409aea09bd06ff1
50	audit_1791015881545_oebns	staff_1	Chef Raj	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_READY	ORDER	ord_1791015881519_f4nz4	{"status": "PREPARING"}	{"status": "READY", "orderNumber": "HK-20261003-902331", "customerName": "Priya Sundaram"}	req_fsm_03	\N	2026-10-03 13:54:41.545+05:30	f806db1ce57dfe105d2070fbbdddfb8bcb06ef51533869ebb409aea09bd06ff1	bb76d9bcb8f2666171fdf04215321ec6bbb6ef836963c79ebbe3f135dc9ebb55
51	audit_1791015881552_f2clk	staff_1	Chef Raj	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_ASSIGNED	ORDER	ord_1791015881519_f4nz4	{"status": "READY"}	{"status": "ASSIGNED", "orderNumber": "HK-20261003-902331", "customerName": "Priya Sundaram"}	req_fsm_04	\N	2026-10-03 13:54:41.552+05:30	bb76d9bcb8f2666171fdf04215321ec6bbb6ef836963c79ebbe3f135dc9ebb55	098a16f5352136b3056dd5140f8f0531e5faf135294d38e4fa713d337b7cb8c3
52	audit_1791015898837_98fmp	usr_owner_1	Hunter's Kitchen	OWNER	LOGIN_FAILED	AUTH	hunterkitchen777@gmail.com	null	{"reason": "INVALID_CREDENTIALS"}	req_auth_test_1	127.0.0.1	2026-10-03 13:54:58.837+05:30	098a16f5352136b3056dd5140f8f0531e5faf135294d38e4fa713d337b7cb8c3	ff90e4f98596c7adb6383d6e0fca77d6796a5715f632fb2bee9c46b453568a01
53	audit_1791015898906_0olxu	usr_owner_1	Hunter's Kitchen	OWNER	USER_LOGIN	AUTH	usr_owner_1	null	{"userAgent": "test-agent"}	req_auth_test_2	127.0.0.1	2026-10-03 13:54:58.906+05:30	ff90e4f98596c7adb6383d6e0fca77d6796a5715f632fb2bee9c46b453568a01	ae38c1fd6055940d0ee023bf25369a44bc26deb64d5a2602d68f5f01e5a03dc4
54	audit_1791015898975_p0fi6	usr_customer_1	Priya Sundaram	CUSTOMER	USER_LOGIN	AUTH	usr_customer_1	null	{"userAgent": "test-agent"}	req_auth_test_3	127.0.0.1	2026-10-03 13:54:58.975+05:30	ae38c1fd6055940d0ee023bf25369a44bc26deb64d5a2602d68f5f01e5a03dc4	0f2130bd1bd9cfed4451e956917ba152b5a152f2875c4b28631cbc5e626b4661
55	audit_1791015899067_cdbvq	usr_staff_3	Saravanan (Head Chef)	STAFF	USER_LOGIN	AUTH	usr_staff_3	null	{"userAgent": "test-agent"}	req_auth_test_4	127.0.0.1	2026-10-03 13:54:59.067+05:30	0f2130bd1bd9cfed4451e956917ba152b5a152f2875c4b28631cbc5e626b4661	9c385819ea3cd2067584e9ba8dd6d9ffc271f249654b28e902497f86dd82f7db
56	audit_1791015915921_n4ax5	usr_owner_1	Hunter's Kitchen	OWNER	LOGIN_FAILED	AUTH	hunterkitchen777@gmail.com	null	{"reason": "INVALID_CREDENTIALS"}	req_auth_test_1	127.0.0.1	2026-10-03 13:55:15.921+05:30	9c385819ea3cd2067584e9ba8dd6d9ffc271f249654b28e902497f86dd82f7db	1165a67033bd5cdb3f876b072bebd4b9b60395a377b848e1ef543a05d4070d61
57	audit_1791015915991_c3bsa	usr_owner_1	Hunter's Kitchen	OWNER	USER_LOGIN	AUTH	usr_owner_1	null	{"userAgent": "test-agent"}	req_auth_test_2	127.0.0.1	2026-10-03 13:55:15.991+05:30	1165a67033bd5cdb3f876b072bebd4b9b60395a377b848e1ef543a05d4070d61	66dad64dfb70b07c45bd17f9be756eb27aabb1fdd161fc734ebe985c313ec90e
58	audit_1791015916061_3k5ob	usr_customer_1	Priya Sundaram	CUSTOMER	USER_LOGIN	AUTH	usr_customer_1	null	{"userAgent": "test-agent"}	req_auth_test_3	127.0.0.1	2026-10-03 13:55:16.061+05:30	66dad64dfb70b07c45bd17f9be756eb27aabb1fdd161fc734ebe985c313ec90e	df19ca34effce2832ab860aaf408a7ebdb870f9547bc97d61fa0f48f94c61048
59	audit_1791015916156_hzbqu	usr_staff_3	Saravanan (Head Chef)	STAFF	USER_LOGIN	AUTH	usr_staff_3	null	{"userAgent": "test-agent"}	req_auth_test_4	127.0.0.1	2026-10-03 13:55:16.156+05:30	df19ca34effce2832ab860aaf408a7ebdb870f9547bc97d61fa0f48f94c61048	2d6fef9c753097209a462da738796034054ff7b6d2c05182ae74c76dc5a33214
60	audit_1791015916159_zu2hn	usr_owner_1	Hunter's Kitchen	OWNER	USER_LOGOUT	AUTH	usr_owner_1	null	null	req_auth_test_5	127.0.0.1	2026-10-03 13:55:16.159+05:30	2d6fef9c753097209a462da738796034054ff7b6d2c05182ae74c76dc5a33214	867d1efa61fd8f8dcdc3146f282682aeb633ed80ba4c6ad14213fef1b6f21c3b
61	audit_1791015916161_e4v17	usr_customer_1	Priya Sundaram	CUSTOMER	PASSWORD_RESET_REQUESTED	AUTH	usr_customer_1	null	null	req_auth_test_6	127.0.0.1	2026-10-03 13:55:16.161+05:30	867d1efa61fd8f8dcdc3146f282682aeb633ed80ba4c6ad14213fef1b6f21c3b	d7323242030eaaa8a43fe7478227ab75a76b9df9d93c3726749fd7f4bd5d2525
64	audit_1791015978341_6ux53	usr_sec_test_01	Security Test User	CUSTOMER	USER_LOGOUT	AUTH	usr_sec_test_01	null	null	req_sec_logout	127.0.0.1	2026-10-03 13:56:18.341+05:30	6cf34299872f97defdfd3c730c30a85651caca6dd769dd0901fcad93f37d851d	41484534d76dad3b5cb25c45e201e066b077dd22e569d547dec9d9607302d69e
65	audit_1791016055898_mmgu4	usr_owner_1	Hunter's Kitchen	OWNER	OTP_DISPATCHED	AUTH	usr_owner_1	null	{"channel": "GMAIL_SMTP", "purpose": "LOGIN", "targetEmail": "hunterkitchen777@gmail.com"}	req_otp_test_01	127.0.0.1	2026-10-03 13:57:35.898+05:30	41484534d76dad3b5cb25c45e201e066b077dd22e569d547dec9d9607302d69e	57edc8e4b37f9346c0a7e567917f7c53bf7c864081c0c9853851334db610d482
66	audit_1791016055908_w4n2m	usr_owner_1	Hunter's Kitchen	OWNER	LOGIN_OTP_SUCCESS	AUTH	usr_owner_1	null	{"userAgent": "test-runner"}	req_otp_test_01	127.0.0.1	2026-10-03 13:57:35.908+05:30	57edc8e4b37f9346c0a7e567917f7c53bf7c864081c0c9853851334db610d482	ca9350acb2d59cb4d62a05f931a02d681c26692a8f977074eae8e55fc47b152b
67	audit_1791016055980_t22j4	usr_1791016055912_351g	guest_1791016055909	CUSTOMER	LOGIN_OTP_SUCCESS	AUTH	usr_1791016055912_351g	null	{"userAgent": "test-runner"}	req_otp_test_01	127.0.0.1	2026-10-03 13:57:35.98+05:30	ca9350acb2d59cb4d62a05f931a02d681c26692a8f977074eae8e55fc47b152b	04db2ea57a2b0d3be878846fb6612f70836b6a3d9dfed42a71c8040c808cac19
68	audit_1791016055983_3rmte	usr_owner_1	Hunter's Kitchen	OWNER	OTP_DISPATCHED	AUTH	usr_owner_1	null	{"channel": "GMAIL_SMTP", "purpose": "FORGOT_PASSWORD", "targetEmail": "hunterkitchen777@gmail.com"}	req_otp_test_01	127.0.0.1	2026-10-03 13:57:35.983+05:30	04db2ea57a2b0d3be878846fb6612f70836b6a3d9dfed42a71c8040c808cac19	150cf734ddbc3ccc840a76acce9cdf4a772f4a466c25133dba03448339fe744f
69	audit_1791016055986_a67p0	usr_owner_1	Hunter's Kitchen	OWNER	OTP_VERIFIED_SUCCESSFULLY	AUTH	usr_owner_1	null	null	req_otp_test_01	127.0.0.1	2026-10-03 13:57:35.986+05:30	150cf734ddbc3ccc840a76acce9cdf4a772f4a466c25133dba03448339fe744f	d4679063c74db08301a223f6708bc76b9d022629ffa59a31bb9ad3337e4c289a
70	audit_1791016056048_rinjd	usr_owner_1	Hunter's Kitchen	OWNER	PASSWORD_RESET_COMPLETED	AUTH	usr_owner_1	null	null	req_otp_test_01	127.0.0.1	2026-10-03 13:57:36.048+05:30	d4679063c74db08301a223f6708bc76b9d022629ffa59a31bb9ad3337e4c289a	9160736a5aeedb5973cc080904edca08f063c81e3a96529d7f3adeec391dd93c
71	audit_1791016144499_mhy6i	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_ACCEPTED	ORDER	ord_1791016144486_b8aa1	{"status": "PLACED"}	{"status": "ACCEPTED", "orderNumber": "HK-20261003-899986", "customerName": "Priya Sharma"}	req_v1	\N	2026-10-03 13:59:04.499+05:30	9160736a5aeedb5973cc080904edca08f063c81e3a96529d7f3adeec391dd93c	d30d465d0020b5d1eb2a12b665bc55168486c8a39ff8123ce26cd88b1c819b29
72	audit_1791016144506_a1vy3	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_PREPARING	ORDER	ord_1791016144486_b8aa1	{"status": "ACCEPTED"}	{"status": "PREPARING", "orderNumber": "HK-20261003-899986", "customerName": "Priya Sharma"}	req_v2	\N	2026-10-03 13:59:04.506+05:30	d30d465d0020b5d1eb2a12b665bc55168486c8a39ff8123ce26cd88b1c819b29	155504be520d5493d4f64224825f66b0b400bce0c25d8f0b0eb4be0c9332c3fe
73	audit_1791016144511_67ej9	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_READY	ORDER	ord_1791016144486_b8aa1	{"status": "PREPARING"}	{"status": "READY", "orderNumber": "HK-20261003-899986", "customerName": "Priya Sharma"}	req_v3	\N	2026-10-03 13:59:04.511+05:30	155504be520d5493d4f64224825f66b0b400bce0c25d8f0b0eb4be0c9332c3fe	87684d33c88ec13c2c6ad3a1c1498a5fd94d92c80d1fe473edc5d3e1cb34c11e
74	audit_1791016144517_3pwmn	staff_mgr_01	Manager Kumar	STAFF (GENERAL_MANAGER)	TRANSITION_ORDER_ASSIGNED	ORDER	ord_1791016144486_b8aa1	{"status": "READY"}	{"status": "ASSIGNED", "orderNumber": "HK-20261003-899986", "customerName": "Priya Sharma"}	req_v4	\N	2026-10-03 13:59:04.517+05:30	87684d33c88ec13c2c6ad3a1c1498a5fd94d92c80d1fe473edc5d3e1cb34c11e	be312dacafce01b462ea14b339b87ba51a917df2602bcec2c322d3e5cf41e132
82	audit_1791019866440_5nc8e	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_ACCEPTED	ORDER	ord_1791019866425_750cz	{"status": "PLACED"}	{"status": "ACCEPTED", "orderNumber": "HK-20261003-765402", "customerName": "Priya Sharma"}	req_v1	\N	2026-10-03 15:01:06.44+05:30	171a06fc7e2c2e07a4f30cb559568b180443f2aca9360458dcafca9741e7e446	0df97e2e8157b8ddb849a9e6354c8a25c2d9b0aecfedb42189d6b334bff2f99b
75	audit_1791016144533_mpb9s	system	Verification Suite	SYSTEM	VERIFY_PRODUCTION_SUITE	POSTGRESQL	PG_18	null	null	req_ver_1791016144533	\N	2026-10-03 13:59:04.533+05:30	be312dacafce01b462ea14b339b87ba51a917df2602bcec2c322d3e5cf41e132	ccb7c9455a9293b98e7d0d161c89f62847f232c5b19491a7a28a8aab4c9f7f6a
76	audit_1791016151248_iifps	system	Test Runner	SYSTEM	TEST_INIT_VERIFICATION	SYSTEM	SYS_01	null	null	req_test_001	\N	2026-10-03 13:59:11.248+05:30	ccb7c9455a9293b98e7d0d161c89f62847f232c5b19491a7a28a8aab4c9f7f6a	b3abec1adc9a6b38a81c552cae8915c535840027fa509ee559815125c3c1c0ce
83	audit_1791019866447_lra2u	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_PREPARING	ORDER	ord_1791019866425_750cz	{"status": "ACCEPTED"}	{"status": "PREPARING", "orderNumber": "HK-20261003-765402", "customerName": "Priya Sharma"}	req_v2	\N	2026-10-03 15:01:06.447+05:30	0df97e2e8157b8ddb849a9e6354c8a25c2d9b0aecfedb42189d6b334bff2f99b	294ee19fe69309072adab80f9189dab88e0e09f67886da403f621a481194506f
77	audit_1791016151256_ij0p1	system	Test Runner	SYSTEM	TEST_MUTATION_STEP_2	ORDER	ORD_TEST_001	{"status": "PLACED"}	{"status": "ACCEPTED"}	req_test_002	\N	2026-10-03 13:59:11.256+05:30	b3abec1adc9a6b38a81c552cae8915c535840027fa509ee559815125c3c1c0ce	251fa3ee5d23c860562b845645d573f93350c10fa2259e3f152159117841d6c9
78	audit_1791016151288_z7gtw	staff_1	Chef Raj	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_ACCEPTED	ORDER	ord_1791016151276_gidm3	{"status": "PLACED"}	{"status": "ACCEPTED", "orderNumber": "HK-20261003-269704", "customerName": "Priya Sundaram"}	req_fsm_01	\N	2026-10-03 13:59:11.288+05:30	251fa3ee5d23c860562b845645d573f93350c10fa2259e3f152159117841d6c9	d1bb61bf8a47fdba219784129a176aa7d6f537bd824f8b8d87f5174fde9f530f
79	audit_1791016151294_adfj9	staff_1	Chef Raj	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_PREPARING	ORDER	ord_1791016151276_gidm3	{"status": "ACCEPTED"}	{"status": "PREPARING", "orderNumber": "HK-20261003-269704", "customerName": "Priya Sundaram"}	req_fsm_02	\N	2026-10-03 13:59:11.294+05:30	d1bb61bf8a47fdba219784129a176aa7d6f537bd824f8b8d87f5174fde9f530f	da7afd089f3011fb49abbb2b13ff3314507a388f493432ad9ab6a410f76aeaa1
80	audit_1791016151299_yfhx2	staff_1	Chef Raj	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_READY	ORDER	ord_1791016151276_gidm3	{"status": "PREPARING"}	{"status": "READY", "orderNumber": "HK-20261003-269704", "customerName": "Priya Sundaram"}	req_fsm_03	\N	2026-10-03 13:59:11.299+05:30	da7afd089f3011fb49abbb2b13ff3314507a388f493432ad9ab6a410f76aeaa1	439fdd6a2a84153a633fa64afbb2d7409682dac1f58ec2e2d2e8ec8b65b07b26
81	audit_1791016151305_9c76n	staff_1	Chef Raj	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_ASSIGNED	ORDER	ord_1791016151276_gidm3	{"status": "READY"}	{"status": "ASSIGNED", "orderNumber": "HK-20261003-269704", "customerName": "Priya Sundaram"}	req_fsm_04	\N	2026-10-03 13:59:11.305+05:30	439fdd6a2a84153a633fa64afbb2d7409682dac1f58ec2e2d2e8ec8b65b07b26	171a06fc7e2c2e07a4f30cb559568b180443f2aca9360458dcafca9741e7e446
84	audit_1791019866452_e2otn	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_READY	ORDER	ord_1791019866425_750cz	{"status": "PREPARING"}	{"status": "READY", "orderNumber": "HK-20261003-765402", "customerName": "Priya Sharma"}	req_v3	\N	2026-10-03 15:01:06.452+05:30	294ee19fe69309072adab80f9189dab88e0e09f67886da403f621a481194506f	9b0c2e54a439433caddb4b8b86e465117fc8631bad2b9f9d4f0b28c6061c73d8
85	audit_1791019866457_tk78k	staff_mgr_01	Manager Kumar	STAFF (GENERAL_MANAGER)	TRANSITION_ORDER_ASSIGNED	ORDER	ord_1791019866425_750cz	{"status": "READY"}	{"status": "ASSIGNED", "orderNumber": "HK-20261003-765402", "customerName": "Priya Sharma"}	req_v4	\N	2026-10-03 15:01:06.457+05:30	9b0c2e54a439433caddb4b8b86e465117fc8631bad2b9f9d4f0b28c6061c73d8	cdf0b1a04c5d8ec7a7c4e588e566a1d6bb67afd2b9eedcb3f4760d4bada3da90
86	audit_1791019866475_vwu7f	system	Verification Suite	SYSTEM	VERIFY_PRODUCTION_SUITE	POSTGRESQL	PG_18	null	null	req_ver_1791019866475	\N	2026-10-03 15:01:06.475+05:30	cdf0b1a04c5d8ec7a7c4e588e566a1d6bb67afd2b9eedcb3f4760d4bada3da90	cae1d19770aa66686cffd93ec0ce6935f7e4f7a57fc61db3537f8bad6aed0bba
87	audit_1791019999249_9gtsd	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_ACCEPTED	ORDER	ord_1791019999237_n0qv5	{"status": "PLACED"}	{"status": "ACCEPTED", "orderNumber": "HK-20261003-760130", "customerName": "Priya Sharma"}	req_v1	\N	2026-10-03 15:03:19.249+05:30	cae1d19770aa66686cffd93ec0ce6935f7e4f7a57fc61db3537f8bad6aed0bba	76e243f7ba294e9999d5ed34ab09eeb56d02dc987f0398066e5600c675689c28
88	audit_1791019999256_0v1vy	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_PREPARING	ORDER	ord_1791019999237_n0qv5	{"status": "ACCEPTED"}	{"status": "PREPARING", "orderNumber": "HK-20261003-760130", "customerName": "Priya Sharma"}	req_v2	\N	2026-10-03 15:03:19.256+05:30	76e243f7ba294e9999d5ed34ab09eeb56d02dc987f0398066e5600c675689c28	e30b620a75c7652702b6baaffae7303f73076c4024c4c3820df6ba35aa4b37fa
89	audit_1791019999261_5xjm9	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_READY	ORDER	ord_1791019999237_n0qv5	{"status": "PREPARING"}	{"status": "READY", "orderNumber": "HK-20261003-760130", "customerName": "Priya Sharma"}	req_v3	\N	2026-10-03 15:03:19.261+05:30	e30b620a75c7652702b6baaffae7303f73076c4024c4c3820df6ba35aa4b37fa	f3289057a4ea42eb400b759addb351f3b2a0bc3581dee071ed773c0bcdfa0e80
90	audit_1791019999266_gbrx2	staff_mgr_01	Manager Kumar	STAFF (GENERAL_MANAGER)	TRANSITION_ORDER_ASSIGNED	ORDER	ord_1791019999237_n0qv5	{"status": "READY"}	{"status": "ASSIGNED", "orderNumber": "HK-20261003-760130", "customerName": "Priya Sharma"}	req_v4	\N	2026-10-03 15:03:19.266+05:30	f3289057a4ea42eb400b759addb351f3b2a0bc3581dee071ed773c0bcdfa0e80	cd3e607edeb8a8d02b0c409c0f51f6b3054783acadbfe9d040ed1fdb1fc6cb68
100	audit_1791020334048_ro7en	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_READY	ORDER	ord_1791020334025_d7ybx	{"status": "PREPARING"}	{"status": "READY", "orderNumber": "HK-20261003-971817", "customerName": "Priya Sharma"}	req_v3	\N	2026-10-03 15:08:54.048+05:30	99f645c5c15e935a33b66e3ea0bc3c696498f125dac04e4b98c7f16ccd1ff93a	65a497852d0cf3781d26842a217cb0d0dfdb85d2e5d7797c1820a190553011df
91	audit_1791019999280_6l2a6	system	Verification Suite	SYSTEM	VERIFY_PRODUCTION_SUITE	POSTGRESQL	PG_18	null	null	req_ver_1791019999280	\N	2026-10-03 15:03:19.28+05:30	cd3e607edeb8a8d02b0c409c0f51f6b3054783acadbfe9d040ed1fdb1fc6cb68	4f61c5d377819d3e54e142495caab064fc8997be251836532bb50f11ed2be2f4
92	audit_1791020311734_5lben	system	Test Runner	SYSTEM	TEST_INIT_VERIFICATION	SYSTEM	SYS_01	null	null	req_test_001	\N	2026-10-03 15:08:31.734+05:30	4f61c5d377819d3e54e142495caab064fc8997be251836532bb50f11ed2be2f4	c19c38b28577ee323e6cf80bf87a23b1eb573367805e811e53dc5d61e9bd7c2e
101	audit_1791020334053_7vnhx	staff_mgr_01	Manager Kumar	STAFF (GENERAL_MANAGER)	TRANSITION_ORDER_ASSIGNED	ORDER	ord_1791020334025_d7ybx	{"status": "READY"}	{"status": "ASSIGNED", "orderNumber": "HK-20261003-971817", "customerName": "Priya Sharma"}	req_v4	\N	2026-10-03 15:08:54.053+05:30	65a497852d0cf3781d26842a217cb0d0dfdb85d2e5d7797c1820a190553011df	0085285ed9846f71348f8dea53fc677e15bca7664de072ba0e5e52e355f95ea1
93	audit_1791020311738_k2xy5	system	Test Runner	SYSTEM	TEST_MUTATION_STEP_2	ORDER	ORD_TEST_001	{"status": "PLACED"}	{"status": "ACCEPTED"}	req_test_002	\N	2026-10-03 15:08:31.738+05:30	c19c38b28577ee323e6cf80bf87a23b1eb573367805e811e53dc5d61e9bd7c2e	3d973f5421a4431707530b48f654042f7e60ca32d240fb02a29b529a868cfe18
94	audit_1791020311767_rhuk0	staff_1	Chef Raj	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_ACCEPTED	ORDER	ord_1791020311757_tp78k	{"status": "PLACED"}	{"status": "ACCEPTED", "orderNumber": "HK-20261003-698399", "customerName": "Priya Sundaram"}	req_fsm_01	\N	2026-10-03 15:08:31.767+05:30	3d973f5421a4431707530b48f654042f7e60ca32d240fb02a29b529a868cfe18	a55e9712455ed393e857ed86f02106c9077e14b37dd3460c2b55f5a41a4ddc48
95	audit_1791020311772_rhgte	staff_1	Chef Raj	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_PREPARING	ORDER	ord_1791020311757_tp78k	{"status": "ACCEPTED"}	{"status": "PREPARING", "orderNumber": "HK-20261003-698399", "customerName": "Priya Sundaram"}	req_fsm_02	\N	2026-10-03 15:08:31.772+05:30	a55e9712455ed393e857ed86f02106c9077e14b37dd3460c2b55f5a41a4ddc48	1456a5c0bb3610d1594fee867eeca4cb62f78e3737912d2836bc35164a88d126
96	audit_1791020311776_byy27	staff_1	Chef Raj	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_READY	ORDER	ord_1791020311757_tp78k	{"status": "PREPARING"}	{"status": "READY", "orderNumber": "HK-20261003-698399", "customerName": "Priya Sundaram"}	req_fsm_03	\N	2026-10-03 15:08:31.776+05:30	1456a5c0bb3610d1594fee867eeca4cb62f78e3737912d2836bc35164a88d126	2766ae24b06513d4270157e83169a2d1e611f5d4887f3eb493f39b76f5184e55
97	audit_1791020311781_5g53g	staff_1	Chef Raj	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_ASSIGNED	ORDER	ord_1791020311757_tp78k	{"status": "READY"}	{"status": "ASSIGNED", "orderNumber": "HK-20261003-698399", "customerName": "Priya Sundaram"}	req_fsm_04	\N	2026-10-03 15:08:31.781+05:30	2766ae24b06513d4270157e83169a2d1e611f5d4887f3eb493f39b76f5184e55	357525ebef9434efb9d0cc5e510fea97d87a22340428995863ec19b29583877b
98	audit_1791020334036_um214	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_ACCEPTED	ORDER	ord_1791020334025_d7ybx	{"status": "PLACED"}	{"status": "ACCEPTED", "orderNumber": "HK-20261003-971817", "customerName": "Priya Sharma"}	req_v1	\N	2026-10-03 15:08:54.036+05:30	357525ebef9434efb9d0cc5e510fea97d87a22340428995863ec19b29583877b	c0f9aad3ae6ae462c58515f45a544d09a6613b062374d5a0299f945215359ba4
99	audit_1791020334042_6uh88	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_PREPARING	ORDER	ord_1791020334025_d7ybx	{"status": "ACCEPTED"}	{"status": "PREPARING", "orderNumber": "HK-20261003-971817", "customerName": "Priya Sharma"}	req_v2	\N	2026-10-03 15:08:54.042+05:30	c0f9aad3ae6ae462c58515f45a544d09a6613b062374d5a0299f945215359ba4	99f645c5c15e935a33b66e3ea0bc3c696498f125dac04e4b98c7f16ccd1ff93a
103	audit_1791030963441_2xug5	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_ACCEPTED	ORDER	ord_1791030963423_crgab	{"status": "PLACED"}	{"status": "ACCEPTED", "orderNumber": "HK-20261003-710410", "customerName": "Priya Sharma"}	req_v1	\N	2026-10-03 18:06:03.441+05:30	95aa2113da194e9f8df993cba3eeb896432792742b6fb4fb9ea95dca1c4ef82a	277b1bb090939458adcba48d52c730f471121820b4f6c85718dcb58a567ad0b6
102	audit_1791020334068_2a2xd	system	Verification Suite	SYSTEM	VERIFY_PRODUCTION_SUITE	POSTGRESQL	PG_18	null	null	req_ver_1791020334068	\N	2026-10-03 15:08:54.068+05:30	0085285ed9846f71348f8dea53fc677e15bca7664de072ba0e5e52e355f95ea1	95aa2113da194e9f8df993cba3eeb896432792742b6fb4fb9ea95dca1c4ef82a
104	audit_1791030963448_30erv	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_PREPARING	ORDER	ord_1791030963423_crgab	{"status": "ACCEPTED"}	{"status": "PREPARING", "orderNumber": "HK-20261003-710410", "customerName": "Priya Sharma"}	req_v2	\N	2026-10-03 18:06:03.448+05:30	277b1bb090939458adcba48d52c730f471121820b4f6c85718dcb58a567ad0b6	27ba8873d1f0ee7a77541875597a2b7023810123231ced18ce5c56f43217fab3
105	audit_1791030963454_wph0f	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_READY	ORDER	ord_1791030963423_crgab	{"status": "PREPARING"}	{"status": "READY", "orderNumber": "HK-20261003-710410", "customerName": "Priya Sharma"}	req_v3	\N	2026-10-03 18:06:03.454+05:30	27ba8873d1f0ee7a77541875597a2b7023810123231ced18ce5c56f43217fab3	0510b8bfca15141182987f367b476c452f77a9d58331ede590ac4be37198f614
106	audit_1791030963461_zttfa	staff_mgr_01	Manager Kumar	STAFF (GENERAL_MANAGER)	TRANSITION_ORDER_ASSIGNED	ORDER	ord_1791030963423_crgab	{"status": "READY"}	{"status": "ASSIGNED", "orderNumber": "HK-20261003-710410", "customerName": "Priya Sharma"}	req_v4	\N	2026-10-03 18:06:03.461+05:30	0510b8bfca15141182987f367b476c452f77a9d58331ede590ac4be37198f614	a35facaa4c19583f8e43eca1e4e1277141bd45469f8b4ee2470bcdf34f384b61
119	audit_1791116738194_ug755	staff_mgr_01	Manager Kumar	STAFF (GENERAL_MANAGER)	TRANSITION_ORDER_ASSIGNED	ORDER	ord_1791116738159_g6uje	{"status": "READY"}	{"status": "ASSIGNED", "orderNumber": "HK-20261004-306407", "customerName": "Priya Sharma"}	req_v4	\N	2026-10-04 17:55:38.194+05:30	02c15cebfdff85089b3fb712b02eb8454da4f360db247301fe69ee83738e6fb6	0f446df6c66c3bef34a6b75948090a2fc32a7741410d3f31455c735f43c4ba3a
107	audit_1791030963481_nlw4h	system	Verification Suite	SYSTEM	VERIFY_PRODUCTION_SUITE	POSTGRESQL	PG_18	null	null	req_ver_1791030963481	\N	2026-10-03 18:06:03.481+05:30	a35facaa4c19583f8e43eca1e4e1277141bd45469f8b4ee2470bcdf34f384b61	04f53b92e9bd9b890b0673b1c4993cd0ed61677f5d40ceb43dcb6714d0b870c6
108	audit_1791116578853_08niw	system	Test Runner	SYSTEM	TEST_INIT_VERIFICATION	SYSTEM	SYS_01	null	null	req_test_001	\N	2026-10-04 17:52:58.853+05:30	04f53b92e9bd9b890b0673b1c4993cd0ed61677f5d40ceb43dcb6714d0b870c6	68e381deb9140b7a1e68babd811b25b515a4bf9c89794d37a334355c17f9f6e0
109	audit_1791116578859_8icic	system	Test Runner	SYSTEM	TEST_MUTATION_STEP_2	ORDER	ORD_TEST_001	{"status": "PLACED"}	{"status": "ACCEPTED"}	req_test_002	\N	2026-10-04 17:52:58.859+05:30	68e381deb9140b7a1e68babd811b25b515a4bf9c89794d37a334355c17f9f6e0	046b205b2cb185482ea475af064ecab81260e473c3e73045ce2ccc8698ae3dfb
110	audit_1791116709611_235xd	system	Test Runner	SYSTEM	TEST_INIT_VERIFICATION	SYSTEM	SYS_01	null	null	req_test_001	\N	2026-10-04 17:55:09.611+05:30	046b205b2cb185482ea475af064ecab81260e473c3e73045ce2ccc8698ae3dfb	c650f4eb8c93bff27d2f82daff9b9cec9c28e0c5c3d8261253cb004b26b466d7
111	audit_1791116709620_jdopr	system	Test Runner	SYSTEM	TEST_MUTATION_STEP_2	ORDER	ORD_TEST_001	{"status": "PLACED"}	{"status": "ACCEPTED"}	req_test_002	\N	2026-10-04 17:55:09.62+05:30	c650f4eb8c93bff27d2f82daff9b9cec9c28e0c5c3d8261253cb004b26b466d7	019bb61b176eb88827a6144a8c00eeade0811d57d7e5f2e739e17c5f5a0f9285
112	audit_1791116709666_yvjz5	staff_1	Chef Raj	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_ACCEPTED	ORDER	ord_1791116709647_ic3o3	{"status": "PLACED"}	{"status": "ACCEPTED", "orderNumber": "HK-20261004-293687", "customerName": "Priya Sundaram"}	req_fsm_01	\N	2026-10-04 17:55:09.666+05:30	019bb61b176eb88827a6144a8c00eeade0811d57d7e5f2e739e17c5f5a0f9285	e4cfeb5baee511eef058998489826c36b535717ac1defe72911d880863242180
113	audit_1791116709676_ctqu4	staff_1	Chef Raj	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_PREPARING	ORDER	ord_1791116709647_ic3o3	{"status": "ACCEPTED"}	{"status": "PREPARING", "orderNumber": "HK-20261004-293687", "customerName": "Priya Sundaram"}	req_fsm_02	\N	2026-10-04 17:55:09.676+05:30	e4cfeb5baee511eef058998489826c36b535717ac1defe72911d880863242180	b9361fb34530741810fd9bc055062eb123cf622b96f2a6efb923218f58b758d1
114	audit_1791116709684_1tncz	staff_1	Chef Raj	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_READY	ORDER	ord_1791116709647_ic3o3	{"status": "PREPARING"}	{"status": "READY", "orderNumber": "HK-20261004-293687", "customerName": "Priya Sundaram"}	req_fsm_03	\N	2026-10-04 17:55:09.684+05:30	b9361fb34530741810fd9bc055062eb123cf622b96f2a6efb923218f58b758d1	de518e4598a8bde1ef95416953f68e01fd3b2948526a38d874227597b37e14e6
115	audit_1791116709691_shokj	staff_1	Chef Raj	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_ASSIGNED	ORDER	ord_1791116709647_ic3o3	{"status": "READY"}	{"status": "ASSIGNED", "orderNumber": "HK-20261004-293687", "customerName": "Priya Sundaram"}	req_fsm_04	\N	2026-10-04 17:55:09.691+05:30	de518e4598a8bde1ef95416953f68e01fd3b2948526a38d874227597b37e14e6	8f6665db3d76330d6ec384e8e769ed4b9f73aa1e975935b30c2fbca754c4b3e3
116	audit_1791116738172_5z9s3	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_ACCEPTED	ORDER	ord_1791116738159_g6uje	{"status": "PLACED"}	{"status": "ACCEPTED", "orderNumber": "HK-20261004-306407", "customerName": "Priya Sharma"}	req_v1	\N	2026-10-04 17:55:38.172+05:30	8f6665db3d76330d6ec384e8e769ed4b9f73aa1e975935b30c2fbca754c4b3e3	968a0665026dbe9ba56a0af2645dc62a74a50df894c4a143cbe8719cc2001ce8
117	audit_1791116738180_u7xt5	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_PREPARING	ORDER	ord_1791116738159_g6uje	{"status": "ACCEPTED"}	{"status": "PREPARING", "orderNumber": "HK-20261004-306407", "customerName": "Priya Sharma"}	req_v2	\N	2026-10-04 17:55:38.18+05:30	968a0665026dbe9ba56a0af2645dc62a74a50df894c4a143cbe8719cc2001ce8	fc8821d690adbe0d13d2f6f7293e4b5a59d8a5f4a2cd108ac3eebaa166196a5e
118	audit_1791116738186_xdwdu	staff_chef_01	Master Chef	STAFF (KITCHEN_CHEF)	TRANSITION_ORDER_READY	ORDER	ord_1791116738159_g6uje	{"status": "PREPARING"}	{"status": "READY", "orderNumber": "HK-20261004-306407", "customerName": "Priya Sharma"}	req_v3	\N	2026-10-04 17:55:38.186+05:30	fc8821d690adbe0d13d2f6f7293e4b5a59d8a5f4a2cd108ac3eebaa166196a5e	02c15cebfdff85089b3fb712b02eb8454da4f360db247301fe69ee83738e6fb6
120	audit_1791116738218_yy0lk	system	Verification Suite	SYSTEM	VERIFY_PRODUCTION_SUITE	POSTGRESQL	PG_18	null	null	req_ver_1791116738218	\N	2026-10-04 17:55:38.218+05:30	0f446df6c66c3bef34a6b75948090a2fc32a7741410d3f31455c735f43c4ba3a	c37ff6bf457ba49ca39a85e1a5240f13978f5af778531ff53e9a0cce5d3e62b8
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, description, icon, item_count, sort_order, created_at, updated_at) FROM stdin;
cat_dosa_tiffin	Dosa & Tiffin	Traditional South Indian dosas, roasts, and uthappams	🥞	10	1	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
cat_parotta_kothu	Parottas, Chappathi, Lappa & Kothu	Flaky layered parottas, hand-stretched veechu, stuffed lappa, and sizzling kothu	🫓	14	2	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
cat_chittinadu	Chittinadu Special — Biryani & Gilma	Chittinadu-style aromatic biryanis and special spicy gilma preparations	🥘	6	3	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
cat_hyderabad	Hyderabad Special	Hyderabad-style biryanis and special kadai items	🍲	6	4	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
cat_chicken	Chicken Specials	Spicy chicken chukka, rich gravies, Manchurian, liver fry, and crispy Chicken 65	🍗	9	5	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
cat_beef	Beef Specials	Tender beef chukka, flavorful beef gravy, and deep-fried Beef 65	🥩	3	6	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
cat_egg	Egg Specials	Street-style kalakki, fluffy omelettes, podimas, egg masal, and boiled eggs	🍳	7	7	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
cat_rice	Rice Items	Wok-tossed fried rice specials with chicken, beef, egg, and vegetables	🍚	6	8	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
cat_quail	Quail / Kadai Specials	Country-style Kaadai 65 and spicy Kaadai Pepper Fry preparations	🍖	2	9	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
\.


--
-- Data for Name: cod_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cod_transactions (id, order_id, order_number, delivery_partner_id, amount_expected, amount_collected, cash_tendered, change_due, collection_status, settlement_status, collected_at, settled_at, settled_by, created_at, updated_at) FROM stdin;
cod_1791015827714	ord_1791015827683_d0rex	HK-20261003-520437	usr_delivery_1	333.00	333.00	1000.00	667.00	COLLECTED	SETTLED	2026-10-03 13:53:47.71709+05:30	2026-10-03 13:53:47.718844+05:30	usr_1791015827486_9fe3	2026-10-03 13:53:47.71709+05:30	2026-10-03 13:53:47.71709+05:30
cod_1791015854683	ord_1791015854651_zm2gf	HK-20261003-573011	usr_delivery_1	333.00	333.00	1000.00	667.00	COLLECTED	SETTLED	2026-10-03 13:54:14.685597+05:30	2026-10-03 13:54:14.687322+05:30	usr_1791015854458_ue5f	2026-10-03 13:54:14.685597+05:30	2026-10-03 13:54:14.685597+05:30
cod_1791016144519	ord_1791016144486_b8aa1	HK-20261003-899986	usr_delivery_1	333.00	333.00	1000.00	667.00	COLLECTED	SETTLED	2026-10-03 13:59:04.520751+05:30	2026-10-03 13:59:04.522271+05:30	usr_1791016144293_7o6a	2026-10-03 13:59:04.520751+05:30	2026-10-03 13:59:04.520751+05:30
cod_1791019866460	ord_1791019866425_750cz	HK-20261003-765402	usr_delivery_1	333.00	333.00	1000.00	667.00	COLLECTED	SETTLED	2026-10-03 15:01:06.461571+05:30	2026-10-03 15:01:06.463239+05:30	usr_1791019866232_xaqg	2026-10-03 15:01:06.461571+05:30	2026-10-03 15:01:06.461571+05:30
cod_1791019999267	ord_1791019999237_n0qv5	HK-20261003-760130	usr_delivery_1	333.00	333.00	1000.00	667.00	COLLECTED	SETTLED	2026-10-03 15:03:19.269202+05:30	2026-10-03 15:03:19.270822+05:30	usr_1791019999048_x3vt	2026-10-03 15:03:19.269202+05:30	2026-10-03 15:03:19.269202+05:30
cod_1791020334055	ord_1791020334025_d7ybx	HK-20261003-971817	usr_delivery_1	333.00	333.00	1000.00	667.00	COLLECTED	SETTLED	2026-10-03 15:08:54.057615+05:30	2026-10-03 15:08:54.059184+05:30	usr_1791020333834_y4g4	2026-10-03 15:08:54.057615+05:30	2026-10-03 15:08:54.057615+05:30
cod_1791030963464	ord_1791030963423_crgab	HK-20261003-710410	usr_delivery_1	333.00	333.00	1000.00	667.00	COLLECTED	SETTLED	2026-10-03 18:06:03.467031+05:30	2026-10-03 18:06:03.469171+05:30	usr_1791030963223_6yf3	2026-10-03 18:06:03.467031+05:30	2026-10-03 18:06:03.467031+05:30
cod_1791116738197	ord_1791116738159_g6uje	HK-20261004-306407	usr_delivery_1	333.00	333.00	1000.00	667.00	COLLECTED	SETTLED	2026-10-04 17:55:38.199774+05:30	2026-10-04 17:55:38.201979+05:30	usr_1791116737964_xyu2	2026-10-04 17:55:38.199774+05:30	2026-10-04 17:55:38.199774+05:30
\.


--
-- Data for Name: customer_addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer_addresses (id, customer_id, type, name, phone, door_no, street, area, city, pincode, landmark, instructions, coordinates, is_default, created_at, updated_at) FROM stdin;
addr_1	usr_customer_1	HOME	Priya Sundaram	+91 99887 76655	42-B	Greenways Road, Sector 3	Race Course	Coimbatore	641018	Opp. Race Course Park Gate 2	Please call before delivery and leave at door	11.0045, 76.9612	t	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
addr_2	usr_customer_1	WORK	Priya Sundaram (Office)	+91 99887 76655	3rd Floor, Tech Park	Avinashi Road	Peelamedu	Coimbatore	641004	Near TIDEL Park		11.0281, 77.0024	f	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
addr_1790864085424	usr_1790864085360_157	HOME	Sanjay M	+91 6383394373	N/A	Main Road	Peelamedu	Coimbatore	641018				t	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
addr_1790864085513	usr_1790864085452_549	HOME	Sanjay Kumar	+91 9881685361	#14-B	Richmond Road	Race Course	Coimbatore	641018				t	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
addr_1790864209068	usr_1790864209004_151	HOME	Sanjay Kumar	+91 9862577288	#14-B	Richmond Road	Race Course	Coimbatore	641018				t	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
addr_1790868283515	usr_1790868283445_946	HOME	Sanjay	+91 9344842967	kct	Marutham Nagar	Sarvanampatti	Coimbatore	641001			11.075690, 76.988483	t	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
addr_1791015752394_macp	usr_1791015752171_lre8	WORK	Hunter Headquarters	+91 98765 00000	77-A	Avinashi Road	Peelamedu	Coimbatore	641004			11.0280,77.0050	f	2026-10-03 13:52:32.394939+05:30	2026-10-03 13:52:32.394939+05:30
addr_1791015827678_6np3	usr_1791015827486_9fe3	WORK	Hunter Headquarters	+91 98765 00000	77-A	Avinashi Road	Peelamedu	Coimbatore	641004			11.0280,77.0050	f	2026-10-03 13:53:47.679448+05:30	2026-10-03 13:53:47.679448+05:30
addr_1791015854648_gg3f	usr_1791015854458_ue5f	WORK	Hunter Headquarters	+91 98765 00000	77-A	Avinashi Road	Peelamedu	Coimbatore	641004			11.0280,77.0050	f	2026-10-03 13:54:14.649138+05:30	2026-10-03 13:54:14.649138+05:30
addr_1791016144482_01lb	usr_1791016144293_7o6a	WORK	Hunter Headquarters	+91 98765 00000	77-A	Avinashi Road	Peelamedu	Coimbatore	641004			11.0280,77.0050	f	2026-10-03 13:59:04.482358+05:30	2026-10-03 13:59:04.482358+05:30
addr_1791019866422_76bu	usr_1791019866232_xaqg	WORK	Hunter Headquarters	+91 98765 00000	77-A	Avinashi Road	Peelamedu	Coimbatore	641004			11.0280,77.0050	f	2026-10-03 15:01:06.422698+05:30	2026-10-03 15:01:06.422698+05:30
addr_1791019999233_ueil	usr_1791019999048_x3vt	WORK	Hunter Headquarters	+91 98765 00000	77-A	Avinashi Road	Peelamedu	Coimbatore	641004			11.0280,77.0050	f	2026-10-03 15:03:19.233971+05:30	2026-10-03 15:03:19.233971+05:30
addr_1791020334022_a36z	usr_1791020333834_y4g4	WORK	Hunter Headquarters	+91 98765 00000	77-A	Avinashi Road	Peelamedu	Coimbatore	641004			11.0280,77.0050	f	2026-10-03 15:08:54.023468+05:30	2026-10-03 15:08:54.023468+05:30
addr_1791030963419_x9n1	usr_1791030963223_6yf3	WORK	Hunter Headquarters	+91 98765 00000	77-A	Avinashi Road	Peelamedu	Coimbatore	641004			11.0280,77.0050	f	2026-10-03 18:06:03.420494+05:30	2026-10-03 18:06:03.420494+05:30
addr_1791116738154_lmm2	usr_1791116737964_xyu2	WORK	Hunter Headquarters	+91 98765 00000	77-A	Avinashi Road	Peelamedu	Coimbatore	641004			11.0280,77.0050	f	2026-10-04 17:55:38.155459+05:30	2026-10-04 17:55:38.155459+05:30
\.


--
-- Data for Name: delivery_batch_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_batch_orders (batch_id, order_id, sequence_order) FROM stdin;
\.


--
-- Data for Name: delivery_batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_batches (id, batch_number, delivery_partner_id, delivery_partner_name, status, created_at, completed_at) FROM stdin;
\.


--
-- Data for Name: idempotency_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.idempotency_records (key, request_path, request_hash, status, response_status, response_body, created_at, expires_at) FROM stdin;
idem_verify_1791015154245	/api/orders	{"test":true}	COMPLETED	201	{"total": 780, "status": "success", "orderId": "ord_idem_123"}	2026-10-03 13:42:34.245+05:30	2026-10-04 13:42:34.245+05:30
idem_prod_test_1791015633931	/api/orders	{"orderId":"ord_test_1791015633898"}	COMPLETED	201	{"orderId": "ord_test_1791015633898", "success": true}	2026-10-03 13:50:33.932+05:30	2026-10-04 13:50:33.932+05:30
idem_prod_test_1791015752467	/api/orders	{"orderId":"ord_test_1791015752400"}	COMPLETED	201	{"orderId": "ord_test_1791015752400", "success": true}	2026-10-03 13:52:32.467+05:30	2026-10-04 13:52:32.467+05:30
idem_prod_test_1791015827722	/api/orders	{"orderId":"ord_1791015827683_d0rex"}	COMPLETED	201	{"orderId": "ord_1791015827683_d0rex", "success": true}	2026-10-03 13:53:47.722+05:30	2026-10-04 13:53:47.722+05:30
idem_prod_test_1791015854691	/api/orders	{"orderId":"ord_1791015854651_zm2gf"}	COMPLETED	201	{"orderId": "ord_1791015854651_zm2gf", "success": true}	2026-10-03 13:54:14.691+05:30	2026-10-04 13:54:14.691+05:30
idem_verify_1791015861454	/api/orders	{"test":true}	COMPLETED	201	{"total": 780, "status": "success", "orderId": "ord_idem_123"}	2026-10-03 13:54:21.454+05:30	2026-10-04 13:54:21.454+05:30
idem_verify_1791015881506	/api/orders	{"test":true}	COMPLETED	201	{"total": 780, "status": "success", "orderId": "ord_idem_123"}	2026-10-03 13:54:41.506+05:30	2026-10-04 13:54:41.506+05:30
idem_prod_test_1791016144527	/api/orders	{"orderId":"ord_1791016144486_b8aa1"}	COMPLETED	201	{"orderId": "ord_1791016144486_b8aa1", "success": true}	2026-10-03 13:59:04.528+05:30	2026-10-04 13:59:04.528+05:30
idem_verify_1791016151265	/api/orders	{"test":true}	COMPLETED	201	{"total": 780, "status": "success", "orderId": "ord_idem_123"}	2026-10-03 13:59:11.265+05:30	2026-10-04 13:59:11.265+05:30
idem_prod_test_1791019866469	/api/orders	{"orderId":"ord_1791019866425_750cz"}	COMPLETED	201	{"orderId": "ord_1791019866425_750cz", "success": true}	2026-10-03 15:01:06.469+05:30	2026-10-04 15:01:06.469+05:30
idem_prod_test_1791019999275	/api/orders	{"orderId":"ord_1791019999237_n0qv5"}	COMPLETED	201	{"orderId": "ord_1791019999237_n0qv5", "success": true}	2026-10-03 15:03:19.275+05:30	2026-10-04 15:03:19.275+05:30
idem_verify_1791020311748	/api/orders	{"test":true}	COMPLETED	201	{"total": 780, "status": "success", "orderId": "ord_idem_123"}	2026-10-03 15:08:31.748+05:30	2026-10-04 15:08:31.748+05:30
idem_prod_test_1791020334064	/api/orders	{"orderId":"ord_1791020334025_d7ybx"}	COMPLETED	201	{"orderId": "ord_1791020334025_d7ybx", "success": true}	2026-10-03 15:08:54.064+05:30	2026-10-04 15:08:54.064+05:30
idem_prod_test_1791030963475	/api/orders	{"orderId":"ord_1791030963423_crgab"}	COMPLETED	201	{"orderId": "ord_1791030963423_crgab", "success": true}	2026-10-03 18:06:03.475+05:30	2026-10-04 18:06:03.475+05:30
idem_verify_1791116578872	/api/orders	{"test":true}	COMPLETED	201	{"total": 780, "status": "success", "orderId": "ord_idem_123"}	2026-10-04 17:52:58.873+05:30	2026-10-05 17:52:58.873+05:30
idem_verify_1791116709632	/api/orders	{"test":true}	COMPLETED	201	{"total": 780, "status": "success", "orderId": "ord_idem_123"}	2026-10-04 17:55:09.632+05:30	2026-10-05 17:55:09.632+05:30
idem_prod_test_1791116738210	/api/orders	{"orderId":"ord_1791116738159_g6uje"}	COMPLETED	201	{"orderId": "ord_1791116738159_g6uje", "success": true}	2026-10-04 17:55:38.21+05:30	2026-10-05 17:55:38.21+05:30
\.


--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_items (id, menu_item_id, available_quantity, reserved_quantity, low_stock_threshold, is_unlimited, updated_at) FROM stdin;
inv_item_dosa_tiffin_01	item_dosa_tiffin_01	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_dosa_tiffin_02	item_dosa_tiffin_02	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_dosa_tiffin_03	item_dosa_tiffin_03	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_dosa_tiffin_04	item_dosa_tiffin_04	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_dosa_tiffin_05	item_dosa_tiffin_05	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_dosa_tiffin_06	item_dosa_tiffin_06	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_dosa_tiffin_07	item_dosa_tiffin_07	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_dosa_tiffin_08	item_dosa_tiffin_08	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_dosa_tiffin_09	item_dosa_tiffin_09	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_dosa_tiffin_10	item_dosa_tiffin_10	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_parotta_kothu_11	item_parotta_kothu_11	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_parotta_kothu_12	item_parotta_kothu_12	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_parotta_kothu_13	item_parotta_kothu_13	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_parotta_kothu_14	item_parotta_kothu_14	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_parotta_kothu_15	item_parotta_kothu_15	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_parotta_kothu_16	item_parotta_kothu_16	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_parotta_kothu_17	item_parotta_kothu_17	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_parotta_kothu_18	item_parotta_kothu_18	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_parotta_kothu_19	item_parotta_kothu_19	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_parotta_kothu_20	item_parotta_kothu_20	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_parotta_kothu_21	item_parotta_kothu_21	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_parotta_kothu_22	item_parotta_kothu_22	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_parotta_kothu_23	item_parotta_kothu_23	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_parotta_kothu_24	item_parotta_kothu_24	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_chittinadu_25	item_chittinadu_25	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_chittinadu_26	item_chittinadu_26	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_chittinadu_27	item_chittinadu_27	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_chittinadu_29	item_chittinadu_29	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_chittinadu_30	item_chittinadu_30	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_hyderabad_31	item_hyderabad_31	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_hyderabad_32	item_hyderabad_32	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_hyderabad_33	item_hyderabad_33	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_hyderabad_34	item_hyderabad_34	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_hyderabad_35	item_hyderabad_35	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_hyderabad_36	item_hyderabad_36	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_chicken_37	item_chicken_37	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_chicken_38	item_chicken_38	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_chicken_39	item_chicken_39	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_chicken_40	item_chicken_40	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_chicken_41	item_chicken_41	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_chicken_42	item_chicken_42	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_chicken_43	item_chicken_43	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_chicken_44	item_chicken_44	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_chicken_45	item_chicken_45	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_beef_46	item_beef_46	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_beef_47	item_beef_47	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_beef_48	item_beef_48	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_egg_49	item_egg_49	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_egg_50	item_egg_50	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_egg_51	item_egg_51	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_egg_52	item_egg_52	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_egg_53	item_egg_53	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_egg_54	item_egg_54	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_egg_55	item_egg_55	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_rice_56	item_rice_56	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_rice_57	item_rice_57	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_rice_58	item_rice_58	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_rice_59	item_rice_59	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_rice_60	item_rice_60	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_rice_61	item_rice_61	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_quail_62	item_quail_62	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_quail_63	item_quail_63	100	0	10	t	2026-10-03 13:43:09.866766+05:30
inv_item_chittinadu_28	item_chittinadu_28	50	0	10	t	2026-10-03 13:43:09.866766+05:30
\.


--
-- Data for Name: inventory_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_transactions (id, menu_item_id, order_id, change_quantity, balance_after, reason, created_at) FROM stdin;
2	item_chittinadu_28	ord_1791015827683_d0rex	-2	48	Order fulfillment	2026-10-03 13:53:47.722517+05:30
3	item_chittinadu_28	ord_1791015854651_zm2gf	-2	48	Order fulfillment	2026-10-03 13:54:14.690987+05:30
4	item_chittinadu_28	ord_1791016144486_b8aa1	-2	48	Order fulfillment	2026-10-03 13:59:04.526538+05:30
5	item_chittinadu_28	ord_1791019866425_750cz	-2	48	Order fulfillment	2026-10-03 15:01:06.467473+05:30
6	item_chittinadu_28	ord_1791019999237_n0qv5	-2	48	Order fulfillment	2026-10-03 15:03:19.274419+05:30
7	item_chittinadu_28	ord_1791020334025_d7ybx	-2	48	Order fulfillment	2026-10-03 15:08:54.063387+05:30
8	item_chittinadu_28	ord_1791030963423_crgab	-2	48	Order fulfillment	2026-10-03 18:06:03.474697+05:30
9	item_chittinadu_28	ord_1791116738159_g6uje	-2	48	Order fulfillment	2026-10-04 17:55:38.209534+05:30
\.


--
-- Data for Name: menu_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menu_items (id, name, description, category_id, category_name, price, discount_price, image_url, is_veg, is_available, prep_time_minutes, is_popular, is_bestseller, rating, rating_count, customizations, addons, ingredients, created_at, updated_at) FROM stdin;
item_chittinadu_28	Chittinadu Beef Biryani	Chittinadu-style beef biryani	cat_chittinadu	Chittinadu Special — Biryani & Gilma	130.00	\N	https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80	f	t	15	f	t	4.90	283	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_rice_57	Chicken Rice	Rice prepared with chicken	cat_rice	Rice Items	110.00	\N	https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80	f	t	12	f	t	4.90	220	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_rice_58	Egg Rice	Rice prepared with egg	cat_rice	Rice Items	90.00	\N	https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80	f	t	10	t	f	4.80	155	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_rice_59	Veg Rice	Vegetable rice	cat_rice	Rice Items	80.00	\N	https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80	t	t	10	f	f	4.60	95	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_rice_60	Beef Rice	Rice prepared with beef	cat_rice	Rice Items	130.00	\N	https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80	f	t	12	f	t	4.90	195	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_rice_61	Mixed Rice	Mixed-style rice preparation	cat_rice	Rice Items	140.00	\N	https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80	f	t	15	f	t	4.90	230	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_quail_62	Kaadai 65 / Quail 65	Fried/spiced quail preparation	cat_quail	Quail / Kadai Specials	100.00	\N	https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80	f	t	15	f	t	4.90	180	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_quail_63	Kaadai Pepper Fry / Quail Pepper Fry	Quail prepared with pepper	cat_quail	Quail / Kadai Specials	120.00	\N	https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80	f	t	15	t	f	4.80	150	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_dosa_tiffin_01	Dosa	Traditional South Indian dosa	cat_dosa_tiffin	Dosa & Tiffin	25.00	\N	https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80	t	t	10	f	f	4.60	85	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_dosa_tiffin_02	Egg Dosa	Dosa prepared with egg	cat_dosa_tiffin	Dosa & Tiffin	40.00	\N	https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80	f	t	10	t	f	4.80	112	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_dosa_tiffin_03	Podi Dosa	Dosa topped/prepared with podi	cat_dosa_tiffin	Dosa & Tiffin	40.00	\N	https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80	t	t	10	f	f	4.70	95	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_dosa_tiffin_04	Uthappam	Thick, soft South Indian pancake	cat_dosa_tiffin	Dosa & Tiffin	40.00	\N	https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80	t	t	12	f	f	4.50	68	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_dosa_tiffin_05	Roast	Crispy roasted dosa	cat_dosa_tiffin	Dosa & Tiffin	50.00	\N	https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80	t	t	10	f	t	4.80	140	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_dosa_tiffin_06	Egg Roast	Roast dosa prepared with egg	cat_dosa_tiffin	Dosa & Tiffin	70.00	\N	https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80	f	t	12	f	f	4.70	88	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_dosa_tiffin_07	Podi Roast	Crispy roast with podi	cat_dosa_tiffin	Dosa & Tiffin	70.00	\N	https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80	t	t	10	f	f	4.80	104	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_dosa_tiffin_08	Onion Roast	Roast dosa with onion	cat_dosa_tiffin	Dosa & Tiffin	70.00	\N	https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80	t	t	12	f	f	4.70	92	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_dosa_tiffin_09	Ghee Roast	Roast dosa prepared with ghee	cat_dosa_tiffin	Dosa & Tiffin	70.00	\N	https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80	t	t	10	f	t	4.90	185	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_dosa_tiffin_10	Onion Uthappam	Uthappam topped with onion	cat_dosa_tiffin	Dosa & Tiffin	70.00	\N	https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80	t	t	12	f	f	4.60	79	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_parotta_kothu_11	Porotta	Layered South Indian flatbread	cat_parotta_kothu	Parottas, Chappathi, Lappa & Kothu	25.00	\N	https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600&auto=format&fit=crop&q=80	t	t	8	f	t	4.90	260	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_parotta_kothu_12	Veechu Porotta	Flaky, hand-stretched parotta	cat_parotta_kothu	Parottas, Chappathi, Lappa & Kothu	35.00	\N	https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600&auto=format&fit=crop&q=80	t	t	10	f	f	4.70	110	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_parotta_kothu_13	Egg Veechu	Veechu parotta prepared with egg	cat_parotta_kothu	Parottas, Chappathi, Lappa & Kothu	50.00	\N	https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80	f	t	10	t	f	4.80	135	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_parotta_kothu_14	Egg Lappa	Layered lappa with egg	cat_parotta_kothu	Parottas, Chappathi, Lappa & Kothu	70.00	\N	https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80	f	t	12	f	f	4.80	122	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_parotta_kothu_15	Chicken Lappa	Lappa prepared with chicken	cat_parotta_kothu	Parottas, Chappathi, Lappa & Kothu	130.00	\N	https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80	f	t	15	f	t	4.90	195	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_parotta_kothu_16	Beef Lappa	Lappa prepared with beef	cat_parotta_kothu	Parottas, Chappathi, Lappa & Kothu	150.00	\N	https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80	f	t	15	t	f	4.80	168	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_parotta_kothu_17	Egg Kothu	Chopped parotta mixed with egg	cat_parotta_kothu	Parottas, Chappathi, Lappa & Kothu	90.00	\N	https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80	f	t	12	f	t	4.80	210	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_parotta_kothu_18	Chicken Kothu	Chopped parotta mixed with chicken	cat_parotta_kothu	Parottas, Chappathi, Lappa & Kothu	130.00	\N	https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80	f	t	15	f	t	4.90	280	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_parotta_kothu_19	Beef Kothu	Chopped parotta mixed with beef	cat_parotta_kothu	Parottas, Chappathi, Lappa & Kothu	150.00	\N	https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80	f	t	15	t	f	4.90	220	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_parotta_kothu_20	Chappathi	Soft Indian flatbread	cat_parotta_kothu	Parottas, Chappathi, Lappa & Kothu	25.00	\N	https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80	t	t	8	f	f	4.50	75	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_parotta_kothu_21	Egg Chappathi	Chappathi with egg	cat_parotta_kothu	Parottas, Chappathi, Lappa & Kothu	40.00	\N	https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80	f	t	10	f	f	4.60	65	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_parotta_kothu_22	Egg Chappathi Kothu	Chopped chappathi with egg	cat_parotta_kothu	Parottas, Chappathi, Lappa & Kothu	90.00	\N	https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80	f	t	12	f	f	4.70	88	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_parotta_kothu_23	Chicken Chappathi Kothu	Chopped chappathi with chicken	cat_parotta_kothu	Parottas, Chappathi, Lappa & Kothu	130.00	\N	https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80	f	t	15	f	f	4.80	115	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_parotta_kothu_24	Beef Chappathi Kothu	Chopped chappathi with beef	cat_parotta_kothu	Parottas, Chappathi, Lappa & Kothu	150.00	\N	https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80	f	t	15	f	f	4.80	94	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_chittinadu_25	Chittinadu Empty Biryani	Biryani-style rice without meat	cat_chittinadu	Chittinadu Special — Biryani & Gilma	70.00	\N	https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80	t	t	10	f	f	4.70	145	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_chittinadu_26	Chittinadu Egg Biryani	Chittinadu-style biryani with egg	cat_chittinadu	Chittinadu Special — Biryani & Gilma	80.00	\N	https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80	f	t	10	f	f	4.70	130	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_chittinadu_27	Chittinadu Chicken Biryani	Chittinadu-style chicken biryani	cat_chittinadu	Chittinadu Special — Biryani & Gilma	110.00	\N	https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80	f	t	15	f	t	4.90	310	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_chittinadu_29	Chittinadu Chicken Gilma	Chicken-based Gilma preparation	cat_chittinadu	Chittinadu Special — Biryani & Gilma	130.00	\N	https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop&q=80	f	t	15	t	f	4.80	160	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_chittinadu_30	Chittinadu Beef Gilma	Beef-based Gilma preparation	cat_chittinadu	Chittinadu Special — Biryani & Gilma	150.00	\N	https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop&q=80	f	t	15	t	f	4.90	180	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_hyderabad_31	Hyderabad Empty Biryani	Biryani-style rice without meat	cat_hyderabad	Hyderabad Special	80.00	\N	https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80	t	t	10	f	f	4.70	120	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_hyderabad_32	Hyderabad Egg Biryani	Hyderabad-style biryani with egg	cat_hyderabad	Hyderabad Special	90.00	\N	https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80	f	t	10	f	f	4.70	105	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_hyderabad_33	Hyderabad Chicken Biryani	Hyderabad-style chicken biryani	cat_hyderabad	Hyderabad Special	120.00	\N	https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80	f	t	15	f	t	4.90	340	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_hyderabad_34	Hyderabad Beef Biryani	Hyderabad-style beef biryani	cat_hyderabad	Hyderabad Special	140.00	\N	https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80	f	t	15	f	t	4.90	290	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_hyderabad_35	Kadai 65	65-style fried preparation listed as Kadai 65	cat_hyderabad	Hyderabad Special	100.00	\N	https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80	f	t	12	t	f	4.80	145	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_hyderabad_36	Kadai Pepper Fry	Pepper-fried Kadai preparation	cat_hyderabad	Hyderabad Special	130.00	\N	https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80	f	t	15	f	f	4.80	125	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_chicken_37	Chicken Chukka	Dry, spiced chicken preparation	cat_chicken	Chicken Specials	130.00	\N	https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=600&auto=format&fit=crop&q=80	f	t	15	f	t	4.90	230	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_chicken_38	Chicken Gravy	Chicken served in gravy	cat_chicken	Chicken Specials	140.00	\N	https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&auto=format&fit=crop&q=80	f	t	15	f	f	4.70	165	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_chicken_39	Pepper Chicken Gravy	Chicken gravy with pepper	cat_chicken	Chicken Specials	140.00	\N	https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&auto=format&fit=crop&q=80	f	t	15	t	f	4.80	180	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_chicken_40	Chilli Chicken Gravy	Chicken gravy with chilli	cat_chicken	Chicken Specials	140.00	\N	https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&auto=format&fit=crop&q=80	f	t	15	f	f	4.70	140	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_chicken_41	Palayam Gravy	Spiced chicken gravy preparation	cat_chicken	Chicken Specials	140.00	\N	https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&auto=format&fit=crop&q=80	f	t	15	f	f	4.80	110	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_chicken_42	Chicken Manchurian	Indo-Chinese chicken preparation	cat_chicken	Chicken Specials	140.00	\N	https://images.unsplash.com/photo-1525755662778-989d0524087e?w=600&auto=format&fit=crop&q=80	f	t	15	f	f	4.70	125	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_chicken_43	Chicken Liver Fry	Fried chicken liver	cat_chicken	Chicken Specials	80.00	\N	https://images.unsplash.com/photo-1606471191009-63994c53433b?w=600&auto=format&fit=crop&q=80	f	t	12	f	f	4.60	95	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_chicken_44	Chicken Liver Gravy	Chicken liver prepared in gravy	cat_chicken	Chicken Specials	90.00	\N	https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&auto=format&fit=crop&q=80	f	t	12	f	f	4.60	82	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_chicken_45	Chicken 65	Fried and spiced chicken	cat_chicken	Chicken Specials	90.00	\N	https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80	f	t	10	f	t	4.90	290	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_beef_46	Beef Chukka	Dry, spiced beef preparation	cat_beef	Beef Specials	140.00	\N	https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=600&auto=format&fit=crop&q=80	f	t	15	f	t	4.90	245	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_beef_47	Beef Gravy	Beef served in gravy	cat_beef	Beef Specials	150.00	\N	https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&auto=format&fit=crop&q=80	f	t	15	t	f	4.80	195	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_beef_48	Beef 65	Fried and spiced beef preparation	cat_beef	Beef Specials	150.00	\N	https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80	f	t	12	f	f	4.80	160	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_egg_49	Boiled Egg	Boiled egg	cat_egg	Egg Specials	15.00	\N	https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80	f	t	5	f	f	4.60	80	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_egg_50	Half Boil	Soft/partially cooked egg	cat_egg	Egg Specials	25.00	\N	https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80	f	t	5	f	f	4.70	110	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_egg_51	Full Boil	Fully boiled egg	cat_egg	Egg Specials	25.00	\N	https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80	f	t	5	f	f	4.60	75	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_egg_52	Kalakki	Soft scrambled-style egg preparation	cat_egg	Egg Specials	25.00	\N	https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=600&auto=format&fit=crop&q=80	f	t	5	f	t	4.90	260	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_egg_53	Omelette	Egg omelette	cat_egg	Egg Specials	25.00	\N	https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=600&auto=format&fit=crop&q=80	f	t	6	t	f	4.80	175	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_egg_54	Egg Podimas	Scrambled egg preparation	cat_egg	Egg Specials	50.00	\N	https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=600&auto=format&fit=crop&q=80	f	t	8	f	f	4.70	90	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_egg_55	Egg Masal	Egg cooked with masala	cat_egg	Egg Specials	70.00	\N	https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&auto=format&fit=crop&q=80	f	t	10	f	f	4.70	85	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
item_rice_56	M.T. Biryani	Biryani listed as “M.T. Biryani” on the board	cat_rice	Rice Items	70.00	\N	https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80	f	t	8	f	f	4.70	140	[]	[]	[]	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, user_role, title, message, type, is_read, order_id, created_at) FROM stdin;
notif_1791015854705_9ahk	usr_1791015854458_ue5f	CUSTOMER	Order Delivered	Your order has been delivered hot and fresh!	ORDER	f	ord_1791015854651_zm2gf	2026-10-03 13:54:14.706281+05:30
notif_1791016144545_42fw	usr_1791016144293_7o6a	CUSTOMER	Order Delivered	Your order has been delivered hot and fresh!	ORDER	f	ord_1791016144486_b8aa1	2026-10-03 13:59:04.545945+05:30
notif_1791019866486_01pe	usr_1791019866232_xaqg	CUSTOMER	Order Delivered	Your order has been delivered hot and fresh!	ORDER	f	ord_1791019866425_750cz	2026-10-03 15:01:06.486452+05:30
notif_1791019999290_q3i7	usr_1791019999048_x3vt	CUSTOMER	Order Delivered	Your order has been delivered hot and fresh!	ORDER	f	ord_1791019999237_n0qv5	2026-10-03 15:03:19.290428+05:30
notif_1791020334081_ryvy	usr_1791020333834_y4g4	CUSTOMER	Order Delivered	Your order has been delivered hot and fresh!	ORDER	f	ord_1791020334025_d7ybx	2026-10-03 15:08:54.082087+05:30
notif_1791030963498_hvex	usr_1791030963223_6yf3	CUSTOMER	Order Delivered	Your order has been delivered hot and fresh!	ORDER	f	ord_1791030963423_crgab	2026-10-03 18:06:03.498998+05:30
notif_1791116738233_g7f0	usr_1791116737964_xyu2	CUSTOMER	Order Delivered	Your order has been delivered hot and fresh!	ORDER	f	ord_1791116738159_g6uje	2026-10-04 17:55:38.234815+05:30
\.


--
-- Data for Name: order_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_events (id, order_id, status, title, description, "timestamp", changed_by, changed_by_role) FROM stdin;
evt_1791015752400_1kgl	ord_1791015752400_ufu15	PLACED	Order Placed	Order #HK-20261003-319508 placed successfully with total ₹333	2026-10-03 13:52:32.4+05:30	Priya Sharma	CUSTOMER
evt_1791015827683_6f07	ord_1791015827683_d0rex	PLACED	Order Placed	Order #HK-20261003-520437 placed successfully with total ₹333	2026-10-03 13:53:47.683+05:30	Priya Sharma	CUSTOMER
evt_1791015827693_k9qf	ord_1791015827683_d0rex	ACCEPTED	Order ACCEPTED	Status changed to ACCEPTED by Master Chef (STAFF)	2026-10-03 13:53:47.692959+05:30	Master Chef	STAFF
evt_1791015827700_9n49	ord_1791015827683_d0rex	PREPARING	Order PREPARING	Status changed to PREPARING by Master Chef (STAFF)	2026-10-03 13:53:47.700517+05:30	Master Chef	STAFF
evt_1791015827705_q9i0	ord_1791015827683_d0rex	READY	Order READY	Status changed to READY by Master Chef (STAFF)	2026-10-03 13:53:47.705977+05:30	Master Chef	STAFF
evt_1791015827710_gu4r	ord_1791015827683_d0rex	ASSIGNED	Order ASSIGNED	Status changed to ASSIGNED by Manager Kumar (STAFF)	2026-10-03 13:53:47.71093+05:30	Manager Kumar	STAFF
evt_1791015854651_891f	ord_1791015854651_zm2gf	PLACED	Order Placed	Order #HK-20261003-573011 placed successfully with total ₹333	2026-10-03 13:54:14.651+05:30	Priya Sharma	CUSTOMER
evt_1791015854661_sftl	ord_1791015854651_zm2gf	ACCEPTED	Order ACCEPTED	Status changed to ACCEPTED by Master Chef (STAFF)	2026-10-03 13:54:14.661011+05:30	Master Chef	STAFF
evt_1791015854668_qncs	ord_1791015854651_zm2gf	PREPARING	Order PREPARING	Status changed to PREPARING by Master Chef (STAFF)	2026-10-03 13:54:14.667734+05:30	Master Chef	STAFF
evt_1791015854674_kwv8	ord_1791015854651_zm2gf	READY	Order READY	Status changed to READY by Master Chef (STAFF)	2026-10-03 13:54:14.674779+05:30	Master Chef	STAFF
evt_1791015854679_k7g7	ord_1791015854651_zm2gf	ASSIGNED	Order ASSIGNED	Status changed to ASSIGNED by Manager Kumar (STAFF)	2026-10-03 13:54:14.679616+05:30	Manager Kumar	STAFF
evt_1791015881519_e5mi	ord_1791015881519_f4nz4	PLACED	Order Placed	Order #HK-20261003-902331 placed successfully with total ₹204	2026-10-03 13:54:41.519+05:30	Priya Sundaram	CUSTOMER
evt_1791015881529_8ne2	ord_1791015881519_f4nz4	ACCEPTED	Order ACCEPTED	Status changed to ACCEPTED by Chef Raj (STAFF)	2026-10-03 13:54:41.528571+05:30	Chef Raj	STAFF
evt_1791015881535_4vjj	ord_1791015881519_f4nz4	PREPARING	Order PREPARING	Status changed to PREPARING by Chef Raj (STAFF)	2026-10-03 13:54:41.534893+05:30	Chef Raj	STAFF
evt_1791015881543_dosg	ord_1791015881519_f4nz4	READY	Order READY	Status changed to READY by Chef Raj (STAFF)	2026-10-03 13:54:41.542386+05:30	Chef Raj	STAFF
evt_1791015881550_h2ru	ord_1791015881519_f4nz4	ASSIGNED	Order ASSIGNED	Status changed to ASSIGNED by Chef Raj (STAFF)	2026-10-03 13:54:41.549492+05:30	Chef Raj	STAFF
evt_1791016144486_sbyk	ord_1791016144486_b8aa1	PLACED	Order Placed	Order #HK-20261003-899986 placed successfully with total ₹333	2026-10-03 13:59:04.486+05:30	Priya Sharma	CUSTOMER
evt_1791016144495_m595	ord_1791016144486_b8aa1	ACCEPTED	Order ACCEPTED	Status changed to ACCEPTED by Master Chef (STAFF)	2026-10-03 13:59:04.494502+05:30	Master Chef	STAFF
evt_1791016144504_b142	ord_1791016144486_b8aa1	PREPARING	Order PREPARING	Status changed to PREPARING by Master Chef (STAFF)	2026-10-03 13:59:04.503124+05:30	Master Chef	STAFF
evt_1791016144509_15ng	ord_1791016144486_b8aa1	READY	Order READY	Status changed to READY by Master Chef (STAFF)	2026-10-03 13:59:04.508563+05:30	Master Chef	STAFF
evt_1791016144515_n2lc	ord_1791016144486_b8aa1	ASSIGNED	Order ASSIGNED	Status changed to ASSIGNED by Manager Kumar (STAFF)	2026-10-03 13:59:04.514102+05:30	Manager Kumar	STAFF
evt_1791016151276_ah1a	ord_1791016151276_gidm3	PLACED	Order Placed	Order #HK-20261003-269704 placed successfully with total ₹204	2026-10-03 13:59:11.276+05:30	Priya Sundaram	CUSTOMER
evt_1791016151286_z6nv	ord_1791016151276_gidm3	ACCEPTED	Order ACCEPTED	Status changed to ACCEPTED by Chef Raj (STAFF)	2026-10-03 13:59:11.285178+05:30	Chef Raj	STAFF
evt_1791016151292_lw4m	ord_1791016151276_gidm3	PREPARING	Order PREPARING	Status changed to PREPARING by Chef Raj (STAFF)	2026-10-03 13:59:11.291477+05:30	Chef Raj	STAFF
evt_1791016151297_3p92	ord_1791016151276_gidm3	READY	Order READY	Status changed to READY by Chef Raj (STAFF)	2026-10-03 13:59:11.296978+05:30	Chef Raj	STAFF
evt_1791016151303_6lc9	ord_1791016151276_gidm3	ASSIGNED	Order ASSIGNED	Status changed to ASSIGNED by Chef Raj (STAFF)	2026-10-03 13:59:11.301788+05:30	Chef Raj	STAFF
evt_1791019866425_dfiu	ord_1791019866425_750cz	PLACED	Order Placed	Order #HK-20261003-765402 placed successfully with total ₹333	2026-10-03 15:01:06.425+05:30	Priya Sharma	CUSTOMER
evt_1791019866437_7qqt	ord_1791019866425_750cz	ACCEPTED	Order ACCEPTED	Status changed to ACCEPTED by Master Chef (STAFF)	2026-10-03 15:01:06.436174+05:30	Master Chef	STAFF
evt_1791019866445_avg8	ord_1791019866425_750cz	PREPARING	Order PREPARING	Status changed to PREPARING by Master Chef (STAFF)	2026-10-03 15:01:06.443933+05:30	Master Chef	STAFF
evt_1791019866450_kbr9	ord_1791019866425_750cz	READY	Order READY	Status changed to READY by Master Chef (STAFF)	2026-10-03 15:01:06.449621+05:30	Master Chef	STAFF
evt_1791019866455_pkpo	ord_1791019866425_750cz	ASSIGNED	Order ASSIGNED	Status changed to ASSIGNED by Manager Kumar (STAFF)	2026-10-03 15:01:06.454854+05:30	Manager Kumar	STAFF
evt_1791019999237_175p	ord_1791019999237_n0qv5	PLACED	Order Placed	Order #HK-20261003-760130 placed successfully with total ₹333	2026-10-03 15:03:19.237+05:30	Priya Sharma	CUSTOMER
evt_1791019999246_nzg7	ord_1791019999237_n0qv5	ACCEPTED	Order ACCEPTED	Status changed to ACCEPTED by Master Chef (STAFF)	2026-10-03 15:03:19.244803+05:30	Master Chef	STAFF
evt_1791019999253_1kae	ord_1791019999237_n0qv5	PREPARING	Order PREPARING	Status changed to PREPARING by Master Chef (STAFF)	2026-10-03 15:03:19.252086+05:30	Master Chef	STAFF
evt_1791019999259_kc2b	ord_1791019999237_n0qv5	READY	Order READY	Status changed to READY by Master Chef (STAFF)	2026-10-03 15:03:19.258836+05:30	Master Chef	STAFF
evt_1791019999264_2mwm	ord_1791019999237_n0qv5	ASSIGNED	Order ASSIGNED	Status changed to ASSIGNED by Manager Kumar (STAFF)	2026-10-03 15:03:19.263842+05:30	Manager Kumar	STAFF
evt_1791020311757_jgsa	ord_1791020311757_tp78k	PLACED	Order Placed	Order #HK-20261003-698399 placed successfully with total ₹204	2026-10-03 15:08:31.757+05:30	Priya Sundaram	CUSTOMER
evt_1791020311765_im7g	ord_1791020311757_tp78k	ACCEPTED	Order ACCEPTED	Status changed to ACCEPTED by Chef Raj (STAFF)	2026-10-03 15:08:31.765068+05:30	Chef Raj	STAFF
evt_1791020311770_bkdq	ord_1791020311757_tp78k	PREPARING	Order PREPARING	Status changed to PREPARING by Chef Raj (STAFF)	2026-10-03 15:08:31.770096+05:30	Chef Raj	STAFF
evt_1791020311775_gazx	ord_1791020311757_tp78k	READY	Order READY	Status changed to READY by Chef Raj (STAFF)	2026-10-03 15:08:31.774598+05:30	Chef Raj	STAFF
evt_1791020311779_z7g8	ord_1791020311757_tp78k	ASSIGNED	Order ASSIGNED	Status changed to ASSIGNED by Chef Raj (STAFF)	2026-10-03 15:08:31.779409+05:30	Chef Raj	STAFF
evt_1791020334025_hvw4	ord_1791020334025_d7ybx	PLACED	Order Placed	Order #HK-20261003-971817 placed successfully with total ₹333	2026-10-03 15:08:54.025+05:30	Priya Sharma	CUSTOMER
evt_1791020334034_oyjl	ord_1791020334025_d7ybx	ACCEPTED	Order ACCEPTED	Status changed to ACCEPTED by Master Chef (STAFF)	2026-10-03 15:08:54.033403+05:30	Master Chef	STAFF
evt_1791020334041_zetm	ord_1791020334025_d7ybx	PREPARING	Order PREPARING	Status changed to PREPARING by Master Chef (STAFF)	2026-10-03 15:08:54.040612+05:30	Master Chef	STAFF
evt_1791020334045_yiur	ord_1791020334025_d7ybx	READY	Order READY	Status changed to READY by Master Chef (STAFF)	2026-10-03 15:08:54.045378+05:30	Master Chef	STAFF
evt_1791020334052_f2qo	ord_1791020334025_d7ybx	ASSIGNED	Order ASSIGNED	Status changed to ASSIGNED by Manager Kumar (STAFF)	2026-10-03 15:08:54.050949+05:30	Manager Kumar	STAFF
evt_1791030963423_ijco	ord_1791030963423_crgab	PLACED	Order Placed	Order #HK-20261003-710410 placed successfully with total ₹333	2026-10-03 18:06:03.423+05:30	Priya Sharma	CUSTOMER
evt_1791030963438_ujxl	ord_1791030963423_crgab	ACCEPTED	Order ACCEPTED	Status changed to ACCEPTED by Master Chef (STAFF)	2026-10-03 18:06:03.436008+05:30	Master Chef	STAFF
evt_1791030963446_kt3u	ord_1791030963423_crgab	PREPARING	Order PREPARING	Status changed to PREPARING by Master Chef (STAFF)	2026-10-03 18:06:03.446163+05:30	Master Chef	STAFF
evt_1791030963452_y7yy	ord_1791030963423_crgab	READY	Order READY	Status changed to READY by Master Chef (STAFF)	2026-10-03 18:06:03.452322+05:30	Master Chef	STAFF
evt_1791030963459_uweu	ord_1791030963423_crgab	ASSIGNED	Order ASSIGNED	Status changed to ASSIGNED by Manager Kumar (STAFF)	2026-10-03 18:06:03.459253+05:30	Manager Kumar	STAFF
evt_1791116709647_t5p4	ord_1791116709647_ic3o3	PLACED	Order Placed	Order #HK-20261004-293687 placed successfully with total ₹204	2026-10-04 17:55:09.647+05:30	Priya Sundaram	CUSTOMER
evt_1791116709663_x2pg	ord_1791116709647_ic3o3	ACCEPTED	Order ACCEPTED	Status changed to ACCEPTED by Chef Raj (STAFF)	2026-10-04 17:55:09.661394+05:30	Chef Raj	STAFF
evt_1791116709672_qw3q	ord_1791116709647_ic3o3	PREPARING	Order PREPARING	Status changed to PREPARING by Chef Raj (STAFF)	2026-10-04 17:55:09.670676+05:30	Chef Raj	STAFF
evt_1791116709681_3d54	ord_1791116709647_ic3o3	READY	Order READY	Status changed to READY by Chef Raj (STAFF)	2026-10-04 17:55:09.680531+05:30	Chef Raj	STAFF
evt_1791116709688_0w0e	ord_1791116709647_ic3o3	ASSIGNED	Order ASSIGNED	Status changed to ASSIGNED by Chef Raj (STAFF)	2026-10-04 17:55:09.687592+05:30	Chef Raj	STAFF
evt_1791116738159_lc8u	ord_1791116738159_g6uje	PLACED	Order Placed	Order #HK-20261004-306407 placed successfully with total ₹333	2026-10-04 17:55:38.159+05:30	Priya Sharma	CUSTOMER
evt_1791116738169_czze	ord_1791116738159_g6uje	ACCEPTED	Order ACCEPTED	Status changed to ACCEPTED by Master Chef (STAFF)	2026-10-04 17:55:38.168498+05:30	Master Chef	STAFF
evt_1791116738178_h1nv	ord_1791116738159_g6uje	PREPARING	Order PREPARING	Status changed to PREPARING by Master Chef (STAFF)	2026-10-04 17:55:38.178214+05:30	Master Chef	STAFF
evt_1791116738184_awjm	ord_1791116738159_g6uje	READY	Order READY	Status changed to READY by Master Chef (STAFF)	2026-10-04 17:55:38.184588+05:30	Master Chef	STAFF
evt_1791116738192_i8fn	ord_1791116738159_g6uje	ASSIGNED	Order ASSIGNED	Status changed to ASSIGNED by Manager Kumar (STAFF)	2026-10-04 17:55:38.191668+05:30	Manager Kumar	STAFF
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, menu_item_id, name, unit_price, quantity, is_veg, customizations, addons, special_instructions, total_price, created_at) FROM stdin;
1	ord_1791015752400_ufu15	item_chittinadu_28	Chittinadu Beef Biryani	130.00	2	f	[]	[]		260.00	2026-10-03 13:52:32.401246+05:30
2	ord_1791015827683_d0rex	item_chittinadu_28	Chittinadu Beef Biryani	130.00	2	f	[]	[]		260.00	2026-10-03 13:53:47.684365+05:30
3	ord_1791015854651_zm2gf	item_chittinadu_28	Chittinadu Beef Biryani	130.00	2	f	[]	[]		260.00	2026-10-03 13:54:14.652241+05:30
4	ord_1791015881519_f4nz4	item_beef_48	Beef 65	150.00	1	f	[]	[]		150.00	2026-10-03 13:54:41.520454+05:30
5	ord_1791016144486_b8aa1	item_chittinadu_28	Chittinadu Beef Biryani	130.00	2	f	[]	[]		260.00	2026-10-03 13:59:04.486617+05:30
6	ord_1791016151276_gidm3	item_beef_48	Beef 65	150.00	1	f	[]	[]		150.00	2026-10-03 13:59:11.277149+05:30
7	ord_1791019866425_750cz	item_chittinadu_28	Chittinadu Beef Biryani	130.00	2	f	[]	[]		260.00	2026-10-03 15:01:06.425864+05:30
8	ord_1791019999237_n0qv5	item_chittinadu_28	Chittinadu Beef Biryani	130.00	2	f	[]	[]		260.00	2026-10-03 15:03:19.237702+05:30
9	ord_1791020311757_tp78k	item_beef_48	Beef 65	150.00	1	f	[]	[]		150.00	2026-10-03 15:08:31.75838+05:30
10	ord_1791020334025_d7ybx	item_chittinadu_28	Chittinadu Beef Biryani	130.00	2	f	[]	[]		260.00	2026-10-03 15:08:54.026321+05:30
11	ord_1791030963423_crgab	item_chittinadu_28	Chittinadu Beef Biryani	130.00	2	f	[]	[]		260.00	2026-10-03 18:06:03.424158+05:30
12	ord_1791116709647_ic3o3	item_beef_48	Beef 65	150.00	1	f	[]	[]		150.00	2026-10-04 17:55:09.648025+05:30
13	ord_1791116738159_g6uje	item_chittinadu_28	Chittinadu Beef Biryani	130.00	2	f	[]	[]		260.00	2026-10-04 17:55:38.160012+05:30
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, order_number, customer_id, customer_name, customer_phone, delivery_address, order_notes, subtotal, delivery_fee, tax, discount, grand_total, payment_method, payment_status, payment_transaction_id, cod_cash_tendered, cod_change_due, status, rejection_reason, cancellation_reason, assigned_staff_id, assigned_staff_name, assigned_delivery_partner_id, assigned_delivery_partner_name, assigned_delivery_partner_phone, assigned_delivery_partner_vehicle, batch_id, checklist, scheduled_slot, has_been_reviewed, version, created_at, accepted_at, preparing_at, ready_at, picked_up_at, delivered_at, cancelled_at, updated_at) FROM stdin;
ord_1791015752400_ufu15	HK-20261003-319508	usr_1791015752171_lre8	Priya Sharma	+91 98765 43210	{"id": "addr_test", "area": "Peelamedu", "city": "Coimbatore", "name": "Priya Sharma", "type": "WORK", "phone": "+91 98765 43210", "doorNo": "77-A", "street": "Avinashi Road", "pincode": "641004"}		260.00	35.00	38.00	0.00	333.00	COD	COD_PENDING	\N	1000.00	667.00	PLACED	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	1	2026-10-03 13:52:32.401246+05:30	\N	\N	\N	\N	\N	\N	2026-10-03 13:52:32.401246+05:30
ord_1791015827683_d0rex	HK-20261003-520437	usr_1791015827486_9fe3	Priya Sharma	+91 98765 43210	{"id": "addr_test", "area": "Peelamedu", "city": "Coimbatore", "name": "Priya Sharma", "type": "WORK", "phone": "+91 98765 43210", "doorNo": "77-A", "street": "Avinashi Road", "pincode": "641004"}		260.00	35.00	38.00	0.00	333.00	COD	COD_PENDING	\N	1000.00	667.00	ASSIGNED	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	5	2026-10-03 13:53:47.684365+05:30	2026-10-03 13:53:47.692+05:30	2026-10-03 13:53:47.699+05:30	2026-10-03 13:53:47.705+05:30	\N	\N	\N	2026-10-03 13:53:47.71093+05:30
ord_1791015854651_zm2gf	HK-20261003-573011	usr_1791015854458_ue5f	Priya Sharma	+91 98765 43210	{"id": "addr_test", "area": "Peelamedu", "city": "Coimbatore", "name": "Priya Sharma", "type": "WORK", "phone": "+91 98765 43210", "doorNo": "77-A", "street": "Avinashi Road", "pincode": "641004"}		260.00	35.00	38.00	0.00	333.00	COD	COD_PENDING	\N	1000.00	667.00	ASSIGNED	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	5	2026-10-03 13:54:14.652241+05:30	2026-10-03 13:54:14.66+05:30	2026-10-03 13:54:14.667+05:30	2026-10-03 13:54:14.674+05:30	\N	\N	\N	2026-10-03 13:54:14.679616+05:30
ord_1791015881519_f4nz4	HK-20261003-902331	usr_customer_1	Priya Sundaram	+91 99887 76655	{"id": "addr_1", "area": "Race Course", "city": "Coimbatore", "name": "Priya Sundaram", "type": "HOME", "phone": "+91 99887 76655", "doorNo": "12", "street": "Race Course Road", "pincode": "641018", "isDefault": true, "coordinates": "11.0168,76.9558"}		150.00	35.00	19.00	0.00	204.00	COD	COD_PENDING	\N	500.00	296.00	ASSIGNED	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	5	2026-10-03 13:54:41.520454+05:30	2026-10-03 13:54:41.528+05:30	2026-10-03 13:54:41.534+05:30	2026-10-03 13:54:41.542+05:30	\N	\N	\N	2026-10-03 13:54:41.549492+05:30
ord_1791016144486_b8aa1	HK-20261003-899986	usr_1791016144293_7o6a	Priya Sharma	+91 98765 43210	{"id": "addr_test", "area": "Peelamedu", "city": "Coimbatore", "name": "Priya Sharma", "type": "WORK", "phone": "+91 98765 43210", "doorNo": "77-A", "street": "Avinashi Road", "pincode": "641004"}		260.00	35.00	38.00	0.00	333.00	COD	COD_PENDING	\N	1000.00	667.00	ASSIGNED	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	5	2026-10-03 13:59:04.486617+05:30	2026-10-03 13:59:04.495+05:30	2026-10-03 13:59:04.503+05:30	2026-10-03 13:59:04.508+05:30	\N	\N	\N	2026-10-03 13:59:04.514102+05:30
ord_1791016151276_gidm3	HK-20261003-269704	usr_customer_1	Priya Sundaram	+91 99887 76655	{"id": "addr_1", "area": "Race Course", "city": "Coimbatore", "name": "Priya Sundaram", "type": "HOME", "phone": "+91 99887 76655", "doorNo": "12", "street": "Race Course Road", "pincode": "641018", "isDefault": true, "coordinates": "11.0168,76.9558"}		150.00	35.00	19.00	0.00	204.00	COD	COD_PENDING	\N	500.00	296.00	ASSIGNED	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	5	2026-10-03 13:59:11.277149+05:30	2026-10-03 13:59:11.285+05:30	2026-10-03 13:59:11.291+05:30	2026-10-03 13:59:11.297+05:30	\N	\N	\N	2026-10-03 13:59:11.301788+05:30
ord_1791019866425_750cz	HK-20261003-765402	usr_1791019866232_xaqg	Priya Sharma	+91 98765 43210	{"id": "addr_test", "area": "Peelamedu", "city": "Coimbatore", "name": "Priya Sharma", "type": "WORK", "phone": "+91 98765 43210", "doorNo": "77-A", "street": "Avinashi Road", "pincode": "641004"}		260.00	35.00	38.00	0.00	333.00	COD	COD_PENDING	\N	1000.00	667.00	ASSIGNED	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	5	2026-10-03 15:01:06.425864+05:30	2026-10-03 15:01:06.436+05:30	2026-10-03 15:01:06.444+05:30	2026-10-03 15:01:06.45+05:30	\N	\N	\N	2026-10-03 15:01:06.454854+05:30
ord_1791019999237_n0qv5	HK-20261003-760130	usr_1791019999048_x3vt	Priya Sharma	+91 98765 43210	{"id": "addr_test", "area": "Peelamedu", "city": "Coimbatore", "name": "Priya Sharma", "type": "WORK", "phone": "+91 98765 43210", "doorNo": "77-A", "street": "Avinashi Road", "pincode": "641004"}		260.00	35.00	38.00	0.00	333.00	COD	COD_PENDING	\N	1000.00	667.00	ASSIGNED	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	5	2026-10-03 15:03:19.237702+05:30	2026-10-03 15:03:19.245+05:30	2026-10-03 15:03:19.252+05:30	2026-10-03 15:03:19.259+05:30	\N	\N	\N	2026-10-03 15:03:19.263842+05:30
ord_1791020311757_tp78k	HK-20261003-698399	usr_customer_1	Priya Sundaram	+91 99887 76655	{"id": "addr_1", "area": "Race Course", "city": "Coimbatore", "name": "Priya Sundaram", "type": "HOME", "phone": "+91 99887 76655", "doorNo": "12", "street": "Race Course Road", "pincode": "641018", "isDefault": true, "coordinates": "11.0168,76.9558"}		150.00	35.00	19.00	0.00	204.00	COD	COD_PENDING	\N	500.00	296.00	ASSIGNED	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	5	2026-10-03 15:08:31.75838+05:30	2026-10-03 15:08:31.765+05:30	2026-10-03 15:08:31.77+05:30	2026-10-03 15:08:31.774+05:30	\N	\N	\N	2026-10-03 15:08:31.779409+05:30
ord_1791020334025_d7ybx	HK-20261003-971817	usr_1791020333834_y4g4	Priya Sharma	+91 98765 43210	{"id": "addr_test", "area": "Peelamedu", "city": "Coimbatore", "name": "Priya Sharma", "type": "WORK", "phone": "+91 98765 43210", "doorNo": "77-A", "street": "Avinashi Road", "pincode": "641004"}		260.00	35.00	38.00	0.00	333.00	COD	COD_PENDING	\N	1000.00	667.00	ASSIGNED	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	5	2026-10-03 15:08:54.026321+05:30	2026-10-03 15:08:54.033+05:30	2026-10-03 15:08:54.04+05:30	2026-10-03 15:08:54.045+05:30	\N	\N	\N	2026-10-03 15:08:54.050949+05:30
ord_1791030963423_crgab	HK-20261003-710410	usr_1791030963223_6yf3	Priya Sharma	+91 98765 43210	{"id": "addr_test", "area": "Peelamedu", "city": "Coimbatore", "name": "Priya Sharma", "type": "WORK", "phone": "+91 98765 43210", "doorNo": "77-A", "street": "Avinashi Road", "pincode": "641004"}		260.00	35.00	38.00	0.00	333.00	COD	COD_PENDING	\N	1000.00	667.00	ASSIGNED	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	5	2026-10-03 18:06:03.424158+05:30	2026-10-03 18:06:03.436+05:30	2026-10-03 18:06:03.445+05:30	2026-10-03 18:06:03.452+05:30	\N	\N	\N	2026-10-03 18:06:03.459253+05:30
ord_1791116709647_ic3o3	HK-20261004-293687	usr_customer_1	Priya Sundaram	+91 99887 76655	{"id": "addr_1", "area": "Race Course", "city": "Coimbatore", "name": "Priya Sundaram", "type": "HOME", "phone": "+91 99887 76655", "doorNo": "12", "street": "Race Course Road", "pincode": "641018", "isDefault": true, "coordinates": "11.0168,76.9558"}		150.00	35.00	19.00	0.00	204.00	COD	COD_PENDING	\N	500.00	296.00	ASSIGNED	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	5	2026-10-04 17:55:09.648025+05:30	2026-10-04 17:55:09.662+05:30	2026-10-04 17:55:09.671+05:30	2026-10-04 17:55:09.68+05:30	\N	\N	\N	2026-10-04 17:55:09.687592+05:30
ord_1791116738159_g6uje	HK-20261004-306407	usr_1791116737964_xyu2	Priya Sharma	+91 98765 43210	{"id": "addr_test", "area": "Peelamedu", "city": "Coimbatore", "name": "Priya Sharma", "type": "WORK", "phone": "+91 98765 43210", "doorNo": "77-A", "street": "Avinashi Road", "pincode": "641004"}		260.00	35.00	38.00	0.00	333.00	COD	COD_PENDING	\N	1000.00	667.00	ASSIGNED	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	5	2026-10-04 17:55:38.160012+05:30	2026-10-04 17:55:38.168+05:30	2026-10-04 17:55:38.177+05:30	2026-10-04 17:55:38.184+05:30	\N	\N	\N	2026-10-04 17:55:38.191668+05:30
\.


--
-- Data for Name: outbox_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.outbox_events (id, aggregate_type, aggregate_id, event_type, payload, status, retry_count, max_retries, last_error, processing_started_at, created_at, processed_at, next_retry_at) FROM stdin;
evt_stale_1791015154246	ORDER	ORD_STALE_99	ORDER_CONFIRMED	{"test": true}	COMPLETED	0	3	\N	2026-10-03 13:43:09.194+05:30	2026-10-03 13:40:29.246+05:30	2026-10-03 13:43:09.196+05:30	\N
evt_1791015154250_lu738	ORDER	ord_1791015154247	ORDER_CONFIRMED	{"orderId": "ord_1791015154247", "newStatus": "ACCEPTED", "oldStatus": "PLACED", "updatedBy": "Chef Raj", "orderNumber": "HK-20261003-000101", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	COMPLETED	0	3	\N	2026-10-03 13:43:09.198+05:30	2026-10-03 13:42:34.25+05:30	2026-10-03 13:43:09.198+05:30	\N
evt_1791015154252_ymh31	ORDER	ord_1791015154247	ORDER_PREPARING	{"orderId": "ord_1791015154247", "newStatus": "PREPARING", "oldStatus": "ACCEPTED", "updatedBy": "Chef Raj", "orderNumber": "HK-20261003-000101", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	COMPLETED	0	3	\N	2026-10-03 13:43:09.199+05:30	2026-10-03 13:42:34.252+05:30	2026-10-03 13:43:09.199+05:30	\N
evt_1791015154255_019bo	ORDER	ord_1791015154247	ORDER_READY	{"orderId": "ord_1791015154247", "newStatus": "READY", "oldStatus": "PREPARING", "updatedBy": "Chef Raj", "orderNumber": "HK-20261003-000101", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	COMPLETED	0	3	\N	2026-10-03 13:43:09.2+05:30	2026-10-03 13:42:34.255+05:30	2026-10-03 13:43:09.2+05:30	\N
evt_1791015154258_36b4u	ORDER	ord_1791015154247	RIDER_ASSIGNED	{"orderId": "ord_1791015154247", "newStatus": "ASSIGNED", "oldStatus": "READY", "updatedBy": "Chef Raj", "orderNumber": "HK-20261003-000101", "paymentMethod": "COD", "paymentStatus": "COD_PENDING", "assignedDeliveryPartnerName": "Arun Kumar"}	COMPLETED	0	3	\N	2026-10-03 13:43:09.201+05:30	2026-10-03 13:42:34.258+05:30	2026-10-03 13:43:09.201+05:30	\N
evt_outbox_1791015633959	ORDER	ord_test_1791015633898	ORDER_DELIVERED	{"orderId": "ord_test_1791015633898", "deliveredAt": "2026-10-03T08:20:33.959Z"}	PENDING	0	3	\N	\N	2026-10-03 13:47:53.959+05:30	\N	\N
evt_outbox_1791015752511	ORDER	ord_test_1791015752400	ORDER_DELIVERED	{"orderId": "ord_test_1791015752400", "deliveredAt": "2026-10-03T08:22:32.511Z"}	PENDING	0	3	\N	\N	2026-10-03 13:49:52.511+05:30	\N	\N
evt_1791015827694_hpr66	ORDER	ord_1791015827683_d0rex	ORDER_CONFIRMED	{"orderId": "ord_1791015827683_d0rex", "newStatus": "ACCEPTED", "oldStatus": "PLACED", "updatedBy": "Master Chef", "orderNumber": "HK-20261003-520437", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 13:53:47.694+05:30	\N	\N
evt_1791015827702_omv6p	ORDER	ord_1791015827683_d0rex	ORDER_PREPARING	{"orderId": "ord_1791015827683_d0rex", "newStatus": "PREPARING", "oldStatus": "ACCEPTED", "updatedBy": "Master Chef", "orderNumber": "HK-20261003-520437", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 13:53:47.702+05:30	\N	\N
evt_1791015827707_kfue3	ORDER	ord_1791015827683_d0rex	ORDER_READY	{"orderId": "ord_1791015827683_d0rex", "newStatus": "READY", "oldStatus": "PREPARING", "updatedBy": "Master Chef", "orderNumber": "HK-20261003-520437", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 13:53:47.707+05:30	\N	\N
evt_1791015827712_qbter	ORDER	ord_1791015827683_d0rex	RIDER_ASSIGNED	{"orderId": "ord_1791015827683_d0rex", "newStatus": "ASSIGNED", "oldStatus": "READY", "updatedBy": "Manager Kumar", "orderNumber": "HK-20261003-520437", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 13:53:47.712+05:30	\N	\N
evt_outbox_1791015827725	ORDER	ord_1791015827683_d0rex	ORDER_DELIVERED	{"orderId": "ord_1791015827683_d0rex", "deliveredAt": "2026-10-03T08:23:47.725Z"}	PENDING	0	3	\N	\N	2026-10-03 13:51:07.725+05:30	\N	\N
evt_1791015854662_dbqbr	ORDER	ord_1791015854651_zm2gf	ORDER_CONFIRMED	{"orderId": "ord_1791015854651_zm2gf", "newStatus": "ACCEPTED", "oldStatus": "PLACED", "updatedBy": "Master Chef", "orderNumber": "HK-20261003-573011", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 13:54:14.662+05:30	\N	\N
evt_1791015854670_09pwh	ORDER	ord_1791015854651_zm2gf	ORDER_PREPARING	{"orderId": "ord_1791015854651_zm2gf", "newStatus": "PREPARING", "oldStatus": "ACCEPTED", "updatedBy": "Master Chef", "orderNumber": "HK-20261003-573011", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 13:54:14.67+05:30	\N	\N
evt_1791015854676_r4jrn	ORDER	ord_1791015854651_zm2gf	ORDER_READY	{"orderId": "ord_1791015854651_zm2gf", "newStatus": "READY", "oldStatus": "PREPARING", "updatedBy": "Master Chef", "orderNumber": "HK-20261003-573011", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 13:54:14.676+05:30	\N	\N
evt_1791015854681_o3len	ORDER	ord_1791015854651_zm2gf	RIDER_ASSIGNED	{"orderId": "ord_1791015854651_zm2gf", "newStatus": "ASSIGNED", "oldStatus": "READY", "updatedBy": "Manager Kumar", "orderNumber": "HK-20261003-573011", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 13:54:14.681+05:30	\N	\N
evt_outbox_1791015854694	ORDER	ord_1791015854651_zm2gf	ORDER_DELIVERED	{"orderId": "ord_1791015854651_zm2gf", "deliveredAt": "2026-10-03T08:24:14.694Z"}	PENDING	0	3	\N	\N	2026-10-03 13:51:34.694+05:30	\N	\N
evt_stale_1791015861459	ORDER	ORD_STALE_99	ORDER_CONFIRMED	{"test": true}	PENDING	0	3	\N	\N	2026-10-03 13:52:16.459+05:30	\N	\N
evt_stale_1791015881511	ORDER	ORD_STALE_99	ORDER_CONFIRMED	{"test": true}	PENDING	0	3	\N	\N	2026-10-03 13:52:36.511+05:30	\N	\N
evt_1791015881530_yl42r	ORDER	ord_1791015881519_f4nz4	ORDER_CONFIRMED	{"orderId": "ord_1791015881519_f4nz4", "newStatus": "ACCEPTED", "oldStatus": "PLACED", "updatedBy": "Chef Raj", "orderNumber": "HK-20261003-902331", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 13:54:41.53+05:30	\N	\N
evt_1791015881537_o6uw2	ORDER	ord_1791015881519_f4nz4	ORDER_PREPARING	{"orderId": "ord_1791015881519_f4nz4", "newStatus": "PREPARING", "oldStatus": "ACCEPTED", "updatedBy": "Chef Raj", "orderNumber": "HK-20261003-902331", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 13:54:41.537+05:30	\N	\N
evt_1791015881544_cpbdr	ORDER	ord_1791015881519_f4nz4	ORDER_READY	{"orderId": "ord_1791015881519_f4nz4", "newStatus": "READY", "oldStatus": "PREPARING", "updatedBy": "Chef Raj", "orderNumber": "HK-20261003-902331", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 13:54:41.544+05:30	\N	\N
evt_1791015881551_31aap	ORDER	ord_1791015881519_f4nz4	RIDER_ASSIGNED	{"orderId": "ord_1791015881519_f4nz4", "newStatus": "ASSIGNED", "oldStatus": "READY", "updatedBy": "Chef Raj", "orderNumber": "HK-20261003-902331", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 13:54:41.551+05:30	\N	\N
evt_1791016144497_vtyim	ORDER	ord_1791016144486_b8aa1	ORDER_CONFIRMED	{"orderId": "ord_1791016144486_b8aa1", "newStatus": "ACCEPTED", "oldStatus": "PLACED", "updatedBy": "Master Chef", "orderNumber": "HK-20261003-899986", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 13:59:04.497+05:30	\N	\N
evt_1791016144505_l5v33	ORDER	ord_1791016144486_b8aa1	ORDER_PREPARING	{"orderId": "ord_1791016144486_b8aa1", "newStatus": "PREPARING", "oldStatus": "ACCEPTED", "updatedBy": "Master Chef", "orderNumber": "HK-20261003-899986", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 13:59:04.505+05:30	\N	\N
evt_1791016144510_d5ldo	ORDER	ord_1791016144486_b8aa1	ORDER_READY	{"orderId": "ord_1791016144486_b8aa1", "newStatus": "READY", "oldStatus": "PREPARING", "updatedBy": "Master Chef", "orderNumber": "HK-20261003-899986", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 13:59:04.51+05:30	\N	\N
evt_1791016144516_5ujmv	ORDER	ord_1791016144486_b8aa1	RIDER_ASSIGNED	{"orderId": "ord_1791016144486_b8aa1", "newStatus": "ASSIGNED", "oldStatus": "READY", "updatedBy": "Manager Kumar", "orderNumber": "HK-20261003-899986", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 13:59:04.516+05:30	\N	\N
evt_outbox_1791016144530	ORDER	ord_1791016144486_b8aa1	ORDER_DELIVERED	{"orderId": "ord_1791016144486_b8aa1", "deliveredAt": "2026-10-03T08:29:04.530Z"}	PENDING	0	3	\N	\N	2026-10-03 13:56:24.53+05:30	\N	\N
evt_stale_1791016151270	ORDER	ORD_STALE_99	ORDER_CONFIRMED	{"test": true}	PENDING	0	3	\N	\N	2026-10-03 13:57:06.27+05:30	\N	\N
evt_1791016151288_0zs9g	ORDER	ord_1791016151276_gidm3	ORDER_CONFIRMED	{"orderId": "ord_1791016151276_gidm3", "newStatus": "ACCEPTED", "oldStatus": "PLACED", "updatedBy": "Chef Raj", "orderNumber": "HK-20261003-269704", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 13:59:11.288+05:30	\N	\N
evt_1791016151293_u25ly	ORDER	ord_1791016151276_gidm3	ORDER_PREPARING	{"orderId": "ord_1791016151276_gidm3", "newStatus": "PREPARING", "oldStatus": "ACCEPTED", "updatedBy": "Chef Raj", "orderNumber": "HK-20261003-269704", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 13:59:11.293+05:30	\N	\N
evt_1791016151299_qkcfw	ORDER	ord_1791016151276_gidm3	ORDER_READY	{"orderId": "ord_1791016151276_gidm3", "newStatus": "READY", "oldStatus": "PREPARING", "updatedBy": "Chef Raj", "orderNumber": "HK-20261003-269704", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 13:59:11.299+05:30	\N	\N
evt_1791016151304_b0cig	ORDER	ord_1791016151276_gidm3	RIDER_ASSIGNED	{"orderId": "ord_1791016151276_gidm3", "newStatus": "ASSIGNED", "oldStatus": "READY", "updatedBy": "Chef Raj", "orderNumber": "HK-20261003-269704", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 13:59:11.304+05:30	\N	\N
evt_1791019866438_zpzno	ORDER	ord_1791019866425_750cz	ORDER_CONFIRMED	{"orderId": "ord_1791019866425_750cz", "newStatus": "ACCEPTED", "oldStatus": "PLACED", "updatedBy": "Master Chef", "orderNumber": "HK-20261003-765402", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 15:01:06.438+05:30	\N	\N
evt_1791019866446_bml4a	ORDER	ord_1791019866425_750cz	ORDER_PREPARING	{"orderId": "ord_1791019866425_750cz", "newStatus": "PREPARING", "oldStatus": "ACCEPTED", "updatedBy": "Master Chef", "orderNumber": "HK-20261003-765402", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 15:01:06.446+05:30	\N	\N
evt_1791019866451_1mqc1	ORDER	ord_1791019866425_750cz	ORDER_READY	{"orderId": "ord_1791019866425_750cz", "newStatus": "READY", "oldStatus": "PREPARING", "updatedBy": "Master Chef", "orderNumber": "HK-20261003-765402", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 15:01:06.451+05:30	\N	\N
evt_1791019866457_l0nqv	ORDER	ord_1791019866425_750cz	RIDER_ASSIGNED	{"orderId": "ord_1791019866425_750cz", "newStatus": "ASSIGNED", "oldStatus": "READY", "updatedBy": "Manager Kumar", "orderNumber": "HK-20261003-765402", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 15:01:06.457+05:30	\N	\N
evt_outbox_1791019866472	ORDER	ord_1791019866425_750cz	ORDER_DELIVERED	{"orderId": "ord_1791019866425_750cz", "deliveredAt": "2026-10-03T09:31:06.472Z"}	PENDING	0	3	\N	\N	2026-10-03 14:58:26.472+05:30	\N	\N
evt_1791019999247_8z2er	ORDER	ord_1791019999237_n0qv5	ORDER_CONFIRMED	{"orderId": "ord_1791019999237_n0qv5", "newStatus": "ACCEPTED", "oldStatus": "PLACED", "updatedBy": "Master Chef", "orderNumber": "HK-20261003-760130", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 15:03:19.248+05:30	\N	\N
evt_1791019999254_tyz93	ORDER	ord_1791019999237_n0qv5	ORDER_PREPARING	{"orderId": "ord_1791019999237_n0qv5", "newStatus": "PREPARING", "oldStatus": "ACCEPTED", "updatedBy": "Master Chef", "orderNumber": "HK-20261003-760130", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 15:03:19.254+05:30	\N	\N
evt_1791019999260_2lil7	ORDER	ord_1791019999237_n0qv5	ORDER_READY	{"orderId": "ord_1791019999237_n0qv5", "newStatus": "READY", "oldStatus": "PREPARING", "updatedBy": "Master Chef", "orderNumber": "HK-20261003-760130", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 15:03:19.26+05:30	\N	\N
evt_1791019999265_42gfw	ORDER	ord_1791019999237_n0qv5	RIDER_ASSIGNED	{"orderId": "ord_1791019999237_n0qv5", "newStatus": "ASSIGNED", "oldStatus": "READY", "updatedBy": "Manager Kumar", "orderNumber": "HK-20261003-760130", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 15:03:19.265+05:30	\N	\N
evt_outbox_1791019999278	ORDER	ord_1791019999237_n0qv5	ORDER_DELIVERED	{"orderId": "ord_1791019999237_n0qv5", "deliveredAt": "2026-10-03T09:33:19.278Z"}	PENDING	0	3	\N	\N	2026-10-03 15:00:39.278+05:30	\N	\N
evt_stale_1791020311751	ORDER	ORD_STALE_99	ORDER_CONFIRMED	{"test": true}	PENDING	0	3	\N	\N	2026-10-03 15:06:26.751+05:30	\N	\N
evt_1791020311767_vhr5l	ORDER	ord_1791020311757_tp78k	ORDER_CONFIRMED	{"orderId": "ord_1791020311757_tp78k", "newStatus": "ACCEPTED", "oldStatus": "PLACED", "updatedBy": "Chef Raj", "orderNumber": "HK-20261003-698399", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 15:08:31.767+05:30	\N	\N
evt_1791020311771_sd14j	ORDER	ord_1791020311757_tp78k	ORDER_PREPARING	{"orderId": "ord_1791020311757_tp78k", "newStatus": "PREPARING", "oldStatus": "ACCEPTED", "updatedBy": "Chef Raj", "orderNumber": "HK-20261003-698399", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 15:08:31.771+05:30	\N	\N
evt_1791020311776_hfuk3	ORDER	ord_1791020311757_tp78k	ORDER_READY	{"orderId": "ord_1791020311757_tp78k", "newStatus": "READY", "oldStatus": "PREPARING", "updatedBy": "Chef Raj", "orderNumber": "HK-20261003-698399", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 15:08:31.776+05:30	\N	\N
evt_1791020311780_491ff	ORDER	ord_1791020311757_tp78k	RIDER_ASSIGNED	{"orderId": "ord_1791020311757_tp78k", "newStatus": "ASSIGNED", "oldStatus": "READY", "updatedBy": "Chef Raj", "orderNumber": "HK-20261003-698399", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 15:08:31.78+05:30	\N	\N
evt_1791020334035_gkgfs	ORDER	ord_1791020334025_d7ybx	ORDER_CONFIRMED	{"orderId": "ord_1791020334025_d7ybx", "newStatus": "ACCEPTED", "oldStatus": "PLACED", "updatedBy": "Master Chef", "orderNumber": "HK-20261003-971817", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 15:08:54.035+05:30	\N	\N
evt_1791020334042_0cm8g	ORDER	ord_1791020334025_d7ybx	ORDER_PREPARING	{"orderId": "ord_1791020334025_d7ybx", "newStatus": "PREPARING", "oldStatus": "ACCEPTED", "updatedBy": "Master Chef", "orderNumber": "HK-20261003-971817", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 15:08:54.042+05:30	\N	\N
evt_1791020334047_ekrcs	ORDER	ord_1791020334025_d7ybx	ORDER_READY	{"orderId": "ord_1791020334025_d7ybx", "newStatus": "READY", "oldStatus": "PREPARING", "updatedBy": "Master Chef", "orderNumber": "HK-20261003-971817", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 15:08:54.047+05:30	\N	\N
evt_1791020334053_u5vtk	ORDER	ord_1791020334025_d7ybx	RIDER_ASSIGNED	{"orderId": "ord_1791020334025_d7ybx", "newStatus": "ASSIGNED", "oldStatus": "READY", "updatedBy": "Manager Kumar", "orderNumber": "HK-20261003-971817", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 15:08:54.053+05:30	\N	\N
evt_outbox_1791020334067	ORDER	ord_1791020334025_d7ybx	ORDER_DELIVERED	{"orderId": "ord_1791020334025_d7ybx", "deliveredAt": "2026-10-03T09:38:54.067Z"}	PENDING	0	3	\N	\N	2026-10-03 15:06:14.067+05:30	\N	\N
evt_1791030963440_tq2au	ORDER	ord_1791030963423_crgab	ORDER_CONFIRMED	{"orderId": "ord_1791030963423_crgab", "newStatus": "ACCEPTED", "oldStatus": "PLACED", "updatedBy": "Master Chef", "orderNumber": "HK-20261003-710410", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 18:06:03.44+05:30	\N	\N
evt_1791030963448_mdwpf	ORDER	ord_1791030963423_crgab	ORDER_PREPARING	{"orderId": "ord_1791030963423_crgab", "newStatus": "PREPARING", "oldStatus": "ACCEPTED", "updatedBy": "Master Chef", "orderNumber": "HK-20261003-710410", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 18:06:03.448+05:30	\N	\N
evt_1791030963454_gbjeq	ORDER	ord_1791030963423_crgab	ORDER_READY	{"orderId": "ord_1791030963423_crgab", "newStatus": "READY", "oldStatus": "PREPARING", "updatedBy": "Master Chef", "orderNumber": "HK-20261003-710410", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 18:06:03.454+05:30	\N	\N
evt_1791030963461_q2tlt	ORDER	ord_1791030963423_crgab	RIDER_ASSIGNED	{"orderId": "ord_1791030963423_crgab", "newStatus": "ASSIGNED", "oldStatus": "READY", "updatedBy": "Manager Kumar", "orderNumber": "HK-20261003-710410", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-03 18:06:03.461+05:30	\N	\N
evt_outbox_1791030963479	ORDER	ord_1791030963423_crgab	ORDER_DELIVERED	{"orderId": "ord_1791030963423_crgab", "deliveredAt": "2026-10-03T12:36:03.479Z"}	PENDING	0	3	\N	\N	2026-10-03 18:03:23.479+05:30	\N	\N
evt_stale_1791116578879	ORDER	ORD_STALE_99	ORDER_CONFIRMED	{"test": true}	PENDING	0	3	\N	\N	2026-10-04 17:50:53.879+05:30	\N	\N
evt_stale_1791116709637	ORDER	ORD_STALE_99	ORDER_CONFIRMED	{"test": true}	PENDING	0	3	\N	\N	2026-10-04 17:53:04.637+05:30	\N	\N
evt_1791116709665_alg4u	ORDER	ord_1791116709647_ic3o3	ORDER_CONFIRMED	{"orderId": "ord_1791116709647_ic3o3", "newStatus": "ACCEPTED", "oldStatus": "PLACED", "updatedBy": "Chef Raj", "orderNumber": "HK-20261004-293687", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-04 17:55:09.665+05:30	\N	\N
evt_1791116709674_2x4iq	ORDER	ord_1791116709647_ic3o3	ORDER_PREPARING	{"orderId": "ord_1791116709647_ic3o3", "newStatus": "PREPARING", "oldStatus": "ACCEPTED", "updatedBy": "Chef Raj", "orderNumber": "HK-20261004-293687", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-04 17:55:09.674+05:30	\N	\N
evt_1791116709683_0k9hh	ORDER	ord_1791116709647_ic3o3	ORDER_READY	{"orderId": "ord_1791116709647_ic3o3", "newStatus": "READY", "oldStatus": "PREPARING", "updatedBy": "Chef Raj", "orderNumber": "HK-20261004-293687", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-04 17:55:09.683+05:30	\N	\N
evt_1791116709690_onccd	ORDER	ord_1791116709647_ic3o3	RIDER_ASSIGNED	{"orderId": "ord_1791116709647_ic3o3", "newStatus": "ASSIGNED", "oldStatus": "READY", "updatedBy": "Chef Raj", "orderNumber": "HK-20261004-293687", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-04 17:55:09.69+05:30	\N	\N
evt_1791116738171_dstaq	ORDER	ord_1791116738159_g6uje	ORDER_CONFIRMED	{"orderId": "ord_1791116738159_g6uje", "newStatus": "ACCEPTED", "oldStatus": "PLACED", "updatedBy": "Master Chef", "orderNumber": "HK-20261004-306407", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-04 17:55:38.171+05:30	\N	\N
evt_1791116738180_ur1aa	ORDER	ord_1791116738159_g6uje	ORDER_PREPARING	{"orderId": "ord_1791116738159_g6uje", "newStatus": "PREPARING", "oldStatus": "ACCEPTED", "updatedBy": "Master Chef", "orderNumber": "HK-20261004-306407", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-04 17:55:38.18+05:30	\N	\N
evt_1791116738186_cijqx	ORDER	ord_1791116738159_g6uje	ORDER_READY	{"orderId": "ord_1791116738159_g6uje", "newStatus": "READY", "oldStatus": "PREPARING", "updatedBy": "Master Chef", "orderNumber": "HK-20261004-306407", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-04 17:55:38.186+05:30	\N	\N
evt_1791116738193_ak84t	ORDER	ord_1791116738159_g6uje	RIDER_ASSIGNED	{"orderId": "ord_1791116738159_g6uje", "newStatus": "ASSIGNED", "oldStatus": "READY", "updatedBy": "Manager Kumar", "orderNumber": "HK-20261004-306407", "paymentMethod": "COD", "paymentStatus": "COD_PENDING"}	PENDING	0	3	\N	\N	2026-10-04 17:55:38.193+05:30	\N	\N
evt_outbox_1791116738214	ORDER	ord_1791116738159_g6uje	ORDER_DELIVERED	{"orderId": "ord_1791116738159_g6uje", "deliveredAt": "2026-10-04T12:25:38.214Z"}	PENDING	0	3	\N	\N	2026-10-04 17:52:58.214+05:30	\N	\N
\.


--
-- Data for Name: restaurant_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.restaurant_settings (id, restaurant_name, phone, email, address, is_open, temporary_pause, pause_reason, opening_time, closing_time, delivery_radius_km, base_delivery_fee, free_delivery_threshold, cod_enabled, online_payment_enabled, announcement, updated_at) FROM stdin;
rest_hunter_01	Hunter's Kitchen	+91 9944003172	contact@hunterskitchen.com	77/7, Road, Chinnavedapatti, Saravanampatti, Coimbatore, Tamil Nadu 641035	t	f		11:00 AM	11:00 PM	10.00	35.00	500.00	t	t		2026-10-03 13:52:03.917695+05:30
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reviews (id, order_id, order_number, customer_id, customer_name, food_rating, delivery_rating, overall_rating, comment, item_ratings, created_at) FROM stdin;
rev_1791015827734_9e7g	ord_1791015827683_d0rex	TH-TEST-REVIEW	usr_1791015827486_9fe3	Priya Sharma	5.0	5.0	5.0	Exceptional food quality and lightning fast delivery!	[{"rating": 5, "menuItemId": "item_chittinadu_28"}]	2026-10-03 13:53:47.735222+05:30
rev_1791015854702_jdof	ord_1791015854651_zm2gf	TH-TEST-REVIEW	usr_1791015854458_ue5f	Priya Sharma	5.0	5.0	5.0	Exceptional food quality and lightning fast delivery!	[{"rating": 5, "menuItemId": "item_chittinadu_28"}]	2026-10-03 13:54:14.703868+05:30
rev_1791016144542_8qp4	ord_1791016144486_b8aa1	TH-TEST-REVIEW	usr_1791016144293_7o6a	Priya Sharma	5.0	5.0	5.0	Exceptional food quality and lightning fast delivery!	[{"rating": 5, "menuItemId": "item_chittinadu_28"}]	2026-10-03 13:59:04.543187+05:30
rev_1791019866483_k11m	ord_1791019866425_750cz	TH-TEST-REVIEW	usr_1791019866232_xaqg	Priya Sharma	5.0	5.0	5.0	Exceptional food quality and lightning fast delivery!	[{"rating": 5, "menuItemId": "item_chittinadu_28"}]	2026-10-03 15:01:06.483253+05:30
rev_1791019999287_65sn	ord_1791019999237_n0qv5	TH-TEST-REVIEW	usr_1791019999048_x3vt	Priya Sharma	5.0	5.0	5.0	Exceptional food quality and lightning fast delivery!	[{"rating": 5, "menuItemId": "item_chittinadu_28"}]	2026-10-03 15:03:19.287873+05:30
rev_1791020334078_7e89	ord_1791020334025_d7ybx	TH-TEST-REVIEW	usr_1791020333834_y4g4	Priya Sharma	5.0	5.0	5.0	Exceptional food quality and lightning fast delivery!	[{"rating": 5, "menuItemId": "item_chittinadu_28"}]	2026-10-03 15:08:54.079601+05:30
rev_1791030963494_m8sm	ord_1791030963423_crgab	TH-TEST-REVIEW	usr_1791030963223_6yf3	Priya Sharma	5.0	5.0	5.0	Exceptional food quality and lightning fast delivery!	[{"rating": 5, "menuItemId": "item_chittinadu_28", "menuItemName": "Chittinadu Beef Biryani"}]	2026-10-03 18:06:03.495184+05:30
rev_1791116738229_lahm	ord_1791116738159_g6uje	TH-TEST-REVIEW	usr_1791116737964_xyu2	Priya Sharma	5.0	5.0	5.0	Exceptional food quality and lightning fast delivery!	[{"rating": 5, "menuItemId": "item_chittinadu_28", "menuItemName": "Chittinadu Beef Biryani"}]	2026-10-04 17:55:38.23092+05:30
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schema_migrations (version, applied_at) FROM stdin;
001_initial_schema.sql	2026-10-03 13:42:09.33025+05:30
002_cascade_user_deletions.sql	2026-10-03 14:51:35.304043+05:30
\.


--
-- Data for Name: user_auth_credentials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_auth_credentials (user_id, email, password_hash, reset_password_token, reset_password_expires, invite_token, invite_expires, failed_login_attempts, last_failed_login, created_at, updated_at) FROM stdin;
usr_1791015633708_xtv4	test_customer_1791015633708@gmail.com	$2b$10$y2xzrIEKBkpwo0DlVGyiHObnU4pHAm1cbvoqnjfteVK3tbxQoUkz6	\N	\N	\N	\N	0	\N	2026-10-03 13:50:33.768542+05:30	2026-10-03 13:50:33.831461+05:30
usr_delivery_1	delivery1@hunterskitchen.com	$2b$10$eAxUTRboFjOML.p2CuisN.C2lv46EmkhX83T/gD4D65J3C7rm6SIu	\N	\N	\N	\N	0	\N	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
usr_delivery_2	delivery2@hunterskitchen.com	$2b$10$eAxUTRboFjOML.p2CuisN.C2lv46EmkhX83T/gD4D65J3C7rm6SIu	\N	\N	\N	\N	0	\N	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
usr_delivery_3	delivery3@hunterskitchen.com	$2b$10$eAxUTRboFjOML.p2CuisN.C2lv46EmkhX83T/gD4D65J3C7rm6SIu	\N	\N	\N	\N	0	\N	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
usr_customer_2	customer2@hunterskitchen.com	$2b$10$eAxUTRboFjOML.p2CuisN.C2lv46EmkhX83T/gD4D65J3C7rm6SIu	\N	\N	\N	\N	0	\N	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
usr_1791019866232_xaqg	test_customer_1791019866231@gmail.com	$2b$10$Y9HTGac5j/zcegoGzUYKe.yI8.6TPF9p4in67uLh5J6DMdTddaD.S	\N	\N	\N	\N	0	\N	2026-10-03 15:01:06.290585+05:30	2026-10-03 15:01:06.356673+05:30
usr_staff_4	cook@hunterskitchen.com	$2b$10$eAxUTRboFjOML.p2CuisN.C2lv46EmkhX83T/gD4D65J3C7rm6SIu	\N	\N	\N	\N	0	\N	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
usr_staff_invited	invited@hunterskitchen.com	$2b$10$eAxUTRboFjOML.p2CuisN.C2lv46EmkhX83T/gD4D65J3C7rm6SIu	\N	\N	invite_chef_token_123	2026-09-20 21:44:36.916+05:30	0	\N	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
usr_suspended_1	suspended@hunterskitchen.com	$2b$10$eAxUTRboFjOML.p2CuisN.C2lv46EmkhX83T/gD4D65J3C7rm6SIu	\N	\N	\N	\N	0	\N	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
usr_1790857042068_986	malathikasanjay@gmail.com	$2b$10$y99iBFo0CxFAsAKWVjPUxOYiEiaqeuRGFp0D3W1RWXq9Ep9i2Zdda	\N	\N	\N	\N	0	\N	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
usr_1790857294501_258	antigravity3434777@gmail.com	$2b$10$4fJ9mcvziN0j95ZObTeA6e1OeiAPy2R5CqGKBZj6UavuJtoTasIWC	\N	\N	\N	\N	0	\N	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
usr_1790864085360_157	sanjay_test1@gmail.com	$2b$10$8H17USyW8XbesP5fWcEHu.xwDOou1cVWzv33Oois04WEUT/YXpXcO	\N	\N	\N	\N	0	\N	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
usr_1790864085452_549	sanjay_1790864085451@gmail.com	$2b$10$spaylDT78r4RiOa7xVXuMuRnElBPxMn6UNUAqExalfLRGfE//8sW6	\N	\N	\N	\N	0	\N	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
usr_1790864209004_151	sanjay_1790864209002@gmail.com	$2b$10$.rSYNmx4q6xwFkOituLdyeosGSU9WN82k.A.4cCumvYBgVT2m6Avm	\N	\N	\N	\N	0	\N	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
usr_1790868283445_946	jsanjay28122006@gmail.com	$2b$10$oGwMYlafOW8VfOtwi/4htOpP2N5ip941bAhUP.pnqFDudqmg5vZPy	\N	\N	\N	\N	0	\N	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
usr_1790954020327_379	24bcs240@gm.co	$2b$10$tVRC8m7IUKXY9FfgnHGGqerxpvLv3VrY/2eVyBrk/e4CKgNK5rNam	\N	\N	\N	\N	0	\N	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
usr_1791015752171_lre8	test_customer_1791015752171@gmail.com	$2b$10$dFi2y2Dm3d0c80zqwbyz6.QZo7LeqK0lotViGrGrGy/VdsfJyBgWW	\N	\N	\N	\N	0	\N	2026-10-03 13:52:32.240523+05:30	2026-10-03 13:52:32.318086+05:30
usr_staff_1	staff1@hunterskitchen.com	$2b$10$FQcD0nxqAdeUDG8epb24cutG.4F8EtY0w3ifyo3wBEBV2b72B68IG	\N	\N	\N	\N	0	\N	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
usr_staff_2	staff2@hunterskitchen.com	$2b$10$eAxUTRboFjOML.p2CuisN.C2lv46EmkhX83T/gD4D65J3C7rm6SIu	\N	\N	\N	\N	0	\N	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:43:09.866766+05:30
usr_1791015827486_9fe3	test_customer_1791015827486@gmail.com	$2b$10$1gLi39pt8vkKcg2YCjvpyunDroUCM1.Bhl22ku1yzVioBsNGltW3e	\N	\N	\N	\N	0	\N	2026-10-03 13:53:47.546465+05:30	2026-10-03 13:53:47.61329+05:30
usr_1791015854458_ue5f	test_customer_1791015854458@gmail.com	$2b$10$2vtTI65jw0jr6YeE8193s.CLNxWkec2KKd9.jdX3yJ8mv2cpX.t5q	\N	\N	\N	\N	0	\N	2026-10-03 13:54:14.519007+05:30	2026-10-03 13:54:14.582345+05:30
usr_1791019999048_x3vt	test_customer_1791019999048@gmail.com	$2b$10$vqGi8Kjbk83aeLnD54cfduHkR6qe/TBvQ./cNlb5/66ZjfUMLZMoi	\N	\N	\N	\N	0	\N	2026-10-03 15:03:19.106142+05:30	2026-10-03 15:03:19.16882+05:30
usr_1791020333834_y4g4	test_customer_1791020333834@gmail.com	$2b$10$UXMOxfXEiPqZp69HdhzE6OwIgBRWK0pE.HtUpinh8LMyDxJ1n5.yi	\N	\N	\N	\N	0	\N	2026-10-03 15:08:53.893591+05:30	2026-10-03 15:08:53.959333+05:30
usr_1791030963223_6yf3	test_customer_1791030963223@gmail.com	$2b$10$pG3K3X3IQ0cqDX4zNuLQDuK2RJ759KTbxFkw6qo6p.vfJA3rnv7hq	\N	\N	\N	\N	0	\N	2026-10-03 18:06:03.286921+05:30	2026-10-03 18:06:03.351353+05:30
usr_1791116737964_xyu2	test_customer_1791116737964@gmail.com	$2b$10$nqNSSeE07Fscc.le1eAcqecM4FD5lBPyCluRPuBdWuCOF9dYdpwM.	\N	\N	\N	\N	0	\N	2026-10-04 17:55:38.025947+05:30	2026-10-04 17:55:38.088609+05:30
usr_staff_3	chef@hunterskitchen.com	$2b$10$eAxUTRboFjOML.p2CuisN.C2lv46EmkhX83T/gD4D65J3C7rm6SIu	\N	\N	\N	\N	0	\N	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:55:16.15572+05:30
usr_customer_1	customer1@hunterskitchen.com	$2b$10$8u0BQbYHON.bDrQ97gcLNO4r0BmxNWBzaEoLD390cJBHM63nxH8Pe	\N	\N	\N	\N	0	\N	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:55:16.355848+05:30
usr_1791016055912_351g	guest_1791016055909@gmail.com	$2b$10$y.KL85Xzy7I0K6n7BjW42.rFUl57vljhNASGR3HXJFBqzm9IWjIoe	\N	\N	\N	\N	0	\N	2026-10-03 13:57:35.977107+05:30	2026-10-03 13:57:35.977107+05:30
usr_owner_1	hunterkitchen777@gmail.com	$2b$10$P4PzqNj52iMfGOwqkFEdr.y7LeU2UQWAkyxgG1McLUJCafa99eV/6	\N	\N	\N	\N	0	\N	2026-10-03 13:43:09.866766+05:30	2026-10-03 13:57:36.047429+05:30
usr_1791016144293_7o6a	test_customer_1791016144293@gmail.com	$2b$10$K6OucdnOBTv/qfbwlrg6qubHxmLv5.J3elIHIFn8mPwQ9kdqKA7Ki	\N	\N	\N	\N	0	\N	2026-10-03 13:59:04.352663+05:30	2026-10-03 13:59:04.417969+05:30
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, phone, role, staff_role, avatar, status, partner_status, vehicle_number, vehicle_type, current_rating, total_deliveries, permissions, restaurant_id, google_id, email_verified, joined_at, updated_at) FROM stdin;
usr_1791015752171_lre8	Priya Sharma	test_customer_1791015752171@gmail.com	+91 98765 43210	CUSTOMER	\N	\N	ACTIVE	OFFLINE	\N	\N	\N	0	["orders.read", "orders.create", "orders.cancel", "menu.read"]	rest_hunter_01	\N	f	2026-10-03 13:52:32.240523+05:30	2026-10-03 13:52:32.240523+05:30
usr_1791015854458_ue5f	Priya Sharma	test_customer_1791015854458@gmail.com	+91 98765 43210	CUSTOMER	\N	\N	ACTIVE	OFFLINE	\N	\N	\N	0	["orders.read", "orders.create", "orders.cancel", "menu.read"]	rest_hunter_01	\N	f	2026-10-03 13:54:14.519007+05:30	2026-10-03 13:54:14.519007+05:30
usr_1791016144293_7o6a	Priya Sharma	test_customer_1791016144293@gmail.com	+91 98765 43210	CUSTOMER	\N	\N	ACTIVE	OFFLINE	\N	\N	\N	0	["orders.read", "orders.create", "orders.cancel", "menu.read"]	rest_hunter_01	\N	f	2026-10-03 13:59:04.352663+05:30	2026-10-03 13:59:04.352663+05:30
usr_1791019866232_xaqg	Priya Sharma	test_customer_1791019866231@gmail.com	+91 98765 43210	CUSTOMER	\N	\N	ACTIVE	OFFLINE	\N	\N	\N	0	["orders.read", "orders.create", "orders.cancel", "menu.read"]	rest_hunter_01	\N	f	2026-10-03 15:01:06.290585+05:30	2026-10-03 15:01:06.290585+05:30
usr_1791020333834_y4g4	Priya Sharma	test_customer_1791020333834@gmail.com	+91 98765 43210	CUSTOMER	\N	\N	ACTIVE	OFFLINE	\N	\N	\N	0	["orders.read", "orders.create", "orders.cancel", "menu.read"]	rest_hunter_01	\N	f	2026-10-03 15:08:53.893591+05:30	2026-10-03 15:08:53.893591+05:30
usr_1791116737964_xyu2	Priya Sharma	test_customer_1791116737964@gmail.com	+91 98765 43210	CUSTOMER	\N	\N	ACTIVE	OFFLINE	\N	\N	\N	0	["orders.read", "orders.create", "orders.cancel", "menu.read"]	rest_hunter_01	\N	f	2026-10-04 17:55:38.025947+05:30	2026-10-04 17:55:38.025947+05:30
usr_owner_1	Hunter's Kitchen	hunterkitchen777@gmail.com	+91 9944003172	OWNER	\N	\N	ACTIVE	OFFLINE	\N	\N	5.00	0	["orders.read", "orders.create", "orders.update", "orders.cancel", "orders.assign", "orders.deliver", "menu.read", "menu.create", "menu.update", "menu.delete", "menu.availability", "users.read", "users.create", "users.update", "users.suspend", "analytics.read", "audit.read", "reconciliation.read", "settings.update", "batches.manage"]	rest_hunter_01	\N	f	2025-01-01 05:30:00+05:30	2026-10-03 13:43:09.866766+05:30
usr_staff_1	Manoj Kumar	staff1@hunterskitchen.com	+91 98765 11111	STAFF	KITCHEN_MANAGER	\N	ACTIVE	OFFLINE	\N	\N	5.00	0	["orders.read", "orders.update", "orders.cancel", "orders.assign", "menu.read", "menu.availability"]	rest_hunter_01	\N	f	2025-02-10 05:30:00+05:30	2026-10-03 13:43:09.866766+05:30
usr_staff_2	Kavitha Raj	staff2@hunterskitchen.com	+91 98765 22222	STAFF	FRONT_DESK	\N	ACTIVE	OFFLINE	\N	\N	5.00	0	["orders.read", "orders.create", "orders.update", "menu.read"]	rest_hunter_01	\N	f	2025-03-01 05:30:00+05:30	2026-10-03 13:43:09.866766+05:30
usr_delivery_1	Arun Kumar	delivery1@hunterskitchen.com	+91 98765 22221	DELIVERY_PARTNER	\N	\N	ACTIVE	OFFLINE	TN-37-AB-1234	Bike	4.80	142	["orders.read", "orders.deliver"]	rest_hunter_01	\N	f	2025-01-15 05:30:00+05:30	2026-10-03 13:43:09.866766+05:30
usr_delivery_2	Karthik Raja	delivery2@hunterskitchen.com	+91 91234 56790	DELIVERY_PARTNER	\N	\N	ACTIVE	OFFLINE	TN-37-CD-5678	Scooter	4.90	98	["orders.read", "orders.deliver"]	rest_hunter_01	\N	f	2025-02-01 05:30:00+05:30	2026-10-03 13:43:09.866766+05:30
usr_delivery_3	Vijay Anand	delivery3@hunterskitchen.com	+91 91234 56791	DELIVERY_PARTNER	\N	\N	ACTIVE	OFFLINE	TN-37-EF-9012	Bike	4.70	210	["orders.read", "orders.deliver"]	rest_hunter_01	\N	f	2025-01-20 05:30:00+05:30	2026-10-03 13:43:09.866766+05:30
usr_customer_1	Priya Sundaram	customer1@hunterskitchen.com	+91 99887 76655	CUSTOMER	\N	\N	ACTIVE	OFFLINE	\N	\N	5.00	0	["orders.read", "orders.create", "orders.cancel", "menu.read"]	rest_hunter_01	\N	f	2025-04-01 05:30:00+05:30	2026-10-03 13:43:09.866766+05:30
usr_1791015633708_xtv4	Priya Sharma	test_customer_1791015633708@gmail.com	+91 98765 43210	CUSTOMER	\N	\N	ACTIVE	OFFLINE	\N	\N	\N	0	["orders.read", "orders.create", "orders.cancel", "menu.read"]	rest_hunter_01	\N	f	2026-10-03 13:50:33.768542+05:30	2026-10-03 13:50:33.768542+05:30
usr_1791015827486_9fe3	Priya Sharma	test_customer_1791015827486@gmail.com	+91 98765 43210	CUSTOMER	\N	\N	ACTIVE	OFFLINE	\N	\N	\N	0	["orders.read", "orders.create", "orders.cancel", "menu.read"]	rest_hunter_01	\N	f	2026-10-03 13:53:47.546465+05:30	2026-10-03 13:53:47.546465+05:30
usr_1791016055912_351g	guest_1791016055909	guest_1791016055909@gmail.com	+91 90000 00000	CUSTOMER	\N	https://ui-avatars.com/api/?name=guest_1791016055909&background=ea4335&color=fff	ACTIVE	OFFLINE	\N	\N	\N	0	[]	rest_hunter_01	\N	f	2026-10-03 13:57:35.977107+05:30	2026-10-03 13:57:35.977107+05:30
usr_1791019999048_x3vt	Priya Sharma	test_customer_1791019999048@gmail.com	+91 98765 43210	CUSTOMER	\N	\N	ACTIVE	OFFLINE	\N	\N	\N	0	["orders.read", "orders.create", "orders.cancel", "menu.read"]	rest_hunter_01	\N	f	2026-10-03 15:03:19.106142+05:30	2026-10-03 15:03:19.106142+05:30
usr_1791030963223_6yf3	Priya Sharma	test_customer_1791030963223@gmail.com	+91 98765 43210	CUSTOMER	\N	\N	ACTIVE	OFFLINE	\N	\N	\N	0	["orders.read", "orders.create", "orders.cancel", "menu.read"]	rest_hunter_01	\N	f	2026-10-03 18:06:03.286921+05:30	2026-10-03 18:06:03.286921+05:30
usr_customer_2	Rahul Sharma	customer2@hunterskitchen.com	+91 99887 76644	CUSTOMER	\N	\N	ACTIVE	OFFLINE	\N	\N	5.00	0	["orders.read", "orders.create", "orders.cancel", "menu.read"]	rest_hunter_01	\N	f	2025-04-12 05:30:00+05:30	2026-10-03 13:43:09.866766+05:30
usr_staff_3	Saravanan (Head Chef)	chef@hunterskitchen.com	+91 98765 33331	STAFF	HEAD_CHEF	\N	ACTIVE	OFFLINE	\N	\N	5.00	0	["orders.read", "orders.update", "menu.read", "menu.availability"]	rest_hunter_01	\N	f	2025-03-05 05:30:00+05:30	2026-10-03 13:43:09.866766+05:30
usr_staff_4	Dinesh (Line Cook)	cook@hunterskitchen.com	+91 98765 33332	STAFF	LINE_COOK	\N	ACTIVE	OFFLINE	\N	\N	5.00	0	["orders.read", "orders.update"]	rest_hunter_01	\N	f	2025-03-12 05:30:00+05:30	2026-10-03 13:43:09.866766+05:30
usr_staff_invited	Ramesh Chef (Invited)	invited@hunterskitchen.com	+91 98765 33333	STAFF	LINE_COOK	\N	INVITED	OFFLINE	\N	\N	5.00	0	["orders.read", "orders.update"]	rest_hunter_01	\N	f	2025-04-15 05:30:00+05:30	2026-10-03 13:43:09.866766+05:30
usr_suspended_1	Suspended User	suspended@hunterskitchen.com	+91 99887 00000	CUSTOMER	\N	\N	SUSPENDED	OFFLINE	\N	\N	5.00	0	["orders.read", "orders.create", "orders.cancel", "menu.read"]	rest_hunter_01	\N	f	2025-04-10 05:30:00+05:30	2026-10-03 13:43:09.866766+05:30
usr_1790857042068_986	malathikasanjay	malathikasanjay@gmail.com	6383394373	CUSTOMER	\N	https://ui-avatars.com/api/?name=malathikasanjay&background=ea4335&color=fff	ACTIVE	OFFLINE	\N	\N	5.00	0	["orders.read", "orders.create", "orders.cancel", "menu.read"]	rest_hunter_01	\N	f	2026-10-01 17:47:22.068+05:30	2026-10-03 13:43:09.866766+05:30
usr_1790857294501_258	Sanjay	antigravity3434777@gmail.com	+91 90000 00000	CUSTOMER	\N	https://lh3.googleusercontent.com/a/ACg8ocLEoBPoydWtluy4lxCmUrDAw34qyVxBUsciYbmYRkjuDDIj=s96-c	ACTIVE	OFFLINE	\N	\N	5.00	0	["orders.read", "orders.create", "orders.cancel", "menu.read"]	rest_hunter_01	108918231877191317180	t	2026-10-01 17:51:34.501+05:30	2026-10-03 13:43:09.866766+05:30
usr_1790864085360_157	Sanjay M	sanjay_test1@gmail.com	+91 6383394373	CUSTOMER	\N	https://ui-avatars.com/api/?name=Sanjay%20M&background=ea4335&color=fff	ACTIVE	OFFLINE	\N	\N	5.00	0	["orders.read", "orders.create", "orders.cancel", "menu.read"]	rest_hunter_01	\N	f	2026-10-01 19:44:45.36+05:30	2026-10-03 13:43:09.866766+05:30
usr_1790864085452_549	Sanjay Kumar	sanjay_1790864085451@gmail.com	+91 9881685361	CUSTOMER	\N	https://ui-avatars.com/api/?name=Sanjay%20Kumar&background=ea4335&color=fff	ACTIVE	OFFLINE	\N	\N	5.00	0	["orders.read", "orders.create", "orders.cancel", "menu.read"]	rest_hunter_01	\N	f	2026-10-01 19:44:45.452+05:30	2026-10-03 13:43:09.866766+05:30
usr_1790864209004_151	Sanjay Kumar	sanjay_1790864209002@gmail.com	+91 9862577288	CUSTOMER	\N	https://ui-avatars.com/api/?name=Sanjay%20Kumar&background=ea4335&color=fff	ACTIVE	OFFLINE	\N	\N	5.00	0	["orders.read", "orders.create", "orders.cancel", "menu.read"]	rest_hunter_01	\N	f	2026-10-01 19:46:49.004+05:30	2026-10-03 13:43:09.866766+05:30
usr_1790868283445_946	Sanjay	jsanjay28122006@gmail.com	+91 9344842967	CUSTOMER	\N	https://ui-avatars.com/api/?name=Sanjay&background=ea4335&color=fff	ACTIVE	OFFLINE	\N	\N	5.00	0	["orders.read", "orders.create", "orders.cancel", "menu.read"]	rest_hunter_01	\N	f	2026-10-01 20:54:43.445+05:30	2026-10-03 13:43:09.866766+05:30
usr_1790954020327_379	Sanjay-j	24bcs240@gm.co	+91 6383394373	STAFF	KITCHEN_STAFF	\N	ACTIVE	OFFLINE	\N	\N	5.00	0	["orders.read", "orders.update", "orders.cancel", "orders.assign", "menu.read", "menu.availability"]	rest_hunter_01	\N	f	2026-10-02 20:43:40.327+05:30	2026-10-03 13:43:09.866766+05:30
\.


--
-- Name: audit_logs_sequence_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_sequence_number_seq', 1, false);


--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_transactions_id_seq', 9, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 13, true);


--
-- Name: audit_logs audit_logs_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_id_key UNIQUE (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (sequence_number);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: cod_transactions cod_transactions_order_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cod_transactions
    ADD CONSTRAINT cod_transactions_order_id_key UNIQUE (order_id);


--
-- Name: cod_transactions cod_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cod_transactions
    ADD CONSTRAINT cod_transactions_pkey PRIMARY KEY (id);


--
-- Name: customer_addresses customer_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_pkey PRIMARY KEY (id);


--
-- Name: delivery_batch_orders delivery_batch_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_batch_orders
    ADD CONSTRAINT delivery_batch_orders_pkey PRIMARY KEY (batch_id, order_id);


--
-- Name: delivery_batches delivery_batches_batch_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_batches
    ADD CONSTRAINT delivery_batches_batch_number_key UNIQUE (batch_number);


--
-- Name: delivery_batches delivery_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_batches
    ADD CONSTRAINT delivery_batches_pkey PRIMARY KEY (id);


--
-- Name: idempotency_records idempotency_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.idempotency_records
    ADD CONSTRAINT idempotency_records_pkey PRIMARY KEY (key);


--
-- Name: inventory_items inventory_items_menu_item_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_menu_item_id_key UNIQUE (menu_item_id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_transactions inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_events order_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_events
    ADD CONSTRAINT order_events_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: outbox_events outbox_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT outbox_events_pkey PRIMARY KEY (id);


--
-- Name: restaurant_settings restaurant_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.restaurant_settings
    ADD CONSTRAINT restaurant_settings_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: user_auth_credentials user_auth_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_auth_credentials
    ADD CONSTRAINT user_auth_credentials_pkey PRIMARY KEY (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_google_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key UNIQUE (google_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_logs_actor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_actor ON public.audit_logs USING btree (actor_id);


--
-- Name: idx_audit_logs_resource; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_resource ON public.audit_logs USING btree (resource, resource_id);


--
-- Name: idx_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp" DESC);


--
-- Name: idx_auth_cred_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_auth_cred_email ON public.user_auth_credentials USING btree (lower(email));


--
-- Name: idx_auth_invite_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_auth_invite_token ON public.user_auth_credentials USING btree (invite_token) WHERE (invite_token IS NOT NULL);


--
-- Name: idx_auth_reset_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_auth_reset_token ON public.user_auth_credentials USING btree (reset_password_token) WHERE (reset_password_token IS NOT NULL);


--
-- Name: idx_categories_sort_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_sort_order ON public.categories USING btree (sort_order, name);


--
-- Name: idx_cod_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cod_order_id ON public.cod_transactions USING btree (order_id);


--
-- Name: idx_cod_partner_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cod_partner_status ON public.cod_transactions USING btree (delivery_partner_id, settlement_status);


--
-- Name: idx_cust_addresses_cust_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cust_addresses_cust_id ON public.customer_addresses USING btree (customer_id);


--
-- Name: idx_cust_addresses_default; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cust_addresses_default ON public.customer_addresses USING btree (customer_id, is_default) WHERE (is_default = true);


--
-- Name: idx_delivery_batches_partner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_delivery_batches_partner ON public.delivery_batches USING btree (delivery_partner_id, status);


--
-- Name: idx_idempotency_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_idempotency_expires ON public.idempotency_records USING btree (expires_at);


--
-- Name: idx_inv_tx_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_tx_item ON public.inventory_transactions USING btree (menu_item_id, created_at DESC);


--
-- Name: idx_inventory_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_item ON public.inventory_items USING btree (menu_item_id);


--
-- Name: idx_menu_items_avail; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_menu_items_avail ON public.menu_items USING btree (is_available);


--
-- Name: idx_menu_items_cat_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_menu_items_cat_id ON public.menu_items USING btree (category_id);


--
-- Name: idx_menu_items_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_menu_items_name ON public.menu_items USING btree (name);


--
-- Name: idx_menu_items_popular; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_menu_items_popular ON public.menu_items USING btree (is_popular, is_bestseller);


--
-- Name: idx_notif_user_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notif_user_unread ON public.notifications USING btree (user_id, is_read, created_at DESC);


--
-- Name: idx_order_events_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_events_order_id ON public.order_events USING btree (order_id, "timestamp");


--
-- Name: idx_order_items_menu_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_menu_item_id ON public.order_items USING btree (menu_item_id);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_orders_batch_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_batch_id ON public.orders USING btree (batch_id) WHERE (batch_id IS NOT NULL);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at DESC);


--
-- Name: idx_orders_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_customer_id ON public.orders USING btree (customer_id);


--
-- Name: idx_orders_delivery_partner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_delivery_partner ON public.orders USING btree (assigned_delivery_partner_id) WHERE (assigned_delivery_partner_id IS NOT NULL);


--
-- Name: idx_orders_payment_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_payment_status ON public.orders USING btree (payment_status);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_outbox_pending; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_outbox_pending ON public.outbox_events USING btree (status, next_retry_at, created_at) WHERE ((status)::text = ANY ((ARRAY['PENDING'::character varying, 'FAILED'::character varying])::text[]));


--
-- Name: idx_reviews_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_customer_id ON public.reviews USING btree (customer_id);


--
-- Name: idx_reviews_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_order_id ON public.reviews USING btree (order_id);


--
-- Name: idx_users_email_lower; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email_lower ON public.users USING btree (lower(email));


--
-- Name: idx_users_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_phone ON public.users USING btree (phone);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: cod_transactions cod_transactions_delivery_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cod_transactions
    ADD CONSTRAINT cod_transactions_delivery_partner_id_fkey FOREIGN KEY (delivery_partner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: cod_transactions cod_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cod_transactions
    ADD CONSTRAINT cod_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;


--
-- Name: cod_transactions cod_transactions_settled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cod_transactions
    ADD CONSTRAINT cod_transactions_settled_by_fkey FOREIGN KEY (settled_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: customer_addresses customer_addresses_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: delivery_batch_orders delivery_batch_orders_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_batch_orders
    ADD CONSTRAINT delivery_batch_orders_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.delivery_batches(id) ON DELETE CASCADE;


--
-- Name: delivery_batch_orders delivery_batch_orders_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_batch_orders
    ADD CONSTRAINT delivery_batch_orders_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: delivery_batches delivery_batches_delivery_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_batches
    ADD CONSTRAINT delivery_batches_delivery_partner_id_fkey FOREIGN KEY (delivery_partner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: inventory_items inventory_items_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: inventory_transactions inventory_transactions_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: inventory_transactions inventory_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: menu_items menu_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: notifications notifications_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_events order_events_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_events
    ADD CONSTRAINT order_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE RESTRICT;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_assigned_delivery_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_assigned_delivery_partner_id_fkey FOREIGN KEY (assigned_delivery_partner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: orders orders_assigned_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_assigned_staff_id_fkey FOREIGN KEY (assigned_staff_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: user_auth_credentials user_auth_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_auth_credentials
    ADD CONSTRAINT user_auth_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict S8ta3IdcqGZnunfXW8pHbRhtcz9MQlJMuqDkVXsba98CpLeamIQYdeffm9u7joA

