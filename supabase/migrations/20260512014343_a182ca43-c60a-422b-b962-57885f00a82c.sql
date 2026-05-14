
-- Bulk pricing on inventory items
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS pack_size numeric,
  ADD COLUMN IF NOT EXISTS pack_cost numeric,
  ADD COLUMN IF NOT EXISTS pack_unit text;

-- Default monthly salary on profiles for quick payroll generation
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_salary numeric NOT NULL DEFAULT 0;

-- Seed common restaurant categories (idempotent)
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
