/**
 * Chargement des composants servis en ligne par la plateforme Konitys.
 *
 * La barre du haut (`./HeaderBar`) et la barre latérale (`./Sidebar`) sont
 * communes à toutes les applications de la plateforme : elles sont publiées
 * une fois par le hub et chargées ici à l'exécution (Module Federation), comme
 * dans Stock Manager. Une évolution du hub se propage donc sans redéployer le
 * kanban.
 *
 * Repris de Stock Manager (`client-stock/src/remoteLoader.ts`).
 */

import * as React from "react";
import * as ReactDOM from "react-dom";

/**
 * Le hub du domaine `orkessidev.com`, celui du kanban. Les adresses Railway
 * encore citées par Stock Manager ne répondent plus.
 */
const PLATEFORM_URL =
  (import.meta.env.VITE_PLATEFORM_URL as string | undefined) ||
  "https://plateform.orkessidev.com";

interface RemoteContainer {
  init: (shareScope: Record<string, unknown>) => void;
  get: (module: string) => Promise<() => unknown>;
}

/**
 * Inscrit le React de l'application dans l'espace partagé : les composants du
 * hub réutilisent cette instance au lieu d'en charger une seconde — deux React
 * dans la même page cassent les hooks.
 */
function ensureSharedScope() {
  const g = globalThis as unknown as {
    __federation_shared__?: Record<string, Record<string, unknown>>;
  };
  g.__federation_shared__ = g.__federation_shared__ || {};
  g.__federation_shared__["default"] = g.__federation_shared__["default"] || {};
  const shared = g.__federation_shared__["default"];

  if (!shared["react"]) {
    shared["react"] = {
      "18.3.1": { get: () => () => React, scope: "default" },
    };
  }
  if (!shared["react-dom"]) {
    shared["react-dom"] = {
      "18.3.1": { get: () => () => ReactDOM, scope: "default" },
    };
  }
}

let containerPromise: Promise<RemoteContainer> | null = null;

function loadRemoteEntry(): Promise<RemoteContainer> {
  if (containerPromise) return containerPromise;
  ensureSharedScope();

  containerPromise = import(
    /* @vite-ignore */ `${PLATEFORM_URL}/assets/remoteEntry.js`
  )
    .then((container: RemoteContainer) => {
      container.init({});
      return container;
    })
    .catch((err) => {
      // Un échec ne doit pas rester en cache : la prochaine tentative réessaie.
      containerPromise = null;
      throw err;
    });

  return containerPromise;
}

export async function loadRemoteComponent(
  moduleName: string,
): Promise<{ default: React.ComponentType<any> }> {
  const container = await loadRemoteEntry();
  const factory = await container.get(moduleName);
  const result = factory() as
    | { default: React.ComponentType<any> }
    | React.ComponentType<any>;
  // React.lazy attend { default: Composant }.
  if (result && typeof result === "object" && "default" in result) {
    return result;
  }
  return { default: result as React.ComponentType<any> };
}
