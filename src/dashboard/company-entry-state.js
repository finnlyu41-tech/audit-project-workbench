import { hasRequiredText } from './required-text.js';

// Editor-only validation. It neither creates records nor changes company-name rules.
export function batchCompanyEdited(company, baseline) {
  return ['legalName', 'entityType', 'fiscalYearPreset', 'relationshipRole']
    .some((field) => String(company?.[field] ?? '') !== String(baseline?.[field] ?? ''));
}

export function prepareCompanyEntry(values, batchCompanies = [], isBatch = false) {
  if (!hasRequiredText(values.legalName)) return { error: { field: 'legalName' } };
  if (isBatch && !batchCompanies.length) return { error: { field: 'batchCompanies' } };
  const invalidIndex = isBatch ? batchCompanies.findIndex((company) => !hasRequiredText(company.legalName)) : -1;
  if (invalidIndex >= 0) return { error: { field: 'batchCompanies', index: invalidIndex } };
  const members = isBatch ? batchCompanies.map((company) => ({
    legalName: company.legalName.trim(), entityType: company.entityType.trim(), kind: 'company',
    fiscalYearPreset: company.fiscalYearPreset, relationshipRole: company.relationshipRole.trim(),
  })) : [];
  return { values: { ...values, kind: isBatch ? 'holding_company' : values.kind,
    legalName: values.legalName.trim(), entityType: values.entityType.trim(),
    parentEntityId: values.parentEntityId || null,
    relationshipRole: values.parentEntityId ? values.relationshipRole.trim() : '', notes: values.notes.trim(),
    batchCompanies: members } };
}
