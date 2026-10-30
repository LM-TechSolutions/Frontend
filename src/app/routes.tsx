import React, { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router";
import ProtectedRoute, { RequireAdmin } from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import RouteError, { ErrorPage } from "./pages/ErrorPage";

// Login is loaded eagerly for instant first-paint on authentication
import Login from "./pages/Login";

// Lazy-loaded pages to enable code splitting
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const EnrollTwoFactor = lazy(() => import("./pages/EnrollTwoFactor"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Rides = lazy(() => import("./pages/Rides"));
const Drivers = lazy(() => import("./pages/Drivers"));
const Coupons = lazy(() => import("./pages/Coupons"));
const Settings = lazy(() => import("./pages/Settings"));
const RideTracking = lazy(() => import("./pages/RideTracking"));
const Operators = lazy(() => import("./pages/Operators"));
const Analytics = lazy(() => import("./pages/Analytics"));
const CallLogs = lazy(() => import("./pages/CallLogs"));
const DriverReport = lazy(() => import("./pages/DriverReport"));
const Admins = lazy(() => import("./pages/Admins"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const Notifications = lazy(() => import("./pages/Notifications"));

function PageFallback() {
  return (
    <div className="flex h-full min-h-[350px] w-full items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
    </div>
  );
}

const withLazy = (Component: React.LazyExoticComponent<React.ComponentType<any>>) => (
  <Suspense fallback={<PageFallback />}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteError />,
    children: [
      { path: "/", element: <Login /> },
      { path: "/reset-password", element: withLazy(ResetPassword) },
      {
        element: <ProtectedRoute />,
        errorElement: <RouteError />,
        children: [
          { path: "/enroll-2fa", element: withLazy(EnrollTwoFactor) },
          {
            path: "/",
            element: <DashboardLayout />,
            errorElement: <RouteError />,
            children: [
              { path: "dashboard", element: withLazy(Dashboard) },
              { path: "operators", element: withLazy(Operators) },
              { path: "call-logs", element: withLazy(CallLogs) },
              { path: "rides", element: withLazy(Rides) },
              { path: "rides/:rideId", element: withLazy(RideTracking) },
              { path: "drivers", element: withLazy(Drivers) },
              { path: "settings", element: withLazy(Settings) },
              { path: "notifications", element: withLazy(Notifications) },
              { path: "audit-log", element: withLazy(AuditLog) },
              { path: "employees/:employeeId", element: withLazy(DriverReport) },
              { path: "admins", element: withLazy(Admins) },
              { path: "coupons", element: withLazy(Coupons) },
              {
                element: <RequireAdmin />,
                children: [{ path: "analytics", element: withLazy(Analytics) }],
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
