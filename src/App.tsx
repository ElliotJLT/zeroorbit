import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import AskQuestion from "./pages/AskQuestion";
import Chat from "./pages/Chat";
import Progress from "./pages/Progress";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import PracticeArena from "./pages/PracticeArena";
import ArenaSession from "./pages/ArenaSession";
import PastPapers from "./pages/PastPapers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/home" element={<Home />} />
            <Route path="/ask" element={<AskQuestion />} />
            <Route path="/chat/:sessionId" element={<Chat />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/practice-arena" element={<PracticeArena />} />
            <Route path="/arena-session" element={<ArenaSession />} />
            <Route path="/past-papers" element={<PastPapers />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
