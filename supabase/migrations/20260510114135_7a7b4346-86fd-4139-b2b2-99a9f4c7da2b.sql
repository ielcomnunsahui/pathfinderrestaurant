
-- Add is_active to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Audit logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name, created_at DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins managers read all audit" ON public.audit_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "Staff read own audit" ON public.audit_logs FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Generic audit trigger
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_old jsonb;
  v_new jsonb;
  v_rid uuid;
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  END IF;
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD); v_rid := (OLD).id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW); v_rid := (NEW).id;
  ELSE
    v_new := to_jsonb(NEW); v_rid := (NEW).id;
  END IF;
  INSERT INTO public.audit_logs(user_id,user_email,table_name,record_id,action,old_data,new_data)
  VALUES (v_uid, v_email, TG_TABLE_NAME, v_rid, TG_OP, v_old, v_new);
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER audit_inventory AFTER INSERT OR UPDATE OR DELETE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_sales AFTER INSERT OR UPDATE OR DELETE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_sale_items AFTER INSERT OR UPDATE OR DELETE ON public.sale_items FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_expenses AFTER INSERT OR UPDATE OR DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_movements AFTER INSERT OR UPDATE OR DELETE ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- Staff salaries
CREATE TABLE public.staff_salaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month date NOT NULL,
  base_salary numeric NOT NULL DEFAULT 0,
  bonus numeric NOT NULL DEFAULT 0,
  deductions numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid','unpaid')),
  paid_at timestamptz,
  paid_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);
CREATE INDEX idx_salaries_month ON public.staff_salaries(month);
ALTER TABLE public.staff_salaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read salaries" ON public.staff_salaries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write salaries" ON public.staff_salaries FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER tr_salaries_updated BEFORE UPDATE ON public.staff_salaries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER audit_salaries AFTER INSERT OR UPDATE OR DELETE ON public.staff_salaries FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- Business goals
CREATE TABLE public.business_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL CHECK (period IN ('4m','6m','annual')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  target_revenue numeric NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read goals" ON public.business_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write goals" ON public.business_goals FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER tr_goals_updated BEFORE UPDATE ON public.business_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Purchase orders
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_cost numeric NOT NULL DEFAULT 0,
  supplier_id uuid,
  user_id uuid NOT NULL,
  notes text,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_po_item ON public.purchase_orders(item_id, received_at DESC);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read po" ON public.purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Mgr write po" ON public.purchase_orders FOR INSERT TO authenticated
WITH CHECK ((auth.uid() = user_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')));
CREATE TRIGGER audit_po AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- Stock auto-decrement on sale_items insert
CREATE OR REPLACE FUNCTION public.sale_item_decrement_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid;
BEGIN
  IF NEW.item_id IS NOT NULL THEN
    UPDATE public.inventory_items SET current_stock = current_stock - NEW.quantity WHERE id = NEW.item_id;
    SELECT user_id INTO v_user FROM public.sales WHERE id = NEW.sale_id;
    INSERT INTO public.stock_movements(item_id,user_id,movement_type,quantity,notes)
    VALUES (NEW.item_id, COALESCE(v_user, auth.uid()), 'sale', -NEW.quantity, 'Auto from sale ' || NEW.sale_id::text);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tr_sale_item_stock AFTER INSERT ON public.sale_items FOR EACH ROW EXECUTE FUNCTION public.sale_item_decrement_stock();

-- Stock auto-increment on purchase order insert
CREATE OR REPLACE FUNCTION public.po_increment_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.inventory_items
    SET current_stock = current_stock + NEW.quantity,
        cost_price = CASE WHEN NEW.unit_cost > 0 THEN NEW.unit_cost ELSE cost_price END
  WHERE id = NEW.item_id;
  INSERT INTO public.stock_movements(item_id,user_id,movement_type,quantity,notes)
  VALUES (NEW.item_id, NEW.user_id, 'purchase', NEW.quantity, COALESCE(NEW.notes,'Restock'));
  RETURN NEW;
END $$;
CREATE TRIGGER tr_po_stock AFTER INSERT ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.po_increment_stock();
