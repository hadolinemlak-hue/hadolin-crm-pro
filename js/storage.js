export const Storage = {

    save(key, data) {

        localStorage.setItem(
            key,
            JSON.stringify(data)
        );
    },

    get(key) {

        const data = localStorage.getItem(key);

        return data
            ? JSON.parse(data)
            : [];
    },

    remove(key) {
        localStorage.removeItem(key);
    }
};
