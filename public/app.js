// ==================== APP STATE & HYBRID DB CONFIGURATION ====================
let appMode = 'local'; // 'api' (online server) or 'local' (localStorage fallback)
const API_BASE = window.location.origin;

// Initial Seed Data for LocalStorage Fallback (matches database.sqlite defaults)
const SEED_PRODUCTS = [
    {
        id: 1,
        name: 'حذاء ألترا رانر V2',
        category: 'أحذية',
        price: 450,
        discount_price: 399,
        sizes: '41,42,43,44,45',
        colors: 'أسود,فسفوري,أحمر',
        image_url: 'assets/shoe_ultra_runner.png',
        quantity: 174,
        sold_quantity: 42,
        in_stock: 1,
        is_3d: 1
    },
    {
        id: 2,
        name: 'سترة برو جارد الرياضية',
        category: 'حريمي',
        price: 320,
        discount_price: null,
        sizes: 'S,M,L,XL',
        colors: 'وردي داكن,أسود',
        image_url: 'assets/jacket_pro_guard.png',
        quantity: 8,
        sold_quantity: 12,
        in_stock: 1,
        is_3d: 0
    },
    {
        id: 3,
        name: 'كرة قدم ماتش برو الأصدار الذكي',
        category: 'إكسسوارات',
        price: 150,
        discount_price: 120,
        sizes: 'مقاس 5 قياسي',
        colors: 'أبيض,فسفوري',
        image_url: 'assets/football_match_pro.png',
        quantity: 50,
        sold_quantity: 15,
        in_stock: 1,
        is_3d: 1
    },
    {
        id: 4,
        name: 'حقيبة رياضية 40L احترافية',
        category: 'إكسسوارات',
        price: 210,
        discount_price: null,
        sizes: 'حجم موحد 40 لتر',
        colors: 'أسود داكن',
        image_url: 'assets/sports_bag_40l.png',
        quantity: 20,
        sold_quantity: 8,
        in_stock: 1,
        is_3d: 0
    }
];

const DEFAULT_SETTINGS = {
    username: 'مصطفى متولي',
    whatsapp_number: '201120696554',
    store_address: 'أسيوط - أبو تيج - شارع بيوض',
    store_name: 'محل أبو تريكة'
};

// Global Store State
let state = {
    products: [],
    orders: [],
    settings: {...DEFAULT_SETTINGS},
    adminLoggedIn: false,
    selectedCategory: 'all',
    searchQuery: '',
    filters: {
        availability: 'all',
        discount: 'all',
        sort: 'newest'
    }
};

// ==================== HYBRID ENGINE INITIALIZATION & DETECTOR ====================
async function checkBackendConnection() {
    const banner = document.getElementById('connection-banner');
    try {
        const response = await fetch(`${API_BASE}/api/settings`, { method: 'GET', signal: AbortSignal.timeout(3000) });
        if (response.ok) {
            appMode = 'api';
            console.log('Connected to Node.js backend. SQLite database active.');
            banner.className = 'connection-banner online';
            banner.innerHTML = '<i class="fa-solid fa-cloud-bolt"></i> خادم الباك إند متصل وقاعدة بيانات SQLite نشطة الآن.';
            setTimeout(() => banner.style.display = 'none', 3000);
        } else {
            throw new Error('Server returned error status');
        }
    } catch (e) {
        appMode = 'local';
        console.warn('Backend server offline. Falling back seamlessly to browser localStorage.');
        banner.className = 'connection-banner offline';
        banner.style.display = 'flex';
        initLocalStorageDB();
    }
}

function initLocalStorageDB() {
    if (!localStorage.getItem('aboutrika_products')) {
        localStorage.setItem('aboutrika_products', JSON.stringify(SEED_PRODUCTS));
    }
    if (!localStorage.getItem('aboutrika_orders')) {
        localStorage.setItem('aboutrika_orders', JSON.stringify([]));
    }
    
    // Check settings and migrate phone numbers if they are old defaults
    let localSettings = localStorage.getItem('aboutrika_settings');
    if (!localSettings) {
        localStorage.setItem('aboutrika_settings', JSON.stringify(DEFAULT_SETTINGS));
    } else {
        try {
            let parsed = JSON.parse(localSettings);
            const cleanNum = parsed.whatsapp_number ? parsed.whatsapp_number.replace(/\D/g, '') : '';
            if (
                cleanNum.endsWith('25740445') || 
                cleanNum.endsWith('2069554') || 
                cleanNum.endsWith('69554') ||
                cleanNum.startsWith('010') || 
                cleanNum === '20112069554' || 
                cleanNum === '0112069554' || 
                cleanNum === '201025740445' || 
                cleanNum === '01025740445' ||
                cleanNum === ''
            ) {
                parsed.whatsapp_number = '201120696554';
                localStorage.setItem('aboutrika_settings', JSON.stringify(parsed));
            }
        } catch (e) {
            console.error('Error migrating local settings phone:', e);
        }
    }
    
    if (!localStorage.getItem('aboutrika_admin_password')) {
        // Default admin password for local storage mode
        localStorage.setItem('aboutrika_admin_password', '123456');
    }
}

// ==================== REUSABLE DOM SELECTORS ====================
const dom = {
    productsGrid: document.getElementById('productsGrid'),
    adminLoginToggleBtn: document.getElementById('adminLoginToggleBtn'),
    adminStatusText: document.getElementById('adminStatusText'),
    adminDashboardSection: document.getElementById('adminDashboardSection'),
    addNewProductHeaderBtn: document.getElementById('addNewProductHeaderBtn'),
    contactWhatsAppBtn: document.getElementById('contactWhatsAppBtn'),
    fabAddBtn: document.getElementById('fabAddBtn'),
    
    // KPIs
    dashboardKpis: document.querySelector('.dashboard-kpis'),
    kpiSalesVal: document.getElementById('kpiSalesVal'),
    kpiStockVal: document.getElementById('kpiStockVal'),
    kpiOrdersVal: document.getElementById('kpiOrdersVal'),
    kpiOffersVal: document.getElementById('kpiOffersVal'),
    kpiStockSub: document.getElementById('kpiStockSub'),
    kpiOrdersSub: document.getElementById('kpiOrdersSub'),
    pendingOrdersCount: document.getElementById('pendingOrdersCount'),
    
    // Category & Search
    categoriesWrapper: document.querySelector('.categories-scroll-wrapper'),
    productSearchInput: document.getElementById('productSearchInput'),
    clearCategoryFilterBtn: document.getElementById('clearCategoryFilterBtn'),
    toggleFiltersBtn: document.getElementById('toggleFiltersBtn'),
    advancedFiltersPanel: document.getElementById('advancedFiltersPanel'),
    filterAvailability: document.getElementById('filterAvailability'),
    filterDiscount: document.getElementById('filterDiscount'),
    filterSort: document.getElementById('filterSort'),
    activeFilterTags: document.getElementById('activeFilterTags'),
    productsCountBadge: document.getElementById('productsCountBadge'),
    
    // Nav Navigation
    btnNavHome: document.getElementById('btnNavHome'),
    btnNavInventory: document.getElementById('btnNavInventory'),
    btnNavOffers: document.getElementById('btnNavOffers'),
    btnNavContact: document.getElementById('btnNavContact'),
    navOffersBadge: document.getElementById('navOffersBadge'),
    
    // Login Modal
    adminLoginModal: document.getElementById('adminLoginModal'),
    closeLoginModalBtn: document.getElementById('closeLoginModalBtn'),
    adminLoginForm: document.getElementById('adminLoginForm'),
    adminPasswordInput: document.getElementById('adminPasswordInput'),
    togglePassVisibilityBtn: document.getElementById('togglePassVisibilityBtn'),
    forgotPasswordBtn: document.getElementById('forgotPasswordBtn'),
    adminRecoveryForm: document.getElementById('adminRecoveryForm'),
    adminRecoveryPhoneInput: document.getElementById('adminRecoveryPhoneInput'),
    recoveryNewPassword: document.getElementById('recoveryNewPassword'),
    recoveryConfirmNewPassword: document.getElementById('recoveryConfirmNewPassword'),
    backToLoginBtn: document.getElementById('backToLoginBtn'),
    
    // Product Details Modal
    productDetailsModal: document.getElementById('productDetailsModal'),
    closeDetailsModalBtn: document.getElementById('closeDetailsModalBtn'),
    detailsZoomContainer: document.getElementById('detailsZoomContainer'),
    detailsActiveImg: document.getElementById('detailsActiveImg'),
    detailsZoomLens: document.getElementById('detailsZoomLens'),
    detailsThumbnails: document.getElementById('detailsThumbnails'),
    detailsProductCategory: document.getElementById('detailsProductCategory'),
    detailsProductName: document.getElementById('detailsProductName'),
    detailsProductPrice: document.getElementById('detailsProductPrice'),
    detailsProductOldPrice: document.getElementById('detailsProductOldPrice'),
    detailsDiscountPercent: document.getElementById('detailsDiscountPercent'),
    authOrigin: document.getElementById('authOrigin'),
    authFabric: document.getElementById('authFabric'),
    authWarranty: document.getElementById('authWarranty'),
    authSerial: document.getElementById('authSerial'),
    authBarcodeText: document.getElementById('authBarcodeText'),
    detailsStockStatus: document.getElementById('detailsStockStatus'),
    detailsSpecsList: document.getElementById('detailsSpecsList'),
    detailsBookBtn: document.getElementById('detailsBookBtn'),
    
    // Booking Modal
    orderModal: document.getElementById('orderModal'),
    closeOrderModalBtn: document.getElementById('closeOrderModalBtn'),
    orderProductImg: document.getElementById('orderProductImg'),
    orderProductName: document.getElementById('orderProductName'),
    orderProductCategory: document.getElementById('orderProductCategory'),
    orderProductPrice: document.getElementById('orderProductPrice'),
    orderProductOldPrice: document.getElementById('orderProductOldPrice'),
    orderSelectColor: document.getElementById('orderSelectColor'),
    orderSelectSize: document.getElementById('orderSelectSize'),
    orderQuantity: document.getElementById('orderQuantity'),
    qtyMinusBtn: document.getElementById('qtyMinusBtn'),
    qtyPlusBtn: document.getElementById('qtyPlusBtn'),
    orderTotalPriceDisplay: document.getElementById('orderTotalPriceDisplay'),
    customerBookingForm: document.getElementById('customerBookingForm'),
    orderProductIdInput: document.getElementById('orderProductIdInput'),
    custAddress: document.getElementById('custAddress'),
    
    // Admin Settings Modal
    adminSettingsModal: document.getElementById('adminSettingsModal'),
    closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
    adminSettingsBtn: document.getElementById('adminSettingsBtn'),
    adminDashPasswordBtn: document.getElementById('adminDashPasswordBtn'),
    storeSettingsForm: document.getElementById('storeSettingsForm'),
    changePasswordForm: document.getElementById('changePasswordForm'),
    setStoreName: document.getElementById('setStoreName'),
    setWhatsApp: document.getElementById('setWhatsApp'),
    setAddress: document.getElementById('setAddress'),
    currPassword: document.getElementById('currPassword'),
    newPassword: document.getElementById('newPassword'),
    confirmNewPassword: document.getElementById('confirmNewPassword'),
    
    dashChangePasswordForm: document.getElementById('dashChangePasswordForm'),
    dashCurrPassword: document.getElementById('dashCurrPassword'),
    dashNewPassword: document.getElementById('dashNewPassword'),
    dashConfirmNewPassword: document.getElementById('dashConfirmNewPassword'),
    
    // Admin Dashboard Tabs
    adminTabs: document.querySelectorAll('.admin-tab'),
    adminTabContents: document.querySelectorAll('.admin-tab-content'),
    adminProductsTableBody: document.getElementById('adminProductsTableBody'),
    adminOrdersTableBody: document.getElementById('adminOrdersTableBody'),
    addProductForm: document.getElementById('addProductForm'),
    editProductId: document.getElementById('editProductId'),
    formActionTitle: document.getElementById('formActionTitle'),
    saveProductBtn: document.getElementById('saveProductBtn'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    addProductTabBtn: document.getElementById('addProductTabBtn'),
    pName: document.getElementById('pName'),
    pCategory: document.getElementById('pCategory'),
    pPrice: document.getElementById('pPrice'),
    pDiscountPrice: document.getElementById('pDiscountPrice'),
    pSizes: document.getElementById('pSizes'),
    pColors: document.getElementById('pColors'),
    pQuantity: document.getElementById('pQuantity'),
    pIs3d: document.getElementById('pIs3d'),
    pImage: document.getElementById('pImage'),
    pImageUrl: document.getElementById('pImageUrl'),
    imageDropzone: document.getElementById('imageDropzone'),
    imagePreviewContainer: document.getElementById('imagePreviewContainer'),
    productImagePreview: document.getElementById('productImagePreview'),
    removePreviewBtn: document.getElementById('removePreviewBtn'),
    fileInfoText: document.getElementById('fileInfoText'),
    adminLogoutBtn: document.getElementById('adminLogoutBtn'),
    
    // 3D Studio Modal
    studio3DModal: document.getElementById('studio3DModal'),
    closeStudioModalBtn: document.getElementById('closeStudioModalBtn'),
    open3DStudioBtn: document.getElementById('open3DStudioBtn'),
    selectStudioProduct: document.getElementById('selectStudioProduct'),
    studioActiveImg: document.getElementById('studioActiveImg'),
    btnRun3DScanner: document.getElementById('btnRun3DScanner'),
    scannerLaser: document.getElementById('scannerLaser'),
    scanStatusOverlay: document.getElementById('scanStatusOverlay'),
    scanBadge: document.getElementById('scanBadge'),
    studioRangeDepth: document.getElementById('studioRangeDepth'),
    depthValText: document.getElementById('depthValText'),
    studioSuccessAlert: document.getElementById('studioSuccessAlert'),
    object3DWrapper: document.getElementById('object3DWrapper'),
    
    // Toast Notification
    toastNotification: document.getElementById('toastNotification'),
    toastMsg: document.getElementById('toastMsg'),
    toastIcon: document.getElementById('toastIcon'),

    // Main Content
    mainContent: document.querySelector('.main-content'),

    // Sidebar Navigation Drawer Selectors
    navToggleBtn: document.getElementById('navToggleBtn'),
    sidebarDrawerOverlay: document.getElementById('sidebarDrawerOverlay'),
    sidebarDrawer: document.getElementById('sidebarDrawer'),
    closeDrawerBtn: document.getElementById('closeDrawerBtn'),
    drawerHomeLink: document.getElementById('drawerHomeLink'),
    drawerContactLink: document.getElementById('drawerContactLink'),
    drawerAdminSection: document.getElementById('drawerAdminSection'),
    drawerInventoryLink: document.getElementById('drawerInventoryLink'),
    drawerSettingsLink: document.getElementById('drawerSettingsLink'),
    drawerPasswordLink: document.getElementById('drawerPasswordLink'),
    drawerLogoutLink: document.getElementById('drawerLogoutLink')
};

// ==================== TOAST & DIALOG HELPERS ====================
function showToast(msg, type = 'success') {
    dom.toastMsg.innerText = msg;
    dom.toastNotification.className = `toast-notification show ${type}`;
    if (type === 'success') {
        dom.toastIcon.className = 'fa-solid fa-circle-check';
    } else {
        dom.toastIcon.className = 'fa-solid fa-circle-exclamation';
    }
    setTimeout(() => {
        dom.toastNotification.classList.remove('show');
    }, 4000);
}

function openModal(modalEl) {
    modalEl.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalEl) {
    modalEl.classList.remove('open');
    document.body.style.overflow = '';
}


function compressImage(file, maxWidth = 300, maxHeight = 300) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

// ==================== DATABASE BRIDGE (HYBRID DRIVER) ====================

const dbBridge = {
    // 1. Fetch Store Settings
    async getSettings() {
        if (appMode === 'api') {
            const res = await fetch(`${API_BASE}/api/settings`);
            return await res.json();
        } else {
            return JSON.parse(localStorage.getItem('aboutrika_settings'));
        }
    },

    // 2. Save Settings
    async saveSettings(settingsData) {
        if (appMode === 'api') {
            const res = await fetch(`${API_BASE}/api/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settingsData)
            });
            return await res.json();
        } else {
            localStorage.setItem('aboutrika_settings', JSON.stringify(settingsData));
            return { success: true };
        }
    },

    // 3. Admin Authentication
    async adminLogin(password) {
        if (appMode === 'api') {
            const res = await fetch(`${API_BASE}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Login failed');
            }
            return await res.json();
        } else {
            const localPass = localStorage.getItem('aboutrika_admin_password');
            if (password === localPass) {
                const settings = JSON.parse(localStorage.getItem('aboutrika_settings'));
                return { success: true, admin: settings };
            } else {
                throw new Error('الرقم السري للمشرف غير صحيح!');
            }
        }
    },

    // 4. Change Password
    async changePassword(current_password, new_password) {
        if (appMode === 'api') {
            const res = await fetch(`${API_BASE}/api/admin/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ current_password, new_password })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to change password');
            }
            return await res.json();
        } else {
            const localPass = localStorage.getItem('aboutrika_admin_password');
            if (current_password === localPass) {
                localStorage.setItem('aboutrika_admin_password', new_password);
                return { success: true };
            } else {
                throw new Error('الرمز السري الحالي المدخل غير صحيح!');
            }
        }
    },

    // 4b. Recover Password
    async recoverPassword(whatsapp_phone, new_password) {
        if (appMode === 'api') {
            const res = await fetch(`${API_BASE}/api/admin/recover-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ whatsapp_phone, new_password })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to recover password');
            }
            return await res.json();
        } else {
            const settings = JSON.parse(localStorage.getItem('aboutrika_settings'));
            const normalizePhone = (p) => {
                if (!p) return '';
                const cleaned = p.replace(/\D/g, '');
                return cleaned.length >= 9 ? cleaned.slice(-9) : cleaned;
            };
            const cleanedInput = normalizePhone(whatsapp_phone);
            const cleanedSaved = normalizePhone(settings.whatsapp_number);
            if (cleanedInput !== '' && cleanedInput === cleanedSaved) {
                localStorage.setItem('aboutrika_admin_password', new_password);
                return { success: true };
            } else {
                throw new Error('رقم الواتساب المدخل غير مطابق للرقم المسجل للمسؤول في إعدادات المتجر!');
            }
        }
    },

    // 5. Load Products
    async getProducts() {
        if (appMode === 'api') {
            const res = await fetch(`${API_BASE}/api/products`);
            return await res.json();
        } else {
            return JSON.parse(localStorage.getItem('aboutrika_products'));
        }
    },

    // 6. Save Product (New or Edited)
    async saveProduct(formData, editId = null) {
        if (appMode === 'api') {
            const url = editId ? `${API_BASE}/api/products/${editId}` : `${API_BASE}/api/products`;
            const method = editId ? 'PUT' : 'POST';
            
            const res = await fetch(url, {
                method: method,
                body: formData // Send as MultiPart Form (supports Multer file uploads)
            });
            if (!res.ok) throw new Error('فشل حفظ المنتج الرياضي على خادم الباك إند');
            return await res.json();
        } else {
            // LocalStorage implementation
            const localProducts = JSON.parse(localStorage.getItem('aboutrika_products'));
            
            // Extract raw details from formData
            const name = formData.get('name');
            const category = formData.get('category');
            const price = parseFloat(formData.get('price'));
            const discount_price = formData.get('discount_price') ? parseFloat(formData.get('discount_price')) : null;
            const sizes = formData.get('sizes');
            const colors = formData.get('colors');
            const quantity = parseInt(formData.get('quantity')) || 0;
            const is_3d = parseInt(formData.get('is_3d')) || 0;
            
            // Handle Local Mock Image
            let image_url = 'assets/placeholder_product.png';
            const imageFile = formData.get('image');
            const manualUrl = formData.get('image_url');
            
            if (imageFile && imageFile.name) {
                // Compress the image before storing it in localStorage to prevent QuotaExceededError
                try {
                    image_url = await compressImage(imageFile);
                } catch (e) {
                    console.error('Image compression failed, using raw dataURL:', e);
                    image_url = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(imageFile);
                    });
                }
            } else if (manualUrl) {
                image_url = manualUrl;
            } else if (editId) {
                // keep previous image if editing and no new image
                const existing = localProducts.find(p => p.id === parseInt(editId));
                if (existing) image_url = existing.image_url;
            }

            if (editId) {
                // Edit mode
                const index = localProducts.findIndex(p => p.id === parseInt(editId));
                if (index !== -1) {
                    localProducts[index] = {
                        ...localProducts[index],
                        name, category, price, discount_price, sizes, colors, quantity, 
                        in_stock: quantity > 0 ? 1 : 0, 
                        is_3d,
                        image_url
                    };
                }
            } else {
                // Create mode
                const newId = localProducts.length > 0 ? Math.max(...localProducts.map(p => p.id)) + 1 : 1;
                localProducts.push({
                    id: newId,
                    name, category, price, discount_price, sizes, colors, quantity,
                    sold_quantity: 0,
                    in_stock: quantity > 0 ? 1 : 0,
                    is_3d,
                    image_url
                });
            }

            localStorage.setItem('aboutrika_products', JSON.stringify(localProducts));
            return { success: true };
        }
    },

    // 7. Delete Product
    async deleteProduct(id) {
        if (appMode === 'api') {
            const res = await fetch(`${API_BASE}/api/products/${id}`, { method: 'DELETE' });
            return await res.json();
        } else {
            let localProducts = JSON.parse(localStorage.getItem('aboutrika_products'));
            localProducts = localProducts.filter(p => p.id !== parseInt(id));
            localStorage.setItem('aboutrika_products', JSON.stringify(localProducts));
            return { success: true };
        }
    },

    // 8. Load Orders
    async getOrders() {
        if (appMode === 'api') {
            const res = await fetch(`${API_BASE}/api/orders`);
            return await res.json();
        } else {
            return JSON.parse(localStorage.getItem('aboutrika_orders'));
        }
    },

    // 9. Save Order
    async createOrder(orderData) {
        if (appMode === 'api') {
            const res = await fetch(`${API_BASE}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
            if (!res.ok) throw new Error('فشل تسجيل الطلب في السيرفر');
            return await res.json();
        } else {
            // LocalStorage Order
            const localOrders = JSON.parse(localStorage.getItem('aboutrika_orders'));
            const localProducts = JSON.parse(localStorage.getItem('aboutrika_products'));
            
            const newOrderId = localOrders.length > 0 ? Math.max(...localOrders.map(o => o.id)) + 1 : 1001;
            const order_date = new Date().toISOString().split('T')[0];
            
            const newOrder = {
                id: newOrderId,
                ...orderData,
                order_date,
                status: 'pending'
            };
            localOrders.push(newOrder);
            localStorage.setItem('aboutrika_orders', JSON.stringify(localOrders));
            
            // Adjust product inventory locally
            const pIndex = localProducts.findIndex(p => p.id === parseInt(orderData.product_id));
            if (pIndex !== -1) {
                const qty = parseInt(orderData.quantity) || 1;
                localProducts[pIndex].quantity = Math.max(0, localProducts[pIndex].quantity - qty);
                localProducts[pIndex].sold_quantity += qty;
                if (localProducts[pIndex].quantity === 0) {
                    localProducts[pIndex].in_stock = 0;
                }
                localStorage.setItem('aboutrika_products', JSON.stringify(localProducts));
            }
            
            return { id: newOrderId, success: true };
        }
    },

    // 10. Update Order Status
    async updateOrderStatus(id, status) {
        if (appMode === 'api') {
            const res = await fetch(`${API_BASE}/api/orders/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            return await res.json();
        } else {
            const localOrders = JSON.parse(localStorage.getItem('aboutrika_orders'));
            const index = localOrders.findIndex(o => o.id === parseInt(id));
            if (index !== -1) {
                localOrders[index].status = status;
                localStorage.setItem('aboutrika_orders', JSON.stringify(localOrders));
            }
            return { success: true };
        }
    }
};

// ==================== CORE STATE MANAGEMENT & LOGIC ====================

async function loadData() {
    try {
        state.settings = await dbBridge.getSettings();
        state.products = await dbBridge.getProducts();
        state.orders = await dbBridge.getOrders();
        
        // Render stats & items
        renderKPIs();
        renderProducts();
        renderActiveFilters();
        
        updateAdminUI();
        
        // Sync custom tags/inputs with loaded settings
        document.querySelector('.profile-desc').innerText = `نقدم أحدث وأجود الملابس الرياضية والمعدات بأسيوط، أبو تيج، تحت إدارة ${state.settings.username}.`;
        document.querySelector('.profile-title').innerText = state.settings.store_name;
        document.getElementById('header-logo').alt = state.settings.store_name;
        
        // Render tables if admin is logged in
        if (state.adminLoggedIn) {
            renderAdminInventoryTable();
            renderAdminOrdersTable();
        }
    } catch (e) {
        console.error('Error fetching dynamic data:', e);
        showToast('حدث خطأ أثناء تحميل البيانات من قاعدة البيانات.', 'error');
    }
}

function updateAdminUI() {
    const isAdmin = state.adminLoggedIn;
    
    // 1. Toggle KPIs section visibility
    if (dom.dashboardKpis) {
        dom.dashboardKpis.style.display = isAdmin ? 'grid' : 'none';
    }
    
    // 2. Toggle "Add Product" button in profile card
    if (dom.addNewProductHeaderBtn) {
        dom.addNewProductHeaderBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    }
    
    // 3. Toggle "Convert to 3D" button in products section
    if (dom.open3DStudioBtn) {
        dom.open3DStudioBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    }
    
    // 4. Toggle floating action button (FAB)
    if (dom.fabAddBtn) {
        dom.fabAddBtn.style.display = isAdmin ? 'flex' : 'none';
    }
    
    // 5. Toggle "Inventory" button in bottom nav
    if (dom.btnNavInventory) {
        dom.btnNavInventory.style.display = isAdmin ? 'flex' : 'none';
    }

    // Toggle admin drawer section visibility
    if (dom.drawerAdminSection) {
        dom.drawerAdminSection.style.display = isAdmin ? 'block' : 'none';
    }
    
    // 6. Manage admin dashboard view classes and login button text/state
    if (isAdmin) {
        dom.adminLoginToggleBtn.classList.add('logged-in');
        const isDashboardOpen = dom.adminDashboardSection.classList.contains('open');
        dom.adminStatusText.innerText = isDashboardOpen ? 'عرض المتجر' : 'لوحة التحكم';
        
        // Hide main content when admin dashboard is open to act as a proper single page app
        if (dom.mainContent) {
            dom.mainContent.style.display = isDashboardOpen ? 'none' : 'block';
        }
    } else {
        dom.adminLoginToggleBtn.classList.remove('logged-in');
        dom.adminStatusText.innerText = 'دخول المسؤول';
        dom.adminDashboardSection.classList.remove('open');
        
        // Restore main content visibility when logged out
        if (dom.mainContent) {
            dom.mainContent.style.display = 'block';
        }
    }
}

// Calculate and render Stats Dashboard
function renderKPIs() {
    // 1. Total Sales Revenue
    const completedOrders = state.orders.filter(o => o.status === 'completed');
    const totalSales = completedOrders.reduce((sum, o) => sum + parseFloat(o.total_price), 0);
    dom.kpiSalesVal.innerText = `${totalSales.toLocaleString('ar-EG', {minimumFractionDigits: 2})} ج.م`;
    
    // 2. Current Stock (sum of available quantities)
    const totalStock = state.products.reduce((sum, p) => sum + parseInt(p.quantity), 0);
    dom.kpiStockVal.innerText = totalStock.toLocaleString('ar-EG');
    const distinctCategories = [...new Set(state.products.map(p => p.category))].length;
    dom.kpiStockSub.innerText = `${distinctCategories} أقسام رياضية متوفرة`;
    
    // 3. Count Pending Bookings
    const pendingOrders = state.orders.filter(o => o.status === 'pending');
    dom.kpiOrdersVal.innerText = pendingOrders.length.toLocaleString('ar-EG');
    dom.kpiOrdersSub.innerText = `${pendingOrders.length} طلب قيد التجهيز الفوري`;
    dom.pendingOrdersCount.innerText = pendingOrders.length;
    
    // 4. Counts active offers
    const offerProducts = state.products.filter(p => p.discount_price !== null && p.discount_price > 0);
    dom.kpiOffersVal.innerText = offerProducts.length.toLocaleString('ar-EG');
    dom.navOffersBadge.innerText = offerProducts.length;
    if (offerProducts.length > 0) {
        dom.navOffersBadge.style.display = 'flex';
    } else {
        dom.navOffersBadge.style.display = 'none';
    }
}

// Filter and Sort Products dynamically based on state
function getFilteredProducts() {
    return state.products.filter(p => {
        // Search filter (handles name, color, category)
        const matchSearch = state.searchQuery === '' || 
            p.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
            (p.colors && p.colors.toLowerCase().includes(state.searchQuery.toLowerCase()));

        // Category filter
        const matchCategory = state.selectedCategory === 'all' || p.category === state.selectedCategory;

        // Availability filter
        let matchAvailability = true;
        if (state.filters.availability === 'in_stock') {
            matchAvailability = p.quantity > 0;
        } else if (state.filters.availability === 'out_of_stock') {
            matchAvailability = p.quantity === 0;
        }

        // Discount filter
        const matchDiscount = state.filters.discount === 'all' || (p.discount_price !== null && p.discount_price > 0);

        return matchSearch && matchCategory && matchAvailability && matchDiscount;
    }).sort((a, b) => {
        // Sorting Logic
        if (state.filters.sort === 'price_asc') {
            const priceA = a.discount_price || a.price;
            const priceB = b.discount_price || b.price;
            return priceA - priceB;
        } else if (state.filters.sort === 'price_desc') {
            const priceA = a.discount_price || a.price;
            const priceB = b.discount_price || b.price;
            return priceB - priceA;
        } else if (state.filters.sort === 'popular') {
            return b.sold_quantity - a.sold_quantity;
        } else {
            // Newest first
            return b.id - a.id;
        }
    });
}

// Render product list and wire up 3D Mouse tilting listeners
function renderProducts() {
    const list = getFilteredProducts();
    dom.productsCountBadge.innerText = `متوفر ${list.length} منتج`;

    if (list.length === 0) {
        dom.productsGrid.innerHTML = `
            <div class="loading-spinner-wrapper">
                <i class="fa-solid fa-boxes-open" style="font-size: 48px; color: var(--text-gray);"></i>
                <p>عذراً، لم نجد أي منتجات تطابق خيارات التصفية الحالية.</p>
            </div>
        `;
        return;
    }

    dom.productsGrid.innerHTML = '';
    list.forEach(p => {
        const hasDiscount = p.discount_price !== null && p.discount_price > 0;
        const discountPercent = hasDiscount ? Math.round(((p.price - p.discount_price) / p.price) * 100) : 0;
        
        let stockClass = 'in-stock';
        let stockLabel = `${p.quantity} متوفر`;
        if (p.quantity === 0) {
            stockClass = 'out-of-stock';
            stockLabel = 'غير متوفر حالياً';
        } else if (p.quantity <= 5) {
            stockClass = 'low-stock';
            stockLabel = `عاجل! ${p.quantity} متبقي`;
        }

        const cardContainer = document.createElement('div');
        cardContainer.className = 'product-card-container';
        
        cardContainer.innerHTML = `
            <article class="product-card" data-id="${p.id}" ${p.is_3d ? 'data-tilt-enabled="true"' : ''}>
                <span class="card-badge">${p.category}</span>
                ${hasDiscount ? `<span class="discount-tag">خصم -${discountPercent}%</span>` : ''}
                
                <div class="card-img-wrapper">
                    <img src="${p.image_url}" alt="${p.name}" class="card-img" onerror="this.src='assets/placeholder_product.png'">
                    <div class="card-shadow-3d"></div>
                </div>
                
                <div class="card-details">
                    <h3 class="card-title" title="${p.name}">${p.name}</h3>
                    
                    <div class="card-meta-line">
                        <span class="status-pill ${stockClass}">${stockLabel}</span>
                        <span class="spec-badge"><i class="fa-solid fa-expand"></i> ${p.sizes ? p.sizes.split(',').length : 0} مقاسات</span>
                    </div>

                    <div class="card-price-row">
                        ${hasDiscount ? `
                            <span class="price-val">${p.discount_price} ج.م</span>
                            <span class="price-old-val">${p.price} ج.م</span>
                        ` : `
                            <span class="price-val">${p.price} ج.م</span>
                        `}
                    </div>
                </div>

                <div class="card-actions">
                    <button class="btn btn-primary btn-book-delivery" ${p.quantity === 0 ? 'disabled' : ''}>
                        <i class="fa-solid fa-truck-fast"></i> حجز وتوصيل سريع
                    </button>
                    ${state.adminLoggedIn ? `
                        <button class="admin-action-btn btn-edit-card" title="تعديل المنتج"><i class="fa-solid fa-pencil"></i></button>
                        <button class="admin-action-btn btn-delete-card" title="حذف المنتج"><i class="fa-solid fa-trash-can"></i></button>
                    ` : ''}
                </div>

                ${p.is_3d ? `<div class="card-3d-indicator" title="عرض تفاعلي ثلاثي الأبعاد ثلاثي الأبعاد"><i class="fa-solid fa-cube"></i></div>` : ''}
            </article>
        `;

        // Wire event handlers
        cardContainer.querySelector('.btn-book-delivery').addEventListener('click', () => triggerBooking(p));
        
        // Click card to view authenticity & microscopic zoom details
        cardContainer.querySelector('.product-card').addEventListener('click', (e) => {
            if (e.target.closest('.btn') || e.target.closest('.admin-action-btn') || e.target.closest('.card-3d-indicator')) {
                return; // Let native buttons handle action
            }
            triggerProductDetails(p);
        });

        if (state.adminLoggedIn) {
            cardContainer.querySelector('.btn-edit-card').addEventListener('click', () => triggerEditProduct(p));
            cardContainer.querySelector('.btn-delete-card').addEventListener('click', () => triggerDeleteProduct(p.id, p.name));
        }

        // Apply 3D Interactive Tilting logic if enabled
        if (p.is_3d) {
            apply3DTiltEffect(cardContainer.querySelector('.product-card'));
        }

        dom.productsGrid.appendChild(cardContainer);
    });
}

// 3D Tilting Engine based on cursor mapping in space
function apply3DTiltEffect(card) {
    card.addEventListener('mousemove', (e) => {
        const cardRect = card.getBoundingClientRect();
        const cardWidth = cardRect.width;
        const cardHeight = cardRect.height;
        
        // Calculate coordinate positions relative to center of the card
        const cursorX = e.clientX - cardRect.left - (cardWidth / 2);
        const cursorY = e.clientY - cardRect.top - (cardHeight / 2);
        
        // Map calculations to tilting angle limits (Max 20 degrees)
        const angleX = -(cursorY / (cardHeight / 2)) * 12;
        const angleY = (cursorX / (cardWidth / 2)) * 12;
        
        card.style.transform = `rotateX(${angleX}deg) rotateY(${angleY}deg)`;
        
        // Parallax depth translations
        const img = card.querySelector('.card-img');
        if (img) img.style.transform = `translateZ(50px) scale(1.12) rotate(${-angleY/3}deg)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'rotateX(0deg) rotateY(0deg)';
        card.style.transition = 'transform 0.4s ease';
        
        const img = card.querySelector('.card-img');
        if (img) {
            img.style.transform = 'translateZ(30px) scale(1) rotate(0deg)';
            img.style.transition = 'transform 0.4s ease';
        }
    });

    card.addEventListener('mouseenter', () => {
        card.style.transition = 'none';
        const img = card.querySelector('.card-img');
        if (img) img.style.transition = 'none';
    });
}

// ==================== BUYER BOOKING & CHECKOUT SYSTEM ====================

function triggerBooking(product) {
    dom.orderProductIdInput.value = product.id;
    dom.orderProductName.innerText = product.name;
    dom.orderProductCategory.innerText = product.category;
    
    const hasDiscount = product.discount_price !== null && product.discount_price > 0;
    const activePrice = hasDiscount ? product.discount_price : product.price;
    
    dom.orderProductPrice.innerText = `${activePrice} ج.م`;
    dom.orderProductImg.src = product.image_url;
    
    if (hasDiscount) {
        dom.orderProductOldPrice.style.display = 'inline';
        dom.orderProductOldPrice.innerText = `${product.price} ج.م`;
    } else {
        dom.orderProductOldPrice.style.display = 'none';
    }

    // Populate Size select options
    dom.orderSelectSize.innerHTML = '';
    if (product.sizes) {
        product.sizes.split(',').forEach(s => {
            dom.orderSelectSize.innerHTML += `<option value="${s.trim()}">${s.trim()}</option>`;
        });
    } else {
        dom.orderSelectSize.innerHTML = '<option value="قياسي">حجم قياسي</option>';
    }

    // Populate Color select options
    dom.orderSelectColor.innerHTML = '';
    if (product.colors) {
        product.colors.split(',').forEach(c => {
            dom.orderSelectColor.innerHTML += `<option value="${c.trim()}">${c.trim()}</option>`;
        });
    } else {
        dom.orderSelectColor.innerHTML = '<option value="أساسي">لون أساسي</option>';
    }

    // Sync state configuration
    dom.orderQuantity.value = 1;
    dom.orderTotalPriceDisplay.innerText = `${activePrice} ج.م`;
    dom.custAddress.value = state.settings.store_address; // preset shop default address but they edit

    openModal(dom.orderModal);
}

// Stepper controls
dom.qtyMinusBtn.addEventListener('click', () => {
    let q = parseInt(dom.orderQuantity.value);
    if (q > 1) {
        dom.orderQuantity.value = q - 1;
        updateOrderTotalPrice();
    }
});
dom.qtyPlusBtn.addEventListener('click', () => {
    let q = parseInt(dom.orderQuantity.value);
    if (q < 10) {
        dom.orderQuantity.value = q + 1;
        updateOrderTotalPrice();
    }
});

function updateOrderTotalPrice() {
    const product = state.products.find(p => p.id === parseInt(dom.orderProductIdInput.value));
    if (!product) return;
    
    const activePrice = (product.discount_price && product.discount_price > 0) ? product.discount_price : product.price;
    const qty = parseInt(dom.orderQuantity.value);
    const total = activePrice * qty;
    dom.orderTotalPriceDisplay.innerText = `${total.toLocaleString('ar-EG')} ج.م`;
}

dom.customerBookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pid = parseInt(dom.orderProductIdInput.value);
    const product = state.products.find(p => p.id === pid);
    if (!product) return;

    const activePrice = (product.discount_price && product.discount_price > 0) ? product.discount_price : product.price;
    const qty = parseInt(dom.orderQuantity.value);
    const totalPrice = activePrice * qty;

    const orderData = {
        customer_name: document.getElementById('custName').value,
        customer_phone: document.getElementById('custPhone').value,
        customer_address: document.getElementById('custAddress').value,
        product_id: pid,
        product_name: product.name,
        selected_size: dom.orderSelectSize.value,
        selected_color: dom.orderSelectColor.value,
        quantity: qty,
        total_price: totalPrice
    };

    try {
        // 1. Save order into hybrid database
        const res = await dbBridge.createOrder(orderData);
        closeModal(dom.orderModal);
        showToast('تم تسجيل طلب الحجز الخاص بك بنجاح!');
        
        // 2. Generate WhatsApp direct message text
        const waMsg = `السلام عليكم متجر *${state.settings.store_name}*، أرغب في تأكيد حجز المنتج التالي للتوصيل السريع:
        
🏁 *تفاصيل المنتج الرياضي:*
- المنتج: *${orderData.product_name}*
- القسم الرياضي: *${product.category}*
- المقاس المطلوب: *${orderData.selected_size}*
- اللون المحدد: *${orderData.selected_color}*
- الكمية: *${orderData.quantity}*
- السعر الإجمالي: *${orderData.total_price} ج.م*

📦 *بيانات العميل والشحن:*
- الاسم: *${orderData.customer_name}*
- الهاتف: *${orderData.customer_phone}*
- العنوان: *${orderData.customer_address}*

🔗 *رابط تأكيد وإدارة الطلب (للمشرف):*
${window.location.origin}/?orderId=${res.id || 'local'}

شكراً جزيلاً لكم، قيد الانتظار للتوصيل المباشر!`;

        // 3. Open WhatsApp Web / App API
        const cleanedWhatsApp = state.settings.whatsapp_number.replace(/\D/g, ''); // strip formatting
        const waUrl = `https://api.whatsapp.com/send?phone=${cleanedWhatsApp}&text=${encodeURIComponent(waMsg)}`;
        
        // Load data in background and launch WA link
        await loadData();
        window.open(waUrl, '_blank');
        
        dom.customerBookingForm.reset();
    } catch (err) {
        console.error(err);
        showToast('حدث خطأ في استكمال حجز الطلب، يرجى المحاولة لاحقاً.', 'error');
    }
});

// ==================== ADMIN PANEL LOGIC & WORKSPACE ====================

// Toggle panel login
dom.adminLoginToggleBtn.addEventListener('click', () => {
    if (state.adminLoggedIn) {
        // Toggle view between Buyer Dashboard and Admin View directly
        if (dom.adminDashboardSection.classList.contains('open')) {
            dom.adminDashboardSection.classList.remove('open');
        } else {
            dom.adminDashboardSection.classList.add('open');
            dom.adminDashboardSection.scrollIntoView({ behavior: 'smooth' });
        }
        updateAdminUI();
    } else {
        openModal(dom.adminLoginModal);
    }
});

// Password view toggles
dom.togglePassVisibilityBtn.addEventListener('click', () => {
    const isPass = dom.adminPasswordInput.type === 'password';
    dom.adminPasswordInput.type = isPass ? 'text' : 'password';
    dom.togglePassVisibilityBtn.innerHTML = isPass ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
});

// Authenticate login
dom.adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = dom.adminPasswordInput.value;
    
    try {
        const res = await dbBridge.adminLogin(password);
        state.adminLoggedIn = true;
        closeModal(dom.adminLoginModal);
        
        // Open dashboard view
        dom.adminDashboardSection.classList.add('open');
        showToast('مرحباً بك مجدداً مشرفنا مصطفى متولي!');
        
        // Load and populate views
        await loadData();
        dom.adminDashboardSection.scrollIntoView({ behavior: 'smooth' });
        
        dom.adminLoginForm.reset();

        // If accessed from a WhatsApp direct link, automatically redirect to the highlighted order row
        if (state.targetHighlightOrderId) {
            dom.btnNavInventory.click();
            setTimeout(() => {
                const ordersTab = document.querySelector('.admin-tab[data-tab="orders-mgmt"]');
                if (ordersTab) {
                    ordersTab.click();
                }
            }, 300);
        }
    } catch (err) {
        console.error(err);
        showToast(err.message || 'الرقم السري للمشرف غير صحيح!', 'error');
    }
});

// Logout action
dom.adminLogoutBtn.addEventListener('click', () => {
    state.adminLoggedIn = false;
    updateAdminUI();
    showToast('تم تسجيل الخروج بنجاح.');
    renderProducts(); // refresh cards to hide administrative icons
});

// Handle Admin Navigation tabs inside workspace
dom.adminTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        dom.adminTabs.forEach(t => t.classList.remove('active'));
        dom.adminTabContents.forEach(tc => tc.classList.remove('active'));
        
        tab.classList.add('active');
        const targetId = tab.dataset.tab;
        document.getElementById(`${targetId}-tab`).classList.add('active');
    });
});

// Render Admin inventory dashboard
function renderAdminInventoryTable() {
    dom.adminProductsTableBody.innerHTML = '';
    state.products.forEach(p => {
        const hasDiscount = p.discount_price !== null && p.discount_price > 0;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="table-product-cell">
                    <img src="${p.image_url}" class="table-product-img" onerror="this.src='assets/placeholder_product.png'">
                    <span class="table-product-name">${p.name}</span>
                </div>
            </td>
            <td>${p.category}</td>
            <td class="font-numbers">${p.price} ج.م</td>
            <td class="font-numbers">${hasDiscount ? p.discount_price + ' ج.م' : '-'}</td>
            <td class="font-numbers">${p.quantity} وحدة</td>
            <td class="font-numbers">${p.sold_quantity || 0} مباع</td>
            <td>
                <span class="order-status-badge ${p.is_3d ? 'completed' : 'cancelled'}">
                    ${p.is_3d ? 'مفعل 3D' : 'عادي 2D'}
                </span>
            </td>
            <td>
                <div class="table-actions-cell">
                    <button class="table-action-btn btn-edit-table" title="تعديل"><i class="fa-solid fa-pencil"></i></button>
                    <button class="table-action-btn btn-delete btn-delete-table" title="حذف"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </td>
        `;

        tr.querySelector('.btn-edit-table').addEventListener('click', () => triggerEditProduct(p));
        tr.querySelector('.btn-delete-table').addEventListener('click', () => triggerDeleteProduct(p.id, p.name));

        dom.adminProductsTableBody.appendChild(tr);
    });
}

// Render Admin booking orders dashboard
function renderAdminOrdersTable() {
    dom.adminOrdersTableBody.innerHTML = '';
    state.orders.forEach(o => {
        const tr = document.createElement('tr');
        
        let actionsHtml = '';
        if (o.status === 'pending') {
            actionsHtml = `
                <button class="btn btn-sm btn-primary btn-complete-order"><i class="fa-solid fa-circle-check"></i> تم التوصيل</button>
                <button class="btn btn-sm btn-danger btn-cancel-order"><i class="fa-solid fa-circle-xmark"></i> إلغاء</button>
            `;
        } else {
            actionsHtml = `<span class="text-gray">لا توجد عمليات</span>`;
        }

        tr.innerHTML = `
            <td class="font-numbers">#${o.id}</td>
            <td><strong>${o.customer_name}</strong></td>
            <td class="font-numbers">${o.customer_phone}</td>
            <td>${o.customer_address}</td>
            <td>${o.product_name}</td>
            <td>
                <span class="badge font-numbers bg-accent">مقاس: ${o.selected_size}</span>
                <span class="badge bg-accent">لون: ${o.selected_color}</span>
                <span class="badge font-numbers bg-accent">x${o.quantity}</span>
            </td>
            <td class="font-numbers text-green"><strong>${o.total_price} ج.م</strong></td>
            <td class="font-numbers">${o.order_date}</td>
            <td>
                <span class="order-status-badge ${o.status}">
                    ${o.status === 'pending' ? 'قيد الانتظار' : o.status === 'completed' ? 'تم التوصيل' : 'ملغي'}
                </span>
            </td>
            <td>
                <div class="table-actions-cell">
                    ${actionsHtml}
                </div>
            </td>
        `;

        if (o.status === 'pending') {
            tr.querySelector('.btn-complete-order').addEventListener('click', () => updateOrderStatus(o.id, 'completed'));
            tr.querySelector('.btn-cancel-order').addEventListener('click', () => updateOrderStatus(o.id, 'cancelled'));
        }

        // Highlight this row if it is the target highlighted order (from the WhatsApp direct link)
        if (state.targetHighlightOrderId && o.id === state.targetHighlightOrderId) {
            tr.classList.add('order-highlight');
            setTimeout(() => {
                tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 600);
        }

        dom.adminOrdersTableBody.appendChild(tr);
    });
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        await dbBridge.updateOrderStatus(orderId, newStatus);
        showToast(newStatus === 'completed' ? 'تم توصيل الطلب بنجاح وتحويل الإيرادات للمبيعات!' : 'تم إلغاء حجز الطلب.');
        await loadData();
    } catch (e) {
        console.error(e);
        showToast('حدث خطأ أثناء تحديث حالة الطلب.', 'error');
    }
}

// Drag and drop events for file inputs
const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
};
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dom.imageDropzone.addEventListener(eventName, preventDefaults, false);
});
dom.imageDropzone.addEventListener('dragover', () => dom.imageDropzone.style.borderColor = 'var(--neon-green)');
dom.imageDropzone.addEventListener('dragleave', () => dom.imageDropzone.style.borderColor = 'var(--border-color)');

dom.imageDropzone.addEventListener('drop', (e) => {
    dom.imageDropzone.style.borderColor = 'var(--border-color)';
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
        dom.pImage.files = files;
        handleSelectedFile(files[0]);
    }
});

dom.pImage.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleSelectedFile(e.target.files[0]);
    }
});

function handleSelectedFile(file) {
    dom.fileInfoText.innerText = `${file.name} (${Math.round(file.size / 1024)} KB)`;
    
    // File Preview simulator
    const reader = new FileReader();
    reader.onload = (e) => {
        dom.productImagePreview.src = e.target.result;
        dom.imageDropzone.style.display = 'none';
        dom.imagePreviewContainer.style.display = 'flex';
    };
    reader.readAsDataURL(file);
}

dom.removePreviewBtn.addEventListener('click', () => {
    dom.pImage.value = '';
    dom.productImagePreview.src = '';
    dom.fileInfoText.innerText = 'أقصى حجم للملف: 5 ميجابايت (JPG, PNG)';
    dom.imageDropzone.style.display = 'flex';
    dom.imagePreviewContainer.style.display = 'none';
});

// Open "Add Product Form"
dom.fabAddBtn.addEventListener('click', () => {
    resetProductForm();
    dom.addProductTabBtn.click();
    dom.adminDashboardSection.scrollIntoView({ behavior: 'smooth' });
});

dom.addNewProductHeaderBtn.addEventListener('click', () => {
    if (!state.adminLoggedIn) {
        openModal(dom.adminLoginModal);
    } else {
        resetProductForm();
        dom.adminDashboardSection.classList.add('open');
        dom.addProductTabBtn.click();
        dom.adminDashboardSection.scrollIntoView({ behavior: 'smooth' });
    }
});

function resetProductForm() {
    dom.addProductForm.reset();
    dom.editProductId.value = '';
    dom.formActionTitle.innerText = 'إضافة منتج رياضي جديد للمتجر';
    dom.saveProductBtn.innerText = 'حفظ ونشر المنتج في المتجر';
    dom.removePreviewBtn.click();
}

function triggerEditProduct(product) {
    resetProductForm();
    
    dom.editProductId.value = product.id;
    dom.formActionTitle.innerText = `تعديل تفاصيل المنتج: ${product.name}`;
    dom.saveProductBtn.innerText = 'حفظ التحديثات';

    dom.pName.value = product.name;
    dom.pCategory.value = product.category;
    dom.pPrice.value = product.price;
    dom.pDiscountPrice.value = product.discount_price || '';
    dom.pSizes.value = product.sizes;
    dom.pColors.value = product.colors;
    dom.pQuantity.value = product.quantity;
    dom.pIs3d.checked = product.is_3d === 1;
    
    if (product.image_url) {
        if (product.image_url.startsWith('data:') || product.image_url.startsWith('/') || product.image_url.startsWith('http')) {
            dom.productImagePreview.src = product.image_url;
            dom.imageDropzone.style.display = 'none';
            dom.imagePreviewContainer.style.display = 'flex';
        } else {
            dom.pImageUrl.value = product.image_url;
        }
    }

    // Switch view to add-product form tab
    dom.adminDashboardSection.classList.add('open');
    dom.addProductTabBtn.click();
    dom.adminDashboardSection.scrollIntoView({ behavior: 'smooth' });
}

// Add/Edit Product Submission
dom.addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const editId = dom.editProductId.value;
    const formData = new FormData();
    formData.append('name', dom.pName.value);
    formData.append('category', dom.pCategory.value);
    formData.append('price', dom.pPrice.value);
    formData.append('discount_price', dom.pDiscountPrice.value);
    formData.append('sizes', dom.pSizes.value);
    formData.append('colors', dom.pColors.value);
    formData.append('quantity', dom.pQuantity.value);
    formData.append('is_3d', dom.pIs3d.checked ? 1 : 0);
    formData.append('image_url', dom.pImageUrl.value);
    
    if (dom.pImage.files.length > 0) {
        formData.append('image', dom.pImage.files[0]);
    }

    try {
        await dbBridge.saveProduct(formData, editId ? editId : null);
        showToast(editId ? 'تم تحديث بيانات المنتج الرياضي بنجاح!' : 'تم إضافة ونشر المنتج الرياضي الجديد بالمتجر!');
        
        // Go back to Inventory manager tab
        dom.adminTabs[0].click();
        await loadData();
        resetProductForm();
    } catch (err) {
        console.error(err);
        showToast('حدث خطأ أثناء حفظ التحديثات في قاعدة البيانات.', 'error');
    }
});

dom.cancelEditBtn.addEventListener('click', () => {
    resetProductForm();
    dom.adminTabs[0].click();
});

// Delete product
async function triggerDeleteProduct(id, name) {
    if (confirm(`هل أنت متأكد تماماً من حذف المنتج الرياضي: "${name}" من المتجر وقاعدة البيانات نهائياً؟`)) {
        try {
            await dbBridge.deleteProduct(id);
            showToast('تم إزالة وحذف المنتج بنجاح.');
            await loadData();
        } catch (e) {
            console.error(e);
            showToast('فشل حذف المنتج.', 'error');
        }
    }
}

// Admin Settings updates
dom.adminSettingsBtn.addEventListener('click', () => {
    dom.setStoreName.value = state.settings.store_name;
    dom.setWhatsApp.value = state.settings.whatsapp_number;
    dom.setAddress.value = state.settings.store_address;
    openModal(dom.adminSettingsModal);
});

if (dom.adminDashPasswordBtn) {
    dom.adminDashPasswordBtn.addEventListener('click', () => {
        const changePasswordTab = document.querySelector('.admin-tab[data-tab="change-password-dash"]');
        if (changePasswordTab) {
            changePasswordTab.click();
            dom.dashChangePasswordForm.scrollIntoView({ behavior: 'smooth' });
        }
    });
}

dom.storeSettingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updatedSettings = {
        store_name: dom.setStoreName.value,
        whatsapp_number: dom.setWhatsApp.value,
        store_address: dom.setAddress.value
    };

    try {
        await dbBridge.saveSettings(updatedSettings);
        closeModal(dom.adminSettingsModal);
        showToast('تم حفظ الإعدادات وتفاصيل تواصل المتجر بنجاح!');
        await loadData();
    } catch (err) {
        console.error(err);
        showToast('فشل حفظ التحديثات الإدارية.', 'error');
    }
});

dom.changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const curr = dom.currPassword.value;
    const newPass = dom.newPassword.value;
    const confPass = dom.confirmNewPassword.value;

    if (newPass !== confPass) {
        showToast('كلمة المرور الجديدة غير متطابقة!', 'error');
        return;
    }

    try {
        await dbBridge.changePassword(curr, newPass);
        closeModal(dom.adminSettingsModal);
        showToast('تم تحديث وتأمين كلمة المرور السرية بنجاح!');
        dom.changePasswordForm.reset();
    } catch (err) {
        console.error(err);
        showToast(err.message || 'كلمة المرور الحالية غير صحيحة.', 'error');
    }
});

dom.dashChangePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const curr = dom.dashCurrPassword.value;
    const newPass = dom.dashNewPassword.value;
    const confPass = dom.dashConfirmNewPassword.value;

    if (newPass !== confPass) {
        showToast('كلمة المرور الجديدة غير متطابقة!', 'error');
        return;
    }

    try {
        await dbBridge.changePassword(curr, newPass);
        showToast('تم تحديث وتأمين كلمة المرور السرية بنجاح!');
        dom.dashChangePasswordForm.reset();
        
        // Go back to the first tab (Inventory)
        dom.adminTabs[0].click();
    } catch (err) {
        console.error(err);
        showToast(err.message || 'كلمة المرور الحالية غير صحيحة.', 'error');
    }
});

// ==================== FILTERING & SEARCH CONTROLS ====================

// Search typing action
dom.productSearchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    renderProducts();
});

// Category selection filters
dom.categoriesWrapper.addEventListener('click', (e) => {
    const item = e.target.closest('.category-item');
    if (!item) return;
    
    // Toggle active classes
    document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    
    state.selectedCategory = item.dataset.category;
    renderProducts();
    renderActiveFilters();
});

dom.clearCategoryFilterBtn.addEventListener('click', () => {
    document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
    document.querySelector('[data-category="all"]').classList.add('active');
    state.selectedCategory = 'all';
    renderProducts();
    renderActiveFilters();
});

// Show Filters toggle Panel
dom.toggleFiltersBtn.addEventListener('click', () => {
    dom.advancedFiltersPanel.classList.toggle('open');
    dom.toggleFiltersBtn.classList.toggle('active');
});

// Advanced Filters actions
dom.filterAvailability.addEventListener('change', (e) => {
    state.filters.availability = e.target.value;
    renderProducts();
    renderActiveFilters();
});
dom.filterDiscount.addEventListener('change', (e) => {
    state.filters.discount = e.target.value;
    renderProducts();
    renderActiveFilters();
});
dom.filterSort.addEventListener('change', (e) => {
    state.filters.sort = e.target.value;
    renderProducts();
});

function renderActiveFilters() {
    dom.activeFilterTags.innerHTML = '';
    
    if (state.selectedCategory !== 'all') {
        createFilterTag(`القسم: ${state.selectedCategory}`, () => {
            document.querySelector('[data-category="all"]').click();
        });
    }
    
    if (state.filters.availability !== 'all') {
        const label = state.filters.availability === 'in_stock' ? 'المتوفر فقط' : 'غير المتوفر';
        createFilterTag(`التوفر: ${label}`, () => {
            dom.filterAvailability.value = 'all';
            state.filters.availability = 'all';
            renderProducts();
            renderActiveFilters();
        });
    }

    if (state.filters.discount !== 'all') {
        createFilterTag('العروض والخصومات فقط', () => {
            dom.filterDiscount.value = 'all';
            state.filters.discount = 'all';
            renderProducts();
            renderActiveFilters();
        });
    }
}

function createFilterTag(label, removeCallback) {
    const tag = document.createElement('div');
    tag.className = 'filter-tag';
    tag.innerHTML = `
        <span>${label}</span>
        <i class="fa-solid fa-circle-xmark"></i>
    `;
    tag.querySelector('i').addEventListener('click', removeCallback);
    dom.activeFilterTags.appendChild(tag);
}

// ==================== SMART ADIDAS 3D STUDIO SCANNERS ====================

dom.open3DStudioBtn.addEventListener('click', () => {
    // Populate select items options
    dom.selectStudioProduct.innerHTML = '';
    state.products.forEach(p => {
        dom.selectStudioProduct.innerHTML += `<option value="${p.id}" data-img="${p.image_url}">${p.name} (${p.category})</option>`;
    });
    
    // Set default initial view
    updateStudioPreview();
    
    dom.studioSuccessAlert.style.display = 'none';
    dom.scanBadge.className = 'status-badge';
    dom.scanBadge.innerHTML = '<i class="fa-solid fa-cube"></i> جاهز للمحاكاة ثلاثية الأبعاد';
    
    openModal(dom.studio3DModal);
});

dom.selectStudioProduct.addEventListener('change', updateStudioPreview);

function updateStudioPreview() {
    const opt = dom.selectStudioProduct.options[dom.selectStudioProduct.selectedIndex];
    if (opt) {
        dom.studioActiveImg.src = opt.dataset.img;
    }
}

// Interactive Depth drag
dom.studioRangeDepth.addEventListener('input', (e) => {
    const val = e.target.value;
    dom.depthValText.innerText = `${val}px`;
    // Update shadow properties or visual depth based on range input
    dom.object3DWrapper.style.transform = `scale(1.05) translate3d(0, 0, ${val}px)`;
});

// Run scanner animation simulator
dom.btnRun3DScanner.addEventListener('click', () => {
    dom.scannerLaser.classList.add('scanning');
    dom.scanBadge.className = 'status-badge scanning';
    dom.scanBadge.innerHTML = '<i class="fa-solid fa-microchip fa-spin"></i> جاري التجسيم ثلاثي الأبعاد...';
    dom.btnRun3DScanner.disabled = true;

    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 20;
        if (progress === 40) {
            dom.scanBadge.innerHTML = '<i class="fa-solid fa-microchip fa-spin"></i> فك الأبعاد السطحية...';
        } else if (progress === 80) {
            dom.scanBadge.innerHTML = '<i class="fa-solid fa-microchip fa-spin"></i> معايرة الظلال الرياضية...';
        }
        
        if (progress >= 100) {
            clearInterval(progressInterval);
            complete3DScan();
        }
    }, 600);
});

async function complete3DScan() {
    dom.scannerLaser.classList.remove('scanning');
    dom.scanBadge.className = 'status-badge success';
    dom.scanBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> تم التجسيم 3D بنجاح!';
    dom.btnRun3DScanner.disabled = false;
    dom.studioSuccessAlert.style.display = 'flex';
    
    const pid = parseInt(dom.selectStudioProduct.value);
    
    // Save state modification
    const product = state.products.find(p => p.id === pid);
    if (product) {
        try {
            // Modify product inside base via FormData API mock
            const formData = new FormData();
            formData.append('name', product.name);
            formData.append('category', product.category);
            formData.append('price', product.price);
            formData.append('discount_price', product.discount_price || '');
            formData.append('sizes', product.sizes);
            formData.append('colors', product.colors);
            formData.append('quantity', product.quantity);
            formData.append('is_3d', 1); // Activate 3D !
            formData.append('image_url', product.image_url);

            await dbBridge.saveProduct(formData, pid);
            await loadData();
            showToast(`تم تفعيل العرض ثلاثي الأبعاد بنجاح لـ ${product.name}!`);
        } catch (e) {
            console.error(e);
        }
    }
}

// 3D Studio Mouse interactive drag-rotation
let isDraggingStudio = false;
let startX, startY;
let currentRotationY = 0;
let currentRotationX = 0;

dom.object3DWrapper.addEventListener('mousedown', (e) => {
    isDraggingStudio = true;
    startX = e.clientX;
    startY = e.clientY;
    dom.object3DWrapper.style.transition = 'none';
});

window.addEventListener('mouseup', () => {
    if (isDraggingStudio) {
        isDraggingStudio = false;
        dom.object3DWrapper.style.transition = 'transform 0.5s ease';
    }
});

window.addEventListener('mousemove', (e) => {
    if (!isDraggingStudio) return;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    currentRotationY += deltaX * 0.5;
    currentRotationX = Math.max(-30, Math.min(30, currentRotationX - deltaY * 0.5)); // limits pitch axis
    
    dom.studioActiveImg.style.transform = `rotateY(${currentRotationY}deg) rotateX(${currentRotationX}deg)`;
    
    startX = e.clientX;
    startY = e.clientY;
});

// Mobile Touch drag support for 3D Studio
dom.object3DWrapper.addEventListener('touchstart', (e) => {
    isDraggingStudio = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    dom.object3DWrapper.style.transition = 'none';
});

dom.object3DWrapper.addEventListener('touchend', () => {
    isDraggingStudio = false;
    dom.object3DWrapper.style.transition = 'transform 0.5s ease';
});

dom.object3DWrapper.addEventListener('touchmove', (e) => {
    if (!isDraggingStudio) return;
    const deltaX = e.touches[0].clientX - startX;
    const deltaY = e.touches[0].clientY - startY;
    
    currentRotationY += deltaX * 0.6;
    currentRotationX = Math.max(-30, Math.min(30, currentRotationX - deltaY * 0.6));
    
    dom.studioActiveImg.style.transform = `rotateY(${currentRotationY}deg) rotateX(${currentRotationX}deg)`;
    
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
});

// ==================== NAV ACTIONS & TAB TRIGGERS ====================

// Bottom nav triggers
dom.btnNavHome.addEventListener('click', () => {
    dom.btnNavHome.classList.add('active');
    dom.btnNavInventory.classList.remove('active');
    dom.btnNavOffers.classList.remove('active');
    dom.btnNavContact.classList.remove('active');
    
    // Close dashboard and show store main content
    dom.adminDashboardSection.classList.remove('open');
    updateAdminUI();
    
    // Smooth reset category filter
    dom.clearCategoryFilterBtn.click();
    dom.productsGrid.scrollIntoView({ behavior: 'smooth' });
});

dom.btnNavInventory.addEventListener('click', () => {
    if (!state.adminLoggedIn) {
        showToast('يرجى تسجيل دخول المسؤول أولاً للوصول إلى تفاصيل المخزن.', 'error');
        openModal(dom.adminLoginModal);
    } else {
        dom.btnNavInventory.classList.add('active');
        dom.btnNavHome.classList.remove('active');
        dom.btnNavOffers.classList.remove('active');
        dom.btnNavContact.classList.remove('active');
        
        // Open dashboard and hide store main content
        dom.adminDashboardSection.classList.add('open');
        updateAdminUI();
        
        dom.adminTabs[0].click(); // open Inventory sheet
        dom.adminDashboardSection.scrollIntoView({ behavior: 'smooth' });
    }
});

dom.btnNavOffers.addEventListener('click', () => {
    dom.btnNavOffers.classList.add('active');
    dom.btnNavHome.classList.remove('active');
    dom.btnNavInventory.classList.remove('active');
    dom.btnNavContact.classList.remove('active');
    
    // Close dashboard and show store main content
    dom.adminDashboardSection.classList.remove('open');
    updateAdminUI();
    
    // Toggle discount filter
    dom.filterDiscount.value = 'discounted';
    state.filters.discount = 'discounted';
    renderProducts();
    renderActiveFilters();
    
    dom.productsGrid.scrollIntoView({ behavior: 'smooth' });
});

dom.btnNavContact.addEventListener('click', () => {
    dom.btnNavContact.classList.add('active');
    dom.btnNavHome.classList.remove('active');
    dom.btnNavInventory.classList.remove('active');
    dom.btnNavOffers.classList.remove('active');
    
    // Close dashboard and show store main content
    dom.adminDashboardSection.classList.remove('open');
    updateAdminUI();
    
    dom.contactWhatsAppBtn.click();
});

dom.contactWhatsAppBtn.addEventListener('click', () => {
    const cleanedWhatsApp = state.settings.whatsapp_number.replace(/\D/g, '');
    const waUrl = `https://wa.me/${cleanedWhatsApp}?text=${encodeURIComponent('السلام عليكم متجر أبو تريكة، أرغب في الاستفسار عن المنتجات الرياضية المتاحة لديك.')}`;
    window.open(waUrl, '_blank');
});

// Modal close button bindings
dom.closeLoginModalBtn.addEventListener('click', () => closeModal(dom.adminLoginModal));
dom.closeOrderModalBtn.addEventListener('click', () => closeModal(dom.orderModal));
dom.closeSettingsModalBtn.addEventListener('click', () => closeModal(dom.adminSettingsModal));
dom.closeStudioModalBtn.addEventListener('click', () => closeModal(dom.studio3DModal));
dom.closeDetailsModalBtn.addEventListener('click', () => closeModal(dom.productDetailsModal));

// Close modals when clicking overlay area
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        closeModal(e.target);
    }
});

// ==================== PRODUCT DETAILS SHOWCASE & ZOOM & RECOVERY CONTROLS ====================

function generateAuthenticitySpecs(product) {
    const name = product.name;
    const category = product.category;
    
    // Deterministic specs generator based on product details
    let origin = 'فيتنام - جودة رياضية عالية';
    let fabric = 'خيوط معالجة Dri-FIT، بوليستر 100%';
    let warranty = 'ضمان 3 أشهر ضد عيوب الصناعة';
    let serial = `ART-VN-${100000 + (product.id * 893)}-SP`;
    let specs = [
        'معزز بتقنية التهوية الرياضية الفائقة لطرد العرق أثناء الجري أو اللعب.',
        'خياطة احترافية مزدوجة الحواف لتوفير متانة قصوى أثناء الحركات الصعبة.',
        'مقاوم للبهتان وتغير الألوان، خفيف الوزن وصديق للبيئة.',
        'تعليمات الغسيل: غسيل بارد يدوي أو آلي، تجنب الكي بدرجات حرارة عالية.'
    ];

    if (category === 'أحذية') {
        origin = 'إيطاليا - مصنع النخبة الرياضي';
        fabric = 'جلد صناعي فاخر Microfiber + نعل مطاطي Phylon ماص للصدمات';
        warranty = 'ضمان 6 أشهر شامل جودة النعل واللصق';
        serial = `SKU-IT-${200000 + (product.id * 754)}-SH`;
        specs = [
            'نعل متوسط مرن بتقنية التوسيد الهوائي لتخفيف الضغط على الركبتين.',
            'بطانة داخلية ناعمة معالجة بمواد مضادة للميكروبات لمنع الروائح.',
            'تصميم انسيابي يمنح ثباتاً فائقاً على الملاعب العشبية والإسفلتية.',
            'تعليمات العناية: ينظف بقطعة قماش رطبة، تجنب الغمر بالكامل في الماء.'
        ];
    } else if (category === 'إكسسوارات') {
        origin = 'تايوان - جودة هندسية متطورة';
        fabric = 'ألياف متينة مركبة مقاومة للمياه والصدمات';
        warranty = 'ضمان سنة كاملة ضد أي عيوب تشغيلية';
        serial = `ACC-TW-${300000 + (product.id * 632)}-EX`;
        specs = [
            'مصنوع من خامات متينة للغاية تتحمل الاستخدام اليومي الشاق في صالات الجيم.',
            'مقاومة ممتازة للخدش والتآكل مع أجزاء معدنية غير قابلة للصدأ.',
            'تصميم ذكي متعدد الجيوب للتنظيم السلس وسعة داخلية ممتازة.',
            'تعليمات العناية: ينصح بالتنظيف الجاف وتجنب التعرض المباشر لأشعة الشمس لفترات طويلة.'
        ];
    } else if (name.includes('قطن') || name.includes('سترة')) {
        origin = 'مصر - أجود أنواع القطن طويل التيلة';
        fabric = 'قطن طبيعي فاخر 95% + ألياف مرنة Lycra 5%';
        warranty = 'ضمان 4 أشهر ضد التوبير وتغير المقاس';
        serial = `TEX-EG-${400000 + (product.id * 921)}-AP`;
        specs = [
            'ملمس ناعم للغاية ولطيف على البشرة الحساسة مع راحة لا مثيل لها.',
            'مرونة كافية لتسهيل الحركة والتمارين اليومية.',
            'مقاومة ممتازة للتوبير مع صباغة ثابتة لا تتأثر بالكلور المخفف.',
            'تعليمات الغسيل: غسيل بارد مع ألوان مماثلة، يفضل الكي من الداخل.'
        ];
    }

    // Generate a barcode number based on the product ID
    const barcode = `6221025${String(100000 + product.id).slice(-6)}`;

    return { origin, fabric, warranty, serial, specs, barcode };
}

function triggerProductDetails(product) {
    dom.detailsProductName.innerText = product.name;
    dom.detailsProductCategory.innerText = product.category;
    dom.detailsActiveImg.src = product.image_url;
    
    // Zoom element resets
    dom.detailsActiveImg.style.transformOrigin = 'center center';
    dom.detailsActiveImg.style.transform = 'scale(1)';
    dom.detailsActiveImg.style.filter = '';
    
    const hasDiscount = product.discount_price !== null && product.discount_price > 0;
    const activePrice = hasDiscount ? product.discount_price : product.price;
    
    dom.detailsProductPrice.innerText = `${activePrice} ج.م`;
    
    if (hasDiscount) {
        dom.detailsProductOldPrice.style.display = 'inline';
        dom.detailsProductOldPrice.innerText = `${product.price} ج.م`;
        const discountPercent = Math.round(((product.price - product.discount_price) / product.price) * 100);
        dom.detailsDiscountPercent.style.display = 'inline-block';
        dom.detailsDiscountPercent.innerText = `-${discountPercent}% خصم`;
    } else {
        dom.detailsProductOldPrice.style.display = 'none';
        dom.detailsDiscountPercent.style.display = 'none';
    }

    // Available Stock Status
    let stockText = '';
    let stockClass = '';
    if (product.quantity === 0) {
        stockText = '<i class="fa-solid fa-circle"></i> غير متوفر في المخزن حالياً';
        stockClass = 'stock-status-badge out-of-stock';
        dom.detailsBookBtn.disabled = true;
        dom.detailsBookBtn.innerHTML = '<i class="fa-solid fa-ban"></i> نفدت الكمية من المخزن';
    } else {
        stockText = `<i class="fa-solid fa-circle"></i> متوفر في المخزن (${product.quantity} قطعة متبقية)`;
        stockClass = 'stock-status-badge in-stock';
        dom.detailsBookBtn.disabled = false;
        dom.detailsBookBtn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> الانتقال للحجز الفوري والتوصيل';
    }
    dom.detailsStockStatus.className = stockClass;
    dom.detailsStockStatus.innerHTML = stockText;

    // Generate Dynamic Authenticity details
    const auth = generateAuthenticitySpecs(product);
    dom.authOrigin.innerText = auth.origin;
    dom.authFabric.innerText = auth.fabric;
    dom.authWarranty.innerText = auth.warranty;
    dom.authSerial.innerText = auth.serial;
    dom.authBarcodeText.innerText = auth.barcode;

    // Populate spec details
    dom.detailsSpecsList.innerHTML = '';
    auth.specs.forEach(s => {
        dom.detailsSpecsList.innerHTML += `<li>${s}</li>`;
    });

    // Populate thumbnails
    dom.detailsThumbnails.innerHTML = '';
    // Main thumbnail
    const thumbMain = document.createElement('div');
    thumbMain.className = 'thumbnail-item active';
    thumbMain.innerHTML = `<img src="${product.image_url}" onerror="this.src='assets/placeholder_product.png'">`;
    thumbMain.addEventListener('click', () => {
        document.querySelectorAll('.thumbnail-item').forEach(el => el.classList.remove('active'));
        thumbMain.classList.add('active');
        dom.detailsActiveImg.src = product.image_url;
        dom.detailsActiveImg.style.transformOrigin = 'center center';
        dom.detailsActiveImg.style.transform = 'scale(1)';
        dom.detailsActiveImg.style.filter = '';
    });
    dom.detailsThumbnails.appendChild(thumbMain);

    // Mock alternative angles to look like a premium gallery!
    const mockAngles = [
        { suffix: '_side', icon: 'fa-shoe-prints' },
        { suffix: '_detail', icon: 'fa-circle-dot' }
    ];
    mockAngles.forEach((angle, idx) => {
        const thumbAngle = document.createElement('div');
        thumbAngle.className = 'thumbnail-item';
        thumbAngle.innerHTML = `<img src="${product.image_url}" style="filter: opacity(0.85) hue-rotate(${idx * 45}deg);" onerror="this.src='assets/placeholder_product.png'">`;
        thumbAngle.addEventListener('click', () => {
            document.querySelectorAll('.thumbnail-item').forEach(el => el.classList.remove('active'));
            thumbAngle.classList.add('active');
            dom.detailsActiveImg.src = product.image_url;
            dom.detailsActiveImg.style.transformOrigin = 'center center';
            dom.detailsActiveImg.style.transform = 'scale(1)';
            dom.detailsActiveImg.style.filter = `hue-rotate(${idx * 45}deg)`;
        });
        dom.detailsThumbnails.appendChild(thumbAngle);
    });

    // Handle book button inside details modal
    dom.detailsBookBtn.onclick = () => {
        closeModal(dom.productDetailsModal);
        triggerBooking(product);
    };

    openModal(dom.productDetailsModal);
}

// Microscopic HD Zoom mousemove calculations
if (dom.detailsZoomContainer) {
    const container = dom.detailsZoomContainer;
    const img = dom.detailsActiveImg;

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;
        
        img.style.transformOrigin = `${xPercent}% ${yPercent}%`;
        img.style.transform = 'scale(2.5)';
    });

    container.addEventListener('mouseleave', () => {
        img.style.transformOrigin = 'center center';
        img.style.transform = 'scale(1)';
    });

    // Touch Support for mobile HD zoom
    container.addEventListener('touchmove', (e) => {
        if (e.touches.length === 0) return;
        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        const xPercent = Math.max(0, Math.min(100, (x / rect.width) * 100));
        const yPercent = Math.max(0, Math.min(100, (y / rect.height) * 100));
        
        img.style.transformOrigin = `${xPercent}% ${yPercent}%`;
        img.style.transform = 'scale(2.5)';
    });

    container.addEventListener('touchend', () => {
        img.style.transformOrigin = 'center center';
        img.style.transform = 'scale(1)';
    });
}

// Password Recovery Form triggers
if (dom.forgotPasswordBtn) {
    dom.forgotPasswordBtn.addEventListener('click', () => {
        dom.adminLoginForm.style.display = 'none';
        dom.adminRecoveryForm.style.display = 'block';
    });
}

if (dom.backToLoginBtn) {
    dom.backToLoginBtn.addEventListener('click', () => {
        dom.adminLoginForm.style.display = 'block';
        dom.adminRecoveryForm.style.display = 'none';
    });
}

if (dom.adminRecoveryForm) {
    dom.adminRecoveryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phone = dom.adminRecoveryPhoneInput.value.trim();
        const newPass = dom.recoveryNewPassword.value;
        const confirmPass = dom.recoveryConfirmNewPassword.value;

        if (newPass !== confirmPass) {
            showToast('الرقم السري الجديد غير متطابق!', 'error');
            return;
        }

        try {
            await dbBridge.recoverPassword(phone, newPass);
            showToast('تم استعادة وحفظ الرقم السري الجديد للمسؤول بنجاح! جاري تسجيل الدخول...');
            
            // Automatically log in the admin
            state.adminLoggedIn = true;
            closeModal(dom.adminLoginModal);
            
            // Reset view
            dom.adminLoginForm.style.display = 'block';
            dom.adminRecoveryForm.style.display = 'none';
            dom.adminRecoveryForm.reset();
            
            // Open dashboard view
            dom.adminDashboardSection.classList.add('open');
            await loadData();
            dom.adminDashboardSection.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            console.error(err);
            showToast(err.message || 'رقم الواتساب المدخل غير مطابق للرقم المسجل!', 'error');
        }
    });
}

// ==================== SIDEBAR NAV DRAWER TRIGGERS ====================
function openDrawer() {
    if (dom.sidebarDrawer && dom.sidebarDrawerOverlay) {
        dom.sidebarDrawerOverlay.style.display = 'block';
        setTimeout(() => {
            dom.sidebarDrawerOverlay.classList.add('open');
            dom.sidebarDrawer.classList.add('open');
        }, 10);
    }
}

function closeDrawer() {
    if (dom.sidebarDrawer && dom.sidebarDrawerOverlay) {
        dom.sidebarDrawerOverlay.classList.remove('open');
        dom.sidebarDrawer.classList.remove('open');
        setTimeout(() => {
            dom.sidebarDrawerOverlay.style.display = 'none';
        }, 300);
    }
}

function updateDrawerActiveItem(activeId) {
    const items = document.querySelectorAll('.drawer-menu-item');
    items.forEach(item => {
        if (item.id === activeId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Drawer overlay and toggle button bindings
if (dom.navToggleBtn) {
    dom.navToggleBtn.addEventListener('click', openDrawer);
}
if (dom.closeDrawerBtn) {
    dom.closeDrawerBtn.addEventListener('click', closeDrawer);
}
if (dom.sidebarDrawerOverlay) {
    dom.sidebarDrawerOverlay.addEventListener('click', closeDrawer);
}

// Drawer links event handling
if (dom.drawerHomeLink) {
    dom.drawerHomeLink.addEventListener('click', (e) => {
        e.preventDefault();
        closeDrawer();
        updateDrawerActiveItem('drawerHomeLink');
        dom.btnNavHome.click();
    });
}

if (dom.drawerContactLink) {
    dom.drawerContactLink.addEventListener('click', (e) => {
        e.preventDefault();
        closeDrawer();
        dom.contactWhatsAppBtn.click();
    });
}

if (dom.drawerInventoryLink) {
    dom.drawerInventoryLink.addEventListener('click', (e) => {
        e.preventDefault();
        closeDrawer();
        updateDrawerActiveItem('drawerInventoryLink');
        dom.btnNavInventory.click();
    });
}

if (dom.drawerSettingsLink) {
    dom.drawerSettingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        closeDrawer();
        dom.adminSettingsBtn.click();
    });
}

if (dom.drawerPasswordLink) {
    dom.drawerPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        closeDrawer();
        if (!dom.adminDashboardSection.classList.contains('open')) {
            dom.btnNavInventory.click();
        }
        setTimeout(() => {
            dom.adminDashPasswordBtn.click();
        }, 100);
    });
}

if (dom.drawerLogoutLink) {
    dom.drawerLogoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        closeDrawer();
        dom.adminLogoutBtn.click();
    });
}

// ==================== APP BOOTSTRAP INIT ====================

window.addEventListener('DOMContentLoaded', async () => {
    // 1. Detect environment
    await checkBackendConnection();
    
    // 2. Load settings and data
    await loadData();

    // 3. Check for order highlighting link query parameter (/?orderId=XXX)
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    if (orderId) {
        state.targetHighlightOrderId = parseInt(orderId);
        if (!state.adminLoggedIn) {
            showToast(`طلب الحجز رقم #${orderId} مطلوب مراجعته وتأكيده. الرجاء تسجيل الدخول أولاً.`, 'info');
            openModal(dom.adminLoginModal);
        } else {
            // Admin already logged in, automatically switch to Orders Management tab
            dom.btnNavInventory.click();
            setTimeout(() => {
                const ordersTab = document.querySelector('.admin-tab[data-tab="orders-mgmt"]');
                if (ordersTab) ordersTab.click();
            }, 300);
        }
    }
});
