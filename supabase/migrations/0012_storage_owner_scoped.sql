-- Storage isolation for multi-tenant sign-up.
--
-- 0003/0004 gave the receipts and logos buckets "any signed-in user" policies,
-- and 0009 (multi-tenant) only rewrote table policies, not these. With public
-- sign-up open, any new user could list, open, overwrite or delete every
-- other user's receipt files through the storage API.
--
-- New rule, per bucket: you can read/update/delete a file if you uploaded it
-- (storage.objects.owner_id = your user id) OR it is attached to a row you own
-- (a transaction's receipt_path / a business's logo_path). The second clause
-- keeps files that were migrated in without an uploader id (owner_id is null)
-- working for their real owner. Uploading stays open to any signed-in user.

drop policy if exists "authenticated read receipts" on storage.objects;
drop policy if exists "authenticated update receipts" on storage.objects;
drop policy if exists "authenticated delete receipts" on storage.objects;
drop policy if exists "authenticated read logos" on storage.objects;
drop policy if exists "authenticated update logos" on storage.objects;
drop policy if exists "authenticated delete logos" on storage.objects;

create policy "owner read receipts" on storage.objects for select using (
  bucket_id = 'receipts' and (
    owner_id = auth.uid()::text
    or exists (select 1 from public.transactions t where t.receipt_path = storage.objects.name and t.owner_id = auth.uid())
  )
);
create policy "owner update receipts" on storage.objects for update using (
  bucket_id = 'receipts' and (
    owner_id = auth.uid()::text
    or exists (select 1 from public.transactions t where t.receipt_path = storage.objects.name and t.owner_id = auth.uid())
  )
);
create policy "owner delete receipts" on storage.objects for delete using (
  bucket_id = 'receipts' and (
    owner_id = auth.uid()::text
    or exists (select 1 from public.transactions t where t.receipt_path = storage.objects.name and t.owner_id = auth.uid())
  )
);

-- The logos bucket is public, so displaying a logo by its public URL does not
-- depend on these policies; they only govern listing, overwriting and deleting.
create policy "owner read logos" on storage.objects for select using (
  bucket_id = 'logos' and (
    owner_id = auth.uid()::text
    or exists (select 1 from public.businesses b where b.logo_path = storage.objects.name and b.owner_id = auth.uid())
  )
);
create policy "owner update logos" on storage.objects for update using (
  bucket_id = 'logos' and (
    owner_id = auth.uid()::text
    or exists (select 1 from public.businesses b where b.logo_path = storage.objects.name and b.owner_id = auth.uid())
  )
);
create policy "owner delete logos" on storage.objects for delete using (
  bucket_id = 'logos' and (
    owner_id = auth.uid()::text
    or exists (select 1 from public.businesses b where b.logo_path = storage.objects.name and b.owner_id = auth.uid())
  )
);
