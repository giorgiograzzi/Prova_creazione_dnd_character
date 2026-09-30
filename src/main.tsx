import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import it from "./i18n/it.json";

document.title = it.app.title;
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
