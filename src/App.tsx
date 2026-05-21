import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { useEffect, useState } from "react";

import HomePage from "./pages/HomePage";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminLogin from "./pages/admin/AdminLogin";
import Gallery from "./pages/Gallery";
import TicketPage from "./pages/TicketPage";
import ScannerPage from "./pages/admin/ScannerPage";

import ErrorBoundary from "./components/ErrorBoundary";

function AdminProtectedRoute({
  children,
}: {
  children: JSX.Element;
}) {

  const [authorized, setAuthorized] =
    useState<boolean | null>(null);

  useEffect(() => {

    const admin =
      localStorage.getItem("admin-auth");

    if (admin) {
      setAuthorized(true);
    } else {
      setAuthorized(false);
    }

  }, []);

  if (authorized === null) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#111",
          color: "#fff",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!authorized) {
    return (
      <Navigate to="/admin/login" />
    );
  }

  return children;
}

export default function App() {

  return (
    <ErrorBoundary>

      <BrowserRouter>

        <Routes>

          <Route
            path="/"
            element={<HomePage />}
          />

          <Route
            path="/gallery"
            element={<Gallery />}
          />

          <Route
            path="/ticket/:id"
            element={<TicketPage />}
          />

          <Route
            path="/admin/login"
            element={<AdminLogin />}
          />

          <Route
            path="/admin/dashboard"
            element={
              <AdminProtectedRoute>
                <AdminOverview />
              </AdminProtectedRoute>
            }
          />

          <Route
            path="/admin/scanner"
            element={
              <AdminProtectedRoute>
                <ScannerPage />
              </AdminProtectedRoute>
            }
          />

        </Routes>

      </BrowserRouter>

    </ErrorBoundary>
  );
                       }
