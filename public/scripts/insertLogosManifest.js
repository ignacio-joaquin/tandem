const fs = require('fs');
const path = require('path');

const logosDir = path.join(__dirname, '../logos/ios');
const manifestPath = path.join(__dirname, '../manifest.json');
console.log('logosDir:', logosDir);
console.log('manifestPath:', manifestPath);

// Read the existing manifest file
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Read all files in the logos directory
const logoFiles = fs.readdirSync(logosDir).filter(file => file.endsWith('.png'));
console.log('logoFiles:', logoFiles);

// Generate icon entries
const icons = logoFiles.map(file => {
  const sizeMatch = file.match(/\d+x\d+/);
  const size = sizeMatch ? sizeMatch[0] : `${file.split('.')[0]}x${file.split('.')[0]}`; // Use filename as size if no match
  return {
    src: `/logos/ios/${file}`,
    sizes: size,
    type: 'image/png'
  };
});

// Update the manifest icons
manifest.icons = icons;

// Write the updated manifest back to the file
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log('Manifest updated with icons:', icons);