import type { Metadata } from "next";
import Navigation from "@/components/Navigation";
import SignatureMarque from "@/components/SignatureMarque";
import { utilisateurCourant } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kanban commercial — Selfizee",
  description:
    "Qualification des leads, pipeline commercial et suivi LLD / GRENKE autour d'une fiche client unique.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const utilisateur = await utilisateurCourant();
  const equipe = await prisma.utilisateur
    .findMany({
      where: { actif: true },
      orderBy: [{ role: "asc" }, { nom: "asc" }],
      select: { id: true, nom: true, prenom: true, role: true },
    })
    .catch(() => []); // base pas encore migrée : l'application reste affichable

  return (
    <html lang="fr">
      <body className="min-h-screen bg-[var(--fond-page)] text-[var(--texte)] antialiased">
        <Navigation utilisateur={utilisateur} equipe={equipe} />
        <main className="px-5 py-5">{children}</main>
        <SignatureMarque />
      </body>
    </html>
  );
}
