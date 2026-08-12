# 🏷️ PolyAcred — Figma Accreditation Badge Generator

[![Figma Plugin](https://img.shields.io/badge/Figma-Plugin-F24E1E?logo=figma&logoColor=white)](#-installing-in-figma-from-source)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**PolyAcred** is a Figma plugin built for event organizers, designers, and staff managers. It automates bulk accreditation badge creation directly from CSV datasets with support for dynamic text, layer visibility toggling, component variant switching, and instant ZIP exports.

---

## ✨ Key Features

- **📊 CSV Data Import**: Import attendee datasets with support for custom headers, quotes, and commas.
- **🔤 Dynamic Text Layer Mapping**: Map CSV columns directly to text layers (e.g. Name, Role, Company, ID).
- **👁️ Visibility Control (Boolean Mapping)**: Toggle layer visibilities (e.g. `ALL ACCESS`, `VIP`, `STAFF`, `SPEAKER` badges) based on CSV flags (`true`/`false`, `1`/`0`, `yes`/`no`).
- **🔄 Component Variant Switching**: Dynamically switch instance variants per attendee (e.g. category colors, access level badges, or icons).
- **📦 Instant ZIP File Export**: Render and compress hundreds of badges into a downloadable `.zip` archive (PNG, PDF, SVG at 1x, 2x, or 3x resolutions) without cluttering or lagging your Figma canvas.
- **🖼️ Figma Canvas Grid Mode**: Option to generate cloned badge frames directly on your Figma page layout.
- **🔍 Single-Badge Test Preview**: Generate a single test badge from the first CSV record to verify typography, layer visibilities, and alignment before running batch generation.
- **🔠 Auto Font Loading**: Pre-loads required font styles before processing to eliminate missing font errors.

---

## 💻 Installing in Figma from Source

Follow these steps to run PolyAcred locally in Figma from this repository:

### 1. Clone & Build
```bash
# Clone repository
git clone https://github.com/your-username/polyacred.git
cd polyacred

# Install dependencies and build code.js
npm install
npm run build
```

### 2. Load Manifest in Figma Desktop App
1. Open the **Figma Desktop App**.
2. Go to **Plugins** menu:
   - Click **Figma Logo** (top-left) → **Plugins** → **Development** → **Import plugin from manifest...**.
3. Select the `manifest.json` file inside the cloned `polyacred` folder.
4. PolyAcred is now loaded under **Plugins** → **Development** → **PolyAcred**.

---

## 🚀 How to Use

1. **Design your Badge**: Create your badge template frame or component in Figma.
2. **Open PolyAcred**: Launch the plugin via **Plugins** → **Development** → **PolyAcred** and select your badge frame on the canvas.
3. **Upload Staff CSV**: Upload your staff list CSV file containing headers (e.g. `Name`, `Role`, `VIP`, `Variant`).
4. **Select Output Mode**:
   - **Export to ZIP File**: Exports individual badge files directly into a downloadable `.zip` archive (recommended for large events).
   - **Create on Figma Canvas**: Places cloned badge frames in a grid on your current Figma page.
5. **Map Columns**: Map each CSV column to its target layer and mapping type (*Text Content*, *Visibility*, or *Component Variant*).
6. **Test Preview**: Click `🔍 Test Preview (1 Badge)` to verify badge layout and text wrapping.
7. **Generate Badges**: Click `Generate All Badges` to process your entire dataset.

---

## 🛠️ Development & Building

### Prerequisites
- Node.js (v18 or higher)
- npm

### Development Commands

```bash
# Watch mode for automatic compilation while editing code
npm run watch

# Run linter & code formatter
npm run lint:fix
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).