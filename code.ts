// PolyAcred Plugin Main Logic

figma.showUI(__html__, { width: 480, height: 710 });

interface LayerInfo {
  id: string;
  name: string;
  type: string;
  variantProperties?: Record<string, string> | null;
}

interface Mapping {
  type: 'text' | 'boolean' | 'variant';
  column: string;
  layerId: string;
}

interface GenerateMessage {
  type: 'generate-badges';
  csvData: Record<string, string>[];
  badgeNodeId: string;
  mappings: Mapping[];
  exportMode: 'canvas' | 'export-zip';
  exportFormat: 'PNG' | 'PDF' | 'SVG';
  exportScale: number;
}

interface RequestLayersMessage {
  type: 'request-layers';
  badgeNodeId: string;
}

function getLayersFromNode(node: SceneNode): LayerInfo[] {
  const layers: LayerInfo[] = [];

  function traverse(currentNode: SceneNode) {
    if (currentNode !== node) {
      let variantProps: Record<string, string> | null = null;

      if (currentNode.type === 'INSTANCE') {
        const instance = currentNode as InstanceNode;
        variantProps = instance.variantProperties;
      }

      layers.push({
        id: currentNode.id,
        name: currentNode.name,
        type: currentNode.type,
        variantProperties: variantProps
      });
    }

    if ('children' in currentNode) {
      for (const child of currentNode.children) {
        traverse(child);
      }
    }
  }

  traverse(node);
  return layers;
}

function sendSelectionState() {
  const selection = figma.currentPage.selection;
  if (
    selection.length === 1 &&
    (selection[0].type === 'FRAME' ||
      selection[0].type === 'COMPONENT' ||
      selection[0].type === 'GROUP' ||
      selection[0].type === 'SECTION')
  ) {
    const selectedNode = selection[0];
    const layers = getLayersFromNode(selectedNode);
    figma.ui.postMessage({
      type: 'selection-change',
      selectedNode: {
        id: selectedNode.id,
        name: selectedNode.name,
        type: selectedNode.type
      },
      layers
    });
  } else {
    figma.ui.postMessage({
      type: 'selection-change',
      selectedNode: null,
      layers: []
    });
  }
}

figma.on('selectionchange', () => {
  sendSelectionState();
});

figma.ui.onmessage = async (
  msg: GenerateMessage | RequestLayersMessage | { type: 'init' } | { type: 'cancel' }
) => {
  if (msg.type === 'init') {
    sendSelectionState();
    return;
  }

  if (msg.type === 'request-layers') {
    const node = (await figma.getNodeByIdAsync(msg.badgeNodeId)) as SceneNode | null;
    if (node) {
      const layers = getLayersFromNode(node);
      figma.ui.postMessage({
        type: 'layers-loaded',
        layers
      });
    }
    return;
  }

  if (msg.type === 'cancel') {
    figma.closePlugin();
    return;
  }

  if (msg.type === 'generate-badges') {
    const { csvData, badgeNodeId, mappings, exportMode, exportFormat, exportScale } = msg;

    const sourceNode = (await figma.getNodeByIdAsync(badgeNodeId)) as
      | FrameNode
      | ComponentNode
      | GroupNode
      | SectionNode
      | null;

    if (!sourceNode) {
      figma.notify('Selected badge template node could not be found.', { error: true });
      return;
    }

    figma.ui.postMessage({ type: 'status-update', text: 'Preparing badge generation...' });

    const textNodeIds = mappings
      .filter((m) => m.type === 'text')
      .map((m) => m.layerId);

    const fontsToLoad: FontName[] = [];

    function findFontsInNode(node: SceneNode) {
      if (textNodeIds.includes(node.id) && node.type === 'TEXT') {
        const textNode = node as TextNode;
        if (textNode.fontName !== figma.mixed) {
          fontsToLoad.push(textNode.fontName);
        } else {
          const len = textNode.characters.length;
          for (let i = 0; i < len; i++) {
            const font = textNode.getRangeFontName(i, i + 1);
            if (font !== figma.mixed) {
              fontsToLoad.push(font);
            }
          }
        }
      }
      if ('children' in node) {
        for (const child of node.children) {
          findFontsInNode(child);
        }
      }
    }

    findFontsInNode(sourceNode);

    const uniqueFontsMap = new Map<string, FontName>();
    for (const font of fontsToLoad) {
      uniqueFontsMap.set(`${font.family}-${font.style}`, font);
    }

    try {
      figma.ui.postMessage({ type: 'status-update', text: `Loading ${uniqueFontsMap.size} font(s)...` });
      for (const font of uniqueFontsMap.values()) {
        await figma.loadFontAsync(font);
      }
    } catch (err) {
      figma.notify('Error loading required fonts for text layers: ' + String(err), { error: true });
      return;
    }

    const createdBadges: SceneNode[] = [];
    const exportedFiles: { filename: string; base64: string }[] = [];
    const parentContainer = sourceNode.parent || figma.currentPage;

    const gridCols = Math.ceil(Math.sqrt(csvData.length));
    const paddingX = sourceNode.width + 40;
    const paddingY = sourceNode.height + 40;
    const startX = sourceNode.x + paddingX;
    const startY = sourceNode.y;

    const isDirectExport = exportMode === 'export-zip';
    const usedNamesCount = new Map<string, number>();

    for (let index = 0; index < csvData.length; index++) {
      const row = csvData[index];
      figma.ui.postMessage({
        type: 'status-update',
        text: `${isDirectExport ? 'Rendering' : 'Generating'} badge ${index + 1} of ${csvData.length}...`
      });

      const clone = sourceNode.clone();

      const col = index % gridCols;
      const r = Math.floor(index / gridCols);
      clone.x = startX + col * paddingX;
      clone.y = startY + r * paddingY;

      const rawName = row['Name'] || row['name'] || row['ID'] || row['id'] || `Badge_${index + 1}`;
      let safeName = String(rawName).replace(/[/\\?%*:|"<>]/g, '_').trim();
      if (!safeName) safeName = `Badge_${index + 1}`;

      const count = usedNamesCount.get(safeName) || 0;
      usedNamesCount.set(safeName, count + 1);
      const filenameBase = count > 0 ? `${safeName}_${count + 1}` : safeName;

      clone.name = `${sourceNode.name} - ${filenameBase}`;

      const mappingsByNodeId = new Map<string, Mapping[]>();
      for (const m of mappings) {
        if (!m.layerId || !m.column) continue;
        const list = mappingsByNodeId.get(m.layerId) || [];
        list.push(m);
        mappingsByNodeId.set(m.layerId, list);
      }

      function applyMappings(originalNode: SceneNode, clonedNode: SceneNode) {
        const nodeMappings = mappingsByNodeId.get(originalNode.id);
        if (nodeMappings) {
          for (const m of nodeMappings) {
            const val = row[m.column];
            if (m.type === 'text' && clonedNode.type === 'TEXT') {
              const textNode = clonedNode as TextNode;
              textNode.characters = val !== undefined && val !== null ? String(val) : '';
            } else if (m.type === 'boolean') {
              const isTrue =
                val !== undefined &&
                val !== null &&
                ['true', '1', 'yes', 'y', 'x', 'vrai'].includes(String(val).trim().toLowerCase());
              clonedNode.visible = isTrue;
            } else if (m.type === 'variant' && clonedNode.type === 'INSTANCE') {
              const instance = clonedNode as InstanceNode;
              if (val !== undefined && val !== null) {
                const targetValue = String(val).trim();
                const currentProps = instance.componentProperties;

                let setSuccess = false;

                for (const [propName, propObj] of Object.entries(currentProps)) {
                  if (propObj.type === 'VARIANT') {
                    try {
                      instance.setProperties({ [propName]: targetValue });
                      setSuccess = true;
                      break;
                    } catch {
                      // continue
                    }
                  }
                }

                if (!setSuccess && instance.variantProperties) {
                  const keys = Object.keys(instance.variantProperties);
                  if (keys.length > 0) {
                    try {
                      instance.setProperties({ [keys[0]]: targetValue });
                    } catch (e) {
                      console.warn(`Could not set variant property to ${targetValue}:`, e);
                    }
                  }
                }
              }
            }
          }
        }

        if ('children' in originalNode && 'children' in clonedNode) {
          const origChildren = originalNode.children;
          const cloneChildren = clonedNode.children;
          for (let i = 0; i < origChildren.length; i++) {
            if (cloneChildren[i]) {
              applyMappings(origChildren[i], cloneChildren[i]);
            }
          }
        }
      }

      applyMappings(sourceNode, clone);

      if (isDirectExport) {
        const exportSettings: ExportSettings =
          exportFormat === 'PDF'
            ? { format: 'PDF' }
            : exportFormat === 'SVG'
            ? { format: 'SVG' }
            : { format: 'PNG', constraint: { type: 'SCALE', value: exportScale || 2 } };

        const bytes = await (clone as FrameNode).exportAsync(exportSettings);
        const ext = exportFormat.toLowerCase();
        const filename = `${filenameBase}.${ext}`;

        const base64Str = figma.base64Encode(bytes);
        exportedFiles.push({ filename, base64: base64Str });

        clone.remove();
      } else {
        if (parentContainer && 'appendChild' in parentContainer) {
          (parentContainer as FrameNode).appendChild(clone);
        }
        createdBadges.push(clone);
      }
    }

    if (isDirectExport) {
      figma.ui.postMessage({
        type: 'download-zip',
        files: exportedFiles
      });
      figma.notify(`Successfully rendered ${exportedFiles.length} badge file(s)!`);
    } else {
      figma.currentPage.selection = createdBadges;
      figma.viewport.scrollAndZoomIntoView(createdBadges);
      figma.notify(`Successfully generated ${createdBadges.length} badge(s) on canvas!`);
    }

    figma.ui.postMessage({ type: 'generation-complete' });
  }
};
