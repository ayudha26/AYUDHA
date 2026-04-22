# Pipes and Fittings Catalog Import (Option 2: DB Read-Only)

## 1) Run database migration

Open Supabase SQL Editor and run:

database/product_variants_migration.sql

This adds:
- products.catalog_key (stable import key)
- products.brand
- products.material
- product_variants table for sizes

## 2) Prepare files

Place files in:

imports/Pipes and Fittings.xlsx
imports/drive-images.csv

The image CSV must include headers:
- image_name
- image_url

Use Drive direct links in image_url:
- https://drive.google.com/uc?export=view&id=FILE_ID

## 3) Build import CSVs from XLSX

Run:

npm run catalog:prepare

Optional args:
- --xlsx <path>
- --images <path>
- --out <path>
- --category <name>

Example:

node scripts/prepareCatalogImport.js --xlsx "imports/Pipes and Fittings.xlsx" --images imports/drive-images.csv --category "Conduits & Pipes"

Outputs:
- imports/output/products.csv
- imports/output/product_variants.csv
- imports/output/unresolved_images.csv (only if some products did not match an image)

## 4) Load staging CSVs in Supabase

In Supabase Table Editor:

1. Create/import into catalog_products_staging from imports/output/products.csv
2. Create/import into catalog_variants_staging from imports/output/product_variants.csv

Then run:

database/catalog_staging_import.sql

This script will:
- enforce read-only catalog access for anon/authenticated app users
- create staging tables if missing
- upsert into categories
- upsert into products using products.catalog_key
- upsert into product_variants using (product_id, size_label)

## 5) Read-only behavior

App users can read catalog rows but cannot write to categories, products, or product_variants.
Catalog updates are done by you via SQL editor or service-role/admin workflows only.

## 6) App behavior

Once rows are in products and product_variants:
- Category listing shows product brand and material
- Product detail screen shows available sizes and updates displayed price by size
