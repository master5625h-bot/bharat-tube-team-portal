-- After you sign up once in the portal, run this with YOUR email to become Admin.
update public.profiles set role = 'admin', approved = true where email = 'YOUR-EMAIL@example.com';
