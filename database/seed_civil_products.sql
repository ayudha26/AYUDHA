-- Seed civil products and variants from CSV
-- Assumptions:
-- 1) Price unknown -> set to 0.00 (update later).
-- 2) Image URL pattern: https://crgifantdhqwenqypgey.supabase.co/storage/v1/object/public/civil/<NAME_UPPERCASED_WITH_%20>.JPG
-- 3) Uses existing category 'Cement & Concrete' and 'Steel & Metal'. Creates 'Civil Items' category.

-- Create a category for general civil items if missing
insert into categories (name, description)
select 'Civil Items', 'Imported civil items from CSV'
where not exists (select 1 from categories where name = 'Civil Items');

-- MAT CHAPE (use Cement & Concrete category)
insert into products (name, description, price, unit, category_id, image_url, stock, catalog_key)
select
  'Mat Chape',
  $$Mat Chape is a premium-grade, cement-based flooring mortar engineered to provide a robust, level foundation for all types of interior and exterior floor finishes. Formulated with high-strength Portland cement, graded silica sands, and specialized synthetic additives, it ensures excellent workability and long-term durability.$$,
  0.00,
  'Bundle',
  c.id,
  'https://crgifantdhqwenqypgey.supabase.co/storage/v1/object/public/civil/MAT%20CHAPE.JPG',
  0,
  'mat-chape'
from categories c
where c.name = 'Cement & Concrete'
  and not exists (select 1 from products p where p.name = 'Mat Chape')
limit 1;

-- CIVIL WIRE MESH (with variants 1kg,2kg,3kg,4kg) -> Steel & Metal category
insert into products (name, description, price, unit, category_id, image_url, stock, catalog_key)
select
  'Civil Wire Mesh',
  $$Civil wire mesh is a fundamental reinforcement material used across modern infrastructure projects to provide structural integrity, crack control, and soil stabilization. Manufactured from high-quality cold-drawn steel wire, this mesh is precision-welded at every intersection to create a robust, grid-like fabric that excels in high-stress environments.$$,
  0.00,
  'kg',
  c.id,
  'https://crgifantdhqwenqypgey.supabase.co/storage/v1/object/public/civil/CIVIL%20WIRE%20MESH.JPG',
  0,
  'civil-wire-mesh'
from categories c
where c.name = 'Steel & Metal'
  and not exists (select 1 from products p where p.name = 'Civil Wire Mesh')
limit 1;

-- Variants for Civil Wire Mesh
insert into product_variants (product_id, size_label, unit, price, stock, image_url)
select p.id, '1kg', 'kg', 0.00, 0, p.image_url
from products p
where p.name = 'Civil Wire Mesh'
  and not exists (select 1 from product_variants v where v.product_id = p.id and v.size_label = '1kg');

insert into product_variants (product_id, size_label, unit, price, stock, image_url)
select p.id, '2kg', 'kg', 0.00, 0, p.image_url
from products p
where p.name = 'Civil Wire Mesh'
  and not exists (select 1 from product_variants v where v.product_id = p.id and v.size_label = '2kg');

insert into product_variants (product_id, size_label, unit, price, stock, image_url)
select p.id, '3kg', 'kg', 0.00, 0, p.image_url
from products p
where p.name = 'Civil Wire Mesh'
  and not exists (select 1 from product_variants v where v.product_id = p.id and v.size_label = '3kg');

insert into product_variants (product_id, size_label, unit, price, stock, image_url)
select p.id, '4kg', 'kg', 0.00, 0, p.image_url
from products p
where p.name = 'Civil Wire Mesh'
  and not exists (select 1 from product_variants v where v.product_id = p.id and v.size_label = '4kg');

-- CEMENTS (use Cement & Concrete category)

insert into products (name, description, price, unit, category_id, image_url, stock, catalog_key)
select
  'UltraTech',
  $$UltraTech Cement is the flagship brand of Aditya Birla Group and stands as India's largest manufacturer of grey cement and ready-mix concrete. Known for its superior reliability and versatility, it is the go-to choice for everything from massive infrastructure projects to individual home builds.$$,
  0.00,
  '50Kg',
  c.id,
  'https://crgifantdhqwenqypgey.supabase.co/storage/v1/object/public/civil/ULTRATECH.JPG',
  0,
  'ultratech'
from categories c
where c.name = 'Cement & Concrete'
  and not exists (select 1 from products p where p.name = 'UltraTech')
limit 1;

insert into products (name, description, price, unit, category_id, image_url, stock, catalog_key)
select
  'ACC Suraksha',
  $$ACC Suraksha is a premium, high-performance cement engineered primarily for residential construction. It is a Portland Pozzolana Cement (PPC) that utilizes advanced Particle Size Distribution (PSD) technology to create denser concrete, making it a popular choice for homeowners looking for long-term durability and protection against environmental wear.$$,
  0.00,
  '50Kg',
  c.id,
  'https://crgifantdhqwenqypgey.supabase.co/storage/v1/object/public/civil/ACC%20Suraksha.png',
  0,
  'acc-suraksha'
from categories c
where c.name = 'Cement & Concrete'
  and not exists (select 1 from products p where p.name = 'ACC Suraksha')
limit 1;

insert into products (name, description, price, unit, category_id, image_url, stock, catalog_key)
select
  'Priya',
  $$Priya Cement, manufactured by Rain Cements Limited (RCL), is one of South India's most recognized and trusted cement brands. Known for its tagline "Fast and Strong, Lasts Long," the brand leverages state-of-the-art Danish technology (F.L. Smidth) to produce high-performance cement suitable for everything from independent homes to massive infrastructure projects.$$,
  0.00,
  '50Kg',
  c.id,
  'https://crgifantdhqwenqypgey.supabase.co/storage/v1/object/public/civil/PRIYA.JPG',
  0,
  'priya'
from categories c
where c.name = 'Cement & Concrete'
  and not exists (select 1 from products p where p.name = 'Priya')
limit 1;

insert into products (name, description, price, unit, category_id, image_url, stock, catalog_key)
select
  'Ramco',
  $$Ramco Cements Limited is one of India’s most prestigious and technologically advanced cement manufacturers. Known for its "Right Products for Right Applications" philosophy, Ramco focuses on delivering high-performance, durable solutions for everything from small residential homes to massive infrastructure projects.$$,
  0.00,
  '50Kg',
  c.id,
  'https://crgifantdhqwenqypgey.supabase.co/storage/v1/object/public/civil/RAMCO.JPG',
  0,
  'ramco'
from categories c
where c.name = 'Cement & Concrete'
  and not exists (select 1 from products p where p.name = 'Ramco')
limit 1;

-- Done
