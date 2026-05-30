// ===== STORAGE =====

let uploadedPhotos = [];

// ===== MENU ACTIVE =====

const navItems =
    document.querySelectorAll(".nav-item");

navItems.forEach(item => {

    item.addEventListener("click", function () {

        navItems.forEach(nav => {
            nav.classList.remove("active");
        });

        this.classList.add("active");

    });

});

// ===== MODAL =====

const modal =
    document.getElementById("portfolioModal");

const openBtn =
    document.getElementById("openPortfolioModal");

const closeBtn =
    document.getElementById("closePortfolioModal");

openBtn.addEventListener("click", () => {

    modal.classList.add("active");

});

closeBtn.addEventListener("click", () => {

    modal.classList.remove("active");

});

// ===== PHOTO =====

document
.getElementById("photoInput")
.addEventListener("change", function (e) {

    uploadedPhotos = [];

    const files = e.target.files;

    for (let file of files) {

        const reader = new FileReader();

        reader.onload = function (event) {

            uploadedPhotos.push(
                event.target.result
            );

        };

        reader.readAsDataURL(file);

    }

});

// ===== SAVE =====

document
.getElementById("savePortfolio")
.addEventListener("click", savePortfolio);

function savePortfolio() {

    const title =
        document.getElementById("title").value;

    const price =
        document.getElementById("price").value;

    const location =
        document.getElementById("location").value;

    const description =
        document.getElementById("description").value;

    if (!title || !price) {

        alert("Başlık ve fiyat gerekli");

        return;
    }

    const portfolios =
        JSON.parse(
            localStorage.getItem("portfolios")
        ) || [];

    const portfolio = {

        id: crypto.randomUUID(),

        title,
        price,
        location,
        description,

        photos: uploadedPhotos

    };

    portfolios.push(portfolio);

    localStorage.setItem(
        "portfolios",
        JSON.stringify(portfolios)
    );

    modal.classList.remove("active");

    loadPortfolios();

    clearForm();

}

// ===== LOAD =====

function loadPortfolios() {

    const portfolios =
        JSON.parse(
            localStorage.getItem("portfolios")
        ) || [];

    const grid =
        document.getElementById("portfolioGrid");

    const count =
        document.getElementById("portfolioCount");

    count.textContent = portfolios.length;

    grid.innerHTML = "";

    portfolios.forEach(portfolio => {

        let imageHTML = "";

        if (
            portfolio.photos &&
            portfolio.photos.length > 0
        ) {

            imageHTML = `
                <img src="${portfolio.photos[0]}">
            `;

        }

        grid.innerHTML += `

            <div class="portfolio-card">

                <div class="portfolio-image">

                    ${imageHTML}

                </div>

                <div class="portfolio-info">

                    <div class="portfolio-title">
                        ${portfolio.title}
                    </div>

                    <div class="portfolio-location">
                        ${portfolio.location}
                    </div>

                    <div class="portfolio-price">
                        ₺${Number(portfolio.price).toLocaleString("tr-TR")}
                    </div>

                </div>

            </div>

        `;

    });

}

// ===== CLEAR =====

function clearForm() {

    document.getElementById("title").value = "";

    document.getElementById("price").value = "";

    document.getElementById("location").value = "";

    document.getElementById("description").value = "";

    document.getElementById("photoInput").value = "";

    uploadedPhotos = [];

}

// ===== INIT =====

loadPortfolios();
