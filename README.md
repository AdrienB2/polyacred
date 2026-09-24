# 🏷️ PolyAcred — Figma Accreditation Badge Generator

[![Figma Plugin](https://img.shields.io/badge/Figma-Plugin-F24E1E?logo=figma&logoColor=white)](#-installing-in-figma-from-source)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**PolyAcred** is a Figma plugin built for event organizers, designers, and staff managers. It automates bulk accreditation badge creation directly from CSV datasets with support for dynamic text, layer visibility toggling, component variant switching, and instant ZIP exports.

---

## ✨ Key Features

- **📄 CR80 Standard Multi-Page PDF Export**: Export all badges into a single, combined multi-page PDF document in standard CR80 format (85.60 × 53.98 mm / ISO/IEC 7810 ID-1), ready for bulk and professional card printing.
- **🔄 Double-Sided (Duplex) Printing Support**: Select a badge Back template to automatically interleave it between each badge front (`Front 1`, `Back`, `Front 2`, `Back`...) in the multi-page PDF for direct duplex printing.
- **📊 CSV Data Import**: Import attendee datasets with support for custom headers, quotes, and commas.
- **🔤 Dynamic Text Layer Mapping**: Map CSV columns directly to text layers (e.g. Name, Role, Company, ID).
- **👁️ Visibility Control (Boolean Mapping)**: Toggle layer visibilities (e.g. `ALL ACCESS`, `VIP`, `STAFF`, `SPEAKER` badges) based on CSV flags (`true`/`false`, `1`/`0`, `yes`/`no`).
- **🔄 Component Variant Switching**: Dynamically switch instance variants per attendee (e.g. category colors, access level badges, or icons).
- **🖼️ Figma Canvas Grid Mode**: Option to generate cloned badge frames (front & back) directly on your Figma page layout.
- **🏷️ Export 1 Specimen Badge (No CSV Required)**: Export a single specimen sample badge directly in your chosen output mode (CR80 PDF, ZIP archive, or Canvas) without needing to upload a CSV dataset.
- **🔍 Canvas Preview**: Instantly generate a single test preview badge on the Figma canvas to quickly check typography, layer visibilities, and alignment.

---

## 💻 Installing in Figma from Source

Follow these steps to run PolyAcred locally in Figma from this repository:

### 1. Clone & Build
```bash
# Clone repository
git clone https://github.com/AdrienB2/polyacred
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

1. **Design your Badge**: Create your front badge template frame or component in Figma (and optionally a back template frame).
2. **Open PolyAcred**: Launch the plugin via **Plugins** → **Development** → **PolyAcred**.
3. **Select Templates**:
   - Select your front badge frame on canvas and assign it as **Front Template**.
   - (Optional) Check **Include Back of Badge**, select your back frame on canvas, and assign it as **Back Template**.
4. **Quick Specimen Export (Optional CSV)**:
   - To export a sample badge immediately (without uploading any CSV), choose your output mode and click `🏷️ Export 1 Specimen` (or `🔍 Canvas Preview`).
5. **Bulk Batch Generation**:
   - Upload your staff list CSV file containing headers (e.g. `Name`, `Role`, `VIP`, `Variant`).
   - Map CSV columns to target layers.
   - Click `Export Multi-Page PDF` (or `Export Badges ZIP` / `Generate on Canvas`) to batch generate all badges.

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
