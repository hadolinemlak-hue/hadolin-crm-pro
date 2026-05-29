/* ===== EmlakPro - Ana Uygulama Dosyası ===== */

// ===== STATE =====
const state = {
    portfolios: [],
    customers: [],
    matches: [],
    currentPage: 'dashboard',
    editingPortfolio: null,
    editingCustomer: null,
    tempPhotos: [], // { url, type: 'file'|'url' }
};

// ===== API HELPERS =====
const api = {
    async get(table, params = {}) {
        const q = new URLSearchParams({ limit: 200, ...params });
        const res = await fetch(`tables/${table}?${q}`);
        return res.json();
    },
    async post(table, data) {
        const res = await fetch(`tables/${table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async put(table, id, data) {
        const res = await fetch(`tables/${table}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async del(table, id) {
        await fetch(`tables/${table}/${id}`, { method: 'DELETE' });
    },
};

// ===== UTILS =====
const TUR_LABELS = {
    daire: 'Daire', arsa: 'Arsa', ofis: 'Ofis',
    fabrika_arsasi: 'Fabrika Arsası', fabrika: 'Fabrika',
};
const DURUM_LABELS = { satilik: 'Satılık', kiralik: 'Kiralık' };
const STATUS_LABELS = { aktif: 'Aktif', pasif: 'Pasif', tamamlandi: 'Tamamlandı' };
const ISITMA_LABELS = {
    dogalgaz: 'Doğalgaz', merkezi: 'Merkezi', klima: 'Klima',
    yerden: 'Yerden Isıtma', yok: 'Isıtma Yok',
};

function formatPrice(n) {
    if (!n && n !== 0) return '-';
    return Number(n).toLocaleString('tr-TR') + ' ₺';
}

function formatPhoneForCall(phone) {
    return 'tel:' + phone.replace(/\s/g, '');
}

function formatPhoneForWhatsApp(phone) {
    let p = phone.replace(/\D/g, '');
    if (p.startsWith('0')) p = p.slice(1);
    if (!p.startsWith('90')) p = '90' + p;
    return 'https://wa.me/' + p;
}

function getFirstPhoto(photos) {
    if (!photos || !Array.isArray(photos) || photos.length === 0) return null;
    return photos[0];
}

function toast(msg, type = 'success') {
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle' };
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fas ${icons[type] || icons.success}"></i> ${msg}`;
    container.appendChild(t);
    setTimeout(() => t.style.opacity = '0', 2500);
    setTimeout(() => t.remove(), 2800);
}

function openModal(id) {
    const m = document.getElementById(id);
    if(m) m.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    const m = document.getElementById(id);
    if(m) m.classList.remove('active');
    document.body.style.overflow = '';
}

// ===== NAVIGATION =====
function navigate(page) {
    state.currentPage = page;
    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.toggle('active', n.dataset.page === page);
    });
    document.querySelectorAll('.page').forEach(p => {
        p.classList.add('hidden');
    });
    const el = document.getElementById('page-' + page);
    if (el) el.classList.remove('hidden');

    const titles = {
        dashboard: 'Dashboard', portfolios: 'Portföyler',
        customers: 'Müşteriler', matching: 'Eşleştirme'
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;

    if (page === 'dashboard') renderDashboard();
    if (page === 'portfolios') renderPortfolios();
    if (page === 'customers') renderCustomers();
    if (page === 'matching') renderMatching();

    closeMobileSidebar();
}

function openMobileSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('active');
}

function closeMobileSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

// ===== LOAD DATA =====
async function loadAll() {
    try {
        const [pRes, cRes, mRes] = await Promise.all([
            api.get('portfolios'),
            api.get('customers'),
            api.get('matches'),
        ]);
        state.portfolios = pRes.data || [];
        state.customers = cRes.data || [];
        state.matches = mRes.data || [];
        renderDashboard();
        updateNotifBadge();
    } catch (e) {
        console.error(e);
    }
}

function updateNotifBadge() {
    const pending = state.matches.filter(m => m.durum === 'onay_bekliyor').length;
    const badge = document.getElementById('notifBadge');
    if (badge) {
        badge.textContent = pending;
        badge.style.display = pending > 0 ? 'block' : 'none';
    }
}

// ===== SEARCH MTR ENGINE =====
function handleGlobalSearch(val) {
    const q = val.trim().toLowerCase();
    if (state.currentPage === 'dashboard') {
        renderDashboard(); 
    } else if (state.currentPage === 'portfolios') {
        renderPortfolios(document.getElementById('filterTur').value, document.getElementById('filterDurum').value, q);
    } else if (state.currentPage === 'customers') {
        renderCustomers(document.getElementById('filterCustTur').value, document.getElementById('filterCustDurum').value, q);
    } else if (state.currentPage === 'matching') {
        renderMatching(q);
    }
}

// ===== DASHBOARD =====
function renderDashboard() {
    document.getElementById('stat-portfolios').textContent = state.portfolios.length;
    document.getElementById('stat-customers').textContent = state.customers.filter(c => c.durum !== 'tamamlandi').length;
    document.getElementById('stat-matches').textContent = state.matches.length;
    document.getElementById('stat-satilik').textContent = state.portfolios.filter(p => p.durum === 'satilik').length;

    const rp = document.getElementById('recentPortfolios');
    const recent = [...state.portfolios].sort((a, b) => b.created_at - a.created_at).slice(0, 5);
    if (recent.length === 0) {
        rp.innerHTML = '<div class="empty-state"><i class="fas fa-home"></i><p>Henüz portföy eklenmemiş</p></div>';
    } else {
        rp.innerHTML = recent.map(p => {
            const photo = getFirstPhoto(p.fotograflar);
            return `
            <div class="recent-item" onclick="navigate('portfolios')">
                <div class="recent-thumb">
                    ${photo ? `<img src="${photo}" alt="">` : `<i class="fas fa-home"></i>`}
                </div>
                <div class="recent-info">
                    <div class="recent-title">${p.baslik || 'İsimsiz Portföy'}</div>
                    <div class="recent-sub">${p.ilce || ''} ${p.il || ''} · ${TUR_LABELS[p.tur] || p.tur}</div>
                </div>
                <div class="recent-price">${formatPrice(p.fiyat)}</div>
            </div>`;
        }).join('');
    }

    const rc = document.getElementById('recentCustomers');
    const recentC = [...state.customers].sort((a, b) => b.created_at - a.created_at).slice(0, 5);
    if (recentC.length === 0) {
        rc.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>Henüz müşteri eklenmemiş</p></div>';
    } else {
        rc.innerHTML = recentC.map(c => `
            <div class="recent-item" onclick="navigate('customers')">
                <div class="recent-thumb"><i class="fas fa-user"></i></div>
                <div class="recent-info">
                    <div class="recent-title">${c.ad} ${c.soyad}</div>
                    <div class="recent-sub">${TUR_LABELS[c.istek_tur] || ''} · ${DURUM_LABELS[c.istek_durum] || ''}</div>
                </div>
                <div style="font-size:.75rem;color:var(--text-muted)">${formatPrice(c.butce_min)} - ${formatPrice(c.butce_max)}</div>
            </div>`).join('');
    }
}

// ===== PORTFOLIOS =====
function renderPortfolios(filterTur = '', filterDurum = '', searchQ = '') {
    const grid = document.getElementById('portfolioGrid');
    let list = state.portfolios;
    if (filterTur) list = list.filter(p => p.tur === filterTur);
    if (filterDurum) list = list.filter(p => p.durum === filterDurum);
    if (searchQ) {
        list = list.filter(p => 
            (p.baslik && p.baslik.toLowerCase().includes(searchQ)) ||
            (p.ilce && p.ilce.toLowerCase().includes(searchQ)) ||
            (p.il && p.il.toLowerCase().includes(searchQ))
        );
    }

    if (list.length === 0) {
        grid.innerHTML = `
        <div class="empty-state full-width">
            <i class="fas fa-home"></i>
            <p>Portföy bulunamadı</p>
            <button class="btn btn-primary" onclick="showPortfolioForm()">
                <i class="fas fa-plus"></i> İlk Portföyü Ekle
            </button>
        </div>`;
        return;
    }

    grid.innerHTML = list.map(p => {
        const photo = getFirstPhoto(p.fotograflar);
        const photoCount = (p.fotograflar || []).length;
        return `
        <div class="portfolio-card" onclick="showPortfolioDetail('${p.id}')">
            <div style="position:relative">
                ${photo
                    ? `<div class="portfolio-image"><img src="${photo}" alt="${p.baslik}" onerror="this.parentElement.innerHTML=getPlaceholder()"></div>`
                    : `<div class="portfolio-image-placeholder"><i class="fas fa-building"></i><span>Fotoğraf Yok</span></div>`
                }
                <div class="portfolio-badges">
                    <span class="badge-pill badge-${p.durum}">${DURUM_LABELS[p.durum] || p.durum}</span>
                    <span class="badge-pill badge-tur">${TUR_LABELS[p.tur] || p.tur}</span>
                </div>
                ${photoCount > 1 ? `<div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.6);color:#fff;border-radius:6px;padding:2px 8px;font-size:.7rem"><i class="fas fa-images"></i> ${photoCount}</div>` : ''}
            </div>
            <div class="portfolio-info">
                <div class="portfolio-title">${p.baslik || 'İsimsiz Portföy'}</div>
                <div class="portfolio-location"><i class="fas fa-map-marker-alt"></i>${p.ilce || ''}${p.ilce && p.il ? ', ' : ''}${p.il || ''}</div>
                <div class="portfolio-price">${formatPrice(p.fiyat)}</div>
                <div class="portfolio-meta">
                    ${p.alan ? `<span><i class="fas fa-ruler-combined"></i> ${p.alan} m²</span>` : ''}
                    ${p.oda_sayisi ? `<span><i class="fas fa-door-open"></i> ${p.oda_sayisi}</span>` : ''}
                    ${p.kat ? `<span><i class="fas fa-layer-group"></i> ${p.kat}</span>` : ''}
                </div>
            </div>
            <div class="portfolio-actions" onclick="event.stopPropagation()">
                <button class="btn btn-secondary btn-sm" onclick="editPortfolio('${p.id}')">
                    <i class="fas fa-edit"></i> Düzenle
                </button>
                <button class="btn btn-danger btn-sm" onclick="deletePortfolio('${p.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>`;
    }).join('');
}

function getPlaceholder() {
    return `<div class="portfolio-image-placeholder"><i class="fas fa-building"></i><span>Fotoğraf Yüklenemedi</span></div>`;
}

function showPortfolioDetail(id) {
    const p = state.portfolios.find(x => x.id === id);
    if (!p) return;

    document.getElementById('detailModalTitle').innerHTML = `<i class="fas fa-home"></i> ${p.baslik || 'Portföy Detayı'}`;
    document.getElementById('detailEditBtn').onclick = () => { closeModal('portfolioDetailModal'); editPortfolio(id); };

    const photos = p.fotograflar || [];
    const content = `
        ${photos.length > 0 ? `
        <div class="detail-images">
            ${photos.map(url => `<img src="${url}" alt="" onclick="window.open('${url}','_blank')" style="cursor:pointer">`).join('')}
        </div>` : ''}
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
            <span class="badge-pill badge-${p.durum}" style="font-size:.8rem;padding:4px 12px">${DURUM_LABELS[p.durum] || p.durum}</span>
            <span class="badge-pill badge-tur" style="font-size:.8rem;padding:4px 12px">${TUR_LABELS[p.tur] || p.tur}</span>
        </div>
        <div class="detail-price">${formatPrice(p.fiyat)}</div>
        <div class="detail-info-grid">
            <div class="detail-info-item"><label>Konum</label><span><i class="fas fa-map-marker-alt" style="color:var(--primary)"></i> ${p.ilce || ''}${p.ilce && p.il ? ', ' : ''}${p.il || '-'}</span></div>
            <div class="detail-info-item"><label>Alan</label><span>${p.alan ? p.alan + ' m²' : '-'}</span></div>
            ${p.oda_sayisi ? `<div class="detail-info-item"><label>Oda Sayısı</label><span>${p.oda_sayisi}</span></div>` : ''}
            ${p.kat ? `<div class="detail-info-item"><label>Kat</label><span>${p.kat}</span></div>` : ''}
            ${p.isitma ? `<div class="detail-info-item"><label>Isıtma</label><span>${ISITMA_LABELS[p.isitma] || p.isitma}</span></div>` : ''}
            ${p.adres ? `<div class="detail-info-item" style="grid-column:1/-1"><label>Adres</label><span>${p.adres}</span></div>` : ''}
        </div>
        ${p.aciklama ? `<div class="detail-info-item"><label style="font-size:.75rem;color:var(--text-muted);font-weight:600;display:block;margin-bottom:6px">AÇIKLAMA</label><div class="detail-description">${p.aciklama}</div></div>` : ''}
    `;

    document.getElementById('portfolioDetailContent').innerHTML = content;
    openModal('portfolioDetailModal');
}

function showPortfolioForm(id = null) {
    state.editingPortfolio = id;
    state.tempPhotos = [];
    document.getElementById('photoPreviewGrid').innerHTML = '';

    document.querySelectorAll('.form-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
    document.querySelectorAll('.tab-content').forEach((t, i) => t.classList.toggle('active', i === 0));

    if (id) {
        const p = state.portfolios.find(x => x.id === id);
        if (!p) return;
        document.getElementById('portfolioModalTitle').innerHTML = `<i class="fas fa-edit"></i> Portföy Düzenle`;
        document.getElementById('portfolioId').value = id;
        document.getElementById('p_baslik').value = p.baslik || '';
        document.getElementById('p_tur').value = p.tur || '';
        document.getElementById('p_durum').value = p.durum || '';
        document.getElementById('p_fiyat').value = p.fiyat || '';
        document.getElementById('p_alan').value = p.alan || '';
        document.getElementById('p_il').value = p.il || '';
        document.getElementById('p_ilce').value = p.ilce || '';
        document.getElementById('p_adres').value = p.adres || '';
        document.getElementById('p_oda').value = p.oda_sayisi || '';
        document.getElementById('p_kat').value = p.kat || '';
        document.getElementById('p_isitma').value = p.isitma || '';
        document.getElementById('p_aciklama').value = p.aciklama || '';
        if (p.fotograflar && p.fotograflar.length > 0) {
            state.tempPhotos = p.fotograflar.map(url => ({ url, type: 'url' }));
            renderPhotoPreview();
        }
    } else {
        document.getElementById('portfolioModalTitle').innerHTML = `<i class="fas fa-home"></i> Portföy Ekle`;
        document.getElementById('portfolioId').value = '';
        document.getElementById('portfolioForm').reset();
    }
    openModal('portfolioModal');
}

function editPortfolio(id) {
    showPortfolioForm(id);
}

async function savePortfolio() {
    const baslik = document.getElementById('p_baslik').value.trim();
    const tur = document.getElementById('p_tur').value;
    const durum = document.getElementById('p_durum').value;
    const fiyat = document.getElementById('p_fiyat').value;
    const il = document.getElementById('p_il').value.trim();
    const ilce = document.getElementById('p_ilce').value.trim();

    if (!baslik || !tur || !durum || !fiyat || !il || !ilce) {
        toast('Lütfen tüm zorunlu alanları doldurun!', 'error');
        return;
    }

    const data = {
        baslik, tur, durum, fiyat: Number(fiyat),
        alan: Number(document.getElementById('p_alan').value) || 0,
        il, ilce,
        adres: document.getElementById('p_adres').value.trim(),
        oda_sayisi: document.getElementById('p_oda').value,
        kat: document.getElementById('p_kat').value.trim(),
        isitma: document.getElementById('p_isitma').value,
        aciklama: document.getElementById('p_aciklama').value.trim(),
        fotograflar: state.tempPhotos.map(p => p.url),
        aktif: true
    };

    try {
        if (state.editingPortfolio) {
            await api.put('portfolios', state.editingPortfolio, data);
            toast('Portföy güncellendi');
        } else {
            await api.post('portfolios', data);
            toast('Portföy eklendi');
        }
        closeModal('portfolioModal');
        loadAll();
    } catch (e) {
        toast('Hata oluştu', 'error');
    }
}

async function deletePortfolio(id) {
    if (!confirm('Emin misiniz?')) return;
    try {
        await api.del('portfolios', id);
        toast('Silindi');
        loadAll();
    } catch (e) {
        toast('Hata', 'error');
    }
}

// ===== FOTOĞRAFLARI KÜÇÜLTME (0.5 KALİTE) VE 6 ADET SINIRI =====
async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function (event) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // En-boy oranını bozmadan genişliği maksimum 1000px yapalım
                const MAX_WIDTH = 1000;
                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Kaliteyi 0.5 yaparak hem yer kaplamasını önlüyoruz hem de hızı artırıyoruz
                const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                resolve(dataUrl);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function handleFileUpload(files) {
    for (let file of files) {
        if (!file.type.startsWith('image/')) continue;
        
        if (state.tempPhotos.length >= 6) {
            toast('En fazla 6 adet fotoğraf ekleyebilirsiniz!', 'warning');
            break;
        }

        const compressedUrl = await compressImage(file);
        state.tempPhotos.push({ url: compressedUrl, type: 'file' });
    }
    renderPhotoPreview();
}

function addPhotoUrl() {
    const input = document.getElementById('photoUrlInput');
    const url = input.value.trim();
    if (!url) return;

    if (state.tempPhotos.length >= 6) {
        toast('En fazla 6 adet fotoğraf ekleyebilirsiniz!', 'warning');
        return;
    }

    state.tempPhotos.push({ url, type: 'url' });
    input.value = '';
    renderPhotoPreview();
}

function removePhoto(index) {
    state.tempPhotos.splice(index, 1);
    renderPhotoPreview();
}

function renderPhotoPreview() {
    const grid = document.getElementById('photoPreviewGrid');
    grid.innerHTML = state.tempPhotos.map((p, i) => `
        <div class="photo-preview-item">
            <img src="${p.url}" alt="">
            <button type="button" class="remove-btn" onclick="removePhoto(${i})"><i class="fas fa-times"></i></button>
            <span class="photo-order-badge">${i + 1}/6</span>
        </div>
    `).join('');
}

// ===== CUSTOMERS (CANLI ARANABİLİR NUMARALAR & WHATSAPP) =====
function renderCustomers(filterTur = '', filterDurum = '', searchQ = '') {
    const tbody = document.getElementById('customersTableBody');
    let list = state.customers;

    if (filterTur) list = list.filter(c => c.istek_tur === filterTur);
    if (filterDurum) list = list.filter(c => c.istek_durum === filterDurum);
    
    // Hem input çubuğundan gelen hem de global barda yazılan sorguyu birleştirip aratıyoruz
    const finalQuery = (searchQ || document.getElementById('customerSearchInput').value).trim().toLowerCase();
    if (finalQuery) {
        list = list.filter(c => 
            (c.ad && c.ad.toLowerCase().includes(finalQuery)) ||
            (c.soyad && c.soyad.toLowerCase().includes(finalQuery)) ||
            (c.telefon && c.telefon.replace(/\s/g, '').includes(finalQuery))
        );
    }

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-td"><div class="empty-state"><i class="fas fa-users"></i><p>Müşteri bulunamadı</p></div></td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(c => `
        <tr>
            <td><strong>${c.ad} ${c.soyad}</strong></td>
            <td>
                <div class="customer-phone-wrapper">
                    <a href="${formatPhoneForCall(c.telefon)}" class="phone-link-clickable">
                        <i class="fas fa-phone-alt"></i> ${c.telefon}
                    </a>
                    <a href="${formatPhoneForWhatsApp(c.telefon)}" target="_blank" class="whatsapp-direct-btn" title="WhatsApp'tan Yaz">
                        <i class="fab fa-whatsapp"></i>
                    </a>
                </div>
            </td>
            <td><span class="badge-pill badge-tur">${TUR_LABELS[c.istek_tur] || c.istek_tur}</span></td>
            <td><span class="badge-pill badge-${c.istek_durum}">${DURUM_LABELS[c.istek_durum] || c.istek_durum}</span></td>
            <td>${formatPrice(c.butce_min)} - ${formatPrice(c.butce_max)}</td>
            <td>${c.lokasyon_tercihi || '-'}</td>
            <td>
                <div style="display:flex;gap:4px">
                    <button class="btn btn-secondary btn-sm" onclick="editCustomer('${c.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${c.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function showCustomerForm(id = null) {
    state.editingCustomer = id;
    if (id) {
        const c = state.customers.find(x => x.id === id);
        if (!c) return;
        document.getElementById('customerModalTitle').innerHTML = `<i class="fas fa-edit"></i> Müşteri Düzenle`;
        document.getElementById('customerId').value = id;
        document.getElementById('c_ad').value = c.ad || '';
        document.getElementById('c_soyad').value = c.soyad || '';
        document.getElementById('c_telefon').value = c.telefon || '';
        document.getElementById('c_tur').value = c.istek_tur || '';
        document.getElementById('c_durum').value = c.istek_durum || '';
        document.getElementById('c_butce_min').value = c.butce_min || '';
        document.getElementById('c_butce_max').value = c.butce_max || '';
        document.getElementById('c_lokasyon').value = c.lokasyon_tercihi || '';
        document.getElementById('c_notlar').value = c.notlar || '';
    } else {
        document.getElementById('customerModalTitle').innerHTML = `<i class="fas fa-user-plus"></i> Müşteri Ekle`;
        document.getElementById('customerId').value = '';
        document.getElementById('customerForm').reset();
    }
    openModal('customerModal');
}

function editCustomer(id) {
    showCustomerForm(id);
}

async function saveCustomer() {
    const ad = document.getElementById('c_ad').value.trim();
    const soyad = document.getElementById('c_soyad').value.trim();
    const telefon = document.getElementById('c_telefon').value.trim();
    const istek_tur = document.getElementById('c_tur').value;
    const istek_durum = document.getElementById('c_durum').value;
    const butce_max = document.getElementById('c_butce_max').value;

    if (!ad || !soyad || !telefon || !istek_tur || !istek_durum || !butce_max) {
        toast('Zorunlu alanları doldurun!', 'error');
        return;
    }

    const data = {
        ad, soyad, telefon, istek_tur, istek_durum,
        butce_min: Number(document.getElementById('c_butce_min').value) || 0,
        butce_max: Number(butce_max),
        lokasyon_tercihi: document.getElementById('c_lokasyon').value.trim(),
        notlar: document.getElementById('c_notlar').value.trim(),
        durum: 'aktif'
    };

    try {
        if (state.editingCustomer) {
            await api.put('customers', state.editingCustomer, data);
            toast('Müşteri güncellendi');
        } else {
            await api.post('customers', data);
            toast('Müşteri eklendi');
        }
        closeModal('customerModal');
        loadAll();
    } catch (e) {
        toast('Hata', 'error');
    }
}

async function deleteCustomer(id) {
    if (!confirm('Emin misiniz?')) return;
    try {
        await api.del('customers', id);
        toast('Müşteri silindi');
        loadAll();
    } catch (e) {
        toast('Hata', 'error');
    }
}

// ===== MATCHING =====
function renderMatching(searchQ = '') {
    const grid = document.getElementById('matchingGrid');
    let list = state.customers.filter(c => c.durum !== 'tamamlandi');

    if (searchQ) {
        list = list.filter(c => (c.ad && c.ad.toLowerCase().includes(searchQ)) || (c.soyad && c.soyad.toLowerCase().includes(searchQ)));
    }

    if (list.length === 0) {
        grid.innerHTML = '<div class="empty-state full-width"><i class="fas fa-handshake"></i><p>Eşleşecek aktif müşteri yok</p></div>';
        return;
    }

    grid.innerHTML = list.map(c => {
        const matches = state.portfolios.filter(p => p.tur === c.istek_tur && p.durum === c.istek_durum && p.fiyat >= c.butce_min && p.fiyat <= c.butce_max);
        return `
        <div class="portfolio-card" style="padding: 16px;">
            <h3>${c.ad} ${c.soyad}</h3>
            <p style="font-size: .85rem; color: var(--text-muted); margin: 4px 0 12px 0;">
                Talep: ${DURUM_LABELS[c.istek_durum]} ${TUR_LABELS[c.istek_tur]} (${formatPrice(c.butce_min)} - ${formatPrice(c.butce_max)})
            </p>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="badge-pill" style="background:var(--primary-light); color:var(--primary); font-weight:600;">${matches.length} Eşleşme</span>
                <button class="btn btn-secondary btn-sm" onclick="showMatchDetails('${c.id}')" ${matches.length === 0 ? 'disabled' : ''}>Göster</button>
            </div>
        </div>`;
    }).join('');
}

function showMatchDetails(cid) {
    const c = state.customers.find(x => x.id === cid);
    if (!c) return;
    const matches = state.portfolios.filter(p => p.tur === c.istek_tur && p.durum === c.istek_durum && p.fiyat >= c.butce_min && p.fiyat <= c.butce_max);

    document.getElementById('matchModalTitle').innerHTML = `<i class="fas fa-magic"></i> ${c.ad} ${c.soyad} için Eşleşenler`;
    document.getElementById('matchModalContent').innerHTML = matches.map(p => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid var(--border)">
            <div>
                <strong>${p.baslik}</strong><br>
                <small>${p.ilce} - ${formatPrice(p.fiyat)}</small>
            </div>
            <button class="btn btn-primary btn-sm" onclick="window.open('${formatPhoneForWhatsApp(c.telefon)}?text=${encodeURIComponent(p.baslik + ' ilanı bütçenize uygun görünmektedir: ' + formatPrice(p.fiyat))}', '_blank')">
                <i class="fab fa-whatsapp"></i> Paylaş
            </button>
        </div>
    `).join('');
    openModal('matchModal');
}

// ===== INITIALIZE EVENTS =====
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigate(item.dataset.page);
        });
    });

    document.querySelectorAll('.btn-link').forEach(btn => {
        btn.addEventListener('click', () => navigate(btn.dataset.page));
    });

    document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (e.target === btn || btn.contains(e.target)) {
                const mid = btn.dataset.modal || btn.closest('.modal-overlay').id;
                closeModal(mid);
            }
        });
    });

    document.getElementById('filterTur').addEventListener('change', () => renderPortfolios(document.getElementById('filterTur').value, document.getElementById('filterDurum').value));
    document.getElementById('filterDurum').addEventListener('change', () => renderPortfolios(document.getElementById('filterTur').value, document.getElementById('filterDurum').value));
    document.getElementById('filterCustTur').addEventListener('change', () => renderCustomers(document.getElementById('filterCustTur').value, document.getElementById('filterCustDurum').value));
    document.getElementById('filterCustDurum').addEventListener('change', () => renderCustomers(document.getElementById('filterCustTur').value, document.getElementById('filterCustDurum').value));

    // Müşteriler sayfası anlık arama girdisi dinleyicisi
    document.getElementById('customerSearchInput').addEventListener('input', (e) => {
        renderCustomers(document.getElementById('filterCustTur').value, document.getElementById('filterCustDurum').value, e.target.value);
    });

    document.getElementById('portfolioForm').addEventListener('submit', (e) => { e.preventDefault(); savePortfolio(); });
    document.getElementById('customerForm').addEventListener('submit', (e) => { e.preventDefault(); saveCustomer(); });

    document.querySelectorAll('.form-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.form-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
        });
    });

    const photoSelectBtn = document.getElementById('photoSelectBtn');
    const photoInput = document.getElementById('photoInput');
    photoSelectBtn.addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', (e) => {
        handleFileUpload(e.target.files);
        e.target.value = '';
    });

    const uploadArea = document.getElementById('photoUploadArea');
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFileUpload(e.dataTransfer.files);
    });

    document.getElementById('addPhotoUrlBtn').addEventListener('click', addPhotoUrl);
    document.getElementById('photoUrlInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addPhotoUrl(); }
    });

    let searchTimeout;
    document.getElementById('globalSearch').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => handleGlobalSearch(e.target.value), 300);
    });

    document.getElementById('mobileMenuBtn').addEventListener('click', openMobileSidebar);
    document.getElementById('sidebarOverlay').addEventListener('click', closeMobileSidebar);

    loadAll();
});
