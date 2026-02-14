// Common problems by category and subcategory
export const problemsByCategory = {
    'ac-repair': {
        'window-ac': [
            'AC not cooling properly',
            'AC making loud noise',
            'Water leaking from AC',
            'AC not turning on',
            'AC remote not working',
            'AC tripping circuit breaker',
            'Foul smell from AC',
            'AC freezing up'
        ],
        'split-ac': [
            'Split AC not cooling',
            'Indoor unit leaking water',
            'Outdoor unit not running',
            'AC compressor not working',
            'AC making rattling noise',
            'AC blowing warm air',
            'AC remote issues',
            'AC display not working'
        ],
        'cassette-ac': [
            'Cassette AC not cooling',
            'Uneven cooling distribution',
            'Water dripping from cassette',
            'Cassette AC making noise',
            'AC not responding to remote',
            'AC filter needs cleaning',
            'AC compressor issues',
            'AC electrical problems'
        ]
    },
    'oven-repair': {
        'microwave-oven': [
            'Microwave not heating',
            'Oven not starting',
            'Oven tripping home light',
            'Oven making sparking noises',
            'Turntable not rotating',
            'Door not closing properly',
            'Display not working',
            'Buttons not responding'
        ],
        'otg-oven': [
            'OTG not heating',
            'Uneven heating',
            'Timer not working',
            'Heating element damaged',
            'Door hinge broken',
            'Temperature control issues',
            'OTG tripping power',
            'Light not working'
        ],
        'deck-oven': [
            'Deck oven not heating',
            'Temperature inconsistency',
            'Oven door seal damaged',
            'Heating elements not working',
            'Thermostat malfunction',
            'Oven tripping breaker',
            'Control panel issues',
            'Oven taking too long to heat'
        ]
    },
    'washing-machine-repair': [
        'Machine not starting',
        'Not draining water',
        'Excessive vibration',
        'Water leakage',
        'Drum not spinning',
        'Making loud noise',
        'Door not opening/closing',
        'Not filling with water',
        'Clothes not getting clean',
        'Error codes displaying'
    ],
    'refrigerator-repair': [
        'Fridge not cooling',
        'Freezer not freezing',
        'Water leaking inside',
        'Ice buildup',
        'Compressor not running',
        'Fridge making noise',
        'Door seal damaged',
        'Light not working',
        'Temperature fluctuation',
        'Excessive frost formation'
    ],
    'water-purifier-repair': [
        'RO not purifying water',
        'Water leakage',
        'Low water flow',
        'Bad taste/smell',
        'Filter replacement needed',
        'Pump not working',
        'Storage tank issues',
        'UV lamp not working',
        'TDS level high',
        'Membrane replacement needed'
    ],
    'hob-repair': [
        'Burner not igniting',
        'Gas leakage',
        'Flame too low/high',
        'Auto-ignition not working',
        'Knob not turning',
        'Uneven flame distribution',
        'Burner cap damaged',
        'Gas smell',
        'Flame going out',
        'Burner clogged'
    ]
}

// Get problems for a specific category or subcategory
export function getProblems(category, subcategory = null) {
    if (subcategory && problemsByCategory[category]?.[subcategory]) {
        return problemsByCategory[category][subcategory]
    }

    if (problemsByCategory[category]) {
        // If category has subcategories, combine all problems
        if (typeof problemsByCategory[category] === 'object' && !Array.isArray(problemsByCategory[category])) {
            const allProblems = []
            Object.values(problemsByCategory[category]).forEach(problems => {
                allProblems.push(...problems)
            })
            // Remove duplicates
            return [...new Set(allProblems)]
        }
        return problemsByCategory[category]
    }

    return []
}
