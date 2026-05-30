let portfolios = JSON.parse(localStorage.getItem("portfolios")) || [];
let customers = JSON.parse(localStorage.getItem("customers")) || [];
let matches = JSON.parse(localStorage.getItem("matches")) || [];

let currentGalleryImages = [];
let currentGalleryIndex = 0;
let tempEditImages = [];

function showSection(id){
  document.querySelectorAll("main section").forEach(section => {
    section.classList.remove("active");
  });
  const target = document.getElementById(id);
  if (target) {
    target.classList.add("active");
  }
}

function saveData(){
  try {
    localStorage.setItem("portfolios", JSON.stringify(portfolios));
    localStorage.setItem("customers", JSON.stringify(customers));
    localStorage.setItem("matches", JSON.stringify(matches));
    updateDashboard();
  } catch (error) {
    console.error("Hafıza doldu veya yazma hatası:", error);
    alert("Hafıza sınırı aşıldı! Lütfen gereksiz ilanları/fotoğrafları silin veya daha küçük boyutlu görsel yükleyin.");
  }
}

function updateDashboard(){
  const portfolioCount = document.getElementById("portfolioCount");
  const customerCount = document.getElementById("customerCount");
  const matchCount = document.getElementById("matchCount");

  if(portfolioCount) portfolioCount.innerText = portfolios.length;
  if(customerCount) customerCount.innerText = customers.length;
  if(matchCount) matchCount.innerText = matches.length;
}

function resizeAndCompressImage(file) {
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
        const MAX_WIDTH = 600; // Hafıza hatasını önlemek için genişlik 600px'e çekildi
        const MAX_HEIGHT = 600;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6)); // Kalite %60 yapılarak stabilite sağlandı
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
  });
}

/* ==========================================================================
   PORTFOLIO İŞLEMLERİ
   ========================================================================== */
async function addPortfolio(){
  const titleInput = document.getElementById("title");
  const priceInput = document.getElementById("price");
  const descInput = document.getElementById("description");
  const filesInput = document.getElementById("images");

  if(!titleInput || !priceInput || !filesInput) return;

  const title = titleInput.value.trim();
  const price = parseFloat(priceInput.value) || 0;
  const description = descInput ? descInput.value.trim() : "";
  const files = filesInput.files;

  if(title === "" || price <= 0){
    alert("Geçerli bir başlık ve fiyat zorunludur.");
    return;
  }
  if(files.length > 3){
    alert("En fazla 3 fotoğraf eklenebilir.");
    return;
  }

  let images = [];
  for(let i = 0; i < files.length; i++){
    try {
      const compressedBase64 = await resizeAndCompressImage(files[i]);
      images.push(compressedBase64);
    } catch(e) {
      console.error("Dosya işleme hatası:", e);
    }
  }

  portfolios.push({ id: Date.now(), title, price, description, images });
  saveData();
  renderPortfolios();
  updateMatchOptions();

  titleInput.value = "";
  priceInput.value = "";
  if(descInput) descInput.value = "";
  filesInput.value = "";
  alert("İlan başarıyla eklendi.");
}

function renderPortfolios(){
  const list = document.getElementById("portfolioList");
  if(!list) return;

  const searchKey = document.getElementById("portfolioSearch")?.value.toLowerCase() || "";
  const minPrice = parseFloat(document.getElementById("portfolioMinPrice")?.value) || 0;
  const maxPrice = parseFloat(document.getElementById("portfolioMaxPrice")?.value) || Infinity;

  let htmlContent = "";
  const filtered = portfolios.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchKey) || item.description.toLowerCase().includes(searchKey);
    const matchesPrice = item.price >= minPrice && item.price <= maxPrice;
    return matchesSearch && matchesPrice;
  });

  filtered.forEach(item => {
    let imagesHTML = (item.images || []).map((img, idx) => {
      const jsonImages = encodeURIComponent(JSON.stringify(item.images));
      return `<img src="${img}" alt="" onclick="openImageModal('${jsonImages}', ${idx})">`;
    }).join('');

    htmlContent += `
      <div class="portfolio-item">
        <h3>${item.title}</h3>
        <p style="margin-top:5px;"><strong>Fiyat:</strong> ${item.price.toLocaleString('tr-TR')} TL</p>
        <p style="margin-top:5px; color:#bdc3c7;">${item.description || 'Açıklama yok.'}</p>
        <div class="images">${imagesHTML}</div>
        <div class="action-btns">
          <button class="edit-btn" onclick="openPortfolioEditModal(${item.id})">Düzenle / Fotoğraf Yönet</button>
          <button class="delete-btn" onclick="deletePortfolio(${item.id})">Sil</button>
        </div>
      </div>
    `;
  });
  list.innerHTML = htmlContent || "<p>Kriterlere uygun ilan bulunamadı.</p>";
}

function openPortfolioEditModal(id) {
  const portfolio = portfolios.find(p => p.id === id);
  if(!portfolio) return;

  document.getElementById("editPortfolioId").value = portfolio.id;
  document.getElementById("editTitle").value = portfolio.title;
  document.getElementById("editPrice").value = portfolio.price;
  document.getElementById("editDescription").value = portfolio.description || "";
  
  tempEditImages = [...(portfolio.images || [])];
  renderEditImagesPreview();
  document.getElementById("editPortfolioModal").style.display = "block";
}

function renderEditImagesPreview() {
  const container = document.getElementById("editExistingImages");
  if(!container) return;
  if(tempEditImages.length === 0) {
    container.innerHTML = "<p style='color:#bdc3c7; font-size:13px; padding:5px;'>Kayıtlı fotoğraf yok.</p>";
    return;
  }
  container.innerHTML = tempEditImages.map((img, index) => `
    <div class="edit-img-wrap" onclick="removeImageFromEdit(${index})" title="Silmek için tıklayın">
      <img src="${img}">
    </div>
  `).join('');
}

function removeImageFromEdit(index) {
  tempEditImages.splice(index, 1);
  renderEditImagesPreview();
}

function closePortfolioEditModal() {
  document.getElementById("editPortfolioModal").style.display = "none";
  document.getElementById("editNewImages").value = "";
}

async function savePortfolioEdit() {
  const id = parseInt(document.getElementById("editPortfolioId").value);
  const portfolio = portfolios.find(p => p.id === id);
  if(!portfolio) return;

  const newTitle = document.getElementById("editTitle").value.trim();
  const newPrice = parseFloat(document.getElementById("editPrice").value) || 0;
  const newDesc = document.getElementById("editDescription").value.trim();
  const newFiles = document.getElementById("editNewImages").files;

  if(newTitle === "" || newPrice <= 0) {
    alert("Başlık ve fiyat alanları boş bırakılamaz.");
    return;
  }

  let processedNewImages = [];
  for(let i = 0; i < newFiles.length; i++) {
    try {
      const base64 = await resizeAndCompressImage(newFiles[i]);
      processedNewImages.push(base64);
    } catch(e) {
      console.error(e);
    }
  }

  const totalImages = [...tempEditImages, ...processedNewImages];
  if(totalImages.length > 3) {
    alert("Bir ilan en fazla 3 fotoğraftan oluşabilir!");
    return;
  }

  portfolio.title = newTitle;
  portfolio.price = newPrice;
  portfolio.description = newDesc;
  portfolio.images = totalImages;

  saveData();
  renderPortfolios();
  renderMatches();
  updateMatchOptions();
  closePortfolioEditModal();
  alert("İlan başarıyla güncellendi.");
}

function deletePortfolio(id){
  if(!confirm("Bu ilanı silmek istediğinize emin misiniz?")) return;
  portfolios = portfolios.filter(p => p.id !== id);
  matches = matches.filter(m => m.portfolioId !== id);
  saveData();
  renderPortfolios();
  renderMatches();
  updateMatchOptions();
}

/* ==========================================================================
   CUSTOMER İŞLEMLERİ
   ========================================================================== */
function addCustomer(){
  const nameInput = document.getElementById("customerName");
  const phoneInput = document.getElementById("customerPhone");
  const demandInput = document.getElementById("customerDemand");
  const noteInput = document.getElementById("customerNote");

  if(!nameInput || !phoneInput || !demandInput) return;

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const demand = demandInput.value.trim();
  const note = noteInput ? noteInput.value.trim() : "";

  if(name === "" || phone === "" || demand === ""){
    alert("Ad, telefon ve talep alanları zorunludur.");
    return;
  }

  customers.push({ id: Date.now(), name, phone, demand, note });
  saveData();
  renderCustomers();
  updateMatchOptions();

  nameInput.value = ""; phoneInput.value = ""; demandInput.value = ""; if(noteInput) noteInput.value = "";
  alert("Müşteri başarıyla eklendi.");
}

function getCleanTrPhone(phoneStr) {
  let clean = phoneStr.replace(/\D/g, '');
  if (clean.startsWith('90') && clean.length === 12) return clean;
  if (clean.startsWith('0') && clean.length === 11) return '90' + clean.substring(1);
  if (clean.length === 10) return '90' + clean;
  return clean;
}

function renderCustomers(){
  const list = document.getElementById("customerList");
  if(!list) return;

  const searchKey = document.getElementById("customerSearch")?.value.toLowerCase() || "";
  let htmlContent = "";

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchKey) || 
    c.demand.toLowerCase().includes(searchKey) || 
    (c.note && c.note.toLowerCase().includes(searchKey))
  );

  filtered.forEach(customer=>{
    const whatsappPhone = getCleanTrPhone(customer.phone);
    const callPhone = customer.phone.replace(/\D/g,'');

    htmlContent += `
      <div class="customer-item">
        <h3>${customer.name}</h3>
        <p style="margin-top:6px;"><strong>Talep:</strong> <span class="demand-badge">${customer.demand}</span></p>
        <a class="phone-link" href="tel:${callPhone}">📞 ${customer.phone}</a>
        <p style="margin-top:6px; color:#bdc3c7;"><strong>Not:</strong> ${customer.note || '-'}</p>
        <a class="whatsapp-btn" href="https://wa.me/${whatsappPhone}" target="_blank">WhatsApp Gönder</a>
        <div class="action-btns">
          <button class="edit-btn" onclick="editCustomer(${customer.id})">Düzenle</button>
          <button class="delete-btn" onclick="deleteCustomer(${customer.id})">Sil</button>
        </div>
      </div>
    `;
  });
  list.innerHTML = htmlContent || "<p>Müşteri bulunamadı.</p>";
}

function editCustomer(id){
  const customer = customers.find(c=>c.id === id);
  if(!customer) return;

  const newName = prompt("Ad Soyad:", customer.name);
  if(newName === null || newName.trim() === "") return;
  const newPhone = prompt("Telefon:", customer.phone);
  if(newPhone === null || newPhone.trim() === "") return;
  const newDemand = prompt("Müşteri Talebi:", customer.demand);
  if(newDemand === null || newDemand.trim() === "") return;
  const newNote = prompt("Not:", customer.note);

  customer.name = newName.trim();
  customer.phone = newPhone.trim();
  customer.demand = newDemand.trim();
  if(newNote !== null) customer.note = newNote.trim();

  saveData();
  renderCustomers();
  renderMatches();
  updateMatchOptions();
}

function deleteCustomer(id){
  if(!confirm("Müşteri silinsin mi?")) return;
  customers = customers.filter(c=>c.id !== id);
  matches = matches.filter(m => m.customerId !== id);
  saveData();
  renderCustomers();
  renderMatches();
  updateMatchOptions();
}

/* ==========================================================================
   MATCH (EŞLEŞTİRME) İŞLEMLERİ
   ========================================================================== */
function updateMatchOptions(){
  const customerSelect = document.getElementById("matchCustomer");
  const portfolioSelect = document.getElementById("matchPortfolio");
  if(!customerSelect || !portfolioSelect) return;

  customerSelect.innerHTML = customers.map(c => `<option value="${c.id}">${c.name} (Talep: ${c.demand})</option>`).join('');
  portfolioSelect.innerHTML = portfolios.map(p => `<option value="${p.id}">${p.title} - ${p.price.toLocaleString('tr-TR')} TL</option>`).join('');
}

function addMatch(){
  const customerSelect = document.getElementById("matchCustomer");
  const portfolioSelect = document.getElementById("matchPortfolio");

  if(!customerSelect || !portfolioSelect || customerSelect.value === "" || portfolioSelect.value === "") {
    alert("Önce müşteri ve portföy eklemelisiniz.");
    return;
  }
  const customerId = parseInt(customerSelect.value);
  const portfolioId = parseInt(portfolioSelect.value);

  if(matches.some(m => m.customerId === customerId && m.portfolioId === portfolioId)) {
    alert("Bu eşleştirme zaten mevcut!");
    return;
  }

  matches.push({ id: Date.now(), customerId, portfolioId });
  saveData();
  renderMatches();
  alert("Eşleştirme yapıldı.");
}

function renderMatches(){
  const list = document.getElementById("matchList");
  if(!list) return;

  const searchKey = document.getElementById("matchSearch")?.value.toLowerCase() || "";
  let htmlContent = "";

  matches.forEach(match=>{
    const customer = customers.find(c => c.id === match.customerId);
    const portfolio = portfolios.find(p => p.id === match.portfolioId);

    if(customer && portfolio) {
      const matchText = (customer.name + " " + customer.demand + " " + portfolio.title).toLowerCase();
      if(matchText.includes(searchKey)) {
        htmlContent += `
          <div class="match-item">
            <h3>Müşteri: ${customer.name}</h3>
            <p style="margin-top:5px;"><strong>Müşteri Talebi:</strong> <span class="demand-badge">${customer.demand}</span></p>
            <p style="margin-top:5px;">Eşleşen İlan: <strong>${portfolio.title}</strong></p>
            <p style="margin-top:5px;">İlan Fiyatı: ${portfolio.price.toLocaleString('tr-TR')} TL</p>
            <div class="action-btns">
              <button class="delete-btn" onclick="deleteMatch(${match.id})">Kaldır</button>
            </div>
          </div>
        `;
      }
    }
  });
  list.innerHTML = htmlContent || "<p>Eşleşme bulunamadı.</p>";
}

function deleteMatch(matchId) {
  if(!confirm("Eşleştirmeyi kaldırmak istediğinize emin misiniz?")) return;
  matches = matches.filter(m => m.id !== matchId);
  saveData();
  renderMatches();
}

/* ==========================================================================
   SAHİBİNDEN TARZI GALERİ FONKSİYONLARI
   ========================================================================== */
function openImageModal(encodedImages, index) {
  const modal = document.getElementById("imageModal");
  currentGalleryImages = JSON.parse(decodeURIComponent(encodedImages));
  currentGalleryIndex = index;

  if(modal && currentGalleryImages.length > 0) {
    modal.style.display = "block";
    updateModalImageUI();
    window.addEventListener("keydown", handleGalleryArrows);
  }
}

function updateModalImageUI() {
  const modalImg = document.getElementById("modalTargetImg");
  const caption = document.getElementById("modalCaption");
  if(modalImg && caption) {
    modalImg.src = currentGalleryImages[currentGalleryIndex];
    caption.innerText = `${currentGalleryIndex + 1} / ${currentGalleryImages.length}`;
  }
}

function changeModalImage(direction) {
  currentGalleryIndex += direction;
  if (currentGalleryIndex >= currentGalleryImages.length) currentGalleryIndex = 0;
  if (currentGalleryIndex < 0) currentGalleryIndex = currentGalleryImages.length - 1;
  updateModalImageUI();
}

function closeImageModal() {
  const modal = document.getElementById("imageModal");
  if(modal) {
    modal.style.display = "none";
    window.removeEventListener("keydown", handleGalleryArrows);
  }
}

function handleGalleryArrows(e) {
  if (e.key === "ArrowRight") changeModalImage(1);
  if (e.key === "ArrowLeft") changeModalImage(-1);
  if (e.key === "Escape") closeImageModal();
}

/* Uygulama yüklenme dinleyicileri */
document.addEventListener("DOMContentLoaded", ()=>{
  renderPortfolios();
  renderCustomers();
  renderMatches();
  updateMatchOptions();
  updateDashboard();

  document.getElementById("portfolioSearch")?.addEventListener("input", renderPortfolios);
  document.getElementById("portfolioMinPrice")?.addEventListener("input", renderPortfolios);
  document.getElementById("portfolioMaxPrice")?.addEventListener("input", renderPortfolios);
  document.getElementById("customerSearch")?.addEventListener("input", renderCustomers);
  document.getElementById("matchSearch")?.addEventListener("input", renderMatches);
});
