/* ===== EmlakPro - Ana Uygulama Dosyası ===== */

const state = {
    portfolios: [],
    customers: [],
    currentPage: 'dashboard',
    editingPortfolio: null,
    editingCustomer: null,
    tempPhotos: [],
    currentGalleryPhotos: [],
    currentGalleryIndex: 0,
};

// ===== LOCAL STORAGE =====
function saveToStorage() {
    try {
        localStorage.setItem('ep_portfolios', JSON.stringify(
            state.portfolios.map(p => ({ ...p, fotograflar: p.fotograflar || [] }))
        ));
        localStorage.setItem('ep_customers', JSON.stringify(state.customers));
    } catch (e) {
        toast('Depolama alanı dolmak üzere! Eski kayıtları silin.', 'warning');
    }
}

function loadFromStorage() {
    try {
        const p = localStorage.getItem('ep_portfolios');
        const c = localStorage.getItem('ep_customers');
        state.portfolios = p ? JSON.parse(p) : [];
        state.customers = c ? JSON.parse(c) : [];
    } catch (e) {
        state.portfolios = [];
        state.customers = [];
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ===== UTILS =====
const TUR_LABELS = {
    daire: 'Daire', arsa: 'Arsa', ofis: 'Ofis',
    fabrika_arsasi: 'Fabrika Arsası', fabrika: 'Fabrika',
};
const DURUM_LABELS = { satilik: 'Satılık', kiralik: 'Kiralık' };
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
    if (p.startsWith('0')) p = '90' + p.slice(1);
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
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fas ${icons[type] || icons.success}"></i> ${msg}`;
    container.appendChild(t);
    setTimeout(() => t.style.opacity = '0', 2500);
    setTimeout(() => t.remove(), 2800);
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
}

// ===== NAVIGATION =====
function navigate(page) {
    state.currentPage = page;
    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.toggle('active', n.dataset.page === page);
    });
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
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

function loadAll() {
    loadFromStorage();
    renderDashboard();
    updateNotifBadge();
}

function updateNotifBadge() {
    const badge = document.getElementById('notifBadge');
    badge.textContent = '0';
    badge.style.display = 'none';
}

// ===== DASHBOARD =====
function renderDashboard() {
    document.getElementById('stat-portfolios').textContent = state.portfolios.length;
    document.getElementById('stat-customers').textContent = state.customers.filter(c => c.durum !== 'tamamlandi').length;
    document.getElementById('stat-matches').textContent = '—';
    document.getElementById('stat-satilik').textContent = state.portfolios.filter(p => p.durum === 'satilik').length;

    const rp = document.getElementById('recentPortfolios');
    const recent = [...state.portfolios].sort((a, b) => b.created_at - a.created_at).slice(0, 5);
    if (recent.length === 0) {
        rp.innerHTML = '<div class="empty-state"><i class="fas fa-home"></i><p>Henüz portföy eklenmemiş</p></div>';
    } else {
        rp.innerHTML = recent.map(p => {
            const photo = getFirstPhoto(p.fotograflar);
            const [il, ilce] = parseKonum(p.konum);
            return `
            <div class="recent-item" onclick="navigate('portfolios')">
                <div class="recent-thumb">
                    ${photo ? `<img src="${photo}" alt="">` : `<i class="fas fa-home"></i>`}
                </div>
                <div class="recent-info">
                    <div class="recent-title">${p.baslik || 'İsimsiz Portföy'}</div>
                    <div class="recent-sub">${ilce || ''} ${il || ''} · ${TUR_LABELS[p.tur] || p.tur}</div>
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
        rc.innerHTML = recentC.map(c => {
            const [ad, soyad] = parseAdSoyad(c.ad_soyad);
            return `
            <div class="recent-item" onclick="navigate('customers')">
                <div class="recent-thumb"><i class="fas fa-user"></i></div>
                <div class="recent-info">
                    <div class="recent-title">${ad} ${soyad}</div>
                    <div class="recent-sub">${TUR_LABELS[c.istek_tur] || ''} · ${DURUM_LABELS[c.istek_durum] || ''}</div>
                </div>
                <div style="font-size:.75rem;color:var(--text-muted)">${formatPrice(c.butce_min)} – ${formatPrice(c.butce_max)}</div>
            </div>`).join('');
    }
}

function parseAdSoyad(str) {
    if (!str) return ['', ''];
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) return [parts[0], ''];
    return [parts[0], parts.slice(1).join(' ')];
}

function parseKonum(str) {
    if (!str) return ['', ''];
    const parts = str.split(',').map(s => s.trim());
    if (parts.length === 1) return [parts[0], ''];
    return [parts[parts.length - 1], parts.slice(0, -1).join(', ')];
}

// ===== PORTFOLIOS =====
function renderPortfolios(filterTur = '', filterDurum = '') {
    const grid = document.getElementById('portfolioGrid');
    let list = state.portfolios;
    if (filterTur) list = list.filter(p => p.tur === filterTur);
    if (filterDurum) list = list.filter(p => p.durum === filterDurum);

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
        const [il, ilce] = parseKonum(p.konum);
        return `
        <div class="portfolio-card" onclick="showPortfolioDetail('${p.id}')">
            <div style="position:relative">
                ${photo
                    ? `<div class="portfolio-image"><img src="${photo}" alt="${p.baslik}"></div>`
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
                <div class="portfolio-location"><i class="fas fa-map-marker-alt"></i>${ilce || ''}${ilce && il ? ', ' : ''}${il || ''}</div>
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

function showPortfolioDetail(id) {
    const p = state.portfolios.find(x => x.id === id);
    if (!p) return;

    document.getElementById('detailModalTitle').innerHTML = `<i class="fas fa-home"></i> ${p.baslik || 'Portföy Detayı'}`;
    document.getElementById('detailEditBtn').onclick = () => { closeModal('portfolioDetailModal'); editPortfolio(id); };

    const photos = p.fotograflar || [];
    const [il, ilce] = parseKonum(p.konum);
    const content = `
        ${photos.length > 0 ? `
        <div class="detail-images">
            ${photos.map((url, i) => `<img src="${url}" alt="" onclick="openPhotoGallery('${id}', ${i})" style="cursor:pointer">`).join('')}
        </div>` : ''}
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
            <span class="badge-pill badge-${p.durum}" style="font-size:.8rem;padding:4px 12px">${DURUM_LABELS[p.durum] || p.durum}</span>
            <span class="badge-pill badge-tur" style="font-size:.8rem;padding:4px 12px">${TUR_LABELS[p.tur] || p.tur}</span>
        </div>
        <div class="detail-price">${formatPrice(p.fiyat)}</div>
        <div class="detail-info-grid">
            <div class="detail-info-item"><label>Konum</label><span><i class="fas fa-map-marker-alt" style="color:var(--primary)"></i> ${ilce || ''}${ilce && il ? ', ' : ''}${il || '-'}</span></div>
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

function openPhotoGallery(portfolioId, index) {
    const p = state.portfolios.find(x => x.id === portfolioId);
    if (!p || !p.fotograflar) return;

    state.currentGalleryPhotos = p.fotograflar;
    state.currentGalleryIndex = index || 0;

    updatePhotoGallery();
    openModal('photoGalleryModal');

    // Keyboard shortcuts
    document.onkeydown = (e) => {
        if (document.getElementById('photoGalleryModal').classList.contains('active')) {
            if (e.key === 'ArrowLeft') prevPhoto();
            if (e.key === 'ArrowRight') nextPhoto();
            if (e.key === 'Escape') closeModal('photoGalleryModal');
        }
    };
}

function updatePhotoGallery() {
    const photos = state.currentGalleryPhotos;
    const idx = state.currentGalleryIndex;

    document.getElementById('galleryImage').src = photos[idx];
    document.getElementById('photoCounter').textContent = `${idx + 1} / ${photos.length}`;

    const thumbs = document.getElementById('galleryThumbs');
    thumbs.innerHTML = photos.map((photo, i) => `
        <div class="photo-gallery-thumb ${i === idx ? 'active' : ''}" onclick="state.currentGalleryIndex = ${i}; updatePhotoGallery()">
            <img src="${photo}" alt="">
        </div>
    `).join('');
}

function prevPhoto() {
    if (state.currentGalleryIndex > 0) {
        state.currentGalleryIndex--;
        updatePhotoGallery();
    }
}

function nextPhoto() {
    if (state.currentGalleryIndex < state.currentGalleryPhotos.length - 1) {
        state.currentGalleryIndex++;
        updatePhotoGallery();
    }
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
        document.getElementById('p_konum').value = p.konum || '';
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

function editPortfolio(id) { showPortfolioForm(id); }

function savePortfolio() {
    const baslik = document.getElementById('p_baslik').value.trim();
    const tur = document.getElementById('p_tur').value;
    const durum = document.getElementById('p_durum').value;
    const fiyat = document.getElementById('p_fiyat').value;
    const konum = document.getElementById('p_konum').value.trim();

    if (!baslik || !tur || !durum || !fiyat || !konum) {
        toast('Zorunlu alanları doldurun!', 'error');
        document.querySelectorAll('.form-tab')[0].click();
        return;
    }

    const fotograflar = state.tempPhotos.map(p => p.url).filter(Boolean);

    const data = {
        baslik, tur, durum,
        fiyat: Number(fiyat),
        alan: Number(document.getElementById('p_alan').value) || 0,
        konum,
        adres: document.getElementById('p_adres').value.trim(),
        oda_sayisi: document.getElementById('p_oda').value,
        kat: document.getElementById('p_kat').value.trim(),
        isitma: document.getElementById('p_isitma').value,
        aciklama: document.getElementById('p_aciklama').value.trim(),
        fotograflar,
        aktif: true,
    };

    if (state.editingPortfolio) {
        const idx = state.portfolios.findIndex(p => p.id === state.editingPortfolio);
        if (idx !== -1) {
            state.portfolios[idx] = { ...state.portfolios[idx], ...data };
        }
        toast('Portföy güncellendi!');
    } else {
        data.id = generateId();
        data.created_at = Date.now();
        state.portfolios.unshift(data);
        toast('Portföy eklendi!');
    }

    saveToStorage();
    closeModal('portfolioModal');
    renderPortfolios(
        document.getElementById('filterTur').value,
        document.getElementById('filterDurum').value
    );
    renderDashboard();
}

function deletePortfolio(id) {
    if (!confirm('Bu portföyü silmek istediğinizden emin misiniz?')) return;
    state.portfolios = state.portfolios.filter(p => p.id !== id);
    saveToStorage();
    renderPortfolios(
        document.getElementById('filterTur').value,
        document.getElementById('filterDurum').value
    );
    renderDashboard();
    toast('Portföy silindi!', 'warning');
}

// ===== PHOTO HANDLING =====
const MAX_PHOTOS = 10;
const MAX_WIDTH = 1200;
const PHOTO_QUALITY = 0.75;

function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', PHOTO_QUALITY));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function renderPhotoPreview() {
    const grid = document.getElementById('photoPreviewGrid');
    const count = state.tempPhotos.length;
    const counterHtml = count > 0
        ? `<div style="grid-column:1/-1;font-size:.78rem;color:var(--text-muted);text-align:right;margin-bottom:4px">
               <span style="font-weight:600;color:${count >= MAX_PHOTOS ? 'var(--danger)' : 'var(--text)'}">${count}</span> / ${MAX_PHOTOS} fotoğraf
           </div>`
        : '';
    grid.innerHTML = counterHtml + state.tempPhotos.map((photo, i) => `
        <div class="photo-preview-item">
            <img src="${photo.url}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🖼️</text></svg>'">
            <button type="button" class="photo-remove" onclick="removePhoto(${i})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function removePhoto(idx) {
    state.tempPhotos.splice(idx, 1);
    renderPhotoPreview();
}

function handleFileUpload(files) {
    const remaining = MAX_PHOTOS - state.tempPhotos.length;
    if (remaining <= 0) {
        toast(`En fazla ${MAX_PHOTOS} fotoğraf ekleyebilirsiniz!`, 'error');
        return;
    }
    const toAdd = Array.from(files).slice(0, remaining);
    if (Array.from(files).length > remaining) {
        toast(`${Array.from(files).length - remaining} fotoğraf limit nedeniyle eklenmedi.`, 'warning');
    }
    toAdd.forEach(async (file) => {
        const url = await compressImage(file);
        state.tempPhotos.push({ url, type: 'file', file });
        renderPhotoPreview();
    });
}

function addPhotoUrl() {
    const url = document.getElementById('photoUrlInput').value.trim();
    if (!url || !url.startsWith('http')) {
        toast('Geçerli bir URL girin!', 'error');
        return;
    }
    if (state.tempPhotos.length >= MAX_PHOTOS) {
        toast(`En fazla ${MAX_PHOTOS} fotoğraf ekleyebilirsiniz!`, 'error');
        return;
    }
    state.tempPhotos.push({ url, type: 'url' });
    document.getElementById('photoUrlInput').value = '';
    renderPhotoPreview();
    toast('Fotoğraf URL eklendi!');
}

// ===== CUSTOMERS =====
function renderCustomers(filterTur = '', filterDurum = '') {
    const tbody = document.getElementById('customersTableBody');
    let list = state.customers;
    if (filterTur) list = list.filter(c => c.istek_tur === filterTur);
    if (filterDurum) list = list.filter(c => c.istek_durum === filterDurum);

    if (list.length === 0) {
        tbody.innerHTML = `
        <tr><td colspan="7" class="empty-td">
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <p>Müşteri bulunamadı</p>
                <button class="btn btn-primary" onclick="showCustomerForm()"><i class="fas fa-plus"></i> Müşteri Ekle</button>
            </div>
        </td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(c => {
        const [ad, soyad] = parseAdSoyad(c.ad_soyad);
        const phone = c.telefon || '';
        const callUrl = phone ? formatPhoneForCall(phone) : '#';
        const waUrl = phone ? formatPhoneForWhatsApp(phone) : '#';
        return `
        <tr>
            <td>
                <div class="customer-name">
                    ${ad} ${soyad}
                </div>
            </td>
            <td>
                <div class="phone-actions">
                    <span style="font-size:.85rem">${phone || '-'}</span>
                    ${phone ? `
                    <a href="${callUrl}" class="phone-link phone-call" title="Ara">
                        <i class="fas fa-phone"></i>
                    </a>
                    <a href="${waUrl}" target="_blank" class="phone-link phone-whatsapp" title="WhatsApp">
                        <i class="fab fa-whatsapp"></i>
                    </a>` : ''}
                </div>
            </td>
            <td><span class="badge-pill badge-tur" style="font-size:.72rem">${TUR_LABELS[c.istek_tur] || '-'}</span></td>
            <td>
                ${c.istek_durum ? `<span class="badge-pill badge-${c.istek_durum}" style="font-size:.72rem">${DURUM_LABELS[c.istek_durum]}</span>` : '-'}
            </td>
            <td style="font-size:.8rem">
                ${c.butce_min || c.butce_max
                    ? `${formatPrice(c.butce_min)} – ${formatPrice(c.butce_max)}`
                    : '-'}
            </td>
            <td style="font-size:.8rem">${c.tercih_konum || ''}</td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-success btn-sm btn-icon" onclick="findMatches('${c.id}')" title="Eşleştir">
                        <i class="fas fa-magic"></i>
                    </button>
                    <button class="btn btn-secondary btn-sm btn-icon" onclick="editCustomer('${c.id}')" title="Düzenle">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm btn-icon" onclick="deleteCustomer('${c.id}')" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function showCustomerForm(id = null) {
    state.editingCustomer = id;
    if (id) {
        const c = state.customers.find(x => x.id === id);
        if (!c) return;
        document.getElementById('customerModalTitle').innerHTML = `<i class="fas fa-user-edit"></i> Müşteri Düzenle`;
        document.getElementById('customerId').value = id;
        document.getElementById('c_ad_soyad').value = c.ad_soyad || '';
        document.getElementById('c_telefon').value = c.telefon || '';
        document.getElementById('c_istek_tur').value = c.istek_tur || '';
        document.getElementById('c_istek_durum').value = c.istek_durum || '';
        document.getElementById('c_butce_min').value = c.butce_min || '';
        document.getElementById('c_butce_max').value = c.butce_max || '';
        document.getElementById('c_tercih_konum').value = c.tercih_konum || '';
        document.getElementById('c_notlar').value = c.notlar || '';
        document.getElementById('c_durum').value = c.durum || 'aktif';
    } else {
        document.getElementById('customerModalTitle').innerHTML = `<i class="fas fa-user-plus"></i> Müşteri Ekle`;
        document.getElementById('customerId').value = '';
        document.getElementById('customerForm').reset();
        document.getElementById('c_durum').value = 'aktif';
    }
    openModal('customerModal');
}

function editCustomer(id) { showCustomerForm(id); }

function saveCustomer() {
    const ad_soyad = document.getElementById('c_ad_soyad').value.trim();
    const telefon = document.getElementById('c_telefon').value.trim();
    const istek_tur = document.getElementById('c_istek_tur').value;
    const istek_durum = document.getElementById('c_istek_durum').value;
    const butce_min = document.getElementById('c_butce_min').value;
    const butce_max = document.getElementById('c_butce_max').value;

    if (!ad_soyad || !telefon || !istek_tur || !istek_durum || !butce_min || !butce_max) {
        toast('Zorunlu alanları doldurun!', 'error');
        return;
    }

    const data = {
        ad_soyad, telefon,
        istek_tur, istek_durum,
        butce_min: Number(butce_min),
        butce_max: Number(butce_max),
        tercih_konum: document.getElementById('c_tercih_konum').value.trim(),
        notlar: document.getElementById('c_notlar').value.trim(),
        durum: document.getElementById('c_durum').value,
    };

    if (state.editingCustomer) {
        const idx = state.customers.findIndex(c => c.id === state.editingCustomer);
        if (idx !== -1) state.customers[idx] = { ...state.customers[idx], ...data };
        toast('Müşteri güncellendi!');
    } else {
        data.id = generateId();
        data.created_at = Date.now();
        state.customers.unshift(data);
        toast('Müşteri eklendi!');
    }

    saveToStorage();
    closeModal('customerModal');
    renderCustomers(
        document.getElementById('filterCustTur').value,
        document.getElementById('filterCustDurum').value
    );
    renderDashboard();
}

function deleteCustomer(id) {
    if (!confirm('Bu müşteriyi silmek istediğinizden emin misiniz?')) return;
    state.customers = state.customers.filter(c => c.id !== id);
    saveToStorage();
    renderCustomers(
        document.getElementById('filterCustTur').value,
        document.getElementById('filterCustDurum').value
    );
    renderDashboard();
    toast('Müşteri silindi!', 'warning');
}

// ===== MATCHING =====
function calculateCompatibility(customer, portfolio) {
    let score = 0, maxScore = 0;

    maxScore += 40;
    if (customer.istek_tur === portfolio.tur) score += 40;
    else return 0;

    maxScore += 30;
    if (customer.istek_durum === portfolio.durum) score += 30;
    else return 0;

    maxScore += 20;
    const fiyat = Number(portfolio.fiyat) || 0;
    const min = Number(customer.butce_min) || 0;
    const max = Number(customer.butce_max) || Infinity;
    if (fiyat >= min && fiyat <= max) score += 20;
    else if (fiyat <= max * 1.1) score += 10;

    maxScore += 10;
    if (customer.tercih_konum && portfolio.konum) {
        const cLower = customer.tercih_konum.toLowerCase();
        const pLower = portfolio.konum.toLowerCase();
        if (pLower.includes(cLower) || cLower.includes(pLower)) score += 10;
    }

    return Math.round((score / maxScore) * 100);
}

function renderMatching() {
    const grid = document.getElementById('matchingGrid');

    if (state.customers.length === 0 || state.portfolios.length === 0) {
        grid.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-handshake"></i>
            <p>Eşleştirme için en az bir müşteri ve portföy ekleyin</p>
        </div>`;
        return;
    }

    const activeCustomers = state.customers.filter(c => c.durum === 'aktif');
    if (activeCustomers.length === 0) {
        grid.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><p>Aktif müşteri bulunamadı</p></div>`;
        return;
    }

    grid.innerHTML = activeCustomers.map(c => {
        const [ad, soyad] = parseAdSoyad(c.ad_soyad);
        const matches = state.portfolios
            .map(p => ({ portfolio: p, score: calculateCompatibility(c, p) }))
            .filter(m => m.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        return `
        <div class="match-customer-card">
            <div class="match-customer-header">
                <div class="match-customer-info">
                    <div class="match-avatar"><i class="fas fa-user"></i></div>
                    <div>
                        <div class="match-name">${ad} ${soyad}</div>
                        <div class="match-needs">
                            ${TUR_LABELS[c.istek_tur] || ''} · ${DURUM_LABELS[c.istek_durum] || ''} · 
                            ${formatPrice(c.butce_min)} – ${formatPrice(c.butce_max)}
                            ${c.tercih_konum ? ' · ' + c.tercih_konum : ''}
                        </div>
                    </div>
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                    <a href="${formatPhoneForCall(c.telefon)}" class="btn btn-sm" style="background:rgba(255,255,255,.2);color:#fff;border:none" title="Ara">
                        <i class="fas fa-phone"></i>
                    </a>
                    <a href="${formatPhoneForWhatsApp(c.telefon)}" target="_blank" class="btn btn-sm" style="background:rgba(255,255,255,.2);color:#fff;border:none" title="WhatsApp">
                        <i class="fab fa-whatsapp"></i>
                    </a>
                    <div class="match-score">${matches.length}<span>Eşleşme</span></div>
                </div>
            </div>
            <div class="match-portfolios">
                ${matches.length === 0
                    ? '<div class="no-match"><i class="fas fa-times-circle" style="color:var(--danger)"></i> Uygun portföy bulunamadı</div>'
                    : matches.map(m => {
                        const photo = getFirstPhoto(m.portfolio.fotograflar);
                        const [il, ilce] = parseKonum(m.portfolio.konum);
                        const scoreClass = m.score >= 80 ? '' : m.score >= 60 ? 'medium' : 'low';
                        return `
                        <div class="match-portfolio-item" onclick="showPortfolioDetail('${m.portfolio.id}')">
                            <div class="match-portfolio-img">
                                ${photo ? `<img src="${photo}" alt="">` : `<i class="fas fa-building"></i>`}
                            </div>
                            <div class="match-portfolio-info">
                                <div class="match-portfolio-title">${m.portfolio.baslik}</div>
                                <div class="match-portfolio-details">
                                    ${ilce || ''} ${il ? ', ' + il : ''} · 
                                    ${formatPrice(m.portfolio.fiyat)}
                                    ${m.portfolio.alan ? ' · ' + m.portfolio.alan + ' m²' : ''}
                                </div>
                            </div>
                            <div class="match-compat ${scoreClass}">%${m.score}</div>
                        </div>`;
                    }).join('')
                }
            </div>
        </div>`;
    }).join('');
}

function findMatches(customerId) {
    const c = state.customers.find(x => x.id === customerId);
    if (!c) return;

    const [ad, soyad] = parseAdSoyad(c.ad_soyad);
    const matches = state.portfolios
        .map(p => ({ portfolio: p, score: calculateCompatibility(c, p) }))
        .filter(m => m.score > 0)
        .sort((a, b) => b.score - a.score);

    document.getElementById('matchModalTitle').innerHTML = `
        <i class="fas fa-magic"></i> ${ad} ${soyad} için Eşleşmeler
    `;

    const content = matches.length === 0
        ? `<div class="empty-state">
            <i class="fas fa-search"></i>
            <p>Bu müşteri için uygun portföy bulunamadı.</p>
            <small style="color:var(--text-muted)">Tür: ${TUR_LABELS[c.istek_tur] || '-'} · Durum: ${DURUM_LABELS[c.istek_durum] || '-'} · Bütçe: ${formatPrice(c.butce_min)} – ${formatPrice(c.butce_max)}</small>
          </div>`
        : `<div style="margin-bottom:12px;font-size:.875rem;color:var(--text-muted)">
            <i class="fas fa-info-circle"></i> ${matches.length} uygun portföy bulundu
           </div>
           <div class="match-detail-list">
            ${matches.map(m => {
                const photo = getFirstPhoto(m.portfolio.fotograflar);
                const [il, ilce] = parseKonum(m.portfolio.konum);
                const scoreClass = m.score >= 80 ? '' : m.score >= 60 ? 'medium' : 'low';
                return `
                <div class="match-item ${scoreClass}" onclick="closeModal('matchModal');showPortfolioDetail('${m.portfolio.id}')" style="cursor:pointer">
                    <div class="match-portfolio-img">
                        ${photo ? `<img src="${photo}" alt="">` : `<i class="fas fa-building" style="font-size:1.5rem;color:#94a3b8"></i>`}
                    </div>
                    <div style="flex:1">
                        <div style="font-weight:600;margin-bottom:4px">${m.portfolio.baslik}</div>
                        <div style="font-size:.78rem;color:var(--text-muted)">
                            ${ilce || ''} ${il ? ', ' + il : ''} · 
                            ${TUR_LABELS[m.portfolio.tur] || ''} · ${DURUM_LABELS[m.portfolio.durum] || ''}
                        </div>
                        <div style="font-size:.875rem;font-weight:700;color:var(--primary);margin-top:4px">${formatPrice(m.portfolio.fiyat)}</div>
                    </div>
                    <div style="text-align:center">
                        <div class="match-compat ${scoreClass}" style="font-size:1.2rem">%${m.score}</div>
                        <div style="font-size:.7rem;color:var(--text-muted)">Uyum</div>
                    </div>
                </div>`;
            }).join('')}
           </div>`;

    document.getElementById('matchModalContent').innerHTML = content;
    openModal('matchModal');
}

// ===== GLOBAL SEARCH =====
function handleGlobalSearch(query) {
    query = query.toLowerCase().trim();
    if (!query) {
        if (state.currentPage === 'portfolios') renderPortfolios();
        if (state.currentPage === 'customers') renderCustomers();
        return;
    }

    if (state.currentPage === 'portfolios') {
        const grid = document.getElementById('portfolioGrid');
        const filtered = state.portfolios.filter(p =>
            (p.baslik || '').toLowerCase().includes(query) ||
            (p.konum || '').toLowerCase().includes(query) ||
            (p.adres || '').toLowerCase().includes(query)
        );
        if (filtered.length === 0) {
            grid.innerHTML = `<div class="empty-state full-width"><i class="fas fa-search"></i><p>"${query}" için sonuç bulunamadı</p></div>`;
        } else {
            const tmp = state.portfolios;
            state.portfolios = filtered;
            renderPortfolios();
            state.portfolios = tmp;
        }
    }

    if (state.currentPage === 'customers') {
        const filtered = state.customers.filter(c =>
            (c.ad_soyad || '').toLowerCase().includes(query) ||
            (c.telefon || '').includes(query)
        );
        const tmp = state.customers;
        state.customers = filtered;
        renderCustomers();
        state.customers = tmp;
    }
}

// ===== BACKUP & RESTORE =====
function exportData() {
    const data = {
        version: '1.0',
        exported: new Date().toISOString(),
        portfolios: state.portfolios,
        customers: state.customers,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emlakpro-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Veriler indirildi!');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!data.portfolios || !data.customers) {
                toast('Geçersiz yedekleme dosyası!', 'error');
                return;
            }
            
            if (confirm('Mevcut veriler silinecek ve yeni veriler yüklenecek. Devam edilsin mi?')) {
                state.portfolios = data.portfolios || [];
                state.customers = data.customers || [];
                saveToStorage();
                renderDashboard();
                toast('Veriler geri yüklendi!');
            }
        } catch (err) {
            toast('Dosya okunamadı!', 'error');
        }
    };
    input.click();
}

// ===== MOBILE SIDEBAR =====
function openMobileSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('active');
}

function closeMobileSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-item').forEach(n => {
        n.addEventListener('click', (e) => { e.preventDefault(); navigate(n.dataset.page); });
    });

    document.querySelectorAll('[data-page]').forEach(el => {
        if (!el.classList.contains('nav-item')) {
            el.addEventListener('click', (e) => { e.preventDefault(); navigate(el.dataset.page); });
        }
    });

    document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modal;
            if (modalId) closeModal(modalId);
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });

    document.getElementById('addPortfolioBtn').addEventListener('click', () => showPortfolioForm());
    document.getElementById('addPortfolioBtnEmpty')?.addEventListener('click', () => showPortfolioForm());
    document.getElementById('savePortfolioBtn').addEventListener('click', savePortfolio);

    document.getElementById('addCustomerBtn').addEventListener('click', () => showCustomerForm());
    document.getElementById('saveCustomerBtn').addEventListener('click', saveCustomer);

    document.getElementById('filterTur').addEventListener('change', () => {
        renderPortfolios(document.getElementById('filterTur').value, document.getElementById('filterDurum').value);
    });
    document.getElementById('filterDurum').addEventListener('change', () => {
        renderPortfolios(document.getElementById('filterTur').value, document.getElementById('filterDurum').value);
    });
    document.getElementById('filterCustTur').addEventListener('change', () => {
        renderCustomers(document.getElementById('filterCustTur').value, document.getElementById('filterCustDurum').value);
    });
    document.getElementById('filterCustDurum').addEventListener('change', () => {
        renderCustomers(document.getElementById('filterCustTur').value, document.getElementById('filterCustDurum').value);
    });

    document.querySelectorAll('.form-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            document.querySelectorAll('.form-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('tab-' + tabId).classList.add('active');
        });
    });

    const photoSelectBtn = document.getElementById('photoSelectBtn');
    const photoInput = document.getElementById('photoInput');
    photoSelectBtn.addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', (e) => { handleFileUpload(e.target.files); e.target.value = ''; });

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
        if (e.key === 'Enter') addPhotoUrl();
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
