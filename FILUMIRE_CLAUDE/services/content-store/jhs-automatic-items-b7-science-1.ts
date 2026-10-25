import type { JhsAutoItem, JhsAutomaticTopic, JhsWrongOption } from './jhs-automatic-assessment';

/*
 * Automatic questions, Basic 7 Science: Materials, living cells, the water
 * cycle, the housefly, plant nutrients and domestic animals (16 topics).
 * The first option of each question is correct (shuffled when shown).
 */
const M = 'misconception' as const, C = 'conceptual_misunderstanding' as const, P = 'procedural_error' as const;
const q = (en: string, fr: string, right: readonly [string, string], ...wrong: JhsWrongOption[]): JhsAutoItem => ({ q: { en, fr }, right, wrong });
const id = (page: number, row = 1) => `competency-gh-science-b7-nacca2020-p${String(page).padStart(3, '0')}-r${String(row).padStart(2, '0')}`;

export const JHS_B7_SCIENCE_AUTOMATIC_1: Record<string, JhsAutomaticTopic> = {
  // B7.1.1.1.1 Classify materials into liquids, solids and gases
  [id(39)]: {
    scope: 'understanding_only',
    practice: q('Which material keeps its own shape when moved to a different dish?', 'Quelle matière garde sa propre forme quand on la met dans un autre plat ?',
      ['A stone', 'Une pierre'], ['Water', 'L’eau', 'confuses-liquid-and-solid', C], ['Air', 'L’air', 'thinks-invisible-means-not-matter', M]),
    diagnostic: [
      q('Water poured from a cup into a bottle changes shape but not amount. What state is it?', 'L’eau versée d’un gobelet dans une bouteille change de forme mais pas de quantité. Quel est son état ?',
        ['Liquid', 'Liquide'], ['Solid', 'Solide', 'confuses-liquid-and-solid', C], ['Gas', 'Gazeux', 'confuses-liquid-and-gas', C]),
      q('A balloon is blown up. What is inside it?', 'On gonfle un ballon. Qu’y a-t-il à l’intérieur ?',
        ['Air, a gas that fills the space', 'De l’air, un gaz qui remplit l’espace'], ['Nothing, because we cannot see it', 'Rien, parce qu’on ne le voit pas', 'thinks-invisible-means-not-matter', M], ['A liquid', 'Un liquide', 'confuses-liquid-and-gas', C]),
    ],
    reassessment: [
      q('Dry sand can be poured. Why is it still a solid?', 'Le sable sec peut être versé. Pourquoi est-il quand même solide ?',
        ['Each grain keeps its own shape', 'Chaque grain garde sa propre forme'], ['Anything that pours is a liquid', 'Tout ce qui se verse est liquide', 'thinks-pourable-means-liquid', M], ['Its colour shows it is solid', 'Sa couleur montre qu’il est solide', 'classifies-by-colour', M]),
      q('Which property best tells a gas apart from a liquid?', 'Quelle propriété distingue le mieux un gaz d’un liquide ?',
        ['A gas spreads to fill all the space available', 'Un gaz s’étend pour remplir tout l’espace disponible'], ['A gas is always coloured', 'Un gaz est toujours coloré', 'classifies-by-colour', M], ['A gas keeps a fixed shape', 'Un gaz garde une forme fixe', 'confuses-liquid-and-solid', C]),
    ],
    retention: [
      q('Which list is correctly classified at room temperature?', 'Quelle liste est correctement classée à température ambiante ?',
        ['Stone: solid; water: liquid; air: gas', 'Pierre : solide ; eau : liquide ; air : gaz'], ['Stone: liquid; water: solid; air: gas', 'Pierre : liquide ; eau : solide ; air : gaz', 'confuses-liquid-and-solid', C], ['Stone: solid; water: gas; air: nothing', 'Pierre : solide ; eau : gaz ; air : rien', 'thinks-invisible-means-not-matter', M]),
      q('Can colour alone tell you the state of a material?', 'La couleur seule peut-elle indiquer l’état d’une matière ?',
        ['No, you must look at shape and volume', 'Non, il faut observer la forme et le volume'], ['Yes, clear things are always gases', 'Oui, les choses transparentes sont toujours des gaz', 'classifies-by-colour', M], ['Yes, grey things are always solids', 'Oui, les choses grises sont toujours solides', 'classifies-by-colour', M]),
    ],
    transfer: [
      q('Cooking oil is poured into a pan and spreads to the pan’s shape without filling the room. What state is it?', 'L’huile de cuisine versée dans une poêle prend sa forme sans remplir la pièce. Quel est son état ?',
        ['Liquid', 'Liquide'], ['Gas', 'Gazeux', 'confuses-liquid-and-gas', C], ['Solid', 'Solide', 'confuses-liquid-and-solid', C]),
      q('A bottle of water: which part is solid and which is liquid?', 'Une bouteille d’eau : quelle partie est solide et laquelle est liquide ?',
        ['The bottle is solid; the water is liquid', 'La bouteille est solide ; l’eau est liquide'], ['Both are liquid', 'Les deux sont liquides', 'confuses-container-with-contents', M], ['The bottle is liquid; the water is solid', 'La bouteille est liquide ; l’eau est solide', 'confuses-liquid-and-solid', C]),
    ],
  },

  // B7.1.1.1.2 Importance of liquids in the life of humans
  [id(40)]: {
    practice: q('Which entry names a liquid and how people use it?', 'Quelle proposition nomme un liquide et son usage par les gens ?',
      ['Cooking oil used to fry plantain', 'L’huile de cuisine utilisée pour frire le plantain'], ['A bucket used for carrying', 'Un seau utilisé pour porter', 'confuses-container-with-liquid', M], ['A blue bottle', 'Une bouteille bleue', 'confuses-use-with-property', C]),
    diagnostic: [
      q('Which is an important use of water for human health?', 'Quel est un usage important de l’eau pour la santé humaine ?',
        ['Washing hands to remove germs', 'Se laver les mains pour éliminer les microbes'], ['Making a bucket heavier', 'Rendre un seau plus lourd', 'confuses-use-with-property', C], ['Water has no use for health', 'L’eau n’a aucun usage pour la santé', 'confuses-use-with-property', C]),
      q('Which suggestion conserves water and gives a reason?', 'Quelle suggestion économise l’eau et donne une raison ?',
        ['Close the tap after washing, because a running tap wastes water', 'Fermer le robinet après s’être lavé, car un robinet ouvert gaspille l’eau'], ['Leave taps running so water stays fresh', 'Laisser les robinets ouverts pour que l’eau reste fraîche', 'unsupported-conservation-claim', M], ['Use more water every day', 'Utiliser plus d’eau chaque jour', 'unsupported-conservation-claim', M]),
    ],
    reassessment: [
      q('Why is the statement “every household wastes water” not supported by one dripping tap at school?', 'Pourquoi l’affirmation « tous les foyers gaspillent l’eau » n’est-elle pas justifiée par un seul robinet qui fuit à l’école ?',
        ['One observation cannot prove a claim about every household', 'Une seule observation ne peut pas prouver une affirmation sur tous les foyers'], ['Because taps never drip', 'Parce que les robinets ne fuient jamais', 'overgeneralises-from-one-observation', C], ['Because one example always proves everything', 'Parce qu’un exemple prouve toujours tout', 'overgeneralises-from-one-observation', M]),
      q('Which liquid is mainly used to help cook food?', 'Quel liquide sert surtout à aider à cuire les aliments ?',
        ['Cooking oil', 'L’huile de cuisine'], ['Petrol', 'L’essence', 'confuses-use-with-property', C], ['Ink', 'L’encre', 'confuses-use-with-property', C]),
    ],
    retention: [
      q('What does a “use” of a liquid describe?', 'Que décrit l’« usage » d’un liquide ?',
        ['What the liquid helps people do', 'Ce que le liquide aide les gens à faire'], ['The colour of the liquid', 'La couleur du liquide', 'confuses-use-with-property', M], ['The container it is kept in', 'Le récipient dans lequel il est gardé', 'confuses-container-with-liquid', M]),
      q('Which is a safe rule when studying liquids in the community?', 'Quelle règle est sûre quand on étudie les liquides dans la communauté ?',
        ['Do not taste unknown liquids', 'Ne pas goûter les liquides inconnus'], ['Taste each liquid to identify it', 'Goûter chaque liquide pour l’identifier', 'unsafe-investigation-method', M], ['Mix liquids to see what happens', 'Mélanger les liquides pour voir ce qui se passe', 'unsafe-investigation-method', M]),
    ],
    transfer: [
      q('A farmer irrigates tomatoes with river water. What is the use of the liquid here?', 'Un agriculteur irrigue ses tomates avec l’eau de la rivière. Quel est l’usage du liquide ici ?',
        ['Watering crops so they can grow', 'Arroser les cultures pour qu’elles poussent'], ['Cleaning the river', 'Nettoyer la rivière', 'confuses-use-with-property', C], ['Making the tomatoes red', 'Rendre les tomates rouges', 'confuses-use-with-property', C]),
      q('Which action protects the quality of stored drinking water?', 'Quelle action protège la qualité de l’eau de boisson stockée ?',
        ['Keep it covered in a clean container', 'La garder couverte dans un récipient propre'], ['Leave it open near waste', 'La laisser ouverte près des déchets', 'unsupported-conservation-claim', M], ['Add soap to keep it clean', 'Y ajouter du savon pour la garder propre', 'unsafe-investigation-method', M]),
    ],
  },

  // B7.1.1.1.3 Importance of specific solids to life
  [id(40, 2)]: {
    practice: q('Why is wood used to make chairs?', 'Pourquoi utilise-t-on le bois pour fabriquer des chaises ?',
      ['Suitable wood is strong and rigid', 'Un bois adapté est solide et rigide'], ['All solids suit every object', 'Tous les solides conviennent à tous les objets', 'assumes-every-solid-suits-every-use', M], ['Wood is brown', 'Le bois est marron', 'confuses-use-with-property', C]),
    diagnostic: [
      q('Which explanation links a useful solid to a property?', 'Quelle explication relie un solide utile à une propriété ?',
        ['Stone is hard, so it can support a wall', 'La pierre est dure, elle peut donc soutenir un mur'], ['Stone is grey, so it is useful', 'La pierre est grise, elle est donc utile', 'confuses-use-with-property', M], ['Any solid can hold up a house', 'N’importe quel solide peut soutenir une maison', 'assumes-every-solid-suits-every-use', M]),
      q('A cardboard shelter model is finished. What can it show?', 'Un modèle d’abri en carton est terminé. Que peut-il montrer ?',
        ['How a roof and supports are arranged', 'Comment un toit et des supports sont disposés'], ['That a real house will be weatherproof', 'Qu’une vraie maison sera étanche', 'treats-a-model-as-proof-of-full-size-safety', M], ['That cardboard is stronger than concrete', 'Que le carton est plus solide que le béton', 'assumes-every-solid-suits-every-use', M]),
    ],
    reassessment: [
      q('Which choice is safest for a school model?', 'Quel choix est le plus sûr pour un modèle à l’école ?',
        ['Clean, reusable cardboard', 'Du carton propre et réutilisable'], ['Broken glass', 'Du verre cassé', 'reuses-unsafe-materials', M], ['Sharp scrap metal', 'Des déchets de métal coupants', 'reuses-unsafe-materials', M]),
      q('How does reusing a suitable solid help?', 'Comment la réutilisation d’un solide adapté aide-t-elle ?',
        ['It reduces waste', 'Elle réduit les déchets'], ['It makes dirty waste safe', 'Elle rend les déchets sales sûrs', 'reuses-unsafe-materials', M], ['It changes the material into a liquid', 'Elle transforme le matériau en liquide', 'confuses-use-with-property', C]),
    ],
    retention: [
      q('Which solid is commonly used to make cooking pots?', 'Quel solide est souvent utilisé pour fabriquer des marmites ?',
        ['Metal, because it is strong and conducts heat', 'Le métal, car il est solide et conduit la chaleur'], ['Paper, because it is light', 'Le papier, car il est léger', 'assumes-every-solid-suits-every-use', M], ['Ice, because it is cold', 'La glace, car elle est froide', 'assumes-every-solid-suits-every-use', M]),
      q('What is a limitation of a small model?', 'Quelle est une limite d’un petit modèle ?',
        ['It cannot prove that a full-size structure is safe', 'Il ne peut pas prouver qu’une structure grandeur nature est sûre'], ['It has no limitations', 'Il n’a aucune limite', 'treats-a-model-as-proof-of-full-size-safety', M], ['It is always made of liquid', 'Il est toujours fait de liquide', 'confuses-use-with-property', C]),
    ],
    transfer: [
      q('A potter makes water jars from clay. Which property makes fired clay useful here?', 'Une potière fabrique des jarres en argile. Quelle propriété rend l’argile cuite utile ici ?',
        ['It holds its shape and can contain water', 'Elle garde sa forme et peut contenir de l’eau'], ['It is the colour of soil', 'Elle a la couleur du sol', 'confuses-use-with-property', M], ['It flows like a liquid', 'Elle coule comme un liquide', 'assumes-every-solid-suits-every-use', C]),
      q('A learner wants to make a bridge model to carry toy cars. Which material choice is justified?', 'Un élève veut fabriquer un modèle de pont pour porter des petites voitures. Quel choix de matériau est justifié ?',
        ['Stiff card or sticks, tested at model scale', 'Du carton rigide ou des bâtonnets, testés à l’échelle du modèle'], ['Wet paper, because it is cheap', 'Du papier mouillé, parce qu’il est bon marché', 'assumes-every-solid-suits-every-use', M], ['Any material, since all solids are equal', 'N’importe quel matériau, car tous les solides se valent', 'assumes-every-solid-suits-every-use', M]),
    ],
  },

  // B7.1.1.2.1 Periodic table arrangement
  [id(41)]: {
    practice: q('What is the symbol for sodium?', 'Quel est le symbole du sodium ?',
      ['Na', 'Na'], ['So', 'So', 'confuses-symbol-with-name-or-order', M], ['S', 'S', 'confuses-symbol-with-name-or-order', C]),
    diagnostic: [
      q('Which element has atomic number 6?', 'Quel élément a le numéro atomique 6 ?',
        ['Carbon', 'Le carbone'], ['Calcium', 'Le calcium', 'confuses-symbol-with-name-or-order', C], ['Nitrogen', 'L’azote', 'misorders-the-first-twenty', P]),
      q('Which group of three are all noble gases?', 'Quel groupe de trois ne contient que des gaz nobles ?',
        ['Helium, neon and argon', 'L’hélium, le néon et l’argon'], ['Sodium, neon and chlorine', 'Le sodium, le néon et le chlore', 'misclassifies-metals-and-non-metals', C], ['Oxygen, nitrogen and hydrogen', 'L’oxygène, l’azote et l’hydrogène', 'misclassifies-metals-and-non-metals', C]),
    ],
    reassessment: [
      q('What does “Co” stand for, and how is it different from “CO”?', 'Que signifie « Co » et en quoi est-il différent de « CO » ?',
        ['Co is cobalt; CO is carbon and oxygen together', 'Co est le cobalt ; CO est le carbone et l’oxygène ensemble'], ['They mean the same thing', 'Ils signifient la même chose', 'confuses-symbol-with-name-or-order', M], ['Co is copper', 'Co est le cuivre', 'confuses-symbol-with-name-or-order', C]),
      q('Sodium (11) and potassium (19) are in the same column. What does this tell you?', 'Le sodium (11) et le potassium (19) sont dans la même colonne. Qu’est-ce que cela t’apprend ?',
        ['They have related properties', 'Ils ont des propriétés voisines'], ['They have the same atomic number', 'Ils ont le même numéro atomique', 'confuses-group-with-counting-order', M], ['They are next to each other in counting order', 'Ils se suivent dans l’ordre de numérotation', 'confuses-group-with-counting-order', M]),
    ],
    retention: [
      q('Which list is in correct atomic-number order?', 'Quelle liste est dans le bon ordre de numéro atomique ?',
        ['H, He, Li, Be', 'H, He, Li, Be'], ['Be, H, He, Li', 'Be, H, He, Li', 'misorders-the-first-twenty', P], ['He, H, Be, Li', 'He, H, Be, Li', 'misorders-the-first-twenty', P]),
      q('Which element is a metal?', 'Quel élément est un métal ?',
        ['Magnesium', 'Le magnésium'], ['Chlorine', 'Le chlore', 'misclassifies-metals-and-non-metals', C], ['Argon', 'L’argon', 'misclassifies-metals-and-non-metals', C]),
    ],
    transfer: [
      q('A card set shows Mg (12), Al (13), Si (14), P (15). What arranges them in this order?', 'Un jeu de cartes montre Mg (12), Al (13), Si (14), P (15). Qu’est-ce qui les range dans cet ordre ?',
        ['Increasing atomic number', 'Le numéro atomique croissant'], ['Alphabetical order', 'L’ordre alphabétique', 'confuses-symbol-with-name-or-order', M], ['Their colour', 'Leur couleur', 'confuses-symbol-with-name-or-order', C]),
      q('Silicon is labelled a metalloid. What does this show about classification?', 'Le silicium est classé métalloïde. Que montre cela sur la classification ?',
        ['Not every element fits only metal, non-metal or noble gas', 'Tous les éléments ne rentrent pas seulement dans métal, non-métal ou gaz noble'], ['Silicon is a noble gas', 'Le silicium est un gaz noble', 'misclassifies-metals-and-non-metals', C], ['Metalloids are not elements', 'Les métalloïdes ne sont pas des éléments', 'misclassifies-metals-and-non-metals', M]),
    ],
  },

  // B7.1.2.1.1 Animal cell structure and function
  [id(42)]: {
    practice: q('Which structure contains genetic information in an animal cell?', 'Quelle structure contient l’information génétique dans une cellule animale ?',
      ['The nucleus', 'Le noyau'], ['The cell wall', 'La paroi cellulaire', 'gives-animal-cell-a-cell-wall', M], ['The cytoplasm', 'Le cytoplasme', 'mismatches-organelle-and-function', C]),
    diagnostic: [
      q('Which structures does a typical animal cell NOT have?', 'Quelles structures une cellule animale typique n’a-t-elle PAS ?',
        ['A cell wall and chloroplasts', 'Une paroi cellulaire et des chloroplastes'], ['A membrane and a nucleus', 'Une membrane et un noyau', 'gives-animal-cell-a-cell-wall', M], ['Mitochondria and ribosomes', 'Des mitochondries et des ribosomes', 'mismatches-organelle-and-function', C]),
      q('Which structure releases usable energy through respiration?', 'Quelle structure libère de l’énergie utilisable par la respiration ?',
        ['Mitochondria', 'Les mitochondries'], ['Ribosomes', 'Les ribosomes', 'mismatches-organelle-and-function', C], ['The nucleus', 'Le noyau', 'mismatches-organelle-and-function', C]),
    ],
    reassessment: [
      q('What do ribosomes make?', 'Que fabriquent les ribosomes ?',
        ['Proteins', 'Des protéines'], ['Energy from sunlight', 'De l’énergie à partir de la lumière', 'mismatches-organelle-and-function', C], ['The cell membrane only', 'Seulement la membrane cellulaire', 'mismatches-organelle-and-function', C]),
      q('Where do many of the cell’s chemical reactions take place?', 'Où ont lieu beaucoup des réactions chimiques de la cellule ?',
        ['In the cytoplasm', 'Dans le cytoplasme'], ['In the cell wall', 'Dans la paroi cellulaire', 'gives-animal-cell-a-cell-wall', M], ['Outside the cell', 'À l’extérieur de la cellule', 'mismatches-organelle-and-function', C]),
    ],
    retention: [
      q('What is the job of the cell membrane?', 'Quel est le rôle de la membrane cellulaire ?',
        ['It controls what enters and leaves the cell', 'Elle contrôle ce qui entre et sort de la cellule'], ['It makes food by photosynthesis', 'Elle fabrique de la nourriture par photosynthèse', 'gives-animal-cell-a-cell-wall', M], ['It stores genetic information', 'Elle stocke l’information génétique', 'mismatches-organelle-and-function', C]),
      q('Can a normal hand lens show all the organelles of a cheek cell?', 'Une loupe ordinaire peut-elle montrer tous les organites d’une cellule de joue ?',
        ['No, many organelles are too small to see with it', 'Non, beaucoup d’organites sont trop petits pour être vus'], ['Yes, every organelle is clearly visible', 'Oui, chaque organite est bien visible', 'invents-unobservable-detail', M], ['Yes, if the cell is coloured', 'Oui, si la cellule est colorée', 'invents-unobservable-detail', M]),
    ],
    transfer: [
      q('A muscle cell needs a lot of energy. Which organelle would you expect it to have many of?', 'Une cellule musculaire a besoin de beaucoup d’énergie. De quel organite devrait-elle avoir beaucoup ?',
        ['Mitochondria', 'Des mitochondries'], ['Chloroplasts', 'Des chloroplastes', 'gives-animal-cell-a-cell-wall', M], ['Cell walls', 'Des parois cellulaires', 'gives-animal-cell-a-cell-wall', M]),
      q('A diagram of a red blood cell has no wall around it. Is this an error?', 'Un schéma de globule rouge ne montre pas de paroi autour. Est-ce une erreur ?',
        ['No, animal cells have a membrane but no cell wall', 'Non, les cellules animales ont une membrane mais pas de paroi'], ['Yes, every cell must have a wall', 'Oui, toute cellule doit avoir une paroi', 'gives-animal-cell-a-cell-wall', M], ['Yes, it must have chloroplasts', 'Oui, il doit avoir des chloroplastes', 'gives-animal-cell-a-cell-wall', M]),
    ],
  },

  // B7.1.2.1.2 Functions of plant cell organelles
  [id(43)]: {
    practice: q('Which plant-cell structure gives the cell support from outside the membrane?', 'Quelle structure de la cellule végétale soutient la cellule, à l’extérieur de la membrane ?',
      ['The cell wall', 'La paroi cellulaire'], ['The vacuole', 'La vacuole', 'mismatches-plant-organelle-and-function', C], ['The nucleus', 'Le noyau', 'mismatches-plant-organelle-and-function', C]),
    diagnostic: [
      q('What does the large vacuole of a plant cell contain?', 'Que contient la grande vacuole d’une cellule végétale ?',
        ['Cell sap', 'Le suc vacuolaire'], ['Chlorophyll for photosynthesis', 'La chlorophylle pour la photosynthèse', 'mismatches-plant-organelle-and-function', C], ['The genetic information', 'L’information génétique', 'mismatches-plant-organelle-and-function', C]),
      q('Do all plant cells have chloroplasts?', 'Toutes les cellules végétales ont-elles des chloroplastes ?',
        ['No, many root cells do not', 'Non, beaucoup de cellules de racine n’en ont pas'], ['Yes, every plant cell has them', 'Oui, toutes les cellules végétales en ont', 'assumes-every-plant-cell-has-chloroplasts', M], ['No, only animal cells have them', 'Non, seules les cellules animales en ont', 'mismatches-plant-organelle-and-function', M]),
    ],
    reassessment: [
      q('How are the cell wall and the cell membrane related?', 'Quel est le lien entre la paroi cellulaire et la membrane ?',
        ['The wall is outside the membrane; they are different structures', 'La paroi est à l’extérieur de la membrane ; ce sont deux structures différentes'], ['They are the same structure', 'C’est la même structure', 'confuses-wall-and-membrane', M], ['The membrane is outside the wall', 'La membrane est à l’extérieur de la paroi', 'confuses-wall-and-membrane', C]),
      q('Do plant cells respire?', 'Les cellules végétales respirent-elles ?',
        ['Yes, using mitochondria, as well as photosynthesising', 'Oui, avec les mitochondries, en plus de la photosynthèse'], ['No, plants only photosynthesise', 'Non, les plantes font seulement la photosynthèse', 'thinks-plants-do-not-respire', M], ['Only at night, without mitochondria', 'Seulement la nuit, sans mitochondries', 'thinks-plants-do-not-respire', C]),
    ],
    retention: [
      q('Which organelle carries out photosynthesis?', 'Quel organite réalise la photosynthèse ?',
        ['The chloroplast', 'Le chloroplaste'], ['The cell wall', 'La paroi cellulaire', 'mismatches-plant-organelle-and-function', C], ['The ribosome', 'Le ribosome', 'mismatches-plant-organelle-and-function', C]),
      q('An onion-bulb cell shows no chloroplasts. What can you conclude?', 'Une cellule de bulbe d’oignon ne montre pas de chloroplastes. Que peux-tu conclure ?',
        ['It is still a plant cell; not all plant cells have chloroplasts', 'C’est quand même une cellule végétale ; toutes n’ont pas de chloroplastes'], ['It must be an animal cell', 'Ce doit être une cellule animale', 'assumes-every-plant-cell-has-chloroplasts', M], ['It has no nucleus', 'Elle n’a pas de noyau', 'mismatches-plant-organelle-and-function', C]),
    ],
    transfer: [
      q('A leaf cell is exposed to light all day. Which organelle uses that light to make food?', 'Une cellule de feuille est exposée à la lumière toute la journée. Quel organite utilise cette lumière pour fabriquer de la nourriture ?',
        ['Chloroplasts', 'Les chloroplastes'], ['The vacuole', 'La vacuole', 'mismatches-plant-organelle-and-function', C], ['The cell wall', 'La paroi cellulaire', 'confuses-wall-and-membrane', C]),
      q('A plant wilts when it lacks water. Which structure loses water and stops supporting the cell well?', 'Une plante se fane quand elle manque d’eau. Quelle structure perd de l’eau et soutient moins bien la cellule ?',
        ['The vacuole', 'La vacuole'], ['The chloroplast', 'Le chloroplaste', 'mismatches-plant-organelle-and-function', C], ['The nucleus', 'Le noyau', 'mismatches-plant-organelle-and-function', C]),
    ],
  },

  // B7.2.1.1.1 How the water cycle occurs
  [id(44)]: {
    practice: q('Which process changes liquid water into water vapour?', 'Quel processus transforme l’eau liquide en vapeur d’eau ?',
      ['Evaporation', 'L’évaporation'], ['Condensation', 'La condensation', 'confuses-evaporation-and-condensation', M], ['Precipitation', 'Les précipitations', 'confuses-water-cycle-stages', C]),
    diagnostic: [
      q('What are clouds made of?', 'De quoi sont faits les nuages ?',
        ['Tiny water droplets or ice crystals', 'De minuscules gouttelettes d’eau ou de cristaux de glace'], ['Invisible water vapour only', 'Seulement de vapeur d’eau invisible', 'thinks-clouds-are-water-vapour', M], ['Smoke', 'De fumée', 'confuses-water-cycle-stages', C]),
      q('What process releases water vapour from plant leaves?', 'Quel processus libère de la vapeur d’eau par les feuilles des plantes ?',
        ['Transpiration', 'La transpiration'], ['Precipitation', 'Les précipitations', 'confuses-water-cycle-stages', C], ['Condensation', 'La condensation', 'confuses-evaporation-and-condensation', M]),
    ],
    reassessment: [
      q('Rain falls from clouds to the ground. What is this stage called?', 'La pluie tombe des nuages vers le sol. Comment s’appelle cette étape ?',
        ['Precipitation', 'Les précipitations'], ['Evaporation', 'L’évaporation', 'confuses-evaporation-and-condensation', C], ['Transpiration', 'La transpiration', 'confuses-water-cycle-stages', C]),
      q('Why is the water cycle drawn as a loop?', 'Pourquoi dessine-t-on le cycle de l’eau comme une boucle ?',
        ['Water keeps moving along linked pathways with no fixed end', 'L’eau continue de circuler sur des chemins reliés, sans fin fixe'], ['Because it ends when it rains', 'Parce qu’il se termine quand il pleut', 'thinks-the-cycle-has-one-start-and-end', M], ['Because the same place gets rain every day', 'Parce que le même endroit reçoit de la pluie chaque jour', 'thinks-the-cycle-has-one-start-and-end', M]),
    ],
    retention: [
      q('What mainly provides the energy for evaporation?', 'Qu’est-ce qui fournit surtout l’énergie de l’évaporation ?',
        ['The Sun', 'Le Soleil'], ['The Moon', 'La Lune', 'confuses-water-cycle-stages', C], ['Gravity', 'La gravité', 'confuses-water-cycle-stages', C]),
      q('Water vapour cools high in the air and forms droplets. What is this?', 'La vapeur d’eau se refroidit en altitude et forme des gouttelettes. Qu’est-ce que c’est ?',
        ['Condensation', 'La condensation'], ['Evaporation', 'L’évaporation', 'confuses-evaporation-and-condensation', M], ['Runoff', 'Le ruissellement', 'confuses-water-cycle-stages', C]),
    ],
    transfer: [
      q('Drops form on the outside of a cold bottle on a hot day. Which water-cycle process is this like?', 'Des gouttes se forment sur une bouteille froide par une journée chaude. À quel processus du cycle de l’eau cela ressemble-t-il ?',
        ['Condensation', 'La condensation'], ['Evaporation', 'L’évaporation', 'confuses-evaporation-and-condensation', M], ['Transpiration', 'La transpiration', 'confuses-water-cycle-stages', C]),
      q('Wet clothes dry on a line in the sun. Where does the water go?', 'Des vêtements mouillés sèchent au soleil sur une corde. Où va l’eau ?',
        ['It evaporates into the air as vapour', 'Elle s’évapore dans l’air sous forme de vapeur'], ['It condenses into the cloth', 'Elle se condense dans le tissu', 'confuses-evaporation-and-condensation', M], ['It disappears from the cycle', 'Elle disparaît du cycle', 'thinks-the-cycle-has-one-start-and-end', M]),
    ],
  },

  // B7.2.1.1.2 Importance of the water cycle
  [id(45)]: {
    practice: q('How can rain help a community’s water supply?', 'Comment la pluie peut-elle aider l’approvisionnement en eau d’une communauté ?',
      ['It can refill rivers and groundwater', 'Elle peut remplir les rivières et les nappes souterraines'], ['It always makes water safe to drink', 'Elle rend toujours l’eau potable', 'assumes-rainwater-is-automatically-safe-to-drink', M], ['It creates new energy', 'Elle crée une nouvelle énergie', 'thinks-the-cycle-creates-energy', M]),
    diagnostic: [
      q('Rainwater is collected in an open drum. Is it automatically safe to drink?', 'L’eau de pluie est recueillie dans un fût ouvert. Est-elle automatiquement potable ?',
        ['No, it can become contaminated and must be checked', 'Non, elle peut être contaminée et doit être vérifiée'], ['Yes, rain is always pure', 'Oui, la pluie est toujours pure', 'assumes-rainwater-is-automatically-safe-to-drink', M], ['Yes, if it looks clear', 'Oui, si elle a l’air claire', 'assumes-rainwater-is-automatically-safe-to-drink', M]),
      q('Runoff flows across a farm into a stream. What can it carry?', 'Le ruissellement traverse une ferme jusqu’à un ruisseau. Que peut-il transporter ?',
        ['Dissolved nutrients and also pollutants', 'Des nutriments dissous mais aussi des polluants'], ['Only clean water', 'Seulement de l’eau propre', 'assumes-rainwater-is-automatically-safe-to-drink', M], ['Nothing at all', 'Rien du tout', 'ignores-runoff-effects', C]),
    ],
    reassessment: [
      q('What happens to energy when water vapour condenses?', 'Que se passe-t-il pour l’énergie quand la vapeur d’eau se condense ?',
        ['Energy is released to the surroundings', 'De l’énergie est libérée dans l’environnement'], ['New energy is created', 'Une nouvelle énergie est créée', 'thinks-the-cycle-creates-energy', M], ['Energy is destroyed', 'L’énergie est détruite', 'thinks-the-cycle-creates-energy', M]),
      q('Water soaks into soil after rain. What can this do?', 'L’eau s’infiltre dans le sol après la pluie. Que peut-elle faire ?',
        ['Recharge groundwater', 'Recharger les nappes souterraines'], ['Make all wells safe forever', 'Rendre tous les puits sûrs pour toujours', 'assumes-rainwater-is-automatically-safe-to-drink', M], ['Stop the water cycle', 'Arrêter le cycle de l’eau', 'ignores-runoff-effects', C]),
    ],
    retention: [
      q('Which is an importance of the water cycle?', 'Quelle est une importance du cycle de l’eau ?',
        ['It moves water to where people, plants and animals need it', 'Il amène l’eau là où les gens, les plantes et les animaux en ont besoin'], ['It guarantees safe drinking water everywhere', 'Il garantit de l’eau potable partout', 'assumes-rainwater-is-automatically-safe-to-drink', M], ['It produces unlimited energy', 'Il produit une énergie illimitée', 'thinks-the-cycle-creates-energy', M]),
      q('Evaporation absorbs energy. Where does that energy go later?', 'L’évaporation absorbe de l’énergie. Où va cette énergie plus tard ?',
        ['It is released when the vapour condenses', 'Elle est libérée quand la vapeur se condense'], ['It disappears', 'Elle disparaît', 'thinks-the-cycle-creates-energy', M], ['It turns into rain water', 'Elle se transforme en eau de pluie', 'thinks-the-cycle-creates-energy', C]),
    ],
    transfer: [
      q('After heavy rain, a village well fills up but the water smells. What should the village do?', 'Après une forte pluie, un puits du village se remplit mais l’eau sent mauvais. Que doit faire le village ?',
        ['Treat or test the water before drinking', 'Traiter ou analyser l’eau avant de la boire'], ['Drink it, because rain is clean', 'La boire, car la pluie est propre', 'assumes-rainwater-is-automatically-safe-to-drink', M], ['Ignore it, because wells are always safe', 'L’ignorer, car les puits sont toujours sûrs', 'assumes-rainwater-is-automatically-safe-to-drink', M]),
      q('A farmer notices fertiliser washed into a nearby stream after rain. Which part of the cycle carried it?', 'Un agriculteur remarque que de l’engrais a été emporté dans un ruisseau après la pluie. Quelle partie du cycle l’a transporté ?',
        ['Runoff', 'Le ruissellement'], ['Condensation', 'La condensation', 'ignores-runoff-effects', C], ['Transpiration', 'La transpiration', 'ignores-runoff-effects', C]),
    ],
  },

  // B7.2.2.1.1 Life cycle of the housefly
  [id(46)]: {
    practice: q('What is the first stage of a housefly’s life cycle?', 'Quelle est la première étape du cycle de vie de la mouche domestique ?',
      ['Egg', 'L’œuf'], ['Pupa', 'La pupe', 'omits-pupa-or-reverses-larva-and-pupa', P], ['Adult', 'L’adulte', 'thinks-egg-becomes-adult-directly', M]),
    diagnostic: [
      q('Which order shows the housefly life cycle?', 'Quel ordre montre le cycle de vie de la mouche domestique ?',
        ['Egg, larva, pupa, adult', 'Œuf, larve, pupe, adulte'], ['Egg, pupa, larva, adult', 'Œuf, pupe, larve, adulte', 'omits-pupa-or-reverses-larva-and-pupa', P], ['Egg, adult', 'Œuf, adulte', 'thinks-egg-becomes-adult-directly', M]),
      q('What is another name for the housefly larva?', 'Quel est l’autre nom de la larve de la mouche domestique ?',
        ['A maggot', 'Un asticot'], ['A pupa', 'Une pupe', 'omits-pupa-or-reverses-larva-and-pupa', C], ['A seed', 'Une graine', 'confuses-insect-and-plant-life-cycles', M]),
    ],
    reassessment: [
      q('What happens during the pupa stage?', 'Que se passe-t-il pendant le stade de pupe ?',
        ['The insect changes inside before the adult emerges', 'L’insecte se transforme à l’intérieur avant que l’adulte sorte'], ['The fly lays eggs', 'La mouche pond des œufs', 'omits-pupa-or-reverses-larva-and-pupa', C], ['The larva eats as much as possible', 'La larve mange autant que possible', 'omits-pupa-or-reverses-larva-and-pupa', C]),
      q('In the cycle diagram, what does the arrow from adult back to egg mean?', 'Dans le schéma du cycle, que signifie la flèche de l’adulte vers l’œuf ?',
        ['Adults reproduce and females lay eggs', 'Les adultes se reproduisent et les femelles pondent'], ['The same fly turns back into an egg', 'La même mouche redevient un œuf', 'thinks-egg-becomes-adult-directly', M], ['The adult dies and becomes a seed', 'L’adulte meurt et devient une graine', 'confuses-insect-and-plant-life-cycles', M]),
    ],
    retention: [
      q('Which stage feeds and grows the most?', 'Quel stade se nourrit et grandit le plus ?',
        ['The larva', 'La larve'], ['The egg', 'L’œuf', 'omits-pupa-or-reverses-larva-and-pupa', C], ['The pupa', 'La pupe', 'omits-pupa-or-reverses-larva-and-pupa', C]),
      q('Can a housefly egg grow straight into a winged adult?', 'Un œuf de mouche peut-il devenir directement un adulte ailé ?',
        ['No, it passes through larva and pupa first', 'Non, il passe d’abord par la larve et la pupe'], ['Yes, the egg hatches as an adult', 'Oui, l’œuf éclot en adulte', 'thinks-egg-becomes-adult-directly', M], ['Yes, if it is warm', 'Oui, s’il fait chaud', 'thinks-egg-becomes-adult-directly', M]),
    ],
    transfer: [
      q('A learner finds hard, brown, rice-like cases near rubbish. Which housefly stage are they most likely?', 'Un élève trouve des enveloppes dures et brunes, comme des grains de riz, près des ordures. Quel stade de mouche est-ce probablement ?',
        ['Pupae', 'Des pupes'], ['Adults', 'Des adultes', 'omits-pupa-or-reverses-larva-and-pupa', C], ['Seeds', 'Des graines', 'confuses-insect-and-plant-life-cycles', M]),
      q('A poster shows egg → larva → adult. What is missing?', 'Une affiche montre œuf → larve → adulte. Que manque-t-il ?',
        ['The pupa stage between larva and adult', 'Le stade de pupe entre la larve et l’adulte'], ['Nothing, it is complete', 'Rien, elle est complète', 'omits-pupa-or-reverses-larva-and-pupa', P], ['A seed stage', 'Un stade de graine', 'confuses-insect-and-plant-life-cycles', M]),
    ],
  },

  // B7.2.2.1.2 The housefly as a menace and how to reduce it
  [id(47)]: {
    practice: q('Why are houseflies a health risk near food?', 'Pourquoi les mouches domestiques sont-elles un risque pour la santé près des aliments ?',
      ['They can carry germs from waste to food', 'Elles peuvent transporter des microbes des déchets vers les aliments'], ['They create diseases from nothing', 'Elles créent des maladies à partir de rien', 'assumes-a-fly-creates-disease-without-contamination', M], ['They make food taste sweet', 'Elles rendent les aliments sucrés', 'assumes-a-fly-creates-disease-without-contamination', C]),
    diagnostic: [
      q('Which illness can flies help spread by contaminating food?', 'Quelle maladie les mouches peuvent-elles aider à propager en contaminant les aliments ?',
        ['Dysentery', 'La dysenterie'], ['Short-sightedness', 'La myopie', 'assumes-a-fly-creates-disease-without-contamination', C], ['A broken arm', 'Un bras cassé', 'assumes-a-fly-creates-disease-without-contamination', C]),
      q('Which action stops flies breeding near a home?', 'Quelle action empêche les mouches de se reproduire près d’une maison ?',
        ['Keep waste in a closed bin and dispose of it properly', 'Garder les déchets dans une poubelle fermée et les évacuer correctement'], ['Leave food scraps outside', 'Laisser des restes de nourriture dehors', 'chooses-action-that-does-not-break-the-pathway', M], ['Paint the walls', 'Peindre les murs', 'chooses-action-that-does-not-break-the-pathway', C]),
    ],
    reassessment: [
      q('Which action directly blocks flies from reaching cooked food?', 'Quelle action empêche directement les mouches d’atteindre la nourriture cuite ?',
        ['Covering the food', 'Couvrir la nourriture'], ['Leaving the pot open to cool', 'Laisser la marmite ouverte pour qu’elle refroidisse', 'chooses-action-that-does-not-break-the-pathway', M], ['Touching waste then serving food', 'Toucher les déchets puis servir la nourriture', 'chooses-action-that-does-not-break-the-pathway', M]),
      q('A class makes a poster about flies. What does the poster alone prove?', 'Une classe fait une affiche sur les mouches. Que prouve l’affiche à elle seule ?',
        ['Only that a message was made, not that illness fell', 'Seulement qu’un message a été fait, pas que les maladies ont diminué'], ['That illness in the community has fallen', 'Que les maladies ont diminué dans la communauté', 'claims-an-unmeasured-result', M], ['That flies have left the town', 'Que les mouches ont quitté la ville', 'claims-an-unmeasured-result', M]),
    ],
    retention: [
      q('Where do houseflies often feed and breed?', 'Où les mouches domestiques se nourrissent-elles et se reproduisent-elles souvent ?',
        ['Around decaying food, manure and waste', 'Autour des aliments en décomposition, du fumier et des déchets'], ['Only on clean plates', 'Seulement sur des assiettes propres', 'assumes-a-fly-creates-disease-without-contamination', C], ['Only in the sky', 'Seulement dans le ciel', 'assumes-a-fly-creates-disease-without-contamination', C]),
      q('Which pathway does a food cover interrupt?', 'Quel chemin un couvercle interrompt-il ?',
        ['Fly to food', 'De la mouche à la nourriture'], ['Waste to the bin', 'Des déchets à la poubelle', 'chooses-action-that-does-not-break-the-pathway', C], ['Rain to the river', 'De la pluie à la rivière', 'chooses-action-that-does-not-break-the-pathway', C]),
    ],
    transfer: [
      q('A food seller at a lorry station wants fewer flies on her kenkey. What is the best first step?', 'Une vendeuse dans une gare routière veut moins de mouches sur son kenkey. Quelle est la meilleure première étape ?',
        ['Keep the kenkey covered and the nearby rubbish closed', 'Garder le kenkey couvert et fermer les ordures proches'], ['Spray perfume on the food', 'Vaporiser du parfum sur la nourriture', 'chooses-action-that-does-not-break-the-pathway', M], ['Sell the food uncovered so it cools faster', 'Vendre la nourriture découverte pour qu’elle refroidisse plus vite', 'chooses-action-that-does-not-break-the-pathway', M]),
      q('A school fixes window screens in its kitchen. What does this do?', 'Une école installe des moustiquaires aux fenêtres de sa cuisine. Qu’est-ce que cela fait ?',
        ['It keeps flies away from food being prepared', 'Cela éloigne les mouches des aliments en préparation'], ['It kills all germs in the food', 'Cela tue tous les microbes des aliments', 'assumes-a-fly-creates-disease-without-contamination', M], ['It proves no one will get ill', 'Cela prouve que personne ne tombera malade', 'claims-an-unmeasured-result', M]),
    ],
  },

  // B7.2.3.1.1 Plant nutrient sources: organic and inorganic
  [id(48)]: {
    scope: 'understanding_only',
    practice: q('Which plant nutrient source is organic?', 'Quelle source de nutriments pour les plantes est organique ?',
      ['Compost', 'Le compost'], ['Mineral fertiliser granules', 'Des granulés d’engrais minéral', 'confuses-organic-and-inorganic-sources', C], ['A plastic bag', 'Un sac plastique', 'confuses-organic-and-inorganic-sources', C]),
    diagnostic: [
      q('Which nutrient source is inorganic?', 'Quelle source de nutriments est inorganique ?',
        ['A mineral fertiliser', 'Un engrais minéral'], ['Compost', 'Le compost', 'confuses-organic-and-inorganic-sources', C], ['Well-managed manure', 'Du fumier bien géré', 'confuses-organic-and-inorganic-sources', C]),
      q('Can one litre of compost replace one litre of mineral fertiliser?', 'Un litre de compost peut-il remplacer un litre d’engrais minéral ?',
        ['Not automatically; their nutrient content differs', 'Pas automatiquement ; leur teneur en nutriments diffère'], ['Yes, equal volumes give equal nutrients', 'Oui, des volumes égaux donnent les mêmes nutriments', 'treats-equal-volumes-as-equal-nutrient-content', M], ['Yes, every plant needs the same amount', 'Oui, chaque plante a besoin de la même quantité', 'assumes-one-dose-fits-all-crops', M]),
    ],
    reassessment: [
      q('What does “organic” mean in this farming lesson?', 'Que signifie « organique » dans cette leçon d’agriculture ?',
        ['A source made from living material, such as compost', 'Une source issue de matière vivante, comme le compost'], ['A product that is always harmless', 'Un produit toujours inoffensif', 'assumes-organic-means-harmless', M], ['A source made in a factory', 'Une source fabriquée en usine', 'confuses-organic-and-inorganic-sources', C]),
      q('How should you decide how much fertiliser a crop needs?', 'Comment décider de la quantité d’engrais dont une culture a besoin ?',
        ['Check verified guidance for that crop, soil and product', 'Consulter des conseils vérifiés pour cette culture, ce sol et ce produit'], ['Use the same amount for every crop', 'Utiliser la même quantité pour toutes les cultures', 'assumes-one-dose-fits-all-crops', M], ['Guess from the colour of the bag', 'Deviner d’après la couleur du sac', 'treats-equal-volumes-as-equal-nutrient-content', M]),
    ],
    retention: [
      q('Which pair is correctly grouped?', 'Quelle paire est correctement classée ?',
        ['Compost: organic; mineral fertiliser: inorganic', 'Compost : organique ; engrais minéral : inorganique'], ['Compost: inorganic; mineral fertiliser: organic', 'Compost : inorganique ; engrais minéral : organique', 'confuses-organic-and-inorganic-sources', C], ['Both are inorganic', 'Les deux sont inorganiques', 'confuses-organic-and-inorganic-sources', C]),
      q('Why must you not handle raw manure or unknown fertiliser in the survey?', 'Pourquoi ne faut-il pas manipuler le fumier frais ou un engrais inconnu pendant l’enquête ?',
        ['They can be harmful to health', 'Ils peuvent être dangereux pour la santé'], ['Because organic sources are always safe', 'Parce que les sources organiques sont toujours sûres', 'assumes-organic-means-harmless', M], ['Because they have no nutrients', 'Parce qu’ils n’ont pas de nutriments', 'confuses-organic-and-inorganic-sources', C]),
    ],
    transfer: [
      q('A farmer uses poultry droppings that have been composted. How is this source grouped?', 'Un agriculteur utilise des fientes de volaille compostées. Comment classer cette source ?',
        ['Organic', 'Organique'], ['Inorganic', 'Inorganique', 'confuses-organic-and-inorganic-sources', C], ['Not a nutrient source', 'Pas une source de nutriments', 'confuses-organic-and-inorganic-sources', C]),
      q('Two farmers each add one bucket of different products to their maize. Can you say both gave the same nutrients?', 'Deux agriculteurs ajoutent chacun un seau de produits différents à leur maïs. Peut-on dire qu’ils ont apporté les mêmes nutriments ?',
        ['No, you need each product’s nutrient content', 'Non, il faut connaître la teneur en nutriments de chaque produit'], ['Yes, a bucket is a bucket', 'Oui, un seau est un seau', 'treats-equal-volumes-as-equal-nutrient-content', M], ['Yes, if both are maize farms', 'Oui, si ce sont deux fermes de maïs', 'assumes-one-dose-fits-all-crops', M]),
    ],
  },

  // B7.2.3.1.2 Physical characteristics of plant nutrients and how they are applied
  [id(48, 2)]: {
    practice: q('Which describes the physical form of a typical mineral fertiliser?', 'Qu’est-ce qui décrit la forme physique d’un engrais minéral typique ?',
      ['Small granules', 'De petits granulés'], ['Crumbly decayed plant matter', 'De la matière végétale décomposée et friable', 'confuses-organic-and-inorganic-forms', C], ['A living plant', 'Une plante vivante', 'confuses-organic-and-inorganic-forms', C]),
    diagnostic: [
      q('Which describes compost?', 'Qu’est-ce qui décrit le compost ?',
        ['Dark, crumbly organic matter', 'De la matière organique sombre et friable'], ['Hard white crystals', 'Des cristaux blancs et durs', 'confuses-organic-and-inorganic-forms', C], ['A clear liquid', 'Un liquide transparent', 'confuses-organic-and-inorganic-forms', C]),
      q('Can you tell a fertiliser’s correct dose from how it looks?', 'Peut-on connaître la bonne dose d’un engrais à son aspect ?',
        ['No, follow its verified product and crop instructions', 'Non, il faut suivre les instructions vérifiées du produit et de la culture'], ['Yes, larger granules mean a smaller dose', 'Oui, de plus gros granulés veulent dire une dose plus petite', 'judges-dose-or-safety-by-appearance', M], ['Yes, darker colour means safer', 'Oui, une couleur plus foncée veut dire plus sûr', 'judges-dose-or-safety-by-appearance', M]),
    ],
    reassessment: [
      q('How is compost commonly applied in a garden?', 'Comment le compost est-il couramment appliqué dans un jardin ?',
        ['Mixed into suitable soil under guidance', 'Mélangé à un sol adapté, avec des conseils'], ['Sprayed on leaves as a powder', 'Pulvérisé en poudre sur les feuilles', 'confuses-application-methods', C], ['Swallowed by the farmer', 'Avalé par l’agriculteur', 'judges-dose-or-safety-by-appearance', M]),
      q('A learner draws a plan for applying fertiliser. What does the drawing show?', 'Un élève dessine un plan pour appliquer de l’engrais. Que montre le dessin ?',
        ['A planned method, not a completed field application', 'Une méthode prévue, pas une application réelle au champ'], ['That the field has been fertilised', 'Que le champ a été fertilisé', 'counts-a-paper-plan-as-completed-field-application', M], ['The exact dose for every crop', 'La dose exacte pour chaque culture', 'judges-dose-or-safety-by-appearance', M]),
    ],
    retention: [
      q('How does physical form affect a nutrient material?', 'Comment la forme physique influence-t-elle un matériau nutritif ?',
        ['It affects how it is measured, spread and placed', 'Elle influence la façon de le mesurer, de l’épandre et de le placer'], ['It tells you everything about its contents', 'Elle dit tout sur sa composition', 'judges-dose-or-safety-by-appearance', M], ['It has no effect', 'Elle n’a aucun effet', 'confuses-application-methods', C]),
      q('Who must supervise a real fertiliser application at school?', 'Qui doit superviser une vraie application d’engrais à l’école ?',
        ['A teacher who has checked the instructions', 'Un enseignant qui a vérifié les instructions'], ['Nobody, learners can guess', 'Personne, les élèves peuvent deviner', 'judges-dose-or-safety-by-appearance', M], ['Only a classmate', 'Seulement un camarade', 'judges-dose-or-safety-by-appearance', C]),
    ],
    transfer: [
      q('A liquid fertiliser label says to dilute it before use. What should a farmer do?', 'L’étiquette d’un engrais liquide indique de le diluer avant usage. Que doit faire l’agriculteur ?',
        ['Follow the label’s dilution and crop instructions', 'Suivre les instructions de dilution et de culture de l’étiquette'], ['Pour it on undiluted to work faster', 'Le verser pur pour qu’il agisse plus vite', 'judges-dose-or-safety-by-appearance', M], ['Mix it with other products to make it stronger', 'Le mélanger à d’autres produits pour le renforcer', 'confuses-application-methods', M]),
      q('Granules are placed in a ring around a plant, not on its leaves. Why?', 'Des granulés sont placés en cercle autour d’une plante, pas sur ses feuilles. Pourquoi ?',
        ['Placement matters: roots take up nutrients from the soil', 'Le placement compte : les racines absorbent les nutriments du sol'], ['Leaves are the only part that needs nutrients', 'Les feuilles sont la seule partie qui a besoin de nutriments', 'confuses-application-methods', C], ['Placement never matters', 'Le placement n’a jamais d’importance', 'confuses-application-methods', M]),
    ],
  },

  // B7.2.4.1.1 Domestic animals in the community
  [id(49)]: {
    scope: 'understanding_only',
    practice: q('Which of these is a domestic animal kept by people in Ghana?', 'Lequel de ces animaux est un animal domestique élevé par les gens au Ghana ?',
      ['A goat', 'Une chèvre'], ['A lion', 'Un lion', 'confuses-domestic-and-wild-animals', C], ['An eagle', 'Un aigle', 'confuses-domestic-and-wild-animals', C]),
    diagnostic: [
      q('You see a brown goat but nobody tells you its breed. What should you record?', 'Tu vois une chèvre brune mais personne ne t’indique sa race. Que dois-tu noter ?',
        ['Brown goat; breed not verified', 'Chèvre brune ; race non vérifiée'], ['The colour proves its exact breed', 'La couleur prouve sa race exacte', 'infers-a-breed-from-colour-alone', M], ['All goats are one breed', 'Toutes les chèvres sont d’une seule race', 'confuses-animal-type-with-breed', M]),
      q('Which description correctly defines an animal breed?', 'Qu’est-ce qu’une race ?',
        ['A group within one animal type with inherited features', 'Un groupe au sein d’un type d’animal avec des caractères héréditaires'], ['Any animal of a certain colour', 'Tout animal d’une certaine couleur', 'infers-a-breed-from-colour-alone', M], ['Another word for “goat”', 'Un autre mot pour « chèvre »', 'confuses-animal-type-with-breed', M]),
    ],
    reassessment: [
      q('Which features can you safely observe from a distance?', 'Quelles caractéristiques peut-on observer sans danger à distance ?',
        ['Shape, size, covering, colour and feeding behaviour', 'La forme, la taille, le pelage, la couleur et le comportement alimentaire'], ['The animal’s stomach compartments', 'Les compartiments de l’estomac de l’animal', 'invents-an-unobserved-record', M], ['Its exact breed from colour', 'Sa race exacte d’après la couleur', 'infers-a-breed-from-colour-alone', M]),
      q('A keeper says her goat is West African Dwarf. How should you record this?', 'Une éleveuse dit que sa chèvre est une naine d’Afrique de l’Ouest. Comment le noter ?',
        ['As the keeper’s report, checked against a reference if possible', 'Comme le témoignage de l’éleveuse, à vérifier avec une référence si possible'], ['As something you observed yourself', 'Comme quelque chose que tu as observé toi-même', 'invents-an-unobserved-record', M], ['As true for every small goat', 'Comme vrai pour toutes les petites chèvres', 'infers-a-breed-from-colour-alone', M]),
    ],
    retention: [
      q('Which list contains only domestic animals?', 'Quelle liste ne contient que des animaux domestiques ?',
        ['Sheep, cattle, chickens', 'Moutons, bovins, poulets'], ['Sheep, elephants, chickens', 'Moutons, éléphants, poulets', 'confuses-domestic-and-wild-animals', C], ['Snakes, cattle, hawks', 'Serpents, bovins, éperviers', 'confuses-domestic-and-wild-animals', C]),
      q('Does the word “goat” name a particular breed?', 'La chèvre est-elle une race ?',
        ['No, a goat is an animal type; breeds are groups within it', 'Non, la chèvre est un type d’animal ; les races sont des groupes en son sein'], ['Yes, goat is a breed name', 'Oui, chèvre est un nom de race', 'confuses-animal-type-with-breed', M], ['Yes, every animal type is one breed', 'Oui, chaque type d’animal est une race', 'confuses-animal-type-with-breed', M]),
    ],
    transfer: [
      q('In a town survey you see a black-and-white cow. What is the most honest record?', 'Lors d’une enquête en ville, tu vois une vache noire et blanche. Quelle est la note la plus honnête ?',
        ['Black-and-white cow; breed not verified', 'Vache noire et blanche ; race non vérifiée'], ['A famous dairy breed, because of the colours', 'Une race laitière connue, à cause des couleurs', 'infers-a-breed-from-colour-alone', M], ['A wild buffalo', 'Un buffle sauvage', 'confuses-domestic-and-wild-animals', C]),
      q('A classmate writes “I saw 20 pigs” but only saw a picture. What is wrong?', 'Un camarade écrit « j’ai vu 20 porcs » mais il n’a vu qu’une image. Qu’est-ce qui ne va pas ?',
        ['It reports an observation that did not happen', 'Il rapporte une observation qui n’a pas eu lieu'], ['Nothing, pictures are the same as visits', 'Rien, une image vaut une visite', 'invents-an-unobserved-record', M], ['Pigs are not domestic animals', 'Les porcs ne sont pas des animaux domestiques', 'confuses-domestic-and-wild-animals', C]),
    ],
  },

  // B7.2.4.1.2 Differences and similarities among domestic animals
  [id(50)]: {
    practice: q('Which animal chews the cud?', 'Lequel de ces animaux rumine ?',
      ['Cattle', 'Les bovins'], ['A pig', 'Le porc', 'confuses-ruminant-and-monogastric', C], ['A chicken', 'Le poulet', 'confuses-ruminant-and-monogastric', C]),
    diagnostic: [
      q('Which animal is a non-ruminant with a simple stomach?', 'Quel animal est un non-ruminant à estomac simple ?',
        ['A pig', 'Le porc'], ['A goat', 'La chèvre', 'confuses-ruminant-and-monogastric', C], ['A sheep', 'Le mouton', 'confuses-ruminant-and-monogastric', C]),
      q('Which statement about chickens is correct?', 'Quelle affirmation sur les poulets est correcte ?',
        ['Chickens can eat both plant and animal food', 'Les poulets peuvent manger des aliments végétaux et animaux'], ['All poultry eat only plants', 'Toutes les volailles mangent seulement des plantes', 'treats-poultry-as-always-herbivorous-or-mutually-exclusive', M], ['Chickens are ruminants', 'Les poulets sont des ruminants', 'confuses-ruminant-and-monogastric', M]),
    ],
    reassessment: [
      q('What makes an animal a ruminant?', 'Qu’est-ce qui fait d’un animal un ruminant ?',
        ['A stomach with compartments and chewing the cud', 'Un estomac à compartiments et le fait de ruminer'], ['Eating grass alone', 'Manger seulement de l’herbe', 'classifies-by-diet-alone', M], ['Being large', 'Être grand', 'classifies-by-diet-alone', C]),
      q('Which feature do goats, pigs and chickens share?', 'Quelle caractéristique ont en commun les chèvres, les porcs et les poulets ?',
        ['They all need food, water and care', 'Ils ont tous besoin de nourriture, d’eau et de soins'], ['They all have feathers', 'Ils ont tous des plumes', 'treats-poultry-as-always-herbivorous-or-mutually-exclusive', C], ['They all chew the cud', 'Ils ruminent tous', 'confuses-ruminant-and-monogastric', C]),
    ],
    retention: [
      q('How do chickens reproduce, compared with goats?', 'Comment les poulets se reproduisent-ils, par rapport aux chèvres ?',
        ['Chickens lay eggs; goats give birth to live young', 'Les poulets pondent des œufs ; les chèvres donnent naissance à des petits vivants'], ['Both lay eggs', 'Les deux pondent des œufs', 'treats-poultry-as-always-herbivorous-or-mutually-exclusive', C], ['Both give birth to live young', 'Les deux donnent naissance à des petits vivants', 'treats-poultry-as-always-herbivorous-or-mutually-exclusive', C]),
      q('What covers the body of poultry?', 'Qu’est-ce qui couvre le corps des volailles ?',
        ['Feathers', 'Des plumes'], ['Hair', 'Des poils', 'treats-poultry-as-always-herbivorous-or-mutually-exclusive', C], ['Scales only', 'Seulement des écailles', 'treats-poultry-as-always-herbivorous-or-mutually-exclusive', C]),
    ],
    transfer: [
      q('A farmer in another country keeps sheep. Does living in another country change whether a sheep is a ruminant?', 'Un éleveur d’un autre pays élève des moutons. Le fait de vivre ailleurs change-t-il le fait que le mouton est un ruminant ?',
        ['No, the basic category stays the same', 'Non, la catégorie de base reste la même'], ['Yes, sheep abroad have simple stomachs', 'Oui, les moutons étrangers ont un estomac simple', 'classifies-by-diet-alone', M], ['Yes, location decides the stomach type', 'Oui, le lieu décide du type d’estomac', 'classifies-by-diet-alone', M]),
      q('A pig eats mostly vegetables on one farm. Does that make it a ruminant?', 'Dans une ferme, un porc mange surtout des légumes. Cela en fait-il un ruminant ?',
        ['No, a ruminant is defined by its stomach and cud chewing', 'Non, un ruminant se définit par son estomac et la rumination'], ['Yes, any plant-eater is a ruminant', 'Oui, tout herbivore est un ruminant', 'classifies-by-diet-alone', M], ['Yes, if it is large', 'Oui, s’il est grand', 'classifies-by-diet-alone', C]),
    ],
  },

  // B7.2.4.2.1 Domestic and commercial uses of animals
  [id(51)]: {
    practice: q('A family keeps chickens and eats the eggs at home. What kind of use is this?', 'Une famille élève des poulets et mange les œufs à la maison. Quel type d’usage est-ce ?',
      ['Domestic (household) use', 'Usage domestique (familial)'], ['Commercial use', 'Usage commercial', 'confuses-domestic-and-commercial-purpose', C], ['No use', 'Aucun usage', 'confuses-domestic-and-commercial-purpose', C]),
    diagnostic: [
      q('A farmer sells goat meat at the market. What kind of use is this?', 'Un éleveur vend de la viande de chèvre au marché. Quel type d’usage est-ce ?',
        ['Commercial use', 'Usage commercial'], ['Domestic use only', 'Seulement un usage domestique', 'confuses-domestic-and-commercial-purpose', C], ['It depends on the colour of the goat', 'Cela dépend de la couleur de la chèvre', 'assumes-a-product-determines-purpose-without-context', M]),
      q('The same eggs can be eaten at home or sold. What decides the type of use?', 'Les mêmes œufs peuvent être mangés à la maison ou vendus. Qu’est-ce qui décide du type d’usage ?',
        ['The purpose: household need or sale for income', 'Le but : besoin familial ou vente pour un revenu'], ['The product alone', 'Le produit à lui seul', 'assumes-a-product-determines-purpose-without-context', M], ['The size of the egg', 'La taille de l’œuf', 'assumes-a-product-determines-purpose-without-context', C]),
    ],
    reassessment: [
      q('Does every cow produce milk that can be sold?', 'Toutes les vaches produisent-elles du lait qui peut être vendu ?',
        ['No, actual uses depend on the animal and how it is managed', 'Non, les usages réels dépendent de l’animal et de sa gestion'], ['Yes, every cow does', 'Oui, toutes les vaches', 'assumes-every-animal-gives-every-product', M], ['Yes, if it is in Ghana', 'Oui, si elle est au Ghana', 'assumes-every-animal-gives-every-product', M]),
      q('Which is a household use of a sheep?', 'Quel est un usage familial d’un mouton ?',
        ['Meat for a family celebration', 'De la viande pour une fête de famille'], ['Selling wool to a factory for income', 'Vendre la laine à une usine pour un revenu', 'confuses-domestic-and-commercial-purpose', C], ['Selling the sheep at the market', 'Vendre le mouton au marché', 'confuses-domestic-and-commercial-purpose', C]),
    ],
    retention: [
      q('What does a commercial use of an animal produce?', 'Que produit l’usage commercial d’un animal ?',
        ['Goods or services for sale or income', 'Des biens ou des services pour la vente ou un revenu'], ['Only food eaten at home', 'Seulement de la nourriture mangée à la maison', 'confuses-domestic-and-commercial-purpose', C], ['Nothing useful', 'Rien d’utile', 'confuses-domestic-and-commercial-purpose', C]),
      q('What should a good animal-use poster include?', 'Que doit contenir une bonne affiche sur les usages des animaux ?',
        ['The animal, a supported use and whether it is household or commercial', 'L’animal, un usage justifié et s’il est familial ou commercial'], ['Every possible product for every animal', 'Tous les produits possibles pour chaque animal', 'assumes-every-animal-gives-every-product', M], ['Only pictures without uses', 'Seulement des images sans usages', 'confuses-domestic-and-commercial-purpose', C]),
    ],
    transfer: [
      q('A woman rears guinea fowl and sells them before festivals. What is the main use?', 'Une femme élève des pintades et les vend avant les fêtes. Quel est l’usage principal ?',
        ['Commercial', 'Commercial'], ['Domestic only', 'Seulement domestique', 'confuses-domestic-and-commercial-purpose', C], ['Neither, because guinea fowl have no uses', 'Aucun, car les pintades n’ont pas d’usage', 'assumes-every-animal-gives-every-product', C]),
      q('A boy uses a donkey to carry water home for his family. What kind of use is this?', 'Un garçon utilise un âne pour transporter de l’eau à la maison pour sa famille. Quel type d’usage est-ce ?',
        ['Domestic use for household work', 'Usage domestique pour le travail familial'], ['Commercial use, because work is done', 'Usage commercial, parce qu’un travail est fait', 'confuses-domestic-and-commercial-purpose', C], ['No use', 'Aucun usage', 'confuses-domestic-and-commercial-purpose', C]),
    ],
  },

  // B7.2.4.2.2 Observe and compare the uses of animals
  [id(52)]: {
    scope: 'understanding_only',
    practice: q('What should an animal investigation begin with?', 'Par quoi doit commencer une enquête sur les animaux ?',
      ['A question, permission and a safe plan', 'Une question, une autorisation et un plan sûr'], ['Entering animal pens', 'Entrer dans les enclos', 'unsafe-investigation-method', M], ['Writing the results first', 'Écrire d’abord les résultats', 'reports-an-interview-or-observation-that-did-not-occur', M]),
    diagnostic: [
      q('You see a goat but do not see any sale. What can you conclude?', 'Tu vois une chèvre mais aucune vente. Que peux-tu conclure ?',
        ['The goat was seen; its commercial use is not verified', 'La chèvre a été vue ; son usage commercial n’est pas vérifié'], ['A sale definitely took place', 'Une vente a forcément eu lieu', 'infers-use-from-a-sighting', M], ['Goats have no uses', 'Les chèvres n’ont pas d’usage', 'infers-use-from-a-sighting', C]),
      q('A keeper says she sells eggs, but you did not see a sale. How do you record this?', 'Une éleveuse dit qu’elle vend des œufs, mais tu n’as pas vu de vente. Comment le noter ?',
        ['As a reported use, labelled as the keeper’s report', 'Comme un usage rapporté, indiqué comme témoignage de l’éleveuse'], ['As a sale you observed', 'Comme une vente que tu as observée', 'reports-an-interview-or-observation-that-did-not-occur', M], ['Leave it out and invent a different use', 'Ne pas le noter et inventer un autre usage', 'reports-an-interview-or-observation-that-did-not-occur', M]),
    ],
    reassessment: [
      q('Which is a by-product of keeping animals?', 'Quel est un sous-produit de l’élevage ?',
        ['Manure that is suitably managed for crops', 'Le fumier bien géré pour les cultures'], ['The animal’s name', 'Le nom de l’animal', 'infers-use-from-a-sighting', C], ['A survey form', 'Un formulaire d’enquête', 'infers-use-from-a-sighting', C]),
      q('What does a small survey of one street describe?', 'Que décrit une petite enquête dans une seule rue ?',
        ['Only what was found in that street', 'Seulement ce qui a été trouvé dans cette rue'], ['Every community in Ghana', 'Toutes les communautés du Ghana', 'overgeneralises-from-one-observation', M], ['Every animal in the world', 'Tous les animaux du monde', 'overgeneralises-from-one-observation', M]),
    ],
    retention: [
      q('Is it acceptable to write down an interview that did not happen?', 'Est-il acceptable de noter une interview qui n’a pas eu lieu ?',
        ['No, never invent an interview or result', 'Non, il ne faut jamais inventer une interview ou un résultat'], ['Yes, if it seems likely', 'Oui, si cela semble probable', 'reports-an-interview-or-observation-that-did-not-occur', M], ['Yes, to fill the table', 'Oui, pour remplir le tableau', 'reports-an-interview-or-observation-that-did-not-occur', M]),
      q('Which comparison is supported by evidence?', 'Quelle comparaison est appuyée par des preuves ?',
        ['Observed: cattle pull a plough; chickens lay eggs that are eaten', 'Observé : les bœufs tirent une charrue ; les poules pondent des œufs consommés'], ['Every animal gives milk', 'Tous les animaux donnent du lait', 'infers-use-from-a-sighting', M], ['Seeing a pig proves pork is sold', 'Voir un porc prouve que du porc est vendu', 'infers-use-from-a-sighting', M]),
    ],
    transfer: [
      q('At a market you photograph a stall selling cow hides. What does this evidence support?', 'Au marché, tu photographies un stand qui vend des peaux de vache. Que montre cette preuve ?',
        ['That hides from cattle are sold there', 'Que des peaux de bovins y sont vendues'], ['That every cow in town is sold', 'Que toutes les vaches de la ville sont vendues', 'overgeneralises-from-one-observation', M], ['That hides are a household use only', 'Que les peaux ne servent qu’à la maison', 'infers-use-from-a-sighting', C]),
      q('Your table has an empty “product” box for donkeys. What should you do?', 'Ton tableau a une case « produit » vide pour les ânes. Que dois-tu faire ?',
        ['Mark it “not verified” until you have evidence', 'Indiquer « non vérifié » jusqu’à avoir une preuve'], ['Fill it with a guess', 'La remplir avec une supposition', 'reports-an-interview-or-observation-that-did-not-occur', M], ['Copy the goat row', 'Recopier la ligne de la chèvre', 'reports-an-interview-or-observation-that-did-not-occur', M]),
    ],
  },
};
