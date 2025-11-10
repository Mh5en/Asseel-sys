const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const passwordUtils = require('./password-utils');

class DatabaseManager {
    constructor() {
        try {
            const userDataPath = app.getPath('userData');
            const dbPath = path.join(userDataPath, 'asel-database.db');
            
            // Store dbPath for use in backup functions
            this.dbPath = dbPath;
            
            // Ensure directory exists
            if (!fs.existsSync(userDataPath)) {
                fs.mkdirSync(userDataPath, { recursive: true });
            }

            // Initialize database with WAL mode for better performance
            this.db = new Database(dbPath);
            this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging
            this.db.pragma('foreign_keys = ON'); // Enable foreign keys
            
            this.initializeDatabase();
        } catch (error) {
            console.error('Error initializing database:', error);
            // Try to get userData path with error handling
            try {
                const userDataPath = app.getPath('userData');
                console.error('UserData path:', userDataPath);
            } catch (pathError) {
                console.error('Error getting userData path:', pathError);
            }
            throw error; // Re-throw to let caller handle
        }
    }

    async ensureInitialized() {
        // Synchronous database is already initialized in constructor
        return Promise.resolve();
    }

    initializeDatabase() {
        try {
            // Products Table
            this.db.exec(`
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                smallestUnit TEXT NOT NULL,
                largestUnit TEXT NOT NULL,
                conversionFactor REAL NOT NULL DEFAULT 1,
                smallestPrice REAL NOT NULL DEFAULT 0,
                largestPrice REAL NOT NULL DEFAULT 0,
                stock REAL NOT NULL DEFAULT 0,
                openingStock REAL NOT NULL DEFAULT 0,
                notes TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                lastSaleDate TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            )
        `);

        // Categories Table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                createdAt TEXT NOT NULL
            )
        `);

        // Customers Table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS customers (
                id TEXT PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                phone TEXT,
                address TEXT,
                firstTransactionDate TEXT,
                openingBalance REAL NOT NULL DEFAULT 0,
                balance REAL NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'active',
                lastTransactionDate TEXT,
                notes TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            )
        `);

        // Suppliers Table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS suppliers (
                id TEXT PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                phone TEXT,
                address TEXT,
                firstTransactionDate TEXT,
                openingBalance REAL NOT NULL DEFAULT 0,
                balance REAL NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'active',
                lastTransactionDate TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            )
        `);

        // Sales Invoices Table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS sales_invoices (
                id TEXT PRIMARY KEY,
                invoiceNumber TEXT UNIQUE NOT NULL,
                customerId TEXT NOT NULL,
                date TEXT NOT NULL,
                dueDate TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                subtotal REAL NOT NULL DEFAULT 0,
                taxRate REAL NOT NULL DEFAULT 0,
                taxAmount REAL NOT NULL DEFAULT 0,
                shipping REAL NOT NULL DEFAULT 0,
                discount REAL NOT NULL DEFAULT 0,
                total REAL NOT NULL DEFAULT 0,
                paid REAL NOT NULL DEFAULT 0,
                remaining REAL NOT NULL DEFAULT 0,
                paymentMethod TEXT,
                notes TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (customerId) REFERENCES customers(id)
            )
        `);

        // Sales Invoice Items Table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS sales_invoice_items (
                id TEXT PRIMARY KEY,
                invoiceId TEXT NOT NULL,
                productId TEXT NOT NULL,
                productName TEXT NOT NULL,
                unit TEXT NOT NULL,
                quantity REAL NOT NULL,
                price REAL NOT NULL,
                total REAL NOT NULL,
                FOREIGN KEY (invoiceId) REFERENCES sales_invoices(id) ON DELETE CASCADE,
                FOREIGN KEY (productId) REFERENCES products(id)
            )
        `);

        // Delivery Notes Table (أذون الصرف)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS delivery_notes (
                id TEXT PRIMARY KEY,
                deliveryNoteNumber TEXT UNIQUE NOT NULL,
                date TEXT NOT NULL,
                salesRepId TEXT,
                salesRepName TEXT,
                warehouseKeeperName TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'issued',
                totalProducts INTEGER NOT NULL DEFAULT 0,
                notes TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            )
        `);

        // Delivery Note Items Table (عناصر إذن الصرف)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS delivery_note_items (
                id TEXT PRIMARY KEY,
                deliveryNoteId TEXT NOT NULL,
                productId TEXT NOT NULL,
                productName TEXT NOT NULL,
                productCode TEXT,
                quantity REAL NOT NULL,
                unit TEXT NOT NULL,
                unitName TEXT,
                reservedQuantity REAL NOT NULL DEFAULT 0,
                availableQuantity REAL NOT NULL,
                FOREIGN KEY (deliveryNoteId) REFERENCES delivery_notes(id) ON DELETE CASCADE,
                FOREIGN KEY (productId) REFERENCES products(id)
            )
        `);

        // Delivery Settlements Table (التسويات)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS delivery_settlements (
                id TEXT PRIMARY KEY,
                settlementNumber TEXT UNIQUE NOT NULL,
                deliveryNoteId TEXT NOT NULL,
                date TEXT NOT NULL,
                salesRepId TEXT,
                salesRepName TEXT,
                warehouseKeeperId TEXT,
                warehouseKeeperName TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                notes TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (deliveryNoteId) REFERENCES delivery_notes(id)
            )
        `);

        // Settlement Items Table (عناصر التسوية)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS settlement_items (
                id TEXT PRIMARY KEY,
                settlementId TEXT NOT NULL,
                productId TEXT NOT NULL,
                productName TEXT NOT NULL,
                productCode TEXT,
                issuedQuantity REAL NOT NULL,
                soldQuantity REAL NOT NULL,
                returnedQuantity REAL NOT NULL DEFAULT 0,
                rejectedQuantity REAL NOT NULL DEFAULT 0,
                difference REAL NOT NULL DEFAULT 0,
                unit TEXT NOT NULL,
                notes TEXT,
                FOREIGN KEY (settlementId) REFERENCES delivery_settlements(id) ON DELETE CASCADE,
                FOREIGN KEY (productId) REFERENCES products(id)
            )
        `);

        // Purchase Invoices Table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS purchase_invoices (
                id TEXT PRIMARY KEY,
                invoiceNumber TEXT UNIQUE NOT NULL,
                supplierId TEXT NOT NULL,
                date TEXT NOT NULL,
                dueDate TEXT,
                subtotal REAL NOT NULL DEFAULT 0,
                taxRate REAL NOT NULL DEFAULT 0,
                taxAmount REAL NOT NULL DEFAULT 0,
                shipping REAL NOT NULL DEFAULT 0,
                discount REAL NOT NULL DEFAULT 0,
                total REAL NOT NULL DEFAULT 0,
                paid REAL NOT NULL DEFAULT 0,
                remaining REAL NOT NULL DEFAULT 0,
                paymentMethod TEXT,
                notes TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (supplierId) REFERENCES suppliers(id)
            )
        `);

        // Purchase Invoice Items Table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS purchase_invoice_items (
                id TEXT PRIMARY KEY,
                invoiceId TEXT NOT NULL,
                productId TEXT NOT NULL,
                productName TEXT NOT NULL,
                unit TEXT NOT NULL,
                quantity REAL NOT NULL,
                price REAL NOT NULL,
                total REAL NOT NULL,
                FOREIGN KEY (invoiceId) REFERENCES purchase_invoices(id) ON DELETE CASCADE,
                FOREIGN KEY (productId) REFERENCES products(id)
            )
        `);

        // Receipts Table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS receipts (
                id TEXT PRIMARY KEY,
                receiptNumber TEXT UNIQUE NOT NULL,
                customerId TEXT NOT NULL,
                date TEXT NOT NULL,
                amount REAL NOT NULL,
                paymentMethod TEXT NOT NULL,
                notes TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (customerId) REFERENCES customers(id)
            )
        `);

        // Payments Table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS payments (
                id TEXT PRIMARY KEY,
                paymentNumber TEXT UNIQUE NOT NULL,
                supplierId TEXT,
                type TEXT NOT NULL,
                toName TEXT,
                date TEXT NOT NULL,
                amount REAL NOT NULL,
                paymentMethod TEXT NOT NULL,
                notes TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (supplierId) REFERENCES suppliers(id)
            )
        `);

        // Inventory Adjustments Table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS inventory_adjustments (
                id TEXT PRIMARY KEY,
                adjustmentNumber TEXT UNIQUE NOT NULL,
                productId TEXT NOT NULL,
                date TEXT NOT NULL,
                type TEXT NOT NULL,
                quantity REAL NOT NULL,
                reason TEXT,
                notes TEXT,
                createdAt TEXT NOT NULL,
                FOREIGN KEY (productId) REFERENCES products(id)
            )
        `);

        // Returns Table (for returns from customers or to suppliers)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS returns (
                id TEXT PRIMARY KEY,
                returnNumber TEXT UNIQUE NOT NULL,
                productId TEXT NOT NULL,
                date TEXT NOT NULL,
                operationType TEXT NOT NULL,
                returnType TEXT NOT NULL,
                entityId TEXT,
                entityType TEXT,
                invoiceId TEXT,
                invoiceType TEXT,
                invoiceNumber TEXT,
                quantity REAL NOT NULL,
                unitPrice REAL NOT NULL,
                totalAmount REAL NOT NULL,
                returnReason TEXT NOT NULL,
                isDamaged TEXT NOT NULL DEFAULT 'false',
                restoredToStock TEXT NOT NULL DEFAULT 'false',
                restoreBalance TEXT NOT NULL DEFAULT 'false',
                notes TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                userId TEXT,
                FOREIGN KEY (productId) REFERENCES products(id),
                FOREIGN KEY (invoiceId) REFERENCES sales_invoices(id),
                FOREIGN KEY (invoiceId) REFERENCES purchase_invoices(id)
                -- Note: entityId foreign key removed because it can reference either customers or suppliers
                -- We rely on application-level validation instead
            )
        `);

        // Users Table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT,
                type TEXT NOT NULL DEFAULT 'sales',
                status TEXT NOT NULL DEFAULT 'active',
                permissions TEXT NOT NULL DEFAULT '[]',
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                lastLogin TEXT
            )
        `);
        
        // Migrations: Add missing columns to existing tables
        // SQLite doesn't support NOT NULL DEFAULT in ALTER TABLE, so we add nullable columns first
        
        // Users table migrations
        const usersMigrations = [
            { column: 'email', sql: `ALTER TABLE users ADD COLUMN email TEXT;` },
            { column: 'type', sql: `ALTER TABLE users ADD COLUMN type TEXT;` },
            { column: 'status', sql: `ALTER TABLE users ADD COLUMN status TEXT;` },
            { column: 'permissions', sql: `ALTER TABLE users ADD COLUMN permissions TEXT;` },
            { column: 'updatedAt', sql: `ALTER TABLE users ADD COLUMN updatedAt TEXT;` },
            { column: 'lastLogin', sql: `ALTER TABLE users ADD COLUMN lastLogin TEXT;` }
        ];

        // Returns table migrations
        const returnsMigrations = [
            { column: 'operationType', sql: `ALTER TABLE returns ADD COLUMN operationType TEXT;` },
            { column: 'returnType', sql: `ALTER TABLE returns ADD COLUMN returnType TEXT;` },
            { column: 'entityId', sql: `ALTER TABLE returns ADD COLUMN entityId TEXT;` },
            { column: 'entityType', sql: `ALTER TABLE returns ADD COLUMN entityType TEXT;` },
            { column: 'unitPrice', sql: `ALTER TABLE returns ADD COLUMN unitPrice REAL;` },
            { column: 'totalAmount', sql: `ALTER TABLE returns ADD COLUMN totalAmount REAL;` },
            { column: 'returnReason', sql: `ALTER TABLE returns ADD COLUMN returnReason TEXT;` },
            { column: 'isDamaged', sql: `ALTER TABLE returns ADD COLUMN isDamaged TEXT DEFAULT 'false';` },
            { column: 'restoredToStock', sql: `ALTER TABLE returns ADD COLUMN restoredToStock TEXT DEFAULT 'false';` },
            { column: 'updatedAt', sql: `ALTER TABLE returns ADD COLUMN updatedAt TEXT;` },
            { column: 'invoiceId', sql: `ALTER TABLE returns ADD COLUMN invoiceId TEXT;` },
            { column: 'invoiceType', sql: `ALTER TABLE returns ADD COLUMN invoiceType TEXT;` },
            { column: 'invoiceNumber', sql: `ALTER TABLE returns ADD COLUMN invoiceNumber TEXT;` },
            { column: 'userId', sql: `ALTER TABLE returns ADD COLUMN userId TEXT;` },
            { column: 'restoreBalance', sql: `ALTER TABLE returns ADD COLUMN restoreBalance TEXT DEFAULT 'false';` }
        ];

        // Inventory adjustments table migrations
        const inventoryAdjustmentsMigrations = [
            { column: 'userId', sql: `ALTER TABLE inventory_adjustments ADD COLUMN userId TEXT;` }
        ];
        
        usersMigrations.forEach(migration => {
            try {
                // Check if column exists by querying table info
                const tableInfo = this.db.prepare(`PRAGMA table_info(users)`).all();
                const columnExists = tableInfo.some(col => col.name === migration.column);
                
                if (!columnExists) {
                    // console.log(`Adding missing column to users: ${migration.column}`);
                    this.db.exec(migration.sql);
                    
                    // Set default values for existing rows
                    if (migration.column === 'type') {
                        this.db.exec(`UPDATE users SET type = 'sales' WHERE type IS NULL;`);
                    } else if (migration.column === 'status') {
                        this.db.exec(`UPDATE users SET status = 'active' WHERE status IS NULL;`);
                    } else if (migration.column === 'permissions') {
                        this.db.exec(`UPDATE users SET permissions = '[]' WHERE permissions IS NULL;`);
                    } else if (migration.column === 'updatedAt') {
                        this.db.exec(`UPDATE users SET updatedAt = datetime('now') WHERE updatedAt IS NULL OR updatedAt = '';`);
                    }
                }
            } catch (e) {
                // Column might already exist or other error
                if (e.message && (e.message.includes('duplicate column') || e.message.includes('already exists'))) {
                    // Column already exists, ignore
                } else {
                    console.warn(`Could not add ${migration.column} column to users table:`, e.message);
                }
            }
        });

        // Returns table migrations
        try {
            const returnsTableInfo = this.db.prepare(`PRAGMA table_info(returns)`).all();
            if (returnsTableInfo.length > 0) {
                // Check if old foreign key constraints exist (by checking foreign_keys)
                const foreignKeys = this.db.prepare(`PRAGMA foreign_key_list(returns)`).all();
                const hasEntityIdFK = foreignKeys.some(fk => fk.from === 'entityId');
                
                // If old foreign key constraints exist on entityId, recreate table without them
                if (hasEntityIdFK) {
                    console.log('Recreating returns table to remove entityId foreign key constraints...');
                    try {
                        // Create temporary table with correct structure (no entityId FK)
                        this.db.exec(`
                            CREATE TABLE IF NOT EXISTS returns_new (
                                id TEXT PRIMARY KEY,
                                returnNumber TEXT UNIQUE NOT NULL,
                                productId TEXT NOT NULL,
                                date TEXT NOT NULL,
                                operationType TEXT NOT NULL,
                                returnType TEXT NOT NULL,
                                entityId TEXT,
                                entityType TEXT,
                                invoiceId TEXT,
                                invoiceType TEXT,
                                invoiceNumber TEXT,
                                quantity REAL NOT NULL,
                                unitPrice REAL NOT NULL,
                                totalAmount REAL NOT NULL,
                                returnReason TEXT NOT NULL,
                                isDamaged TEXT NOT NULL DEFAULT 'false',
                                restoredToStock TEXT NOT NULL DEFAULT 'false',
                                notes TEXT,
                                createdAt TEXT NOT NULL,
                                updatedAt TEXT NOT NULL,
                                userId TEXT,
                                FOREIGN KEY (productId) REFERENCES products(id),
                                FOREIGN KEY (invoiceId) REFERENCES sales_invoices(id),
                                FOREIGN KEY (invoiceId) REFERENCES purchase_invoices(id)
                            )
                        `);
                        
                        // Copy data from old table to new table
                        this.db.exec(`INSERT INTO returns_new SELECT * FROM returns;`);
                        
                        // Drop old table
                        this.db.exec(`DROP TABLE returns;`);
                        
                        // Rename new table
                        this.db.exec(`ALTER TABLE returns_new RENAME TO returns;`);
                        
                        console.log('[INFO] Returns table recreated successfully without entityId foreign keys');
                    } catch (error) {
                        console.error('Error recreating returns table:', error);
                        // If recreation fails, try to continue with column migrations
                    }
                }
                
                // Add missing columns
                returnsMigrations.forEach(migration => {
                    try {
                        const columnExists = returnsTableInfo.some(col => col.name === migration.column);
                        if (!columnExists) {
                            // console.log(`Adding missing column to returns: ${migration.column}`);
                            this.db.exec(migration.sql);
                        }
                    } catch (error) {
                        console.error(`Error adding column ${migration.column} to returns:`, error);
                    }
                });
            }
        } catch (error) {
            console.error('Error checking returns table:', error);
        }

        // Inventory adjustments table migrations
        try {
            const inventoryAdjustmentsTableInfo = this.db.prepare(`PRAGMA table_info(inventory_adjustments)`).all();
            if (inventoryAdjustmentsTableInfo.length > 0) {
                inventoryAdjustmentsMigrations.forEach(migration => {
                    try {
                        const columnExists = inventoryAdjustmentsTableInfo.some(col => col.name === migration.column);
                        if (!columnExists) {
                            // console.log(`Adding missing column to inventory_adjustments: ${migration.column}`);
                            this.db.exec(migration.sql);
                        }
                    } catch (error) {
                        console.error(`Error adding column ${migration.column} to inventory_adjustments:`, error);
                    }
                });
            }
        } catch (error) {
            console.error('Error checking inventory_adjustments table:', error);
        }
        
        // Customers table migrations
        const customersMigrations = [
            { column: 'notes', sql: `ALTER TABLE customers ADD COLUMN notes TEXT;` }
        ];
        
        customersMigrations.forEach(migration => {
            try {
                // Check if column exists by querying table info
                const tableInfo = this.db.prepare(`PRAGMA table_info(customers)`).all();
                const columnExists = tableInfo.some(col => col.name === migration.column);
                
                if (!columnExists) {
                    // console.log(`Adding missing column to customers: ${migration.column}`);
                    this.db.exec(migration.sql);
                }
            } catch (e) {
                // Column might already exist or other error
                if (e.message && (e.message.includes('duplicate column') || e.message.includes('already exists'))) {
                    // Column already exists, ignore
                } else {
                    console.warn(`Could not add ${migration.column} column to customers table:`, e.message);
                }
            }
        });
        
        // Purchase invoices table migrations
        const purchaseInvoicesMigrations = [
            { column: 'dueDate', sql: `ALTER TABLE purchase_invoices ADD COLUMN dueDate TEXT;` }
        ];
        
        purchaseInvoicesMigrations.forEach(migration => {
            try {
                // Check if column exists by querying table info
                const tableInfo = this.db.prepare(`PRAGMA table_info(purchase_invoices)`).all();
                const columnExists = tableInfo.some(col => col.name === migration.column);
                
                if (!columnExists) {
                    // console.log(`Adding missing column to purchase_invoices: ${migration.column}`);
                    this.db.exec(migration.sql);
                }
            } catch (e) {
                // Column might already exist or other error
                if (e.message && (e.message.includes('duplicate column') || e.message.includes('already exists'))) {
                    // Column already exists, ignore
                } else {
                    console.warn(`Could not add ${migration.column} column to purchase_invoices table:`, e.message);
                }
            }
        });

        // Sales invoices table migrations - Add deliveryNoteId and deliveryNoteNumber
        try {
            const salesInvoicesTableInfo = this.db.prepare(`PRAGMA table_info(sales_invoices)`).all();
            const columnNames = salesInvoicesTableInfo.map(col => col.name);
            
            if (!columnNames.includes('deliveryNoteId')) {
                // console.log('Adding deliveryNoteId column to sales_invoices');
                this.db.exec(`ALTER TABLE sales_invoices ADD COLUMN deliveryNoteId TEXT;`);
            }
            
            if (!columnNames.includes('deliveryNoteNumber')) {
                // console.log('Adding deliveryNoteNumber column to sales_invoices');
                this.db.exec(`ALTER TABLE sales_invoices ADD COLUMN deliveryNoteNumber TEXT;`);
            }
        } catch (e) {
            if (e.message && !e.message.includes('duplicate column') && !e.message.includes('already exists')) {
                console.warn('Could not add deliveryNoteId/deliveryNoteNumber columns to sales_invoices:', e.message);
            }
        }

        // Delivery notes table migrations - Add warehouseKeeperName
        try {
            const deliveryNotesTableInfo = this.db.prepare(`PRAGMA table_info(delivery_notes)`).all();
            const columnNames = deliveryNotesTableInfo.map(col => col.name);
            
            if (!columnNames.includes('warehouseKeeperName')) {
                // console.log('Adding warehouseKeeperName column to delivery_notes');
                this.db.exec(`ALTER TABLE delivery_notes ADD COLUMN warehouseKeeperName TEXT;`);
                // Migrate existing data: if salesRepName exists, copy it to warehouseKeeperName
                this.db.exec(`UPDATE delivery_notes SET warehouseKeeperName = salesRepName WHERE warehouseKeeperName IS NULL AND salesRepName IS NOT NULL;`);
            }
        } catch (e) {
            if (e.message && !e.message.includes('duplicate column') && !e.message.includes('already exists')) {
                console.warn('Could not add warehouseKeeperName column to delivery_notes:', e.message);
            }
        }

        // Handle fullName column - either make it nullable or remove it
        try {
            const tableInfo = this.db.prepare(`PRAGMA table_info(users)`).all();
            const fullNameColumn = tableInfo.find(col => col.name === 'fullName');
            
            if (fullNameColumn) {
                // fullName exists - update existing rows to have fullName = username if fullName is NULL
                const usersWithNullFullName = this.db.prepare(`SELECT id, username FROM users WHERE fullName IS NULL OR fullName = ''`).all();
                if (usersWithNullFullName.length > 0) {
                    console.log(`Updating ${usersWithNullFullName.length} users with NULL fullName`);
                    const updateStmt = this.db.prepare(`UPDATE users SET fullName = ? WHERE id = ?`);
                    usersWithNullFullName.forEach(user => {
                        updateStmt.run(user.username || 'User', user.id);
                    });
                }
                
                // Note: SQLite doesn't support ALTER COLUMN, so we can't change NOT NULL constraint
                // We'll just ensure all rows have a fullName value
            }
        } catch (e) {
            console.warn('Could not handle fullName column:', e.message);
        }


        // Backup History Table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS backup_history (
                id TEXT PRIMARY KEY,
                backupPath TEXT NOT NULL,
                backupType TEXT NOT NULL,
                fileSize INTEGER NOT NULL,
                createdAt TEXT NOT NULL
            )
        `);

        // Fixed Assets Table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS fixed_assets (
                id TEXT PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                purchaseDate TEXT NOT NULL,
                purchasePrice REAL NOT NULL DEFAULT 0,
                currentValue REAL NOT NULL DEFAULT 0,
                depreciationRate REAL NOT NULL DEFAULT 0,
                location TEXT,
                department TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                description TEXT,
                supplierId TEXT,
                warrantyExpiryDate TEXT,
                notes TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (supplierId) REFERENCES suppliers(id)
            )
        `);

        // Operating Expenses Table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS operating_expenses (
                id TEXT PRIMARY KEY,
                expenseNumber TEXT,
                date TEXT NOT NULL,
                category TEXT NOT NULL,
                amount REAL NOT NULL DEFAULT 0,
                recipientName TEXT,
                description TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            )
        `);
        
        // Add expenseNumber column if it doesn't exist (for existing databases)
        try {
            this.db.exec(`ALTER TABLE operating_expenses ADD COLUMN expenseNumber TEXT`);
        } catch (e) {
            // Column already exists, ignore
        }
        
        // Add recipientName column if it doesn't exist (for existing databases)
        try {
            this.db.exec(`ALTER TABLE operating_expenses ADD COLUMN recipientName TEXT`);
        } catch (e) {
            // Column already exists, ignore
        }

        // Company Info Table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS company_info (
                id TEXT PRIMARY KEY DEFAULT 'company_001',
                name TEXT NOT NULL DEFAULT 'شركة أسيل',
                address TEXT,
                taxId TEXT,
                commercialRegister TEXT,
                phone TEXT,
                mobile TEXT,
                email TEXT,
                taxRate REAL DEFAULT 15,
                commitmentText TEXT,
                warehouseKeeperName TEXT,
                warehouseKeeperPhone TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            )
        `);
        
        // Add new columns if they don't exist (for existing databases)
        try {
            this.db.exec(`ALTER TABLE company_info ADD COLUMN warehouseKeeperName TEXT`);
        } catch (e) {
            // Column already exists, ignore
        }
        try {
            this.db.exec(`ALTER TABLE company_info ADD COLUMN warehouseKeeperPhone TEXT`);
        } catch (e) {
            // Column already exists, ignore
        }

        // Add marketing contact columns if they don't exist (for existing databases)
        try {
            this.db.exec(`ALTER TABLE company_info ADD COLUMN marketingWhatsApp TEXT`);
        } catch (e) {
            // Column already exists, ignore
        }
        try {
            this.db.exec(`ALTER TABLE company_info ADD COLUMN marketingMobile TEXT`);
        } catch (e) {
            // Column already exists, ignore
        }
        try {
            this.db.exec(`ALTER TABLE company_info ADD COLUMN marketingWorkingHours TEXT`);
        } catch (e) {
            // Column already exists, ignore
        }

        // Initialize default company info if not exists
        try {
            const existingCompany = this.db.prepare('SELECT id FROM company_info WHERE id = ?').get('company_001');
            if (!existingCompany) {
                this.db.prepare(`
                    INSERT INTO company_info (id, name, taxRate, commitmentText, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(
                    'company_001',
                    'شركة أسيل',
                    15,
                    'أقر بأنني قد استلمت البضاعة/الخدمة المبينة أعلاه بحالة جيدة وبمواصفات مطابقة، وأتعهد بالسداد وفق الشروط المذكورة.',
                    new Date().toISOString(),
                    new Date().toISOString()
                );
            }
        } catch (error) {
            console.warn('Could not initialize company info:', error.message);
        }
        
        // Add taxRate column to company_info if it doesn't exist (migration)
        try {
            const tableInfo = this.db.prepare(`PRAGMA table_info(company_info)`).all();
            const columnExists = tableInfo.some(col => col.name === 'taxRate');
            
            if (!columnExists) {
                // console.log('Adding taxRate column to company_info');
                this.db.exec(`ALTER TABLE company_info ADD COLUMN taxRate REAL DEFAULT 15;`);
                // Set default value for existing rows
                this.db.exec(`UPDATE company_info SET taxRate = 15 WHERE taxRate IS NULL;`);
            }
        } catch (e) {
            if (e.message && !e.message.includes('duplicate column') && !e.message.includes('already exists')) {
                console.warn('Could not add taxRate column to company_info:', e.message);
            }
        }

        // Add salesRepName, salesRepPhone, accountantName, accountantPhone columns to company_info if they don't exist (migration)
        try {
            const tableInfo = this.db.prepare(`PRAGMA table_info(company_info)`).all();
            const columnNames = tableInfo.map(col => col.name);
            
            // Add salesRepName column
            if (!columnNames.includes('salesRepName')) {
                // console.log('Adding salesRepName column to company_info');
                this.db.exec(`ALTER TABLE company_info ADD COLUMN salesRepName TEXT DEFAULT '';`);
            }
            
            // Add salesRepPhone column
            if (!columnNames.includes('salesRepPhone')) {
                // console.log('Adding salesRepPhone column to company_info');
                this.db.exec(`ALTER TABLE company_info ADD COLUMN salesRepPhone TEXT DEFAULT '';`);
            }
            
            // Add accountantName column
            if (!columnNames.includes('accountantName')) {
                // console.log('Adding accountantName column to company_info');
                this.db.exec(`ALTER TABLE company_info ADD COLUMN accountantName TEXT DEFAULT '';`);
            }
            
            // Add accountantPhone column
            if (!columnNames.includes('accountantPhone')) {
                // console.log('Adding accountantPhone column to company_info');
                this.db.exec(`ALTER TABLE company_info ADD COLUMN accountantPhone TEXT DEFAULT '';`);
            }
        } catch (e) {
            if (e.message && !e.message.includes('duplicate column') && !e.message.includes('already exists')) {
                console.warn('Could not add sales rep/accountant columns to company_info:', e.message);
            }
        }

        // Initialize default system engineer user (BashMohndes) if not exists
        // This user is always created/updated if it doesn't exist or has wrong type
        try {
            // First check if user exists by username (regardless of type)
            const existingUser = this.db.prepare('SELECT id, type FROM users WHERE username = ?').get('BashMohndes');
            
            // Hash the default password
            const hashedPassword = passwordUtils.hashPasswordSync('BashMohndes');
            
            if (existingUser) {
                // User exists - check if it's already system_engineer
                if (existingUser.type !== 'system_engineer') {
                    // Update existing user to system_engineer type
                    this.db.prepare(`
                        UPDATE users SET type = ?, password = ?, permissions = ?, status = ?, updatedAt = ? WHERE username = ?
                    `).run(
                        'system_engineer',
                        hashedPassword,
                        JSON.stringify(['*']),
                        'active',
                        new Date().toISOString(),
                        'BashMohndes'
                    );
                    // console.log('[INFO] Updated existing BashMohndes user to system_engineer type');
                } else {
                    // User already exists and is system_engineer - ensure password is correct (hash if not already hashed)
                    const currentPassword = this.db.prepare('SELECT password FROM users WHERE username = ? AND type = ?').get('BashMohndes', 'system_engineer');
                    const passwordToUse = (currentPassword && passwordUtils.isHashed(currentPassword.password)) 
                        ? currentPassword.password 
                        : hashedPassword;
                    
                    this.db.prepare(`
                        UPDATE users SET password = ?, permissions = ?, status = ?, updatedAt = ? WHERE username = ? AND type = ?
                    `).run(
                        passwordToUse,
                        JSON.stringify(['*']),
                        'active',
                        new Date().toISOString(),
                        'BashMohndes',
                        'system_engineer'
                    );
                    // User already exists and credentials are ensured - no need to log
                }
            } else {
                // User doesn't exist - create it
                const systemEngineerId = 'system_engineer_' + Date.now().toString();
                this.db.prepare(`
                    INSERT INTO users (id, username, password, email, type, status, permissions, createdAt, updatedAt, lastLogin)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    systemEngineerId,
                    'BashMohndes',
                    hashedPassword,
                    '',
                    'system_engineer',
                    'active',
                    JSON.stringify(['*']), // All permissions
                    new Date().toISOString(),
                    new Date().toISOString(),
                    null
                );
                // console.log('[INFO] Default system engineer user (BashMohndes) created successfully');
            }
        } catch (error) {
            console.error('[ERROR] Error initializing default system engineer user:', error.message);
            console.error('Error details:', error);
        }

        // Create indexes for better performance
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
            CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
            CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer ON sales_invoices(customerId);
            CREATE INDEX IF NOT EXISTS idx_sales_invoices_date ON sales_invoices(date);
            CREATE INDEX IF NOT EXISTS idx_sales_invoices_delivery_note ON sales_invoices(deliveryNoteId);
            CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier ON purchase_invoices(supplierId);
            CREATE INDEX IF NOT EXISTS idx_receipts_customer ON receipts(customerId);
            CREATE INDEX IF NOT EXISTS idx_payments_supplier ON payments(supplierId);
            CREATE INDEX IF NOT EXISTS idx_fixed_assets_category ON fixed_assets(category);
            CREATE INDEX IF NOT EXISTS idx_fixed_assets_status ON fixed_assets(status);
            CREATE INDEX IF NOT EXISTS idx_operating_expenses_date ON operating_expenses(date);
            CREATE INDEX IF NOT EXISTS idx_operating_expenses_category ON operating_expenses(category);
            CREATE INDEX IF NOT EXISTS idx_delivery_notes_status ON delivery_notes(status);
            CREATE INDEX IF NOT EXISTS idx_delivery_notes_date ON delivery_notes(date);
            CREATE INDEX IF NOT EXISTS idx_delivery_note_items_delivery_note ON delivery_note_items(deliveryNoteId);
            CREATE INDEX IF NOT EXISTS idx_delivery_settlements_delivery_note ON delivery_settlements(deliveryNoteId);
            CREATE INDEX IF NOT EXISTS idx_delivery_settlements_status ON delivery_settlements(status);
            CREATE INDEX IF NOT EXISTS idx_settlement_items_settlement ON settlement_items(settlementId);
        `);
        } catch (error) {
            console.error('Error initializing database schema:', error);
            // Don't throw - let the app continue with partial initialization
            // The database might still be usable
        }
    }

    // Generic CRUD Operations
    insert(table, data) {
        try {
            // Hash password if inserting into users table and password is provided
            if (table === 'users' && data.password) {
                // Only hash if it's not already hashed (bcrypt hashes are 60 chars and start with $2)
                if (!passwordUtils.isHashed(data.password)) {
                    data = { ...data, password: passwordUtils.hashPasswordSync(data.password) };
                }
            }
            
            const keys = Object.keys(data);
            const placeholders = keys.map(() => '?').join(', ');
            const values = keys.map(key => {
                // Handle JSON objects/arrays
                if (typeof data[key] === 'object' && data[key] !== null && !(data[key] instanceof Date)) {
                    return JSON.stringify(data[key]);
                }
                return data[key];
            });
            const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
            const stmt = this.db.prepare(sql);
            const result = stmt.run(...values);
            return result;
        } catch (error) {
            console.error(`[Database] Error inserting into ${table}:`, error);
            console.error(`[Database] Data:`, data);
            // Return error in a format that can be checked
            return { success: false, error: error.message };
        }
    }

    update(table, id, data) {
        try {
            // Hash password if updating users table and password is provided
            if (table === 'users' && data.password) {
                // Only hash if it's not already hashed (bcrypt hashes are 60 chars and start with $2)
                if (!passwordUtils.isHashed(data.password)) {
                    data = { ...data, password: passwordUtils.hashPasswordSync(data.password) };
                }
            }
            
            // Tables that don't have updatedAt column
            const tablesWithoutUpdatedAt = ['delivery_note_items', 'settlement_items', 'sales_invoice_items', 'purchase_invoice_items'];
            const hasUpdatedAt = !tablesWithoutUpdatedAt.includes(table);
            
            const keys = Object.keys(data);
            // Filter out updatedAt from data since we set it automatically (if table has it)
            const filteredKeys = keys.filter(key => key !== 'updatedAt');
            const setClause = filteredKeys.map(key => `${key} = ?`).join(', ');
            const filteredValues = filteredKeys.map(key => {
                // Handle JSON objects/arrays
                if (typeof data[key] === 'object' && data[key] !== null && !(data[key] instanceof Date)) {
                    return JSON.stringify(data[key]);
                }
                return data[key];
            });
            const values = [...filteredValues, id];
            
            // Only add updatedAt if table has it
            let sql;
            if (hasUpdatedAt) {
                sql = `UPDATE ${table} SET ${setClause}, updatedAt = datetime('now') WHERE id = ?`;
            } else {
                sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
            }
            
            const stmt = this.db.prepare(sql);
            const result = stmt.run(...values);
            
            // Only log if update failed
            if (result.changes === 0) {
                console.error(`[Database] WARNING: Update returned 0 changes for ${table} id ${id}!`);
            }
            
            return result;
        } catch (error) {
            console.error(`[Database] Error updating ${table} id ${id}:`, error);
            console.error(`[Database] Data:`, data);
            // Return error in a format that can be checked
            return { success: false, error: error.message };
        }
    }

    delete(table, id) {
        const sql = `DELETE FROM ${table} WHERE id = ?`;
        const stmt = this.db.prepare(sql);
        return stmt.run(id);
    }

    getById(table, id) {
        const sql = `SELECT * FROM ${table} WHERE id = ?`;
        const stmt = this.db.prepare(sql);
        return stmt.get(id);
    }

    getAll(table, where = '', params = []) {
        try {
            let sql = `SELECT * FROM ${table}`;
            if (where && where.trim() !== '') {
                sql += ` WHERE ${where}`;
            }
            const stmt = this.db.prepare(sql);
            let result;
            if (params && params.length > 0) {
                result = stmt.all(...params);
            } else {
                result = stmt.all();
            }
            // Ensure result is always an array
            return Array.isArray(result) ? result : (result ? [result] : []);
        } catch (error) {
            console.error(`[Database] Error in getAll for ${table}:`, error);
            return [];
        }
    }

    query(sql, params = []) {
        const stmt = this.db.prepare(sql);
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
            return params.length > 0 ? stmt.all(...params) : stmt.all();
        } else {
            return params.length > 0 ? stmt.run(...params) : stmt.run();
        }
    }


    // Backup Functions
    createBackup(backupPath) {
        try {
            // Ensure backup directory exists
            const backupDir = path.dirname(backupPath);
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            // Checkpoint WAL to ensure all data is in main database file
            this.db.pragma('wal_checkpoint(FULL)');

            // Remove destination file if it exists
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
            }

            // Use VACUUM INTO to create a complete backup (SQLite 3.27+)
            // VACUUM INTO creates a backup with all data
            // Escape single quotes and convert backslashes to forward slashes for SQLite
            const backupPathEscaped = backupPath.replace(/\\/g, '/').replace(/'/g, "''");
            this.db.exec(`VACUUM INTO '${backupPathEscaped}'`);
            
            // Verify backup file exists and has content
            if (!fs.existsSync(backupPath)) {
                throw new Error('Backup file was not created');
            }
            
            const fileSize = fs.statSync(backupPath).size;
            if (fileSize === 0) {
                throw new Error('Backup file is empty');
            }

            // Save backup history
            this.insert('backup_history', {
                id: `backup_${Date.now()}`,
                backupPath: backupPath,
                backupType: 'manual',
                fileSize: fileSize,
                createdAt: new Date().toISOString()
            });

            return { success: true, fileSize };
        } catch (error) {
            console.error('Error creating backup:', error);
            // Fallback: try using copyFileSync
            try {
                if (fs.existsSync(this.dbPath)) {
                    // Checkpoint again
                    this.db.pragma('wal_checkpoint(FULL)');
                    // Copy the database file
                    fs.copyFileSync(this.dbPath, backupPath);
                    const fileSize = fs.statSync(backupPath).size;
                    if (fileSize > 0) {
                        // Save backup history
                        this.insert('backup_history', {
                            id: `backup_${Date.now()}`,
                            backupPath: backupPath,
                            backupType: 'manual',
                            fileSize: fileSize,
                            createdAt: new Date().toISOString()
                        });
                        return { success: true, fileSize };
                    }
                }
            } catch (fallbackError) {
                console.error('Fallback backup also failed:', fallbackError);
            }
            return { success: false, error: error.message };
        }
    }

    restoreBackup(backupPath) {
        try {
            // Check if backup is .db file or JSON
            const isDbFile = backupPath.toLowerCase().endsWith('.db') || 
                           backupPath.toLowerCase().endsWith('.sqlite') ||
                           backupPath.toLowerCase().endsWith('.sqlite3');
            
            if (isDbFile) {
                // Close current database
                this.db.close();
                
                // Backup current database (just in case)
                const currentBackupPath = this.dbPath + '.backup.' + Date.now();
                if (fs.existsSync(this.dbPath)) {
                    fs.copyFileSync(this.dbPath, currentBackupPath);
                }
                
                // Copy backup file to database location
                fs.copyFileSync(backupPath, this.dbPath);
                
                // Reopen database connection
                this.db = new Database(this.dbPath);
                this.db.pragma('journal_mode = WAL');
                this.db.pragma('foreign_keys = ON');
                
                return { success: true };
            } else {
                // Handle JSON backup (for backward compatibility)
                const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
                
                // Begin transaction
                const transaction = this.db.transaction((tables) => {
                    // Clear existing data
                    Object.keys(tables).forEach(table => {
                        this.db.prepare(`DELETE FROM ${table}`).run();
                    });

                    // Restore data
                    Object.keys(tables).forEach(table => {
                        if (tables[table] && tables[table].length > 0) {
                            const keys = Object.keys(tables[table][0]);
                            const placeholders = keys.map(() => '?').join(', ');
                            const insertSql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
                            const insertStmt = this.db.prepare(insertSql);
                            
                            tables[table].forEach(row => {
                                const values = keys.map(key => row[key]);
                                insertStmt.run(...values);
                            });
                        }
                    });
                });

                transaction(backup.tables);
                return { success: true };
            }
        } catch (error) {
            // If database was closed, reopen it
            if (!this.db || !this.db.open) {
                this.db = new Database(this.dbPath);
                this.db.pragma('journal_mode = WAL');
                this.db.pragma('foreign_keys = ON');
            }
            return { success: false, error: error.message };
        }
    }

    getBackupHistory(limit = 10) {
        try {
            const sql = `SELECT * FROM backup_history ORDER BY createdAt DESC LIMIT ?`;
            const stmt = this.db.prepare(sql);
            return stmt.all(limit);
        } catch (error) {
            console.error('Error getting backup history:', error);
            return [];
        }
    }

    getLastBackupDate() {
        try {
            const sql = `SELECT createdAt FROM backup_history ORDER BY createdAt DESC LIMIT 1`;
            const stmt = this.db.prepare(sql);
            const result = stmt.get();
            return result ? new Date(result.createdAt) : null;
        } catch (error) {
            console.error('Error getting last backup date:', error);
            return null;
        }
    }

    createAutoBackup(backupPath) {
        try {
            // Ensure backup directory exists
            const backupDir = path.dirname(backupPath);
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            // Checkpoint WAL to ensure all data is in main database file
            this.db.pragma('wal_checkpoint(FULL)');

            // Remove destination file if it exists
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
            }

            // Use VACUUM INTO to create a complete backup (SQLite 3.27+)
            // VACUUM INTO creates a backup with all data
            // Escape single quotes and convert backslashes to forward slashes for SQLite
            const backupPathEscaped = backupPath.replace(/\\/g, '/').replace(/'/g, "''");
            this.db.exec(`VACUUM INTO '${backupPathEscaped}'`);
            
            // Verify backup file exists and has content
            if (!fs.existsSync(backupPath)) {
                throw new Error('Backup file was not created');
            }
            
            const fileSize = fs.statSync(backupPath).size;
            if (fileSize === 0) {
                throw new Error('Backup file is empty');
            }

            // Save backup history with auto type
            this.insert('backup_history', {
                id: `backup_${Date.now()}`,
                backupPath: backupPath,
                backupType: 'auto',
                fileSize: fileSize,
                createdAt: new Date().toISOString()
            });

            return { success: true, fileSize };
        } catch (error) {
            console.error('Error creating auto backup:', error);
            // Fallback: try using copyFileSync
            try {
                if (fs.existsSync(this.dbPath)) {
                    // Checkpoint again
                    this.db.pragma('wal_checkpoint(FULL)');
                    // Copy the database file
                    fs.copyFileSync(this.dbPath, backupPath);
                    const fileSize = fs.statSync(backupPath).size;
                    if (fileSize > 0) {
                        // Save backup history with auto type
                        this.insert('backup_history', {
                            id: `backup_${Date.now()}`,
                            backupPath: backupPath,
                            backupType: 'auto',
                            fileSize: fileSize,
                            createdAt: new Date().toISOString()
                        });
                        return { success: true, fileSize };
                    }
                }
            } catch (fallbackError) {
                console.error('Fallback auto backup also failed:', fallbackError);
            }
            return { success: false, error: error.message };
        }
    }

    deleteOldBackups(daysToKeep) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            const cutoffDateStr = cutoffDate.toISOString();

            // Get old backups
            const sql = `SELECT * FROM backup_history WHERE createdAt < ?`;
            const stmt = this.db.prepare(sql);
            const oldBackups = stmt.all(cutoffDateStr);

            // Delete old backup files and records
            let deletedCount = 0;
            oldBackups.forEach(backup => {
                try {
                    // Delete file if exists
                    if (backup.backupPath && fs.existsSync(backup.backupPath)) {
                        fs.unlinkSync(backup.backupPath);
                    }
                    // Delete record
                    this.delete('backup_history', backup.id);
                    deletedCount++;
                } catch (error) {
                    console.error(`Error deleting backup ${backup.id}:`, error);
                }
            });

            return { success: true, deletedCount };
        } catch (error) {
            console.error('Error deleting old backups:', error);
            return { success: false, error: error.message };
        }
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = DatabaseManager;
