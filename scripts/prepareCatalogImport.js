const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const DEFAULT_XLSX = path.join(process.cwd(), "imports", "Pipes and Fittings.xlsx");
const DEFAULT_IMAGES = path.join(process.cwd(), "imports", "drive-images.csv");
const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), "imports", "output");

function getArgValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) {
    return fallback;
  }
  return process.argv[index + 1];
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanText(value) {
  return String(value || "")
    .replace(/\r\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toSlug(value) {
  return normalizeText(value).replace(/\s+/g, "-");
}

function rowHasExpectedHeaders(row) {
  const normalizedCells = row.map((cell) => normalizeText(cell).replace(/\s+/g, ""));
  const required = ["productname", "description", "size", "price", "material", "brand"];
  return required.every((key) => normalizedCells.includes(key));
}

function extractSheetRows(worksheet) {
  const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  const headerIndex = matrix.findIndex((row) => Array.isArray(row) && rowHasExpectedHeaders(row));

  if (headerIndex === -1) {
    throw new Error("Could not find the expected header row in XLSX (Product Name, Size, Material, Brand, etc).\nCheck the sheet format.");
  }

  const headers = matrix[headerIndex].map((cell, index) => {
    const headerText = cleanText(cell);
    return headerText || `__col_${index}`;
  });

  return matrix
    .slice(headerIndex + 1)
    .map((row) => {
      const mapped = {};
      headers.forEach((header, index) => {
        mapped[header] = row[index] ?? "";
      });
      return mapped;
    })
    .filter((row) =>
      Object.values(row).some((value) => cleanText(value) !== ""),
    );
}

function getField(row, labels) {
  for (const key of Object.keys(row)) {
    const keyNorm = normalizeText(key).replace(/\s+/g, "");
    for (const label of labels) {
      if (keyNorm === normalizeText(label).replace(/\s+/g, "")) {
        return row[key];
      }
    }
  }
  return "";
}

function parsePrice(value) {
  const normalized = cleanText(value).replace(/[^0-9.\-]/g, "");
  if (!normalized) return "";
  const price = Number(normalized);
  if (Number.isNaN(price)) return "";
  return price.toFixed(2);
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/\"/g, "\"\"")}"`;
  }
  return text;
}

function toCsv(rows, headers) {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(row[header])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function parseCsvLine(line) {
  const result = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(value);
      value = "";
      continue;
    }

    value += char;
  }

  result.push(value);
  return result;
}

function loadImageMap(filePath) {
  if (!fs.existsSync(filePath)) {
    return new Map();
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return new Map();

  const headers = parseCsvLine(lines[0]).map((header) => normalizeText(header));
  const nameIndex = headers.findIndex((header) => header === "image name" || header === "image_name" || header === "name");
  const urlIndex = headers.findIndex((header) => header === "image url" || header === "image_url" || header === "url");

  if (nameIndex === -1 || urlIndex === -1) {
    throw new Error("drive-images.csv must contain image_name and image_url columns.");
  }

  const imageMap = new Map();

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const name = cleanText(cols[nameIndex]);
    const url = cleanText(cols[urlIndex]);

    if (!name || !url) continue;
    imageMap.set(normalizeText(name), url);
  }

  return imageMap;
}

function findImageUrl(productName, imageMap) {
  const key = normalizeText(productName);
  if (imageMap.has(key)) {
    return imageMap.get(key);
  }

  for (const [imageKey, imageUrl] of imageMap.entries()) {
    if (imageKey.includes(key) || key.includes(imageKey)) {
      return imageUrl;
    }
  }

  return "";
}

function buildCatalogRows(sheetRows, categoryName, imageMap) {
  const productsByKey = new Map();
  const variants = [];
  const unresolvedImages = [];
  const usedKeys = new Set();

  let currentProduct = null;

  for (const row of sheetRows) {
    const productName = cleanText(getField(row, ["Product Name", "Product"]));
    const description = cleanText(getField(row, ["Description"]));
    const sizeLabel = cleanText(getField(row, ["Size"]));
    const material = cleanText(getField(row, ["Material"]));
    const brand = cleanText(getField(row, ["Brand"]));
    const price = parsePrice(getField(row, ["Price"]));

    const startsNewProduct = Boolean(productName);

    if (startsNewProduct) {
      const keyBase = toSlug(productName) || `product-${usedKeys.size + 1}`;
      let externalKey = keyBase;
      let suffix = 2;
      while (usedKeys.has(externalKey)) {
        externalKey = `${keyBase}-${suffix}`;
        suffix += 1;
      }
      usedKeys.add(externalKey);

      const imageUrl = findImageUrl(productName, imageMap);
      if (!imageUrl) {
        unresolvedImages.push(productName);
      }

      currentProduct = {
        product_external_key: externalKey,
        name: productName,
        description,
        brand,
        material,
        unit: sizeLabel || "unit",
        image_url: imageUrl,
        category_name: categoryName,
      };

  productsByKey.set(externalKey, currentProduct);
    }

    if (!currentProduct) {
      continue;
    }

    if (!currentProduct.description && description) {
      currentProduct.description = description;
    }
    if (!currentProduct.brand && brand) {
      currentProduct.brand = brand;
    }
    if (!currentProduct.material && material) {
      currentProduct.material = material;
    }

    if (sizeLabel) {
      variants.push({
        product_external_key: currentProduct.product_external_key,
        size_label: sizeLabel,
        unit: sizeLabel,
        price,
        stock: "0",
        image_url: currentProduct.image_url,
      });
    }
  }

  return {
    products: Array.from(productsByKey.values()),
    variants,
    unresolvedImages,
  };
}

function main() {
  const xlsxPath = getArgValue("--xlsx", DEFAULT_XLSX);
  const imagesCsvPath = getArgValue("--images", DEFAULT_IMAGES);
  const outputDir = getArgValue("--out", DEFAULT_OUTPUT_DIR);
  const categoryName = getArgValue("--category", "Conduits & Pipes");

  if (!fs.existsSync(xlsxPath)) {
    throw new Error(`XLSX file not found at: ${xlsxPath}`);
  }

  const workbook = XLSX.readFile(xlsxPath);
  const firstSheet = workbook.SheetNames[0];
  const rows = extractSheetRows(workbook.Sheets[firstSheet]);

  const imageMap = loadImageMap(imagesCsvPath);
  const { products, variants, unresolvedImages } = buildCatalogRows(rows, categoryName, imageMap);

  fs.mkdirSync(outputDir, { recursive: true });

  const productsHeaders = [
    "product_external_key",
    "name",
    "description",
    "brand",
    "material",
    "unit",
    "image_url",
    "category_name",
  ];
  const variantsHeaders = [
    "product_external_key",
    "size_label",
    "unit",
    "price",
    "stock",
    "image_url",
  ];

  fs.writeFileSync(path.join(outputDir, "products.csv"), toCsv(products, productsHeaders), "utf8");
  fs.writeFileSync(path.join(outputDir, "product_variants.csv"), toCsv(variants, variantsHeaders), "utf8");

  if (unresolvedImages.length) {
    const unresolvedRows = unresolvedImages.map((name) => ({ product_name: name }));
    fs.writeFileSync(
      path.join(outputDir, "unresolved_images.csv"),
      toCsv(unresolvedRows, ["product_name"]),
      "utf8",
    );
  }

  console.log(`Prepared ${products.length} products and ${variants.length} variants.`);
  console.log(`Products file: ${path.join(outputDir, "products.csv")}`);
  console.log(`Variants file: ${path.join(outputDir, "product_variants.csv")}`);
  if (unresolvedImages.length) {
    console.log(`Unresolved image names: ${unresolvedImages.length} (see unresolved_images.csv)`);
  }
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
