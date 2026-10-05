import { shouldRetryQuery } from "@/lib/query-retry";
import { installAuthCacheIsolation } from "@/lib/auth-query-cache";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import "@/i18n";
import { TooltipProvider } from "@/components/ui/tooltip";
import App from "@/App";
import { PdfPreview } from "@/components/pdf-preview";
import "@/index.css";
import "@/styles/lulu.css";
import "@/styles/royal.css";
import "@/styles/pages-royal.css";
import "@/styles/cards-royal.css";

// Show the interface immediately with its system-font fallback while the
// external font stylesheet downloads. Apply the original fonts when ready.
const appFonts = document.getElementById("app-fonts") as HTMLLinkElement | null;
if (appFonts?.sheet) appFonts.media = "all";
else appFonts?.addEventListener("load", () => { appFonts.media = "all"; }, { once: true });

// Makes SanaD installable as an app (production builds only; the dev server
// would otherwise serve stale files from the worker cache).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: shouldRetryQuery, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});
installAuthCacheIsolation(queryClient);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider delayDuration={200}>
          <App />
          <PdfPreview />
          <Toaster position="top-center" richColors closeButton />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
