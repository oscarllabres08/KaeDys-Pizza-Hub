-- Ensure orders table emits Supabase Realtime events for postgres_changes subscriptions.

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

