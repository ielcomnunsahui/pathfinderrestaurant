DROP POLICY IF EXISTS "Auth write sale_items" ON public.sale_items;
CREATE POLICY "Owner insert sale_items" ON public.sale_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND s.user_id = auth.uid()));
CREATE POLICY "Owner update sale_items" ON public.sale_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND (s.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "Mgr delete sale_items" ON public.sale_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));