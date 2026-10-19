# FUJI help guide

## Import and validate

Choose an Excel (`.xlsx`, `.xls`) or CSV inventory file. The recommended columns are `SUPPLIER`, `LOCATOR`, `SKU`, `UPC`, and `DESCRIPTION`; common aliases such as Vendor, Bin, Product Code, Barcode, and Item Name are accepted. Keep SKU and UPC values as text so leading zeroes remain. Locators beginning with `SA-`, `BA-`, and `WH-` identify their corresponding stock areas. Review missing values, duplicate identifiers, and check-digit warnings before configuring the layout. The app keeps data in this browser unless you explicitly move it to another workflow.

An optional `ON HAND`, `EXPECTED QTY`, or `QUANTITY` column becomes the expected quantity. After validation, choose **Start physical count**. Enter missing expected quantities and counted quantities as non-negative whole numbers. Press Enter in a counted field to move to the next item. Counts save in this browser's IndexedDB. Set the absolute unit tolerance for the session; the default is zero. Every edit records who changed the value and when. Give a variance a reason before approving it, or flag it for recount. Complete the session after every row has an expected and counted quantity and each out-of-tolerance variance is approved or recounted. Export a CSV or print the variance report from the session screen.

## Generate and print

Choose supplier, department, or category groupings, then set paper size, orientation, margins, rows per page, and optional columns. Preview the sheet before printing. Browser print preview always uses light paper colors. The yellow PP shelf tag stock is 85 × 38 mm; white shelf tags use the regular price and barcode-first layout. Print a small sample first to confirm printer scaling.

## Product lookup and masterlist

Search by SKU, UPC, description, or locator. The Masterlist module imports catalog workbooks and stores the active parsed catalog in this device's IndexedDB. Use Settings to export a JSON backup before changing devices or clearing browser data.

## Cigarette monitor and expiry

Import the current cigarette inventory and daily monitoring counts. Expiry checks use the expiry date recorded for each batch; verify the source date and follow store policy before removing stock.

## Backup and restore

Download a backup from Settings before clearing data or changing devices. Backups include the inventory, workspace preferences, and saved count sessions. Restore the JSON backup through the same Settings area. Restore replaces the matching workspace state in this browser; keep a separate copy of the backup file.

## Troubleshooting

- If a workbook is not recognized, use a first-row header containing SKU or Description and at least one additional supported field.
- If UPC leading zeroes disappear, re-export the source column as text and import again.
- If locators are grouped incorrectly, use consistent `SA-`, `BA-`, or `WH-` prefixes.
- If a print preview is clipped, choose the paper size and orientation matching the printer, then reduce margins or rows per page.
- If cloud sign-in fails, check Firebase authorized domains and the sign-in provider settings. Offline device workspace remains available.
- AI help is optional and needs server-side provider credentials. Never include passwords, payment data, or personal customer information in AI prompts.

## Cycle-count practices

Use ABC classification to count high-value or high-movement items more frequently. Set tolerances with the inventory owner, recount meaningful variances, and investigate receiving, transfers, unit-of-measure, locator, and shrink causes before posting adjustments. FUJI does not post inventory changes.
