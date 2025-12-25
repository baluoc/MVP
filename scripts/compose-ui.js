const fs = require('fs');
const path = require('path');

const UI_SRC = path.join(__dirname, '../ui-src');
const PUBLIC_DIR = path.join(__dirname, '../public');

// Ensure public dir
if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// Helpers
function loadPartial(name) {
    const p = path.join(UI_SRC, 'partials', name + '.html');
    if (!fs.existsSync(p)) return `<!-- Partial ${name} not found -->`;
    return fs.readFileSync(p, 'utf8');
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Simple include replacement: <!-- @include 'name' -->
    // Regex allows quotes or not, spaces.
    content = content.replace(/<!--\s*@include\s+['"]?([a-zA-Z0-9_\-]+)['"]?\s*-->/g, (match, p1) => {
        return loadPartial(p1);
    });

    return content;
}

function build() {
    const pagesDir = path.join(UI_SRC, 'pages');
    if (!fs.existsSync(pagesDir)) {
        console.error("Pages directory not found:", pagesDir);
        process.exit(1);
    }

    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));

    console.log(`Building ${files.length} pages...`);

    files.forEach(f => {
        const out = processFile(path.join(pagesDir, f));
        fs.writeFileSync(path.join(PUBLIC_DIR, f), out);
        console.log(`✓ ${f}`);
    });
}

build();
