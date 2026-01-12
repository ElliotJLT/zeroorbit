import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Chat from "./pages/Chat";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import PracticeArena from "./pages/PracticeArena";
import ArenaSession from "./pages/ArenaSession";
import PastPapers from "./pages/PastPapers";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import Progress from "./pages/Progress";
import CalculatorPage from "./pages/CalculatorPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/practice-arena" element={<PracticeArena />} />
          <Route path="/arena-session" element={<ArenaSession />} />
          <Route path="/past-papers" element={<PastPapers />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
