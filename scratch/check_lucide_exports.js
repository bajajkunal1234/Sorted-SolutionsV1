const lucide = require('lucide-react');

const searchTerms = ['Motorcycle', 'Motorbike', 'Scooter', 'Bike', 'Loader', 'Loader2', 'Power', 'Play', 'RefreshCw'];

console.log("Checking Lucide-React exports:");
searchTerms.forEach(term => {
    console.log(`- ${term}: ${lucide[term] !== undefined ? 'AVAILABLE' : 'NOT FOUND'}`);
});
