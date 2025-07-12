const fs = require('fs');
const path = require('path');

const arches = ['rollup-linux-x64-gnu', 'rollup-darwin-x64', 'rollup-darwin-arm64'];

console.log('Creating Rollup stubs for cross-platform compatibility...');

arches.forEach(arch => {
  try {
    const dir = path.join(__dirname, '..', 'node_modules', '@rollup', arch);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const indexPath = path.join(dir, 'index.js');
    if (!fs.existsSync(indexPath)) {
      fs.writeFileSync(indexPath, "module.exports = require('rollup');\\n");
    }

    const pkgPath = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      const pkgContent = JSON.stringify({ name: `@rollup/${arch}`, version: '0.0.0' });
      fs.writeFileSync(pkgPath, pkgContent);
    }
    console.log(`  ✓ Stub created for ${arch}`);
  } catch (error) {
    // Suppress errors if node_modules doesn't exist yet, as this can run during install
    if (error.code !== 'ENOENT') {
      console.warn(`  ✗ Failed to create stub for ${arch}:`, error.message);
    }
  }
});

console.log('Rollup stub creation complete.'); 