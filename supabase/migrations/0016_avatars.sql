-- Profile headshots.
--
-- A private bucket (unlike logos): a person's photo is only ever shown to that person, through a
-- short-lived signed link. Each user can only touch files inside a folder named after their own user id,
-- so one account can never read, replace or delete another's photo. Size and type are capped by the bucket itself.
-- The display name and the photo's path live in the user's own auth metadata, so no table is needed.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "owner read avatars" on storage.objects for select
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner upload avatars" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner update avatars" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner delete avatars" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
