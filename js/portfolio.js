import { savePhoto } from "./indexedDB.js";

const photoInput =
document.getElementById("photoInput");

let uploadedPhotos = [];

photoInput.addEventListener("change", async (e) => {

    const files = [...e.target.files];

    for (const file of files) {

        const photoId =
        crypto.randomUUID();

        await savePhoto({

            id: photoId,
            file
        });

        uploadedPhotos.push(photoId);
    }

    console.log("Fotoğraflar kaydedildi");
});
