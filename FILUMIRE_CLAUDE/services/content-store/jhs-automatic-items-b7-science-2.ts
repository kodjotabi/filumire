import type { JhsAutoItem, JhsAutomaticTopic, JhsWrongOption } from './jhs-automatic-assessment';

/*
 * Automatic questions, Basic 7 Science: food and digestion, the inner
 * planets, ecosystems, farming systems and energy (15 topics).
 * The first option of each question is correct (shuffled when shown).
 */
const M = 'misconception' as const, C = 'conceptual_misunderstanding' as const, P = 'procedural_error' as const;
const q = (en: string, fr: string, right: readonly [string, string], ...wrong: JhsWrongOption[]): JhsAutoItem => ({ q: { en, fr }, right, wrong });
const id = (page: number, row = 1) => `competency-gh-science-b7-nacca2020-p${String(page).padStart(3, '0')}-r${String(row).padStart(2, '0')}`;

export const JHS_B7_SCIENCE_AUTOMATIC_2: Record<string, JhsAutomaticTopic> = {
  // B7.3.1.1.1 Food and the need for humans to eat
  [id(53)]: {
    practice: q('Which nutrient group mainly gives the body energy?', 'Quel groupe de nutriments fournit surtout de l’énergie au corps ?',
      ['Carbohydrates', 'Les glucides'], ['Vitamins', 'Les vitamines', 'mismatches-nutrient-and-body-use', C], ['Water', 'L’eau', 'mismatches-nutrient-and-body-use', C]),
    diagnostic: [
      q('Which nutrient supplies building materials for growth and repair?', 'Quel nutriment fournit les matériaux de construction pour la croissance et la réparation ?',
        ['Protein', 'Les protéines'], ['Fat', 'Les lipides', 'mismatches-nutrient-and-body-use', C], ['Fibre', 'Les fibres', 'mismatches-nutrient-and-body-use', C]),
      q('Can you tell a person’s nutritional health from their appearance alone?', 'Peut-on connaître l’état nutritionnel d’une personne à sa seule apparence ?',
        ['No, appearance alone is not enough evidence', 'Non, l’apparence seule ne suffit pas comme preuve'], ['Yes, strong-looking people have every nutrient', 'Oui, les personnes qui ont l’air fortes ont tous les nutriments', 'diagnoses-nutritional-health-by-appearance', M], ['Yes, body shape shows exactly what someone eats', 'Oui, la silhouette montre exactement ce que mange quelqu’un', 'diagnoses-nutritional-health-by-appearance', M]),
    ],
    reassessment: [
      q('Beans are a good source of which nutrients?', 'Les haricots sont une bonne source de quels nutriments ?',
        ['Protein and carbohydrate', 'Protéines et glucides'], ['Only water', 'Seulement de l’eau', 'thinks-each-food-has-one-nutrient', M], ['Only fat', 'Seulement des lipides', 'thinks-each-food-has-one-nutrient', M]),
      q('What does fibre help the body to do?', 'À quoi les fibres aident-elles le corps ?',
        ['Keep normal bowel movements', 'Garder un transit intestinal normal'], ['Build muscles', 'Construire les muscles', 'mismatches-nutrient-and-body-use', C], ['Carry oxygen', 'Transporter l’oxygène', 'mismatches-nutrient-and-body-use', C]),
    ],
    retention: [
      q('Why do humans need to eat food?', 'Pourquoi les humains ont-ils besoin de manger ?',
        ['For energy, growth, repair and to regulate body processes', 'Pour l’énergie, la croissance, la réparation et la régulation du corps'], ['Only to feel full', 'Seulement pour se sentir rassasiés', 'mismatches-nutrient-and-body-use', C], ['Only for taste', 'Seulement pour le goût', 'mismatches-nutrient-and-body-use', C]),
      q('Palm oil mainly supplies which nutrient?', 'L’huile de palme fournit surtout quel nutriment ?',
        ['Fat', 'Des lipides'], ['Protein', 'Des protéines', 'mismatches-nutrient-and-body-use', C], ['Fibre', 'Des fibres', 'mismatches-nutrient-and-body-use', C]),
    ],
    transfer: [
      q('A meal is boiled yam with garden-egg stew and fish. Which food in it is the main protein source?', 'Un repas est composé d’igname bouillie, de sauce aux aubergines et de poisson. Quel aliment est la principale source de protéines ?',
        ['The fish', 'Le poisson'], ['The yam', 'L’igname', 'mismatches-nutrient-and-body-use', C], ['The water used for boiling', 'L’eau de cuisson', 'mismatches-nutrient-and-body-use', C]),
      q('A fictional learner has eaten too little for months and feels tired. What is a reasonable explanation?', 'Un élève fictif a trop peu mangé pendant des mois et se sent fatigué. Quelle explication est raisonnable ?',
        ['Low food intake over time can reduce energy', 'Manger trop peu pendant longtemps peut réduire l’énergie'], ['His appearance proves his exact diet', 'Son apparence prouve son régime exact', 'diagnoses-nutritional-health-by-appearance', M], ['Food has nothing to do with energy', 'La nourriture n’a rien à voir avec l’énergie', 'mismatches-nutrient-and-body-use', C]),
    ],
  },

  // B7.3.1.1.2 Stages of digestion
  [id(54)]: {
    practice: q('Where does digestion of starch begin?', 'Où commence la digestion de l’amidon ?',
      ['In the mouth, with saliva', 'Dans la bouche, avec la salive'], ['In the large intestine', 'Dans le gros intestin', 'places-large-intestine-before-small-intestine', M], ['In the rectum', 'Dans le rectum', 'misplaces-digestion-stage', C]),
    diagnostic: [
      q('Which order follows food after the stomach?', 'Quel ordre suit la nourriture après l’estomac ?',
        ['Small intestine, then large intestine', 'Intestin grêle, puis gros intestin'], ['Large intestine, then small intestine', 'Gros intestin, puis intestin grêle', 'places-large-intestine-before-small-intestine', M], ['Liver, then lungs', 'Foie, puis poumons', 'thinks-food-passes-through-liver', M]),
      q('Where are most digested nutrients absorbed?', 'Où la plupart des nutriments digérés sont-ils absorbés ?',
        ['In the small intestine', 'Dans l’intestin grêle'], ['In the mouth', 'Dans la bouche', 'misplaces-digestion-stage', C], ['In the oesophagus', 'Dans l’œsophage', 'misplaces-digestion-stage', C]),
    ],
    reassessment: [
      q('What does the large intestine mainly do?', 'Que fait surtout le gros intestin ?',
        ['Absorbs remaining water and helps form faeces', 'Il absorbe l’eau restante et aide à former les selles'], ['Begins starch digestion', 'Il commence la digestion de l’amidon', 'misplaces-digestion-stage', C], ['Makes bile', 'Il fabrique la bile', 'confuses-bile-with-enzyme', C]),
      q('Is bile correctly classified as a digestive enzyme?', 'La bile est-elle une enzyme ?',
        ['No, bile helps fat processing but is not an enzyme', 'Non, la bile aide au traitement des graisses mais n’est pas une enzyme'], ['Yes, it digests protein', 'Oui, elle digère les protéines', 'confuses-bile-with-enzyme', M], ['Yes, it is made in the mouth', 'Oui, elle est produite dans la bouche', 'confuses-bile-with-enzyme', M]),
    ],
    retention: [
      q('What is the difference between digestion and egestion?', 'Quelle est la différence entre la digestion et l’égestion ?',
        ['Digestion breaks food down; egestion removes undigested waste', 'La digestion décompose les aliments ; l’égestion élimine les déchets non digérés'], ['They are the same process', 'C’est le même processus', 'confuses-digestion-absorption-and-egestion', M], ['Egestion breaks food down in the mouth', 'L’égestion décompose les aliments dans la bouche', 'confuses-digestion-absorption-and-egestion', C]),
      q('Which tube carries food from the mouth to the stomach?', 'Quel tube amène la nourriture de la bouche à l’estomac ?',
        ['The oesophagus', 'L’œsophage'], ['The windpipe', 'La trachée', 'misplaces-digestion-stage', C], ['The small intestine', 'L’intestin grêle', 'places-large-intestine-before-small-intestine', P]),
    ],
    transfer: [
      q('A piece of boiled egg reaches the stomach. What begins to happen to its protein there?', 'Un morceau d’œuf dur arrive dans l’estomac. Que commence-t-il à arriver à ses protéines ?',
        ['Acid and enzymes begin breaking it down', 'L’acide et les enzymes commencent à les décomposer'], ['It is absorbed into the blood immediately', 'Elles passent immédiatement dans le sang', 'confuses-digestion-absorption-and-egestion', M], ['Nothing until the large intestine', 'Rien jusqu’au gros intestin', 'places-large-intestine-before-small-intestine', M]),
      q('Do the liver and pancreas form part of the tube that food passes through?', 'Le foie et le pancréas font-ils partie du tube par lequel passe la nourriture ?',
        ['No, they add secretions; food does not pass through them', 'Non, ils ajoutent des sécrétions ; la nourriture n’y passe pas'], ['Yes, food goes through the liver', 'Oui, la nourriture passe par le foie', 'thinks-food-passes-through-liver', M], ['Yes, the pancreas is after the rectum', 'Oui, le pancréas est après le rectum', 'thinks-food-passes-through-liver', M]),
    ],
  },

  // B7.3.1.1.3 End products of digestion and absorption
  [id(55)]: {
    practice: q('What is starch broken down into?', 'En quoi l’amidon est-il décomposé ?',
      ['Simple sugars such as glucose', 'En sucres simples comme le glucose'], ['Amino acids', 'En acides aminés', 'mismatches-food-and-end-product', C], ['Fatty acids', 'En acides gras', 'mismatches-food-and-end-product', C]),
    diagnostic: [
      q('Proteins are digested into which products?', 'Les protéines sont digérées en quels produits ?',
        ['Amino acids', 'Des acides aminés'], ['Glucose', 'Du glucose', 'mismatches-food-and-end-product', C], ['Glycerol only', 'Seulement du glycérol', 'mismatches-food-and-end-product', C]),
      q('What does a positive iodine test on a food sample show?', 'Que montre un test à l’iode positif sur un échantillon d’aliment ?',
        ['The sample contains starch', 'L’échantillon contient de l’amidon'], ['The starch has been absorbed by a person', 'L’amidon a été absorbé par une personne', 'treats-food-test-results-as-proof-of-absorption', M], ['The food is safe to eat', 'L’aliment peut être mangé sans risque', 'treats-food-test-results-as-proof-of-absorption', M]),
    ],
    reassessment: [
      q('What do villi do in the small intestine?', 'Quel est le rôle des villosités de l’intestin grêle ?',
        ['Increase the surface for absorption', 'Augmenter la surface d’absorption'], ['Chew the food', 'Mâcher la nourriture', 'misunderstands-absorption', C], ['Store faeces', 'Stocker les selles', 'misunderstands-absorption', C]),
      q('Fats and oils are broken down into which products?', 'Les graisses et les huiles sont décomposées en quels produits ?',
        ['Fatty acids and glycerol', 'Des acides gras et du glycérol'], ['Amino acids', 'Des acides aminés', 'mismatches-food-and-end-product', C], ['Starch', 'De l’amidon', 'mismatches-food-and-end-product', C]),
    ],
    retention: [
      q('Where do many fat products go first after absorption?', 'Où vont d’abord beaucoup de produits des graisses après absorption ?',
        ['Into the lymph, before reaching the blood', 'Dans la lymphe, avant d’atteindre le sang'], ['Straight into the lungs', 'Directement dans les poumons', 'misunderstands-absorption', C], ['Back into the stomach', 'De nouveau dans l’estomac', 'misunderstands-absorption', C]),
      q('A purple Biuret result supports the presence of which nutrient in a sample?', 'Un résultat violet au test du biuret indique la présence de quel nutriment dans un échantillon ?',
        ['Protein', 'Des protéines'], ['Starch', 'De l’amidon', 'mismatches-food-test-and-nutrient', C], ['Fat', 'Des lipides', 'mismatches-food-test-and-nutrient', C]),
    ],
    transfer: [
      q('Groundnut paste leaves a see-through mark on paper that does not dry. What does this suggest?', 'De la pâte d’arachide laisse sur le papier une tache translucide qui ne sèche pas. Que suggère cela ?',
        ['The sample contains fat or oil', 'L’échantillon contient de la graisse ou de l’huile'], ['The groundnut has been digested', 'L’arachide a été digérée', 'treats-food-test-results-as-proof-of-absorption', M], ['The sample contains only protein', 'L’échantillon ne contient que des protéines', 'mismatches-food-test-and-nutrient', C]),
      q('After a meal of rice, which product of digestion enters the blood from the small intestine?', 'Après un repas de riz, quel produit de la digestion passe de l’intestin grêle au sang ?',
        ['Glucose', 'Le glucose'], ['Whole starch grains', 'Des grains d’amidon entiers', 'misunderstands-absorption', M], ['Amino acids only', 'Seulement des acides aminés', 'mismatches-food-and-end-product', C]),
    ],
  },

  // B7.3.2.1.1 Inner planets
  [id(56)]: {
    practice: q('Which planet is closest to the Sun?', 'Quelle planète est la plus proche du Soleil ?',
      ['Mercury', 'Mercure'], ['Mars', 'Mars', 'misorders-the-planets', P], ['Jupiter', 'Jupiter', 'misorders-the-planets', P]),
    diagnostic: [
      q('Which are the four inner planets, in order from the Sun?', 'Quelles sont les quatre planètes intérieures, dans l’ordre depuis le Soleil ?',
        ['Mercury, Venus, Earth, Mars', 'Mercure, Vénus, Terre, Mars'], ['Venus, Mercury, Mars, Earth', 'Vénus, Mercure, Mars, Terre', 'misorders-the-planets', P], ['Mercury, Venus, Earth, Jupiter', 'Mercure, Vénus, Terre, Jupiter', 'misorders-the-planets', C]),
      q('How is the solar system related to the Milky Way?', 'Quel est le lien entre le système solaire et la Voie lactée ?',
        ['The solar system is inside the Milky Way galaxy', 'Le système solaire se trouve dans la galaxie de la Voie lactée'], ['The Milky Way is a planet', 'La Voie lactée est une planète', 'confuses-a-galaxy-with-the-solar-system', M], ['The solar system contains every galaxy', 'Le système solaire contient toutes les galaxies', 'confuses-a-galaxy-with-the-solar-system', M]),
    ],
    reassessment: [
      q('Which inner planet has a thin atmosphere and a reddish surface?', 'Quelle planète intérieure a une atmosphère mince et une surface rougeâtre ?',
        ['Mars', 'Mars'], ['Venus', 'Vénus', 'mismatches-planet-and-property', C], ['Mercury', 'Mercure', 'mismatches-planet-and-property', C]),
      q('What is the difference between an orbit and a rotation?', 'Quelle est la différence entre une orbite et une rotation ?',
        ['An orbit is the path around the Sun; rotation is spinning on an axis', 'L’orbite est le trajet autour du Soleil ; la rotation est le fait de tourner sur un axe'], ['They mean the same', 'C’est la même chose', 'confuses-orbit-and-rotation', M], ['Rotation is the path around the Sun', 'La rotation est le trajet autour du Soleil', 'confuses-orbit-and-rotation', M]),
    ],
    retention: [
      q('What do the inner planets have in common?', 'Qu’ont en commun les planètes intérieures ?',
        ['They are rocky planets', 'Ce sont des planètes rocheuses'], ['They are made of gas', 'Elles sont faites de gaz', 'mismatches-planet-and-property', C], ['They are stars', 'Ce sont des étoiles', 'confuses-a-galaxy-with-the-solar-system', C]),
      q('Which planet has abundant liquid water on its surface?', 'Quelle planète a beaucoup d’eau liquide à sa surface ?',
        ['Earth', 'La Terre'], ['Mercury', 'Mercure', 'mismatches-planet-and-property', C], ['Mars', 'Mars', 'mismatches-planet-and-property', C]),
    ],
    transfer: [
      q('A classroom model puts the planets in order but makes them all the same size. What should the label say?', 'Une maquette de classe met les planètes dans l’ordre mais leur donne la même taille. Que doit dire l’étiquette ?',
        ['Order model, not to scale', 'Modèle d’ordre, pas à l’échelle'], ['Exact sizes and distances', 'Tailles et distances exactes', 'treats-a-model-as-to-scale', M], ['This is the Milky Way', 'Ceci est la Voie lactée', 'confuses-a-galaxy-with-the-solar-system', M]),
      q('A learner says the Sun is the largest planet. What is the correction?', 'Un élève dit que le Soleil est la plus grande planète. Quelle est la correction ?',
        ['The Sun is a star, not a planet', 'Le Soleil est une étoile, pas une planète'], ['The learner is right', 'L’élève a raison', 'confuses-a-galaxy-with-the-solar-system', M], ['The Sun is a galaxy', 'Le Soleil est une galaxie', 'confuses-a-galaxy-with-the-solar-system', M]),
    ],
  },

  // B7.3.2.1.2 Mercury and Venus
  [id(57)]: {
    practice: q('Which planet is second from the Sun?', 'Quelle planète est la deuxième à partir du Soleil ?',
      ['Venus', 'Vénus'], ['Mercury', 'Mercure', 'misorders-the-planets', P], ['Earth', 'La Terre', 'misorders-the-planets', P]),
    diagnostic: [
      q('Which planet has the hotter surface, Mercury or Venus?', 'Quelle planète a la surface la plus chaude, Mercure ou Vénus ?',
        ['Venus, because of its dense atmosphere', 'Vénus, à cause de son atmosphère dense'], ['Mercury, because it is closest to the Sun', 'Mercure, parce qu’elle est la plus proche du Soleil', 'assumes-closest-planet-is-hottest-or-confuses-spin-with-orbit', M], ['They are always the same', 'Elles sont toujours pareilles', 'mismatches-planet-and-property', C]),
      q('Mercury orbits in about 88 Earth days and Venus in about 225. Which completes an orbit sooner?', 'Mercure fait une orbite en environ 88 jours terrestres et Vénus en environ 225. Laquelle termine une orbite plus vite ?',
        ['Mercury', 'Mercure'], ['Venus', 'Vénus', 'misreads-orbital-periods', P], ['Both take 24 hours', 'Les deux prennent 24 heures', 'confuses-orbit-and-rotation', M]),
    ],
    reassessment: [
      q('What is unusual about the rotation of Venus?', 'Qu’a d’inhabituel la rotation de Vénus ?',
        ['It spins very slowly, in the opposite direction to most planets', 'Elle tourne très lentement, dans le sens inverse de la plupart des planètes'], ['It orbits the Sun backwards', 'Elle fait le tour du Soleil à l’envers', 'confuses-orbit-and-rotation', M], ['It does not rotate at all', 'Elle ne tourne pas du tout', 'confuses-orbit-and-rotation', C]),
      q('Which describes Mercury?', 'Qu’est-ce qui décrit Mercure ?',
        ['Small, rocky and heavily cratered', 'Petite, rocheuse et très cratérisée'], ['Covered in liquid oceans', 'Couverte d’océans liquides', 'mismatches-planet-and-property', C], ['A gas giant', 'Une géante gazeuse', 'mismatches-planet-and-property', C]),
    ],
    retention: [
      q('What do the numbers 88 days and 225 days describe?', 'Que décrivent les nombres 88 jours et 225 jours ?',
        ['Orbital periods: one trip around the Sun', 'Les périodes orbitales : un tour du Soleil'], ['How long each planet takes to spin once', 'Le temps que met chaque planète pour tourner une fois sur elle-même', 'confuses-orbit-and-rotation', M], ['Their distances in kilometres', 'Leurs distances en kilomètres', 'misreads-orbital-periods', C]),
      q('Which planet is similar in size to Earth?', 'Quelle planète a une taille proche de celle de la Terre ?',
        ['Venus', 'Vénus'], ['Mercury', 'Mercure', 'mismatches-planet-and-property', C], ['The Moon', 'La Lune', 'mismatches-planet-and-property', C]),
    ],
    transfer: [
      q('Two runners go round a track; one is on the inside lane and finishes laps faster. Which planet is like the inside runner?', 'Deux coureurs font le tour d’une piste ; celui du couloir intérieur finit ses tours plus vite. Quelle planète ressemble au coureur intérieur ?',
        ['Mercury', 'Mercure'], ['Venus', 'Vénus', 'misreads-orbital-periods', P], ['Neither, distance does not matter', 'Aucune, la distance ne compte pas', 'misreads-orbital-periods', C]),
      q('A learner says: “Venus is farther from the Sun, so it must be colder than Mercury.” What is the correction?', 'Un élève dit : « Vénus est plus loin du Soleil, elle doit donc être plus froide que Mercure. » Quelle est la correction ?',
        ['Venus’s thick atmosphere traps heat, so it is hotter', 'L’atmosphère épaisse de Vénus retient la chaleur, elle est donc plus chaude'], ['The learner is correct', 'L’élève a raison', 'assumes-closest-planet-is-hottest-or-confuses-spin-with-orbit', M], ['Venus has no atmosphere', 'Vénus n’a pas d’atmosphère', 'mismatches-planet-and-property', C]),
    ],
  },

  // B7.3.3.1.1 Components of ecosystems
  [id(58)]: {
    practice: q('Which is a biotic component of an ecosystem?', 'Lequel est un composant biotique d’un écosystème ?',
      ['A grasshopper', 'Une sauterelle'], ['Sunlight', 'La lumière du soleil', 'confuses-biotic-and-abiotic', C], ['Rainwater', 'L’eau de pluie', 'confuses-biotic-and-abiotic', C]),
    diagnostic: [
      q('Which pair contrasts a biotic and an abiotic component correctly?', 'Quelle paire oppose correctement un composant biotique et un composant abiotique ?',
        ['A frog and the temperature of the pond', 'Une grenouille et la température de la mare'], ['A frog and a fish', 'Une grenouille et un poisson', 'confuses-biotic-and-abiotic', C], ['Water and air', 'L’eau et l’air', 'confuses-biotic-and-abiotic', C]),
      q('Is an ecosystem a sealed system that makes its own energy?', 'Un écosystème est-il un système fermé qui produit sa propre énergie ?',
        ['No, it receives energy, such as sunlight, from outside', 'Non, il reçoit de l’énergie de l’extérieur, comme la lumière du soleil'], ['Yes, it needs nothing from outside', 'Oui, il n’a besoin de rien de l’extérieur', 'treats-an-ecosystem-as-closed-or-arboreal-as-exclusive', M], ['Yes, animals create the energy', 'Oui, les animaux créent l’énergie', 'treats-an-ecosystem-as-closed-or-arboreal-as-exclusive', M]),
    ],
    reassessment: [
      q('What role do decomposers play?', 'Quel rôle jouent les décomposeurs ?',
        ['They return materials to nutrient cycles', 'Ils remettent les matières dans les cycles des nutriments'], ['They make sunlight', 'Ils produisent la lumière du soleil', 'confuses-biotic-and-abiotic', C], ['They have no role', 'Ils n’ont aucun rôle', 'misreads-ecosystem-interactions', C]),
      q('What does “arboreal” describe?', 'Que décrit le mot « arboricole » ?',
        ['Habitats associated with trees, within a wider ecosystem', 'Des habitats liés aux arbres, dans un écosystème plus large'], ['A separate ecosystem with no links to the ground', 'Un écosystème séparé sans lien avec le sol', 'treats-an-ecosystem-as-closed-or-arboreal-as-exclusive', M], ['Water habitats', 'Les habitats aquatiques', 'treats-an-ecosystem-as-closed-or-arboreal-as-exclusive', C]),
    ],
    retention: [
      q('Which is an abiotic component?', 'Lequel est un composant abiotique ?',
        ['Temperature', 'La température'], ['A mushroom', 'Un champignon', 'confuses-biotic-and-abiotic', C], ['A bird', 'Un oiseau', 'confuses-biotic-and-abiotic', C]),
      q('In the chain plant → insect → bird, what does each arrow show?', 'Dans la chaîne plante → insecte → oiseau, que montre chaque flèche ?',
        ['The direction food passes as one is eaten by the next', 'Le sens du passage de la nourriture quand l’un est mangé par le suivant'], ['Which animal is bigger', 'Quel animal est plus grand', 'misreads-ecosystem-interactions', C], ['Which one lives longer', 'Lequel vit plus longtemps', 'misreads-ecosystem-interactions', C]),
    ],
    transfer: [
      q('A pond loses its shade when trees are cut, and the water warms. What might this affect?', 'Une mare perd son ombre quand on coupe les arbres, et l’eau se réchauffe. Que peut affecter ce changement ?',
        ['The organisms living in the pond', 'Les organismes qui vivent dans la mare'], ['Nothing, abiotic changes never matter', 'Rien, les changements abiotiques ne comptent jamais', 'misreads-ecosystem-interactions', M], ['Only the colour of the water', 'Seulement la couleur de l’eau', 'misreads-ecosystem-interactions', C]),
      q('A learner sees a bird eat a caterpillar on a mango tree. How should this be recorded?', 'Un élève voit un oiseau manger une chenille sur un manguier. Comment le noter ?',
        ['An observed feeding interaction', 'Une interaction alimentaire observée'], ['Proof that every bird eats caterpillars', 'La preuve que tous les oiseaux mangent des chenilles', 'misreads-ecosystem-interactions', M], ['An abiotic interaction', 'Une interaction abiotique', 'confuses-biotic-and-abiotic', C]),
    ],
  },

  // B7.3.4.1.1 Differences among farming systems
  [id(60)]: {
    practice: q('A farm grows crops and keeps animals. Which system is this?', 'Une ferme cultive des plantes et élève des animaux. Quel système est-ce ?',
      ['Mixed farming', 'La polyculture-élevage'], ['Mixed cropping', 'Les cultures associées', 'confuses-mixed-cropping-with-mixed-farming', M], ['Land rotation', 'La rotation des terres', 'confuses-farming-systems', C]),
    diagnostic: [
      q('Maize and cowpea are grown together on the same plot in one season. Which system is this?', 'Le maïs et le niébé sont cultivés ensemble sur la même parcelle pendant une saison. Quel système est-ce ?',
        ['Mixed cropping', 'Les cultures associées'], ['Mixed farming', 'La polyculture-élevage', 'confuses-mixed-cropping-with-mixed-farming', M], ['Crop rotation', 'La rotation des cultures', 'confuses-farming-systems', C]),
      q('A farmer grows maize one season and cowpea the next on the same plot. Which system is this?', 'Un agriculteur cultive du maïs une saison et du niébé la suivante sur la même parcelle. Quel système est-ce ?',
        ['Crop rotation', 'La rotation des cultures'], ['Mixed cropping', 'Les cultures associées', 'confuses-farming-systems', C], ['Land rotation', 'La rotation des terres', 'confuses-farming-systems', C]),
    ],
    reassessment: [
      q('What is land rotation?', 'Qu’est-ce que la rotation des terres ?',
        ['Changing the cultivated plot so used land can rest (fallow)', 'Changer de parcelle cultivée pour laisser la terre utilisée se reposer (jachère)'], ['Clearing new forest every year', 'Défricher une nouvelle forêt chaque année', 'equates-land-rotation-with-clearing-forest', M], ['Growing two crops together', 'Cultiver deux plantes ensemble', 'confuses-farming-systems', C]),
      q('What makes farming organic?', 'Qu’est-ce qui rend une agriculture biologique ?',
        ['A whole management approach that builds soil and uses natural processes', 'Une gestion d’ensemble qui enrichit le sol et utilise les processus naturels'], ['Adding compost once', 'Ajouter du compost une seule fois', 'equates-organic-farming-with-one-input', M], ['Growing only one crop', 'Cultiver une seule plante', 'confuses-farming-systems', C]),
    ],
    retention: [
      q('Can a farm use more than one system at the same time?', 'Une ferme peut-elle utiliser plusieurs systèmes à la fois ?',
        ['Yes, for example rotation and mixed cropping together', 'Oui, par exemple la rotation et les cultures associées ensemble'], ['No, each farm has only one system', 'Non, chaque ferme n’a qu’un seul système', 'thinks-systems-are-mutually-exclusive', M], ['Only if it has animals', 'Seulement si elle a des animaux', 'confuses-mixed-cropping-with-mixed-farming', C]),
      q('Which evidence identifies crop rotation?', 'Quelle preuve permet d’identifier la rotation des cultures ?',
        ['A planned change of crops on the same plot over seasons', 'Un changement prévu de cultures sur la même parcelle au fil des saisons'], ['A single crop seen today', 'Une seule culture vue aujourd’hui', 'confuses-farming-systems', C], ['Animals on the farm', 'Des animaux à la ferme', 'confuses-mixed-cropping-with-mixed-farming', C]),
    ],
    transfer: [
      q('A school garden grows cassava beside groundnuts and keeps rabbits. Which systems apply?', 'Un jardin scolaire cultive du manioc à côté d’arachides et élève des lapins. Quels systèmes s’appliquent ?',
        ['Mixed cropping and mixed farming', 'Les cultures associées et la polyculture-élevage'], ['Only land rotation', 'Seulement la rotation des terres', 'confuses-farming-systems', C], ['Only organic farming', 'Seulement l’agriculture biologique', 'equates-organic-farming-with-one-input', C]),
      q('A family moves its farm to an existing rested plot and lets the old plot lie fallow. Which system is this?', 'Une famille déplace sa culture sur une parcelle déjà reposée et laisse l’ancienne en jachère. Quel système est-ce ?',
        ['Land rotation', 'La rotation des terres'], ['Crop rotation', 'La rotation des cultures', 'confuses-farming-systems', C], ['Mixed farming', 'La polyculture-élevage', 'confuses-mixed-cropping-with-mixed-farming', C]),
    ],
  },

  // B7.3.4.1.2 Categorise farming systems
  [id(61)]: {
    practice: q('What do you need before naming a farm’s system?', 'De quoi as-tu besoin avant de nommer le système d’une ferme ?',
      ['Evidence about plots, seasons, crops and animals', 'Des preuves sur les parcelles, les saisons, les cultures et les animaux'], ['Only one photo of a crop', 'Seulement une photo d’une culture', 'assigns-a-system-without-time-plot-or-enterprise-evidence', M], ['The farmer’s name', 'Le nom de l’agriculteur', 'assigns-a-system-without-time-plot-or-enterprise-evidence', C]),
    diagnostic: [
      q('You see maize on a plot today but have no history. Is crop rotation established?', 'Tu vois du maïs sur une parcelle aujourd’hui mais tu n’as pas d’historique. La rotation des cultures est-elle établie ?',
        ['No, you need evidence of the crop sequence', 'Non, il faut des preuves de la succession des cultures'], ['Yes, one sighting proves rotation', 'Oui, une observation prouve la rotation', 'assigns-a-system-without-time-plot-or-enterprise-evidence', M], ['Yes, every maize field rotates', 'Oui, tous les champs de maïs sont en rotation', 'assigns-a-system-without-time-plot-or-enterprise-evidence', M]),
      q('A record says: “cassava and pepper grown together this season”. Which category fits?', 'Une fiche dit : « manioc et piment cultivés ensemble cette saison ». Quelle catégorie convient ?',
        ['Mixed cropping', 'Les cultures associées'], ['Mixed farming', 'La polyculture-élevage', 'confuses-mixed-cropping-with-mixed-farming', M], ['Land rotation', 'La rotation des terres', 'confuses-farming-systems', C]),
    ],
    reassessment: [
      q('A farm keeps goats and grows yam. Which category fits?', 'Une ferme élève des chèvres et cultive de l’igname. Quelle catégorie convient ?',
        ['Mixed farming', 'La polyculture-élevage'], ['Mixed cropping', 'Les cultures associées', 'confuses-mixed-cropping-with-mixed-farming', M], ['Crop rotation', 'La rotation des cultures', 'assigns-a-system-without-time-plot-or-enterprise-evidence', C]),
      q('A record is missing information about seasons. What should you write?', 'Une fiche ne donne pas d’information sur les saisons. Que dois-tu écrire ?',
        ['“Unknown” for that evidence', '« Inconnu » pour cette information'], ['A guessed history', 'Un historique deviné', 'assigns-a-system-without-time-plot-or-enterprise-evidence', M], ['That the farm is certified organic', 'Que la ferme est certifiée biologique', 'equates-organic-farming-with-one-input', M]),
    ],
    retention: [
      q('Can more than one category apply to one farm?', 'Plusieurs catégories peuvent-elles s’appliquer à une seule ferme ?',
        ['Yes, if the evidence supports each one', 'Oui, si les preuves justifient chacune'], ['No, only one is ever allowed', 'Non, une seule est toujours permise', 'thinks-systems-are-mutually-exclusive', M], ['Only for large farms', 'Seulement pour les grandes fermes', 'thinks-systems-are-mutually-exclusive', C]),
      q('Does a bag of compost on a farm prove it is an organic farm?', 'Un sac de compost dans une ferme prouve-t-il que c’est une ferme biologique ?',
        ['No, organic farming is a whole management approach', 'Non, l’agriculture biologique est une gestion d’ensemble'], ['Yes, compost proves it', 'Oui, le compost le prouve', 'equates-organic-farming-with-one-input', M], ['Yes, if the bag is large', 'Oui, si le sac est grand', 'equates-organic-farming-with-one-input', M]),
    ],
    transfer: [
      q('A record shows: “Plot A: yam in 2024, groundnut in 2025, maize in 2026.” Which category is supported?', 'Une fiche indique : « Parcelle A : igname en 2024, arachide en 2025, maïs en 2026. » Quelle catégorie est justifiée ?',
        ['Crop rotation', 'La rotation des cultures'], ['Mixed cropping', 'Les cultures associées', 'confuses-farming-systems', C], ['Mixed farming', 'La polyculture-élevage', 'confuses-mixed-cropping-with-mixed-farming', C]),
      q('A farmer moved to a rested plot three years ago and also keeps sheep. Which categories fit?', 'Un agriculteur s’est installé sur une parcelle reposée il y a trois ans et élève aussi des moutons. Quelles catégories conviennent ?',
        ['Land rotation and mixed farming', 'La rotation des terres et la polyculture-élevage'], ['Only crop rotation', 'Seulement la rotation des cultures', 'confuses-farming-systems', C], ['Only mixed cropping', 'Seulement les cultures associées', 'confuses-mixed-cropping-with-mixed-farming', M]),
    ],
  },

  // B7.3.4.1.3 Usefulness of farming systems
  [id(62)]: {
    practice: q('Which statement about farming systems is justified?', 'Quelle affirmation sur les systèmes agricoles est justifiée ?',
      ['Each system has benefits and limits that depend on conditions', 'Chaque système a des avantages et des limites qui dépendent des conditions'], ['One system is best everywhere', 'Un seul système est le meilleur partout', 'claims-one-system-is-always-best-without-context', M], ['Every benefit guarantees profit', 'Chaque avantage garantit un profit', 'treats-benefits-as-guarantees', M]),
    diagnostic: [
      q('Why can land rotation be hard where land is scarce?', 'Pourquoi la rotation des terres peut-elle être difficile quand la terre manque ?',
        ['It needs enough suitable land to let some rest', 'Elle exige assez de terre adaptée pour en laisser reposer une partie'], ['It needs no land at all', 'Elle n’a besoin d’aucune terre', 'ignores-system-limitations', C], ['It always increases land', 'Elle augmente toujours la surface de terre', 'treats-benefits-as-guarantees', M]),
      q('What is a possible benefit of crop rotation?', 'Quel est un avantage possible de la rotation des cultures ?',
        ['It can help manage soil and crop-specific pests', 'Elle peut aider à gérer le sol et les ravageurs propres à une culture'], ['It removes all pests forever', 'Elle élimine tous les ravageurs pour toujours', 'treats-benefits-as-guarantees', M], ['It needs no planning', 'Elle ne demande aucune planification', 'ignores-system-limitations', C]),
    ],
    reassessment: [
      q('What is a limitation of mixed farming?', 'Quelle est une limite de la polyculture-élevage ?',
        ['Animals add care, labour and health demands', 'Les animaux demandent des soins, du travail et un suivi sanitaire'], ['It has no limitations', 'Elle n’a aucune limite', 'ignores-system-limitations', M], ['It cannot produce any crops', 'Elle ne peut produire aucune culture', 'ignores-system-limitations', C]),
      q('Does organic management guarantee higher yields?', 'La gestion biologique garantit-elle de meilleurs rendements ?',
        ['No, results depend on planning, labour and context', 'Non, les résultats dépendent de la planification, du travail et du contexte'], ['Yes, always', 'Oui, toujours', 'treats-benefits-as-guarantees', M], ['Yes, if compost is used once', 'Oui, si on utilise du compost une fois', 'treats-benefits-as-guarantees', M]),
    ],
    retention: [
      q('What should you compare when choosing a farming system?', 'Que faut-il comparer pour choisir un système agricole ?',
        ['Benefits, constraints and evidence for the goals', 'Les avantages, les contraintes et les preuves selon les objectifs'], ['Only which system is most popular', 'Seulement le système le plus populaire', 'claims-one-system-is-always-best-without-context', M], ['Only the colour of the crops', 'Seulement la couleur des cultures', 'claims-one-system-is-always-best-without-context', C]),
      q('What can be a risk of mixed cropping with poorly chosen crops?', 'Quel peut être un risque des cultures associées mal choisies ?',
        ['The crops may compete for resources', 'Les cultures peuvent se concurrencer pour les ressources'], ['There is never any risk', 'Il n’y a jamais de risque', 'ignores-system-limitations', M], ['The crops turn into animals', 'Les cultures se transforment en animaux', 'ignores-system-limitations', C]),
    ],
    transfer: [
      q('A school has a very small garden and few adults to help. Which choice is reasonable?', 'Une école a un tout petit jardin et peu d’adultes pour aider. Quel choix est raisonnable ?',
        ['A planned crop sequence on the plot, since land rotation needs spare land', 'Une succession de cultures prévue sur la parcelle, car la rotation des terres demande de la terre en plus'], ['Land rotation by clearing a nearby forest', 'La rotation des terres en défrichant une forêt proche', 'equates-land-rotation-with-clearing-forest', M], ['Keeping cattle, since animals have no demands', 'Élever des bovins, car les animaux ne demandent rien', 'ignores-system-limitations', M]),
      q('In a debate, a classmate says: “Mixed cropping is always best.” What is the strongest reply?', 'Lors d’un débat, un camarade dit : « Les cultures associées sont toujours les meilleures. » Quelle est la meilleure réponse ?',
        ['It depends on the crops, land, labour and goals', 'Cela dépend des cultures, de la terre, du travail et des objectifs'], ['Yes, it is best everywhere', 'Oui, c’est le meilleur partout', 'claims-one-system-is-always-best-without-context', M], ['No system has any benefit', 'Aucun système n’a d’avantage', 'ignores-system-limitations', C]),
    ],
  },

  // B7.4.1.1.1 Forms of energy and how they are related
  [id(63)]: {
    practice: q('Which energy is associated with motion?', 'Quelle énergie est liée au mouvement ?',
      ['Kinetic energy', 'L’énergie cinétique'], ['Gravitational potential energy', 'L’énergie potentielle de pesanteur', 'confuses-potential-and-kinetic-energy', C], ['Sound energy only', 'Seulement l’énergie sonore', 'confuses-potential-and-kinetic-energy', C]),
    diagnostic: [
      q('A toy rolls down a ramp. What happens to its energy as it goes down?', 'Un jouet descend une pente. Que devient son énergie pendant la descente ?',
        ['Potential energy decreases and kinetic energy increases', 'L’énergie potentielle diminue et l’énergie cinétique augmente'], ['New energy is created as it moves', 'Une nouvelle énergie est créée pendant le mouvement', 'confuses-energy-transfer-with-energy-creation', M], ['Kinetic energy turns into height', 'L’énergie cinétique se transforme en hauteur', 'confuses-potential-and-kinetic-energy', C]),
      q('In this lesson, what is mechanical energy?', 'Dans cette leçon, qu’est-ce que l’énergie mécanique ?',
        ['Potential energy plus kinetic energy', 'L’énergie potentielle plus l’énergie cinétique'], ['Only heat', 'Seulement la chaleur', 'confuses-potential-and-kinetic-energy', C], ['Energy created by motion', 'De l’énergie créée par le mouvement', 'confuses-energy-transfer-with-energy-creation', M]),
    ],
    reassessment: [
      q('Why can mechanical energy decrease as an object slides down a rough slope?', 'Pourquoi l’énergie mécanique peut-elle diminuer quand un objet glisse sur une pente rugueuse ?',
        ['Friction transfers some energy to heat and sound', 'Le frottement transfère une partie de l’énergie en chaleur et en son'], ['Energy is destroyed', 'L’énergie est détruite', 'confuses-energy-transfer-with-energy-creation', M], ['The object loses its mass', 'L’objet perd sa masse', 'confuses-potential-and-kinetic-energy', C]),
      q('Which of these is a form of energy named in the curriculum?', 'Laquelle de ces formes d’énergie est nommée dans le programme ?',
        ['Chemical energy', 'L’énergie chimique'], ['Colour energy', 'L’énergie de couleur', 'confuses-potential-and-kinetic-energy', C], ['Weight energy', 'L’énergie de poids', 'confuses-potential-and-kinetic-energy', C]),
    ],
    retention: [
      q('What does gravitational potential energy depend on?', 'De quoi dépend l’énergie potentielle de pesanteur ?',
        ['Height above a chosen level', 'De la hauteur au-dessus d’un niveau choisi'], ['Only speed', 'Seulement de la vitesse', 'confuses-potential-and-kinetic-energy', C], ['Only colour', 'Seulement de la couleur', 'confuses-potential-and-kinetic-energy', C]),
      q('Is energy created when an object starts moving?', 'De l’énergie est-elle créée quand un objet commence à bouger ?',
        ['No, energy is transferred from one store to another', 'Non, l’énergie est transférée d’un réservoir à un autre'], ['Yes, motion creates energy', 'Oui, le mouvement crée de l’énergie', 'confuses-energy-transfer-with-energy-creation', M], ['Yes, and it is destroyed when it stops', 'Oui, et elle est détruite à l’arrêt', 'confuses-energy-transfer-with-energy-creation', M]),
    ],
    transfer: [
      q('A child on a swing is highest at the end of each swing. Where is her kinetic energy greatest?', 'Une enfant sur une balançoire est au plus haut à chaque extrémité. Où son énergie cinétique est-elle la plus grande ?',
        ['At the lowest point of the swing', 'Au point le plus bas'], ['At the highest point', 'Au point le plus haut', 'confuses-potential-and-kinetic-energy', C], ['It is the same everywhere', 'Elle est la même partout', 'confuses-potential-and-kinetic-energy', C]),
      q('A torch is switched on. Which energy change happens?', 'On allume une lampe torche. Quelle transformation d’énergie se produit ?',
        ['Chemical (battery) to electrical to light and heat', 'De chimique (pile) à électrique, puis lumière et chaleur'], ['Light into chemical energy', 'De la lumière en énergie chimique', 'confuses-potential-and-kinetic-energy', C], ['Energy is created from nothing', 'De l’énergie est créée à partir de rien', 'confuses-energy-transfer-with-energy-creation', M]),
    ],
  },

  // B7.4.1.1.2 Daily applications of energy; PE and KE
  [id(64)]: {
    practice: q('A fan is switched on. What does it mainly transfer electrical energy into?', 'On allume un ventilateur. En quoi transforme-t-il surtout l’énergie électrique ?',
      ['Kinetic energy (motion)', 'En énergie cinétique (mouvement)'], ['Light only', 'Seulement en lumière', 'mismatches-appliance-and-transfer', C], ['Chemical energy', 'En énergie chimique', 'mismatches-appliance-and-transfer', C]),
    diagnostic: [
      q('A 4 kg object moves at 2 m/s. What is its kinetic energy?', 'Un objet de 4 kg se déplace à 2 m/s. Quelle est son énergie cinétique ?',
        ['8 J', '8 J'], ['4 J', '4 J', 'forgets-the-speed-square-in-kinetic-energy', P], ['16 J', '16 J', 'forgets-the-half-in-kinetic-energy', P]),
      q('A 3 kg object is 5 m above the ground. Take g = 10 m/s². What is its potential energy?', 'Un objet de 3 kg est à 5 m du sol. Prends g = 10 m/s². Quelle est son énergie potentielle ?',
        ['150 J', '150 J'], ['15 J', '15 J', 'forgets-g-in-potential-energy', P], ['30 J', '30 J', 'forgets-g-in-potential-energy', P]),
    ],
    reassessment: [
      q('At fixed mass, what happens to kinetic energy when the speed is doubled?', 'À masse fixe, que devient l’énergie cinétique quand la vitesse double ?',
        ['It becomes four times as large', 'Elle est multipliée par quatre'], ['It doubles', 'Elle double', 'forgets-the-speed-square-in-kinetic-energy', M], ['It stays the same', 'Elle reste la même', 'forgets-the-speed-square-in-kinetic-energy', C]),
      q('A 2 kg object moves at 4 m/s. What is its kinetic energy?', 'Un objet de 2 kg se déplace à 4 m/s. Quelle est son énergie cinétique ?',
        ['16 J', '16 J'], ['4 J', '4 J', 'forgets-the-speed-square-in-kinetic-energy', P], ['32 J', '32 J', 'forgets-the-half-in-kinetic-energy', P]),
    ],
    retention: [
      q('Which formula gives gravitational potential energy?', 'Quelle formule donne l’énergie potentielle de pesanteur ?',
        ['PE = mgh', 'EP = mgh'], ['PE = ½mv²', 'EP = ½mv²', 'confuses-pe-and-ke-formulas', C], ['PE = m + g + h', 'EP = m + g + h', 'forgets-g-in-potential-energy', P]),
      q('In which unit is energy measured?', 'Dans quelle unité mesure-t-on l’énergie ?',
        ['Joules (J)', 'En joules (J)'], ['Metres (m)', 'En mètres (m)', 'confuses-pe-and-ke-formulas', C], ['Kilograms (kg)', 'En kilogrammes (kg)', 'confuses-pe-and-ke-formulas', C]),
    ],
    transfer: [
      q('A 1 kg mango hangs 4 m above the ground. Take g = 10 m/s². What is its potential energy relative to the ground?', 'Une mangue de 1 kg pend à 4 m du sol. Prends g = 10 m/s². Quelle est son énergie potentielle par rapport au sol ?',
        ['40 J', '40 J'], ['4 J', '4 J', 'forgets-g-in-potential-energy', P], ['14 J', '14 J', 'forgets-g-in-potential-energy', P]),
      q('A 50 kg cyclist rides at 2 m/s, then at 4 m/s. How does her kinetic energy change?', 'Une cycliste de 50 kg roule à 2 m/s, puis à 4 m/s. Comment change son énergie cinétique ?',
        ['From 100 J to 400 J', 'De 100 J à 400 J'], ['From 100 J to 200 J', 'De 100 J à 200 J', 'forgets-the-speed-square-in-kinetic-energy', M], ['From 200 J to 800 J', 'De 200 J à 800 J', 'forgets-the-half-in-kinetic-energy', P]),
    ],
  },

  // B7.4.1.2.1 Heat transfer in various media
  [id(65)]: {
    scope: 'understanding_only',
    practice: q('Which way does heat flow?', 'Dans quel sens circule la chaleur ?',
      ['From hotter to cooler places', 'Des endroits chauds vers les endroits plus froids'], ['From cooler to hotter places', 'Des endroits froids vers les endroits plus chauds', 'reverses-heat-flow-direction', M], ['It does not flow', 'Elle ne circule pas', 'reverses-heat-flow-direction', C]),
    diagnostic: [
      q('Which process involves the bulk movement of a liquid or gas?', 'Quel processus implique le déplacement d’ensemble d’un liquide ou d’un gaz ?',
        ['Convection', 'La convection'], ['Conduction', 'La conduction', 'confuses-conduction-convection-and-radiation', C], ['Radiation', 'Le rayonnement', 'confuses-conduction-convection-and-radiation', C]),
      q('A metal spoon and a plastic spoon sit in the same hot soup. Which handle gets hot faster?', 'Une cuillère en métal et une en plastique sont dans la même soupe chaude. Quel manche chauffe le plus vite ?',
        ['The metal one, because metals conduct heat well', 'Celui en métal, car les métaux conduisent bien la chaleur'], ['Both at exactly the same rate', 'Les deux exactement au même rythme', 'assumes-all-materials-transfer-heat-at-the-same-rate', M], ['The plastic one', 'Celui en plastique', 'assumes-all-materials-transfer-heat-at-the-same-rate', M]),
    ],
    reassessment: [
      q('Which heat transfer can cross empty space?', 'Quel transfert de chaleur peut traverser le vide ?',
        ['Radiation', 'Le rayonnement'], ['Conduction', 'La conduction', 'confuses-conduction-convection-and-radiation', C], ['Convection', 'La convection', 'confuses-conduction-convection-and-radiation', C]),
      q('To compare how two materials conduct heat fairly, what must you keep the same?', 'Pour comparer équitablement la conduction de deux matériaux, que faut-il garder identique ?',
        ['The starting temperature, amount and time', 'La température de départ, la quantité et la durée'], ['Nothing, any setup is fair', 'Rien, tout montage est équitable', 'designs-an-unfair-comparison', M], ['Only the colour of the materials', 'Seulement la couleur des matériaux', 'designs-an-unfair-comparison', C]),
    ],
    retention: [
      q('How does heat travel through a solid metal rod?', 'Comment la chaleur se propage-t-elle dans une barre de métal solide ?',
        ['By conduction', 'Par conduction'], ['By convection', 'Par convection', 'confuses-conduction-convection-and-radiation', C], ['It cannot travel through solids', 'Elle ne peut pas traverser les solides', 'confuses-conduction-convection-and-radiation', M]),
      q('Can more than one heat-transfer process happen in one setup?', 'Plusieurs processus de transfert de chaleur peuvent-ils avoir lieu dans un même montage ?',
        ['Yes, for example conduction and convection together', 'Oui, par exemple la conduction et la convection ensemble'], ['No, only one at a time', 'Non, un seul à la fois', 'confuses-conduction-convection-and-radiation', M], ['Only in space', 'Seulement dans l’espace', 'confuses-conduction-convection-and-radiation', C]),
    ],
    transfer: [
      q('Warm air rises above a coal pot and cooler air moves in. Which process is this?', 'L’air chaud monte au-dessus d’un réchaud à charbon et l’air plus frais le remplace. Quel processus est-ce ?',
        ['Convection', 'La convection'], ['Conduction', 'La conduction', 'confuses-conduction-convection-and-radiation', C], ['Radiation only', 'Seulement le rayonnement', 'confuses-conduction-convection-and-radiation', C]),
      q('You feel the warmth of the Sun on your face. How does this energy reach you?', 'Tu sens la chaleur du Soleil sur ton visage. Comment cette énergie t’arrive-t-elle ?',
        ['By radiation', 'Par rayonnement'], ['By conduction through the air only', 'Seulement par conduction à travers l’air', 'confuses-conduction-convection-and-radiation', C], ['From cold to hot', 'Du froid vers le chaud', 'reverses-heat-flow-direction', M]),
    ],
  },

  // B7.4.1.3.1 Light travels in a straight line
  [id(66)]: {
    scope: 'understanding_only',
    practice: q('Three cards with holes are lined up and a torch shines through. What happens if one card is moved?', 'Trois cartes trouées sont alignées et une lampe éclaire à travers. Que se passe-t-il si on déplace une carte ?',
      ['The light is blocked, because light travels in straight lines', 'La lumière est bloquée, car elle se propage en ligne droite'], ['The light bends around the card', 'La lumière contourne la carte', 'thinks-light-bends-freely', M], ['The light gets brighter', 'La lumière devient plus forte', 'thinks-light-bends-freely', C]),
    diagnostic: [
      q('Which effect separates white light into a spectrum of colours?', 'Quel phénomène sépare la lumière blanche en un spectre de couleurs ?',
        ['Dispersion', 'La dispersion'], ['Reflection', 'La réflexion', 'confuses-reflection-refraction-and-dispersion', C], ['Straight-line travel', 'La propagation rectiligne', 'confuses-reflection-refraction-and-dispersion', C]),
      q('Light bounces off a mirror. What is this called?', 'La lumière rebondit sur un miroir. Comment cela s’appelle-t-il ?',
        ['Reflection', 'La réflexion'], ['Refraction', 'La réfraction', 'confuses-reflection-refraction-and-dispersion', C], ['Dispersion', 'La dispersion', 'confuses-reflection-refraction-and-dispersion', C]),
    ],
    reassessment: [
      q('A pencil in a glass of water looks bent. What is happening?', 'Un crayon dans un verre d’eau semble tordu. Que se passe-t-il ?',
        ['Refraction changes the light’s direction at the water surface', 'La réfraction change la direction de la lumière à la surface de l’eau'], ['The pencil has really bent', 'Le crayon s’est vraiment tordu', 'thinks-apparent-bending-is-real', M], ['The light is reflected by the pencil only', 'La lumière est seulement réfléchie par le crayon', 'confuses-reflection-refraction-and-dispersion', C]),
      q('Which is a safe light source for classroom experiments?', 'Quelle source de lumière est sûre pour les expériences en classe ?',
        ['A low-power torch approved by the teacher', 'Une lampe de faible puissance approuvée par l’enseignant'], ['A laser pointed at eyes', 'Un laser dirigé vers les yeux', 'unsafe-investigation-method', M], ['Looking directly at the Sun', 'Regarder directement le Soleil', 'unsafe-investigation-method', M]),
    ],
    retention: [
      q('Why do objects form shadows?', 'Pourquoi les objets forment-ils des ombres ?',
        ['Light travels in straight lines and is blocked', 'La lumière se propage en ligne droite et est bloquée'], ['Light bends around every object', 'La lumière contourne tous les objets', 'thinks-light-bends-freely', M], ['Objects give out darkness', 'Les objets émettent de l’obscurité', 'thinks-light-bends-freely', M]),
      q('Light passes at an angle from air into water and changes direction. What is this?', 'La lumière passe en biais de l’air à l’eau et change de direction. Qu’est-ce que c’est ?',
        ['Refraction', 'La réfraction'], ['Reflection', 'La réflexion', 'confuses-reflection-refraction-and-dispersion', C], ['Dispersion', 'La dispersion', 'confuses-reflection-refraction-and-dispersion', C]),
    ],
    transfer: [
      q('After rain, a rainbow appears when the Sun is behind you. Which effect is mainly involved?', 'Après la pluie, un arc-en-ciel apparaît quand le Soleil est derrière toi. Quel phénomène intervient surtout ?',
        ['Dispersion of sunlight by water droplets', 'La dispersion de la lumière du soleil par les gouttes'], ['Light bending around the clouds', 'La lumière qui contourne les nuages', 'thinks-light-bends-freely', M], ['Simple reflection by a mirror', 'Une simple réflexion sur un miroir', 'confuses-reflection-refraction-and-dispersion', C]),
      q('A driver sees cars behind her in the side mirror. Which effect makes this possible?', 'Une conductrice voit les voitures derrière elle dans le rétroviseur. Quel phénomène le permet ?',
        ['Reflection', 'La réflexion'], ['Dispersion', 'La dispersion', 'confuses-reflection-refraction-and-dispersion', C], ['Refraction in water', 'La réfraction dans l’eau', 'confuses-reflection-refraction-and-dispersion', C]),
    ],
  },

  // B7.4.2.1.1 Forms of electricity generation
  [id(67)]: {
    practice: q('In a power station, which machine converts mechanical energy into electrical energy?', 'Dans une centrale, quelle machine transforme l’énergie mécanique en énergie électrique ?',
      ['The generator', 'L’alternateur (générateur)'], ['The cooling tower', 'La tour de refroidissement', 'misplaces-generation-stage', C], ['The fuel store', 'Le stock de combustible', 'misplaces-generation-stage', C]),
    diagnostic: [
      q('Where does a nuclear power plant get its heat?', 'D’où une centrale nucléaire tire-t-elle sa chaleur ?',
        ['From controlled nuclear fission', 'De la fission nucléaire contrôlée'], ['From burning coal', 'De la combustion du charbon', 'assumes-the-turbine-creates-energy-or-nuclear-is-not-heat-based', M], ['It needs no heat', 'Elle n’a pas besoin de chaleur', 'assumes-the-turbine-creates-energy-or-nuclear-is-not-heat-based', M]),
      q('Does a generator create energy from nothing?', 'Un alternateur crée-t-il de l’énergie à partir de rien ?',
        ['No, it converts mechanical energy into electrical energy', 'Non, il transforme l’énergie mécanique en énergie électrique'], ['Yes, generators make new energy', 'Oui, les alternateurs créent de l’énergie', 'assumes-the-turbine-creates-energy-or-nuclear-is-not-heat-based', M], ['Yes, but only at night', 'Oui, mais seulement la nuit', 'assumes-the-turbine-creates-energy-or-nuclear-is-not-heat-based', M]),
    ],
    reassessment: [
      q('In a steam-cycle power station, what turns the turbine?', 'Dans une centrale à vapeur, qu’est-ce qui fait tourner la turbine ?',
        ['Steam made by heating water', 'La vapeur produite en chauffant de l’eau'], ['The electricity it produces', 'L’électricité qu’elle produit', 'misplaces-generation-stage', P], ['Cold water alone', 'L’eau froide seule', 'misplaces-generation-stage', C]),
      q('What is the main difference between fossil-fuel and nuclear generation in this lesson?', 'Quelle est la principale différence entre la production à combustible fossile et nucléaire dans cette leçon ?',
        ['Their heat source: burning fuel versus nuclear fission', 'Leur source de chaleur : combustion ou fission nucléaire'], ['Only one uses energy', 'Une seule utilise de l’énergie', 'assumes-the-turbine-creates-energy-or-nuclear-is-not-heat-based', M], ['Nuclear plants do not use turbines', 'Les centrales nucléaires n’utilisent pas de turbines', 'assumes-the-turbine-creates-energy-or-nuclear-is-not-heat-based', C]),
    ],
    retention: [
      q('Which order shows a fossil-fuel power station?', 'Quel ordre montre une centrale à combustible fossile ?',
        ['Fuel burns → heat → steam turns turbine → generator → electricity', 'Le combustible brûle → chaleur → la vapeur fait tourner la turbine → alternateur → électricité'], ['Generator → fuel → steam → electricity', 'Alternateur → combustible → vapeur → électricité', 'misplaces-generation-stage', P], ['Electricity → steam → fuel', 'Électricité → vapeur → combustible', 'misplaces-generation-stage', P]),
      q('Why do power stations need cooling?', 'Pourquoi les centrales ont-elles besoin de refroidissement ?',
        ['To remove unused heat', 'Pour évacuer la chaleur non utilisée'], ['To create electricity', 'Pour créer l’électricité', 'misplaces-generation-stage', C], ['Cooling is never needed', 'Le refroidissement n’est jamais nécessaire', 'misplaces-generation-stage', C]),
    ],
    transfer: [
      q('A hydroelectric dam uses falling water to spin turbines. What does the generator do?', 'Un barrage hydroélectrique utilise l’eau qui tombe pour faire tourner des turbines. Que fait l’alternateur ?',
        ['Converts the turbine’s motion into electricity', 'Il transforme le mouvement de la turbine en électricité'], ['Creates water', 'Il crée de l’eau', 'assumes-the-turbine-creates-energy-or-nuclear-is-not-heat-based', M], ['Burns the water as fuel', 'Il brûle l’eau comme combustible', 'misplaces-generation-stage', C]),
      q('A diesel generator powers a clinic at night. Which energy change takes place?', 'Un groupe électrogène diesel alimente un centre de santé la nuit. Quelle transformation d’énergie a lieu ?',
        ['Chemical energy in fuel → motion → electrical energy', 'Énergie chimique du carburant → mouvement → énergie électrique'], ['Electrical energy → diesel fuel', 'Énergie électrique → carburant diesel', 'misplaces-generation-stage', P], ['Energy is made from nothing', 'De l’énergie est créée à partir de rien', 'assumes-the-turbine-creates-energy-or-nuclear-is-not-heat-based', M]),
    ],
  },

  // B7.4.2.1.2 Environmental impact of electricity generation
  [id(67, 2)]: {
    practice: q('Which is an environmental impact of burning fossil fuels for electricity?', 'Quel est un impact environnemental de la combustion de combustibles fossiles pour l’électricité ?',
      ['Carbon dioxide and air pollutant emissions', 'Des émissions de dioxyde de carbone et de polluants de l’air'], ['No impact at all', 'Aucun impact', 'treats-either-generation-method-as-impact-free', M], ['It cleans the air', 'Elle nettoie l’air', 'treats-either-generation-method-as-impact-free', M]),
    diagnostic: [
      q('Does nuclear generation have any environmental impacts?', 'La production nucléaire a-t-elle des impacts environnementaux ?',
        ['Yes, such as radioactive waste and cooling demands', 'Oui, comme les déchets radioactifs et les besoins de refroidissement'], ['No, it has no impacts', 'Non, elle n’a aucun impact', 'treats-either-generation-method-as-impact-free', M], ['Only that it produces smoke from coal', 'Seulement de la fumée de charbon', 'confuses-impacts-of-generation-types', C]),
      q('How can warm water discharged from a power station affect a river?', 'Comment l’eau chaude rejetée par une centrale peut-elle affecter une rivière ?',
        ['It can harm aquatic organisms', 'Elle peut nuire aux organismes aquatiques'], ['It has no effect on rivers', 'Elle n’a aucun effet sur les rivières', 'treats-either-generation-method-as-impact-free', M], ['It makes the water drinkable', 'Elle rend l’eau potable', 'treats-either-generation-method-as-impact-free', M]),
    ],
    reassessment: [
      q('What does an emission control on a fossil-fuel plant do?', 'Que fait un dispositif de contrôle des émissions dans une centrale fossile ?',
        ['Reduces particular pollutants, but not every risk', 'Il réduit certains polluants, mais pas tous les risques'], ['Removes every environmental effect', 'Il supprime tout effet sur l’environnement', 'treats-controls-as-removing-all-risk', M], ['Creates more electricity from nothing', 'Il crée plus d’électricité à partir de rien', 'treats-controls-as-removing-all-risk', C]),
      q('Nuclear plants have low direct CO₂ emissions during operation. Does this make them impact-free?', 'Les centrales nucléaires émettent peu de CO₂ en fonctionnement. Sont-elles pour autant sans impact ?',
        ['No, construction, fuel and waste still have impacts', 'Non, la construction, le combustible et les déchets ont encore des impacts'], ['Yes, low CO₂ means no impacts', 'Oui, peu de CO₂ veut dire aucun impact', 'treats-either-generation-method-as-impact-free', M], ['Yes, waste disappears on its own', 'Oui, les déchets disparaissent tout seuls', 'treats-either-generation-method-as-impact-free', M]),
    ],
    retention: [
      q('Which gas from burning fossil fuels contributes to climate change?', 'Quel gaz issu de la combustion des combustibles fossiles contribue au changement climatique ?',
        ['Carbon dioxide', 'Le dioxyde de carbone'], ['Oxygen', 'L’oxygène', 'confuses-impacts-of-generation-types', C], ['Water vapour only from rain', 'Seulement la vapeur d’eau de la pluie', 'confuses-impacts-of-generation-types', C]),
      q('How must radioactive waste be handled?', 'Comment les déchets radioactifs doivent-ils être gérés ?',
        ['Under strict, controlled management', 'Avec une gestion stricte et contrôlée'], ['Thrown away with household rubbish', 'Jetés avec les ordures ménagères', 'treats-either-generation-method-as-impact-free', M], ['Left in rivers', 'Laissés dans les rivières', 'treats-either-generation-method-as-impact-free', M]),
    ],
    transfer: [
      q('A town plans a new coal power plant. Which concern is most directly linked to its operation?', 'Une ville prévoit une nouvelle centrale à charbon. Quelle préoccupation est la plus directement liée à son fonctionnement ?',
        ['Air pollution and CO₂ emissions', 'La pollution de l’air et les émissions de CO₂'], ['Radioactive waste', 'Les déchets radioactifs', 'confuses-impacts-of-generation-types', C], ['None, coal is impact-free', 'Aucune, le charbon est sans impact', 'treats-either-generation-method-as-impact-free', M]),
      q('In a class debate, which argument is the most balanced?', 'Lors d’un débat en classe, quel argument est le plus équilibré ?',
        ['Compare air, water, waste and lifecycle effects of both methods', 'Comparer les effets sur l’air, l’eau, les déchets et le cycle de vie des deux méthodes'], ['One method has no impacts of any kind', 'Une méthode n’a aucun impact', 'treats-either-generation-method-as-impact-free', M], ['One emission figure explains everything', 'Un seul chiffre d’émission explique tout', 'treats-controls-as-removing-all-risk', C]),
    ],
  },
};
