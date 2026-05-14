-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'staff');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  restaurant_name TEXT DEFAULT 'Pathfinder',
  phone TEXT,
  avatar_url TEXT,
  is_active boolean NOT NULL DEFAULT true,
  default_salary numeric NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role public.app_role := 'staff';
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  IF lower(NEW.email) = 'ehsawwerl@gmail.com' THEN
    v_role := 'admin';
  ELSIF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    v_role := 'admin';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT, phone TEXT, email TEXT, address TEXT, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  unit TEXT NOT NULL DEFAULT 'unit',
  current_stock NUMERIC NOT NULL DEFAULT 0,
  reorder_level NUMERIC NOT NULL DEFAULT 10,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  pack_size numeric, pack_cost numeric, pack_unit text,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  customer_name TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  notes TEXT,
  sold_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  movement_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Auth read categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Mgr write categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

CREATE POLICY "Auth read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Mgr write suppliers" ON public.suppliers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

CREATE POLICY "Auth read inventory" ON public.inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers create inventory" ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "Managers update inventory" ON public.inventory_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "Managers delete inventory" ON public.inventory_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

CREATE POLICY "Auth read sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update sales" ON public.sales FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Mgr delete sales" ON public.sales FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

CREATE POLICY "Auth read sale_items" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write sale_items" ON public.sale_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth read expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update expenses" ON public.expenses FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Mgr delete expenses" ON public.expenses FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

CREATE POLICY "Auth read movements" ON public.stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert movements" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_sales_sold_at ON public.sales(sold_at DESC);
CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX idx_inventory_active ON public.inventory_items(is_active);
CREATE INDEX idx_movements_item ON public.stock_movements(item_id);

-- Audit logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, user_email text,
  table_name text NOT NULL, record_id uuid,
  action text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data jsonb, new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name, created_at DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins managers read all audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "Staff read own audit" ON public.audit_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_email text; v_old jsonb; v_new jsonb; v_rid uuid;
BEGIN
  IF v_uid IS NOT NULL THEN SELECT email INTO v_email FROM auth.users WHERE id = v_uid; END IF;
  IF TG_OP = 'DELETE' THEN v_old := to_jsonb(OLD); v_rid := (OLD).id;
  ELSIF TG_OP = 'UPDATE' THEN v_old := to_jsonb(OLD); v_new := to_jsonb(NEW); v_rid := (NEW).id;
  ELSE v_new := to_jsonb(NEW); v_rid := (NEW).id; END IF;
  INSERT INTO public.audit_logs(user_id,user_email,table_name,record_id,action,old_data,new_data)
  VALUES (v_uid, v_email, TG_TABLE_NAME, v_rid, TG_OP, v_old, v_new);
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER audit_inventory AFTER INSERT OR UPDATE OR DELETE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_sales AFTER INSERT OR UPDATE OR DELETE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_sale_items AFTER INSERT OR UPDATE OR DELETE ON public.sale_items FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_expenses AFTER INSERT OR UPDATE OR DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_movements AFTER INSERT OR UPDATE OR DELETE ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.log_audit();

CREATE TABLE public.staff_salaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month date NOT NULL,
  base_salary numeric NOT NULL DEFAULT 0,
  bonus numeric NOT NULL DEFAULT 0,
  deductions numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid','unpaid')),
  paid_at timestamptz, paid_by uuid, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);
CREATE INDEX idx_salaries_month ON public.staff_salaries(month);
ALTER TABLE public.staff_salaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read salaries" ON public.staff_salaries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write salaries" ON public.staff_salaries FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER tr_salaries_updated BEFORE UPDATE ON public.staff_salaries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER audit_salaries AFTER INSERT OR UPDATE OR DELETE ON public.staff_salaries FOR EACH ROW EXECUTE FUNCTION public.log_audit();

CREATE TABLE public.business_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL CHECK (period IN ('4m','6m','annual')),
  start_date date NOT NULL, end_date date NOT NULL,
  target_revenue numeric NOT NULL,
  notes text, created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read goals" ON public.business_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write goals" ON public.business_goals FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER tr_goals_updated BEFORE UPDATE ON public.business_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_cost numeric NOT NULL DEFAULT 0,
  supplier_id uuid, user_id uuid NOT NULL,
  notes text,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_po_item ON public.purchase_orders(item_id, received_at DESC);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read po" ON public.purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Mgr write po" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')));
CREATE TRIGGER audit_po AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.log_audit();

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

INSERT INTO public.categories (name, description) VALUES
  ('Food & Ingredients', 'Raw food items, produce and ingredients'),
  ('Beverages', 'Drinks, water, juices, alcoholic & non-alcoholic'),
  ('Grains & Staples', 'Rice, beans, pasta, flour'),
  ('Meat & Poultry', 'Beef, chicken, fish, seafood'),
  ('Dairy & Eggs', 'Milk, cheese, eggs, yoghurt'),
  ('Spices & Condiments', 'Salt, pepper, oils, sauces, seasonings'),
  ('Cleaning Supplies', 'Detergents, sanitizers, cleaning tools'),
  ('Packaging & Disposables', 'Take-away containers, napkins, cutlery'),
  ('Kitchen Equipment', 'Utensils, small appliances, gas, tools'),
  ('Other', 'Miscellaneous inventory')
ON CONFLICT DO NOTHING;

ALTER TABLE public.inventory_items REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='inventory_items';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items';
  END IF;
END $$;