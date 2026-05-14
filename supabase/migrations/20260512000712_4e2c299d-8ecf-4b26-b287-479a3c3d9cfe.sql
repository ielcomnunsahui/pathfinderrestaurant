DROP POLICY IF EXISTS "Mgr write inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Mgr update inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Mgr delete inventory" ON public.inventory_items;

CREATE POLICY "Managers create inventory"
ON public.inventory_items
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));

CREATE POLICY "Managers update inventory"
ON public.inventory_items
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'manager'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));

CREATE POLICY "Managers delete inventory"
ON public.inventory_items
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'manager'::public.app_role));