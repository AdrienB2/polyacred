// PolyAcred Plugin Main Logic - Ultra-High-Speed Vector & Native Engine

figma.showUI(__html__, { width: 500, height: 750, themeColors: true });

interface LayerInfo {
  id: string;
  name: string;
  type: string;
  variantProperties?: Record<string, string> | null;
}

interface NodeSummary {
  id: string;
  name: string;
  type: string;
  width: number;
  height: number;
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
  backNodeId?: string | null;
  mappings: Mapping[];
  exportMode: 'pdf' | 'export-zip' | 'canvas';
  exportFormat?: 'PNG' | 'PDF' | 'SVG';
  exportScale?: number;
  isSpecimen?: boolean;
}

interface RequestLayersMessage {
  type: 'request-layers';
  badgeNodeId: string;
}

// Global state for generation & cancellation
let isGeneratingActive = false;
let cancelRequested = false;

const yieldControl = (ms = 2) => new Promise((resolve) => setTimeout(resolve, ms));

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

function getNodeSummary(node: SceneNode | null): NodeSummary | null {
  if (!node) return null;
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    width: Math.round('width' in node ? node.width : 0),
    height: Math.round('height' in node ? node.height : 0)
  };
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
      selectedNode: getNodeSummary(selectedNode),
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
  if (!isGeneratingActive) {
    sendSelectionState();
  }
});

// Fast indexing for target layers
function buildLayerMap(
  orig: SceneNode,
  cloned: SceneNode,
  targetIds: Set<string>,
  map: Map<string, SceneNode>
) {
  if (targetIds.has(orig.id)) {
    map.set(orig.id, cloned);
  }
  if ('children' in orig && 'children' in cloned) {
    const origChildren = orig.children;
    const clonedChildren = cloned.children;
    const len = Math.min(origChildren.length, clonedChildren.length);
    for (let i = 0; i < len; i++) {
      buildLayerMap(origChildren[i], clonedChildren[i], targetIds, map);
    }
  }
}

// Instant in-place property mutations
function fastApplyMappings(
  layerMap: Map<string, SceneNode>,
  mappingsByNodeId: Map<string, Mapping[]>,
  row: Record<string, string>
) {
  for (const [origId, nodeMappings] of mappingsByNodeId.entries()) {
    const clonedNode = layerMap.get(origId);
    if (!clonedNode) continue;

    for (const m of nodeMappings) {
      const val = row[m.column];
      if (m.type === 'text' && clonedNode.type === 'TEXT') {
        const textNode = clonedNode as TextNode;
        textNode.characters = val !== undefined && val !== null ? String(val) : '';
      } else if (m.type === 'boolean') {
        const isTrue =
          val !== undefined &&
          val !== null &&
          ['true', '1', 'yes', 'y', 'x', 'vrai', 'oui', 'on', 'show', 'ok', 'checked', '+'].includes(
            String(val).trim().toLowerCase()
          );
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
}

figma.ui.onmessage = async (
  msg:
    | GenerateMessage
    | RequestLayersMessage
    | { type: 'init' }
    | { type: 'cancel' }
    | { type: 'cancel-generation' }
    | { type: 'notify'; text: string; error?: boolean }
) => {
  if (msg.type === 'init') {
    sendSelectionState();
    return;
  }

  if (msg.type === 'notify') {
    figma.notify(msg.text, { error: !!msg.error });
    return;
  }

  if (msg.type === 'cancel-generation') {
    if (isGeneratingActive) {
      cancelRequested = true;
      figma.notify('Stopping generation...');
    }
    return;
  }

  if (msg.type === 'request-layers') {
    const node = (await figma.getNodeByIdAsync(msg.badgeNodeId)) as SceneNode | null;
    if (node) {
      const layers = getLayersFromNode(node);
      figma.ui.postMessage({
        type: 'layers-loaded',
        node: getNodeSummary(node),
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
    if (isGeneratingActive) return;

    isGeneratingActive = true;
    cancelRequested = false;

    const {
      csvData,
      badgeNodeId,
      backNodeId,
      mappings,
      exportMode,
      exportFormat = 'PNG',
      exportScale = 2,
      isSpecimen = false
    } = msg;

    try {
      const sourceNode = (await figma.getNodeByIdAsync(badgeNodeId)) as
        | FrameNode
        | ComponentNode
        | GroupNode
        | SectionNode
        | null;

      if (!sourceNode) {
        figma.notify('Selected badge front template node could not be found.', { error: true });
        figma.ui.postMessage({ type: 'generation-complete' });
        isGeneratingActive = false;
        return;
      }

      let backNode: FrameNode | ComponentNode | GroupNode | SectionNode | null = null;
      if (backNodeId) {
        backNode = (await figma.getNodeByIdAsync(backNodeId)) as
          | FrameNode
          | ComponentNode
          | GroupNode
          | SectionNode
          | null;
        if (!backNode) {
          figma.notify('Selected badge back template node could not be found.', { error: true });
        }
      }

      figma.ui.postMessage({
        type: 'status-update',
        text: isSpecimen ? 'Preparing specimen badge export...' : 'Loading fonts...'
      });

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

      if (textNodeIds.length > 0) {
        findFontsInNode(sourceNode);
      }

      const uniqueFontsMap = new Map<string, FontName>();
      for (const font of fontsToLoad) {
        uniqueFontsMap.set(`${font.family}-${font.style}`, font);
      }

      if (uniqueFontsMap.size > 0) {
        try {
          for (const font of uniqueFontsMap.values()) {
            if (cancelRequested) break;
            await figma.loadFontAsync(font);
          }
        } catch (err) {
          figma.notify('Error loading required fonts for text layers: ' + String(err), { error: true });
          figma.ui.postMessage({ type: 'generation-complete' });
          isGeneratingActive = false;
          return;
        }
      }

      if (cancelRequested) {
        figma.ui.postMessage({ type: 'generation-cancelled' });
        isGeneratingActive = false;
        return;
      }

      // Index mappings
      const targetLayerIds = new Set<string>();
      const mappingsByNodeId = new Map<string, Mapping[]>();
      for (const m of mappings) {
        if (!m.layerId || !m.column) continue;
        targetLayerIds.add(m.layerId);
        const list = mappingsByNodeId.get(m.layerId) || [];
        list.push(m);
        mappingsByNodeId.set(m.layerId, list);
      }

      const usedNamesCount = new Map<string, number>();

      if (exportMode === 'pdf' || exportMode === 'export-zip') {
        // ULTRA-FAST STREAMING ENGINE (NATIVE VECTOR PDF & CONCURRENT EXPORT)
        const CONCURRENCY = Math.min(6, Math.max(1, csvData.length));
        const workers: { clone: FrameNode | ComponentNode | GroupNode | SectionNode; layerMap: Map<string, SceneNode> }[] = [];

        try {
          // Initialize worker clone pool off-canvas
          for (let w = 0; w < CONCURRENCY; w++) {
            const clone = sourceNode.clone() as FrameNode | ComponentNode | GroupNode | SectionNode;
            clone.x = -99999;
            clone.y = -99999;
            const layerMap = new Map<string, SceneNode>();
            buildLayerMap(sourceNode, clone, targetLayerIds, layerMap);
            workers.push({ clone, layerMap });
          }

          if (exportMode === 'pdf') {
            // Native Vector PDF export - 25x faster than raster PNG!
            let backPageBytes: Uint8Array | null = null;
            if (backNode) {
              figma.ui.postMessage({ type: 'status-update', text: 'Exporting badge back vector PDF...' });
              backPageBytes = await (backNode as FrameNode).exportAsync({
                format: 'PDF'
              });
            }

            figma.ui.postMessage({
              type: 'pdf-stream-start',
              totalBadges: csvData.length,
              hasBack: !!backNode,
              backPageBytes,
              isSpecimen
            });

            const exportSettings: ExportSettings = {
              format: 'PDF'
            };

            const UPDATE_INTERVAL = 10;

            for (let i = 0; i < csvData.length; i += CONCURRENCY) {
              if (cancelRequested) break;

              const batchIndices: number[] = [];
              for (let c = 0; c < CONCURRENCY && i + c < csvData.length; c++) {
                batchIndices.push(i + c);
              }

              // Export in parallel across worker pool
              const results = await Promise.all(
                batchIndices.map(async (index, workerIdx) => {
                  const worker = workers[workerIdx];
                  const row = csvData[index];

                  const rawName =
                    row['Name'] ||
                    row['name'] ||
                    row['ID'] ||
                    row['id'] ||
                    (isSpecimen ? 'Specimen' : `Badge_${index + 1}`);
                  let safeName = String(rawName).replace(/[/\\?%*:|"<>]/g, '_').trim();
                  if (!safeName) safeName = isSpecimen ? 'Specimen' : `Badge_${index + 1}`;

                  const count = usedNamesCount.get(safeName) || 0;
                  usedNamesCount.set(safeName, count + 1);
                  const filenameBase = count > 0 ? `${safeName}_${count + 1}` : safeName;

                  fastApplyMappings(worker.layerMap, mappingsByNodeId, row);
                  const bytes = await (worker.clone as FrameNode).exportAsync(exportSettings);

                  return { index, filenameBase, bytes };
                })
              );

              for (const item of results) {
                figma.ui.postMessage({
                  type: 'pdf-stream-page',
                  index: item.index,
                  total: csvData.length,
                  filename: item.filenameBase,
                  pdfBytes: item.bytes,
                  shouldUpdateUI: item.index % UPDATE_INTERVAL === 0 || item.index === csvData.length - 1
                });
              }

              await yieldControl(2);
            }

            if (cancelRequested) {
              figma.ui.postMessage({ type: 'generation-cancelled' });
              figma.notify('Generation cancelled.');
            } else {
              figma.ui.postMessage({
                type: 'pdf-stream-complete',
                totalBadges: csvData.length,
                hasBack: !!backNode,
                isSpecimen
              });
            }
          } else {
            // ZIP EXPORT
            let backBytes: Uint8Array | null = null;
            const exportSettings: ExportSettings =
              exportFormat === 'PDF'
                ? { format: 'PDF' }
                : exportFormat === 'SVG'
                ? { format: 'SVG' }
                : { format: 'PNG', constraint: { type: 'SCALE', value: exportScale || 2 } };

            if (backNode) {
              figma.ui.postMessage({ type: 'status-update', text: 'Exporting badge back template...' });
              backBytes = await (backNode as FrameNode).exportAsync(exportSettings);
            }

            figma.ui.postMessage({
              type: 'zip-stream-start',
              totalBadges: csvData.length,
              hasBack: !!backNode,
              backBytes,
              exportFormat,
              isSpecimen
            });

            const UPDATE_INTERVAL = 10;

            for (let i = 0; i < csvData.length; i += CONCURRENCY) {
              if (cancelRequested) break;

              const batchIndices: number[] = [];
              for (let c = 0; c < CONCURRENCY && i + c < csvData.length; c++) {
                batchIndices.push(i + c);
              }

              const results = await Promise.all(
                batchIndices.map(async (index, workerIdx) => {
                  const worker = workers[workerIdx];
                  const row = csvData[index];

                  const rawName =
                    row['Name'] ||
                    row['name'] ||
                    row['ID'] ||
                    row['id'] ||
                    (isSpecimen ? 'Specimen' : `Badge_${index + 1}`);
                  let safeName = String(rawName).replace(/[/\\?%*:|"<>]/g, '_').trim();
                  if (!safeName) safeName = isSpecimen ? 'Specimen' : `Badge_${index + 1}`;

                  const count = usedNamesCount.get(safeName) || 0;
                  usedNamesCount.set(safeName, count + 1);
                  const filenameBase = count > 0 ? `${safeName}_${count + 1}` : safeName;

                  fastApplyMappings(worker.layerMap, mappingsByNodeId, row);
                  const bytes = await (worker.clone as FrameNode).exportAsync(exportSettings);

                  return { index, filenameBase, bytes };
                })
              );

              for (const item of results) {
                figma.ui.postMessage({
                  type: 'zip-stream-file',
                  index: item.index,
                  total: csvData.length,
                  filenameBase: item.filenameBase,
                  frontBytes: item.bytes,
                  shouldUpdateUI: item.index % UPDATE_INTERVAL === 0 || item.index === csvData.length - 1
                });
              }

              await yieldControl(2);
            }

            if (cancelRequested) {
              figma.ui.postMessage({ type: 'generation-cancelled' });
              figma.notify('Generation cancelled.');
            } else {
              figma.ui.postMessage({
                type: 'zip-stream-complete',
                totalBadges: csvData.length,
                isSpecimen
              });
            }
          }
        } finally {
          for (const worker of workers) {
            try {
              worker.clone.remove();
            } catch {
              // ignore
            }
          }
        }
      } else {
        // CANVAS MODE WITH SMART PACING
        const parentContainer = sourceNode.parent || figma.currentPage;
        const gridCols = Math.ceil(Math.sqrt(csvData.length));
        const pairWidth = backNode ? sourceNode.width + backNode.width + 20 : sourceNode.width;
        const paddingX = pairWidth + 40;
        const paddingY = Math.max(sourceNode.height, backNode ? backNode.height : 0) + 40;
        const startX = sourceNode.x + paddingX;
        const startY = sourceNode.y;

        const createdBadges: SceneNode[] = [];
        const BATCH_SIZE = 15;

        for (let index = 0; index < csvData.length; index++) {
          if (cancelRequested) break;

          if (index % BATCH_SIZE === 0) {
            figma.ui.postMessage({
              type: 'progress-update',
              current: index + 1,
              total: csvData.length,
              text: isSpecimen
                ? 'Generating specimen badge on canvas...'
                : `Generating badge ${index + 1} of ${csvData.length} on canvas...`
            });
            await yieldControl(10);
          }

          const row = csvData[index];
          const rawName =
            row['Name'] ||
            row['name'] ||
            row['ID'] ||
            row['id'] ||
            (isSpecimen ? 'Specimen' : `Badge_${index + 1}`);
          let safeName = String(rawName).replace(/[/\\?%*:|"<>]/g, '_').trim();
          if (!safeName) safeName = isSpecimen ? 'Specimen' : `Badge_${index + 1}`;

          const count = usedNamesCount.get(safeName) || 0;
          usedNamesCount.set(safeName, count + 1);
          const filenameBase = count > 0 ? `${safeName}_${count + 1}` : safeName;

          const col = index % gridCols;
          const r = Math.floor(index / gridCols);
          const posX = startX + col * paddingX;
          const posY = startY + r * paddingY;

          const clone = sourceNode.clone();
          clone.name = isSpecimen
            ? `${sourceNode.name} - ${filenameBase} (Specimen)`
            : `${sourceNode.name} - ${filenameBase}`;
          clone.x = posX;
          clone.y = posY;

          const cloneLayerMap = new Map<string, SceneNode>();
          buildLayerMap(sourceNode, clone, targetLayerIds, cloneLayerMap);
          fastApplyMappings(cloneLayerMap, mappingsByNodeId, row);

          if (parentContainer && 'appendChild' in parentContainer) {
            (parentContainer as FrameNode).appendChild(clone);
          }
          createdBadges.push(clone);

          if (backNode) {
            const backClone = backNode.clone();
            backClone.name = isSpecimen
              ? `${backNode.name} - ${filenameBase} (Specimen Back)`
              : `${backNode.name} - ${filenameBase} (Back)`;
            backClone.x = posX + sourceNode.width + 20;
            backClone.y = posY;
            if (parentContainer && 'appendChild' in parentContainer) {
              (parentContainer as FrameNode).appendChild(backClone);
            }
            createdBadges.push(backClone);
          }
        }

        if (cancelRequested) {
          figma.ui.postMessage({ type: 'generation-cancelled' });
          figma.notify(`Generation stopped. Created ${createdBadges.length} badge frame(s).`);
        } else {
          if (createdBadges.length > 0) {
            if (createdBadges.length <= 25) {
              figma.currentPage.selection = createdBadges;
              figma.viewport.scrollAndZoomIntoView(createdBadges);
            } else {
              figma.currentPage.selection = createdBadges.slice(0, 10);
              figma.viewport.scrollAndZoomIntoView(createdBadges.slice(0, 10));
            }
            figma.notify(
              isSpecimen
                ? 'Successfully generated 1 specimen badge frame on canvas!'
                : `Successfully generated ${createdBadges.length} badge frame(s) on canvas!`
            );
          }
          figma.ui.postMessage({ type: 'generation-complete' });
        }
      }
    } catch (err) {
      console.error('Generation error:', err);
      figma.notify('An error occurred during badge generation: ' + String(err), { error: true });
      figma.ui.postMessage({ type: 'generation-complete' });
    } finally {
      isGeneratingActive = false;
      cancelRequested = false;
    }
  }
};
