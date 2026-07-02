import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import App from "./App";
import "./index.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

if (!publishableKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider
    publishableKey={publishableKey}
    afterSignOutUrl={import.meta.env.BASE_URL || "/superadmin/"}
    appearance={{
      variables: {
        colorPrimary: "#2F5FCE",
        colorPrimaryForeground: "#ffffff",
        colorBackground: "#ffffff",
        colorForeground: "#0f1b33",
        colorMutedForeground: "#5b6b85",
        colorMuted: "#f1f4fa",
        colorInput: "#ffffff",
        colorInputForeground: "#0f1b33",
        colorBorder: "#e4e9f2",
        colorRing: "#2F5FCE",
        colorDanger: "#ef4444",
        borderRadius: "0.75rem",
        fontFamily: "Outfit, sans-serif",
      },
      elements: {
        card: "shadow-xl border border-[#e4e9f2]",
        headerTitle: "text-[#0f1b33]",
        headerSubtitle: "text-[#5b6b85]",
        formButtonPrimary:
          "bg-[#2F5FCE] hover:bg-[#24499E] text-white normal-case font-semibold",
        footerActionLink: "text-[#2F5FCE] hover:text-[#24499E]",
        socialButtonsBlockButton: "border-[#e4e9f2]",
      },
    }}
  >
    <App />
  </ClerkProvider>
);
