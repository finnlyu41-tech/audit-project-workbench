import React from 'react';
import { Building, Building2, ChevronRight, Plus, Search } from 'lucide-react';
import { CompanyForm, EngagementForm } from './v11-components.jsx';
import { localizeGroupSample, localizeSample, makeEntity } from './model.js';
import { resolveTemplateStarter, templateStarterCompanies } from './template-start-model.js';
import { useModalDraft } from './modal-draft.jsx';
import { useUiLanguage } from './i18n.jsx';

export function TemplateStartFlow({ store, templateRef, onClose, onCommit }) {
  const { language, t } = useUiLanguage();
  const [starter] = React.useState(() => resolveTemplateStarter(store, templateRef.kind, templateRef.id));
  const [step, setStep] = React.useState('choose');
  const [query, setQuery] = React.useState('');
  const [pendingCompany, setPendingCompany] = React.useState(null);
  const [reviewEntity, setReviewEntity] = React.useState(null);
  const [error, setError] = React.useState('');
  const errorRef = React.useRef(null);
  const flowRef = React.useRef(null);
  React.useEffect(() => {
    const selector = step === 'choose' ? '.template-start-search input' : 'form input:not([type=hidden]), form select';
    flowRef.current?.querySelector(selector)?.focus();
  }, [step]);
  const { closeEditor, confirmTransition } = useModalDraft(pendingCompany, onClose);
  const source = (templateRef.kind === 'workstream' ? store.samples : store.groupSamples).find((item) => item.id === templateRef.id);
  const sample = source ? (templateRef.kind === 'workstream' ? localizeSample(source, language) : localizeGroupSample(source, language)) : null;
  const companies = templateStarterCompanies(store, starter, query);
  React.useEffect(() => {
    if (!error) return;
    errorRef.current?.focus(); errorRef.current?.scrollIntoView({ block: 'nearest' });
  }, [error]);
  const review = (entity) => { setReviewEntity(entity); setStep('review'); setError(''); };
  const submit = (values) => {
    try { onCommit({ starter, pendingCompany, entityId: reviewEntity.id }, values); }
    catch (failure) {
      const message = failure.code === 'template_changed' ? "范本或种类已变更，请关闭后重新选择范本。"
        : failure.code === 'company_changed' ? "公司已变更或不可用，请关闭后重新选择公司。"
        : failure.message.includes('already exists') ? "这家公司已经有相同报告期间的项目，包括归档项目。"
        : "请检查报告期间后再建立项目。";
      setError(t(message));
    }
  };
  if (!starter) return <div className="template-start-empty"><p role="alert">{t("范本或种类已变更，请关闭后重新选择范本。")}</p>
    <button type="button" className="button secondary" onClick={closeEditor}>{t("返回范本库")}</button></div>;
  return <div className="template-start-flow" ref={flowRef}>
    <header className="template-start-summary"><strong>{t("本次使用的范本")}：{sample?.name || starter.name}</strong>
      <span>{t("只复制流程结构，不改变默认范本或既有项目。")}</span>
      <small>{t("确认建立项目之前，新公司与项目都不会保存。")}</small>
      {step === "company" && <small>{t(starter.entityKind === "holding_company" ? "将建立控股公司主档。" : "将建立普通公司主档。")}</small>}
      {step !== "choose" && <button type="button" className="button secondary template-start-back" onClick={() => confirmTransition(() => {
        setPendingCompany(null); setReviewEntity(null); setStep("choose"); setError("");
      })}>{t("重新选择公司")}</button>}</header>
    {error && <div className="form-error template-start-error" role="alert" tabIndex="-1" ref={errorRef}>{error}</div>}
    {step === 'choose' && <section className="template-start-chooser" aria-label={t("选择公司")}>
      <label className="template-start-search"><span>{t("查找可用公司")}</span><span><Search aria-hidden="true" />
        <input type="search" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t("查找可用公司")} /></span></label>
      <p>{t(starter.entityKind === 'company' ? "只列出未归档的普通公司。" : "只列出未归档的控股公司。")}</p>
      <div className="template-start-companies">{companies.map((entity) => <button type="button" key={entity.id}
        aria-label={entity.legalName} onClick={() => review(entity)}>
        {entity.kind === 'holding_company' ? <Building2 aria-hidden="true" /> : <Building aria-hidden="true" />}
        <span>{entity.legalName}</span><ChevronRight aria-hidden="true" /></button>)}</div>
      {!companies.length && <p role="status">{t("没有符合条件的公司，可修改搜索或新建公司。")}</p>}
      <footer><button type="button" className="button secondary" onClick={closeEditor}>{t("返回范本库")}</button>
        <button type="button" className="button primary" onClick={() => setStep('company')}><Plus aria-hidden="true" />{t("新建公司并继续")}</button></footer>
    </section>}
    {step === 'company' && <CompanyForm store={store} creationKind={starter.entityKind} submitLabel={t("下一步：设置年度项目")}
      onClose={onClose} onSubmit={(values) => { const entity = makeEntity(values); setPendingCompany(entity); review(entity); }} />}
    {step === 'review' && <EngagementForm store={store} entity={reviewEntity} templateStarter={starter} onClose={onClose} onSubmit={submit} />}
  </div>;
}
