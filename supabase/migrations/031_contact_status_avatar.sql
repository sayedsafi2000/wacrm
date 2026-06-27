-- Contact status (About) + avatar storage bucket
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS status_text TEXT,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contact-avatars',
  'contact-avatars',
  TRUE,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Contact avatars are publicly readable" ON storage.objects;
CREATE POLICY "Contact avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contact-avatars');

DROP POLICY IF EXISTS "Members can upload contact avatars" ON storage.objects;
CREATE POLICY "Members can upload contact avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'contact-avatars'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND ('account-' || p.account_id::text) = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "Members can update contact avatars" ON storage.objects;
CREATE POLICY "Members can update contact avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'contact-avatars'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND ('account-' || p.account_id::text) = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "Members can delete contact avatars" ON storage.objects;
CREATE POLICY "Members can delete contact avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'contact-avatars'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND ('account-' || p.account_id::text) = (storage.foldername(name))[1]
    )
  );
