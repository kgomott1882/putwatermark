export const INITIALS_MAX_LENGTH = 10;
export const FULL_SIGNATURE_TYPED_MAX_LENGTH = 80;

export type SignatureKind = "full" | "initials";
export type SignatureSource = "draw" | "type";

export type SignatureManifestEntry = {
  id: string;
  kind: SignatureKind;
  label: string;
  source: SignatureSource;
  typedText?: string | null;
};

export function normalizeSignatureKind(
  kind: string | undefined | null,
): SignatureKind {
  return kind === "initials" ? "initials" : "full";
}

export function validateSignatureManifestEntry(
  entry: SignatureManifestEntry,
): string | null {
  if (!entry.id?.trim()) {
    return "Signature id is required.";
  }

  if (entry.kind === "initials") {
    if (entry.source !== "type") {
      return "Initials must be typed.";
    }

    const text = entry.typedText?.trim() ?? "";

    if (!text) {
      return "Initials text is required.";
    }

    if (text.length > INITIALS_MAX_LENGTH) {
      return `Initials must be ${INITIALS_MAX_LENGTH} characters or fewer.`;
    }

    return null;
  }

  if (entry.source === "type") {
    const text = entry.typedText?.trim() ?? "";

    if (!text) {
      return "Signature text is required.";
    }

    if (text.length > FULL_SIGNATURE_TYPED_MAX_LENGTH) {
      return `Signature text must be ${FULL_SIGNATURE_TYPED_MAX_LENGTH} characters or fewer.`;
    }
  }

  if (entry.source === "draw" && entry.kind !== "full") {
    return "Drawn signatures must be full signatures.";
  }

  return null;
}

export function validateSignatureManifest(
  entries: SignatureManifestEntry[],
): string | null {
  for (const entry of entries) {
    const error = validateSignatureManifestEntry(entry);

    if (error) {
      return error;
    }
  }

  return null;
}

export function buildSignatureManifestEntry(input: {
  id: string;
  kind: SignatureKind;
  label: string;
  source: SignatureSource;
  typedText?: string | null;
}): SignatureManifestEntry {
  return {
    id: input.id,
    kind: input.kind,
    label: input.label,
    source: input.source,
    typedText: input.typedText ?? null,
  };
}
