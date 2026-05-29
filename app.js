/* ========= STORAGE ========= */

let portfolios =
  JSON.parse(localStorage.getItem("portfolios")) || [];

let customers =
  JSON.parse(localStorage.getItem("customers")) || [];

/* ========= ELEMENTS ========= */

const pages = document.querySelectorAll(".page");

const navItems = document.querySelectorAll(".nav-item");

const pageTitle = document.getElementById("pageTitle");

const portfolioGrid =
  document.getElementById("portfolioGrid");

const customersTableBody =
  document.getElementById("customersTableBody");

const matchingGrid =
  document.getElementById("matchingGrid");

const recentPortfolios =
  document.getElementById("recentPortfolios");

const recentCustomers =
  document.getElementById("recentCustomers");

const modalOverlay =
  document.getElementById("modalOverlay");

const modalBody =
  document.getElementById("modalBody");

const modalTitle =
  document.getElementById("modalTitle");

/* ========= NAVIGATION ========= */

navItems.forEach(item => {

  item.addEventListener("click", e => {

    e.preventDefault();

    navItems.forEach(i =>
      i.classList.remove("active")
    );

    item.classList.add("active");

    const page = item.dataset.page;

    pages.forEach(p =>
      p.classList.add("hidden")
    );

    document
      .getElementById(`${page}Page`)
      .classList.remove("hidden");

    pageTitle.textContent =
      item.textContent.trim();

  });

});

/* ========= TOAST ========= */

function showToast(text){

  const container =
    document.getElementById("toastContainer");

  const toast =
    document.createElement("div");

  toast.className = "toast";

  toast.innerHTML = `
    <i class="fa-solid fa-circle-check"></i>
    ${text}
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);

}

/* ========= MODAL ========= */

function openModal(title, html){

  modalTitle.innerHTML = title;

  modalBody.innerHTML = html;

  modalOverlay.classList.add("active");

}

function closeModal(){

  modalOverlay.classList.remove("active");

}

document
  .getElementById("modalClose")
  .addEventListener("click", closeModal);

modalOverlay.addEventListener("click", e => {

  if(e.target === modalOverlay){
    closeModal();
  }

});

/* ========= IMAGE COMPRESS ========= */

async function compressImage(file){

  return new Promise(resolve => {

    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onload = event => {

      const img = new Image();

      img.src = event.target.result;

      img.onload = () => {

        const canvas =
          document.createElement("canvas");

        const ctx =
          canvas.getContext("2d");

        let width = img.width;
        let height = img.height;

        const maxWidth = 900;

        if(width > maxWidth){

          height *= maxWidth / width;
          width = maxWidth;

        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(
          img,
          0,
          0,
          width,
          height
        );

        resolve(
          canvas.toDataURL(
            "image/jpeg",
            0.55
          )
        );

      };

    };

  });

}

/* ========= PORTFOLIO ========= */

document
  .getElementById("addPortfolioBtn")
  .addEventListener("click", openPortfolioModal);

function openPortfolioModal(){

  openModal(
    "Yeni Portföy",
    `
    <form id="portfolioForm">

      <div class="form-grid">

        <div class="form-group">
          <label>Başlık</label>
          <input required id="title">
        </div>

        <div class="form-group">
          <label>Tür</label>

          <select id="type">
            <option>Daire</option>
            <option>Villa</option>
            <option>Arsa</option>
          </select>
        </div>

        <div class="form-group">
          <label>Durum</label>

          <select id="status">
            <option>Satılık</option>
            <option>Kiralık</option>
          </select>
        </div>

        <div class="form-group">
          <label>Fiyat</label>
          <input type="number" id="price">
        </div>

        <div class="form-group full">
          <label>Lokasyon</label>
          <input id="location">
        </div>

        <div class="form-group full">
          <label>Açıklama</label>
          <textarea id="description"></textarea>
        </div>

        <div class="form-group full">
          <label>
            Fotoğraf (Max 6)
          </label>

          <div class="photo-upload-area">
            <input
              type="file"
              id="photos"
              accept="image/*"
              multiple
            >
          </div>

          <div
            class="photo-preview-grid"
            id="previewGrid"
          ></div>

        </div>

      </div>

      <br>

      <button class="btn btn-primary">
        Kaydet
      </button>

    </form>
    `
  );

  setupPortfolioForm();

}

function setupPortfolioForm(){

  const form =
    document.getElementById("portfolioForm");

  const photoInput =
    document.getElementById("photos");

  const previewGrid =
    document.getElementById("previewGrid");

  let images = [];

  photoInput.addEventListener(
    "change",
    async e => {

      const files =
        [...e.target.files];

      if(files.length > 6){

        showToast(
          "Maksimum 6 fotoğraf eklenebilir."
        );

        return;
      }

      previewGrid.innerHTML = "";

      images = [];

      for(const file of files){

        const compressed =
          await compressImage(file);

        images.push(compressed);

        const div =
          document.createElement("div");

        div.className =
          "photo-preview-item";

        div.innerHTML = `
          <img src="${compressed}">
        `;

        previewGrid.appendChild(div);

      }

    }
  );

  form.addEventListener("submit", e => {

    e.preventDefault();

    const portfolio = {

      id: Date.now(),

      title:
        document.getElementById("title").value,

      type:
        document.getElementById("type").value,

      status:
        document.getElementById("status").value,

      price:
        document.getElementById("price").value,

      location:
        document.getElementById("location").value,

      description:
        document.getElementById("description").value,

      images

    };

    portfolios.unshift(portfolio);

    saveAll();

    renderAll();

    closeModal();

    showToast("Portföy eklendi");

  });

}

/* ========= CUSTOMER ========= */

document
  .getElementById("addCustomerBtn")
  .addEventListener("click", openCustomerModal);

function openCustomerModal(){

  openModal(
    "Yeni Müşteri",
    `
    <form id="customerForm">

      <div class="form-grid">

        <div class="form-group">
          <label>Ad Soyad</label>
          <input required id="name">
        </div>

        <div class="form-group">
          <label>Telefon</label>
          <input id="phone">
        </div>

        <div class="form-group">
          <label>İhtiyaç</label>

          <select id="need">
            <option>Daire</option>
            <option>Villa</option>
            <option>Arsa</option>
          </select>
        </div>

        <div class="form-group">
          <label>Bütçe</label>
          <input type="number" id="budget">
        </div>

      </div>

      <br>

      <button class="btn btn-primary">
        Kaydet
      </button>

    </form>
    `
  );

  const form =
    document.getElementById("customerForm");

  form.addEventListener("submit", e => {

    e.preventDefault();

    customers.unshift({

      id: Date.now(),

      name:
        document.getElementById("name").value,

      phone:
        document.getElementById("phone").value,

      need:
        document.getElementById("need").value,

      budget:
        document.getElementById("budget").value

    });

    saveAll();

    renderAll();

    closeModal();

    showToast("Müşteri eklendi");

  });

}

/* ========= RENDER ========= */

function renderPortfolios(){

  portfolioGrid.innerHTML = "";

  if(!portfolios.length){

    portfolioGrid.innerHTML =
      `<p>Portföy bulunamadı.</p>`;

    return;
  }

  portfolios.forEach(item => {

    portfolioGrid.innerHTML += `
      <div class="portfolio-card">

        <div class="portfolio-image">

          ${
            item.images?.[0]
            ? `<img src="${item.images[0]}">`
            : ""
          }

          <div class="portfolio-badges">
            <div class="badge-pill">
              ${item.status}
            </div>
          </div>

        </div>

        <div class="portfolio-info">

          <div class="portfolio-title">
            ${item.title}
          </div>

          <div class="portfolio-location">
            <i class="fa-solid fa-location-dot"></i>
            ${item.location}
          </div>

          <div class="portfolio-price">
            ₺${Number(item.price).toLocaleString()}
          </div>

          <div class="portfolio-meta">
            <span>${item.type}</span>
            <span>${item.images.length}/6 Foto</span>
          </div>

        </div>

      </div>
    `;

  });

}

function renderCustomers(){

  customersTableBody.innerHTML = "";

  customers.forEach(item => {

    customersTableBody.innerHTML += `
      <tr>

        <td>
          ${item.name}
        </td>

        <td>
          ${item.phone}
        </td>

        <td>
          ${item.need}
        </td>

        <td>
          ₺${Number(item.budget).toLocaleString()}
        </td>

        <td>
          <span class="status-badge status-aktif">
            Aktif
          </span>
        </td>

        <td>
          <button class="btn btn-primary">
            Detay
          </button>
        </td>

      </tr>
    `;

  });

}

function renderMatching(){

  matchingGrid.innerHTML = "";

  customers.forEach(customer => {

    const matches =
      portfolios.filter(p => {

        return (
          p.type === customer.need &&
          Number(p.price)
          <= Number(customer.budget)
        );

      });

    matchingGrid.innerHTML += `
      <div class="match-customer-card">

        <div class="match-customer-header">

          <div>
            <h3>${customer.name}</h3>

            <small>
              ${customer.need}
            </small>
          </div>

          <div>
            ${matches.length} eşleşme
          </div>

        </div>

        <div class="match-portfolios">

          ${
            matches.length
            ? matches.map(match => `
              <div class="match-portfolio-item">

                <div class="match-portfolio-img">

                  ${
                    match.images?.[0]
                    ? `<img src="${match.images[0]}">`
                    : ""
                  }

                </div>

                <div>
                  <strong>
                    ${match.title}
                  </strong>

                  <div>
                    ₺${Number(match.price).toLocaleString()}
                  </div>
                </div>

              </div>
            `).join("")
            : `<p>Uygun portföy bulunamadı.</p>`
          }

        </div>

      </div>
    `;

  });

}

function renderDashboard(){

  document.getElementById(
    "portfolioCount"
  ).textContent =
    portfolios.length;

  document.getElementById(
    "customerCount"
  ).textContent =
    customers.length;

  let totalMatches = 0;

  customers.forEach(c => {

    portfolios.forEach(p => {

      if(
        p.type === c.need &&
        Number(p.price)
        <= Number(c.budget)
      ){
        totalMatches++;
      }

    });

  });

  document.getElementById(
    "matchCount"
  ).textContent =
    totalMatches;

  recentPortfolios.innerHTML =
    portfolios.slice(0,5).map(p => `
      <div class="recent-item">

        <div class="recent-thumb">
          ${
            p.images?.[0]
            ? `<img src="${p.images[0]}">`
            : ""
          }
        </div>

        <div class="recent-info">
          <div class="recent-title">
            ${p.title}
          </div>

          <div class="recent-sub">
            ${p.location}
          </div>
        </div>

        <div class="recent-price">
          ₺${Number(p.price).toLocaleString()}
        </div>

      </div>
    `).join("");

  recentCustomers.innerHTML =
    customers.slice(0,5).map(c => `
      <div class="recent-item">

        <div class="recent-thumb">
          <i class="fa-solid fa-user"></i>
        </div>

        <div class="recent-info">
          <div class="recent-title">
            ${c.name}
          </div>

          <div class="recent-sub">
            ${c.need}
          </div>
        </div>

      </div>
    `).join("");

}

function renderAll(){

  renderPortfolios();

  renderCustomers();

  renderMatching();

  renderDashboard();

}

/* ========= SAVE ========= */

function saveAll(){

  localStorage.setItem(
    "portfolios",
    JSON.stringify(portfolios)
  );

  localStorage.setItem(
    "customers",
    JSON.stringify(customers)
  );

}

/* ========= MOBILE ========= */

const sidebar =
  document.getElementById("sidebar");

const sidebarOverlay =
  document.getElementById("sidebarOverlay");

document
  .getElementById("mobileMenuBtn")
  .addEventListener("click", () => {

    sidebar.classList.add("open");

    sidebarOverlay.classList.add("active");

  });

document
  .getElementById("sidebarClose")
  .addEventListener("click", closeSidebar);

sidebarOverlay.addEventListener(
  "click",
  closeSidebar
);

function closeSidebar(){

  sidebar.classList.remove("open");

  sidebarOverlay.classList.remove("active");

}

/* ========= INIT ========= */

renderAll();
