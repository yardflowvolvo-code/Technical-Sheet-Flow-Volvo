import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import { dark } from "@clerk/themes";
import App from "./App";
import "./index.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

if (!publishableKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider
    publishableKey={publishableKey}
    appearance={{ baseTheme: dark }}
    afterSignOutUrl={import.meta.env.BASE_URL || "/superadmin/"}
  >
    <App />
  </ClerkProvider>
);
