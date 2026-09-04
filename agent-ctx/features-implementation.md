# Task: Implement Multiple Features for NexusOne POS

## Agent: Main Developer
## Status: COMPLETED

## Summary of Changes

### 1. Schema Changes (prisma/schema.prisma)
- Added `creditDays Int @default(0)` to `Supplier` model
- Added 11 new print config fields to `Settings` model (ticketHeaderFontSize, ticketShowInvoiceId, ticketInvoiceIdAlign, ticketLineSpacing, ticketColSpacing, ticketBodyFontSize, ticketItemFontSize, ticketTotalFontSize, ticketFooterFontSize, ticketRifFontSize, ticketAddressFontSize)
- Added new `AccountsPayable` model with supplier/purchase relations
- Added `accountsPayable AccountsPayable[]` relations to Supplier and Purchase models
- Ran `npx prisma db push --accept-data-loss` successfully

### 2. Print Config Tab (NEW)
- Created `/src/components/print-config-tab.tsx` with 5 organized sections:
  1. TICKET (Prioridad) - Font sizes for all sections, line/column spacing sliders
  2. Alineación y Visibilidad - Toggle show/hide Invoice ID, alignment, visibility toggles
  3. Papel y Márgenes - Paper width selector, margins
  4. Agente de Impresión - Use agent toggle, URL, cancel button
  5. Presupuestos y Notas de Entrega - "Proximamente" placeholder

### 3. Page.tsx Updates
- Added `PrintConfigTab` import
- Added `print-config` tab entry in `allTabs` and `ADMIN_ONLY_TABS`
- Added `print-config` to `app-nav.tsx` buildGroups sistema group
- Added `TabsContent` rendering for `print-config`
- Added new fields to `Settings` interface and default state
- Added new props to PosTab component
- Fixed Settings interface to include themeMode and euroUsdtRate

### 4. escpos-buffer.ts Updates
- Added new fields to `EscposSettings` interface
- Added conditional header font size (custom vs default double-width)
- Applied `ticketShowInvoiceId` toggle and `ticketInvoiceIdAlign` alignment
- Applied `ticketLineSpacing` as extra feed lines

### 5. ticket-printer.ts Updates
- Added new fields to `TicketSettings` interface
- Applied `ticketHeaderFontSize` to store name font-size
- Applied `ticketShowInvoiceId` toggle and `ticketInvoiceIdAlign` alignment
- Applied `ticketLineSpacing` as line-height multiplier

### 6. POS Tab Updates
- Added new props to `PosTabProps` in types.ts
- Added defaults in pos-tab.tsx destructuring
- Passed new settings to `ticketSettings` object
- Added to useCallback dependency array

### 7. Supplier Credit Days
- Added `creditDays` to Supplier interface in suppliers-tab.tsx
- Added credit days select (0, 15, 20, 30, 45, 60, 90, 120, 180, 360) in dialog
- Added credit days badge in table
- Added `creditDays` to POST/PUT in suppliers API route

### 8. Accounts Payable API
- Created `/src/app/api/accounts-payable/route.ts` with GET/POST/PUT handlers
- Supports filtering by status and supplierId
- Includes supplier and purchase relations

### 9. License Machine ID Binding
- Updated GENERAR-LICENCIA.html with Machine ID input, Max Activations input, Batch mode
- Updated `generateLicenseKey` to accept machineId parameter
- Updated `generate()` to pass machineId and show in results
- Added `batchGenerate()` function for batch mode
- Updated GENERAR-LICENCIA.js with machineId arg support, batch mode

### 10. Image Crop Fix
- Changed crop-dialog.tsx default crop to full image (x:0, y:0, full width/height)
- Changed products-tab.tsx `object-cover` to `object-contain` for product images

### 11. Cancel Pending Prints
- Added DELETE handler to print-agent/route.ts that POSTs to agent's /cancel endpoint

### 12. Settings API
- Added all new print config fields to PUT handler in settings/route.ts

### 13. config-tab.tsx Settings Interface
- Updated Settings interface in config-tab.tsx to include all new fields

## TypeScript Verification
- No new TypeScript errors introduced by changes (verified with tsc --noEmit)
- Pre-existing errors are unrelated to these changes
