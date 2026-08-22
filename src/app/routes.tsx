import { createBrowserRouter } from "react-router";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import EnrollTwoFactor from "./pages/EnrollTwoFactor";
import ProtectedRoute from "./components/ProtectedRoute";
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

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/enroll-2fa",
        element: <EnrollTwoFactor />,
      },
      {
        path: "/",
        element: <DashboardLayout />,
        children: [
          {
            path: "dashboard",
            element: <Dashboard />,
          },
          {
            path: "analytics",
            element: <Analytics />,
          },
          {
            path: "operators",
            element: <Operators />,
          },
          {
            path: "call-logs",
            element: <CallLogs />,
          },
          {
            path: "rides",
            element: <Rides />,
          },
          {
            path: "rides/:rideId",
            element: <RideTracking />,
          },
          {
            path: "drivers",
            element: <Drivers />,
          },
          {
            path: "coupons",
            element: <Coupons />,
          },
          {
            path: "settings",
            element: <Settings />,
          },
          {
            path: "audit-log",
            element: <AuditLog />,
          },
          {
            path: "employees/:employeeId",
            element: <DriverReport />,
          },
          {
            path: "admins",
            element: <Admins />,
          },
        ],
      },
    ],
  },
]);
