import * as pdfjs from 'pdfjs-dist';

// pdfjs-dist v5 ships the Vite-compatible worker as an ESM module.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

type PositionedTextItem = {
  str: string;
  transform: ArrayLike<number>;
};

type PdfTextItem = PositionedTextItem | object;

const LINE_Y_TOLERANCE = 1;

function isPositionedTextItem(item: PdfTextItem): item is PositionedTextItem {
  return (
    'str' in item &&
    typeof item.str === 'string' &&
    'transform' in item &&
    item.transform != null &&
    typeof item.transform === 'object' &&
    item.transform.length >= 6
  );
}

export function groupPdfTextItems(items: PdfTextItem[]): string {
  const lines: Array<{ y: number; items: Array<{ x: number; text: string }> }> = [];

  for (const item of items) {
    if (!isPositionedTextItem(item) || !item.str) continue;

    const x = Number(item.transform[4]);
    const y = Number(item.transform[5]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    let line = lines.find((candidate) => Math.abs(candidate.y - y) <= LINE_Y_TOLERANCE);
    if (!line) {
      line = { y, items: [] };
      lines.push(line);
    }
    line.items.push({ x, text: item.str });
  }

  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) =>
      line.items
        .sort((a, b) => a.x - b.x)
        .map(({ text }) => text)
        .join(' ')
        .trim(),
    )
    .filter(Boolean)
    .join('\n');
}

export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(groupPdfTextItems(content.items));
  }

  return pages.filter(Boolean).join('\n');
}
