export type Occasion = {
  id: string;
  label: string;
  min: number; // formalité minimale visée (1-5)
  noShort?: boolean;
  rules: string;
};

export const OCCASIONS: Occasion[] = [
  { id: "mariage", label: "Mariage", min: 4, noShort: true,
    rules: "Formalité 4-5. Costume, ou veste + pantalon assortis, chemise, chaussures en cuir. Cravate optionnelle. Pas de blanc total." },
  { id: "date", label: "Date", min: 3, noShort: true,
    rules: "Formalité 3-4. Soigné mais pas guindé. Une pièce qui se remarque, matières agréables au toucher. Chaussures propres." },
  { id: "ville", label: "Sortie en ville", min: 2,
    rules: "Formalité 2-3. Chic décontracté. Confort, couche adaptée à la météo." },
  { id: "travail", label: "Travail / alternance", min: 2, noShort: true,
    rules: "Formalité 2-3. Net et sobre. Jean autorisé, polo, chemise ou maille fine. Seule interdiction : le short." },
  { id: "rdv-pro", label: "Rendez-vous pro", min: 4, noShort: true,
    rules: "Formalité 4. Sobre et professionnel. Veste ou maille fine, pantalon ajusté, chaussures cuir." },
  { id: "entretien", label: "Entretien", min: 4, noShort: true,
    rules: "Formalité 4-5. Le plus sobre : couleurs foncées et neutres, aucun motif voyant, chaussures impeccables." },
  { id: "soiree", label: "Soirée", min: 3, noShort: true,
    rules: "Formalité 3-4. Tons plus foncés, textures (velours, maille, cuir), une touche d'élégance." },
  { id: "soiree-ecole", label: "Soirée d'école", min: 2,
    rules: "Formalité 3. Décontracté mais net. Pas de sweat à capuche." },
  { id: "volley", label: "Match de volley", min: 1,
    rules: "Formalité 2. Tenue d'ARRIVÉE et d'après-match, jamais la tenue de jeu. Confort, couche chaude pour après l'effort, baskets propres." },
  { id: "sport", label: "Sport", min: 1,
    rules: "Formalité 1-2. Tenue pour ALLER au sport et en revenir, avec des pièces normales du dressing. Confort, pas de jogging hors sport." },
  { id: "voyage", label: "Voyage", min: 1,
    rules: "Formalité 2-3. Confort chic, couches, matières qui se froissent peu, chaussures confortables." },
  { id: "libre", label: "Texte libre", min: 1,
    rules: "Déduis la formalité du texte de l'utilisateur et dis-le dans « accords »." },
];

export const occasionById = (id: string) => OCCASIONS.find((o) => o.id === id);
