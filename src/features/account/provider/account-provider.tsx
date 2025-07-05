import { store } from "@/lib/store-init";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const accountContext = createContext<{isLoggedIn: boolean, userId: string | null, setUserId: (userId: string) => void, isLoading: boolean} | null>(null);

export const useAccount = () => {
    const context = useContext(accountContext);
    if (!context) {
        throw new Error("useAccount must be used within an AccountProvider");
    }
    return context;
}

export const AccountProvider = ({ children }: { children: React.ReactNode }) => {
    const [_userId, _setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const setUserId = useCallback(async (userId: string) => {
        console.log("Setting userId:", userId);
        setIsLoading(true);
        try {
            await store.set("userId", userId);
            console.log("Successfully saved userId to store");
            _setUserId(userId);
        } catch (error) {
            console.error("Error setting user ID", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadUserId = useCallback(async () => {
        console.log("Loading userId from store...");
        try {
            const userId = await store.get<string>("userId");
            console.log("Loaded userId from store:", userId);
            _setUserId(userId ?? null);
        } catch (error) {
            console.error("Error loading user ID", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        console.log("AccountProvider mounted, loading userId...");
        loadUserId();
    }, [loadUserId]);

    const value = {
        isLoggedIn: _userId !== null,
        userId: _userId,
        setUserId,
        isLoading
    }
    
    console.log("AccountProvider state:", { userId: _userId, isLoggedIn: _userId !== null, isLoading });
    
    return (
        <accountContext.Provider value={value}>
            {children}
        </accountContext.Provider>
    )
}