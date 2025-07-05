import { Outlet, useNavigate } from "react-router";
import { useAccount } from "../provider/account-provider";
import { useEffect } from "react";

export const AccountLayout = () => {
    const { isLoggedIn, userId, isLoading } = useAccount();
    const navigate = useNavigate();

    useEffect(() => {
        console.log("AccountLayout - Current state:", { isLoggedIn, userId, isLoading });
        
        if (!isLoggedIn && !isLoading) {
            console.log("User not logged in, navigating to login");
            navigate("/login");
        }
    }, [isLoggedIn, isLoading, navigate]);

    return (
        <Outlet />
    );
};