import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

// Marca o <html> com "tauri" quando rodando dentro do shell desktop.
// O CSS usa isso pra deixar o body transparente (cantos arredondados da janela).
// Em browser puro, mantém body opaco pra não vazar branco em volta.
if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
  document.documentElement.classList.add("tauri");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
