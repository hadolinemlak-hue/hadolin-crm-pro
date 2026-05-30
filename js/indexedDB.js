const DB_NAME = "HadolinCRM";
const DB_VERSION = 1;

const PHOTO_STORE = "photos";

export async function openDB() {

    return new Promise((resolve, reject) => {

        const request =
        indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {

            const db = event.target.result;

            if (
                !db.objectStoreNames.contains(PHOTO_STORE)
            ) {

                db.createObjectStore(
                    PHOTO_STORE,
                    { keyPath: "id" }
                );
            }
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function savePhoto(photoData) {

    const db = await openDB();

    return new Promise((resolve, reject) => {

        const tx =
        db.transaction(PHOTO_STORE, "readwrite");

        const store =
        tx.objectStore(PHOTO_STORE);

        const request =
        store.put(photoData);

        request.onsuccess = () => {
            resolve(true);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function getPhoto(id) {

    const db = await openDB();

    return new Promise((resolve, reject) => {

        const tx =
        db.transaction(PHOTO_STORE, "readonly");

        const store =
        tx.objectStore(PHOTO_STORE);

        const request =
        store.get(id);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function deletePhoto(id) {

    const db = await openDB();

    return new Promise((resolve, reject) => {

        const tx =
        db.transaction(PHOTO_STORE, "readwrite");

        const store =
        tx.objectStore(PHOTO_STORE);

        const request =
        store.delete(id);

        request.onsuccess = () => {
            resolve(true);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}
