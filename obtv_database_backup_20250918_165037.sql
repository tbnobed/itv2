--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (02a153c)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
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
-- Name: session; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO neondb_owner;

--
-- Name: streams; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.streams (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    thumbnail text NOT NULL,
    stream_id text NOT NULL,
    url text NOT NULL,
    category text NOT NULL,
    studio_id text,
    stream_type text DEFAULT 'webrtc'::text NOT NULL
);


ALTER TABLE public.streams OWNER TO neondb_owner;

--
-- Name: studios; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.studios (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    thumbnail text NOT NULL,
    description text NOT NULL,
    status text NOT NULL,
    feed_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.studios OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    is_active text DEFAULT 'true'::text NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.session (sid, sess, expire) FROM stdin;
AgbPDFqev5t5Tm6BfmHSFg907F5REH50	{"cookie":{"originalMaxAge":86400000,"expires":"2025-09-19T16:44:16.210Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"86b0c840-1133-42a8-aea9-c01fb17dd2d7"},"csrfToken":"d3bc89b30b67aa82bed9e66095378b86ef6c1f95de63814622b543679a0ae556"}	2025-09-19 16:50:31
\.


--
-- Data for Name: streams; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.streams (id, title, thumbnail, stream_id, url, category, studio_id, stream_type) FROM stdin;
3381da47-4cd2-4a41-8385-0aff0626aefc	Backup Tower Feed	/generated_images/Over-the-air_broadcast_tower_04c20672.png	BT001	webrtc://localhost:1985/live/backup-tower	overTheAir	\N	webrtc
4ba76362-90e3-4017-9b09-e2558b421094	Repeater Station 1	/generated_images/Over-the-air_broadcast_tower_04c20672.png	RS001	webrtc://localhost:1985/live/repeater-1	overTheAir	\N	webrtc
b33c173f-d536-49ae-a0f4-74306a4173ad	Repeater Station 2	/generated_images/Over-the-air_broadcast_tower_04c20672.png	RS002	webrtc://localhost:1985/live/repeater-2	overTheAir	\N	webrtc
12d9e484-d19e-44c9-aa64-db948c4754e8	Dallas Control Center	/generated_images/Dallas_Control_newsroom_45c1dfb2.png	DC001	webrtc://localhost:1985/live/dallas-control	liveFeeds	\N	webrtc
08769a9b-d0f4-4e21-98f5-ecffe23db85d	Houston Backup Center	/generated_images/Dallas_Control_newsroom_45c1dfb2.png	HB001	webrtc://localhost:1985/live/houston-backup	liveFeeds	\N	webrtc
2c7450d0-73f3-4616-9c05-91ada2f9502c	System Monitoring	/generated_images/Dallas_Control_newsroom_45c1dfb2.png	SM001	webrtc://localhost:1985/live/monitoring	liveFeeds	\N	webrtc
53cc100e-f20b-4c85-a24e-da5a9ee996af	Emergency Broadcast	/generated_images/Dallas_Control_newsroom_45c1dfb2.png	EB001	webrtc://localhost:1985/live/emergency	liveFeeds	\N	webrtc
bce29e5f-e8a8-41ec-b23f-09e49b5dc763	Weather Station	/generated_images/Over-the-air_broadcast_tower_04c20672.png	WS001	webrtc://localhost:1985/live/weather	liveFeeds	\N	webrtc
3402bb82-7a41-4580-b98a-3481fefd648f	Traffic Camera Feed	/generated_images/Dallas_Control_newsroom_45c1dfb2.png	TC001	webrtc://localhost:1985/live/traffic	liveFeeds	\N	webrtc
afa24777-65d3-4955-aba2-44923b82aa39	Main Camera Feed	/generated_images/Studio_A_control_room_42819489.png	SA001	webrtc://localhost:1985/live/studio-a-main	studios	bd36f4af-1e84-4d22-a786-ae9e068f4d39	webrtc
4e41948c-0bc0-4573-8293-d527cd6759b6	Wide Angle Shot	/generated_images/Studio_A_control_room_42819489.png	SA002	webrtc://localhost:1985/live/studio-a-wide	studios	bd36f4af-1e84-4d22-a786-ae9e068f4d39	webrtc
48635deb-37fa-4363-b2e0-c9fbeec8d386	Close Up Camera	/generated_images/Studio_A_control_room_42819489.png	SA003	webrtc://localhost:1985/live/studio-a-close	studios	bd36f4af-1e84-4d22-a786-ae9e068f4d39	webrtc
2115cc94-e56f-460f-975c-aa72f617781b	Overhead View	/generated_images/Studio_A_control_room_42819489.png	SA004	webrtc://localhost:1985/live/studio-a-overhead	studios	bd36f4af-1e84-4d22-a786-ae9e068f4d39	webrtc
b4376026-0bc1-4de8-bc3d-e91db71ebb6d	Main Production Feed	/generated_images/Studio_A_control_room_42819489.png	SB001	webrtc://localhost:1985/live/studio-b-main	studios	d0394538-717c-4bca-906d-173f7acb4b7a	webrtc
2cdc770f-8553-4cc9-ad4c-c91cc7acfde8	Alternate Angle	/generated_images/Studio_A_control_room_42819489.png	SB002	webrtc://localhost:1985/live/studio-b-alt	studios	d0394538-717c-4bca-906d-173f7acb4b7a	webrtc
7779c259-9248-4b5a-8216-3ec5a267ed2f	Guest Camera	/generated_images/Studio_A_control_room_42819489.png	SB003	webrtc://localhost:1985/live/studio-b-guest	studios	d0394538-717c-4bca-906d-173f7acb4b7a	webrtc
19f961c3-bdc2-4870-907c-17441c81e8e3	Backup Feed	/generated_images/Studio_A_control_room_42819489.png	SC001	webrtc://localhost:1985/live/studio-c-backup	studios	bd8b061b-fb4b-4963-a83f-37ce7573db39	webrtc
bd3a7392-57dd-4267-80d1-ecff260406f1	Monitoring Camera	/generated_images/Studio_A_control_room_42819489.png	SC002	webrtc://localhost:1985/live/studio-c-monitor	studios	bd8b061b-fb4b-4963-a83f-37ce7573db39	webrtc
bdd9f779-55d5-435c-a8a9-9d212513ce60	Field Reporter Feed	/generated_images/Featured_live_production_15b7d8b1.png	MU001	webrtc://localhost:1985/live/mobile-field	studios	09c676cb-4cdf-428b-9f5b-eb8e9414388d	webrtc
955cc8f3-1215-490d-a00e-1fa80ca05a88	Mobile Wide Shot	/generated_images/Featured_live_production_15b7d8b1.png	MU002	webrtc://localhost:1985/live/mobile-wide	studios	09c676cb-4cdf-428b-9f5b-eb8e9414388d	webrtc
4dc46adb-7c2e-4348-9ec8-30c453d12f0c	Rehearsal Feed	/generated_images/Studio_A_control_room_42819489.png	RR001	webrtc://localhost:1985/live/rehearsal	studios	3ce983f8-d32a-4cf2-9091-e1f8d35ca22f	webrtc
188cb176-9f14-4ecd-a331-8f5a5b26dba9	Plex 43		P41	http://cdn1.obedtv.live:2024/rtc/v1/whep/?app=live&stream=Socal1	uhd	\N	webrtc
8359aeec-5004-4b02-bbb2-82dfdd747919	Socal6	/generated_images/Studio_A_control_room_42819489.png	S6	https://cdn2.obedtv.live:1990/rtc/v1/whep/?app=live&stream=Socal6	featured	\N	webrtc
3278ab8b-a05a-4787-8357-a14ae9047cde	Socal Studios 1	/generated_images/Studio_A_control_room_42819489.png	Socal1	https://cdn2.obedtv.live:1990/rtc/v1/whep/?app=live&stream=Socal1	featured	\N	webrtc
afe90e31-a27f-4015-bfe1-ecda3e3407c5	Socal3	/generated_images/Over-the-air_broadcast_tower_04c20672.png	Socal3	https://cdn2.obedtv.live:1990/rtc/v1/whep/?app=live&stream=Socal3	featured	\N	webrtc
8e4c2d2c-ce46-4cf0-9387-adae9d27828d	Socal 5	/generated_images/Over-the-air_broadcast_tower_04c20672.png	S5	https://cdn2.obedtv.live:1990/rtc/v1/whep/?app=live&stream=Socal5	featured	\N	webrtc
344b4d71-0347-4eb8-8d3f-b5d561f980c8	Socal4	/generated_images/SocalStudio_1757836018289.png	S4	https://cdn2.obedtv.live:1990/rtc/v1/whep/?app=live&stream=Socal4	featured	\N	webrtc
89ead0b2-1ba0-43ce-86bc-b320ea883747	Socal Studios 2 (4k)	/generated_images/Dallas_Control_newsroom_45c1dfb2.png	Socal2	https://cdn2.obedtv.live:1990/rtc/v1/whep/?app=live&stream=Socal2	uhd	\N	webrtc
fc2c2a2b-b7f0-4644-b8c4-59ec7888b57e	live feed8 	/generated_images/SocalStudio_1757836018289.png	lf8	webrtc://cdn1.obedtv.live	liveFeeds	\N	webrtc
4094b80b-697b-49ce-b03a-d9e05d44a228	new feed	/generated_images/Irving_studios_1757836018288.png	fas	https://obtv.tbn.tv:1935/live/restream3	liveFeeds	\N	webrtc
93b10379-3ede-4c5d-97e4-d79b3e36b2e3	TBN Live	/generated_images/SocalStudio_1757836018289.png	TBN1	https://6740bddc3aebe.streamlock.net/tbn-live/smil:monitor-tbn.smil/playlist.m3u8	featured	\N	hls
\.


--
-- Data for Name: studios; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.studios (id, name, thumbnail, description, status, feed_count) FROM stdin;
d0394538-717c-4bca-906d-173f7acb4b7a	Studio B Production	/generated_images/Studio_A_control_room_42819489.png	Secondary production studio for live programming	online	6
bd8b061b-fb4b-4963-a83f-37ce7573db39	Studio C Backup	/generated_images/Studio_A_control_room_42819489.png	Backup studio for emergency broadcasts	maintenance	4
3ce983f8-d32a-4cf2-9091-e1f8d35ca22f	Rehearsal Room	/generated_images/Studio_A_control_room_42819489.png	Practice and rehearsal space for productions	offline	2
bd36f4af-1e84-4d22-a786-ae9e068f4d39	Socal Studios	/generated_images/SocalStudio_1757836018289.png	Tustin, CA	online	6
09c676cb-4cdf-428b-9f5b-eb8e9414388d	Mobile Unit 1	/generated_images/Irving_studios_1758041495269.png	On-location broadcast unit for field reporting	online	4
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, password, role, is_active, created_at) FROM stdin;
c2a55777-cac5-4d77-a7f5-5799c2cb5ef6	obtv-admin	$2b$12$P5S7pVHCutxFoE2utT3Dh.GQeRy4uQn6cUQFtSMGu4CQ07IwxAZra	admin	true	2025-09-14T16:44:14.203Z
86b0c840-1133-42a8-aea9-c01fb17dd2d7	obtv-user	$2b$12$ZCF8sMMwpQTj7IlM51oKHeOva1lqb12bmxrFyr6aSIYB2qvXPr9.q	user	true	2025-09-14T16:44:14.829Z
f05e0bd6-3ab6-4397-acaf-2176190d4126	obed2	$2b$12$on79vJZM4g0CwDVo9IzJg..w.muNKTDBQGc6XJiUpmTodDRc2RnXq	user	true	2025-09-15 02:59:17.053506+00
\.


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: streams streams_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.streams
    ADD CONSTRAINT streams_pkey PRIMARY KEY (id);


--
-- Name: streams streams_stream_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.streams
    ADD CONSTRAINT streams_stream_id_unique UNIQUE (stream_id);


--
-- Name: studios studios_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.studios
    ADD CONSTRAINT studios_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

