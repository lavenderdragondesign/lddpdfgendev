import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PAPER_SIZES } from './constants';

interface ExportOptions {
  paper: 'letter' | 'a4';
  orientation: 'portrait' | 'landscape';
  bleed: number;
  showMarks: boolean;
}

export async function exportToPDF(
  canvasElement: HTMLElement,
  options: ExportOptions
): Promise<void> {
  try {
    // Mark exporting mode on canvas (can be used by CSS if needed)
    (canvasElement as any).setAttribute('data-exporting','true');
    // Wait for web fonts to be ready to avoid blank text in export
    if (document && 'fonts' in document) {
      try { await (document as any).fonts.ready; } catch {}
    }
    // Hide any UI elements that shouldn't be in export
    // Strip rings/shadows during export
    const allEls = Array.from(canvasElement.querySelectorAll('*')) as HTMLElement[];
    const ringEls: HTMLElement[] = allEls.filter(el => (el.className && /\bring-|\bshadow-|\boutline-/i.test(String(el.className))));
    const prevBoxShadows: string[] = ringEls.map(el => (el.style.boxShadow || ''));
    ringEls.forEach(el => { el.style.boxShadow = 'none'; });
    // Remove box-shadow from the root canvas too
    const prevRootShadow = (canvasElement as HTMLElement).style.boxShadow || '';
    ;(canvasElement as HTMLElement).style.boxShadow = 'none';

    const uiElements = canvasElement.querySelectorAll('[data-ui]');
    const exportHideEls = canvasElement.querySelectorAll('[data-export-hide]');
    exportHideEls.forEach(el => (el as HTMLElement).style.display = 'none');
    uiElements.forEach(el => (el as HTMLElement).style.display = 'none');

    // Capture canvas at 2x scale for quality
    
    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(canvasElement, {
          scale: (window.devicePixelRatio || 2),
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          width: (canvasElement as HTMLElement).offsetWidth,
          height: (canvasElement as HTMLElement).offsetHeight
        });
    } catch (err) {
      // Fallback: ignore remote images to avoid tainted canvas
      const remoteImgs: HTMLElement[] = Array.from(canvasElement.querySelectorAll('img'))
        .filter((img: any) => {
          const src = img.getAttribute('src') || '';
          return /^https?:\/\//i.test(src) && !src.startsWith(location.origin);
        }) as HTMLElement[];
      const prevDisplay: string[] = [];
      remoteImgs.forEach((el: any, i: number) => { prevDisplay[i] = el.style.display; el.style.display = 'none'; });
      try {
        canvas = await html2canvas(canvasElement, {
          scale: (window.devicePixelRatio || 2),
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          width: (canvasElement as HTMLElement).offsetWidth,
          height: (canvasElement as HTMLElement).offsetHeight
        });
      } finally {
        remoteImgs.forEach((el: any, i: number) => { el.style.display = prevDisplay[i] || ''; });
      }
    }

    // Restore hidden elements
    // Restore ring/shadow overrides
    (canvasElement as HTMLElement).style.boxShadow = prevRootShadow;
    ringEls.forEach((el, i) => { el.style.boxShadow = prevBoxShadows[i]; });
    uiElements.forEach(el => (el as HTMLElement).style.display = '');
    exportHideEls.forEach(el => (el as HTMLElement).style.display = '');
    (canvasElement as any).removeAttribute('data-exporting');

    // Get paper dimensions
    const paperSize = PAPER_SIZES[options.paper];
    const isLandscape = options.orientation === 'landscape';
    
    const pdfWidth = isLandscape ? paperSize.height : paperSize.width;
    const pdfHeight = isLandscape ? paperSize.width : paperSize.height;

    // Create PDF
    const pdf = new jsPDF({
      orientation: options.orientation,
      unit: 'pt',
      format: options.paper
    });

    // Calculate image dimensions to fit page
    const canvasAspect = canvas.width / canvas.height;
    const pageAspect = pdfWidth / pdfHeight;
    
    let imgWidth: number, imgHeight: number;
    if (canvasAspect > pageAspect) {
      imgWidth = pdfWidth;
      imgHeight = pdfWidth / canvasAspect;
    } else {
      imgHeight = pdfHeight;
      imgWidth = pdfHeight * canvasAspect;
    }

    // Center image on page
    const x = (pdfWidth - imgWidth) / 2;
    const y = (pdfHeight - imgHeight) / 2;

    // Add image to PDF
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, imgWidth, imgHeight);

    // Add crop marks if bleed is enabled
    if (options.bleed > 0 && options.showMarks) {
      addCropMarks(pdf, pdfWidth, pdfHeight, options.bleed);
    }

    // Generate filename
    const bleedSuffix = options.bleed > 0 ? `-${options.bleed}pt-bleed` : '';
    const filename = `branded-download-${options.paper}-${options.orientation}${bleedSuffix}.pdf`;

    // Save PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Failed to export PDF. Please try again.');
  }
}

function addCropMarks(pdf: jsPDF, width: number, height: number, bleed: number) {
  const markLength = 18; // Length of crop marks
  const markOffset = bleed * 72 / 8; // Convert bleed to points (1/8" = 9pt, 1/4" = 18pt)

  pdf.setLineWidth(0.25);
  pdf.setDrawColor(0, 0, 0);

  // Top-left
  pdf.line(0, markOffset, markLength, markOffset);
  pdf.line(markOffset, 0, markOffset, markLength);

  // Top-right
  pdf.line(width - markLength, markOffset, width, markOffset);
  pdf.line(width - markOffset, 0, width - markOffset, markLength);

  // Bottom-left
  pdf.line(0, height - markOffset, markLength, height - markOffset);
  pdf.line(markOffset, height - markLength, markOffset, height);

  // Bottom-right
  pdf.line(width - markLength, height - markOffset, width, height - markOffset);
  pdf.line(width - markOffset, height - markLength, width - markOffset, height);
}