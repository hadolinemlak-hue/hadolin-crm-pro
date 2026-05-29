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
    if(!container) return;
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

// Global müşteri arama terimi state'i
let customerSearchQuery = "";

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
        console.error('Data load error:', e);
    }
}

function updateNotifBadge() {
    const pending = state.matches.filter(m => m.durum === 'onay_bekliyor').length;
    const badge = document.getElementById('notifBadge');
    if(badge) {
        badge.textContent = pending;
        badge.style.display = pending > 0 ? 'block' : 'none';
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

// ===== FOTOĞRAF KALİTESİNİ KÜÇÜLTME (COMPRESSION) VE 6 ADET SINIRI =====
async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function (event) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Maksimum genişlik standardı getirerek boyutu daha da optimize edelim
                const MAX_WIDTH = 1200;
                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // 0.5 kalitesinde JPEG çıktısı alarak boyutu minimize ediyoruz (%80 tasarruf)
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
        
        // 6 Adet Sınır Kontrolü
        if (state.tempPhotos.length >= 6) {
            toast('En fazla 6 adet fotoğraf ekleyebilirsiniz!', 'warning');
            break;
        }

        // Kaliteyi küçülterek dosyayı oku/sıkıştır
        const compressedDataUrl = await compressImage(file);
        
        state.tempPhotos.push({
            url: compressedDataUrl,
            type: 'file',
            dataUrl: compressedDataUrl
        });
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
            <span class="photo-order-badge">${i + 1}</span>
        </div>
    `).join('');
}

// ===== CUSTOMERS (ARAMA MOTORU VE WHATSAPP ENTEGRASYONU) =====
function renderCustomers(filterTur = '', filterDurum = '') {
    const tableBody = document.getElementById('customersTableBody');
    let list = state.customers;

    if (filterTur) list = list.filter(c => c.istek_tur === filterTur);
    if (filterDurum) list = list.filter(c => c.istek_durum === filterDurum);

    // Telefon veya İsim Filtrelemesi
    if (customerSearchQuery) {
        const query = customerSearchQuery.toLowerCase();
        list = list.filter(c => 
            (c.ad && c.ad.toLowerCase().includes(query)) ||
            (c.soyad && c.soyad.toLowerCase().includes(query)) ||
            (c.telefon && c.telefon.replace(/\s/g, '').includes(query))
        );
    }

    // Arama Çubuğunun Tablo Üzerinde Dinamik Kalmasını Sağlama
    const pageContainer = document.getElementById('page-customers');
    let searchWrapper = document.getElementById('customerSearchWrapper');
    if (!searchWrapper && pageContainer) {
        searchWrapper = document.createElement('div');
        searchWrapper.id = 'customerSearchWrapper';
        searchWrapper.className = 'customer-search-container';
        searchWrapper.innerHTML = `
            <div class="search-box inline-search">
                <i class="fas fa-search"></i>
                <input type="text" id="customerPhoneSearch" placeholder="Müşteri adı veya telefon numarası ara..." value="${customerSearchQuery}">
            </div>
        `;
        const tableWrapper = pageContainer.querySelector('.customers-table-wrapper');
        if (tableWrapper) {
            pageContainer.insertBefore(searchWrapper, tableWrapper);
            document.getElementById('customerPhoneSearch').addEventListener('input', (e) => {
                customerSearchQuery = e.target.value;
                renderCustomers(
                    document.getElementById('filterCustTur').value,
                    document.getElementById('filterCustDurum').value
                );
            });
        }
    }

    if (list.length === 0) {
        tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="empty-td">
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>Aranan kriterlere uygun müşteri bulunamadı.</p>
                </div>
            </td>
        </tr>`;
        return;
    }

    tableBody.innerHTML = list.map(c => `
        <tr>
            <td><strong>${c.ad} ${c.soyad}</strong></td>
            <td>
                <div class="customer-phone-cell">
                    <a href="${formatPhoneForCall(c.telefon)}" class="phone-link"><i class="fas fa-phone-alt"></i> ${c.telefon}</a>
                    <a href="${formatPhoneForWhatsApp(c.telefon)}" target="_blank" class="whatsapp-btn-table" title="WhatsApp'tan Yaz"><i class="fab fa-whatsapp"></i></a>
                </div>
            </td>
            <td><span class="badge-pill badge-tur">${TUR_LABELS[c.istek_tur] || c.istek_tur}</span></td>
            <td><span class="badge-pill badge-${c.istek_durum}">${DURUM_LABELS[c.istek_durum] || c.istek_durum}</span></td>
            <td>${formatPrice(c.butce_min)} - ${formatPrice(c.butce_max)}</td>
            <td>${c.tercih_lokasyon || '-'}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-secondary btn-sm btn-icon" onclick="editCustomer('${c.id}')" title="Düzenle"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm btn-icon" onclick="deleteCustomer('${c.id}')" title="Sil"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Diğer global event listener ve tanımlamaları koruyoruz...
document.addEventListener('DOMContentLoaded', () => {
    // Navigation binds
    document.querySelectorAll('.nav-item, .btn-link').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (page) navigate(page);
        });
    });

    // Modals close binds
    document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if(e.target === btn || btn.contains(e.target)){
                const mid = btn.dataset.modal;
                if(mid) closeModal(mid);
            }
        });
    });

    // Portfolio Filters
    document.getElementById('filterTur').addEventListener('change', (e) => renderPortfolios(e.target.value, document.getElementById('filterDurum').value));
    document.getElementById('filterDurum').addEventListener('change', (e) => renderPortfolios(document.getElementById('filterTur').value, e.target.value));

    // Customer Filters
    document.getElementById('filterCustTur').addEventListener('change', (e) => renderCustomers(e.target.value, document.getElementById('filterCustDurum').value));
    document.getElementById('filterCustDurum').addEventListener('change', (e) => renderCustomers(document.getElementById('filterCustTur').value, e.target.value));

    // Photo uploads trigger
    const photoSelectBtn = document.getElementById('photoSelectBtn');
    const photoInput = document.getElementById('photoInput');
    if(photoSelectBtn && photoInput) {
        photoSelectBtn.addEventListener('click', () => photoInput.click());
        photoInput.addEventListener('change', (e) => {
            handleFileUpload(e.target.files);
            e.target.value = ''; 
        });
    }

    const uploadArea = document.getElementById('photoUploadArea');
    if(uploadArea) {
        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            handleFileUpload(e.dataTransfer.files);
        });
    }

    // Modal Add Buttons
    document.getElementById('addPortfolioBtn').addEventListener('click', () => showPortfolioForm());
    document.getElementById('addPortfolioBtnEmpty').addEventListener('click', () => showPortfolioForm());
    document.getElementById('addCustomerBtn').addEventListener('click', () => showCustomerForm());

    // Load initial
    loadAll();
});
