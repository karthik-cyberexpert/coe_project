import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import DashboardLayout from "./components/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import Departments from "./pages/Departments";
import Sheets from "./pages/Sheets";
import Subjects from "./pages/Subjects";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import CoeProtectedRoute from "./components/CoeProtectedRoute";
import CoeSheets from "./pages/CoeSheets";
import SubAdminProtectedRoute from "./components/SubAdminProtectedRoute";
import SubAdminSheets from "./pages/SubAdminSheets";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route element={<AdminProtectedRoute />}>
              <Route path="/departments" element={<Departments />} />
              <Route path="/sheets" element={<Sheets />} />
              <Route path="/subjects" element={<Subjects />} />
            </Route>
            <Route element={<CoeProtectedRoute />}>
              <Route path="/coe-sheets" element={<CoeSheets />} />
            </Route>
            <Route element={<SubAdminProtectedRoute />}>
              <Route path="/subadmin-sheets" element={<SubAdminSheets />} />
            </Route>
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;