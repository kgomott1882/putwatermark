import type { SavedSignature } from "../../components/watermark/SignatureControls";
import {
  buildSignatureManifestEntry,
  normalizeSignatureKind,
  type SignatureManifestEntry,
} from "./signatureValidation";

export function buildSignatureManifestFromSavedSignatures(
  signatures: SavedSignature[],
): SignatureManifestEntry[] {
  return signatures.map((signature) =>
    buildSignatureManifestEntry({
      id: signature.id,
      kind: normalizeSignatureKind(signature.kind),
      label: signature.label,
      source: signature.source,
      typedText: signature.typedText ?? null,
    }),
  );
}

export function normalizeSavedSignatureKind(
  signature: Pick<SavedSignature, "kind">,
): SavedSignature["kind"] {
  return normalizeSignatureKind(signature.kind);
}
