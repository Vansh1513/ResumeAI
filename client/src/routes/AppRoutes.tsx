import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import AuthLayout from "../layouts/AuthLayout";
import Dashboard from "../pages/Dashboard";
import AnalysisDetail from "../pages/AnalysisDetail";
import History from "../pages/History";
import JobMatch from "../pages/JobMatch";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ResumeDetail from "../pages/ResumeDetail";
import Upload from "../pages/Upload";
import GuestRoute from "./GuestRoute";
import ProtectedRoute from "./ProtectedRoute";
import { ROUTES } from "../utils/constants";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public auth pages — redirect to dashboard if already logged in */}
      <Route element={<GuestRoute />}>
        <Route element={<AuthLayout />}>
          <Route path={ROUTES.login} element={<Login />} />
          <Route path={ROUTES.register} element={<Register />} />
        </Route>
      </Route>

      {/* App pages — require JWT */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path={ROUTES.home} element={<Dashboard />} />
          <Route path={ROUTES.upload} element={<Upload />} />
          <Route path="/resumes/:id" element={<ResumeDetail />} />
          <Route path="/match/:resumeId" element={<JobMatch />} />
          <Route path={ROUTES.history} element={<History />} />
          <Route path="/history/:analysisId" element={<AnalysisDetail />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Routes>
  );
}
