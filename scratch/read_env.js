const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
console.log("Env keys:", Object.keys(process.env).filter(k => k.includes('DB') || k.includes('DATABASE') || k.includes('POSTGRES') || k.includes('URL') || k.includes('KEY')));
