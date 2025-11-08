# مخطط قاعدة البيانات - ERP Mini
## نظرة عامة

النظام يستخدم قاعدة بيانات **SQLite** واحدة تحتوي على **16 جدول** مترابطة بعلاقات Foreign Key.

---

## جميع الجداول والعلاقات

### 1. **products** - المنتجات
**المفتاح الأساسي:** `id` (TEXT)  
**المفاتيح الفريدة:** `code` (UNIQUE)  
**المفاتيح الخارجية:** لا يوجد

**العلاقات:**
- **One-to-Many** مع `sales_invoice_items` (من خلال `productId`)
- **One-to-Many** مع `purchase_invoice_items` (من خلال `productId`)
- **One-to-Many** مع `inventory_adjustments` (من خلال `productId`)
- **Many-to-One** مع `categories` (من خلال `category` - علاقة نصية، غير محمية بـ Foreign Key)

**الحقول:**
- `id` - معرف المنتج
- `code` - كود المنتج (فريد)
- `name` - اسم المنتج
- `category` - الصنف (يربط مع `categories.name`)
- `smallestUnit` - أصغر وحدة
- `largestUnit` - أكبر وحدة
- `conversionFactor` - معامل التحويل
- `smallestPrice` - سعر أصغر وحدة
- `largestPrice` - سعر أكبر وحدة
- `stock` - المخزون الحالي
- `openingStock` - المخزون الافتتاحي
- `status` - الحالة (active/inactive)
- `lastSaleDate` - تاريخ آخر بيع
- `notes` - ملاحظات
- `createdAt`, `updatedAt` - تواريخ الإنشاء والتحديث

---

### 2. **categories** - الأصناف
**المفتاح الأساسي:** `id` (TEXT)  
**المفاتيح الفريدة:** `name` (UNIQUE)  
**المفاتيح الخارجية:** لا يوجد

**العلاقات:**
- **One-to-Many** مع `products` (من خلال `category` - علاقة نصية)

**الحقول:**
- `id` - معرف الصنف
- `name` - اسم الصنف (فريد)
- `createdAt` - تاريخ الإنشاء

---

### 3. **customers** - العملاء
**المفتاح الأساسي:** `id` (TEXT)  
**المفاتيح الفريدة:** `code` (UNIQUE)  
**المفاتيح الخارجية:** لا يوجد

**العلاقات:**
- **One-to-Many** مع `sales_invoices` (من خلال `customerId`)
- **One-to-Many** مع `receipts` (من خلال `customerId`)

**الحقول:**
- `id` - معرف العميل
- `code` - كود العميل (فريد)
- `name` - اسم العميل
- `phone` - رقم الهاتف
- `address` - العنوان
- `openingBalance` - الرصيد الافتتاحي
- `balance` - الرصيد الحالي
- `status` - الحالة (active/inactive)
- `firstTransactionDate` - تاريخ أول تعامل
- `lastTransactionDate` - تاريخ آخر تعامل
- `notes` - ملاحظات
- `createdAt`, `updatedAt` - تواريخ الإنشاء والتحديث

---

### 4. **suppliers** - الموردين
**المفتاح الأساسي:** `id` (TEXT)  
**المفاتيح الفريدة:** `code` (UNIQUE)  
**المفاتيح الخارجية:** لا يوجد

**العلاقات:**
- **One-to-Many** مع `purchase_invoices` (من خلال `supplierId`)
- **One-to-Many** مع `payments` (من خلال `supplierId` - اختياري)
- **One-to-Many** مع `fixed_assets` (من خلال `supplierId` - اختياري)

**الحقول:**
- `id` - معرف المورد
- `code` - كود المورد (فريد)
- `name` - اسم المورد
- `phone` - رقم الهاتف
- `address` - العنوان
- `openingBalance` - الرصيد الافتتاحي
- `balance` - الرصيد الحالي
- `status` - الحالة (active/inactive)
- `firstTransactionDate` - تاريخ أول تعامل
- `lastTransactionDate` - تاريخ آخر تعامل
- `createdAt`, `updatedAt` - تواريخ الإنشاء والتحديث

---

### 5. **sales_invoices** - فواتير المبيعات
**المفتاح الأساسي:** `id` (TEXT)  
**المفاتيح الفريدة:** `invoiceNumber` (UNIQUE)  
**المفاتيح الخارجية:** 
- `customerId` → `customers(id)`

**العلاقات:**
- **Many-to-One** مع `customers` (من خلال `customerId`)
- **One-to-Many** مع `sales_invoice_items` (من خلال `invoiceId`)

**الحقول:**
- `id` - معرف الفاتورة
- `invoiceNumber` - رقم الفاتورة (فريد)
- `customerId` - معرف العميل (FK → `customers.id`)
- `date` - تاريخ الفاتورة
- `dueDate` - تاريخ الاستحقاق
- `status` - الحالة (pending/delivered)
- `subtotal` - المجموع الفرعي
- `taxRate` - نسبة الضريبة
- `taxAmount` - مبلغ الضريبة
- `shipping` - الشحن
- `discount` - الخصم
- `total` - الإجمالي
- `paid` - المدفوع
- `remaining` - المتبقي
- `paymentMethod` - طريقة الدفع
- `notes` - ملاحظات
- `createdAt`, `updatedAt` - تواريخ الإنشاء والتحديث

---

### 6. **sales_invoice_items** - عناصر فواتير المبيعات
**المفتاح الأساسي:** `id` (TEXT)  
**المفاتيح الفريدة:** لا يوجد  
**المفاتيح الخارجية:** 
- `invoiceId` → `sales_invoices(id)` ON DELETE CASCADE
- `productId` → `products(id)`

**العلاقات:**
- **Many-to-One** مع `sales_invoices` (من خلال `invoiceId`) - عند حذف الفاتورة، تُحذف العناصر تلقائياً
- **Many-to-One** مع `products` (من خلال `productId`)

**الحقول:**
- `id` - معرف العنصر
- `invoiceId` - معرف الفاتورة (FK → `sales_invoices.id`)
- `productId` - معرف المنتج (FK → `products.id`)
- `productName` - اسم المنتج (نسخة احتياطية)
- `unit` - الوحدة (smallest/largest)
- `quantity` - الكمية
- `price` - السعر
- `total` - الإجمالي

---

### 7. **purchase_invoices** - فواتير المشتريات
**المفتاح الأساسي:** `id` (TEXT)  
**المفاتيح الفريدة:** `invoiceNumber` (UNIQUE)  
**المفاتيح الخارجية:** 
- `supplierId` → `suppliers(id)`

**العلاقات:**
- **Many-to-One** مع `suppliers` (من خلال `supplierId`)
- **One-to-Many** مع `purchase_invoice_items` (من خلال `invoiceId`)

**الحقول:**
- `id` - معرف الفاتورة
- `invoiceNumber` - رقم الفاتورة (فريد)
- `supplierId` - معرف المورد (FK → `suppliers.id`)
- `date` - تاريخ الفاتورة
- `subtotal` - المجموع الفرعي
- `taxRate` - نسبة الضريبة
- `taxAmount` - مبلغ الضريبة
- `shipping` - الشحن
- `discount` - الخصم
- `total` - الإجمالي
- `paid` - المدفوع
- `remaining` - المتبقي
- `paymentMethod` - طريقة الدفع
- `notes` - ملاحظات
- `createdAt`, `updatedAt` - تواريخ الإنشاء والتحديث

---

### 8. **purchase_invoice_items** - عناصر فواتير المشتريات
**المفتاح الأساسي:** `id` (TEXT)  
**المفاتيح الفريدة:** لا يوجد  
**المفاتيح الخارجية:** 
- `invoiceId` → `purchase_invoices(id)` ON DELETE CASCADE
- `productId` → `products(id)`

**العلاقات:**
- **Many-to-One** مع `purchase_invoices` (من خلال `invoiceId`) - عند حذف الفاتورة، تُحذف العناصر تلقائياً
- **Many-to-One** مع `products` (من خلال `productId`)

**الحقول:**
- `id` - معرف العنصر
- `invoiceId` - معرف الفاتورة (FK → `purchase_invoices.id`)
- `productId` - معرف المنتج (FK → `products.id`)
- `productName` - اسم المنتج (نسخة احتياطية)
- `unit` - الوحدة (smallest/largest)
- `quantity` - الكمية
- `price` - السعر
- `total` - الإجمالي

---

### 9. **receipts** - سندات القبض
**المفتاح الأساسي:** `id` (TEXT)  
**المفاتيح الفريدة:** `receiptNumber` (UNIQUE)  
**المفاتيح الخارجية:** 
- `customerId` → `customers(id)`

**العلاقات:**
- **Many-to-One** مع `customers` (من خلال `customerId`)

**الحقول:**
- `id` - معرف السند
- `receiptNumber` - رقم السند (فريد)
- `customerId` - معرف العميل (FK → `customers.id`)
- `date` - التاريخ
- `amount` - المبلغ
- `paymentMethod` - طريقة الدفع
- `notes` - ملاحظات
- `createdAt`, `updatedAt` - تواريخ الإنشاء والتحديث

---

### 10. **payments** - سندات الصرف
**المفتاح الأساسي:** `id` (TEXT)  
**المفاتيح الفريدة:** `paymentNumber` (UNIQUE)  
**المفاتيح الخارجية:** 
- `supplierId` → `suppliers(id)` (اختياري - NULL)

**العلاقات:**
- **Many-to-One** مع `suppliers` (من خلال `supplierId` - اختياري)

**الحقول:**
- `id` - معرف السند
- `paymentNumber` - رقم السند (فريد)
- `supplierId` - معرف المورد (FK → `suppliers.id` - NULL إذا كان نوع السند غير "supplier")
- `type` - نوع السند (supplier/person/operational)
- `toName` - اسم المستلم
- `date` - التاريخ
- `amount` - المبلغ
- `paymentMethod` - طريقة الدفع
- `notes` - ملاحظات
- `createdAt`, `updatedAt` - تواريخ الإنشاء والتحديث

---

### 11. **inventory_adjustments** - تعديلات المخزون
**المفتاح الأساسي:** `id` (TEXT)  
**المفاتيح الفريدة:** `adjustmentNumber` (UNIQUE)  
**المفاتيح الخارجية:** 
- `productId` → `products(id)`

**العلاقات:**
- **Many-to-One** مع `products` (من خلال `productId`)

**الحقول:**
- `id` - معرف العملية
- `adjustmentNumber` - رقم العملية (فريد)
- `productId` - معرف المنتج (FK → `products.id`)
- `date` - التاريخ
- `type` - نوع التعديل (increase/decrease/set)
- `quantity` - الكمية
- `reason` - السبب
- `notes` - ملاحظات
- `createdAt` - تاريخ الإنشاء

---

### 12. **users** - المستخدمين
**المفتاح الأساسي:** `id` (TEXT)  
**المفاتيح الفريدة:** `username` (UNIQUE)  
**المفاتيح الخارجية:** لا يوجد

**العلاقات:**
- **لا توجد علاقات** (جدول مستقل)

**الحقول:**
- `id` - معرف المستخدم
- `username` - اسم المستخدم (فريد)
- `password` - كلمة المرور
- `email` - البريد الإلكتروني
- `type` - نوع المستخدم (admin/manager/accountant/sales/warehouse)
- `status` - الحالة (active/inactive)
- `permissions` - الصلاحيات (JSON string)
- `createdAt`, `updatedAt` - تواريخ الإنشاء والتحديث
- `lastLogin` - آخر تسجيل دخول

---

### 13. **fixed_assets** - الأصول الثابتة
**المفتاح الأساسي:** `id` (TEXT)  
**المفاتيح الفريدة:** `code` (UNIQUE)  
**المفاتيح الخارجية:** 
- `supplierId` → `suppliers(id)` (اختياري - NULL)

**العلاقات:**
- **Many-to-One** مع `suppliers` (من خلال `supplierId` - اختياري)

**الحقول:**
- `id` - معرف الأصل
- `code` - كود الأصل (فريد)
- `name` - اسم الأصل
- `category` - الصنف
- `purchaseDate` - تاريخ الشراء
- `purchasePrice` - سعر الشراء
- `currentValue` - القيمة الحالية
- `depreciationRate` - معدل الاستهلاك
- `location` - الموقع
- `department` - القسم
- `status` - الحالة (active/maintenance/disposed)
- `description` - الوصف
- `supplierId` - معرف المورد (FK → `suppliers.id` - اختياري)
- `warrantyExpiryDate` - تاريخ انتهاء الضمان
- `notes` - ملاحظات
- `createdAt`, `updatedAt` - تواريخ الإنشاء والتحديث

---

### 14. **settings** - الإعدادات العامة
**المفتاح الأساسي:** `key` (TEXT)  
**المفاتيح الفريدة:** لا يوجد  
**المفاتيح الخارجية:** لا يوجد

**العلاقات:**
- **لا توجد علاقات** (جدول مستقل)

**الحقول:**
- `key` - المفتاح (PK)
- `value` - القيمة
- `updatedAt` - تاريخ التحديث

---

### 15. **company_settings** - إعدادات الشركة
**المفتاح الأساسي:** `id` (TEXT)  
**المفاتيح الفريدة:** لا يوجد  
**المفاتيح الخارجية:** لا يوجد

**العلاقات:**
- **لا توجد علاقات** (جدول مستقل)

**الحقول:**
- `id` - المعرف
- `name` - اسم الشركة
- `address` - العنوان
- `phone` - الهاتف
- `mobile` - الموبايل
- `email` - البريد الإلكتروني
- `commercialRegister` - السجل التجاري
- `taxNumber` - الرقم الضريبي
- `foundationDate` - تاريخ التأسيس
- `createdAt`, `updatedAt` - تواريخ الإنشاء والتحديث

---

### 16. **backup_history** - تاريخ النسخ الاحتياطي
**المفتاح الأساسي:** `id` (TEXT)  
**المفاتيح الفريدة:** لا يوجد  
**المفاتيح الخارجية:** لا يوجد

**العلاقات:**
- **لا توجد علاقات** (جدول مستقل)

**الحقول:**
- `id` - معرف النسخة
- `backupPath` - مسار النسخة
- `backupType` - نوع النسخة (manual/automatic)
- `fileSize` - حجم الملف
- `createdAt` - تاريخ الإنشاء

---

## مخطط العلاقات الكامل

```
┌─────────────────┐
│   categories    │
│  (id, name)     │
└─────────────────┘
         │
         │ (نصي - category)
         ▼
┌─────────────────┐
│    products     │◄───┐
│  (id, code,     │    │
│   category)     │    │
└─────────────────┘    │
         │             │
         │             │
    ┌────┴────┐        │
    │         │        │
    ▼         ▼        │
┌─────────┐ ┌──────────────┐ │
│sales_   │ │purchase_     │ │
│invoice_ │ │invoice_      │ │
│items    │ │items         │ │
└─────────┘ └──────────────┘ │
    │              │           │
    │              │           │
    ▼              ▼           │
┌──────────────┐ ┌──────────────┐
│sales_        │ │purchase_    │
│invoices      │ │invoices      │
│(customerId)  │ │(supplierId)  │
└──────────────┘ └──────────────┘
    │              │
    │              │
    ▼              ▼
┌──────────────┐ ┌──────────────┐
│  customers   │ │  suppliers   │
│  (id, code)  │ │  (id, code)  │
└──────────────┘ └──────────────┘
    │              │
    │              │
    ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  receipts    │ │  payments    │ │ fixed_assets │
│(customerId)  │ │(supplierId)  │ │(supplierId)  │
└──────────────┘ └──────────────┘ └──────────────┘

┌─────────────────┐
│inventory_       │
│adjustments      │
│(productId)       │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│    products     │
└─────────────────┘

┌─────────────────┐
│     users       │ (مستقل - لا علاقات)
└─────────────────┘

┌─────────────────┐
│    settings     │ (مستقل - لا علاقات)
└─────────────────┘

┌─────────────────┐
│company_settings │ (مستقل - لا علاقات)
└─────────────────┘

┌─────────────────┐
│ backup_history  │ (مستقل - لا علاقات)
└─────────────────┘
```

---

## ملخص العلاقات

### علاقات One-to-Many (1:N)

1. **customers → sales_invoices**
   - عميل واحد → عدة فواتير مبيعات
   - العلاقة: `customers.id` = `sales_invoices.customerId`

2. **customers → receipts**
   - عميل واحد → عدة سندات قبض
   - العلاقة: `customers.id` = `receipts.customerId`

3. **suppliers → purchase_invoices**
   - مورد واحد → عدة فواتير مشتريات
   - العلاقة: `suppliers.id` = `purchase_invoices.supplierId`

4. **suppliers → payments**
   - مورد واحد → عدة سندات صرف (اختياري)
   - العلاقة: `suppliers.id` = `payments.supplierId` (NULL مسموح)

5. **suppliers → fixed_assets**
   - مورد واحد → عدة أصول ثابتة (اختياري)
   - العلاقة: `suppliers.id` = `fixed_assets.supplierId` (NULL مسموح)

6. **sales_invoices → sales_invoice_items**
   - فاتورة مبيعات واحدة → عدة عناصر
   - العلاقة: `sales_invoices.id` = `sales_invoice_items.invoiceId`
   - **ON DELETE CASCADE:** عند حذف الفاتورة، تُحذف العناصر تلقائياً

7. **purchase_invoices → purchase_invoice_items**
   - فاتورة مشتريات واحدة → عدة عناصر
   - العلاقة: `purchase_invoices.id` = `purchase_invoice_items.invoiceId`
   - **ON DELETE CASCADE:** عند حذف الفاتورة، تُحذف العناصر تلقائياً

8. **products → sales_invoice_items**
   - منتج واحد → عدة عناصر في فواتير مبيعات مختلفة
   - العلاقة: `products.id` = `sales_invoice_items.productId`

9. **products → purchase_invoice_items**
   - منتج واحد → عدة عناصر في فواتير مشتريات مختلفة
   - العلاقة: `products.id` = `purchase_invoice_items.productId`

10. **products → inventory_adjustments**
    - منتج واحد → عدة عمليات تعديل مخزون
    - العلاقة: `products.id` = `inventory_adjustments.productId`

11. **categories → products** (علاقة نصية)
    - صنف واحد → عدة منتجات
    - العلاقة: `categories.name` = `products.category` (غير محمية بـ FK)

### علاقات Many-to-One (N:1)

جميع العلاقات المذكورة أعلاه هي في الواقع Many-to-One من الجانب الآخر:
- `sales_invoice_items` → `sales_invoices` (N:1)
- `sales_invoice_items` → `products` (N:1)
- `purchase_invoice_items` → `purchase_invoices` (N:1)
- `purchase_invoice_items` → `products` (N:1)
- `sales_invoices` → `customers` (N:1)
- `receipts` → `customers` (N:1)
- `purchase_invoices` → `suppliers` (N:1)
- `payments` → `suppliers` (N:1 - اختياري)
- `fixed_assets` → `suppliers` (N:1 - اختياري)
- `inventory_adjustments` → `products` (N:1)

### جداول مستقلة (لا علاقات)

1. **users** - المستخدمين
2. **settings** - الإعدادات العامة
3. **company_settings** - إعدادات الشركة
4. **backup_history** - تاريخ النسخ الاحتياطي

---

## المفاتيح الخارجية (Foreign Keys)

### مفاتيح محمية بـ ON DELETE CASCADE

1. **sales_invoice_items.invoiceId**
   - عند حذف فاتورة مبيعات، تُحذف جميع عناصرها تلقائياً

2. **purchase_invoice_items.invoiceId**
   - عند حذف فاتورة مشتريات، تُحذف جميع عناصرها تلقائياً

### مفاتيح عادية (لا CASCADE)

جميع المفاتيح الخارجية الأخرى لا تحتوي على ON DELETE CASCADE، مما يعني:
- لا يمكن حذف عميل إذا كان لديه فواتير
- لا يمكن حذف منتج إذا كان مستخدماً في فواتير
- لا يمكن حذف مورد إذا كان لديه فواتير

---

## الفهارس (Indexes)

تم إنشاء الفهارس التالية لتحسين الأداء:

1. `idx_products_category` - على `products(category)`
2. `idx_products_status` - على `products(status)`
3. `idx_sales_invoices_customer` - على `sales_invoices(customerId)`
4. `idx_sales_invoices_date` - على `sales_invoices(date)`
5. `idx_purchase_invoices_supplier` - على `purchase_invoices(supplierId)`
6. `idx_receipts_customer` - على `receipts(customerId)`
7. `idx_payments_supplier` - على `payments(supplierId)`
8. `idx_fixed_assets_category` - على `fixed_assets(category)`
9. `idx_fixed_assets_status` - على `fixed_assets(status)`

---

## ملاحظات مهمة

1. **العلاقة بين categories و products:**
   - العلاقة نصية (من خلال `category` في products و `name` في categories)
   - **غير محمية بـ Foreign Key** في قاعدة البيانات
   - يتم الحفاظ على التكامل في الكود البرمجي

2. **حقول NULL المسموحة:**
   - `payments.supplierId` - NULL إذا كان النوع "person" أو "operational"
   - `fixed_assets.supplierId` - NULL إذا لم يكن المورد محدد

3. **ON DELETE CASCADE:**
   - فقط على `sales_invoice_items` و `purchase_invoice_items`
   - هذا يضمن حذف العناصر تلقائياً عند حذف الفاتورة

4. **الصلاحيات:**
   - Foreign Keys مفعلة في قاعدة البيانات (`PRAGMA foreign_keys = ON`)
   - هذا يضمن التكامل المرجعي

---

## سير العمل الرئيسي

### عملية البيع:
1. إنشاء `sales_invoice` → ربط بـ `customer`
2. إضافة `sales_invoice_items` → ربط بـ `product` و `sales_invoice`
3. تحديث `products.stock` (تقليل المخزون)
4. تحديث `customers.balance` (زيادة الدين)

### عملية الشراء:
1. إنشاء `purchase_invoice` → ربط بـ `supplier`
2. إضافة `purchase_invoice_items` → ربط بـ `product` و `purchase_invoice`
3. تحديث `products.stock` (زيادة المخزون)
4. تحديث `suppliers.balance` (زيادة الدين)

### تعديل المخزون:
1. إنشاء `inventory_adjustments` → ربط بـ `product`
2. تحديث `products.stock` حسب نوع التعديل

