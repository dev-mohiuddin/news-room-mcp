import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { BadgeCheck, XCircle, AlertTriangle, Info, Loader } from "lucide-react";

import "./index.css";
import App from "./App.jsx";
import store, { persistor } from "./redux/store";
import { ThemeProvider } from "./components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import PageLoader from "@/components/shared/PageLoader";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="newsroom-mcp-theme">
        <Provider store={store}>
          <PersistGate loading={<PageLoader label="Restoring session" />} persistor={persistor}>
            <BrowserRouter>
              <App />
              <Toaster
                position="top-right"
                duration={2400}
                expand
                visibleToasts={4}
                gap={10}
                icons={{
                  success: <BadgeCheck className="text-emerald-400" size={18} />,
                  error: <XCircle size={18} className="text-red-400" />,
                  warning: <AlertTriangle size={18} className="text-yellow-400" />,
                  info: <Info size={18} className="text-blue-400" />,
                  loading: <Loader size={18} className="text-muted-foreground" />,
                }}
                offset={{ top: 20, right: 20 }}
                dir="ltr"
              />
            </BrowserRouter>
          </PersistGate>
        </Provider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
);
