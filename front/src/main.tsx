import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { initialiserAuth } from "./lib/auth";
import "./styles.css";

/**
 * L'authentification est résolue avant le premier rendu : sans cela, la
 * première requête à l'API partirait sans jeton et échouerait en 401.
 */
initialiserAuth()
  .catch((e) => {
    console.error("Initialisation de l'authentification impossible :", e);
  })
  .finally(() => {
    createRoot(document.getElementById("racine")!).render(
      <StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StrictMode>,
    );
  });
