import { Navigate, Outlet } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../utils/constants";

export default function GuestRoute() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) return <LoadingSpinner className="min-h-screen" />;
  if (isAuthenticated) return <Navigate to={ROUTES.home} replace />;

  return <Outlet />;
}
