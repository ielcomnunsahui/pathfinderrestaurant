-- Salaries: own row, or admin/manager
DROP POLICY IF EXISTS "Auth read salaries" ON public.staff_salaries;
CREATE POLICY "Own or mgr read salaries" ON public.staff_salaries FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

-- Stock movements: managers/admins only
DROP POLICY IF EXISTS "Auth read movements" ON public.stock_movements;
CREATE POLICY "Mgr read movements" ON public.stock_movements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

-- Realtime: require authenticated session for any channel
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can write realtime" ON realtime.messages;
CREATE POLICY "Authenticated can read realtime" ON realtime.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write realtime" ON realtime.messages FOR INSERT TO authenticated WITH CHECK (true);