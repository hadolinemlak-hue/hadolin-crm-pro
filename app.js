/* ===== EmlakPro - Ana Uygulama Dosyası ===== */

// ===== STATE =====
const state = {
    portfolios: [],
    customers: [],
    matches: [],
    currentPage: 'dashboard',
    editingPortfolio: null,
    editingCustomer: null,
    tempPhotos: [], // { url, type: 'file'|'url', file?, dataUrl? }
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
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
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
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[page] || page;

    // Sayfa geçişlerinde filtreleri temizle/yeniden uygula
    applyFilters();
    closeMobileSidebar();
}

function openMobileSidebar() {
    const sb = document.getElementById('sidebar');
    const sbo = document.getElementById('sidebarOverlay');
    if (sb) sb.classList.add('open');
    if (sbo) sbo.classList.add('active');
}

function closeMobileSidebar() {
    const sb = document.getElementById('sidebar');
    const sbo = document.getElementById('sidebarOverlay');
    if (sb) sb.classList.remove('open');
    if (sbo) sbo.classList.remove('active');
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
        
        applyFilters();
        updateNotifBadge();
    } catch (e) {
        console.error('Veri yükleme hatası:', e);
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

// ===== GLOBAL FILTER MANTIĞI (Kayıp/Çökme Önleyici Güvenli Filtreleme) =====
function applyFilters() {
    const searchInput = document.getElementById('globalSearch');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    if (state.currentPage === 'dashboard') {
        renderDashboard(query);
    } else if (state.currentPage === 'portfolios') {
        const fTur = document.getElementById('filterTur')?.value || '';
        const fDurum = document.getElementById('filterDurum')?.value || '';
        renderPortfolios(fTur, fDurum, query);
    } else if (state.currentPage === 'customers') {
        const fCustTur = document.getElementById('filterCustTur')?.value || '';
        const fCustDurum = document.getElementById('filterCustDurum')?.value || '';
        renderCustomers(fCustTur, fCustDurum, query);
    } else if (state.currentPage === 'matching') {
        renderMatching(query);
    }
}

// ===== DASHBOARD =====
function renderDashboard(query = '') {
    const sPort = document.getElementById('stat-portfolios');
    const sCust = document.getElementById('stat-customers');
    const sMatch = document.getElementById('stat-matches');
    const sSatilik = document.getElementById('stat-satilik');

    if (sPort) sPort.textContent = state.portfolios.length;
    if (sCust) sCust.textContent = state.customers.filter(c => c.durum !== 'tamamlandi').length;
    if (sMatch) sMatch.textContent = state.matches.length;
    if (sSatilik) sSatilik.textContent = state.portfolios.filter(p => p.durum === 'satilik').length;

    // Portföy listesi
    let filteredPortfolios = [...state.portfolios];
    if (query) {
        filteredPortfolios = filteredPortfolios.filter(p => 
            (p.baslik && p.baslik.toLowerCase().includes(query)) ||
            (p.il && p.il.toLowerCase().includes(query)) ||
            (p.ilce && p.ilce.toLowerCase().includes(query))
        );
    }
    const recent = filteredPortfolios.sort((a, b) => b.created_at - a.created_at).slice(0, 5);
    const rp = document.getElementById('recentPortfolios');
    if (rp) {
        if (recent.length === 0) {
            rp.innerHTML = '<div class="empty-state"><i class="fas fa-home"></i><p>Uygun portföy bulunamadı</p></div>';
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
    }

    // Müşteri listesi
    let filteredCustomers = [...state.customers];
    if (query) {
        filteredCustomers = filteredCustomers.filter(c => 
            (c.ad && c.ad.toLowerCase().includes(query)) ||
            (c.soyad && c.soyad.toLowerCase().includes(query)) ||
            (c.telefon && c.telefon.includes(query))
        );
    }
    const recentC = filteredCustomers.sort((a, b) => b.created_at - a.created_at).slice(0, 5);
    const rc = document.getElementById('recentCustomers');
    if (rc) {
        if (recentC.length === 0) {
            rc.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>Uygun müşteri bulunamadı</p></div>';
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
}

// ===== PORTFOLIOS =====
function renderPortfolios(filterTur = '', filterDurum = '', query = '') {
    const grid = document.getElementById('portfolioGrid');
    const emptyState = document.getElementById('portfolioEmptyState');
    if (!grid) return;

    let list = state.portfolios;
    if (filterTur) list = list.filter(p => p.tur === filterTur);
    if (filterDurum) list = list.filter(p => p.durum === filterDurum);
    if (query) {
        list = list.filter(p => 
            (p.baslik && p.baslik.toLowerCase().includes(query)) ||
            (p.ilce && p.ilce.toLowerCase().includes(query)) ||
            (p.il && p.il.toLowerCase().includes(query))
        );
    }

    if (list.length === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

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
    return `<div class="portfolio-image-placeholder"><i class="fas fa-building"></i><span>Fotoğraf Eksik</span></div>`;
}

function showPortfolioDetail(id) {
    const p = state.portfolios.find(x => x.id === id);
    if (!p) return;

    const titleEl = document.getElementById('detailModalTitle');
    if (titleEl) titleEl.innerHTML = `<i class="fas fa-home"></i> ${p.baslik || 'Portföy Detayı'}`;
    
    const editBtn = document.getElementById('detailEditBtn');
    if (editBtn) {
        editBtn.onclick = () => { closeModal('portfolioDetailModal'); editPortfolio(id); };
    }

    const photos = p.fotograflar || [];
    const content = `
        ${photos.length > 0 ? `
        <div class="detail-images" style="display:flex; gap:8px; overflow-x:auto; margin-bottom:15px;">
            ${photos.map(url => `<img src="${url}" alt="" style="height:120px; border-radius:6px; object-fit:cover;">`).join('')}
        </div>` : ''}
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
            <span class="badge-pill badge-${p.durum}">${DURUM_LABELS[p.durum] || p.durum}</span>
            <span class="badge-pill badge-tur">${TUR_LABELS[p.tur] || p.tur}</span>
        </div>
        <div class="detail-price" style="font-size:1.4rem; font-weight:700; color:var(--primary); margin-bottom:15px;">${formatPrice(p.fiyat)}</div>
        <div class="detail-info-grid">
            <div class="detail-info-item"><label>Konum</label><span>${p.ilce || ''} / ${p.il || '-'}</span></div>
            <div class="detail-info-item"><label>Alan</label><span>${p.alan ? p.alan + ' m²' : '-'}</span></div>
            <div class="detail-info-item"><label>Oda</label><span>${p.oda_sayisi || '-'}</span></div>
            <div class="detail-info-item"><label>Kat</label><span>${p.kat || '-'}</span></div>
            <div class="detail-info-item" style="grid-column:1/-1"><label>Açıklama</label><p>${p.aciklama || 'Açıklama yok.'}</p></div>
        </div>
    `;

    const detailContent = document.getElementById('portfolioDetailContent');
    if (detailContent) detailContent.innerHTML = content;
    openModal('portfolioDetailModal');
}

function showPortfolioForm(id = null) {
    state.editingPortfolio = id;
    state.tempPhotos = [];
    
    const previewGrid = document.getElementById('photoPreviewGrid');
    if (previewGrid) previewGrid.innerHTML = '';

    document.querySelectorAll('.form-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
    document.querySelectorAll('.tab-content').forEach((t, i) => t.classList.toggle('active', i === 0));

    if (id) {
        const p = state.portfolios.find(x => x.id === id);
        if (!p) return;
        const formTitle = document.getElementById('portfolioModalTitle');
        if (formTitle) formTitle.innerHTML = `<i class="fas fa-edit"></i> Portföy Düzenle`;
        
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
        document.getElementById('p_isitma').value = p.isitma || 'yok';
        document.getElementById('p_aciklama').value = p.aciklama || '';

        if (p.fotograflar && p.fotograflar.length > 0) {
            state.tempPhotos = p.fotograflar.map(url => ({ url, type: 'url' }));
            renderPhotoPreview();
        }
    } else {
        const formTitle = document.getElementById('portfolioModalTitle');
        if (formTitle) formTitle.innerHTML = `<i class="fas fa-home"></i> Portföy Ekle`;
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
        toast('Zorunlu alanları doldurun!', 'error');
        return;
    }

    const data = {
        baslik, tur, durum, fiyat: Number(fiyat),
        alan: Number(document.getElementById('p_alan').value) || 0,
        il, ilce, adres: document.getElementById('p_adres').value.trim(),
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
            toast('Portföy başarıyla güncellendi.');
        } else {
            await api.post('portfolios', data);
            toast('Portföy başarıyla eklendi.');
        }
        closeModal('portfolioModal');
        await loadAll();
    } catch (e) {
        toast('Kaydedilemedi!', 'error');
    }
}

async function deletePortfolio(id) {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try {
        await api.del('portfolios', id);
        toast('Portföy silindi.');
        await loadAll();
    } catch (e) {
        toast('Hata oluştu', 'error');
    }
}

// ===== 5MB DOSYA SINIRI VE KANVAS SIKIŞTIRMA (0.5 KALİTE) =====
function handleFileUpload(files) {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
        // 5 MB Sınırı
        if (file.size > 5 * 1024 * 1024) {
            toast(`"${file.name}" dosyası 5MB limitini aşıyor!`, 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const max_size = 1000; // Optimize genişlik hedefi

                if (width > max_size) {
                    height *= max_size / width;
                    width = max_size;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Performans için 0.5 kalitede JPEG sıkıştırma
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);

                state.tempPhotos.push({ url: compressedBase64, type: 'file' });
                renderPhotoPreview();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function addPhotoUrl() {
    const input = document.getElementById('photoUrlInput');
    if (!input) return;
    const url = input.value.trim();
    if (!url) return;
    state.tempPhotos.push({ url, type: 'url' });
    input.value = '';
    renderPhotoPreview();
}

function removeTempPhoto(index) {
    state.tempPhotos.splice(index, 1);
    renderPhotoPreview();
}

function renderPhotoPreview() {
    const grid = document.getElementById('photoPreviewGrid');
    if (!grid) return;
    grid.innerHTML = state.tempPhotos.map((p, i) => `
        <div class="photo-preview-item" style="position:relative; display:inline-block; margin:5px;">
            <img src="${p.url}" style="width:80px; height:80px; object-fit:cover; border-radius:6px;">
            <button type="button" onclick="removeTempPhoto(${i})" style="position:absolute; top:2px; right:2px; background:red; color:white; border:none; border-radius:50%; width:18px; height:18px; cursor:pointer; font-size:10px;">X</button>
        </div>
    `).join('');
}

// ===== CUSTOMERS (DOĞRUDAN WHATSAPP & ARANABİLİR NUMARA ENTEGRASYONU) =====
function renderCustomers(filterTur = '', filterDurum = '', query = '') {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;

    let list = state.customers;
    if (filterTur) list = list.filter(c => c.istek_tur === filterTur);
    if (filterDurum) list = list.filter(c => c.istek_durum === filterDurum);
    if (query) {
        list = list.filter(c => 
            (c.ad && c.ad.toLowerCase().includes(query)) ||
            (c.soyad && c.soyad.toLowerCase().includes(query)) ||
            (c.telefon && c.telefon.includes(query))
        );
    }

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">Müşteri bulunamadı.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(c => `
        <tr>
            <td><strong>${c.ad} ${c.soyad}</strong></td>
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    <a href="${formatPhoneForCall(c.telefon)}" style="text-decoration:none; color:var(--primary); font-weight:600;">
                        <i class="fas fa-phone-alt"></i> ${c.telefon}
                    </a>
                    <a href="${formatPhoneForWhatsApp(c.telefon)}" target="_blank" style="color:#22c55e; font-size:1.1rem;" title="WhatsApp'tan Yaz">
                        <i class="fab fa-whatsapp"></i>
                    </a>
                </div>
            </td>
            <td><span class="badge-pill">${TUR_LABELS[c.istek_tur] || c.istek_tur}</span></td>
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
    const form = document.getElementById('customerForm');
    if (form) form.reset();

    if (id) {
        const c = state.customers.find(x => x.id === id);
        if (!c) return;
        const title = document.getElementById('customerModalTitle');
        if (title) title.innerHTML = `<i class="fas fa-edit"></i> Müşteri Düzenle`;
        
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
        const title = document.getElementById('customerModalTitle');
        if (title) title.innerHTML = `<i class="fas fa-user-plus"></i> Müşteri Ekle`;
        if (document.getElementById('customerId')) document.getElementById('customerId').value = '';
    }
    openModal('customerModal');
}

async function saveCustomer() {
    const ad = document.getElementById('c_ad').value.trim();
    const soyad = document.getElementById('c_soyad').value.trim();
    const telefon = document.getElementById('c_telefon').value.trim();
    const istek_tur = document.getElementById('c_tur').value;
    const istek_durum = document.getElementById('c_durum').value;
    const butce_max = document.getElementById('c_butce_max').value;

    if (!ad || !soyad || !telefon || !istek_tur || !istek_durum || !butce_max) {
        toast('Lütfen zorunlu alanları doldurun!', 'error');
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
            toast('Müşteri güncellendi.');
        } else {
            await api.post('customers', data);
            toast('Müşteri eklendi.');
        }
        closeModal('customerModal');
        await loadAll();
    } catch (e) {
        toast('Hata oluştu', 'error');
    }
}

async function deleteCustomer(id) {
    if (!confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return;
    try {
        await api.del('customers', id);
        toast('Müşteri silindi.');
        await loadAll();
    } catch (e) {
        toast('Silinemedi!', 'error');
    }
}

// ===== MATCHING AND AUTOMATION =====
function renderMatching(query = '') {
    const grid = document.getElementById('matchingGrid');
    if (!grid) return;

    let activeCustomers = state.customers.filter(c => c.durum !== 'tamamlandi');
    if (query) {
        activeCustomers = activeCustomers.filter(c => 
            (c.ad && c.ad.toLowerCase().includes(query)) || (c.soyad && c.soyad.toLowerCase().includes(query))
        );
    }

    if (activeCustomers.length === 0) {
        grid.innerHTML = `<div class="empty-state full-width"><i class="fas fa-handshake"></i><p>Aktif müşteri kaydı bulunamadı.</p></div>`;
        return;
    }

    grid.innerHTML = activeCustomers.map(c => {
        const potentialPortfolios = state.portfolios.filter(p => 
            p.tur === c.istek_tur && p.durum === c.istek_durum && p.fiyat >= c.butce_min && p.fiyat <= c.butce_max
        );

        return `
        <div class="portfolio-card" style="padding:15px; border:1px solid var(--border);">
            <h3>${c.ad} ${c.soyad}</h3>
            <p style="font-size:0.8rem; color:var(--text-muted);">Talep: ${DURUM_LABELS[c.istek_durum]} ${TUR_LABELS[c.istek_tur]}</p>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:10px;">Bütçe: ${formatPrice(c.butce_min)} - ${formatPrice(c.butce_max)}</p>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="badge-pill" style="background:var(--primary-light); color:var(--primary); font-weight:600;">${potentialPortfolios.length} Eşleşme</span>
                <button class="btn btn-primary btn-sm" onclick="showMatchesForCustomer('${c.id}')" ${potentialPortfolios.length === 0 ? 'disabled' : ''}>Göster</button>
            </div>
        </div>`;
    }).join('');
}

function showMatchesForCustomer(customerId) {
    const c = state.customers.find(x => x.id === customerId);
    if (!c) return;

    const potentialPortfolios = state.portfolios.filter(p => 
        p.tur === c.istek_tur && p.durum === c.istek_durum && p.fiyat >= c.butce_min && p.fiyat <= c.butce_max
    );

    const matchTitle = document.getElementById('matchModalTitle');
    if (matchTitle) matchTitle.innerHTML = `<i class="fas fa-magic"></i> Eşleşen Portföyler`;

    const content = document.getElementById('matchModalContent');
    if (content) {
        content.innerHTML = potentialPortfolios.map(p => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border);">
                <div>
                    <strong>${p.baslik}</strong><br>
                    <small>${p.ilce} / ${p.il} — ${formatPrice(p.fiyat)}</small>
                </div>
                <button class="btn btn-success btn-sm" onclick="shareMatchWithWhatsApp('${c.telefon}', '${p.baslik}', '${p.fiyat}', '${p.ilce}')">
                    <i class="fab fa-whatsapp"></i> Paylaş
                </button>
            </div>
        `).join('');
    }
    openModal('matchModal');
}

function shareMatchWithWhatsApp(phone, title, price, location) {
    const message = `Merhaba, arayışınız için bir portföyümüz mevcut:\n\n🏠 *${title}*\n📍 Konum: ${location}\n💰 Fiyat: ${formatPrice(price)}`;
    window.open(formatPhoneForWhatsApp(phone) + `?text=${encodeURIComponent(message)}`, '_blank');
}

// ===== SAFE EVENT LISTENERS (Çökmeyi Önleyici Kontroller) =====
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-page]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            if (el.dataset.page) navigate(el.dataset.page);
        });
    });

    // Filtre Değişim Dinleyicileri
    document.getElementById('filterTur')?.addEventListener('change', applyFilters);
    document.getElementById('filterDurum')?.addEventListener('change', applyFilters);
    document.getElementById('filterCustTur')?.addEventListener('change', applyFilters);
    document.getElementById('filterCustDurum')?.addEventListener('change', applyFilters);

    // Form Tetikleyicileri
    document.getElementById('addPortfolioBtn')?.addEventListener('click', () => showPortfolioForm());
    document.getElementById('addPortfolioBtnEmpty')?.addEventListener('click', () => showPortfolioForm());
    document.getElementById('addCustomerBtn')?.addEventListener('click', () => showCustomerForm());

    document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const mId = btn.getAttribute('data-modal') || btn.closest('.modal-overlay')?.id;
            if (mId) closeModal(mId);
        });
    });

    document.getElementById('portfolioForm')?.addEventListener('submit', (e) => { e.preventDefault(); savePortfolio(); });
    document.getElementById('customerForm')?.addEventListener('submit', (e) => { e.preventDefault(); saveCustomer(); });

    document.querySelectorAll('.form-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.form-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('tab-' + tab.dataset.tab)?.classList.add('active');
        });
    });

    // Fotoğraf İşlemleri
    const pSelectBtn = document.getElementById('photoSelectBtn');
    const pInput = document.getElementById('photoInput');
    if (pSelectBtn && pInput) {
        pSelectBtn.addEventListener('click', () => pInput.click());
        pInput.addEventListener('change', (e) => { handleFileUpload(e.target.files); e.target.value = ''; });
    }

    const uArea = document.getElementById('photoUploadArea');
    if (uArea) {
        uArea.addEventListener('dragover', (e) => { e.preventDefault(); uArea.classList.add('dragover'); });
        uArea.addEventListener('dragleave', () => uArea.classList.remove('dragover'));
        uArea.addEventListener('drop', (e) => { e.preventDefault(); uArea.classList.remove('dragover'); handleFileUpload(e.dataTransfer.files); });
    }

    document.getElementById('addPhotoUrlBtn')?.addEventListener('click', addPhotoUrl);

    // Global Canlı Arama Input Dinleyicisi
    let searchTimeout;
    document.getElementById('globalSearch')?.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => applyFilters(), 300);
    });

    // Mobil Menü Dinleyicileri
    document.getElementById('mobileMenuBtn')?.addEventListener('click', openMobileSidebar);
    document.getElementById('sidebarOverlay')?.addEventListener('click', closeMobileSidebar);
    document.getElementById('sidebarToggle')?.addEventListener('click', closeMobileSidebar);

    loadAll();
});
