import { createBrowserRouter, Outlet } from "react-router";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import EnrollTwoFactor from "./pages/EnrollTwoFactor";
import ProtectedRoute, { RequireAdmin } from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Rides from "./pages/Rides";
import Drivers from "./pages/Drivers";
import Coupons from "./pages/Coupons";
import Settings from "./pages/Settings";
import RideTracking from "./pages/RideTracking";
import Operators from "./pages/Operators";
import Analytics from "./pages/Analytics";
import CallLogs from "./pages/CallLogs";
import DriverReport from "./pages/DriverReport";
import Admins from "./pages/Admins";
import AuditLog from "./pages/AuditLog";
import Notifications from "./pages/Notifications";
import RouteError, { ErrorPage } from "./pages/ErrorPage";

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteError />,
    children: [
      { path: "/", element: <Login /> },
      { path: "/reset-password", element: <ResetPassword /> },
      {
        element: <ProtectedRoute />,
        errorElement: <RouteError />,
        children: [
          { path: "/enroll-2fa", element: <EnrollTwoFactor /> },
          {
            path: "/",
            element: <DashboardLayout />,
            errorElement: <RouteError />,
            children: [
              { path: "dashboard", element: <Dashboard /> },
              { path: "operators", element: <Operators /> },
              { path: "call-logs", element: <CallLogs /> },
              { path: "rides", element: <Rides /> },
              { path: "rides/:rideId", element: <RideTracking /> },
              { path: "drivers", element: <Drivers /> },
              { path: "settings", element: <Settings /> },
              { path: "notifications", element: <Notifications /> },
              { path: "audit-log", element: <AuditLog /> },
              { path: "employees/:employeeId", element: <DriverReport /> },
              { path: "admins", element: <Admins /> },
              // Operators belong here, not behind RequireAdmin: they hold their
              // own coupon inventory, they are who a driver's refill request is
              // addressed to, and approving it is their job. Gating the page on
              // admin made the operator tier of the hierarchy unreachable — the
              // backend scoped every endpoint for them, and the page has an
              // operator view, but no operator could open it. The page renders
              // an operator or admin view from the session, and every endpoint
              // it calls re-checks the role server-side.
              { path: "coupons", element: <Coupons /> },
              {
                element: <RequireAdmin />,
                children: [{ path: "analytics", element: <Analytics /> }],
              },
              { path: "*", element: <ErrorPage status={404} /> },
            ],
          },
        ],
      },
      { path: "*", element: <ErrorPage status={404} /> },
    ],
  },
]);
