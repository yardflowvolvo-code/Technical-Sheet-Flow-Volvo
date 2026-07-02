import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { detectLang } from "@/lib/i18n";

document.documentElement.lang = detectLang() === "pt" ? "pt-BR" : "en";

createRoot(document.getElementById("root")!).render(<App />);
