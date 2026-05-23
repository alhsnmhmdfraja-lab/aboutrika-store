const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS & JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure assets directory exists in public
const assetsDir = path.join(__dirname, 'public', 'assets');
if (!fs.existsSync(assetsDir)){
    fs.mkdirSync(assetsDir, { recursive: true });
}

// Multer storage engine for product images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Initialize SQLite database
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)){
    fs.mkdirSync(dbDir, { recursive: true });
}
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
        initializeTables();
    }
});

// Setup database tables
function initializeTables() {
    db.serialize(() => {
        // 1. Products Table
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            discount_price REAL,
            sizes TEXT,
            colors TEXT,
            image_url TEXT,
            quantity INTEGER DEFAULT 0,
            sold_quantity INTEGER DEFAULT 0,
            in_stock INTEGER DEFAULT 1,
            is_3d INTEGER DEFAULT 0
        )`);

        // 2. Orders Table
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            customer_address TEXT NOT NULL,
            product_id INTEGER,
            product_name TEXT NOT NULL,
            selected_size TEXT,
            selected_color TEXT,
            quantity INTEGER DEFAULT 1,
            total_price REAL NOT NULL,
            order_date TEXT NOT NULL,
            status TEXT DEFAULT 'pending'
        )`);

        // 3. Admin Settings Table
        db.run(`CREATE TABLE IF NOT EXISTS admin_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT DEFAULT 'مصطفى متولي',
            password_hash TEXT NOT NULL,
            whatsapp_number TEXT DEFAULT '201120696554',
            store_address TEXT DEFAULT 'أسيوط - أبو تيج - شارع بيوض',
            store_name TEXT DEFAULT 'محل أبو تريكة'
        )`, () => {
            // Check if admin is initialized, if not create default
            db.get(`SELECT count(*) as count FROM admin_settings`, (err, row) => {
                if (row && row.count === 0) {
                    const salt = bcrypt.genSaltSync(10);
                    const defaultHash = bcrypt.hashSync('123456', salt); // Default Admin password is '123456'
                    db.run(`INSERT INTO admin_settings (username, password_hash, whatsapp_number, store_address, store_name) 
                            VALUES ('مصطفى متولي', ?, '201120696554', 'أسيوط - أبو تيج - شارع بيوض', 'محل أبو تريكة')`, [defaultHash]);
                    console.log('Default admin user initialized (User: مصطفى متولي, Pass: 123456)');
                } else {
                    // Update existing old default whatsapp_number to the new one if it matches the previous default numbers or is incorrect
                    db.run(`UPDATE admin_settings SET whatsapp_number = '201120696554' 
                            WHERE (whatsapp_number = '201025740445' 
                               OR whatsapp_number = '01025740445'
                               OR whatsapp_number = '20112069554' 
                               OR whatsapp_number = '0112069554'
                               OR whatsapp_number = '2011120696554'
                               OR whatsapp_number = '011120696554'
                               OR whatsapp_number LIKE '%25740445'
                               OR whatsapp_number LIKE '%2069554'
                               OR whatsapp_number LIKE '010%') 
                            AND id = 1`);
                }
            });
        });

        // Insert initial products if database is empty to make it look ready
        db.get(`SELECT count(*) as count FROM products`, (err, row) => {
            if (row && row.count === 0) {
                const initialProducts = [
                    {
                        name: 'حذاء ألترا رانر V2',
                        category: 'أحذية',
                        price: 450,
                        discount_price: 399,
                        sizes: '41,42,43,44,45',
                        colors: 'أسود,فسفوري,أحمر',
                        image_url: '/assets/shoe_ultra_runner.png',
                        quantity: 174,
                        sold_quantity: 42,
                        in_stock: 1,
                        is_3d: 1
                    },
                    {
                        name: 'سترة برو جارد الرياضية',
                        category: 'حريمي',
                        price: 320,
                        discount_price: null,
                        sizes: 'S,M,L,XL',
                        colors: 'وردي داكن,أسود',
                        image_url: '/assets/jacket_pro_guard.png',
                        quantity: 8,
                        sold_quantity: 12,
                        in_stock: 1,
                        is_3d: 0
                    },
                    {
                        name: 'كرة قدم ماتش برو الأصدار الذكي',
                        category: 'إكسسوارات',
                        price: 150,
                        discount_price: 120,
                        sizes: 'مقاس 5 قياسي',
                        colors: 'أبيض,فسفوري',
                        image_url: '/assets/football_match_pro.png',
                        quantity: 50,
                        sold_quantity: 15,
                        in_stock: 1,
                        is_3d: 1
                    },
                    {
                        name: 'حقيبة رياضية 40L احترافية',
                        category: 'إكسسوارات',
                        price: 210,
                        discount_price: null,
                        sizes: 'حجم موحد 40 لتر',
                        colors: 'أسود داكن',
                        image_url: '/assets/sports_bag_40l.png',
                        quantity: 20,
                        sold_quantity: 8,
                        in_stock: 1,
                        is_3d: 0
                    }
                ];

                const stmt = db.prepare(`INSERT INTO products (name, category, price, discount_price, sizes, colors, image_url, quantity, sold_quantity, in_stock, is_3d) 
                                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
                initialProducts.forEach(p => {
                    stmt.run(p.name, p.category, p.price, p.discount_price, p.sizes, p.colors, p.image_url, p.quantity, p.sold_quantity, p.in_stock, p.is_3d);
                });
                stmt.finalize();
                console.log('Sample products inserted.');
            }
        });
    });
}

// ================= API ENDPOINTS =================

// 1. PRODUCTS APIS

// Get all products
app.get('/api/products', (req, res) => {
    db.all(`SELECT * FROM products ORDER BY id DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Add new product (with image upload support)
app.post('/api/products', upload.single('image'), (req, res) => {
    const { name, category, price, discount_price, sizes, colors, quantity, is_3d } = req.body;
    let image_url = '/assets/placeholder_product.png'; // default fallback

    if (req.file) {
        image_url = `/uploads/${req.file.filename}`;
    } else if (req.body.image_url) {
        image_url = req.body.image_url;
    }

    const query = `INSERT INTO products (name, category, price, discount_price, sizes, colors, image_url, quantity, sold_quantity, in_stock, is_3d) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?)`;
    
    db.run(query, [
        name, 
        category, 
        parseFloat(price), 
        discount_price ? parseFloat(discount_price) : null, 
        sizes, 
        colors, 
        image_url, 
        parseInt(quantity) || 0,
        parseInt(is_3d) || 0
    ], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, message: 'Product added successfully!' });
    });
});

// Edit product
app.put('/api/products/:id', upload.single('image'), (req, res) => {
    const id = req.params.id;
    const { name, category, price, discount_price, sizes, colors, quantity, in_stock, is_3d } = req.body;
    
    let updateQuery = `UPDATE products SET name = ?, category = ?, price = ?, discount_price = ?, sizes = ?, colors = ?, quantity = ?, in_stock = ?, is_3d = ?`;
    let params = [
        name, 
        category, 
        parseFloat(price), 
        discount_price ? parseFloat(discount_price) : null, 
        sizes, 
        colors, 
        parseInt(quantity) || 0,
        parseInt(in_stock) || 0,
        parseInt(is_3d) || 0
    ];

    if (req.file) {
        updateQuery += `, image_url = ?`;
        params.push(`/uploads/${req.file.filename}`);
    } else if (req.body.image_url) {
        updateQuery += `, image_url = ?`;
        params.push(req.body.image_url);
    }

    updateQuery += ` WHERE id = ?`;
    params.push(id);

    db.run(updateQuery, params, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Product updated successfully!', changes: this.changes });
    });
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM products WHERE id = ?`, id, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Product deleted successfully!', changes: this.changes });
    });
});


// 2. ORDERS APIS

// Get all orders
app.get('/api/orders', (req, res) => {
    db.all(`SELECT * FROM orders ORDER BY id DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Create new order (Booking & Delivery)
app.post('/api/orders', (req, res) => {
    const { customer_name, customer_phone, customer_address, product_id, product_name, selected_size, selected_color, quantity, total_price } = req.body;
    const order_date = new Date().toISOString().split('T')[0];

    db.serialize(() => {
        // Insert order
        const orderQuery = `INSERT INTO orders (customer_name, customer_phone, customer_address, product_id, product_name, selected_size, selected_color, quantity, total_price, order_date, status) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`;
        
        db.run(orderQuery, [
            customer_name,
            customer_phone,
            customer_address,
            product_id,
            product_name,
            selected_size,
            selected_color,
            parseInt(quantity) || 1,
            parseFloat(total_price),
            order_date
        ], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const newOrderId = this.lastID;

            // Optional: Reduce stock and increase sold quantity if order is successfully placed (or handle this on status 'completed')
            db.run(`UPDATE products SET quantity = MAX(0, quantity - ?), sold_quantity = sold_quantity + ? WHERE id = ?`, 
                [parseInt(quantity) || 1, parseInt(quantity) || 1, product_id], (err2) => {
                    if (err2) console.error('Error updating stock count:', err2.message);
                }
            );

            res.status(201).json({ id: newOrderId, message: 'Order placed successfully!' });
        });
    });
});

// Update order status (pending, completed, cancelled)
app.put('/api/orders/:id/status', (req, res) => {
    const id = req.params.id;
    const { status } = req.body;

    db.run(`UPDATE orders SET status = ? WHERE id = ?`, [status, id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Order status updated!', changes: this.changes });
    });
});


// 3. ADMIN SETTINGS APIS

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;

    db.get(`SELECT * FROM admin_settings LIMIT 1`, [], (err, admin) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!admin) {
            return res.status(404).json({ error: 'Admin account not found.' });
        }

        const validPassword = bcrypt.compareSync(password, admin.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'كلمة المرور غير صحيحة!' });
        }

        res.json({ 
            success: true, 
            message: 'تم تسجيل الدخول بنجاح!',
            admin: {
                username: admin.username,
                whatsapp_number: admin.whatsapp_number,
                store_address: admin.store_address,
                store_name: admin.store_name
            }
        });
    });
});

// Change Admin Password
app.post('/api/admin/change-password', (req, res) => {
    const { current_password, new_password } = req.body;

    db.get(`SELECT * FROM admin_settings LIMIT 1`, [], (err, admin) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const validPassword = bcrypt.compareSync(current_password, admin.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة!' });
        }

        const salt = bcrypt.genSaltSync(10);
        const newHash = bcrypt.hashSync(new_password, salt);

        db.run(`UPDATE admin_settings SET password_hash = ? WHERE id = ?`, [newHash, admin.id], function(err2) {
            if (err2) {
                return res.status(500).json({ error: err2.message });
            }
            res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح!' });
        });
    });
});

// Recover Admin Password via WhatsApp number verification
app.post('/api/admin/recover-password', (req, res) => {
    const { whatsapp_phone, new_password } = req.body;

    db.get(`SELECT * FROM admin_settings LIMIT 1`, [], (err, admin) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!admin) {
            return res.status(404).json({ error: 'حساب المسؤول غير متوفر في النظام.' });
        }

        const normalizePhone = (p) => {
            if (!p) return '';
            const cleaned = p.replace(/\D/g, '');
            return cleaned.length >= 9 ? cleaned.slice(-9) : cleaned;
        };

        const cleanedInput = normalizePhone(whatsapp_phone);
        const cleanedSaved = normalizePhone(admin.whatsapp_number);

        if (cleanedInput === '' || cleanedInput !== cleanedSaved) {
            return res.status(400).json({ error: 'رقم الواتساب المدخل غير مطابق للرقم المسجل للمسؤول!' });
        }

        const salt = bcrypt.genSaltSync(10);
        const newHash = bcrypt.hashSync(new_password, salt);

        db.run(`UPDATE admin_settings SET password_hash = ? WHERE id = ?`, [newHash, admin.id], function(err2) {
            if (err2) {
                return res.status(500).json({ error: err2.message });
            }
            res.json({ success: true, message: 'تم استعادة وتحديث كلمة المرور بنجاح!' });
        });
    });
});

// Get admin settings
app.get('/api/settings', (req, res) => {
    db.get(`SELECT username, whatsapp_number, store_address, store_name FROM admin_settings LIMIT 1`, [], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(row);
    });
});

// Update admin settings (WhatsApp, Address, Store Name)
app.put('/api/settings', (req, res) => {
    const { whatsapp_number, store_address, store_name } = req.body;

    db.run(`UPDATE admin_settings SET whatsapp_number = ?, store_address = ?, store_name = ? WHERE id = 1`, 
        [whatsapp_number, store_address, store_name], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Settings updated successfully!' });
        }
    );
});

// Handle Fallback Routing (Serve index.html for SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(` 🚀  ABOUTRIKA SPORTS STORE - BACKEND IS NOW ONLINE & ACTIVE!   `);
    console.log(`================================================================`);
    console.log(`  🌐 Website Address:  http://localhost:${PORT}                  `);
    console.log(`  📁 Database Path:    ${dbPath}                          `);
    console.log(`  📂 Uploads Folder:   ${uploadDir}                       `);
    console.log(`----------------------------------------------------------------`);
    console.log(`  ℹ️  To host this online (e.g. Render, Heroku, VPS):           `);
    console.log(`     1. Ensure 'database.sqlite' is in a persistent volume.     `);
    console.log(`     2. Environment port (PORT) will be auto-bound.             `);
    console.log(`     3. Database & image uploads will persist automatically.    `);
    console.log(`================================================================`);
});
