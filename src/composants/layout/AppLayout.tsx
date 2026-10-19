/**
 * Ossature de l'application : barre du haut, barre latérale, contenu.
 *
 * Comme dans Stock Manager, les deux barres sont celles de la plateforme
 * Konitys, chargées en ligne : le kanban s'intègre au hub — sélecteur
 * d'applications, compte, notifications — sans les réimplémenter.
 *
 * Si le hub ne répond pas, des versions locales prennent le relais : la
 * navigation ne doit jamais dépendre d'un service tiers pour fonctionner.
 */

import React, { Component, Suspense, useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loadRemoteComponent } from "@/remoteLoader";
import { useApi } from "@/hooks/useApi";
import { seDeconnecter } from "@/lib/auth";
import type { Utilisateur } from "@/lib/types";
import {
  IconeCalendrier,
  IconeEntonnoir,
  IconeEuro,
  IconeGraphique,
  IconePersonne,
  IconeSynchro,
  IconeTableauBord,
} from "@/composants/Icones";
import { BarreHautLocale, BarreLateraleLocale, type SectionMenu } from "./BarresLocales";

const RemoteHeaderBar = React.lazy(() => loadRemoteComponent("./HeaderBar"));
const RemoteSidebar = React.lazy(() => loadRemoteComponent("./Sidebar"));

/** Le nom affiché par la barre du haut du hub. */
const NOM_APPLICATION = "Kanban commercial";

type CarteResumee = { sansSuivi: boolean };

/**
 * Les menus. Chaque tableau porte en badge ses cartes sans suivi : la règle
 * « une carte ne doit jamais être perdue » reste visible depuis n'importe
 * quelle page.
 */
function useSections(): SectionMenu[] {
  const leads = useApi<CarteResumee[]>("/leads");
  const ventes = useApi<{ cartes: CarteResumee[] }>("/opportunites");
  const lld = useApi<CarteResumee[]>("/lld");

  const badge = (cartes: CarteResumee[] | null | undefined) => {
    const n = cartes?.filter((c) => c.sansSuivi).length ?? 0;
    return n > 0 ? n : undefined;
  };

  return [
    {
      label: "Commercial",
      items: [
        { icon: IconeTableauBord, label: "Tableau de bord", path: "/" },
        { icon: IconePersonne, label: "Leads à qualifier", path: "/leads", badge: badge(leads.donnees) },
        { icon: IconeEntonnoir, label: "Ventes", path: "/ventes", badge: badge(ventes.donnees?.cartes) },
        { icon: IconeEuro, label: "LLD / GRENKE", path: "/lld", badge: badge(lld.donnees) },
      ],
    },
    {
      label: "Suivi",
      items: [
        { icon: IconeCalendrier, label: "Mes actions", path: "/mes-actions" },
        { icon: IconeGraphique, label: "Pilotage", path: "/pilotage" },
      ],
    },
    {
      label: "Administration",
      items: [{ icon: IconeSynchro, label: "Synchro CRM", path: "/synchro" }],
    },
  ];
}

/** Un échec de chargement du hub bascule sur la version locale. */
class SecoursSiEchec extends Component<
  { secours: ReactNode; children: ReactNode },
  { echec: boolean }
> {
  state = { echec: false };
  static getDerivedStateFromError() {
    return { echec: true };
  }
  componentDidCatch(erreur: unknown) {
    console.warn("Composant du hub indisponible, version locale utilisée :", erreur);
  }
  render() {
    return this.state.echec ? this.props.secours : this.props.children;
  }
}

/** Réserve la place de la barre pendant son chargement : pas de saut de page. */
const AttenteBarreHaut = () => (
  <div className="h-12 shrink-0 border-b border-[var(--k-border)] bg-gradient-to-r from-white to-blue-50" />
);
const AttenteBarreLaterale = () => (
  <div className="h-full w-[210px] shrink-0 bg-[var(--k-sidebar-bg)]" />
);

export default function AppLayout({
  utilisateur,
  children,
}: {
  utilisateur: Utilisateur;
  children: ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const sections = useSections();

  const [replie, setReplie] = useState(() => {
    try {
      return localStorage.getItem("k_sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });
  const [menuMobile, setMenuMobile] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("k_sidebar_collapsed", replie ? "1" : "0");
    } catch {
      // Stockage indisponible : l'état ne sera simplement pas retenu.
    }
  }, [replie]);

  useEffect(() => setMenuMobile(false), [location.pathname]);

  // La forme d'utilisateur attendue par la barre du hub.
  const utilisateurHub = {
    firstName: utilisateur.prenom,
    lastName: utilisateur.nom,
    email: utilisateur.email,
    username: utilisateur.email,
  };

  // La barre latérale du hub compare `activePath` aux chemins : on lui passe
  // la racine de l'espace, pour qu'une fiche (`/leads/abc`) garde son menu
  // allumé.
  const premierSegment = "/" + (location.pathname.split("/")[1] ?? "");
  const cheminActif = premierSegment === "/" ? "/" : premierSegment;

  const barreLaterale = (mobile: boolean) => (
    <SecoursSiEchec
      secours={
        <BarreLateraleLocale
          sections={sections}
          cheminActif={cheminActif}
          replie={mobile ? false : replie}
          onBasculer={() => (mobile ? setMenuMobile(false) : setReplie((v) => !v))}
          onNaviguer={navigate}
        />
      }
    >
      <Suspense fallback={<AttenteBarreLaterale />}>
        <RemoteSidebar
          sections={sections}
          activePath={cheminActif}
          onNavigate={navigate}
          collapsed={mobile ? false : replie}
          onCollapse={() => (mobile ? setMenuMobile(false) : setReplie((v) => !v))}
          onHelpClick={() => {}}
        />
      </Suspense>
    </SecoursSiEchec>
  );

  return (
    <div className="flex h-screen flex-col bg-[var(--k-bg)]">
      <SecoursSiEchec
        secours={
          <BarreHautLocale
            utilisateur={utilisateur}
            nomApplication={NOM_APPLICATION}
            onMenuMobile={() => setMenuMobile((v) => !v)}
            onDeconnexion={seDeconnecter}
          />
        }
      >
        <Suspense fallback={<AttenteBarreHaut />}>
          <RemoteHeaderBar
            user={utilisateurHub}
            onLogout={seDeconnecter}
            currentAppName={NOM_APPLICATION}
            onNavigate={navigate}
          />
        </Suspense>
      </SecoursSiEchec>

      <div className="flex min-h-0 flex-1">
        <div className="hidden md:block">{barreLaterale(false)}</div>

        {menuMobile && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/30 md:hidden"
              onClick={() => setMenuMobile(false)}
            />
            <div className="fixed left-0 top-12 z-40 h-[calc(100vh-48px)] md:hidden">
              {barreLaterale(true)}
            </div>
          </>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto p-3 md:p-5">{children}</main>
      </div>
    </div>
  );
}
