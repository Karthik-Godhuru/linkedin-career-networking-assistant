-- Migration: Create post_media_assets table and post-media storage bucket policies
-- Feature: Local Device Media Uploads for Content Planner

-- 1. Create post_media_assets metadata table
CREATE TABLE IF NOT EXISTS public.post_media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES public.content_recommendations(id) ON DELETE CASCADE NOT NULL,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    caption TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for fast lookups by draft post and owner
CREATE INDEX IF NOT EXISTS idx_post_media_assets_post_id ON public.post_media_assets(post_id);
CREATE INDEX IF NOT EXISTS idx_post_media_assets_user_id ON public.post_media_assets(user_id);

-- 3. Grant table permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.post_media_assets
TO authenticated;

-- 4. Enable Row Level Security (RLS) on post_media_assets
ALTER TABLE public.post_media_assets ENABLE ROW LEVEL SECURITY;

-- 5. User isolation policies for post_media_assets
CREATE POLICY "Users can view own post media assets"
    ON public.post_media_assets FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own post media assets"
    ON public.post_media_assets FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.content_recommendations cr
            WHERE cr.id = post_id AND cr.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own post media assets"
    ON public.post_media_assets FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own post media assets"
    ON public.post_media_assets FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 6. Configure Private Supabase Storage Bucket 'post-media'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'post-media',
    'post-media',
    false,
    52428800, -- 50 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];

-- 7. Storage Object RLS Policies (Scope to auth.uid() folder)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects'
        AND schemaname = 'storage'
        AND policyname = 'Users can view own post media files'
    ) THEN
        CREATE POLICY "Users can view own post media files"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects'
        AND schemaname = 'storage'
        AND policyname = 'Users can upload own post media files'
    ) THEN
        CREATE POLICY "Users can upload own post media files"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects'
        AND schemaname = 'storage'
        AND policyname = 'Users can update own post media files'
    ) THEN
        CREATE POLICY "Users can update own post media files"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text)
        WITH CHECK (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects'
        AND schemaname = 'storage'
        AND policyname = 'Users can delete own post media files'
    ) THEN
        CREATE POLICY "Users can delete own post media files"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;
END $$;
