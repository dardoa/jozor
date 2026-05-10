import { useCallback, RefObject } from 'react';
import { Person, ExportType } from '../types';
import { generateICS } from '../utils/calendarLogic';
import { downloadFile } from '../utils/fileUtils';
import { showToast } from '../utils/showToast';
import { useAppStore } from '../store/useAppStore';
import { logError, logInfo, logWarn } from '../utils/errorLogger';

export const useExport = (people: Record<string, Person>, svgRef: RefObject<SVGSVGElement | null>) => {
    const handleExport = useCallback(
        async (type: ExportType) => {
            const {
                setExportStatus,
                treeSettings,
                darkMode,
                user,
                supabaseAccessToken
            } = useAppStore.getState();

            try {
                setExportStatus({ isExporting: true, format: type });

                const fullState = {
                    settings: treeSettings,
                    theme: { darkMode, theme: treeSettings.theme },
                };

                // Data Formats
                if (type === 'jozor') {
                    const blob = await buildExportArchive();
                    downloadFile(blob, 'family.jozor', 'application/octet-stream');
                    return;
                } else if (type === 'json') {
                    const data = { people, ...fullState, metadata: { exportedAt: new Date().toISOString() } };
                    downloadFile(JSON.stringify(data, null, 2), 'tree.json', 'application/json');
                    return;
                } else if (type === 'gedcom') {
                    const { exportToGEDCOM } = await import('../utils/gedcomLogic');
                    downloadFile(exportToGEDCOM(people), 'tree.ged', 'application/octet-stream');
                    return;
                } else if (type === 'ics') {
                    downloadFile(generateICS(people), 'family_calendar.ics', 'text/calendar');
                    return;
                } else if (type === 'print') {
                    window.print();
                    return;
                }

                // Visual Formats
                if (!svgRef.current) throw new Error('Preview not found');

                // 1. Precise Bounding Box Detection
                const svg = svgRef.current;
                const viewport = svg.querySelector('.viewport') as SVGGElement;
                if (!viewport) throw new Error('Viewport not found');

                // Backup current transformation
                const originalTransform = viewport.getAttribute('transform');

                // Temporarily reset transform to get true bounding box of the CONTENT
                viewport.setAttribute('transform', 'translate(0,0) scale(1)');
                const bbox = viewport.getBBox();

                const padding = 150; // Increased from 100 to provide more breathing room
                const captureWidth = bbox.width + (padding * 2);
                const captureHeight = bbox.height + (padding * 2);

                // Re-center content for the capture
                viewport.setAttribute('transform', `translate(${-bbox.x + padding}, ${-bbox.y + padding})`);

                await document.fonts.ready;

                // 2. Tainted Canvas Protection: Convert all Images to Base64
                // We do this on the live element temporarily, then revert it later if needed,
                // but html-to-image is about to capture it.
                if (user) {
                    await convertSupabaseImagesToBase64(svg, {
                        token: user.supabaseToken || supabaseAccessToken || ''
                    });
                }

                const scaleFactor = 2; // Reduced from 3 to 2 for stability (Retina quality is typically sufficient)
                const options = {
                    quality: 0.95,
                    pixelRatio: scaleFactor,
                    width: captureWidth,
                    height: captureHeight,
                    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--theme-bg') || '#f9f7f2',
                    cacheBust: true,
                    canvasWidth: captureWidth * scaleFactor,
                    canvasHeight: captureHeight * scaleFactor,
                    useCORS: true, // Enable CORS for external images
                    style: {
                        transform: 'none',
                        transition: 'none',
                    }
                };

                const { toPng, toJpeg, toSvg } = await import('html-to-image');
                let dataUrl = '';
                try {
                    if (type === 'png' || type === 'pdf') {
                        dataUrl = await toPng(svg as unknown as HTMLElement, options);
                    } else if (type === 'jpeg') {
                        dataUrl = await toJpeg(svg as unknown as HTMLElement, options);
                    } else if (type === 'svg') {
                        dataUrl = await toSvg(svg as unknown as HTMLElement, options);
                    }
                } finally {
                    // ALWAYS restore original transform
                    if (originalTransform) viewport.setAttribute('transform', originalTransform);
                    else viewport.removeAttribute('transform');
                }

                if (!dataUrl) throw new Error('Captured image is empty');

                // 3. Apply Watermark
                if (type === 'png' || type === 'jpeg' || type === 'pdf') {
                    const format = type === 'jpeg' ? 'image/jpeg' : 'image/png';
                    dataUrl = await applyWatermark(dataUrl, 'JOZOR FAMILY TREE', format);
                }

                // 4. Trigger Download
                if (type === 'pdf') {
                    const { default: jsPDF } = await import('jspdf');
                    const pdf = new jsPDF({
                        orientation: captureWidth > captureHeight ? 'landscape' : 'portrait',
                        unit: 'px',
                        format: [captureWidth * scaleFactor, captureHeight * scaleFactor]
                    });
                    pdf.addImage(dataUrl, 'PNG', 0, 0, captureWidth * scaleFactor, captureHeight * scaleFactor);
                    pdf.save('family_tree.pdf');
                } else {
                    const extension = type === 'jpeg' ? 'jpg' : type;
                    const mime = type === 'jpeg' ? 'image/jpeg' : (type === 'svg' ? 'image/svg+xml' : 'image/png');
                    downloadFile(dataUrl, `family_tree.${extension}`, mime);
                }
            } catch (e: unknown) {
                logError('EXPORT_FAILED', e, { showToast: false, type });
                const message = e instanceof Error ? e.message : 'Check console';
                showToast.error(`Failed: ${message}`);
            } finally {
                setExportStatus({ isExporting: false });
            }
        },
        [people, svgRef]
    );

    return { handleExport };

    async function buildExportArchive(): Promise<Blob> {
        const { buildBlueprintArchive } = await import('../services/archiveService');
        const {
            treeSettings: currentTreeSettings,
            darkMode: currentDarkMode,
            language,
            focusId,
            locations
        } = useAppStore.getState();

        const { blob } = await buildBlueprintArchive({
            version: 1,
            people,
            locations,
            settings: {
                treeSettings: currentTreeSettings,
                darkMode: currentDarkMode,
                language
            },
            focusId,
            metadata: {
                lastModified: Date.now(),
                appName: 'Jozor'
            }
        }, {
            label: 'manual-export'
        });

        return blob;
    }
};

/**
 * Technical Fix: Image Pre-fetcher
 * Converts all <image> tags to Base64 before the capture starts
 * to prevent Supabase images from tainting the canvas.
 */
async function convertSupabaseImagesToBase64(svg: SVGSVGElement, authHeaders: { token: string }) {
    const images = Array.from(svg.querySelectorAll('image'));
    logInfo('EXPORT_IMAGE_CONVERSION_STARTED', { imageCount: images.length });

    // Concurrency Control: Process in batches of 5 to prevent network/memory flooding
    const BATCH_SIZE = 5;
    for (let i = 0; i < images.length; i += BATCH_SIZE) {
        const batch = images.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (img) => {
            const url = img.getAttribute('href') || img.getAttribute('xlink:href');
            if (!url || url.startsWith('data:')) return;

            try {
                const resp = await fetch(url, {
                    cache: 'no-cache',
                    mode: 'cors',
                    headers: {
                        ...(authHeaders.token ? { Authorization: `Bearer ${authHeaders.token}` } : {}),
                    },
                });

                if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);

                const blob = await resp.blob();
                return new Promise<void>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        img.setAttribute('href', reader.result as string);
                        // Remove xlink:href to ensure href takes priority in all browsers
                        img.removeAttribute('xlink:href');
                        resolve();
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                logWarn('EXPORT_IMAGE_CONVERSION_WARNING', {
                    url,
                    error: e instanceof Error ? e.message : String(e),
                });
            }
        }));
    }

    logInfo('EXPORT_IMAGE_CONVERSION_COMPLETED', { imageCount: images.length });
}

async function applyWatermark(dataUrl: string, text: string, format: string): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(dataUrl);

            ctx.drawImage(img, 0, 0);

            const padding = canvas.width * 0.05;
            const fontSize = Math.max(24, Math.floor(canvas.width / 40));

            ctx.font = `bold ${fontSize}px Inter, sans-serif`;
            ctx.fillStyle = 'rgba(195, 155, 91, 0.4)';
            ctx.textAlign = 'right';
            ctx.fillText(text, canvas.width - padding, canvas.height - padding);

            ctx.font = `${fontSize / 2}px Inter, sans-serif`;
            ctx.fillText('Generated by Jozor.app', canvas.width - padding, canvas.height - padding + (fontSize * 0.8));

            resolve(canvas.toDataURL(format, 0.95));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}
