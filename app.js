const API_URL = "https://raw.githubusercontent.com/KULLANICI_ADIN/repo/main/data.json";

let listings = [];
let customers = [];

let currentPage = 1;
const perPage = 12;

/* ================= FETCH DATA ================= */
async function fetchData(){
  try{
    const res = await fetch(API_URL);
    const data = await res.json();

    listings = data.listings;
    customers = data.customers;

    renderListings();
    renderCustomers();
  }catch(err){
    console.error("Data load error:",err);
  }
}

/* ================= LISTINGS ================= */
function renderListings(){
  const container = document.getElementById("listings");
  container.innerHTML = "";

  const start = (currentPage-1)*perPage;
  const pageItems = listings.slice(start,start+perPage);

  const frag = document.createDocumentFragment();

  pageItems.forEach(item=>{
    const div = document.createElement("div");
    div.className="card";

    const phoneClean = item.phone.replace(/\D/g,"");

    div.innerHTML=`
      <img src="${item.img}" loading="lazy"/>
      <div class="card-body">
        <div class="title">${item.title}</div>
        <div class="price">${item.price}</div>

        <div style="margin-top:8px; display:flex; gap:6px;">
          <a class="btn btn-call" href="tel:${item.phone}">
            Ara
          </a>

          <a class="btn btn-wa"
             target="_blank"
             href="https://wa.me/${phoneClean}">
            WhatsApp
          </a>
        </div>
      </div>
    `;

    frag.appendChild(div);
  });

  container.appendChild(frag);

  renderPagination();
}

/* ================= PAGINATION ================= */
function renderPagination(){
  const el = document.getElementById("pagination");
  el.innerHTML="";

  const pages = Math.ceil(listings.length / perPage);

  for(let i=1;i<=pages;i++){
    const btn = document.createElement("button");
    btn.className="page-btn"+(i===currentPage?" active":"");
    btn.textContent=i;

    btn.onclick=()=>{
      currentPage=i;
      renderListings();
    };

    el.appendChild(btn);
  }
}

/* ================= CUSTOMERS ================= */
function renderCustomers(){
  const tbody = document.getElementById("customers");
  tbody.innerHTML="";

  const frag = document.createDocumentFragment();

  customers.forEach(c=>{
    const tr = document.createElement("tr");

    const clean = c.phone.replace(/\D/g,"");

    tr.innerHTML=`
      <td>${c.name}</td>
      <td>
        <a href="tel:${c.phone}">${c.phone}</a>
      </td>
      <td>
        <a class="btn btn-call" href="tel:${c.phone}">Ara</a>
        <a class="btn btn-wa"
           target="_blank"
           href="https://wa.me/${clean}">
           WhatsApp
        </a>
      </td>
    `;

    frag.appendChild(tr);
  });

  tbody.appendChild(frag);
}

/* ================= SEARCH ================= */
document.getElementById("search").addEventListener("input",(e)=>{
  const q = e.target.value.toLowerCase();

  const filtered = listings.filter(x =>
    x.title.toLowerCase().includes(q)
  );

  const container = document.getElementById("listings");
  container.innerHTML="";

  filtered.slice(0,perPage).forEach(item=>{
    const div = document.createElement("div");
    div.className="card";

    const clean = item.phone.replace(/\D/g,"");

    div.innerHTML=`
      <img src="${item.img}" loading="lazy"/>
      <div class="card-body">
        <div class="title">${item.title}</div>
        <div class="price">${item.price}</div>

        <div style="margin-top:8px;">
          <a class="btn btn-call" href="tel:${item.phone}">Ara</a>
          <a class="btn btn-wa" target="_blank"
             href="https://wa.me/${clean}">
             WhatsApp
          </a>
        </div>
      </div>
    `;

    container.appendChild(div);
  });
});

/* ================= INIT ================= */
fetchData();
