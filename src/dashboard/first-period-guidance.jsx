import React from 'react';
import { useUiLanguage } from './i18n.jsx';
import { formatDate } from './model.js';
import { firstPeriodEndChoices, periodEndAfterMonths } from './reporting-period-tools.js';

export function FirstPeriodGuidance({ period, entity, onChooseEnd }) {
  const { language,t }=useUiLanguage();
  const choices=firstPeriodEndChoices(period.periodStart,entity.fiscalYearPreset);
  const referenceEnd=periodEndAfterMonths(period.periodStart,18);
  const mismatch=entity.incorporationDate && entity.incorporationDate!==period.periodStart;
  const extended=referenceEnd && period.periodEnd>referenceEnd;
  return <section className="first-period-guidance" aria-label={t('首期报告期间')}>
    <p>{t('首期从成立日开始，结束日可以跨年；不是项目开工日。')}</p>
    {choices.length>0 && <label><span>{t('首期结束日建议')}</span>
      <select value="" aria-label={t('首期结束日建议')} onChange={event=>{if(event.target.value)onChooseEnd(event.target.value);}}>
        <option value="">{t('保留当前结束日，或选择建议')}</option>
        {choices.map((choice,index)=><option key={`${choice.kind}-${index}`} value={choice.end}>
          {choice.kind==='months'?t('从成立日起 {count} 个月',{count:choice.months}):t('公司年结日')} · {formatDate(choice.end,language)}
        </option>)}
      </select></label>}
    {mismatch && <p className="period-advisory" role="note">{t('此记录的首期起点与当前主档 DOI 不同；保留已存期间，不会自动改写。')}</p>}
    {extended && <p className="period-advisory" role="note">{t('首期已超过 18 个月建议范围，请核对适用规定及实际报告期；这不是合规确认。')}</p>}
    <details><summary>{t('首期与后续期间说明')}</summary><p>{t('首期可以短于或长于 12 个月；后续期间由上次实际结束日衔接。首次在 APW 建档不代表公司首次编报，可改用自定义期间。')}</p>
      <p>{t('香港公司的首个会计参照日通常须落在成立后 18 个月内；财务年度及其他地区规则另须核对，工具不作法定判断。')}</p></details>
  </section>;
}
