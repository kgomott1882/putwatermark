import assert from "node:assert/strict";
import {
  appendPdfPageSignaturePlacement,
  buildPdfPageId,
  countSignedPdfPages,
  createPdfPageSignaturePlacement,
  deserializePdfPageSignatureMap,
  removePdfPageSignaturePlacement,
  serializePdfPageSignatureMap,
} from "../src/lib/pdfPageSignatures.ts";
import {
  createDefaultFillField,
  persistPdfPageFillFields,
} from "../src/lib/pdfPageFillFields.ts";

const pageId = buildPdfPageId(1);
const fullSignature = createPdfPageSignaturePlacement("sig-full", {
  fontSizeScale: 100,
});
const initials = createPdfPageSignaturePlacement("sig-initials", {
  fontSizeScale: 45,
});

let signatureMap = appendPdfPageSignaturePlacement({}, pageId, fullSignature);
signatureMap = appendPdfPageSignaturePlacement(signatureMap, pageId, initials);

assert.equal(
  signatureMap[pageId]?.length,
  2,
  "signature + initials must coexist on one page",
);
assert.notEqual(
  signatureMap[pageId]?.[0]?.id,
  signatureMap[pageId]?.[1]?.id,
  "each placement needs its own id",
);

const fillMap = persistPdfPageFillFields({}, pageId, [
  createDefaultFillField({ text: "Fill note" }),
]);

assert.equal(fillMap[pageId]?.length, 1, "fill text field stored separately");
assert.equal(
  countSignedPdfPages(signatureMap),
  1,
  "one signed page when placements exist",
);

signatureMap = removePdfPageSignaturePlacement(
  signatureMap,
  pageId,
  fullSignature.id,
);
assert.equal(signatureMap[pageId]?.length, 1);
assert.equal(signatureMap[pageId]?.[0]?.signatureId, "sig-initials");

const legacy = deserializePdfPageSignatureMap({
  [pageId]: {
    customPosition: null,
    fontSizeScale: 80,
    opacity: 70,
    signatureId: "legacy-sig",
    watermarkPosition: "bottom-right",
  },
});
assert.equal(legacy[pageId]?.length, 1, "legacy single placement migrates to array");

const roundTrip = deserializePdfPageSignatureMap(
  serializePdfPageSignatureMap(signatureMap),
);
assert.equal(roundTrip[pageId]?.length, 1);
assert.equal(roundTrip[pageId]?.[0]?.signatureId, "sig-initials");

console.log(
  "Acceptance test passed: signature + initials + fill text models coexist on one page.",
);
