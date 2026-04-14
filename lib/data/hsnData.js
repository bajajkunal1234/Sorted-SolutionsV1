/**
 * HSN (Harmonized System of Nomenclature) codes for goods
 * and SAC (Services Accounting Code) codes for services.
 *
 * Biased towards HVAC, appliances, electronics, and field services —
 * relevant to an AC/appliance service company like Sorted Solutions.
 *
 * Usage:
 *   import { lookupHSN } from '@/lib/data/hsnData';
 *   const desc = lookupHSN('8415'); // "Air conditioning machines"
 */

// ── HSN Codes (Goods) ─────────────────────────────────────────────────────────

const HSN_CODES = {
    // Chapter 84 — Machinery & Mechanical Appliances (core for AC/HVAC)
    '8415':     'Air conditioning machines, comprising a motor-driven fan and elements for changing temperature and humidity',
    '84151':    'Air conditioning machines — window / wall type, self-contained',
    '841510':   'Air conditioning machines — of a kind used for persons in motor vehicles',
    '841581':   'Air conditioning machines — other, incorporating a refrigerating unit',
    '841582':   'Air conditioning machines — other, not incorporating refrigerating unit',
    '841583':   'Air conditioning machines — split system units',
    '841590':   'Parts of air conditioning machines',
    '8414':     'Air or vacuum pumps, air or gas compressors and fans; ventilating hoods',
    '84143':    'Compressors of a kind used in refrigerating equipment',
    '84145':    'Fans — table, floor, wall, window, ceiling or roof type',
    '84146':    'Hoods having a maximum horizontal side not exceeding 120 cm',
    '84149':    'Parts of air or vacuum pumps, compressors and fans',
    '8418':     'Refrigerators, freezers and other refrigerating or freezing equipment; heat pumps',
    '84181':    'Combined refrigerator-freezers, fitted with separate external doors',
    '84182':    'Refrigerators, household type',
    '84183':    'Freezers of the chest type, not exceeding 800 litres capacity',
    '84184':    'Freezers of the upright type, not exceeding 900 litres capacity',
    '84185':    'Other refrigerating or freezing chests, cabinets, display counters etc.',
    '84186':    'Heat pumps other than air conditioning machines of heading 8415',
    '84189':    'Parts of refrigerators, freezers and refrigerating equipment',
    '8419':     'Machinery, plant or laboratory equipment for heat treatment of materials',
    '8421':     'Centrifuges; filtering/purifying machinery for liquids or gases',
    '84213':    'Oil or petrol-filters for internal combustion engines',
    '84219':    'Parts of centrifuges and filtering/purifying machinery',
    '8422':     'Dish washing machines; machinery for cleaning bottles; packaging machinery',
    '8450':     'Household or laundry-type washing machines',
    '84501':    'Fully-automatic washing machines, capacity not exceeding 10 kg',
    '84502':    'Other washing machines with built-in centrifugal dryer',
    '84509':    'Parts of washing machines',
    '8451':     'Machinery for washing, cleaning, drying, ironing, pressing textile fabrics',
    '8452':     'Sewing machines, other than book-sewing machines; furniture for sewing machines',
    '8467':     'Tools for working in the hand, pneumatic, hydraulic or electric motor',
    '84671':    'Rotary type (including combined rotary-percussion) — drills',
    '84679':    'Parts of pneumatic, hydraulic or motor-driven hand tools',
    '8473':     'Parts and accessories for machines of headings 8469 to 8472',
    '84733':    'Parts and accessories of automatic data-processing machines',

    // Chapter 85 — Electrical Machinery & Equipment
    '8501':     'Electric motors and generators (excluding generating sets)',
    '85011':    'Motors of an output not exceeding 37.5 W',
    '85012':    'Universal AC/DC motors of an output exceeding 37.5 W',
    '85013':    'Other DC motors and DC generators',
    '85014':    'Other AC motors, single-phase',
    '85015':    'Other AC motors, multi-phase',
    '8504':     'Electrical transformers, static converters (e.g., rectifiers) and inductors',
    '85044':    'Static converters',
    '85045':    'Inductors',
    '8507':     'Electric accumulators, including separators therefor, whether or not rectangular',
    '85076':    'Lithium-ion accumulators',
    '8509':     'Electromechanical domestic appliances, with self-contained electric motor',
    '85091':    'Vacuum cleaners',
    '85092':    'Floor polishers',
    '85094':    'Food grinders, processors and mixers; fruit or vegetable juice extractors',
    '85098':    'Other electromechanical domestic appliances',
    '85099':    'Parts of electromechanical domestic appliances',
    '8516':     'Electric water heaters, hair dryers, electric smoothing irons, microwave ovens',
    '85161':    'Electric instantaneous or storage water heaters and immersion heaters',
    '85162':    'Electric space heating apparatus and soil heating apparatus',
    '85163':    'Electrothermic hair-dressing or hand-drying apparatus',
    '85164':    'Electric smoothing irons',
    '85165':    'Microwave ovens',
    '85166':    'Other ovens; cookers, cooking plates, boiling rings, grillers and roasters',
    '85167':    'Coffee or tea makers',
    '85168':    'Toasters',
    '85169':    'Other electrothermic appliances',
    '85161':    'Parts of electrothermic appliances',
    '8517':     'Telephone sets including smartphones; apparatus for transmission/reception of voice, images or other data',
    '85171':    'Telephones for cellular networks or other wireless networks — smartphones',
    '85178':    'Other apparatus for transmission or reception',
    '85179':    'Parts of telephone and communication apparatus',
    '8523':     'Discs, tapes, solid-state non-volatile storage devices for recording sound etc.',
    '85234':    'Optical media — CDs, DVDs and similar',
    '85235':    'Semiconductor media — USB flash drives, solid-state drives',
    '8524':     'Flat panel display modules',
    '8527':     'Reception apparatus for radio-broadcasting',
    '8528':     'Monitors and projectors; reception apparatus for television',
    '85281':    'Cathode-ray tube monitors',
    '85282':    'Other monitors — LED/LCD monitors',
    '85287':    'Reception apparatus for television, colour',
    '8536':     'Electrical apparatus for switching or protecting electrical circuits',
    '85361':    'Fuses',
    '85362':    'Automatic circuit breakers',
    '85363':    'Other apparatus for protecting electrical circuits',
    '85364':    'Relays',
    '85365':    'Switches — other for a voltage not exceeding 1000 V',
    '85369':    'Other electrical apparatus for switching — sockets, plugs, connectors',
    '8537':     'Boards, panels, consoles, desks, cabinets for electric control or distribution',
    '8538':     'Parts for electrical switches, fuses, circuit breakers (heading 8535-8537)',
    '8539':     'Electric filament or discharge lamps; LED lamps and light sources',
    '85393':    'Fluorescent lamps, hot cathode',
    '85394':    'Mercury or sodium vapour lamps; metal halide lamps',
    '85395':    'LED lamps',
    '8544':     'Insulated wire, cable and other insulated electric conductors',
    '85441':    'Winding wire — of copper',
    '85442':    'Co-axial cable and other co-axial electric conductors',
    '85443':    'Ignition wiring sets and other wiring sets for vehicles',
    '85444':    'Other electric conductors for a voltage not exceeding 80 V',
    '85449':    'Other insulated electric conductors',

    // Chapter 39 — Plastics
    '3917':     'Tubes, pipes and hoses of plastics',
    '3926':     'Other articles of plastics and articles of other materials',

    // Chapter 73 — Articles of Iron or Steel
    '7304':     'Tubes, pipes and hollow profiles, seamless, of iron or steel',
    '7308':     'Structures and parts of structures of iron or steel',
    '7318':     'Screws, bolts, nuts, coach-screws, screw hooks of iron or steel',
    '7323':     'Table, kitchen or other household articles of iron or steel',
    '7326':     'Other articles of iron or steel',

    // Chapter 74 — Copper and articles thereof
    '7408':     'Copper wire',
    '7411':     'Copper tubes and pipes',
    '7412':     'Copper tube or pipe fittings',

    // Chapter 76 — Aluminium and articles thereof
    '7604':     'Aluminium bars, rods and profiles',
    '7608':     'Aluminium tubes and pipes',
    '7610':     'Aluminium structures and parts of structures',
    '7616':     'Other articles of aluminium',

    // Chapter 40 — Rubber
    '4009':     'Tubes, pipes and hoses of vulcanised rubber',
    '4016':     'Other articles of vulcanised rubber',

    // Chapter 84 continued — General machinery
    '8424':     'Mechanical appliances for projecting, dispersing or spraying liquids or powders',
    '8425':     'Pulley tackle and hoists other than skip hoists; winches and capstans',
    '8431':     'Parts for lifting, handling, loading or unloading machinery',
    '8481':     'Taps, cocks, valves and similar appliances for pipes, tanks, etc.',
    '84812':    'Valves for oleohydraulic or pneumatic transmissions',
    '84813':    'Check (nonreturn) valves',
    '84814':    'Safety or relief valves',
    '84815':    'Pressure-reducing valves',
    '84818':    'Other taps, cocks and valves',
    '8482':     'Ball or roller bearings',
    '8483':     'Transmission shafts (including cam shafts and crank shafts), cranks, bearing housings',
    '8484':     'Gaskets and similar joints of metal sheeting combined with other material',
    '8487':     'Machinery parts not containing electrical connectors, insulators, coils etc.',

    // Chapter 27 — Mineral fuels, oils
    '2710':     'Petroleum oils and oils obtained from bituminous minerals, crude',
    '27101':    'Petroleum oils and preparations — motor spirit (petrol)',
    '27109':    'Other petroleum oils and preparations — lubricating oils, greases',
    '2716':     'Electrical energy',

    // Chapter 34 — Soap, lubricants, cleaning agents
    '3402':     'Organic surface-active agents; washing preparations; cleaning preparations',
    '3403':     'Lubricating preparations and preparations of a kind used for the oil treatment',
    '3407':     'Modelling pastes; preparations known as dental wax',

    // Chapter 96 — Miscellaneous manufactured articles
    '9603':     'Brooms, brushes, mops and feather dusters; squeegees',
    '9619':     'Sanitary towels, tampons, napkins and napkin liners, similar articles',

    // Chapter 90 — Optical, measuring and precision instruments
    '9026':     'Instruments for measuring or checking the flow, level, pressure of liquids or gases',
    '9032':     'Automatic regulating or controlling instruments and apparatus',

    // Chapter 38 — Miscellaneous chemicals
    '3808':     'Insecticides, rodenticides, fungicides, herbicides, disinfectants',
    '3814':     'Organic composite solvents and thinners',
    '3820':     'Anti-freezing preparations and prepared de-icing fluids',
    '3824':     'Prepared binders for foundry moulds; chemical products not elsewhere specified',
    '38249':    'Refrigerant gases — R-22, R-32, R-410A (preparations for refrigerating systems)',
};

// ── SAC Codes (Services) ──────────────────────────────────────────────────────

const SAC_CODES = {
    // HVAC & AC Services (most relevant)
    '995428':   'Installation services of AC, refrigeration plant and associated equipment',
    '995429':   'Other installation services for industrial, commercial buildings',
    '998714':   'Maintenance and repair services of office and accounting machinery',
    '998719':   'Maintenance and repair of other machinery and equipment',
    '998711':   'Maintenance and repair services of computers and peripheral equipment',
    '998712':   'Maintenance and repair services of communications equipment',
    '998713':   'Maintenance and repair services of consumer electronics',
    '998715':   'Maintenance and repair services of electrical household appliances',
    '998716':   'Maintenance and repair service of electrical and optical equipment',
    '998717':   'Maintenance and repair services of transport equipment (non-automotive)',
    '998718':   'Maintenance and repair services of medical and optical instruments',

    // Repair & Maintenance
    '998519':   'Other repair and maintenance services n.e.c.',
    '998511':   'Maintenance and repair services of fabricated metal products',
    '998512':   'Maintenance and repair services of industrial machinery and equipment',
    '998513':   'Maintenance and repair services of commercial and industrial buildings',
    '998531':   'Maintenance and repair services of motor vehicles',
    '998532':   'Maintenance and repair services of motorcycles',
    '998533':   'Maintenance and repair services of bicycles and invalid carriages',

    // Installation Services
    '995411':   'Electrical installation services including electrical wiring and fitting',
    '995412':   'Water plumbing and drain laying services',
    '995413':   'Heating, ventilation and AC equipment installation services',
    '995414':   'Gas fitting installation services',
    '995415':   'Insulation services',
    '995416':   'Lift and escalator installation services',
    '995417':   'Other installation services n.e.c.',
    '995421':   'Site preparation services',
    '995422':   'Excavating and earthmoving services',
    '995423':   'Water well drilling services',
    '995424':   'Scaffolding services',
    '995425':   'Foundation and pile driving services',
    '995426':   'Building completion and finishing services',
    '995427':   'Painting services',

    // Professional & Technical Services
    '998311':   'Management consulting and management advisory services',
    '998312':   'Business consulting services including public relations services',
    '998314':   'Information technology consulting and support services',
    '998315':   'Engineering consulting and advisory services',
    '998316':   'Technical testing and analysis services',
    '998331':   'Accounting, auditing and bookkeeping services',
    '998332':   'Taxation services',
    '998333':   'Payroll services',

    // IT & Software Services
    '998391':   'Computer programming services',
    '998392':   'Computer consultancy and computer facilities management services',
    '998393':   'Development, production, supply and documentation of customised software',
    '998394':   'Information technology infrastructure and network management services',
    '998395':   'Data processing and management services',
    '998396':   'Database services',
    '998397':   'Online information provision services',
    '998399':   'Other information technology services',

    // Support Services
    '998511':   'Cleaning and janitorial services',
    '998512':   'Pest control and fumigation services',
    '998513':   'Gardening and landscaping services',
    '998521':   'Services to buildings — cleaning services',
    '998522':   'Repair services to household equipment',
    '998523':   'Disinfecting and exterminating services',
    '998524':   'Window cleaning services',

    // Transport & Logistics
    '996511':   'Intra-city transportation of goods by road',
    '996512':   'Inter-city transportation of goods by road',
    '996513':   'Transportation of goods by rail',
    '996521':   'Transportation of goods by sea in domestic voyages',
    '996601':   'Courier and postal services',
    '996603':   'Courier services',

    // Financial Services
    '997111':   'Central banking services',
    '997119':   'Other monetary intermediation services',
    '997131':   'Financial leasing services',
    '997133':   'Operating leasing services',

    // Training & Education
    '999291':   'Technical and vocational secondary education services',
    '999293':   'Higher education services',
    '999295':   'Specialty education services',
    '999299':   'Other education and training services n.e.c.',

    // Rental / Lease
    '997211':   'Rental or leasing services involving own or leased residential property',
    '997212':   'Rental or leasing services involving own or leased non-residential property',
    '997221':   'Rental or leasing services involving own or leased transport vehicles',
    '997229':   'Other rental and leasing services',
};

// Combined lookup
const ALL_CODES = { ...HSN_CODES, ...SAC_CODES };

/**
 * Look up description for a given HSN or SAC code.
 * Tries exact match first, then prefix match (longest matching prefix).
 *
 * @param {string} code - The HSN or SAC code to look up
 * @returns {{ description: string, isExact: boolean } | null}
 */
export function lookupHSN(code) {
    if (!code || typeof code !== 'string') return null;
    const cleaned = code.trim().replace(/\s+/g, '');
    if (!cleaned) return null;

    // Exact match
    if (ALL_CODES[cleaned]) {
        return { description: ALL_CODES[cleaned], isExact: true };
    }

    // Prefix match — find the longest key that is a prefix of the input
    let bestKey = null;
    let bestLen = 0;
    for (const key of Object.keys(ALL_CODES)) {
        if (cleaned.startsWith(key) && key.length > bestLen) {
            bestKey = key;
            bestLen = key.length;
        }
    }
    if (bestKey) {
        return { description: ALL_CODES[bestKey], isExact: false };
    }

    // Reverse prefix — input is prefix of a key (user is still typing)
    const partialMatches = Object.entries(ALL_CODES)
        .filter(([key]) => key.startsWith(cleaned))
        .sort((a, b) => a[0].length - b[0].length); // shortest key first

    if (partialMatches.length > 0) {
        return { description: partialMatches[0][1], isExact: false, partial: true };
    }

    return null;
}

/**
 * Search HSN/SAC codes by description keyword.
 * Returns up to `limit` matches sorted by match quality.
 *
 * @param {string} query
 * @param {number} limit
 * @returns {Array<{ code: string, description: string }>}
 */
export function searchHSN(query, limit = 8) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return Object.entries(ALL_CODES)
        .filter(([, desc]) => desc.toLowerCase().includes(q))
        .slice(0, limit)
        .map(([code, description]) => ({ code, description }));
}

export { HSN_CODES, SAC_CODES, ALL_CODES };
