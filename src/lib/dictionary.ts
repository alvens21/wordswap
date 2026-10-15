/**
 * WordSwap — Curated English dictionary of 5-letter words.
 *
 * This offline dictionary powers the AI Referee validator. Every entry is a
 * common English word of exactly 5 letters, grouped alphabetically. At runtime
 * the list is de-duplicated into a Set and filtered as a safety net, so a
 * malformed entry can never break gameplay.
 *
 * To scale beyond the curated list, swap `isDictionaryWord` for an API call
 * (e.g. a dictionary service or LLM) inside `aiValidator.ts`.
 */

const RAW_WORDS: string[] = [
  // A
  "ABOUT", "ABOVE", "ABUSE", "ACTOR", "ACUTE", "ADMIT", "ADOPT", "ADULT",
  "AFTER", "AGAIN", "AGENT", "AGREE", "AHEAD", "ALARM", "ALBUM", "ALERT",
  "ALIEN", "ALIGN", "ALIKE", "ALIVE", "ALLOW", "ALONE", "ALONG", "ALTER",
  "ANGEL", "ANGER", "ANGLE", "ANGRY", "APART", "APPLE", "APPLY", "ARENA",
  "ARGUE", "ARISE", "ARRAY", "ASIDE", "ASSET", "AUDIO", "AUDIT", "AVOID",
  "AWAKE", "AWARD", "AWARE",
  // B
  "BADLY", "BAKER", "BASIC", "BEACH", "BEGAN", "BEGIN", "BEING", "BELOW",
  "BENCH", "BIRTH", "BLACK", "BLAME", "BLANK", "BLAST", "BLIND", "BLOCK",
  "BLOOD", "BOARD", "BOLTS", "BOATS", "BONES", "BOOKS", "BOOST", "BOOTH",
  "BOUND", "BOWLS", "BOXES", "BRAIN", "BRAND", "BRAVE", "BREAD", "BREAK",
  "BREED", "BRIEF", "BRING", "BROAD", "BROKE", "BROWN", "BUILD", "BUILT",
  "BUSES",
  // C
  "CABLE", "CANDY", "CANES", "CARRY", "CASES", "CATCH", "CASTS", "CAUSE", "CAVES", "CELLS", "CHAIN", "CHAIR", "CHART", "CHASE", "CHEAP",
  "CHECK", "CHESS", "CHEST", "CHIEF", "CHILD", "CHIPS", "CHOPS", "CHOSE",
  "CIVIL", "CLAIM", "CLASS", "CLEAN", "CLEAR", "CLIMB", "CLIPS", "CLOCK",
  "CLOSE", "CLOUD", "COACH", "COALS", "COAST", "COATS", "CODES", "COINS",
  "CORDS", "COULD", "COUNT", "COURT", "COVER", "CRAFT", "CRABS", "CRASH",
  "CRAZY", "CREAM", "CRIME", "CROPS", "CROSS", "CROWD", "CROWN", "CUBES",
  "CURLS", "CURVE", "CYCLE",
  // D
  "DAILY", "DANCE", "DARES", "DATES", "DEALT", "DEATH", "DEBUT", "DECKS",
  "DELAY", "DEPTH", "DESKS", "DIETS", "DIRTY", "DOCKS", "DOLLS", "DOORS",
  "DOUBT", "DOZEN", "DRAFT", "DRAMA", "DRANK", "DREAM", "DRESS", "DRILL",
  "DRINK", "DRIVE", "DROVE", "DRUMS", "DUCKS", "DUNES",
  // E
  "EAGER", "EAGLE", "EARLY", "EARTH", "EASEL", "EIGHT", "ELITE", "EMPTY",
  "ENEMY", "ENJOY", "ENTER", "ENTRY", "EQUAL", "ERROR", "EVENT", "EVERY",
  "EXACT", "EXIST", "EXTRA",
  // F
  "FACES", "FACTS", "FADES", "FAITH", "FALSE", "FARMS", "FATES", "FAULT",
  "FEARS", "FEEDS", "FEELS", "FEUDS", "FIBER", "FIELD", "FIFTH", "FIFTY",
  "FIGHT", "FILMS", "FINAL", "FIRES", "FIRMS", "FIRST", "FISTS", "FIXED",
  "FLAGS", "FLAME", "FLATS", "FLASH", "FLEET", "FLIES", "FLOOR", "FOLDS",
  "FONTS", "FOODS", "FORKS", "FORMS", "FORTH", "FORTY", "FORUM", "FOUND",
  "FOXES", "FRAME", "FRANK", "FRAUD", "FRESH", "FROGS", "FRONT", "FRUIT",
  "FUELS", "FULLY", "FUNNY",
  // G
  "GAINS", "GAMES", "GATES", "GEARS", "GIANT", "GIFTS", "GIRLS", "GIVEN",
  "GLASS", "GLOBE", "GOALS", "GOATS", "GOING", "GOODS", "GRABS", "GRACE",
  "GRADE", "GRAND", "GRANT", "GRAPH", "GRASS", "GRAVE", "GRIDS", "GREAT",
  "GREEN", "GROSS", "GROUP", "GROWN", "GUARD", "GUESS", "GUEST", "GUIDE",
  // H
  "HAIRS", "HANDS", "HAPPY", "HATES", "HAWKS", "HEAPS", "HEARS", "HEART",
  "HEATS", "HEAVY", "HELLO", "HELPS", "HENCE", "HERBS", "HIDES", "HIKES",
  "HILLS", "HINTS", "HOLES", "HOODS", "HOOKS", "HOPES", "HORNS", "HORSE",
  "HOSTS", "HOTEL", "HOURS", "HOUSE", "HUMAN", "HUMOR", "HUNTS", "HURTS",
  // I
  "ICONS", "IDEAL", "IDEAS", "IDOLS", "IMAGE", "INDEX", "INNER", "INPUT",
  "IRONS", "IRONY", "ISSUE", "ITEMS",
  // J
  "JELLY", "JOINT", "JOKES", "JUDGE", "JUICE", "JUMPS",
  // K
  "KEEPS", "KICKS", "KILLS", "KINDS", "KINGS", "KITES", "KNEES", "KNIFE",
  "KNOBS", "KNOCK", "KNOWN",
  // L
  "LABEL", "LAKES", "LAMPS", "LANDS", "LANES", "LARGE", "LASER", "LATER",
  "LAUGH", "LAYER", "LEADS", "LEAKS", "LEANS", "LEAPS", "LEARN", "LEASE",
  "LEAST", "LEAVE", "LEADS", "LEMON", "LENDS", "LEVEL", "LIFTS", "LIGHT",
  "LIKES", "LIMBS", "LIMES", "LIMIT", "LINES", "LINKS", "LIONS", "LISTS",
  "LIVES", "LOADS", "LOANS", "LOCAL", "LOCKS", "LOGIC", "LOOKS", "LOOPS",
  "LOOSE", "LORDS", "LOSES", "LOVES", "LOWER", "LUCKY", "LUMPS", "LUNCH",
  "LUNGS",
  // M
  "MAGIC", "MAKES", "MAKER", "MAJOR", "MARKS", "MARCH", "MASKS", "MATCH",
  "MATES", "MAYBE", "MAYOR", "MEALS", "MEANS", "MEATS", "MEETS", "MELTS",
  "MENDS", "MENUS", "METAL", "MILES", "MILKS", "MINDS", "MINES", "MINOR",
  "MINUS", "MIXED", "MIXES", "MODES", "MODEL", "MODES", "MONEY", "MONTH",
  "MOODS", "MOONS", "MORAL", "MOTHS", "MOTOR", "MOUNT", "MOUSE", "MOUTH",
  "MOVES", "MOVIE", "MUSIC",
  // N
  "NAILS", "NAMED", "NAMES", "NECKS", "NEEDS", "NERVE", "NESTS", "NEVER",
  "NEWLY", "NIGHT", "NODES", "NOISE", "NOSES", "NOTES", "NOTED", "NOUNS",
  "NOVEL", "NURSE",
  // O
  "OBEYS", "OCCUR", "OCEAN", "OFFER", "OFTEN", "OMENS", "OPENS",
  "ORBIT", "ORDER", "OTHER", "OUGHT", "OVALS", "OVENS",
  // P
  "PACES", "PACKS", "PAGES", "PAINS", "PAINT", "PAIRS", "PALMS", "PANEL",
  "PAPER", "PARKS", "PARTS", "PARTY", "PATHS", "PEAKS", "PEACE", "PESTS",
  "PHASE", "PHONE", "PHOTO", "PIANO", "PICKS", "PIERS", "PILES", "PILOT",
  "PINES", "PIPES", "PITCH", "PIVOT", "PIZZA", "PLACE", "PLAIN", "PLANE",
  "PLANS", "PLANT", "PLATE", "PLAYS", "PLOTS", "PLUGS", "PLUMS", "POEMS",
  "POETS", "POINT", "POLES", "POLLS", "PONDS", "POOLS", "PORTS", "POSTS",
  "POUND", "POURS", "POWER", "PRESS", "PRICE", "PRIDE", "PRIME", "PRINT",
  "PRIOR", "PRIZE", "PROOF", "PROPS", "PROUD", "PROVE", "PULLS", "PULSE",
  "PUMPS", "PUNCH", "PUPIL",
  // Q
  "QUEEN", "QUEST", "QUICK", "QUIET", "QUITS", "QUITE", "QUOTA", "QUOTE",
  // R
  "RACKS", "RADAR", "RAIDS", "RAILS", "RAINS", "RAISE", "RANCH", "RANKS",
  "RANGE", "RAPID", "RATES", "RATIO", "REACH", "READS", "READY", "REALM",
  "REBEL", "RECAP", "RENTS", "RESTS", "RIDES", "RIGHT", "RINGS", "RISES",
  "RISKS", "RIVAL", "RIVER", "ROADS", "ROAST", "ROBES", "ROBIN", "ROBOT",
  "ROCKS", "ROLES", "ROLLS", "ROOFS", "ROOMS", "ROOTS", "ROPES", "ROSES",
  "ROUGH", "ROUND", "ROUTE", "ROYAL", "RULES", "RURAL",
  // S
  "SACKS", "SAFES", "SAGAS", "SALES", "SALTS", "SATIN", "SAUCE",
  "SAVES", "SCARE", "SCARS", "SCENE", "SCOPE", "SCORE", "SCOUT", "SEATS",
  "SEEDS", "SEEKS", "SEEMS", "SEIZE", "SELLS", "SENDS", "SENSE", "SHEDS",
  "SHIPS", "SHOES", "SHOPS", "SHOTS", "SHOWS", "SIGNS", "SINGS", "SITES",
  "SKILL", "SKINS", "SKIPS", "SLABS", "SLAPS", "SLIPS", "SLOTS", "SLUGS",
  "SMALL", "SMART", "SMILE", "SMOKE", "SNAPS", "SNAKE", "SNORE", "SOCKS",
  "SOLID", "SONGS", "SORTS", "SOULS", "SOUND", "SOUPS", "SOUTH", "SPACE",
  "SPANS", "SPARE", "SPARK", "SPEAK", "SPEED", "SPEND", "SPENT", "SPICE",
  "SPINE", "SPINS", "SPOKE", "SPOTS", "SPRAY", "SPURS", "SPLIT", "SPORT",
  "STAFF", "STAGE", "STAND", "STARE", "START", "STATE", "STARS", "STATS",
  "STAYS", "STEAM", "STEEL", "STEMS", "STEPS", "STICK", "STILL", "STOCK",
  "STOOL", "STONE", "STOOD", "STOPS", "STORE", "STORM", "STORY", "STOVE",
  "STRIP", "STUCK", "STUDY", "STUFF", "STYLE", "SUGAR", "SUITE", "SUPER",
  "SWEET", "SWAPS", "SWIMS", "SWORE",
  // T
  "TABLE", "TAILS", "TAKEN", "TAKES", "TALES", "TALKS", "TANKS", "TAPES",
  "TASKS", "TASTE", "TAXES", "TEAMS", "TEARS", "TEACH", "TEENS", "TEETH",
  "TELLS", "TENDS", "TENSE", "TENTH", "TERMS", "TESTS", "TEXTS", "THANK",
  "THEFT", "THEIR", "THEME", "THERE", "THESE", "THICK", "THING", "THINK",
  "THIRD", "THOSE", "THREE", "THREW", "THROW", "TICKS", "TIDES", "TIERS",
  "TIGHT", "TILES", "TIMES", "TIRED", "TITLE", "TOADS", "TODAY", "TOKEN",
  "TOLLS", "TOMBS", "TONES", "TOOLS", "TOPIC", "TOTAL", "TOUCH", "TOUGH",
  "TOURS", "TOWNS", "TOWER", "TRACK", "TRADE", "TRAIN", "TRAPS", "TRAYS",
  "TREAT", "TREES", "TREND", "TRIAL", "TRIBE", "TRICK", "TRIED", "TRIES",
  "TRIMS", "TRIPS", "TROOP", "TRUCK", "TRULY", "TRUNK", "TRUST", "TRUTH",
  "TUBES", "TUNES", "TURNS", "TWICE", "TWINS", "TYPES", "TYPOS",
  // U
  "UNDER", "UNION", "UNITS", "UNITY", "UNTIL", "UPPER", "UPSET", "URBAN",
  "USAGE", "USERS", "USUAL",
  // V
  "VAGUE", "VALID", "VALUE", "VAPOR", "VAULT", "VENUE", "VERSE", "VIDEO",
  "VIRUS", "VISIT", "VITAL", "VIEWS", "VOTES",
  // W
  "WAITS", "WAKES", "WALKS", "WALLS", "WARNS", "WASTE", "WATCH", "WATER",
  "WAVES", "WEARS", "WEEDS", "WEEKS", "WELLS", "WHALE", "WHEEL", "WHERE",
  "WHICH", "WHILE", "WHIPS", "WHITE", "WHOLE", "WHOSE", "WINDS", "WINES",
  "WINGS", "WIPES", "WIRES", "WISER", "WOMAN", "WOMEN", "WOODS",
  "WORDS", "WORKS", "WORMS", "WORRY", "WORSE", "WORST", "WORTH", "WOULD",
  "WOUND", "WRAPS", "WRITE", "WRIST", "WRONG", "WROTE",
  // Y & Z
  "YACHT", "YOUNG", "YOUTH", "ZEBRA", "ZONES",

  // ----------------------------------------------------------------
  // Extended common words (batch 2). Overlaps with the list above are
  // harmless — the runtime Set de-duplicates.
  // ----------------------------------------------------------------
  // A
  "ADOBE", "AGILE", "AGING", "AISLE", "ALLOY", "ALOUD", "AMBER", "AMPLE",
  "ANKLE", "APRON", "ARMOR", "AROMA", "ARROW", "ASHEN", "ATLAS", "ATTIC",
  "AVAIL", "AVERT", "AXIOM",
  // B
  "BADGE", "BANJO", "BARGE", "BASIL", "BATON", "BEARD", "BEAST", "BELLY",
  "BERRY", "BINGO", "BIRCH", "BISON", "BLAZE", "BLEND", "BLESS", "BLINK",
  "BLISS", "BLOOM", "BLUFF", "BLUNT", "BLUSH", "BONUS", "BOXER", "BRASS",
  "BRAVO", "BRICK", "BRIDE", "BRISK", "BROOM", "BROTH", "BRUSH", "BUDGE",
  "BUGGY", "BUNCH", "BURLY", "BURST",
  // C
  "CABIN", "CAMEL", "CANAL", "CANOE", "CARGO", "CEDAR", "CHALK", "CHAMP",
  "CHAOS", "CHEEK", "CHEER", "CHILL", "CHIMP", "CHOIR", "CHORD", "CHUNK",
  "CIDER", "CIGAR", "CLAMP", "CLASH", "CLASP", "CLERK", "CLICK", "CLIFF",
  "CLING", "CLOAK", "CLOWN", "CLUMP", "COBRA", "COCOA", "COMET", "CORAL",
  "COUCH", "COUGH", "CRANE", "CRANK", "CRATE", "CRAWL", "CREEK", "CREEP",
  "CREST", "CRISP", "CRUMB", "CRUSH", "CRUST", "CUBIC", "CUMIN", "CURLY",
  "CURVY",
  // D
  "DAIRY", "DAISY", "DECAY", "DECOR", "DELTA", "DENSE", "DIARY", "DIGIT",
  "DINER", "DINGO", "DITCH", "DIVER", "DONOR", "DOUGH", "DRAIN", "DRAKE",
  "DRAWN", "DRIED", "DRIFT", "DROWN", "DRUNK", "DUSTY", "DWARF", "DWELL",
  // E
  "EATEN", "EBONY", "EERIE", "ELBOW", "ELDER", "EMBER", "EPOCH", "EQUIP",
  "ERUPT", "ESSAY", "ETHIC", "EVICT", "EXPEL",
  // F
  "FABLE", "FAIRY", "FANCY", "FATAL", "FEAST", "FENCE", "FERRY", "FETCH",
  "FEVER", "FIERY", "FLAIR", "FLAKE", "FLARE", "FLESH", "FLICK", "FLING",
  "FLINT", "FLOAT", "FLOCK", "FLOOD", "FLOUR", "FLOWN", "FLUSH", "FLUTE",
  "FOGGY", "FORGE", "FRAIL", "FREAK", "FRIED", "FROST", "FROWN", "FROZE",
  "FUDGE", "FUNGI",
  // G
  "GAMMA", "GAUGE", "GECKO", "GENRE", "GHOST", "GLARE", "GLEAM", "GLIDE",
  "GLOOM", "GLORY", "GLOVE", "GNOME", "GOOSE", "GORGE", "GRAIN", "GRASP",
  "GRAVY", "GREED", "GREET", "GRIEF", "GRILL", "GRIME", "GRIND", "GROVE",
  "GROWL", "GRUNT", "GUAVA", "GUILT", "GULLY", "GUSTO", "GUSTY",
  // H
  "HAIRY", "HANDY", "HARDY", "HARSH", "HASTE", "HASTY", "HATCH", "HAUNT",
  "HAVEN", "HAZEL", "HEFTY", "HERON", "HILLY", "HINGE", "HIPPO", "HOBBY",
  "HOLLY", "HONEY", "HUMID", "HURRY", "HUSKY", "HYENA",
  // I
  "IGLOO", "INFER", "INERT", "INGOT", "INLET", "IRATE", "ITCHY", "IVORY",
  // J & K
  "JEWEL", "JOLLY", "JUMBO", "JUROR", "KARMA", "KAYAK", "KEBAB", "KHAKI",
  "KIOSK", "KITTY", "KNELT", "KOALA",
  // L
  "LAPSE", "LARVA", "LATCH", "LATTE", "LEAFY", "LEAKY", "LEDGE", "LEECH",
  "LEFTY", "LILAC", "LINEN", "LIVER", "LLAMA", "LODGE", "LOFTY", "LOUSY",
  "LOYAL", "LUNAR", "LURCH", "LYING", "LYRIC",
  // M
  "MANGO", "MANIA", "MANIC", "MAPLE", "MARSH", "MASON", "MEDAL", "MELON",
  "MERCY", "MERGE", "MERIT", "MIDST", "MIMIC", "MINER", "MOIST", "MOSSY",
  "MOTEL", "MOTIF", "MOTTO", "MOUND", "MOWER", "MUMMY", "MURAL", "MURKY",
  "MUSHY", "MUSTY",
  // N & O
  "NANNY", "NASAL", "NAVAL", "NEEDY", "NIECE", "NINJA", "NINTH", "NOBLE",
  "NOMAD", "NUDGE", "NUTTY", "OASIS", "OLIVE", "ONION", "OPERA", "ORGAN",
  "OTTER", "OUNCE", "OZONE",
  // P
  "PANDA", "PANIC", "PARKA", "PASTA", "PASTY", "PATCH", "PAUSE", "PEACH",
  "PENNY", "PERCH", "PESTO", "PETAL", "PETTY", "PHONY", "PINCH", "PINKY",
  "PIXEL", "PLAZA", "PLEAD", "PLUCK", "PLUMB", "PLUMP", "PLUSH", "POLAR",
  "PORCH", "POSSE", "POUCH", "PRANK", "PRAWN", "PRONE", "PRONG", "PROSE",
  "PROXY", "PRUNE", "PSALM", "PUFFY", "PUPPY", "PUTTY", "PYGMY",
  // Q
  "QUAKE", "QUART", "QUERY", "QUEUE", "QUILL", "QUILT", "QUIRK",
  // R
  "RACER", "RAINY", "RALLY", "RAMEN", "RAVEN", "RAZOR", "REACT", "REIGN",
  "RELIC", "REPAY", "RERUN", "RESET", "RETRO", "RHINO", "RIDGE", "RIFLE",
  "RINSE", "RIPEN", "RISEN", "ROCKY", "RODEO", "ROOMY", "ROTOR", "ROVER",
  "RUDDY", "RUGBY", "RUSTY",
  // S
  "SALSA", "SANDY", "SASSY", "SAUNA", "SAVOR", "SCARF", "SCENT", "SCOLD",
  "SCOOP", "SCRAP", "SCRUB", "SCUBA", "SEDAN", "SEEDY", "SERUM", "SHACK",
  "SHADE", "SHADY", "SHAKE", "SHARD", "SHARK", "SHAWL", "SHEAR", "SHINY",
  "SHOVE", "SHRED", "SHRUB", "SHRUG", "SILKY", "SKATE", "SKIRT", "SKULL",
  "SKUNK", "SLANG", "SLASH", "SLATE", "SLEEK", "SLICE", "SLICK", "SLOPE",
  "SLOTH", "SMASH", "SMEAR", "SMELL", "SMIRK", "SNACK", "SNAIL", "SNARE",
  "SNIFF", "SNOUT", "SNOWY", "SOLAR", "SONIC", "SPADE", "SPAWN", "SPIKE",
  "SPOIL", "SPORE", "SPOON", "SQUAD", "SQUID", "STAIN", "STAIR", "STALE",
  "STALK", "STAMP", "STASH", "STEEP", "STERN", "STING", "STINK", "STOIC",
  "STOOP", "STOUT", "STRAP", "STRAW", "STRAY", "STRUT", "STUMP", "STUNT",
  "SUAVE", "SUSHI", "SWAMP", "SWEAR", "SWEAT", "SWEEP", "SWELL", "SWEPT",
  "SWINE", "SWING", "SWIRL", "SWOOP", "SWORD", "SWUNG", "SYRUP",
  // T
  "TALON", "TANGO", "TARDY", "TEMPO", "TEPID", "THIEF", "THIGH", "THORN",
  "THUMP", "TIARA", "TIDAL", "TIMID", "TITAN", "TONAL", "TORCH", "TORSO",
  "TOXIC", "TRACE", "TRAIL", "TROUT", "TRUCE", "TULIP", "TUNIC", "TURBO",
  "TUTOR", "TWEAK", "TWEET", "TWIRL", "TWIST",
  // U
  "UDDER", "ULCER", "ULTRA", "UNCLE", "UNFIT", "UNIFY", "UNITE", "UNZIP",
  "USHER",
  // V
  "VALET", "VALOR", "VENOM", "VILLA", "VINYL", "VIPER", "VIVID", "VOCAL",
  "VOICE", "VOGUE", "VOWEL",
  // W
  "WAGER", "WAGON", "WAIST", "WALTZ", "WEARY", "WEAVE", "WEDGE", "WEIGH",
  "WEIRD", "WHACK", "WHARF", "WHEAT", "WHINE", "WHIRL", "WIDEN", "WIDTH",
  "WIELD", "WINDY", "WISPY", "WITTY", "WOKEN", "WOVEN", "WRATH", "WREAK",
  "WRECK", "WRING",
  // Y & Z
  "YEAST", "YIELD", "YODEL", "YUMMY", "ZESTY",
];

/**
 * Runtime safety net: keep only well-formed 5-letter A–Z words and
 * de-duplicate into a Set for O(1) lookups.
 */
function buildWordSet(): Set<string> {
  const set = new Set<string>();
  for (const raw of RAW_WORDS) {
    const word = raw.toUpperCase();
    if (/^[A-Z]{5}$/.test(word)) {
      set.add(word);
    } else if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn(`[dictionary] Dropping malformed entry: "${raw}"`);
    }
  }
  return set;
}

export const WORD_SET: Set<string> = buildWordSet();

export const WORD_LIST: string[] = Array.from(WORD_SET).sort();

export const WORD_COUNT = WORD_LIST.length;

/**
 * Runtime learning: the AI Referee adds words verified via the online
 * fallback (see wordVerifier.ts) to the live word set, so future swap,
 * suggestion and board-exhaustion checks accept them.
 */
export function addWord(word: string): void {
  const target = word.toUpperCase();
  if (/^[A-Z]{5}$/.test(target)) {
    WORD_SET.add(target);
  }
}

/** True when `word` exists in the dictionary (case-insensitive). */
export function isDictionaryWord(word: string): boolean {
  return WORD_SET.has(word.toUpperCase());
}

/** Picks a random dictionary word, avoiding anything in `exclude`. */
export function randomWord(exclude: string[] = []): string {
  const excluded = new Set(exclude.map((w) => w.toUpperCase()));
  const pool = WORD_LIST.filter((w) => !excluded.has(w));
  const source = pool.length > 0 ? pool : WORD_LIST;
  return source[Math.floor(Math.random() * source.length)];
}
