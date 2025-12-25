const fs = require('fs');
const path = require('path');

const ADDONS_SRC = path.join(__dirname, '../addons');
const PUBLIC_ADDONS = path.join(__dirname, '../public/addons');

if (!fs.existsSync(PUBLIC_ADDONS)) {
    fs.mkdirSync(PUBLIC_ADDONS, { recursive: true });
}

function buildAddons() {
    if (!fs.existsSync(ADDONS_SRC)) {
        console.log("No addons directory found.");
        fs.writeFileSync(path.join(PUBLIC_ADDONS, 'registry.json'), JSON.stringify([]));
        return;
    }

    const addons = fs.readdirSync(ADDONS_SRC).filter(f => fs.statSync(path.join(ADDONS_SRC, f)).isDirectory());
    const registry = [];

    console.log(`Building ${addons.length} addons...`);

    addons.forEach(id => {
        const addonDir = path.join(ADDONS_SRC, id);
        const manifestPath = path.join(addonDir, 'manifest.json');

        if (fs.existsSync(manifestPath)) {
            try {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                registry.push({
                    id: id,
                    name: manifest.name || id,
                    version: manifest.version || '0.0.0',
                    permissions: manifest.permissions || [],
                    configSchema: manifest.configSchema || {}
                });

                // Copy UI assets if 'ui' folder exists
                const uiDir = path.join(addonDir, 'ui');
                if (fs.existsSync(uiDir)) {
                    const targetDir = path.join(PUBLIC_ADDONS, id);
                    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

                    fs.cpSync(uiDir, targetDir, { recursive: true });
                    console.log(`  + UI copied for ${id}`);
                }
            } catch (e) {
                console.error(`Error processing addon ${id}:`, e.message);
            }
        }
    });

    fs.writeFileSync(path.join(PUBLIC_ADDONS, 'registry.json'), JSON.stringify(registry, null, 2));
    console.log(`Registry generated with ${registry.length} entries.`);
}

buildAddons();
