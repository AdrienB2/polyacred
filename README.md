# PolyAcred
PolyAcred is a Figma plugin that allows you to create accreditation badges for the staff of your event. 

## How to use
1. Install the PolyAcred plugin from the Figma Community.
2. Create your badge design in Figma.
3. Open the PolyAcred plugin and select a CSV file containing staff information (name, role, variant, etc.).
4. Select the badge frame in Figma.
5. Choose your **Output Mode**:
   - **Export to ZIP File**: Renders each staff badge into a downloadable `.zip` file (PNG, PDF, or SVG), keeping your Figma canvas clean and performant for large events.
   - **Create on Figma Canvas**: Generates cloned frames directly on your current Figma page in a grid layout.
6. For each column in your CSV file, map it to:
   - A **text layer** to display dynamic text (e.g. staff member name or role).
   - A **boolean layer** to control element visibility (e.g. "ALL ACCESS" badge visibility).
   - A **component instance** to switch component variants (e.g. icon or badge status variants).
7. Test your configuration:
   - Click **🔍 Test Preview (1 Badge)** to generate a single test badge on your canvas using the first CSV record to verify layout and text formatting.
8. Click **Generate All Badges** to process all staff badges and trigger the ZIP download.