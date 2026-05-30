import { Storage } from "./storage.js";

let uploadedPhotos = [];

// FOTOĞRAF EKLEME
const photoInput = document.getElementById("photoInput");

photoInput.addEventListener("change", function (e) {

    const files = Array.from(e.target.files);

    files.forEach(file => {

        const reader = new FileReader();

        reader.onload = function (event) {

            uploadedPhotos.push(event.target.result);

            renderPhotoPreviews();
        };

        reader.readAsDataURL(file);
    });
});

// FOTOĞRAF ÖNİZLEME
function renderPhotoPreviews() {

    const preview = document.getElementById("photoPreview");

    preview.innerHTML = "";

    uploadedPhotos.forEach((photo, index) => {

        preview.innerHTML += `
            <div class="photo-preview-item">
                <img src="${photo}" />
                <button onclick="removePhoto(${index})">
                    X
                </button>
            </div>
        `;
    });
}

// FOTOĞRAF SİL
window.removePhoto = function(index) {

    uploadedPhotos.splice(index, 1);

    renderPhotoPreviews();
};

// PORTFÖY KAYDET
window.savePortfolio = function () {

    const portfolios =
        Storage.get("portfolios") || [];

    const portfolio = {

        id: crypto.randomUUID(),

        title: document.getElementById("title").value,

        price: document.getElementById("price").value,

        location: document.getElementById("location").value,

        description: document.getElementById("description").value,

        photos: uploadedPhotos,

        createdAt: new Date().toISOString()
    };

    portfolios.push(portfolio);

    Storage.save("portfolios", portfolios);

    alert("Portföy kaydedildi");

    document.getElementById("portfolioForm").reset();

    uploadedPhotos = [];

    renderPhotoPreviews();
};
