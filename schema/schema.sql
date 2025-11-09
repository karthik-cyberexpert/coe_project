-- Supabase Database Schema
-- Version: 1.0

--
-- Create Tables
--

-- Table: public.profiles
-- Stores user profile information, linked to the auth.users table.
CREATE TABLE public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id uuid NULL DEFAULT auth.uid(),
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
  CONSTRAINT sheets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

--
-- Create Functions
--

-- Function: public.handle_new_user()
-- Automatically creates a profile for a new user upon sign-up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$function$
;

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

-- Trigger: on_auth_user_created on auth.users
-- Fires the handle_new_user() function after a new user is inserted into auth.users.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: set_timestamp on public.sheets
-- Fires the trigger_set_timestamp() function before a sheet record is updated.
CREATE TRIGGER set_timestamp
  BEFORE UPDATE ON public.sheets
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

--
-- Enable Row Level Security (RLS) and Create Policies
--

-- RLS for public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- RLS for public.departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to view departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert departments" ON public.departments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update departments" ON public.departments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete departments" ON public.departments FOR DELETE TO authenticated USING (true);

-- RLS for public.subjects
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to view subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert subjects" ON public.subjects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update subjects" ON public.subjects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete subjects" ON public.subjects FOR DELETE TO authenticated USING (true);

-- RLS for public.sheets
ALTER TABLE public.sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to authenticated users on sheets" ON public.sheets FOR ALL TO authenticated USING (true) WITH CHECK (true);