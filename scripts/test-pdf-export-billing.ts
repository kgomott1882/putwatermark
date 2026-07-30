import {
  calculatePdfExportCost,
  PDF_CREDITS_PER_PAGE,
  PDF_FILL_CREDITS_PER_PAGE,
  type PdfBillingMode,
} from "../src/lib/exportCost";
import {
  countBillableSignFillPagesFromManifests,
  countSignedPagesFromManifest,
  type SignaturePlacementManifestDocument,
} from "../src/lib/signaturePlacementManifest";
import {
  buildFillManifestDocument,
  type FillManifestDocument,
} from "../src/lib/fillManifest";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function runScenario(
  name: string,
  input: {
    billingMode: PdfBillingMode;
    pageCount: number;
    signaturePages: number[];
    fillPages: number[];
  },
  expectedCost: number,
) {
  const signatureManifest: SignaturePlacementManifestDocument = {
    version: 1,
    pages: {},
  };
  const fillManifest: FillManifestDocument = {
    version: 1,
    pages: {},
  };

  for (const pageNumber of input.signaturePages) {
    signatureManifest.pages[`pdf-page-${pageNumber}`] = [
      {
        customPosition: null,
        fontSizeScale: 100,
        id: `sig-${pageNumber}`,
        opacity: 70,
        signatureId: "saved-1",
        watermarkPosition: "bottom-right",
      },
    ];
  }

  for (const pageNumber of input.fillPages) {
    fillManifest.pages[`pdf-page-${pageNumber}`] = [
      {
        fontFamily:
          'Arial, Helvetica, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: 16,
        heightPercent: 0.05,
        id: `fill-${pageNumber}`,
        text: "Answer",
        widthPercent: 0.2,
        xPercent: 0.5,
        yPercent: 0.5,
      },
    ];
  }

  const signedPageCount = countSignedPagesFromManifest(
    signatureManifest,
    input.pageCount,
  );
  const fillPageCount = input.fillPages.length;
  const billablePageCount =
    input.billingMode === "watermark"
      ? input.pageCount
      : countBillableSignFillPagesFromManifests(
          signatureManifest,
          fillManifest,
          input.pageCount,
        );
  const result = calculatePdfExportCost({
    billablePageCount,
    billingMode: input.billingMode,
    fillPageCount,
    pageCount: input.pageCount,
    signedPageCount,
  });

  assert(result.cost === expectedCost, `${name}: expected ${expectedCost}, got ${result.cost}`);
  console.log(`PASS ${name}: ${result.cost} credits`);
}

runScenario(
  "signature-only on 1 of 100 pages",
  {
    billingMode: "signFill",
    pageCount: 100,
    signaturePages: [1],
    fillPages: [],
  },
  PDF_CREDITS_PER_PAGE,
);

runScenario(
  "fill-only on 1 of 100 pages",
  {
    billingMode: "signFill",
    pageCount: 100,
    signaturePages: [],
    fillPages: [1],
  },
  PDF_CREDITS_PER_PAGE + PDF_FILL_CREDITS_PER_PAGE,
);

runScenario(
  "signature and fill on same page",
  {
    billingMode: "signFill",
    pageCount: 10,
    signaturePages: [3],
    fillPages: [3],
  },
  PDF_CREDITS_PER_PAGE + PDF_FILL_CREDITS_PER_PAGE,
);

runScenario(
  "watermark export with fill surcharge only",
  {
    billingMode: "watermark",
    pageCount: 20,
    signaturePages: [2, 5],
    fillPages: [2],
  },
  PDF_CREDITS_PER_PAGE * 20 + PDF_FILL_CREDITS_PER_PAGE,
);

console.log("All PDF billing scenarios passed.");
