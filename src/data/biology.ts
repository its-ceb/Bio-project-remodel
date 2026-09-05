export type UnitId = 'diversity' | 'cell' | 'plant' | 'human';

export interface Unit {
  id: UnitId;
  name: string;
  shortName: string;
  icon: string;
  chapters: string[];
}

export const units: Unit[] = [
  {
    id: 'diversity',
    name: 'Diversity in the Living World',
    shortName: 'Diversity',
    icon: 'Leaf',
    chapters: ['The Living World', 'Biological Classification', 'Plant Kingdom', 'Animal Kingdom'],
  },
  {
    id: 'cell',
    name: 'Cell Structure & Functions',
    shortName: 'Cell',
    icon: 'Microscope',
    chapters: ['Cell — The Unit of Life', 'Biomolecules', 'Cell Cycle & Cell Division'],
  },
  {
    id: 'plant',
    name: 'Plant Physiology',
    shortName: 'Plant',
    icon: 'Sprout',
    chapters: ['Photosynthesis in Higher Plants', 'Respiration in Plants', 'Plant Growth & Development'],
  },
  {
    id: 'human',
    name: 'Human Physiology',
    shortName: 'Human',
    icon: 'HeartPulse',
    chapters: ['Digestion & Absorption', 'Breathing & Exchange of Gases', 'Body Fluids & Circulation', 'Excretory Products', 'Locomotion & Movement', 'Neural Control', 'Chemical Coordination'],
  },
];

export interface NoteSection {
  id: string;
  heading: string;
  keywords: string[];
  bullets: string[];
}

export interface NoteTopic {
  id: string;
  unit: UnitId;
  chapter: string;
  title: string;
  summary: string;
  sections: NoteSection[];
}

export const notes: NoteTopic[] = [
  {
    id: 'living-world',
    unit: 'diversity',
    chapter: 'The Living World',
    title: 'The Living World',
    summary: 'What is living? Biodiversity, taxonomy, and the binomial system of nomenclature.',
    sections: [
      {
        id: 'living-world-1',
        heading: 'Characteristics of Living Organisms',
        keywords: ['Growth', 'Reproduction', 'Metabolism', 'Consciousness'],
        bullets: [
          'Growth is shown by both living and non-living (increase in mass/number); in living it is from inside via cell division.',
          'Reproduction is the production of progeny possessing features similar to parents — characteristic of all living organisms.',
          'Metabolism is the sum total of all chemical reactions in a living body; the defining feature of all living things.',
          'Consciousness (ability to sense the environment) is the most obvious and technically complicated feature of living organisms.',
          'Cellular organization is fundamental — all living organisms are made of cells.',
        ],
      },
      {
        id: 'living-world-2',
        heading: 'Taxonomic Categories',
        keywords: ['Taxonomy', 'Hierarchy', 'Species', 'Genus'],
        bullets: [
          'Taxonomy is the science of classification based on external and internal structure, morphology, anatomy, cytology, and physiology.',
          'Hierarchy of categories: Kingdom → Phylum/Division → Class → Order → Family → Genus → Species.',
          'Species is the lowest taxonomic category; a group of organisms with fundamental similarities.',
          'Genus is a group of related species resembling each other in major features.',
          'Family is a group of related genera with still less number of similarities as compared to genus and species.',
        ],
      },
      {
        id: 'living-world-3',
        heading: 'Binomial Nomenclature',
        keywords: ['Nomenclature', 'ICBN', 'ICZN', 'Binomial'],
        bullets: [
          'Binomial nomenclature was given by Carolus Linnaeus — each organism has a generic name (genus) and specific epithet (species).',
          'Biological names are Latinized and written in italics; the genus starts with a capital letter and species with a small letter.',
          'ICBN governs plant nomenclature; ICZN governs animal nomenclature.',
          'Each name has two parts — the first is generic and the second is specific, e.g., Homo sapiens.',
          'Scientific name ensures a single, universally accepted name for each organism across languages.',
        ],
      },
    ],
  },
  {
    id: 'bio-classification',
    unit: 'diversity',
    chapter: 'Biological Classification',
    title: 'Biological Classification',
    summary: 'Five-kingdom system, Monera to Animalia, and the three domains of life.',
    sections: [
      {
        id: 'bio-class-1',
        heading: 'Five Kingdom Classification',
        keywords: ['Whittaker', 'Kingdom', 'Monera', 'Protista'],
        bullets: [
          'R.H. Whittaker (1969) proposed the five-kingdom classification: Monera, Protista, Fungi, Plantae, Animalia.',
          'Main criteria: cell structure, body organization, mode of nutrition, reproduction, and phylogenetic relationships.',
          'Monera includes prokaryotes (bacteria, archaea) — no nuclear membrane, single chromosome.',
          'Protista includes unicellular eukaryotes — the link between prokaryotes and multicellular eukaryotes.',
          'Fungi are heterotrophic, eukaryotic, with cell walls of chitin; body is made of hyphae forming mycelium.',
        ],
      },
      {
        id: 'bio-class-2',
        heading: 'Kingdom Monera & Archaebacteria',
        keywords: ['Archaebacteria', 'Eubacteria', 'Methanogens', 'Peptidoglycan'],
        bullets: [
          'Archaebacteria live in harsh habitats — halophiles (salt), thermoacidophiles (hot springs), methanogens (marshes, gut of ruminants).',
          'Methanogens are responsible for production of biogas (methane) from the dung of cattle.',
          'Eubacteria (true bacteria) have a rigid cell wall made of peptidoglycan.',
          'Cyanobacteria (blue-green algae) are photosynthetic autotrophs with chlorophyll a; colonial forms like Nostoc have heterocysts for N₂ fixation.',
          'Chemoheterotrophic bacteria are decomposers; some are pathogens causing diseases like citrus canker.',
        ],
      },
      {
        id: 'bio-class-3',
        heading: 'Three Domains of Life',
        keywords: ['Carl Woese', 'Domains', 'Eukarya', 'Six kingdoms'],
        bullets: [
          'Carl Woese (1990) proposed the six-kingdom system grouped into three domains: Archaea, Bacteria, Eukarya.',
          'Based on differences in 16S rRNA sequences and cell membrane lipid structure.',
          'Domain Archaea includes archaebacteria; Domain Bacteria includes eubacteria; Domain Eukarya includes all eukaryotes.',
          'Fungi and members of the Monera and Protista having cell walls are now shifted to a separate kingdom — the six-kingdom system adds a new kingdom for Archaebacteria.',
          'This system reflects phylogenetic relationships more accurately than the five-kingdom system.',
        ],
      },
    ],
  },
  {
    id: 'plant-kingdom',
    unit: 'diversity',
    chapter: 'Plant Kingdom',
    title: 'Plant Kingdom',
    summary: 'Classification of plants into algae, bryophytes, pteridophytes, gymnosperms, and angiosperms.',
    sections: [
      {
        id: 'plant-king-1',
        heading: 'Algae — The Pioneers',
        keywords: ['Algae', 'Chlorophyceae', 'Phaeophyceae', 'Rhodophyceae'],
        bullets: [
          'Algae are chlorophyll-bearing, simple, thalloid, autotrophic, and largely aquatic organisms.',
          'Three main classes: Chlorophyceae (green algae, chlorophyll a & b), Phaeophyceae (brown algae, fucoxanthin), Rhodophyceae (red algae, phycoerythrin).',
          'Green algae store food as starch; brown algae as laminarin/manitol; red algae as Floridean starch.',
          'Volvox, Spirogyra, Ulothrix are green algae; Fucus, Sargassum are brown; Polysiphonia, Gelidium are red.',
          'Red algae reproduce using asexual non-motile spores and a complex post-fertilization development.',
        ],
      },
      {
        id: 'plant-king-2',
        heading: 'Bryophytes & Pteridophytes',
        keywords: ['Bryophytes', 'Pteridophytes', 'Amphibians', 'Vascular'],
        bullets: [
          'Bryophytes are called the "amphibians of the plant kingdom" — they need water for fertilization.',
          'The dominant generation in bryophytes is the gametophyte (haploid); the sporophyte is dependent on it.',
          'Pteridophytes are the first terrestrial plants to possess vascular tissues (xylem and phloem).',
          'In pteridophytes the dominant generation is the sporophyte (diploid); the gametophyte is small and independent.',
          'Common bryophytes: Funaria, Marchantia (liverwort), Anthoceros (hornwort). Common pteridophytes: Selaginella, Equisetum, Pteris, Dryopteris.',
        ],
      },
      {
        id: 'plant-king-3',
        heading: 'Gymnosperms & Angiosperms',
        keywords: ['Gymnosperms', 'Angiosperms', 'Naked seeds', 'Double fertilization'],
        bullets: [
          'Gymnosperms bear naked seeds (not enclosed in fruit); e.g., Pinus, Cycas, Ginkgo.',
          'Angiosperms (flowering plants) have seeds enclosed in fruits; the most diverse group of plants.',
          'Angiosperms are divided into monocots (one cotyledon, parallel venation) and dicots (two cotyledons, reticulate venation).',
          'Double fertilization is unique to angiosperms — one male gamete fuses with the egg (syngamy), the other with the secondary nucleus (triple fusion) forming the triploid endosperm.',
          'In gymnosperms, the endosperm is haploid (formed before fertilization), unlike the triploid endosperm of angiosperms.',
        ],
      },
    ],
  },
  {
    id: 'animal-kingdom',
    unit: 'diversity',
    chapter: 'Animal Kingdom',
    title: 'Animal Kingdom',
    summary: 'Classification of animals based on body plan, symmetry, coelom, and segmentation.',
    sections: [
      {
        id: 'animal-king-1',
        heading: 'Basis of Classification',
        keywords: ['Symmetry', 'Coelom', 'Diploblastic', 'Triploblastic'],
        bullets: [
          'Levels of organization: cellular (Porifera), tissue (Coelenterata), organ (Platyhelminthes & higher).',
          'Symmetry: radial (Coelenterata, Ctenophora, Echinodermata adult) vs bilateral (most others).',
          'Diploblastic (two germ layers — ectoderm & endoderm): Coelenterata & Ctenophora.',
          'Triploblastic (three germ layers — adds mesoderm): Platyhelminthes to Chordata.',
          'Coelom: acoelomate (Platyhelminthes), pseudocoelomate (Aschelminthes), coelomate (Annelida onwards).',
        ],
      },
      {
        id: 'animal-king-2',
        heading: 'Non-Chordate Phyla',
        keywords: ['Porifera', 'Cnidaria', 'Annelida', 'Arthropoda'],
        bullets: [
          'Porifera (sponges): pores (ostia) all over the body, water canal system, no tissues — e.g., Sycon, Spongilla.',
          'Cnidaria (Coelenterata): radial symmetry, tentacles with cnidoblasts (stinging cells) — e.g., Hydra, Aurelia, Obelia.',
          'Annelida: metamerically segmented body, closed blood circulation, nephridia for excretion — e.g., Pheretima (earthworm), Hirudinaria (leech).',
          'Arthropoda: largest animal phylum, jointed appendages, open circulation, exoskeleton of chitin — e.g., cockroach, butterfly, crab.',
          'Mollusca: soft body, mantle, calcareous shell; Echinodermata: water vascular system, radial symmetry in adults, tube feet for locomotion.',
        ],
      },
      {
        id: 'animal-king-3',
        heading: 'Chordates & Vertebrates',
        keywords: ['Notochord', 'Chordata', 'Vertebrata', 'Dorsal nerve cord'],
        bullets: [
          'Fundamental chordate features: notochord, dorsal hollow nerve cord, paired gill slits, post-anal tail — at some stage of life.',
          'Subphylum Vertebrata: notochord replaced by a vertebral column; divided into Pisces (fishes) and Tetrapoda (amphibians, reptiles, birds, mammals).',
          'Pisces are aquatic, gill-breathing, with fins; Tetrapoda have paired appendages (limbs).',
          'Class Mammalia: hairy body, mammary glands, viviparous (except monotremes), warm-blooded.',
          'Class Aves (birds): feathered, beaked, forelimbs modified into wings, pneumatic bones for flight.',
        ],
      },
    ],
  },
  {
    id: 'cell-unit-life',
    unit: 'cell',
    chapter: 'Cell — The Unit of Life',
    title: 'Cell — The Unit of Life',
    summary: 'Cell theory, prokaryotic vs eukaryotic cells, and the structural organization of organelles.',
    sections: [
      {
        id: 'cell-unit-1',
        heading: 'Cell Theory',
        keywords: ['Schleiden', 'Schwann', 'Virchow', 'Cell theory'],
        bullets: [
          'Matthias Schleiden (1838) — all plants are made of cells. Theodor Schwann (1839) — all animals are made of cells.',
          'Schwann proposed the cell hypothesis; Rudolf Virchow (1855) added "Omnis cellula-e-cellula" (cells arise from pre-existing cells).',
          'Modern cell theory: all organisms are made of cells; the cell is the basic unit of life; new cells arise from pre-existing cells.',
          'Cells vary in size and shape — Mycoplasma (PPLO) is the smallest cell (~0.3 µm); the longest cells are nerve cells.',
          'Cells may be unicellular (single-celled organisms) or multicellular (many cells performing different functions).',
        ],
      },
      {
        id: 'cell-unit-2',
        heading: 'Prokaryotic vs Eukaryotic Cells',
        keywords: ['Prokaryote', 'Eukaryote', 'Nucleoid', 'Membrane organelles'],
        bullets: [
          'Prokaryotes lack a true nuclear membrane; the genetic material is naked in the nucleoid region.',
          'Prokaryotes lack membrane-bound organelles like ER, Golgi, mitochondria, lysosomes, and vacuoles.',
          'Eukaryotes have a true nucleus with a nuclear envelope, and membrane-bound organelles.',
          'The 70S ribosome (50S + 30S) is characteristic of prokaryotes; the 80S ribosome (60S + 40S) is found in eukaryotic cytoplasm.',
          'Mesosomes are characteristic of prokaryotes — extensions of the plasma membrane involved in respiration and DNA replication.',
        ],
      },
      {
        id: 'cell-unit-3',
        heading: 'Cell Organelles',
        keywords: ['Mitochondria', 'Endoplasmic reticulum', 'Golgi', 'Lysosomes'],
        bullets: [
          'Mitochondria are the "powerhouses of the cell" — sites of aerobic respiration producing ATP; have their own DNA and 70S ribosomes.',
          'Endoplasmic reticulum (ER): rough ER (with ribosomes, protein synthesis) and smooth ER (lipid synthesis, detoxification).',
          'Golgi apparatus (dictyosomes in plants) packages, modifies, and transports materials; forms lysosomes.',
          'Lysosomes are "suicidal bags" — contain hydrolytic enzymes capable of digesting cellular waste; single membrane bound.',
          'Plastids (in plants): chloroplasts (photosynthesis), chromoplasts (colored), leucoplasts (colorless storage).',
        ],
      },
    ],
  },
  {
    id: 'biomolecules',
    unit: 'cell',
    chapter: 'Biomolecules',
    title: 'Biomolecules',
    summary: 'Chemical constituents of living cells — proteins, carbohydrates, lipids, nucleic acids, and enzymes.',
    sections: [
      {
        id: 'biomol-1',
        heading: 'Primary & Secondary Metabolites',
        keywords: ['Amino acids', 'Sugars', 'Alkaloids', 'Secondary metabolites'],
        bullets: [
          'Primary metabolites have identifiable functions and play known roles in normal physiological processes (amino acids, sugars, fats).',
          'Secondary metabolites are found in specific cells, tissues, or stages — many are useful ecologically (alkaloids, rubber, drugs, spices, pigments).',
          'Amino acids are substituted methanes with an amino group, a carboxyl group, a hydrogen, and a variable R group.',
          'Essential amino acids cannot be synthesized by the body and must come from diet; non-essential ones can be synthesized.',
          'Lipids are generally water-insoluble; fats (glycerol + fatty acids) are storage molecules; phospholipids form membranes.',
        ],
      },
      {
        id: 'biomol-2',
        heading: 'Proteins & Polysaccharides',
        keywords: ['Proteins', 'Peptide bond', 'Glycosidic bond', 'Polysaccharides'],
        bullets: [
          'Proteins are polypeptides — chains of amino acids joined by peptide bonds (a covalent bond between the carboxyl group of one and the amino group of the next).',
          'A protein loses its native structure (denaturation) under changes in temperature or pH, often losing biological activity.',
          'Polysaccharides are long chains of sugars joined by glycosidic bonds; cellulose is the structural polymer in plants, chitin in fungi and arthropods.',
          'Starch forms helical structures and holds I₂ to give a blue color; cellulose does not hold I₂.',
          'Glycogen is the storage carbohydrate in animals; starch is the storage carbohydrate in plants.',
        ],
      },
      {
        id: 'biomol-3',
        heading: 'Enzymes — The Catalysts',
        keywords: ['Enzymes', 'Active site', 'Km', 'Inhibition'],
        bullets: [
          'Enzymes are biocatalysts — almost all are proteins; they lower the activation energy of a reaction without being consumed.',
          'The active site is a crevice or pocket into which the substrate fits; the enzyme-substrate complex forms the products.',
          'Enzymes are highly specific — many catalyze only one reaction of a single substrate (absolute specificity).',
          'Factors affecting enzyme activity: temperature, pH, substrate concentration, and the presence of inhibitors or activators.',
          'Competitive inhibition occurs when an inhibitor structurally resembles the substrate and competes for the active site.',
        ],
      },
    ],
  },
  {
    id: 'cell-cycle',
    unit: 'cell',
    chapter: 'Cell Cycle & Cell Division',
    title: 'Cell Cycle & Cell Division',
    summary: 'Phases of the cell cycle, mitosis, meiosis, and their biological significance.',
    sections: [
      {
        id: 'cell-cycle-1',
        heading: 'The Cell Cycle',
        keywords: ['Interphase', 'M phase', 'G1', 'G0'],
        bullets: [
          'The cell cycle is the sequence of events by which a cell duplicates its contents and divides into two daughter cells.',
          'Interphase (longest) has G1 (gap 1), S (synthesis — DNA replication), and G2 (gap 2).',
          'M phase (mitosis) is the actual division — prophase, metaphase, anaphase, telophase followed by cytokinesis.',
          'G0 phase is the quiescent stage where cells exit the cycle and remain metabolically active but do not proliferate.',
          'In the S phase, DNA content doubles but chromosome number remains the same (2n → 2n with doubled DNA).',
        ],
      },
      {
        id: 'cell-cycle-2',
        heading: 'Mitosis — Equational Division',
        keywords: ['Mitosis', 'Equational', 'Somatic', 'Cytokinesis'],
        bullets: [
          'Mitosis is called equational division — the daughter cells have the same chromosome number as the parent cell.',
          'Prophase: chromatin condenses into chromosomes, nuclear envelope breaks, spindle begins to form.',
          'Metaphase: chromosomes align at the metaphase plate (equator), spindle fibers attach to kinetochores.',
          'Anaphase: centromere splits, sister chromatids separate and move to opposite poles.',
          'Cytokinesis in animal cells is by cleavage furrow (actin-myosin ring); in plant cells by cell-plate formation.',
        ],
      },
      {
        id: 'cell-cycle-3',
        heading: 'Meiosis — Reductional Division',
        keywords: ['Meiosis', 'Reductional', 'Crossing over', 'Synapsis'],
        bullets: [
          'Meiosis is called reductional division — the daughter cells have half the chromosome number of the parent (2n → n).',
          'Meiosis I separates homologous chromosomes; meiosis II separates sister chromatids (mitosis-like).',
          'Prophase I has five stages: leptotene, zygotene (synapsis begins), pachytene (crossing over), diplotene, diakinesis.',
          'Crossing over (recombination) occurs during pachytene — exchange of genetic material between non-sister chromatids of homologous chromosomes.',
          'Meiosis is essential for sexual reproduction — it maintains chromosome number constant across generations and introduces genetic variation.',
        ],
      },
    ],
  },
  {
    id: 'photosynthesis',
    unit: 'plant',
    chapter: 'Photosynthesis in Higher Plants',
    title: 'Photosynthesis in Higher Plants',
    summary: 'Light reactions, the Calvin cycle, C3/C4 pathways, and factors affecting photosynthesis.',
    sections: [
      {
        id: 'photo-1',
        heading: 'Photosynthetic Pigments & Light Reactions',
        keywords: ['Chlorophyll', 'Photosystems', 'Hill reaction', 'Photolysis'],
        bullets: [
          'Photosynthesis occurs in the chloroplast; pigments include chlorophyll a (universal), chlorophyll b, carotenoids, and xanthophylls.',
          'Photosystems are units of pigments; PS I absorbs at 700 nm (P700) and PS II at 680 nm (P680).',
          'The Hill reaction demonstrated that light-dependent release of O₂ occurs even in isolated chloroplasts with a suitable electron acceptor.',
          'Photolysis of water occurs at PS II (Mn-containing oxygen-evolving complex), releasing O₂, protons, and electrons.',
          'Electrons flow from PS II → PS I via the electron transport chain, producing ATP (cyclic & non-cyclic photophosphorylation).',
        ],
      },
      {
        id: 'photo-2',
        heading: 'The Calvin Cycle (C3 Pathway)',
        keywords: ['Calvin cycle', 'RuBisCO', 'PGA', 'RuBP'],
        bullets: [
          'The Calvin cycle (C3 pathway) occurs in the stroma — the primary CO₂ acceptor is RuBP (5C), and the first product is 3-PGA (3C).',
          'RuBisCO (RuBP carboxylase-oxygenase) is the most abundant protein on Earth — it catalyzes carboxylation of RuBP.',
          'The cycle has three phases: carboxylation (CO₂ fixation), reduction (using ATP & NADPH), and regeneration (of RuBP).',
          'For one CO₂ fixed: 3 ATP and 2 NADPH are used; for one glucose (6 CO₂): 18 ATP and 12 NADPH are consumed.',
          'RuBisCO also acts as an oxygenase in photorespiration — a wasteful process that consumes O₂ and releases CO₂ without producing ATP.',
        ],
      },
      {
        id: 'photo-3',
        heading: 'C4 Pathway & Photorespiration',
        keywords: ['C4', 'Kranz anatomy', 'PEP carboxylase', 'Photorespiration'],
        bullets: [
          'C4 plants (e.g., maize, sugarcane, sorghum) have Kranz anatomy — bundle sheath cells with large chloroplasts surrounding the veins.',
          'The primary CO₂ acceptor in C4 is PEP (3C); PEP carboxylase fixes CO₂ in mesophyll cells forming oxaloacetate (4C).',
          'The 4C acid is transported to bundle sheath cells where CO₂ is released and enters the Calvin cycle — a CO₂ concentrating mechanism.',
          'C4 plants are more efficient at high temperature and low CO₂; they minimize photorespiration.',
          'Photorespiration occurs when RuBisCO binds O₂ instead of CO₂ — favored by high O₂, high temperature, and low CO₂.',
        ],
      },
    ],
  },
  {
    id: 'respiration-plants',
    unit: 'plant',
    chapter: 'Respiration in Plants',
    title: 'Respiration in Plants',
    summary: 'Glycolysis, the Krebs cycle, the electron transport chain, and ATP yield.',
    sections: [
      {
        id: 'resp-1',
        heading: 'Glycolysis — The Common Pathway',
        keywords: ['Glycolysis', 'EMP pathway', 'Pyruvate', 'Substrate-level'],
        bullets: [
          'Glycolysis (EMP pathway) occurs in the cytoplasm — it breaks down one glucose (6C) into two pyruvate (3C) molecules.',
          'It is the only pathway common to aerobic and anaerobic respiration; it does not require oxygen.',
          'Net gain per glucose: 2 ATP (4 produced − 2 used) and 2 NADH.',
          'ATP is produced by substrate-level phosphorylation — direct transfer of a phosphate to ADP.',
          'In anaerobic respiration, pyruvate is converted to ethanol + CO₂ (yeast) or lactic acid (muscle under O₂ deficit).',
        ],
      },
      {
        id: 'resp-2',
        heading: 'Krebs Cycle (TCA Cycle)',
        keywords: ['Krebs cycle', 'TCA', 'Acetyl-CoA', 'Oxaloacetate'],
        bullets: [
          'Pyruvate enters the mitochondrial matrix and is converted to acetyl-CoA (2C) by the pyruvate dehydrogenase complex, releasing CO₂ and forming NADH.',
          'Acetyl-CoA condenses with oxaloacetate (4C) to form citrate (6C) — the first stable product of the Krebs cycle.',
          'The cycle occurs in the mitochondrial matrix; for one acetyl-CoA: 3 NADH, 1 FADH₂, and 1 ATP (GTP) are produced.',
          'Two turns of the cycle are needed per glucose (one per pyruvate), so per glucose: 6 NADH, 2 FADH₂, 2 ATP.',
          'The cycle is amphibolic — it is both catabolic and anabolic, providing intermediates for amino acid and fatty acid synthesis.',
        ],
      },
      {
        id: 'resp-3',
        heading: 'ETS & Oxidative Phosphorylation',
        keywords: ['ETS', 'Oxidative phosphorylation', 'ATP synthase', 'Terminal oxidation'],
        bullets: [
          'The electron transport system (ETS) is on the inner mitochondrial membrane — electrons from NADH and FADH₂ pass through a series of carriers.',
          'Electrons flow through complexes I → III → IV (NADH) or II → III → IV (FADH₂); O₂ is the final acceptor, forming H₂O.',
          'The proton gradient generated drives ATP synthase (complex V) — oxidative phosphorylation produces ATP.',
          'P/O ratio: ~3 ATP per NADH and ~2 ATP per FADH₂ (classical values).',
          'Total ATP per glucose (aerobic): ~38 in prokaryotes, ~36 in eukaryotes (after accounting for shuttle transport costs).',
        ],
      },
    ],
  },
  {
    id: 'plant-growth',
    unit: 'plant',
    chapter: 'Plant Growth & Development',
    title: 'Plant Growth & Development',
    summary: 'Growth phases, plant hormones (phytohormones), and photoperiodism.',
    sections: [
      {
        id: 'pg-1',
        heading: 'Phases & Types of Growth',
        keywords: ['Meristem', 'Arithmetic', 'Geometric', 'Differentiation'],
        bullets: [
          'Growth is measured by increase in protoplasm — has three phases: formative (cell division), enlargement (cell expansion), and maturation (differentiation).',
          'In arithmetic growth, one cell divides into two — one remains meristematic, the other differentiates (linear curve).',
          'In geometric growth, both daughter cells divide repeatedly — exponential initially, then slows as nutrients deplete (S-shaped curve).',
          'Differentiation is the process by which cells derived from meristems take up a permanent shape, size, and function.',
          'Growth rate = increase in growth per unit time; can be measured by fresh weight, dry weight, length, area, or cell number.',
        ],
      },
      {
        id: 'pg-2',
        heading: 'Plant Hormones (Phytohormones)',
        keywords: ['Auxins', 'Gibberellins', 'Cytokinins', 'Ethylene', 'ABA'],
        bullets: [
          'Auxins (e.g., IAA) promote cell elongation, apical dominance, and root initiation in cuttings; discovered by F.W. Went.',
          'Gibberellins (e.g., GA₃) promote stem elongation, bolting in rosette plants, and seed germination by inducing amylase.',
          'Cytokinins (e.g., kinetin, zeatin) promote cell division, delay senescence, and overcome apical dominance.',
          'Ethylene is a gaseous hormone — promotes fruit ripening, senescence, and abscission; the "ripening hormone".',
          'Abscisic acid (ABA) is the "stress hormone" — inhibits growth, promotes seed dormancy, and closes stomata under water stress.',
        ],
      },
      {
        id: 'pg-3',
        heading: 'Photoperiodism & Vernalization',
        keywords: ['Photoperiodism', 'Long-day', 'Short-day', 'Vernalization'],
        bullets: [
          'Photoperiodism is the response of plants to the duration of light — long-day plants flower when nights are short; short-day plants flower when nights are long.',
          'Day-neutral plants flower regardless of day length — e.g., tomato, cucumber.',
          'The site of perception of light/dark is the leaves; the flowering hormone (florigen) is transmitted from leaves to shoot apices.',
          'Vernalization is the promotion of flowering by a period of low temperature — some plants require cold treatment to flower.',
          'In biennial plants, vernalization prevents flowering in the first year; the cold of winter induces flowering in the second year.',
        ],
      },
    ],
  },
  {
    id: 'digestion',
    unit: 'human',
    chapter: 'Digestion & Absorption',
    title: 'Digestion & Absorption',
    summary: 'The alimentary canal, digestive enzymes, and absorption of nutrients.',
    sections: [
      {
        id: 'dig-1',
        heading: 'The Alimentary Canal',
        keywords: ['Alimentary canal', 'Sphincters', 'Villi', 'Serosa'],
        bullets: [
          'The human alimentary canal is a muscular tube extending from the mouth to the anus (~8-9 m long).',
          'The wall has four layers from outside in: serosa, muscularis (outer longitudinal + inner circular), submucosa, and mucosa.',
          'The mouth has teeth (for mastication) and a muscular tongue; the esophagus conducts food to the stomach via peristalsis.',
          'The stomach has three regions: cardiac (with mucus-secreting cells), fundus (with oxyntic/parietal and peptic/chief cells), and pyloric.',
          'The small intestine has three parts: duodenum (where most digestion occurs), jejunum, and ileum; villi and microvilli increase surface area for absorption.',
        ],
      },
      {
        id: 'dig-2',
        heading: 'Digestive Enzymes & Their Action',
        keywords: ['Salivary amylase', 'Pepsin', 'Trypsin', 'Lipase'],
        bullets: [
          'Saliva contains salivary amylase (ptyalin) that digests starch into maltose in the mouth (pH 6.8).',
          'Gastric juice contains HCl (activates pepsin, kills bacteria) and pepsin (digests proteins into peptides, optimal pH ~1.5-2.5).',
          'Pancreatic juice is alkaline (bicarbonate neutralizes chyme); contains trypsinogen (→ trypsin, digests proteins), amylase, and lipase.',
          'Trypsinogen is activated by enterokinase in the small intestine; trypsin then activates other pancreatic zymogens (chymotrypsinogen, procarboxypeptidase).',
          'Bile salts emulsify fats (break large globules into smaller droplets) — increasing the surface area for pancreatic lipase action.',
        ],
      },
      {
        id: 'dig-3',
        heading: 'Absorption & Assimilation',
        keywords: ['Absorption', 'Villi', 'Fatty acids', 'Lacteals'],
        bullets: [
          'Absorption occurs mainly in the small intestine through villi — finger-like projections with a network of capillaries and a central lacteal.',
          'Monosaccharides (glucose, fructose) and amino acids are absorbed into blood capillaries by active transport.',
          'Fatty acids and glycerol are absorbed into the lacteals (lymph) as chylomicrons — fat-soluble vitamins accompany them.',
          'Absorbed nutrients enter the bloodstream and are transported to the liver via the hepatic portal vein for assimilation.',
          'The large intestine (colon) absorbs water and some electrolytes; undigested matter is egested as feces via the anus.',
        ],
      },
    ],
  },
  {
    id: 'breathing',
    unit: 'human',
    chapter: 'Breathing & Exchange of Gases',
    title: 'Breathing & Exchange of Gases',
    summary: 'Respiratory organs, mechanism of breathing, and transport of gases.',
    sections: [
      {
        id: 'breath-1',
        heading: 'Respiratory System & Mechanism',
        keywords: ['Trachea', 'Bronchi', 'Alveoli', 'Diaphragm'],
        bullets: [
          'Air enters through the nostrils → nasal cavity → pharynx → larynx → trachea → bronchi → bronchioles → alveoli.',
          'The trachea is supported by C-shaped cartilaginous rings that keep it open and prevent collapse during inspiration.',
          'Alveoli are the primary sites of gas exchange — thin walls (squamous epithelium) with a dense network of capillaries.',
          'Inspiration occurs when the diaphragm contracts (flattens) and external intercostal muscles lift the ribs — increasing thoracic volume and decreasing intrapulmonary pressure.',
          'Expiration is passive at rest — diaphragm relaxes, ribs move down, thoracic volume decreases, and air is expelled.',
        ],
      },
      {
        id: 'breath-2',
        heading: 'Transport of Oxygen & CO₂',
        keywords: ['Hemoglobin', 'Oxyhemoglobin', 'Bohr effect', 'Bicarbonate'],
        bullets: [
          'Oxygen is transported mainly as oxyhemoglobin (bound to the heme iron of hemoglobin); ~97% in this form, ~3% dissolved in plasma.',
          'Oxygen binding to hemoglobin is related to the partial pressure of O₂ — the oxygen-hemoglobin dissociation curve is sigmoid (cooperative binding).',
          'The Bohr effect: increased CO₂ and lower pH (more H⁺) decrease hemoglobin affinity for O₂, promoting its release in tissues.',
          'CO₂ is transported mainly as bicarbonate (70%) in plasma (formed by carbonic anhydrase in RBCs), ~23% as carbaminohemoglobin, ~7% dissolved.',
          'Chloride shift: as bicarbonate moves out of RBCs into plasma, Cl⁻ moves in to maintain ionic balance.',
        ],
      },
      {
        id: 'breath-3',
        heading: 'Regulation of Respiration',
        keywords: ['Medulla', 'Chemosensitive', 'Pneumotaxic center', 'Hering-Breuer'],
        bullets: [
          'Respiration is regulated by the neural respiratory center in the medulla and pons.',
          'The pneumotaxic center (in the pons) can moderate the function of the respiratory rhythm center — it reduces the duration of inspiration.',
          'A chemosensitive area near the rhythm center is highly sensitive to CO₂ and H⁺ — increased CO₂/H⁺ stimulates increased respiration.',
          'Receptors in the aortic arch and carotid artery also sense changes in CO₂ and H⁺ concentration and send signals to the rhythm center.',
          'The Hering-Breuer reflex (initiated by stretch receptors in bronchi/bronchioles) prevents over-inflation of the lungs.',
        ],
      },
    ],
  },
  {
    id: 'body-fluids',
    unit: 'human',
    chapter: 'Body Fluids & Circulation',
    title: 'Body Fluids & Circulation',
    summary: 'Blood composition, the heart, cardiac cycle, and double circulation.',
    sections: [
      {
        id: 'bf-1',
        heading: 'Composition of Blood',
        keywords: ['Plasma', 'Erythrocytes', 'Leucocytes', 'Thrombocytes'],
        bullets: [
          'Blood is a special connective tissue with plasma and formed elements (RBCs, WBCs, platelets).',
          'Plasma (~55%) contains fibrinogen, globulins, and albumins; serum is plasma without clotting factors.',
          'Erythrocytes (RBCs) are biconcave, anucleate (in mammals), contain hemoglobin, and live ~120 days.',
          'Leucocytes (WBCs) are of two types: granulocytes (neutrophils, eosinophils, basophils) and agranulocytes (lymphocytes, monocytes).',
          'Thrombocytes (platelets) are cell fragments essential for blood clotting — release thromboplastin to initiate the cascade.',
        ],
      },
      {
        id: 'bf-2',
        heading: 'The Human Heart',
        keywords: ['Atria', 'Ventricles', 'Septum', 'Valves'],
        bullets: [
          'The human heart is a four-chambered muscular organ located in the thoracic cavity between the lungs (mediastinum).',
          'Two atria (right receives deoxygenated blood, left receives oxygenated) and two ventricles separated by the interventricular septum.',
          'Atrioventricular valves (tricuspid on the right, bicuspid/mitral on the left) prevent backflow from ventricles to atria.',
          'Semilunar valves (pulmonary and aortic) prevent backflow from arteries into ventricles.',
          'The cardiac cycle consists of systole (contraction) and diastole (relaxation); the heart sounds "lub-dub" are due to valve closure.',
        ],
      },
      {
        id: 'bf-3',
        heading: 'Cardiac Cycle & Double Circulation',
        keywords: ['Cardiac cycle', 'Stroke volume', 'Cardiac output', 'Double circulation'],
        bullets: [
          'The cardiac cycle is the sequence of events in one heartbeat (~0.8 sec at 75 beats/min).',
          'Stroke volume is the volume of blood pumped by each ventricle per beat (~70 mL); cardiac output = stroke volume × heart rate (~5 L/min).',
          'Double circulation: pulmonary circulation (heart → lungs → heart) and systemic circulation (heart → body → heart).',
          'Double circulation ensures complete separation of oxygenated and deoxygenated blood — maintaining high blood pressure and efficient supply.',
          'The SA node (pacemaker) initiates the cardiac impulse; it spreads to the AV node → bundle of His → Purkinje fibers, causing coordinated contraction.',
        ],
      },
    ],
  },
  {
    id: 'excretory',
    unit: 'human',
    chapter: 'Excretory Products & Their Elimination',
    title: 'Excretory Products & Their Elimination',
    summary: 'Modes of excretion, the nephron, urine formation, and regulation.',
    sections: [
      {
        id: 'exc-1',
        heading: 'Modes of Excretion',
        keywords: ['Ammonotelic', 'Ureotelic', 'Uricotelic', 'Nitrogenous waste'],
        bullets: [
          'Ammonotelic animals excrete ammonia (very toxic, requires lots of water) — most bony fishes, aquatic invertebrates.',
          'Ureotelic animals excrete urea (less toxic, requires moderate water) — mammals, amphibians, cartilaginous fishes.',
          'Uricotelic animals excrete uric acid (least toxic, minimal water) — birds, reptiles, insects.',
          'The liver is the site of urea formation (the ornithine/urea cycle) from ammonia and CO₂.',
          'Kidneys are the primary excretory organs in vertebrates; they regulate osmolarity and eliminate nitrogenous wastes.',
        ],
      },
      {
        id: 'exc-2',
        heading: 'The Nephron — Functional Unit',
        keywords: ['Nephron', 'Glomerulus', 'Bowman\'s capsule', 'Loop of Henle'],
        bullets: [
          'Each kidney has ~1 million nephrons — the structural and functional units of the kidney.',
          'A nephron has the renal corpuscle (glomerulus + Bowman\'s capsule) and the renal tubule (PCT, loop of Henle, DCT, collecting duct).',
          'The glomerulus is a tuft of capillaries formed by the afferent arteriole; blood is filtered here.',
          'The PCT reabsorbs all essential nutrients, ~65% of water, and ions (Na⁺, Cl⁻, glucose) back into the peritubular capillaries.',
          'The loop of Henle creates a concentration gradient in the medulla — the descending limb is water-permeable, the ascending limb is salt-permeable.',
        ],
      },
      {
        id: 'exc-3',
        heading: 'Urine Formation & Regulation',
        keywords: ['Glomerular filtration', 'Tubular reabsorption', 'ADH', 'RAAS'],
        bullets: [
          'Urine formation has three steps: glomerular filtration (GFR), selective reabsorption, and tubular secretion.',
          'GFR is ~125 mL/min in a healthy adult; ~180 L of filtrate is produced per day but only ~1.5 L of urine is excreted.',
          'ADH (vasopressin) from the posterior pituitary increases water reabsorption in the collecting duct — concentrated urine, low volume.',
          'The Renin-Angiotensin-Aldosterone System (RAAS) is activated by low blood pressure — aldosterone increases Na⁺ reabsorption, raising blood volume.',
          'ANF (Atrial Natriuretic Factor) from the atria opposes RAAS — it increases Na⁺ excretion and lowers blood pressure.',
        ],
      },
    ],
  },
  {
    id: 'locomotion',
    unit: 'human',
    chapter: 'Locomotion & Movement',
    title: 'Locomotion & Movement',
    summary: 'Types of movement, muscle structure, and the sliding filament theory.',
    sections: [
      {
        id: 'loc-1',
        heading: 'Types of Movement',
        keywords: ['Amoeboid', 'Ciliary', 'Muscular', 'Flagellar'],
        bullets: [
          'Amoeboid movement is by pseudopodia — seen in macrophages and leucocytes; helped by microfilaments (actin & myosin).',
          'Ciliary movement is by cilia — seen in the trachea (removing dust) and the oviduct (moving the ovum).',
          'Muscular movement is the most complex — involves contractile proteins in muscle fibers.',
          'Flagellar movement is by flagella — seen in spermatozoa and some bacteria.',
          'Locomotion (moving the whole body from place to place) requires muscular, skeletal, and neural coordination.',
        ],
      },
      {
        id: 'loc-2',
        heading: 'Muscle — Structure & Types',
        keywords: ['Skeletal', 'Smooth', 'Cardiac', 'Sarcomere'],
        bullets: [
          'Skeletal muscles are attached to bones, striated, voluntary, and multinucleated (e.g., biceps).',
          'Smooth muscles are spindle-shaped, non-striated, involuntary, found in hollow organs (intestine, blood vessels).',
          'Cardiac muscles are striated, involuntary, branched, with intercalated discs — found only in the heart.',
          'The contractile unit of a skeletal muscle is the sarcomere — bounded by two Z-lines; contains actin (thin) and myosin (thick) filaments.',
          'The sarcoplasmic reticulum stores Ca²⁺; T-tubules transmit the action potential deep into the fiber.',
        ],
      },
      {
        id: 'loc-3',
        heading: 'Sliding Filament Theory',
        keywords: ['Sliding filament', 'Actin', 'Myosin', 'Cross-bridge'],
        bullets: [
          'Muscle contraction is explained by the sliding filament theory — actin filaments slide over myosin, shortening the sarcomere.',
          'The myosin head (cross-bridge) binds to actin after Ca²⁺ binds to troponin, exposing the myosin-binding site on actin.',
          'ATP binds to the myosin head → myosin detaches from actin → ATP hydrolysis cocks the head → the head reattaches and the power stroke releases ADP + Pi.',
          'The A band (myosin) stays the same length during contraction; the I band and H zone shorten.',
          'Rigor mortis (stiffening after death) occurs because ATP is depleted — myosin heads cannot detach from actin.',
        ],
      },
    ],
  },
  {
    id: 'neural-control',
    unit: 'human',
    chapter: 'Neural Control & Coordination',
    title: 'Neural Control & Coordination',
    summary: 'Neurons, nerve impulse conduction, synapses, and the human nervous system.',
    sections: [
      {
        id: 'nc-1',
        heading: 'The Neuron',
        keywords: ['Neuron', 'Dendrites', 'Axon', 'Nissl\'s granules'],
        bullets: [
          'A neuron has three parts: the cell body (cyton/soma), dendrites (receive signals), and axon (transmits impulses).',
          'Nissl\'s granules (rough ER + ribosomes) are present in the cyton and dendrites but absent in the axon — they synthesize proteins.',
          'Myelinated neurons have a myelin sheath (formed by Schwann cells in PNS, oligodendrocytes in CNS) — interrupted at Nodes of Ranvier.',
          'Unmyelinated neurons conduct impulses slowly and continuously; myelinated neurons conduct rapidly via saltatory conduction (jumping node to node).',
          'There are three types of neurons: sensory (afferent), motor (efferent), and interneurons.',
        ],
      },
      {
        id: 'nc-2',
        heading: 'Nerve Impulse & Resting Potential',
        keywords: ['Resting potential', 'Action potential', 'Depolarization', 'Na⁺/K⁺ pump'],
        bullets: [
          'The resting membrane potential (~-70 mV) is maintained by the Na⁺/K⁺ pump (3 Na⁺ out, 2 K⁺ in) and the high K⁺ permeability.',
          'At threshold, voltage-gated Na⁺ channels open → rapid Na⁺ influx → depolarization to ~+30 mV (the action potential).',
          'Repolarization follows as K⁺ channels open and K⁺ effluxes; the Na⁺/K⁺ pump then restores the resting potential.',
          'The action potential is all-or-none — it either fires fully or not at all; its strength does not vary with stimulus intensity.',
          'The refractory period ensures unidirectional conduction — during the absolute refractory period, a second impulse cannot be generated.',
        ],
      },
      {
        id: 'nc-3',
        heading: 'Synaptic Transmission',
        keywords: ['Synapse', 'Neurotransmitter', 'EPSP', 'IPSP'],
        bullets: [
          'A synapse is the junction between two neurons (or a neuron and an effector); it may be electrical (rare, direct) or chemical (common, via neurotransmitters).',
          'In a chemical synapse, the impulse causes Ca²⁺ influx into the presynaptic terminal, releasing neurotransmitter vesicles into the synaptic cleft.',
          'The neurotransmitter binds to receptors on the postsynaptic membrane — opening ion channels that depolarize (EPSP) or hyperpolarize (IPSP) the postsynaptic cell.',
          'Common neurotransmitters: acetylcholine (excitatory at neuromuscular junctions), GABA (inhibitory), glutamate (excitatory in the CNS), dopamine.',
          'Acetylcholine is broken down by acetylcholinesterase in the synaptic cleft — recycling choline back into the presynaptic terminal.',
        ],
      },
    ],
  },
  {
    id: 'chemical-coord',
    unit: 'human',
    chapter: 'Chemical Coordination & Integration',
    title: 'Chemical Coordination & Integration',
    summary: 'Endocrine glands, hormones, and their regulatory roles.',
    sections: [
      {
        id: 'cc-1',
        heading: 'The Pituitary Gland',
        keywords: ['Pituitary', 'Adenohypophysis', 'Neurohypophysis', 'Tropic hormones'],
        bullets: [
          'The pituitary (hypophysis) is the "master gland" — located in the sella turcica of the sphenoid bone; connected to the hypothalamus by the infundibulum.',
          'Adenohypophysis (anterior pituitary) secretes GH, PRL, TSH, ACTH, LH, FSH, and MSH.',
          'Neurohypophysis (posterior pituitary) stores and releases oxytocin and vasopressin (ADH) — both produced by the hypothalamus.',
          'Hypersecretion of GH in childhood causes gigantism; in adults (after epiphyseal closure) causes acromegaly.',
          'Hyposecretion of GH causes dwarfism; ADH hyposecretion causes diabetes insipidus (excessive dilute urine).',
        ],
      },
      {
        id: 'cc-2',
        heading: 'Thyroid & Pancreas',
        keywords: ['Thyroid', 'Insulin', 'Glucagon', 'Islets of Langerhans'],
        bullets: [
          'The thyroid gland secretes T3 (triiodothyronine) and T4 (thyroxine) — both require iodine; they regulate the basal metabolic rate.',
          'Hypothyroidism in pregnancy or early childhood causes cretinism (stunted growth, mental retardation); in adults causes myxedema.',
          'Hyperthyroidism causes exophthalmic goiter (Graves\' disease) — enlarged thyroid with protruding eyes.',
          'The endocrine pancreas (islets of Langerhans) has α-cells (glucagon — raises blood glucose) and β-cells (insulin — lowers blood glucose).',
          'Insulin deficiency causes diabetes mellitus — hyperglycemia, glycosuria, ketosis; excess causes hypoglycemia.',
        ],
      },
      {
        id: 'cc-3',
        heading: 'Adrenal Gland & Other Hormones',
        keywords: ['Adrenal', 'Cortex', 'Medulla', 'Cortisol'],
        bullets: [
          'The adrenal gland has two regions: the adrenal cortex (steroid hormones) and the adrenal medulla (catecholamines — adrenaline/noradrenaline).',
          'Adrenaline ("fight or flight" hormone) increases heart rate, blood pressure, and blood glucose in response to stress.',
          'The adrenal cortex secretes glucocorticoids (cortisol — raises blood glucose, anti-inflammatory) and mineralocorticoids (aldosterone — Na⁺ retention).',
          'The pineal gland secretes melatonin — regulates the 24-hour (diurnal/circadian) rhythm and influences metabolism, pigmentation, and reproduction.',
          'The thymus secretes thymosins — essential for the differentiation of T-lymphocytes for cell-mediated immunity.',
        ],
      },
    ],
  },
];

export interface Flashcard {
  id: string;
  unit: UnitId;
  front: string;
  back: string;
}

export const flashcards: Flashcard[] = [
  { id: 'fc1', unit: 'diversity', front: 'What is the defining feature of all living organisms?', back: 'Metabolism — the sum total of all chemical reactions occurring in a living body. It is universal to all living organisms, unlike growth or reproduction which have non-living analogues.' },
  { id: 'fc2', unit: 'diversity', front: 'Who proposed the binomial system of nomenclature?', back: 'Carolus Linnaeus. Each organism receives a two-part Latinized name: the genus (capitalized) and the specific epithet (lowercase), both written in italics.' },
  { id: 'fc3', unit: 'diversity', front: 'Name the five kingdoms in Whittaker\'s classification.', back: 'Monera, Protista, Fungi, Plantae, and Animalia — proposed by R.H. Whittaker in 1969, based on cell structure, body organization, nutrition, reproduction, and phylogeny.' },
  { id: 'fc4', unit: 'diversity', front: 'Why are bryophytes called the "amphibians of the plant kingdom"?', back: 'Because they require water for fertilization — the motile male gametes (antherozoids) must swim through water to reach the archegonium, even though they live on land.' },
  { id: 'fc5', unit: 'diversity', front: 'What is unique about double fertilization in angiosperms?', back: 'One male gamete fuses with the egg (syngamy → zygote, 2n) and the other fuses with the two polar nuclei (triple fusion → triploid endosperm, 3n). This is unique to angiosperms.' },
  { id: 'fc6', unit: 'diversity', front: 'Which phylum has a water vascular system and tube feet?', back: 'Echinodermata — their water vascular system (powered by the madreporite) operates tube feet used for locomotion, capture of prey, and respiration.' },
  { id: 'fc7', unit: 'diversity', front: 'What is the fundamental difference between diploblastic and triploblastic animals?', back: 'Diploblastic animals (Coelenterata, Ctenophora) have two germ layers (ectoderm and endoderm); triploblastic animals (Platyhelminthes to Chordata) have an additional mesoderm layer.' },
  { id: 'fc8', unit: 'diversity', front: 'Name the three domains of life and their proponent.', back: 'Archaea, Bacteria, and Eukarya — proposed by Carl Woese (1990) based on differences in 16S rRNA sequences and membrane lipid structure.' },

  { id: 'fc9', unit: 'cell', front: 'What are the three tenets of modern cell theory?', back: '1) All organisms are made of cells. 2) The cell is the basic structural and functional unit of life. 3) New cells arise from pre-existing cells (Omnis cellula-e-cellula, Virchow).' },
  { id: 'fc10', unit: 'cell', front: 'What is the smallest known cell?', back: 'Mycoplasma (PPLO — Pleuropneumonia-Like Organisms), about 0.3 µm in size. It lacks a cell wall and is the smallest prokaryote capable of independent reproduction.' },
  { id: 'fc11', unit: 'cell', front: 'Why are mitochondria called the "powerhouses of the cell"?', back: 'Because they are the sites of aerobic respiration (Krebs cycle + ETS) that produce ATP — the energy currency of the cell. They have their own DNA and 70S ribosomes.' },
  { id: 'fc12', unit: 'cell', front: 'Distinguish between 70S and 80S ribosomes.', back: '70S (50S + 30S) are found in prokaryotes, mitochondria, and chloroplasts. 80S (60S + 40S) are found in the eukaryotic cytoplasm. "S" denotes the Svedberg unit (sedimentation coefficient).' },
  { id: 'fc13', unit: 'cell', front: 'What are lysosomes and why are they called "suicidal bags"?', back: 'Lysosomes are single-membrane vesicles containing hydrolytic enzymes (acid hydrolases) that digest cellular waste and foreign material. They are called "suicidal bags" because they can rupture and digest the cell itself (autolysis).' },
  { id: 'fc14', unit: 'cell', front: 'What is a peptide bond?', back: 'A covalent bond formed between the carboxyl (-COOH) group of one amino acid and the amino (-NH₂) group of the next, with the loss of a water molecule. It links amino acids into polypeptide chains (proteins).' },
  { id: 'fc15', unit: 'cell', front: 'How does competitive inhibition differ from non-competitive inhibition?', back: 'In competitive inhibition, an inhibitor structurally resembles the substrate and competes for the active site (can be overcome by increasing substrate). In non-competitive inhibition, the inhibitor binds elsewhere on the enzyme (allosteric site), altering enzyme shape — not overcome by more substrate.' },
  { id: 'fc16', unit: 'cell', front: 'During which phase of the cell cycle does DNA replication occur?', back: 'The S (Synthesis) phase of interphase. DNA content doubles (each chromosome becomes two sister chromatids), but the chromosome number remains 2n. The S phase lies between G1 and G2.' },
  { id: 'fc17', unit: 'cell', front: 'Why is meiosis called reductional division?', back: 'Because the chromosome number is halved (2n → n) in meiosis I, when homologous chromosomes separate. Meiosis II is equational (sister chromatids separate), resembling mitosis. This halving is essential for sexual reproduction.' },
  { id: 'fc18', unit: 'cell', front: 'In which stage of prophase I does crossing over occur?', back: 'Pachytene. The synaptonemal complex (formed in zygotene) allows exchange of genetic material between non-sister chromatids of homologous chromosomes, producing recombinant chromosomes and genetic variation.' },

  { id: 'fc19', unit: 'plant', front: 'What are the two photosystems and their reaction center wavelengths?', back: 'Photosystem I (P700, absorbs at 700 nm) and Photosystem II (P680, absorbs at 680 nm). PS II is involved in water photolysis; electrons flow from PS II to PS I through the electron transport chain.' },
  { id: 'fc20', unit: 'plant', front: 'What is the primary CO₂ acceptor in the C3 pathway, and what is the first product?', back: 'The primary CO₂ acceptor is RuBP (ribulose-1,5-bisphosphate, a 5-carbon sugar). The first stable product is 3-PGA (3-phosphoglycerate, a 3-carbon compound). The enzyme is RuBisCO.' },
  { id: 'fc21', unit: 'plant', front: 'What is Kranz anatomy and where is it found?', back: 'Kranz anatomy is found in C4 plants — the vascular bundles are surrounded by large bundle sheath cells packed with chloroplasts (agrana), with mesophyll cells around them. It enables a CO₂ concentrating mechanism that minimizes photorespiration.' },
  { id: 'fc22', unit: 'plant', front: 'What is photorespiration and why is it wasteful?', back: 'Photorespiration occurs when RuBisCO acts as an oxygenase (binds O₂ instead of CO₂), favored by high temperature, high O₂, and low CO₂. It consumes ATP and releases CO₂ without producing any sugar or ATP — a wasteful process.' },
  { id: 'fc23', unit: 'plant', front: 'How many ATP and NADPH are used per CO₂ fixed in the Calvin cycle?', back: '3 ATP and 2 NADPH per CO₂ fixed. For one molecule of glucose (6 CO₂), 18 ATP and 12 NADPH are consumed in the reduction and regeneration phases.' },
  { id: 'fc24', unit: 'plant', front: 'Where does glycolysis occur and what is its net ATP yield?', back: 'Glycolysis occurs in the cytoplasm. The net yield per glucose is 2 ATP (4 produced − 2 consumed in the energy-investment phase) and 2 NADH. It does not require oxygen.' },
  { id: 'fc25', unit: 'plant', front: 'What is the first stable product of the Krebs cycle?', back: 'Citrate (a 6-carbon compound), formed when acetyl-CoA (2C) condenses with oxaloacetate (4C). The cycle then proceeds through isocitrate, α-ketoglutarate, succinyl-CoA, succinate, fumarate, malate, and back to oxaloacetate.' },
  { id: 'fc26', unit: 'plant', front: 'What is the final electron acceptor in the ETS of aerobic respiration?', back: 'Oxygen. It accepts electrons at Complex IV (cytochrome c oxidase) and combines with protons to form water. Without O₂, the ETS backs up and aerobic ATP production stops.' },
  { id: 'fc27', unit: 'plant', front: 'Which plant hormone is called the "ripening hormone" and why?', back: 'Ethylene — a gaseous hormone that promotes fruit ripening, senescence, and abscission. It is used commercially to ripen fruits like bananas and mangoes.' },
  { id: 'fc28', unit: 'plant', front: 'What is vernalization?', back: 'The promotion of flowering by a period of low (winter) temperature. Some plants (e.g., winter wheat, biennials) require cold treatment to induce flowering; it prevents flowering in the first year of biennials.' },

  { id: 'fc29', unit: 'human', front: 'What is the role of HCl in the stomach?', back: 'HCl (secreted by oxyntic/parietal cells) activates pepsinogen to pepsin, provides the acidic pH (~1.5-2.5) for pepsin activity, and kills bacteria entering with food. It does not digest food directly.' },
  { id: 'fc30', unit: 'human', front: 'How are fatty acids absorbed differently from amino acids?', back: 'Amino acids and monosaccharides are absorbed into the blood capillaries of the villi. Fatty acids and glycerol are absorbed into the lacteals (lymph capillaries) as chylomicrons, then enter the bloodstream via the lymphatic system.' },
  { id: 'fc31', unit: 'human', front: 'What is the Bohr effect?', back: 'The Bohr effect: an increase in CO₂ (or decrease in pH / increase in H⁺) decreases the affinity of hemoglobin for O₂, promoting oxygen release in actively respiring tissues. It explains why O₂ is released where CO₂ is high.' },
  { id: 'fc32', unit: 'human', front: 'How is most CO₂ transported in the blood?', back: '~70% as bicarbonate (HCO₃⁻) formed in RBCs by carbonic anhydrase, then transported in plasma. ~23% as carbaminohemoglobin (bound to the globin of hemoglobin), and ~7% dissolved in plasma.' },
  { id: 'fc33', unit: 'human', front: 'What is the pacemaker of the heart?', back: 'The Sino-Atrial (SA) node, located in the right atrium. It initiates the cardiac impulse (~70-80 beats/min), which spreads to the AV node → bundle of His → Purkinje fibers, causing coordinated ventricular contraction.' },
  { id: 'fc34', unit: 'human', front: 'What is double circulation and why is it important?', back: 'Double circulation means blood passes through the heart twice per cycle: pulmonary (heart → lungs → heart) and systemic (heart → body → heart). It keeps oxygenated and deoxygenated blood separate, maintaining high pressure and efficient O₂ delivery.' },
  { id: 'fc35', unit: 'human', front: 'What are the three steps of urine formation?', back: '1) Glomerular filtration (at the glomerulus, forming the filtrate). 2) Selective reabsorption (in the PCT, loop of Henle, DCT — reclaim water, glucose, ions). 3) Tubular secretion (in the DCT and collecting duct — actively secrete H⁺, K⁺, drugs).' },
  { id: 'fc36', unit: 'human', front: 'How does ADH regulate urine volume?', back: 'ADH (vasopressin, from the posterior pituitary) increases the water permeability of the collecting duct by inserting aquaporin channels. This reabsorbs more water → concentrated urine of low volume. Low ADH → dilute, high-volume urine (diabetes insipidus).' },
  { id: 'fc37', unit: 'human', front: 'Explain the sliding filament theory of muscle contraction.', back: 'Muscle contraction occurs when actin (thin) filaments slide over myosin (thick) filaments, shortening the sarcomere. Ca²⁺ binds troponin, exposing myosin-binding sites on actin; the myosin cross-bridge binds, pivots (power stroke), and detaches using ATP.' },
  { id: 'fc38', unit: 'human', front: 'What is the resting membrane potential of a neuron and how is it maintained?', back: 'About -70 mV. It is maintained by the Na⁺/K⁺ pump (pumps 3 Na⁺ out for 2 K⁺ in, using ATP) and the high resting permeability of the membrane to K⁺ (which leaks out through leak channels).' },
  { id: 'fc39', unit: 'human', front: 'How is an impulse transmitted across a chemical synapse?', back: 'The action potential triggers Ca²⁺ influx into the presynaptic terminal, causing neurotransmitter vesicles to fuse with the membrane and release transmitter into the cleft. The transmitter binds postsynaptic receptors, opening ion channels that generate an EPSP or IPSP.' },
  { id: 'fc40', unit: 'human', front: 'Which hormones does the posterior pituitary release, and where are they made?', back: 'Oxytocin (milk ejection, uterine contraction) and vasopressin/ADH (water reabsorption). Both are synthesized by the hypothalamus (neurosecretory cells) and only stored and released by the posterior pituitary (neurohypophysis).' },
  { id: 'fc41', unit: 'human', front: 'What causes diabetes insipidus and how does it differ from diabetes mellitus?', back: 'Diabetes insipidus is caused by hyposecretion of ADH — the kidneys cannot retain water, producing large volumes of dilute urine. Diabetes mellitus is caused by insulin deficiency — producing glucose in urine (glycosuria) with normal urine concentration.' },
  { id: 'fc42', unit: 'human', front: 'Which hormone is called the "fight or flight" hormone and what does it do?', back: 'Adrenaline (epinephrine), from the adrenal medulla. It increases heart rate, blood pressure, blood glucose (by glycogenolysis), and blood flow to muscles — preparing the body to respond to stress or danger.' },
];

export interface MCQ {
  id: string;
  unit: UnitId;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const mcqs: MCQ[] = [
  { id: 'q1', unit: 'diversity', question: 'Which of the following is considered the most defining feature of living organisms?', options: ['Growth', 'Reproduction', 'Metabolism', 'Consciousness'], correctIndex: 2, explanation: 'Metabolism is the sum total of all chemical reactions in a living body and is the defining feature of all living organisms. Growth and reproduction have non-living analogues; consciousness is technically complicated but not universal (e.g., it is absent in plants).' },
  { id: 'q2', unit: 'diversity', question: 'Who proposed the binomial system of nomenclature?', options: ['Carolus Linnaeus', 'R.H. Whittaker', 'Carl Woese', 'Theodor Schwann'], correctIndex: 0, explanation: 'Carolus Linnaeus established the binomial system, giving each organism a two-part Latinized name: a capitalized genus and a lowercase specific epithet, both written in italics.' },
  { id: 'q3', unit: 'diversity', question: 'In Whittaker\'s five-kingdom classification, which kingdom includes prokaryotes?', options: ['Protista', 'Monera', 'Fungi', 'Animalia'], correctIndex: 1, explanation: 'Monera includes all prokaryotes (bacteria and archaea) — organisms without a nuclear membrane, possessing a single chromosome and 70S ribosomes.' },
  { id: 'q4', unit: 'diversity', question: 'Methanogens, responsible for biogas production, belong to which group?', options: ['Eubacteria', 'Archaebacteria', 'Cyanobacteria', 'Dinoflagellates'], correctIndex: 1, explanation: 'Methanogens are archaebacteria that live in marshes, anaerobic sludge, and the gut of ruminants. They produce methane (biogas) from the dung of cattle.' },
  { id: 'q5', unit: 'diversity', question: 'Which of the following is a characteristic of bryophytes?', options: ['Vascular tissues present', 'Dominant sporophyte generation', 'Called the "amphibians of the plant kingdom"', 'Naked seeds'], correctIndex: 2, explanation: 'Bryophytes are called the "amphibians of the plant kingdom" because they require water for fertilization — the motile male gametes must swim to reach the archegonium, even though they live on land.' },
  { id: 'q6', unit: 'diversity', question: 'Double fertilization, a unique feature of angiosperms, results in the formation of:', options: ['Two zygotes', 'A zygote and a triploid endosperm', 'Two triploid endosperms', 'A diploid zygote only'], correctIndex: 1, explanation: 'In double fertilization, one male gamete fuses with the egg (syngamy → diploid zygote) and the other fuses with the two polar nuclei (triple fusion → triploid endosperm, 3n). This is unique to angiosperms.' },
  { id: 'q7', unit: 'diversity', question: 'The water vascular system is the most characteristic feature of which phylum?', options: ['Porifera', 'Cnidaria', 'Echinodermata', 'Annelida'], correctIndex: 2, explanation: 'The water vascular system, operating tube feet, is unique to Echinodermata. It is used for locomotion, capture of prey, and respiration.' },
  { id: 'q8', unit: 'diversity', question: 'Which of the following animals is diploblastic?', options: ['Platyhelminthes', 'Coelenterata (Cnidaria)', 'Annelida', 'Chordata'], correctIndex: 1, explanation: 'Coelenterata (Cnidaria) and Ctenophora are diploblastic — they have only two germ layers (ectoderm and endoderm). All others listed are triploblastic (with a mesoderm).' },
  { id: 'q9', unit: 'diversity', question: 'The three domains of life were proposed by:', options: ['R.H. Whittaker', 'Carl Woese', 'Ernst Haeckel', 'Carolus Linnaeus'], correctIndex: 1, explanation: 'Carl Woese (1990) proposed the three-domain system (Archaea, Bacteria, Eukarya) based on differences in 16S rRNA sequences and cell membrane lipid structure.' },
  { id: 'q10', unit: 'diversity', question: 'Which pigment is responsible for the red color of Rhodophyceae (red algae)?', options: ['Fucoxanthin', 'Chlorophyll b', 'Phycoerythrin', 'Phycocyanin'], correctIndex: 2, explanation: 'Phycoerythrin is the red pigment that gives Rhodophyceae their characteristic red color. It masks chlorophyll a and allows red algae to photosynthesize at depths where only blue-green light penetrates.' },

  { id: 'q11', unit: 'cell', question: '"Omnis cellula-e-cellula" (cells arise from pre-existing cells) was added to cell theory by:', options: ['Matthias Schleiden', 'Theodor Schwann', 'Rudolf Virchow', 'Antonie van Leeuwenhoek'], correctIndex: 2, explanation: 'Rudolf Virchow (1855) added the concept that all cells arise from pre-existing cells, completing the modern cell theory.' },
  { id: 'q12', unit: 'cell', question: 'The smallest known cell is:', options: ['Mycoplasma (PPLO)', 'Escherichia coli', 'Yeast', 'Human RBC'], correctIndex: 0, explanation: 'Mycoplasma (PPLO — Pleuropneumonia-Like Organisms), about 0.3 µm, is the smallest cell capable of independent reproduction. It lacks a cell wall.' },
  { id: 'q13', unit: 'cell', question: 'Which organelle contains its own DNA and 70S ribosomes?', options: ['Golgi apparatus', 'Endoplasmic reticulum', 'Mitochondrion', 'Lysosome'], correctIndex: 2, explanation: 'Mitochondria (and chloroplasts) have their own circular DNA and 70S ribosomes — evidence of their prokaryotic origin (endosymbiotic theory). They are the sites of aerobic respiration (ATP production).' },
  { id: 'q14', unit: 'cell', question: 'Lysosomes are called "suicidal bags" because they:', options: ['Synthesize proteins', 'Contain hydrolytic enzymes that can digest the cell', 'Produce ATP', 'Store genetic material'], correctIndex: 1, explanation: 'Lysosomes contain acid hydrolases (digestive enzymes) that can break down cellular waste, foreign material, and even the cell itself (autolysis) if the lysosome ruptures — hence "suicidal bags" (Christian de Duve).' },
  { id: 'q15', unit: 'cell', question: 'A peptide bond is formed between:', options: ['Two carboxyl groups', 'An amino group and a carboxyl group of adjacent amino acids', 'Two amino groups', 'A phosphate and a hydroxyl group'], correctIndex: 1, explanation: 'A peptide bond is a covalent bond between the carboxyl (-COOH) of one amino acid and the amino (-NH₂) of the next, with the loss of water. It links amino acids into polypeptide chains.' },
  { id: 'q16', unit: 'cell', question: 'Competitive inhibition of an enzyme can be overcome by:', options: ['Decreasing substrate concentration', 'Increasing substrate concentration', 'Increasing temperature', 'Adding more inhibitor'], correctIndex: 1, explanation: 'In competitive inhibition, the inhibitor competes with the substrate for the active site. Increasing substrate concentration outcompetes the inhibitor, restoring enzyme activity — a hallmark of competitive inhibition.' },
  { id: 'q17', unit: 'cell', question: 'DNA replication occurs during which phase of the cell cycle?', options: ['G1 phase', 'S phase', 'G2 phase', 'M phase'], correctIndex: 1, explanation: 'DNA replication occurs during the S (Synthesis) phase of interphase. The DNA content doubles (each chromosome becomes two sister chromatids), but the chromosome number remains 2n.' },
  { id: 'q18', unit: 'cell', question: 'Crossing over (genetic recombination) occurs during which stage of meiotic prophase I?', options: ['Leptotene', 'Zygotene', 'Pachytene', 'Diplotene'], correctIndex: 2, explanation: 'Crossing over occurs during pachytene, after synapsis (pairing of homologs in zygotene). Non-sister chromatids of homologous chromosomes exchange segments, producing recombinant chromosomes and genetic variation.' },
  { id: 'q19', unit: 'cell', question: 'Meiosis is called reductional division because:', options: ['The cell size reduces', 'The chromosome number is halved', 'The DNA content stays the same', 'Two daughter cells form'], correctIndex: 1, explanation: 'Meiosis halves the chromosome number (2n → n) in meiosis I, when homologous chromosomes separate. This is essential to maintain chromosome number across generations in sexually reproducing organisms.' },
  { id: 'q20', unit: 'cell', question: 'Which of the following is true of the G0 phase?', options: ['Cells actively divide', 'Cells exit the cycle and remain metabolically active but do not proliferate', 'DNA replication occurs', 'Mitosis begins'], correctIndex: 1, explanation: 'G0 is the quiescent stage — cells exit the cell cycle and remain metabolically active without dividing. Some cells (e.g., neurons) enter G0 permanently; others (e.g., liver cells) can re-enter G1 when stimulated.' },

  { id: 'q21', unit: 'plant', question: 'The reaction centers of Photosystem I and Photosystem II absorb light at wavelengths of:', options: ['P700 and P680 respectively', 'P680 and P700 respectively', 'P680 and P700 respectively', 'P700 and P700 respectively'], correctIndex: 0, explanation: 'Photosystem I (P700) absorbs at 700 nm and Photosystem II (P680) at 680 nm. Electrons flow from PS II to PS I through the electron transport chain; PS II is associated with water photolysis.' },
  { id: 'q22', unit: 'plant', question: 'The primary CO₂ acceptor in the C3 (Calvin) cycle is:', options: ['PEP (phosphoenolpyruvate)', 'RuBP (ribulose-1,5-bisphosphate)', 'Oxaloacetate', '3-PGA'], correctIndex: 1, explanation: 'RuBP (a 5-carbon sugar) is the primary CO₂ acceptor in the C3 pathway. The enzyme RuBisCO catalyzes its carboxylation, and the first stable product is 3-PGA (a 3-carbon compound).' },
  { id: 'q23', unit: 'plant', question: 'Kranz anatomy is a characteristic feature of:', options: ['C3 plants', 'C4 plants', 'CAM plants', 'All plants'], correctIndex: 1, explanation: 'Kranz anatomy (wreath-like arrangement) is found in C4 plants — bundle sheath cells with large, agranal chloroplasts surround the veins, with mesophyll cells outside. It enables a CO₂ concentrating mechanism that minimizes photorespiration.' },
  { id: 'q24', unit: 'plant', question: 'Photorespiration is favored by conditions of:', options: ['High CO₂ and low O₂', 'High O₂, high temperature, and low CO₂', 'Low light and high CO₂', 'High humidity'], correctIndex: 1, explanation: 'Photorespiration occurs when RuBisCO acts as an oxygenase (binds O₂ instead of CO₂). This is favored by high O₂, high temperature, and low CO₂ — it is a wasteful process that consumes ATP and releases CO₂ without producing sugar.' },
  { id: 'q25', unit: 'plant', question: 'How many ATP and NADPH molecules are consumed per CO₂ fixed in the Calvin cycle?', options: ['2 ATP and 1 NADPH', '3 ATP and 2 NADPH', '1 ATP and 2 NADPH', '3 ATP and 3 NADPH'], correctIndex: 1, explanation: 'Per CO₂ fixed, 3 ATP and 2 NADPH are consumed (in reduction and RuBP regeneration). For one glucose (6 CO₂), 18 ATP and 12 NADPH are used.' },
  { id: 'q26', unit: 'plant', question: 'The net ATP yield of glycolysis per glucose molecule is:', options: ['2 ATP', '4 ATP', '36 ATP', '38 ATP'], correctIndex: 0, explanation: 'Glycolysis produces 4 ATP but consumes 2 ATP in the energy-investment phase, giving a net yield of 2 ATP (plus 2 NADH). It occurs in the cytoplasm and does not require oxygen.' },
  { id: 'q27', unit: 'plant', question: 'The first stable product of the Krebs (TCA) cycle is:', options: ['Oxaloacetate', 'Citrate', 'Succinate', 'Malate'], correctIndex: 1, explanation: 'Acetyl-CoA (2C) condenses with oxaloacetate (4C) to form citrate (6C) — the first stable product of the Krebs cycle. The cycle then regenerates oxaloacetate, producing 3 NADH, 1 FADH₂, and 1 ATP per acetyl-CoA.' },
  { id: 'q28', unit: 'plant', question: 'The final electron acceptor in the mitochondrial electron transport chain is:', options: ['Cytochrome c', 'NAD⁺', 'Oxygen', 'FAD'], correctIndex: 2, explanation: 'Oxygen is the final electron acceptor at Complex IV. It accepts electrons and combines with protons to form water. Without O₂, the ETS backs up and aerobic respiration stops.' },
  { id: 'q29', unit: 'plant', question: 'Which plant hormone promotes fruit ripening?', options: ['Auxin', 'Gibberellin', 'Ethylene', 'Cytokinin'], correctIndex: 2, explanation: 'Ethylene is a gaseous hormone that promotes fruit ripening, senescence, and abscission. It is used commercially to ripen fruits like bananas and mangoes — hence the "ripening hormone".' },
  { id: 'q30', unit: 'plant', question: 'Abscisic acid (ABA) is called the "stress hormone" because it:', options: ['Promotes growth', 'Inhibits growth, promotes seed dormancy, and closes stomata under water stress', 'Promotes flowering', 'Promotes cell division'], correctIndex: 1, explanation: 'ABA inhibits growth, promotes seed dormancy (so seeds survive unfavorable conditions), and closes stomata during water stress to reduce transpiration — hence the "stress hormone".' },

  { id: 'q31', unit: 'human', question: 'Which cells in the stomach secrete hydrochloric acid?', options: ['Peptic (chief) cells', 'Oxyntic (parietal) cells', 'Mucous cells', 'Goblet cells'], correctIndex: 1, explanation: 'Oxyntic (parietal) cells secrete HCl and Castle\'s intrinsic factor. HCl activates pepsinogen to pepsin, provides acidic pH for pepsin activity, and kills bacteria. Peptic (chief) cells secrete pepsinogen.' },
  { id: 'q32', unit: 'human', question: 'Fatty acids and glycerol are absorbed into:', options: ['Blood capillaries of the villi', 'The lacteals (lymph capillaries) of the villi', 'The colon', 'The stomach lining'], correctIndex: 1, explanation: 'Fatty acids and glycerol are reassembled into chylomicrons in the intestinal cells and absorbed into the lacteals (lymph capillaries) of the villi, then enter the bloodstream via the lymphatic system. Amino acids and sugars go into blood capillaries.' },
  { id: 'q33', unit: 'human', question: 'The Bohr effect states that an increase in CO₂ (or decrease in pH):', options: ['Increases hemoglobin\'s affinity for O₂', 'Decreases hemoglobin\'s affinity for O₂, promoting O₂ release', 'Has no effect on hemoglobin', 'Increases O₂ binding'], correctIndex: 1, explanation: 'The Bohr effect: increased CO₂ (or decreased pH / increased H⁺) decreases hemoglobin\'s affinity for O₂, promoting oxygen release in actively respiring tissues where CO₂ is high.' },
  { id: 'q34', unit: 'human', question: 'Most CO₂ in the blood is transported as:', options: ['Dissolved CO₂', 'Carbaminohemoglobin', 'Bicarbonate (HCO₃⁻)', 'Carbonic acid'], correctIndex: 2, explanation: '~70% of CO₂ is transported as bicarbonate (HCO₃⁻), formed in RBCs by carbonic anhydrase and carried in plasma. ~23% is as carbaminohemoglobin and ~7% dissolved. The chloride shift maintains ionic balance.' },
  { id: 'q35', unit: 'human', question: 'The pacemaker of the human heart is the:', options: ['AV node', 'SA node', 'Bundle of His', 'Purkinje fibers'], correctIndex: 1, explanation: 'The Sino-Atrial (SA) node in the right atrium initiates the cardiac impulse (~70-80 beats/min). It spreads to the AV node → bundle of His → Purkinje fibers, causing coordinated contraction of the ventricles.' },
  { id: 'q36', unit: 'human', question: 'Double circulation refers to:', options: ['Blood passing through the heart once per cycle', 'Blood passing through the heart twice per cycle (pulmonary and systemic)', 'Two hearts', 'Two types of blood cells'], correctIndex: 1, explanation: 'Double circulation means blood passes through the heart twice per cycle: pulmonary (heart → lungs → heart) and systemic (heart → body → heart). It keeps oxygenated and deoxygenated blood separate, maintaining high pressure.' },
  { id: 'q37', unit: 'human', question: 'The functional unit of the kidney is the:', options: ['Glomerulus', 'Nephron', 'Renal pelvis', 'Loop of Henle'], correctIndex: 1, explanation: 'The nephron is the structural and functional unit of the kidney — each kidney has ~1 million nephrons. It consists of the renal corpuscle (glomerulus + Bowman\'s capsule) and the renal tubule (PCT, loop of Henle, DCT, collecting duct).' },
  { id: 'q38', unit: 'human', question: 'ADH (vasopressin) acts on the kidney by:', options: ['Increasing water reabsorption in the collecting duct', 'Decreasing water reabsorption', 'Increasing Na⁺ reabsorption', 'Inhibiting filtration'], correctIndex: 0, explanation: 'ADH increases the water permeability of the collecting duct by inserting aquaporin channels, reabsorbing more water → concentrated urine of low volume. Low ADH causes diabetes insipidus (large volumes of dilute urine).' },
  { id: 'q39', unit: 'human', question: 'During muscle contraction, the length that does NOT change is the:', options: ['I band', 'H zone', 'A band', 'Sarcomere'], correctIndex: 2, explanation: 'The A band (the length of the myosin/thick filament) stays the same during contraction. The I band (thin filaments only) and H zone (thick filaments only) shorten as actin slides over myosin, shortening the sarcomere.' },
  { id: 'q40', unit: 'human', question: 'The resting membrane potential of a neuron (about -70 mV) is maintained mainly by:', options: ['Voltage-gated Na⁺ channels', 'The Na⁺/K⁺ pump and K⁺ leak channels', 'Voltage-gated K⁺ channels', 'Calcium channels'], correctIndex: 1, explanation: 'The Na⁺/K⁺ pump (3 Na⁺ out for 2 K⁺ in, using ATP) and K⁺ leak channels (K⁺ leaks out) maintain the resting potential at about -70 mV. The inside is negative relative to the outside.' },
  { id: 'q41', unit: 'human', question: 'At a chemical synapse, neurotransmitter release is triggered by the influx of:', options: ['Na⁺', 'K⁺', 'Ca²⁺', 'Cl⁻'], correctIndex: 2, explanation: 'When the action potential reaches the presynaptic terminal, voltage-gated Ca²⁺ channels open. Ca²⁺ influx triggers synaptic vesicles to fuse with the membrane and release neurotransmitter into the synaptic cleft.' },
  { id: 'q42', unit: 'human', question: 'Insulin is secreted by which cells of the pancreas?', options: ['α-cells of the islets of Langerhans', 'β-cells of the islets of Langerhans', 'Acinar cells', 'δ-cells'], correctIndex: 1, explanation: 'β-cells of the islets of Langerhans secrete insulin, which lowers blood glucose by promoting glucose uptake and glycogen storage. α-cells secrete glucagon (raises blood glucose). Insulin deficiency causes diabetes mellitus.' },
  { id: 'q43', unit: 'human', question: 'Which hormone is called the "fight or flight" hormone?', options: ['Cortisol', 'Adrenaline (epinephrine)', 'Insulin', 'Thyroxine'], correctIndex: 1, explanation: 'Adrenaline (epinephrine), from the adrenal medulla, is the "fight or flight" hormone. It increases heart rate, blood pressure, blood glucose (via glycogenolysis), and blood flow to muscles, preparing the body to respond to stress.' },
  { id: 'q44', unit: 'human', question: 'Cretinism is caused by hyposecretion of thyroid hormones during:', options: ['Old age', 'Pregnancy or early childhood', 'Adolescence', 'Adulthood only'], correctIndex: 1, explanation: 'Cretinism results from hypothyroidism during pregnancy or early childhood — causing stunted growth, mental retardation, and delayed development. In adults, hypothyroidism causes myxedema; hyperthyroidism causes Graves\' disease.' },
];
