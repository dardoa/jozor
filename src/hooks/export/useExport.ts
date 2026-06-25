import { useCallback, RefObject } from 'react';
import { Person, ExportType, PublishingExportOptions, PublishingPreviewResult } from '../../types';
import { generateICS } from '../../utils/calendarLogic';
import { downloadFile } from '../../utils/fileUtils';
import { showToast } from '../../utils/showToast';
import { useAppStore } from '../../store/useAppStore';
import { logError, logInfo, logWarn } from '../../utils/errorLogger';
import { PublishingTracker } from '../../features/publishing';
import type { FamilyManuscriptModel } from '../../features/publishing';
import { maskPeopleMap } from '../../utils/privacyUtils';
import { imageCacheService } from '../../services/imageCacheService';

export const useExport = (people: Record<string, Person>, svgRef: RefObject<SVGSVGElement | null>) => {
    const buildExportArchive = useCallback(async (): Promise<Blob> => {
        const { buildBlueprintArchive } = await import('../../services/archiveService');
        const {
            treeSettings: currentTreeSettings,
            darkMode: currentDarkMode,
            language,
            focusId,
            locations,
            currentUserRole
        } = useAppStore.getState();

        const activePeople = currentUserRole === 'viewer' ? maskPeopleMap(people) : people;

        const { blob } = await buildBlueprintArchive({
            version: 1,
            people: activePeople,
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
    }, [people]);

    const handleExport = useCallback(
        async (type: ExportType) => {
            const {
                setExportStatus,
                treeSettings,
                darkMode,
                user,
                supabaseAccessToken,
                currentUserRole,
                relationships,
                sources,
                citations,
                currentTreeId
            } = useAppStore.getState();

            const activePeople = currentUserRole === 'viewer' ? maskPeopleMap(people) : people;

            const trackerState = PublishingTracker.startTracking({
                templateId: type,
                exportType: 'legacy',
                people: activePeople,
                totalPages: 1,
                relationships,
                sources,
                citations,
                userRole: currentUserRole,
                treeId: currentTreeId,
            });
            let success = false;
            const warnings: string[] = [];
            let outputName = '';

            try {
                setExportStatus({ isExporting: true, format: type });

                const fullState = {
                    settings: treeSettings,
                    theme: { darkMode, theme: treeSettings.theme },
                };

                // Data Formats
                if (type === 'jozor') {
                    outputName = 'family.jozor';
                    const blob = await buildExportArchive();
                    downloadFile(blob, outputName, 'application/octet-stream');
                    success = true;
                    return;
                } else if (type === 'json') {
                    outputName = 'tree.json';
                    const data = { ...fullState, people: activePeople, metadata: { exportedAt: new Date().toISOString() } };
                    downloadFile(JSON.stringify(data, null, 2), outputName, 'application/json');
                    success = true;
                    return;
                } else if (type === 'gedcom') {
                    outputName = 'tree.ged';
                    const { exportToGEDCOM } = await import('../../utils/gedcomLogic');
                    downloadFile(exportToGEDCOM(activePeople), outputName, 'application/octet-stream');
                    success = true;
                    return;
                } else if (type === 'ics') {
                    outputName = 'family_calendar.ics';
                    downloadFile(generateICS(activePeople), outputName, 'text/calendar');
                    success = true;
                    return;
                } else if (type === 'print') {
                    outputName = 'print';
                    window.print();
                    success = true;
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
                if (user) {
                    await convertExportImagesToBase64(svg, {
                        token: user.supabaseToken || supabaseAccessToken || ''
                    });
                }

                const scaleFactor = 2;
                const options = {
                    quality: 0.95,
                    pixelRatio: scaleFactor,
                    width: captureWidth,
                    height: captureHeight,
                    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--theme-bg') || '#f9f7f2',
                    cacheBust: true,
                    canvasWidth: captureWidth * scaleFactor,
                    canvasHeight: captureHeight * scaleFactor,
                    useCORS: true,
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
                    outputName = 'family_tree.pdf';
                    const { default: jsPDF } = await import('jspdf');
                    const pdf = new jsPDF({
                        orientation: captureWidth > captureHeight ? 'landscape' : 'portrait',
                        unit: 'px',
                        format: [captureWidth * scaleFactor, captureHeight * scaleFactor]
                    });
                    pdf.addImage(dataUrl, 'PNG', 0, 0, captureWidth * scaleFactor, captureHeight * scaleFactor);
                    pdf.save(outputName);
                } else {
                    const extension = type === 'jpeg' ? 'jpg' : type;
                    outputName = `family_tree.${extension}`;
                    const mime = type === 'jpeg' ? 'image/jpeg' : (type === 'svg' ? 'image/svg+xml' : 'image/png');
                    downloadFile(dataUrl, outputName, mime);
                }
                success = true;
            } catch (e: unknown) {
                logError('EXPORT_FAILED', e, { showToast: false, metadata: { type } });
                const message = e instanceof Error ? e.message : 'Check console';
                showToast.error(`Failed: ${message}`);
                success = false;
                warnings.push(message);
            } finally {
                await PublishingTracker.endTracking(
                    trackerState,
                    success,
                    warnings,
                    success ? [{ name: outputName, format: type }] : []
                );
                setExportStatus({ isExporting: false });
            }
        },
        [buildExportArchive, people, svgRef]
    );

    const buildHtmlManuscriptPreview = useCallback(async (templateId: string): Promise<PublishingPreviewResult & { pageEstimate: number }> => {
        const {
            focusId,
            currentUserRole,
            relationships,
            sources,
            citations,
            language,
        } = useAppStore.getState();
        const activePeople = currentUserRole === 'viewer' ? maskPeopleMap(people) : people;
        const {
            TemplateRegistry,
            HtmlManuscriptRenderer,
            ManuscriptStructureBuilder,
        } = await import('../../features/publishing');
        const template = TemplateRegistry.getTemplate(templateId);
        if (template.publicationKind !== 'book-manuscript') {
            throw new Error('HTML manuscript preview is only available for family manuscript templates.');
        }

        const rootPersonId = focusId || Object.keys(activePeople)[0];
        if (!rootPersonId) {
            throw new Error('No root person found for the manuscript preview.');
        }

        const manuscriptModel = ManuscriptStructureBuilder.buildModel({
            rootPersonId,
            people: activePeople,
            relationshipEdges: relationships,
            evidence: { sources, citations },
        });
        const html = HtmlManuscriptRenderer.renderToHtml(manuscriptModel, {
            language: language === 'ar' ? 'ar' : 'en',
            title: manuscriptModel.title,
        });

        return {
            title: manuscriptModel.title,
            html,
            pageEstimate: estimateHtmlManuscriptPages(manuscriptModel),
        };
    }, [people]);

    const handlePublishingPreview = useCallback(
        async (options: Pick<PublishingExportOptions, 'templateId' | 'renderer'>): Promise<PublishingPreviewResult> => {
            if (options.renderer && options.renderer !== 'html-print') {
                throw new Error('Preview is only available for the enhanced HTML manuscript renderer.');
            }
            const preview = await buildHtmlManuscriptPreview(options.templateId);
            return { title: preview.title, html: preview.html };
        },
        [buildHtmlManuscriptPreview]
    );

    const handlePublishingExport = useCallback(
        async (options: PublishingExportOptions) => {
            const { templateId, format, renderer = 'vector-pdf' } = options;
            const {
                setExportStatus,
                focusId,
                currentUserRole,
                relationships,
                sources,
                citations,
                currentTreeId
            } = useAppStore.getState();

            const activePeople = currentUserRole === 'viewer' ? maskPeopleMap(people) : people;

            const trackerState = PublishingTracker.startTracking({
                templateId,
                exportType: 'publishing',
                people: activePeople,
                totalPages: 1,
                relationships,
                sources,
                citations,
                userRole: currentUserRole,
                treeId: currentTreeId,
            });
            let success = false;
            const warnings: string[] = [];
            let outputName = '';

            try {
                setExportStatus({ isExporting: true, format });

                const { 
                    PublishingPipeline, 
                    TemplateRegistry, 
                    PosterRenderer, 
                    PdfRenderer,
                } = await import('../../features/publishing');

                const template = TemplateRegistry.getTemplate(templateId);
                const rootPersonId = focusId || Object.keys(activePeople)[0];
                if (!rootPersonId) {
                    throw new Error('No root person found for the export.');
                }

                const request = {
                    templateId,
                    rootPersonId,
                    scope: {
                        type: (templateId.includes('book') ? 'all' : 'ancestor') as 'all' | 'ancestor',
                        generationsDepth: templateId.includes('book') ? 3 : 4,
                    },
                };
                const doc = PublishingPipeline.composeDocument(request, activePeople, relationships, { sources, citations });
                const placedDoc = PublishingPipeline.layoutDocument(doc, template);

                // Update total pages in manifest
                (trackerState.manifest as { totalPages: number }).totalPages = placedDoc.totalPages || 1;

                if (renderer === 'html-print') {
                    if (format !== 'pdf') {
                        throw new Error('HTML manuscript renderer only supports PDF print output.');
                    }
                    if (template.publicationKind !== 'book-manuscript') {
                        throw new Error('Enhanced Arabic PDF is only available for family manuscript templates.');
                    }

                    const preview = await buildHtmlManuscriptPreview(templateId);
                    outputName = `${preview.title}.pdf`;

                    await openHtmlPrintWindow(preview.html, preview.title);
                    (trackerState.manifest as { totalPages: number }).totalPages = preview.pageEstimate;
                } else if (format === 'png') {
                    outputName = `${doc.title}.png`;
                    const browserCanvasFactory = {
                        createCanvas(w: number, h: number) {
                            const canvas = document.createElement('canvas');
                            canvas.width = w;
                            canvas.height = h;
                            return canvas;
                        }
                    };
                    const canvas = PosterRenderer.renderToCanvas(placedDoc, browserCanvasFactory, template.theme);
                    let dataUrl = canvas.toDataURL('image/png');
                    dataUrl = await applyWatermark(dataUrl, 'JOZOR FAMILY PUBLISHING', 'image/png');
                    downloadFile(dataUrl, outputName, 'image/png');
                } else {
                    outputName = `${doc.title}.pdf`;
                    const pdfInstance = PdfRenderer.renderToPdf(placedDoc, template.theme);
                    pdfInstance.save(outputName);
                }
                success = true;
            } catch (e: unknown) {
                logError('PUBLISHING_EXPORT_FAILED', e, { showToast: false, metadata: { templateId, format } });
                const message = e instanceof Error ? e.message : 'Check console';
                showToast.error(`Failed: ${message}`);
                success = false;
                warnings.push(message);
            } finally {
                await PublishingTracker.endTracking(
                    trackerState,
                    success,
                    warnings,
                    success ? [{ name: outputName, format }] : []
                );
                setExportStatus({ isExporting: false });
            }
        },
        [buildHtmlManuscriptPreview, people]
    );

    return { handleExport, handlePublishingExport, handlePublishingPreview };
};

/**
 * Technical Fix: Image Pre-fetcher
 * Converts all <image> tags to Base64 before the capture starts
 * to prevent Supabase images from tainting the canvas.
 */
async function convertExportImagesToBase64(svg: SVGSVGElement, authHeaders: { token: string }) {
    const images = Array.from(svg.querySelectorAll('image'));
    logInfo('EXPORT', 'EXPORT_IMAGE_CONVERSION_STARTED', { imageCount: images.length });

    // Concurrency Control: Process in batches of 5 to prevent network/memory flooding
    const BATCH_SIZE = 5;
    for (let i = 0; i < images.length; i += BATCH_SIZE) {
        const batch = images.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (img) => {
            const url = img.getAttribute('href') || img.getAttribute('xlink:href');
            if (!url || url.startsWith('data:')) return;

            try {
                const blob = await imageCacheService.fetchAndCache(
                    url,
                    undefined,
                    undefined,
                    'image/webp',
                    {
                        cache: 'no-cache',
                        mode: 'cors',
                        headers: {
                            ...(authHeaders.token ? { Authorization: `Bearer ${authHeaders.token}` } : {}),
                        },
                    }
                );
                const dataUrl = await blobToDataUrl(blob);
                img.setAttribute('href', dataUrl);
                img.removeAttribute('xlink:href');
            } catch (e) {
                logWarn('EXPORT', 'EXPORT_IMAGE_CONVERSION_WARNING', {
                    metadata: { url, error: e instanceof Error ? e.message : String(e) }
                });
            }
        }));
    }

    logInfo('EXPORT', 'EXPORT_IMAGE_CONVERSION_COMPLETED', { imageCount: images.length });
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
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

function estimateHtmlManuscriptPages(model: FamilyManuscriptModel): number {
    return model.chapters.reduce((total, chapter) => {
        if (chapter.type === 'people') {
            return total + Math.max(1, Math.ceil((chapter.people?.length ?? 0) / 4));
        }
        if (chapter.type === 'timeline') {
            return total + Math.max(1, Math.ceil((chapter.timeline?.length ?? 0) / 45));
        }
        if (chapter.type === 'evidence') {
            return total + Math.max(1, Math.ceil((chapter.citations?.length ?? 0) / 35));
        }
        return total + 1;
    }, 1);
}

async function openHtmlPrintWindow(html: string, title: string): Promise<void> {
    const printWindow = window.open('', '_blank', 'width=1100,height=900');
    if (!printWindow) {
        throw new Error('The browser blocked the print window. Please allow popups and try again.');
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.document.title = title;

    await waitForPrintWindowReady(printWindow);
    printWindow.focus();
    printWindow.print();
}

async function waitForPrintWindowReady(printWindow: Window): Promise<void> {
    await new Promise<void>((resolve) => printWindow.setTimeout(resolve, 150));
    const fonts = printWindow.document.fonts;
    if (!fonts?.ready) return;

    await Promise.race([
        fonts.ready.then(() => undefined),
        new Promise<void>((resolve) => printWindow.setTimeout(resolve, 1800)),
    ]);
}
