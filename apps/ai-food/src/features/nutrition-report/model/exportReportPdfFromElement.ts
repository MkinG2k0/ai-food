import { NutritionReportError } from './saveNutritionReportPdf';

export async function exportReportPdfFromElement(
  element: HTMLElement,
  filename: string,
): Promise<Blob> {
  const html2pdf = (await import('html2pdf.js')).default;

  try {
    const blob = (await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename,
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: {
          scale: 2,
          logging: false,
          useCORS: true,
          backgroundColor: '#ffffff',
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      } as Record<string, unknown>)
      .from(element)
      .outputPdf('blob')) as Blob;

    if (!(blob instanceof Blob) || blob.size === 0) {
      throw new NutritionReportError('PDF получился пустым');
    }
    return blob;
  } catch (err) {
    if (err instanceof NutritionReportError) throw err;
    throw new NutritionReportError('Не удалось создать PDF');
  }
}
