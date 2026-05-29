let state = {
  listings: [],
  customers: []
};

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setupNav();
});

/* ===== DATA LOAD (GitHub JSON + fallback) ===== */
async function loadData() {
  try {
    // GitHub raw JSON (bunu sen değiştirirsin)
    const res = await fetch("data.json");
    const data = await res.json();

    state.listings = data.listings || [];
    state.customers = data.customers || [];

  } catch (e) {
    console.log("GitHub data yok, local fallback");

    state.listings = JSON.parse(localStorage.getItem("listings") || "[]");
    state.customers = JSON.parse(localStorage.getItem("customers") || "[]");
  }

  renderAll();
}

/* ===== RENDER ===== */
function renderAll() {
  renderStats();
  renderListings();
  renderCustomers();
}

/* ===== STATS ===== */
function renderStats() {
  document.getElementById("totalListings").innerText = state.listings.length;
  document.getElementById("totalCustomers").innerText = state.customers.length;
}

/* ===== LISTINGS ===== */
function renderListings() {
  const grid = document.getElementById("portfolioGrid");
  if (!grid) return;

  grid.innerHTML = "";

  state.listings.forEach(item => {
    grid.innerHTML += `
      <div class="card">
        <h3>${item.title}</h3>
        <p>${item.price} ₺</p>
        <p>${item.location || ""}</p>
      </div>
    `;
  });
}

/* ===== CUSTOMERS ===== */
function renderCustomers() {
  const tbody = document.getElementById("customerTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  state.customers.forEach(c => {

    const phone = c.phone || "";

    tbody.innerHTML += `
      <tr>
        <td>${c.name}</td>

        <td>
          <a class="btn btn-call" href="tel:${phone}">
            Ara
          </a>

          <a class="btn btn-whatsapp" target="_blank"
             href="https://wa.me/${phone.replace(/\D/g,'')}">
            WhatsApp
          </a>
        </td>

        <td>${c.status || "aktif"}</td>
      </tr>
    `;
  });
}

/* ===== NAVIGATION ===== */
function setupNav() {
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));

      const page = btn.dataset.page;
      document.getElementById(page + "Page").classList.remove("hidden");

      document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}
