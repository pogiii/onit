import { load, Store } from '@tauri-apps/plugin-store';
// when using `"withGlobalTauri": true`, you may use
// const { load } = window.__TAURI__.store;

let storeInstance: Store | null = null;

export const getStore = async () => {
    console.log("getStore called, storeInstance:", storeInstance);
    if (!storeInstance) {
        console.log("Initializing store...");
        try {
            storeInstance = await load('app-store.json', { autoSave: true });
            console.log("Store initialized successfully:", storeInstance);
        } catch (error) {
            console.error("Failed to initialize store:", error);
            throw error;
        }
    }
    return storeInstance;
};

// For backward compatibility, you can still export a store object
// but it will be initialized when first accessed
export const store = {
    async set(key: string, value: any) {
        console.log("Store.set called with:", key, value);
        try {
            const store = await getStore();
            const result = await store.set(key, value);
            console.log("Store.set result:", result);
            return result;
        } catch (error) {
            console.error("Store.set error:", error);
            throw error;
        }
    },
    async get<T>(key: string): Promise<T | null> {
        console.log("Store.get called with:", key);
        try {
            const store = await getStore();
            const result = await store.get<T>(key);
            console.log("Store.get result:", result);
            return result ?? null;
        } catch (error) {
            console.error("Store.get error:", error);
            throw error;
        }
    },
    async save() {
        console.log("Store.save called");
        try {
            const store = await getStore();
            const result = await store.save();
            console.log("Store.save result:", result);
            return result;
        } catch (error) {
            console.error("Store.save error:", error);
            throw error;
        }
    }
};

// // Set a value.
// await store.set('some-key', { value: 5 });

// // Get a value.
// const val = await store.get<{ value: number }>('some-key');
// console.log(val); // { value: 5 }

// // You can manually save the store after making changes.
// // Otherwise, it will save upon graceful exit
// // And if you set `autoSave` to a number or left empty,
// // it will save the changes to disk after a debounce delay, 100ms by default.
// await store.save();