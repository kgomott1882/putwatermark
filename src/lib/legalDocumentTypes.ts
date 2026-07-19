export type LegalDocumentListBlock = {
  intro?: string;
  items: readonly string[];
  type: "list";
};

export type LegalDocumentSection = {
  body: readonly (string | LegalDocumentListBlock)[];
  title: string;
};
