import React from 'react';
import { annualSourcePreview } from './annual-source-model.js';
import { formalReportingPeriodLabel, localizeGroupSample, localizeSample, workstreamCategoryLabel } from './model.js';
import { useUiLanguage } from './i18n.jsx';

export const ANNUAL_SOURCE_ERRORS = {
  company_unavailable: "这家公司已归档或不存在，请关闭后重新选择。",
  source_unavailable: "来源项目已不存在或不属于这家公司，请重新选择来源年度。",
  template_unavailable: "所选范本或种类已不可用，请重新选择起始范本。",
};
export function AnnualSourceSummary({ store, entityId, options, selections }) {
  const { language, t } = useUiLanguage();
  let preview;
  try { preview = annualSourcePreview(store, entityId, options, selections); }
  catch (error) { return <p className="form-error" role="alert">{t(ANNUAL_SOURCE_ERRORS[error.code] || ANNUAL_SOURCE_ERRORS.source_unavailable)}</p>; }
  const { sourceMode, sourceEngagement, groupSample } = preview;
  return <section className="annual-source-summary" aria-label={t("本次流程来源")}>
    <strong>{t("本次流程来源")}</strong>
    {sourceMode === 'previous' && <p>{formalReportingPeriodLabel(sourceEngagement, language)}
      {sourceEngagement.archived && <span className="annual-source-archived">{t("已归档")}</span>}</p>}
    {sourceMode === 'blank' && <p>{t("不复制节点或完成条件；可在建立后添加业务模块。")}</p>}
    {sourceMode === 'template' && <ul>{selections.map((selection) => {
      const category = store.workstreamCategories.find((item) => item.id === selection.categoryId);
      const sample = store.samples.find((item) => item.id === selection.sampleId);
      return <li key={selection.categoryId}>{workstreamCategoryLabel(category, language)}：{sample ? localizeSample(sample, language).name : t("空白流程")}</li>;
    })}{preview.entity.kind === 'holding_company' && <li>{t("本级合并流程")}：{groupSample.name ? localizeGroupSample(groupSample, language).name : t("空白流程")}</li>}</ul>}
    <p>{t("将建立 {modules} 个业务模块、{nodes} 个节点、{conditions} 项完成条件。", preview)}</p>
    <small>{t("只复制流程结构，完成勾选、模块负责人和模块截止日重新开始。项目负责人和排期以本次填写为准。")}</small>
    <small>{t("不会复制待清事项、税务期限或原项目备注。")}</small>
  </section>;
}
