import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, UserPlus } from "lucide-react";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import DemoLoginCards from "@/components/auth/DemoLoginCards";
import AuthOrDivider from "@/components/auth/AuthOrDivider";

import { fadeUp } from "@/lib/animations";
import { getRedirectFor } from "@/lib/permissions";

const TAB_HEADERS = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to your workspace",
  },
  register: {
    title: "Create your account",
    subtitle: "Start publishing with AI today",
  },
};

const PANEL_VARIANTS = {
  enter: { opacity: 0, y: 12 },
  center: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
  exit: { opacity: 0, y: -12, transition: { duration: 0.18 } },
};

export default function AuthTabs({ defaultTab = "login" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const user = useSelector((s) => s.auth.user);

  // Bounce already-authenticated users out of the auth surface.
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getRedirectFor(user), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Switching the tab also updates the URL so deep links keep working.
  const onTabChange = (next) => {
    if (next === "login") {
      navigate("/auth/login", { replace: true, state: location.state });
    } else if (next === "register") {
      navigate("/auth/register", { replace: true, state: location.state });
    }
  };

  const header = TAB_HEADERS[defaultTab];

  return (
    <Tabs value={defaultTab} onValueChange={onTabChange} className="w-full">
      {/* Header swaps with the tab */}
      <AnimatePresence mode="wait">
        <motion.div
          key={defaultTab}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="mb-6"
        >
          <h2 className="font-display text-3xl">{header.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{header.subtitle}</p>
        </motion.div>
      </AnimatePresence>

      {/* Glassy tab switcher */}
      <TabsList className="w-full grid grid-cols-2 h-11 p-1.5 mb-6">
        <TabsTrigger value="login" className="gap-2">
          <LogIn className="h-3.5 w-3.5" /> Sign In
        </TabsTrigger>
        <TabsTrigger value="register" className="gap-2">
          <UserPlus className="h-3.5 w-3.5" /> Sign Up
        </TabsTrigger>
      </TabsList>

      {/* Animated panel container */}
      <AnimatePresence mode="wait">
        {defaultTab === "login" ? (
          <motion.div
            key="login-panel"
            variants={PANEL_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <TabsContent value="login" forceMount>
              <DemoLoginCards />
              <AuthOrDivider label="or sign in with email" />
              <LoginForm />

              <p className="text-center text-sm text-muted-foreground pt-6">
                New to Newsroom MCP?{" "}
                <button
                  type="button"
                  onClick={() => onTabChange("register")}
                  className="text-foreground font-medium hover:underline"
                >
                  Create an account
                </button>
              </p>
            </TabsContent>
          </motion.div>
        ) : (
          <motion.div
            key="register-panel"
            variants={PANEL_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <TabsContent value="register" forceMount>
              <RegisterForm />

              <p className="text-center text-sm text-muted-foreground pt-6">
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => onTabChange("login")}
                  className="text-foreground font-medium hover:underline"
                >
                  Sign in instead
                </button>
              </p>
            </TabsContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Tabs>
  );
}
