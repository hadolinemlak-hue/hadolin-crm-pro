document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setupNav();
  setupMobileSidebar();
});

/* ===== MOBILE SIDEBAR ===== */
function setupMobileSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  const openBtn = document.getElementById("openSidebar");
  const closeBtn = document.getElementById("closeSidebar");

  function open() {
    sidebar.classList.add("open");
    overlay.classList.add("active");
  }

  function close() {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
  }

  openBtn?.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  overlay?.addEventListener("click", close);
}

/* ===== DATA ===== */
let state = { listings: [], customers: [] };

async function loadData() {
  try {
    const res = await fetch("data.json");
    const data = await res.json();

    state.listings = data.listings || [];
    state.customers = data.customers || [];
  } catch {
    state.listings = [];
    state.customers = [];
  }

  renderAll();
}

/* ===== RENDER ===== */
function renderAll() {
  document.getElementById("totalListings").innerText = state.listings.length;
  document.getElementById("totalCustomers").innerText = state.customers.length;

  renderListings();
  renderCustomers();
}

/* ===== LISTINGS ===== */
function renderListings() {
  const grid = document.getElementById("portfolioGrid");
  if (!grid) return;

  grid.innerHTML = "";

  state.listings.forEach(i => {
    grid.innerHTML += `
      <div class="card">
        <div style="font-weight:600">${i.title}</div>
        <div>${i.price?.toLocaleString("tr-TR")} ₺</div>
        <div style="color:#64748b;font-size:12px">${i.location || ""}</div>
      </div>
    `;
  });
}

/* ===== CUSTOMERS (IPHONE SAFE) ===== */
function renderCustomers() {
  const tbody = document.getElementById("customerTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  state.customers.forEach(c => {
    const phoneClean = (c.phone || "").replace(/\D/g, "");

    tbody.innerHTML += `
      <tr>
        <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis">
          ${c.name}
        </td>

        <td>
          <a class="btn btn-call" href="tel:${phoneClean}">
            Ara
          </a>

          <a class="btn btn-whatsapp"
             target="_blank"
             href="https://wa.me/${phoneClean}">
            WhatsApp
          </a>
        </td>

        <td>${c.status || "aktif"}</td>
      </tr>
    `;
  });
}

/* ===== NAV ===== */
function setupNav() {
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {

      document.querySelectorAll(".page")
        .forEach(p => p.classList.add("hidden"));

      const page = btn.dataset.page;
      document.getElementById(page + "Page").classList.remove("hidden");

      document.querySelectorAll(".nav-item")
        .forEach(n => n.classList.remove("active"));

      btn.classList.add("active");
    });
  });
}
