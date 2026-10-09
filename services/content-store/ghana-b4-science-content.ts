import type { InstructionalStrategy } from "../../packages/domain";
import type { LearningContent } from "../../packages/content";
import {
  GHANA_B4_SCIENCE_ADAPTIVE_SPECS,
} from "../../packages/curriculum/ghana-b4-science-adaptive";

type Evidence = {
  diagnostic: [string, string, string[]];
  reassessment: [string, string, string[]];
  retention: [string, string, string[]];
  transfer: [string, string, string[]];
  lesson: string;
  practice: string;
  scaffold: string;
  remediation: string;
};

const SOURCE =
  "NaCCA Science Curriculum for Primary Schools, Basic 4-6, 2019";

const now = new Date().toISOString();

const evidence: Record<string, Evidence> = {
  "B4.1.1.1.2": {
    diagnostic: [
      "Which set contains three life processes of animals?",
      "Movement, nutrition and reproduction",
      [
        "Movement, nutrition and reproduction",
        "Colour, size and habitat",
        "Sleeping, hiding and colour",
        "Shape, covering and height",
      ],
    ],
    reassessment: [
      "A bird eats grain, flies to another tree and later produces young. Which life processes are shown?",
      "Nutrition, movement and reproduction",
      [
        "Nutrition, movement and reproduction",
        "Only movement",
        "Only reproduction",
        "Growth and classification only",
      ],
    ],
    retention: [
      "Which animal activity is an example of nutrition?",
      "A goat eating grass",
      [
        "A goat eating grass",
        "A lizard running",
        "A bird laying eggs",
        "A butterfly flying",
      ],
    ],
    transfer: [
      "You observe a chick walking toward food, eating it and later growing into an adult that produces young. What idea connects these observations?",
      "Animals carry out life processes including movement, nutrition and reproduction",
      [
        "Animals carry out life processes including movement, nutrition and reproduction",
        "All animals move in exactly the same way",
        "Only birds need nutrition",
        "Reproduction is a form of movement",
      ],
    ],
    lesson:
      "Animals stay alive and continue their kind through life processes. Movement changes position, nutrition provides food and energy, and reproduction produces new animals.",
    practice:
      "For a familiar mammal, bird, reptile or insect, identify one example each of movement, nutrition and reproduction.",
    scaffold:
      "Ask three questions about the animal: How does it move? How does it obtain food? How does it produce young?",
    remediation:
      "Do not confuse physical features with life processes. Size, colour and body covering describe an animal; movement, nutrition and reproduction describe processes it performs.",
  },

  "B4.1.1.2.2": {
    diagnostic: [
      "Which description best fits a climbing plant?",
      "It grows upward by using another support",
      [
        "It grows upward by using another support",
        "It is always a very large woody plant",
        "It spreads only under the soil",
        "It has no stem",
      ],
    ],
    reassessment: [
      "A plant has a weak stem and grows upward around a support. How should it be described?",
      "Climbing plant",
      ["Climbing plant", "Tree", "Creeping plant", "Shrub"],
    ],
    retention: [
      "Which feature most helps distinguish a tree from a small shrub?",
      "Its overall structure and size",
      [
        "Its overall structure and size",
        "Whether insects visit it",
        "The colour of the soil",
        "Whether it grows near a house",
      ],
    ],
    transfer: [
      "A farmer finds a plant spreading along the ground rather than standing upright. Which plant form best describes it?",
      "Creeping plant",
      ["Creeping plant", "Tree", "Shrub", "Climbing plant"],
    ],
    lesson:
      "Plants can be described by observable structure and size. Trees, shrubs, climbing plants and creeping plants have different growth forms.",
    practice:
      "Compare two plants around you and describe how their size, stem and growth form differ.",
    scaffold:
      "First observe size, then the stem, then whether the plant stands upright, climbs a support or spreads along the ground.",
    remediation:
      "Classify the plant from its observable structure, not simply from where it grows or what it is used for.",
  },

  "B4.1.1.2.3": {
    diagnostic: [
      "Which feature is most useful when describing an animal group?",
      "Body covering and limbs",
      [
        "Body covering and limbs",
        "The animal's name",
        "Whether people like it",
        "The day it was seen",
      ],
    ],
    reassessment: [
      "A frog has moist skin and powerful hind limbs. Which group in this lesson does that evidence support?",
      "Amphibians",
      ["Amphibians", "Insects", "Mammals", "Reptiles"],
    ],
    retention: [
      "Which observation gives useful physical evidence for comparing a lizard and a mammal?",
      "Their limbs and body covering",
      [
        "Their limbs and body covering",
        "Their names",
        "Who owns them",
        "The time they were observed",
      ],
    ],
    transfer: [
      "You see an unfamiliar animal. What should you examine first to compare it with mammals, reptiles, insects and amphibians?",
      "Observable physical features such as limbs and body covering",
      [
        "Observable physical features such as limbs and body covering",
        "Whether it is frightening",
        "Its local nickname only",
        "Whether it is expensive",
      ],
    ],
    lesson:
      "Mammals, reptiles, insects and amphibians can be compared using observable features such as limbs, body covering, shape and size.",
    practice:
      "Choose two animal groups and state two observable features that help distinguish them.",
    scaffold:
      "Observe before classifying: count or describe limbs, inspect body covering, then compare shape and movement.",
    remediation:
      "Habitat and movement can provide clues, but classification should not ignore defining physical features.",
  },

  "B4.1.2.2.1": {
    diagnostic: [
      "Oil and water are mixed and form separate layers. What kind of liquid-liquid mixture is this?",
      "An immiscible mixture",
      [
        "An immiscible mixture",
        "A single pure liquid",
        "A solid mixture",
        "A gas mixture",
      ],
    ],
    reassessment: [
      "Which method is suitable for separating two liquids that form distinct layers?",
      "Allow the layers to separate and carefully separate one from the other",
      [
        "Allow the layers to separate and carefully separate one from the other",
        "Crush the mixture",
        "Use a magnet",
        "Sieve it as if both parts were solids",
      ],
    ],
    retention: [
      "Vinegar mixes uniformly with water. Oil does not. What property is being compared?",
      "Whether the liquids are miscible or immiscible",
      [
        "Whether the liquids are miscible or immiscible",
        "Whether they are solids",
        "Whether they contain magnets",
        "Whether they are hot",
      ],
    ],
    transfer: [
      "Two safe household liquids form two visible layers after standing. What observation tells you separation by layers may work?",
      "The liquids do not mix uniformly",
      [
        "The liquids do not mix uniformly",
        "Both liquids have names",
        "The container is transparent",
        "Both liquids are at room temperature",
      ],
    ],
    lesson:
      "Some liquids mix uniformly and are miscible. Others form separate layers and are immiscible. Immiscible liquid mixtures can be separated by exploiting those layers.",
    practice:
      "Compare a uniformly mixed pair of safe liquids with a pair that forms layers and explain the difference.",
    scaffold:
      "Observe the mixture after it settles. One uniform appearance suggests miscibility; distinct layers indicate immiscibility.",
    remediation:
      "Do not assume every liquid-liquid mixture separates into layers. Separation depends on whether the liquids mix uniformly.",
  },

  "B4.2.1.1.1": {
    diagnostic: [
      "What is common to a swinging pendulum and the second hand of a clock?",
      "Their movement repeats in a pattern",
      [
        "Their movement repeats in a pattern",
        "They always move in a straight line",
        "They never return to a previous position",
        "They are both living things",
      ],
    ],
    reassessment: [
      "Which example best demonstrates cyclic movement?",
      "A swing moving back and forth repeatedly",
      [
        "A swing moving back and forth repeatedly",
        "A stone lying still",
        "A book falling once",
        "A chair being moved once",
      ],
    ],
    retention: [
      "What makes a movement cyclic?",
      "It repeats through a recognisable sequence",
      [
        "It repeats through a recognisable sequence",
        "It happens only once",
        "It must be very fast",
        "It must involve a machine",
      ],
    ],
    transfer: [
      "A learner notices the same sequence of positions repeating as a wheel turns. Which concept applies?",
      "Cyclic movement",
      ["Cyclic movement", "No movement", "Random colour change", "Nutrition"],
    ],
    lesson:
      "Cyclic movements repeat through a pattern or sequence. Pendulums, clock hands and other repeating motions provide observable examples.",
    practice:
      "Identify a repeating movement around you and describe the part of its motion that repeats.",
    scaffold:
      "Observe the starting position, follow the movement and ask whether the same sequence occurs again.",
    remediation:
      "A movement is not cyclic merely because something moves. Look for repetition of a sequence.",
  },

  "B4.2.1.2.1": {
    diagnostic: [
      "Which object is normally visible in the daytime sky?",
      "The Sun",
      ["The Sun", "A classroom desk", "A tree root", "A cooking pot"],
    ],
    reassessment: [
      "Which observation best compares the day and night sky?",
      "Different sky objects are commonly visible at different times",
      [
        "Different sky objects are commonly visible at different times",
        "The sky contains exactly the same visible objects at all times",
        "Nothing can be observed at night",
        "The Sun is a plant",
      ],
    ],
    retention: [
      "Why might a Venn diagram be useful when recording day and night sky observations?",
      "It can show objects seen in each period and any observations they share",
      [
        "It can show objects seen in each period and any observations they share",
        "It changes night into day",
        "It measures temperature automatically",
        "It creates stars",
      ],
    ],
    transfer: [
      "A learner keeps observations at dawn, midday and night. What should the learner compare?",
      "Which sky objects are visible at the different times",
      [
        "Which sky objects are visible at the different times",
        "Only the colour of the learner's clothes",
        "The number of desks indoors",
        "Only objects on the ground",
      ],
    ],
    lesson:
      "The sky can be observed at different times. Learners can identify, record and compare objects visible during day and night.",
    practice:
      "List observations that belong to the daytime sky, the night sky, or both.",
    scaffold:
      "Separate observations by time first, then compare the two groups for similarities and differences.",
    remediation:
      "Do not treat every object associated with space as equally visible at every time. Base the answer on observation of the sky.",
  },

  "B4.2.1.3.1": {
    diagnostic: [
      "Water droplets appear inside a clear bag tied around leafy parts of a plant. Which process contributed water vapour from the plant?",
      "Transpiration",
      ["Transpiration", "Freezing", "Melting", "Germination"],
    ],
    reassessment: [
      "Why can droplets form on the inside of a bag around a plant?",
      "The plant releases water vapour and the vapour can condense on the bag",
      [
        "The plant releases water vapour and the vapour can condense on the bag",
        "The leaves manufacture rain",
        "The plastic turns directly into water",
        "The soil becomes a gas permanently",
      ],
    ],
    retention: [
      "What is transpiration?",
      "Release of water vapour from plants",
      [
        "Release of water vapour from plants",
        "Freezing of plant roots",
        "Movement of seeds through soil",
        "Absorption of sunlight by plastic",
      ],
    ],
    transfer: [
      "Two similar potted plants are observed, but only one has its leafy part enclosed in a dry transparent bag. Droplets later appear in that bag. What is the strongest explanation?",
      "Water vapour released by the plant collected and condensed",
      [
        "Water vapour released by the plant collected and condensed",
        "The bag produced water from nothing",
        "The leaves melted",
        "The plant stopped all water movement",
      ],
    ],
    lesson:
      "Plants release water vapour through transpiration. Together with evaporation from other surfaces, this contributes water vapour to the environment.",
    practice:
      "Explain what you would observe in a simple covered-plant investigation and what the observation shows.",
    scaffold:
      "Trace the water: plant tissues to leaves, leaves to water vapour, then vapour to visible droplets after condensation.",
    remediation:
      "The droplets are not produced by the plastic. Distinguish the source of the water vapour from the surface on which it condenses.",
  },

  "B4.2.1.5.1": {
    diagnostic: [
      "Which action can help make unsafe water safer for drinking?",
      "Boiling it appropriately",
      [
        "Boiling it appropriately",
        "Adding soil",
        "Leaving rubbish in it",
        "Judging safety only by colour",
      ],
    ],
    reassessment: [
      "Water from an uncertain source looks clear. What is the best conclusion?",
      "Appearance alone does not prove it is safe",
      [
        "Appearance alone does not prove it is safe",
        "Clear water is always safe",
        "All water sources are equally safe",
        "Smell alone proves safety",
      ],
    ],
    retention: [
      "Which pair contains recognised ways of treating water?",
      "Boiling and suitable filtration",
      [
        "Boiling and suitable filtration",
        "Adding rubbish and stirring",
        "Colouring and freezing",
        "Adding soil and sand",
      ],
    ],
    transfer: [
      "After heavy rain, a household's usual water source may be contaminated. What should guide the response?",
      "Use an appropriate water-treatment method before drinking",
      [
        "Use an appropriate water-treatment method before drinking",
        "Drink it immediately because it is familiar",
        "Assume moving water cannot contain contamination",
        "Judge safety only by the container",
      ],
    ],
    lesson:
      "Water from different sources can vary in safety. Appropriate treatment methods include boiling and suitable filtration or approved treatment processes.",
    practice:
      "Given several water-source scenarios, choose an appropriate way to improve water safety and explain why.",
    scaffold:
      "First consider the source, then possible contamination, then choose a suitable treatment rather than relying on appearance.",
    remediation:
      "Clear-looking water is not automatically safe. Safety depends on contamination and appropriate treatment.",
  },

  "B4.2.2.1.1": {
    diagnostic: [
      "Which plant part mainly absorbs water from the soil?",
      "Roots",
      ["Roots", "Flower", "Fruit", "Petal"],
    ],
    reassessment: [
      "Which pairing is correct?",
      "Roots - absorb water; stem - supports and transports; leaves - make food",
      [
        "Roots - absorb water; stem - supports and transports; leaves - make food",
        "Roots - make flowers; leaves - anchor the plant",
        "Stem - absorbs all water directly from soil; roots - make food",
        "Flower - anchors the whole plant in soil",
      ],
    ],
    retention: [
      "Why are roots positioned mainly in the soil?",
      "Their position supports anchorage and uptake of water and minerals",
      [
        "Their position supports anchorage and uptake of water and minerals",
        "They need to catch flying insects",
        "They make the plant move",
        "They produce sunlight",
      ],
    ],
    transfer: [
      "A young plant has damaged roots and cannot take up enough water. Which plant function has been directly affected?",
      "Water absorption",
      ["Water absorption", "Producing sunlight", "Animal movement", "Making soil"],
    ],
    lesson:
      "Roots, stems, leaves and flowers are plant parts with different functions. Their positions help them perform those functions.",
    practice:
      "Label roots, stem, leaves and flower on a plant and state one function of each.",
    scaffold:
      "For each part ask: Where is it positioned? What does it do for the plant?",
    remediation:
      "Do not interchange plant-part functions. Connect each structure to both its position and its job.",
  },

  "B4.2.2.1.2": {
    diagnostic: [
      "What normally happens soon after a viable seed absorbs enough water during germination?",
      "The seed swells and the seed coat begins to open",
      [
        "The seed swells and the seed coat begins to open",
        "It immediately becomes a mature flowering plant",
        "It turns into a stone",
        "The root disappears",
      ],
    ],
    reassessment: [
      "Which sequence best represents early seed germination?",
      "Water uptake, swelling, seed coat opening, root emergence, shoot emergence",
      [
        "Water uptake, swelling, seed coat opening, root emergence, shoot emergence",
        "Flowering, fruiting, seed coat opening, water uptake",
        "Root disappearance, drying, flowering",
        "Fruit formation before the root emerges",
      ],
    ],
    retention: [
      "Which structure commonly emerges early during germination?",
      "The young root",
      ["The young root", "A mature flower", "A fruit", "A woody trunk"],
    ],
    transfer: [
      "A soaked bean seed swells and its coat splits. What should a learner look for next when recording germination?",
      "Emergence and growth of the young root and shoot",
      [
        "Emergence and growth of the young root and shoot",
        "Immediate production of fruit",
        "The seed becoming dry again without change",
        "Formation of an adult tree in one step",
      ],
    ],
    lesson:
      "Germination is a process with observable stages. After water uptake the seed swells, the coat opens, and young root and shoot structures emerge and grow.",
    practice:
      "Put the major early stages of bean or maize germination in order.",
    scaffold:
      "Follow one seed over time and record only what changes: coat, swelling, root, shoot and seed leaves.",
    remediation:
      "Germination is not an instant change from seed to mature plant. Learn the observable sequence.",
  },

  "B4.3.1.1.1": {
    diagnostic: [
      "Which organ begins digestion by chewing food and mixing it with saliva?",
      "Mouth",
      ["Mouth", "Large intestine", "Anus", "Skin"],
    ],
    reassessment: [
      "Which sequence follows the path food takes through major parts of the digestive tract?",
      "Mouth, oesophagus, stomach, intestines",
      [
        "Mouth, oesophagus, stomach, intestines",
        "Stomach, mouth, intestine, oesophagus",
        "Intestine, mouth, skin, stomach",
        "Mouth, lungs, stomach, heart",
      ],
    ],
    retention: [
      "What is an important function of the stomach?",
      "It helps break down and mix food during digestion",
      [
        "It helps break down and mix food during digestion",
        "It pumps blood around the body",
        "It produces thoughts",
        "It moves air into the lungs",
      ],
    ],
    transfer: [
      "If food could not pass from the mouth toward the stomach, which digestive connection would be disrupted?",
      "The oesophagus",
      ["The oesophagus", "The skin", "The leg", "The ear"],
    ],
    lesson:
      "The digestive system contains organs that work together in an ordered pathway. Different organs have different roles in receiving, breaking down, absorbing and removing food material.",
    practice:
      "Arrange major digestive organs in order and match each with a basic function.",
    scaffold:
      "Trace a bite of food from entry through the body instead of memorising isolated organ names.",
    remediation:
      "Knowing an organ's name is not enough. Link its position in the digestive pathway with its function.",
  },

  "B4.3.2.1.1": {
    diagnostic: [
      "Which body is at the centre of the solar system?",
      "The Sun",
      ["The Sun", "Earth", "The Moon", "A satellite dish"],
    ],
    reassessment: [
      "Which statement correctly describes Earth's place in the solar system?",
      "Earth is a planet that moves around the Sun",
      [
        "Earth is a planet that moves around the Sun",
        "The Sun moves around Earth as a planet",
        "Earth is the centre of the solar system",
        "The Moon is the Sun",
      ],
    ],
    retention: [
      "What central object do the planets of our solar system orbit?",
      "The Sun",
      ["The Sun", "Earth", "The Moon", "A cloud"],
    ],
    transfer: [
      "A model places Earth in the centre with the Sun travelling around it as a planet. What should be corrected?",
      "The Sun should be central and Earth represented as a planet orbiting it",
      [
        "The Sun should be central and Earth represented as a planet orbiting it",
        "Nothing should be changed",
        "Earth should be labelled a star",
        "The Moon should replace the Sun",
      ],
    ],
    lesson:
      "The Sun is the central star of the solar system. Earth and the other planets are arranged as bodies moving around the Sun.",
    practice:
      "Explain the relationship between the Sun and Earth in a simple solar-system model.",
    scaffold:
      "Identify the Sun first, then identify planets, then describe which body the planets orbit.",
    remediation:
      "Do not confuse everyday appearance in the sky with the solar-system model. Earth is not the centre of the solar system.",
  },

  "B4.3.3.1.1": {
    diagnostic: [
      "Which description best represents an ecosystem?",
      "Living organisms interacting with one another and with their environment",
      [
        "Living organisms interacting with one another and with their environment",
        "One animal completely isolated from its surroundings",
        "Only the soil in a place",
        "Only the buildings in a town",
      ],
    ],
    reassessment: [
      "What may happen if an important member is removed from an ecosystem?",
      "The relationships in the ecosystem may become imbalanced",
      [
        "The relationships in the ecosystem may become imbalanced",
        "Nothing can ever change",
        "Every organism immediately becomes identical",
        "Soil stops existing everywhere",
      ],
    ],
    retention: [
      "Which set could form part of a pond ecosystem?",
      "Water, soil, plants, fish and frogs",
      [
        "Water, soil, plants, fish and frogs",
        "Only one plastic chair",
        "Only a single isolated stone",
        "A list of animal names with no habitat",
      ],
    ],
    transfer: [
      "Vegetation around a stream is destroyed and several organisms lose food or shelter. Which ecosystem idea explains the wider effects?",
      "Members of an ecosystem are interdependent",
      [
        "Members of an ecosystem are interdependent",
        "Each organism is completely independent",
        "Only large animals affect ecosystems",
        "Removing vegetation always improves every habitat",
      ],
    ],
    lesson:
      "An ecosystem includes organisms and their physical surroundings, linked through interactions and dependencies.",
    practice:
      "Choose a local habitat and identify living and non-living members plus one relationship between them.",
    scaffold:
      "Start with a habitat, list what lives there, add non-living features, then identify how the parts depend on or affect one another.",
    remediation:
      "An ecosystem is more than a list of organisms. The important idea is interaction and interdependence within an environment.",
  },

  "B4.4.1.1.1": {
    diagnostic: [
      "What happens when liquid water receives enough heat during boiling?",
      "Some of it changes into water vapour",
      [
        "Some of it changes into water vapour",
        "It becomes soil",
        "It becomes a metal",
        "It permanently disappears from matter",
      ],
    ],
    reassessment: [
      "Water vapour touches a cooler surface and forms liquid droplets. What change has occurred?",
      "Condensation",
      ["Condensation", "Melting", "Freezing into fire", "Germination"],
    ],
    retention: [
      "What effect can heating have on shea butter or candle wax?",
      "It can cause the solid to melt",
      [
        "It can cause the solid to melt",
        "It makes the substance a plant",
        "It removes all matter",
        "It always freezes it",
      ],
    ],
    transfer: [
      "Steam from hot water forms droplets on a cooler lid. What does this show?",
      "Cooling can change water vapour back to liquid water",
      [
        "Cooling can change water vapour back to liquid water",
        "The lid creates new water from nothing",
        "Heat always makes liquids solid",
        "Water cannot change state",
      ],
    ],
    lesson:
      "Adding or removing heat can change the state of substances. Heating can cause melting or evaporation, while loss of heat can allow vapour to condense.",
    practice:
      "Describe one observable change caused by heating water and one caused by cooling its vapour.",
    scaffold:
      "Identify the starting state, whether heat is gained or lost, and the resulting state.",
    remediation:
      "Matter does not simply vanish during a state change. Track the substance as it changes between solid, liquid and gas.",
  },

  "B4.4.2.1.1": {
    diagnostic: [
      "Which activity commonly uses electrical energy?",
      "Powering a television",
      [
        "Powering a television",
        "A stone lying on the ground",
        "Writing with an ordinary pencil",
        "Holding an unplugged cup",
      ],
    ],
    reassessment: [
      "Which pair contains devices that normally use electricity?",
      "Electric iron and mobile-phone charger",
      [
        "Electric iron and mobile-phone charger",
        "Spoon and stone",
        "Paper and ruler",
        "Broom and bucket",
      ],
    ],
    retention: [
      "Electricity can be transformed in a lamp mainly to provide what useful output?",
      "Light",
      ["Light", "Soil", "Rain", "Food"],
    ],
    transfer: [
      "A family loses electrical supply. Which activity is most directly affected?",
      "Charging a mobile phone from a mains charger",
      [
        "Charging a mobile phone from a mains charger",
        "Reading a printed book in daylight",
        "Sweeping with a broom",
        "Writing with a pencil",
      ],
    ],
    lesson:
      "Electricity is used to operate many devices and can produce useful effects such as light, heat and operation of electronic equipment.",
    practice:
      "Identify electrical devices at home or in another familiar setting and state what each uses electricity to do.",
    scaffold:
      "For each object ask whether it needs an electrical source and what useful effect the electrical energy produces.",
    remediation:
      "Do not classify every household object as an electrical device. Identify the energy source and the effect produced.",
  },

  "B4.4.2.1.2": {
    diagnostic: [
      "Which action conserves electricity?",
      "Switching off an unused light",
      [
        "Switching off an unused light",
        "Leaving an empty room fully lit",
        "Leaving an iron on after use",
        "Running unused appliances",
      ],
    ],
    reassessment: [
      "Why should an electric iron be switched off when it is no longer needed?",
      "It avoids wasting electricity and reduces unnecessary risk",
      [
        "It avoids wasting electricity and reduces unnecessary risk",
        "It makes electricity unlimited",
        "It causes every other appliance to use more power",
        "There is no reason to switch it off",
      ],
    ],
    retention: [
      "Which behaviour is an example of electricity wastage?",
      "Leaving appliances operating when nobody needs them",
      [
        "Leaving appliances operating when nobody needs them",
        "Turning off unused lights",
        "Disconnecting equipment after appropriate use",
        "Using an appliance only when needed",
      ],
    ],
    transfer: [
      "A classroom is empty during break but lights and fans remain on. What is the best conservation action?",
      "Switch off equipment that is not needed",
      [
        "Switch off equipment that is not needed",
        "Turn on more equipment",
        "Leave everything running because it is school property",
        "Open more electrical appliances",
      ],
    ],
    lesson:
      "Electricity should be used when needed and conserved when it is not. Avoiding unnecessary operation reduces waste and can improve safety.",
    practice:
      "Identify three examples of electricity wastage and replace each with a conservation behaviour.",
    scaffold:
      "Ask whether the appliance is needed now. If not, identify the safe action that stops unnecessary consumption.",
    remediation:
      "Conservation does not mean never using electricity. It means avoiding unnecessary use while meeting real needs.",
  },

  "B4.4.2.2.1": {
    diagnostic: [
      "Which component supplies electrical energy in a simple battery-powered circuit?",
      "A dry cell or battery",
      [
        "A dry cell or battery",
        "An open notebook",
        "A plastic ruler",
        "A piece of chalk",
      ],
    ],
    reassessment: [
      "What is the function of a switch in a simple circuit?",
      "It opens or closes the path for current",
      [
        "It opens or closes the path for current",
        "It creates soil",
        "It replaces every wire",
        "It stores drinking water",
      ],
    ],
    retention: [
      "Which set contains basic components suitable for a simple LED circuit?",
      "Battery, connecting wires, switch and LED",
      [
        "Battery, connecting wires, switch and LED",
        "Cup, spoon, paper and chalk",
        "Soil, leaf, bottle and ruler",
        "Book, pencil, eraser and string",
      ],
    ],
    transfer: [
      "An LED does not light because the circuit path is broken at the switch. What should be checked?",
      "Whether the switch closes the circuit path",
      [
        "Whether the switch closes the circuit path",
        "Whether the LED has a plant root",
        "Whether the desk is painted",
        "Whether the battery is made of paper",
      ],
    ],
    lesson:
      "A simple electronic circuit uses components with different functions, including an energy source, conducting path, control such as a switch and an output such as an LED.",
    practice:
      "Match battery, wire, switch and LED with their functions in a simple circuit.",
    scaffold:
      "Trace the circuit as a complete path: source, conductor, control and output.",
    remediation:
      "Naming components without knowing their roles is insufficient. Connect each component to what it contributes to the circuit.",
  },

  "B4.4.3.1.1": {
    diagnostic: [
      "Stretching a rubber band demonstrates which kind of force?",
      "Elastic force",
      ["Elastic force", "No force", "Nutritional force", "Condensation"],
    ],
    reassessment: [
      "Pushing the handle of a bicycle pump compresses air. Which idea is demonstrated?",
      "Compressional force",
      ["Compressional force", "Germination", "Evaporation", "Reproduction"],
    ],
    retention: [
      "What happens to an elastic material after it is stretched within its normal range and released?",
      "It tends to return toward its original shape",
      [
        "It tends to return toward its original shape",
        "It always becomes water",
        "It begins germinating",
        "It permanently becomes a gas",
      ],
    ],
    transfer: [
      "A spring in a toy is pushed shorter and then released. Which stored-force situation best describes it?",
      "Compression followed by release",
      [
        "Compression followed by release",
        "Nutrition followed by digestion",
        "Condensation followed by rain",
        "Plant germination",
      ],
    ],
    lesson:
      "Forces can stretch elastic materials or compress materials and systems. Their response can be used in everyday devices such as springs, rubber bands and pumps.",
    practice:
      "Classify examples involving stretching and squeezing as elastic or compressional situations and explain the effect.",
    scaffold:
      "Observe whether the object is being stretched or pushed into a smaller space, then observe what happens when the force is released.",
    remediation:
      "Do not call every push or pull elastic. Elastic and compressional effects depend on how the object is deformed.",
  },

  "B4.5.1.1.1": {
    diagnostic: [
      "Which action supports personal hygiene?",
      "Cleaning the teeth regularly",
      [
        "Cleaning the teeth regularly",
        "Never washing hands",
        "Keeping dirty towels indefinitely",
        "Allowing nails to remain dirty",
      ],
    ],
    reassessment: [
      "Which pair contains actions that care for self and environment?",
      "Bathing appropriately and keeping the classroom clean",
      [
        "Bathing appropriately and keeping the classroom clean",
        "Avoiding tooth cleaning and littering",
        "Sharing dirty towels and leaving waste on the floor",
        "Ignoring body and surroundings",
      ],
    ],
    retention: [
      "Why is regular nail care part of hygiene?",
      "Clean, trimmed nails reduce the accumulation of dirt",
      [
        "Clean, trimmed nails reduce the accumulation of dirt",
        "It makes a person taller",
        "It replaces bathing",
        "It cleans the classroom automatically",
      ],
    ],
    transfer: [
      "After a muddy activity, what combination best demonstrates care for self and surroundings?",
      "Clean the body appropriately and clean the affected area",
      [
        "Clean the body appropriately and clean the affected area",
        "Ignore both",
        "Clean only the floor and never the body",
        "Hide the dirt",
      ],
    ],
    lesson:
      "Personal hygiene involves regular care of the body and belongings, while environmental hygiene includes keeping shared surroundings clean.",
    practice:
      "Classify familiar hygiene actions as care for self, care for environment, or both.",
    scaffold:
      "Consider body, clothing or personal items first, then the immediate surroundings.",
    remediation:
      "Hygiene is not limited to bathing. It includes several regular behaviours that protect cleanliness of self and environment.",
  },

  "B4.5.1.1.2": {
    diagnostic: [
      "Why is separating different types of waste useful?",
      "It supports safer handling, reuse and appropriate disposal",
      [
        "It supports safer handling, reuse and appropriate disposal",
        "It creates more litter",
        "It makes all waste identical",
        "It removes the need for bins",
      ],
    ],
    reassessment: [
      "Paper, bottles and other waste are mixed on a classroom floor. Which action best supports environmental sustainability?",
      "Collect and separate the waste into suitable containers",
      [
        "Collect and separate the waste into suitable containers",
        "Spread it over a larger area",
        "Burn everything anywhere",
        "Leave it for others",
      ],
    ],
    retention: [
      "What is a practical role of labelled litter bins?",
      "They help keep different waste streams separated",
      [
        "They help keep different waste streams separated",
        "They encourage littering",
        "They turn waste into food immediately",
        "They eliminate all waste without handling",
      ],
    ],
    transfer: [
      "A community event produces paper, plastic bottles and food waste. Which plan best applies waste-management principles?",
      "Provide appropriate collection points and separate waste types",
      [
        "Provide appropriate collection points and separate waste types",
        "Leave all waste on the ground",
        "Throw everything into a nearby stream",
        "Scatter the waste after the event",
      ],
    ],
    lesson:
      "Waste management helps sustain the environment. Identifying, collecting and separating waste supports cleaner surroundings and more appropriate handling.",
    practice:
      "List common waste from home or another familiar place and propose suitable ways to separate it.",
    scaffold:
      "Identify the waste first, group similar materials, then choose an appropriate container or handling method.",
    remediation:
      "Moving waste from one place to another is not enough. Sustainable management requires appropriate collection and separation.",
  },

  "B4.5.2.1.1": {
    diagnostic: [
      "Measles is caused by what type of infectious agent?",
      "A virus",
      ["A virus", "Dirty shoes alone", "Cold water", "A broken bone"],
    ],
    reassessment: [
      "Which action is important in preventing measles?",
      "Vaccination according to health guidance",
      [
        "Vaccination according to health guidance",
        "Sharing exposure deliberately",
        "Ignoring symptoms and close contact",
        "Using dirty drinking water as treatment",
      ],
    ],
    retention: [
      "Which is associated with measles illness?",
      "Fever and a characteristic rash",
      [
        "Fever and a characteristic rash",
        "A fractured arm only",
        "A cut shoe",
        "Long fingernails alone",
      ],
    ],
    transfer: [
      "A child may have been exposed to measles and develops compatible symptoms. What is the responsible response?",
      "Inform a responsible adult and seek appropriate health guidance while limiting spread",
      [
        "Inform a responsible adult and seek appropriate health guidance while limiting spread",
        "Encourage close contact with everyone",
        "Treat it as impossible because the child can walk",
        "Ignore the possibility of infection",
      ],
    ],
    lesson:
      "Understanding measles requires distinguishing its cause, common symptoms and prevention. Prevention includes appropriate vaccination and actions that reduce spread.",
    practice:
      "Sort statements about measles into cause, symptom or prevention.",
    scaffold:
      "Use three headings: What causes it? What signs may appear? What actions help prevent spread?",
    remediation:
      "Do not confuse causes with symptoms. A symptom is an effect seen in an ill person; it is not the infectious cause itself.",
  },

  "B4.5.2.1.2": {
    diagnostic: [
      "Which situation can contribute to food-borne disease?",
      "Eating food contaminated by harmful microorganisms",
      [
        "Eating food contaminated by harmful microorganisms",
        "Reading before eating",
        "Using a clean plate",
        "Keeping safe food properly protected",
      ],
    ],
    reassessment: [
      "Which action helps prevent food-borne disease?",
      "Practising good food hygiene and safe handling",
      [
        "Practising good food hygiene and safe handling",
        "Allowing contamination of cooked food",
        "Ignoring unsafe water",
        "Leaving food exposed to contamination",
      ],
    ],
    retention: [
      "Which group includes illnesses commonly associated with contaminated food or water?",
      "Cholera, diarrhoeal disease and typhoid fever",
      [
        "Cholera, diarrhoeal disease and typhoid fever",
        "Broken arm, sprained ankle and tooth loss",
        "Measles, a cut and sunburn",
        "Short sight, fracture and bruise",
      ],
    ],
    transfer: [
      "Cooked food at an event has been left uncovered where flies can reach it. Which principle should guide the decision?",
      "Prevent contamination and handle food safely before it is eaten",
      [
        "Prevent contamination and handle food safely before it is eaten",
        "Flies cannot contaminate food",
        "Appearance alone proves food safety",
        "All cooked food remains safe indefinitely",
      ],
    ],
    lesson:
      "Food-borne diseases can result when food or water becomes contaminated. Prevention depends on hygiene, safe food handling and reducing opportunities for contamination.",
    practice:
      "For several food-handling situations, identify the contamination risk and a preventive action.",
    scaffold:
      "Separate the problem into cause, possible symptoms and prevention. Then identify where contamination could enter the food pathway.",
    remediation:
      "Do not treat every illness as food-borne. Connect the disease risk to contaminated food or water and relevant preventive behaviour.",
  },

  "B4.5.4.1.1": {
    diagnostic: [
      "Which activity can contribute to climate change?",
      "Repeated burning of fossil fuels and vegetation",
      [
        "Repeated burning of fossil fuels and vegetation",
        "Sorting classroom books",
        "Drawing a plant",
        "Observing a seed",
      ],
    ],
    reassessment: [
      "Why can continuous burning be an environmental concern?",
      "It releases gases and particles and can contribute to climate change and environmental damage",
      [
        "It releases gases and particles and can contribute to climate change and environmental damage",
        "Smoke always cleans the atmosphere",
        "Burning vegetation has no environmental effect",
        "Fire creates unlimited clean air",
      ],
    ],
    retention: [
      "Which observation is directly associated with burning?",
      "Smoke and gases are released into the air",
      [
        "Smoke and gases are released into the air",
        "Seeds instantly germinate",
        "All water freezes",
        "Electric circuits assemble themselves",
      ],
    ],
    transfer: [
      "A community repeatedly burns large amounts of vegetation and waste. Which long-term concern best applies?",
      "Continued burning can add to atmospheric pollution and climate-changing emissions",
      [
        "Continued burning can add to atmospheric pollution and climate-changing emissions",
        "Burning guarantees cleaner air",
        "The activity cannot affect the environment",
        "Climate is controlled only by litter bins",
      ],
    ],
    lesson:
      "Burning vegetation, waste and fossil fuels releases substances into the atmosphere. Repeated large-scale burning contributes to environmental damage and climate change.",
    practice:
      "Explain the chain from burning to emissions and then to wider environmental effects.",
    scaffold:
      "Trace cause and effect: material burns, emissions enter the air, repeated emissions affect the environment and climate.",
    remediation:
      "Smoke being visible is not the whole concept. Connect burning with what enters the atmosphere and the cumulative environmental effect.",
  },
};

function slug(code: string): string {
  return code.toLowerCase().replace(/\./g, "-");
}

function assessment(
  competencyId: string,
  code: string,
  suffix: string,
  title: string,
  item: [string, string, string[]],
  purpose: string,
  diagnosticRules?: Record<string, unknown>,
): LearningContent {
  return {
    id: `content-gh-b4-science-${slug(code)}-${suffix}-en`,
    competencyId,
    type: "assessment",
    title,
    body: item[0],
    language: "en",
    assessmentItemId:
      `item-gh-b4-science-${slug(code)}-${suffix}-en`,
    assessmentStrategy: "multiple_choice",
    metadata: {
      options: JSON.stringify(item[2]),
      expectedResponse: item[1],
      assessmentPurpose: purpose,
      curriculumNodeCode: code,
      curriculumSource: SOURCE,
      ...(diagnosticRules
        ? { diagnosticRules: JSON.stringify(diagnosticRules) }
        : {}),
    },
    version: "science-adaptive-1.0",
    createdAt: now,
    updatedAt: now,
  };
}

function instruction(
  competencyId: string,
  code: string,
  suffix: string,
  type: "lesson" | "practice" | "scaffold" | "remediation",
  title: string,
  body: string,
  teachingStrategy: InstructionalStrategy,
): LearningContent {
  return {
    id: `content-gh-b4-science-${slug(code)}-${suffix}-en`,
    competencyId,
    type,
    title,
    body,
    language: "en",
    teachingStrategy,
    metadata: {
      curriculumNodeCode: code,
      curriculumSource: SOURCE,
    },
    version: "science-adaptive-1.0",
    createdAt: now,
    updatedAt: now,
  };
}

export const GHANA_B4_SCIENCE_GENERATED_CONTENT: LearningContent[] =
  GHANA_B4_SCIENCE_ADAPTIVE_SPECS
    .filter((spec) => spec.code !== "B4.1.1.1.1")
    .flatMap((spec) => {
      const authored = evidence[spec.code];

      if (!authored) {
        throw new Error(
          `Missing authored B4 Science adaptive evidence for ${spec.code}.`,
        );
      }

      const diagnosticRules: Record<string, unknown> = {};

      spec.misconceptions.slice(0, 3).forEach((misconception, index) => {
        const distractor = authored.diagnostic[2][index + 1];

        if (distractor) {
          diagnosticRules[distractor] = {
            errorPattern: misconception,
            diagnosticState: "conceptual_misunderstanding",
            diagnosticConfidence: 0.8,
          };
        }
      });

      return [
        assessment(
          spec.competencyId,
          spec.code,
          "diagnostic",
          `${spec.title} Diagnostic`,
          authored.diagnostic,
          "diagnostic",
          diagnosticRules,
        ),
        instruction(
          spec.competencyId,
          spec.code,
          "lesson",
          "lesson",
          spec.title,
          authored.lesson,
          "direct_explanation",
        ),
        instruction(
          spec.competencyId,
          spec.code,
          "practice",
          "practice",
          `${spec.title} Practice`,
          authored.practice,
          "guided_practice",
        ),
        instruction(
          spec.competencyId,
          spec.code,
          "scaffold",
          "scaffold",
          `${spec.title} Step by Step`,
          authored.scaffold,
          "step_by_step_scaffold",
        ),
        instruction(
          spec.competencyId,
          spec.code,
          "remediation",
          "remediation",
          `${spec.title} Misconception Repair`,
          authored.remediation,
          "error_analysis",
        ),
        assessment(
          spec.competencyId,
          spec.code,
          "reassessment",
          `${spec.title} Reassessment`,
          authored.reassessment,
          "reassessment",
        ),
        assessment(
          spec.competencyId,
          spec.code,
          "retention",
          `${spec.title} Retention Check`,
          authored.retention,
          "retention",
        ),
        assessment(
          spec.competencyId,
          spec.code,
          "transfer",
          `${spec.title} Transfer Check`,
          authored.transfer,
          "transfer",
        ),
      ];
    });

if (GHANA_B4_SCIENCE_GENERATED_CONTENT.length !== 184) {
  throw new Error(
    `Expected 184 additional B4 Science content records, found ${GHANA_B4_SCIENCE_GENERATED_CONTENT.length}.`,
  );
}
