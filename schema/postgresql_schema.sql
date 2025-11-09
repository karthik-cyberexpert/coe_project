-- Standard PostgreSQL Database Schema
-- Version: 1.0
-- Note: This schema is adapted from a Supabase project for use with standard PostgreSQL.
-- Supabase-specific features (e.g., auth schema, auth.uid()) have been replaced.

--
-- Prequisites: Enable the pgcrypto extension for gen_random_uuid()
-- You may need to run this command as a superuser:
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--

--
-- Create Tables
--

-- Table: public.users
-- A standard table to store user information, replacing Supabase's auth.users.
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL, -- Application is responsible for hashing passwords
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Table: public.profiles
-- Stores user profile information, linked to the public.users table.
CREATE TABLE public.profiles (
  id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name text NULL,
  is_admin boolean NULL DEFAULT false,
  is_ceo boolean NULL DEFAULT false,
  is_sub_admin boolean NULL DEFAULT false,
  is_staff boolean NULL DEFAULT true,
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- Table: public.departments
-- Stores academic departments.
CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  degree text NOT NULL,
  department_code text NOT NULL,
  department_name text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT departments_pkey PRIMARY KEY (id)
);

-- Table: public.subjects
-- Stores academic subjects, optionally linked to a department.
CREATE TABLE public.subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subject_code text NOT NULL,
  subject_name text NOT NULL,
  department_id uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT subjects_pkey PRIMARY KEY (id),
  CONSTRAINT subjects_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL
);

-- Table: public.sheets
-- Stores information about uploaded data sheets.
CREATE TABLE public.sheets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sheet_name text NOT NULL,
  file_path text NOT NULL,
  subject_id uuid NOT NULL,
  department_id uuid NOT NULL,
  user_id uuid NULL, -- This must be set by the application
  created_at timestamp with time zone NULL DEFAULT now(),
  start_date timestamp with time zone NULL,
  end_date timestamp with time zone NULL,
  updated_at timestamp with time zone NULL DEFAULT now(),
  attendance_marked boolean NULL DEFAULT false,
  duplicates_generated boolean NULL DEFAULT false,
  external_marks_added boolean NULL DEFAULT false,
  year text NULL,
  batch text NULL,
  CONSTRAINT sheets_pkey PRIMARY KEY (id),
  CONSTRAINT sheets_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE,
  CONSTRAINT sheets_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE,
  CONSTRAINT sheets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);

--
-- Create Functions
--

-- Function: public.trigger_set_timestamp()
-- Updates the 'updated_at' column to the current timestamp.
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

--
-- Create Triggers
--

-- Trigger: set_timestamp on public.sheets
-- Fires the trigger_set_timestamp() function before a sheet record is updated.
CREATE TRIGGER set_timestamp
  BEFORE UPDATE ON public.sheets
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- Trigger: set_timestamp on public.users
CREATE TRIGGER set_timestamp
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- Trigger: set_timestamp on public.profiles
CREATE TRIGGER set_timestamp
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

--
-- Enable Row Level Security (RLS) and Create Policies
--
-- Note: RLS policies in standard PostgreSQL require a mechanism to identify the current user,
-- often via session variables (e.g., current_setting('app.current_user_id')).
-- The policies below are generic and grant access to any authenticated database role.
-- Your application logic will be responsible for setting the user context.

-- RLS for public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own profiles" ON public.profiles
  FOR ALL USING (id = current_setting('app.current_user_id', true)::uuid);

-- RLS for public.departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to manage departments" ON public.departments FOR ALL USING (true);

-- RLS for public.subjects
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to manage subjects" ON public.subjects FOR ALL USING (true);

-- RLS for public.sheets
ALTER TABLE public.sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to manage sheets" ON public.sheets FOR ALL USING (true);