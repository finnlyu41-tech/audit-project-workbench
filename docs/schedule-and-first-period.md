# Schedule canvas and first reporting periods / 排期画布与首期报告期间

## Work dates are not reporting dates

A company DOI is the incorporation/commencement date on its master record. Reporting periods describe the financial statements being worked on; operational start/due dates describe when that work is performed. They are stored separately. An 18-month first reporting period does not create an 18-month work bar.

In a company with no reporting period recorded in APW, a valid DOI suggests a first-period start. The existing default year-end remains a draft suggestion, not a restriction. **Suggested first-period end** offers eligible current/following-year December or March year-ends, plus inclusive 12/18-month end suggestions. The actual end can always be entered manually, including a different closing month. Custom period entry remains available: the first APW record is not proof that a company has never prepared accounts before.

Example: DOI `2025-01-01`, first reporting end `2026-06-30`; operational work `2026-08-01` to `2026-10-31`. All four dates remain distinct. The next suggested reporting period is `2026-07-01` to `2027-06-30`, not another calendar year or another DOI period. The same continuation applies to adding a period within one project and creating another project. Archived periods are included when finding the latest recorded end; unrelated companies are not.

The explicit `doi_year_end` marker and actual saved start/end remain snapshots. Updating a company DOI or default accounting year does not rewrite existing engagements, reporting labels, historical consolidation scope or work schedules. Backups carry the existing V11 period fields unchanged; no new required reporting schema is introduced.

## Reference and legal boundary

Checked 2026-09-07: Hong Kong Companies Registry Accounts and Audit FAQ Q23–27 explains incorporation as the first accounting reference period's start (s368(2)), a primary accounting reference date within 18 months (s369(5)–(7)), and the s367(1) financial-year end variation of seven days. HKICPA FAQ E3 explains why a financial year is not invariably twelve months.

- https://www.cr.gov.hk/en/faq/companies-ordinance/co-account-audit.htm
- https://www.hkicpa.org.hk/en/Tools/FAQ/Standards/New-Companies-Ordinance/CO-rewrite---non-transitional-QA

An 18-month inclusive-end suggestion is not a statutory approval or a universal date veto. The app has no verified entity-jurisdiction/compliance engine; a longer DOI period prompts review, rather than silently truncating it or treating it as approved. Actual statutory periods, accounting reference dates, other jurisdictions, dormancy, tax basis periods and filing deadlines require separate assessment. Normal date validity and non-reversed-range checks still apply.

## Space and interaction

The schedule owns the main work canvas. Duplicate company navigation becomes an explicitly opened temporary drawer; leaving the schedule restores the saved navigation preference. The outstanding panel is likewise an overlay, not a permanent width deduction. Search/date/status filters and legends open on demand. Active filters and counts remain visible, with a clear action that restores focus.

The timeline uses the remaining height instead of `viewport minus 340px`. The fixed identity column adapts to available width without overwriting the user's saved width. Full names remain in accessible row text and the row title; visible company names use at most two lines. Work dates remain visible and editable. Group/reporting period identity is preserved.

Timeline calculations use date-only UTC values, handle leap days and years below 100, fill available width and bound generated tick counts. Astronomical date spans are summarized with an explicit notice, preserving all rows and dates rather than generating millions of day elements. The user's requested precision remains a preference; the notice identifies aggregated rendering.

## 中文操作

“项目排期”现在把中间区域交给时间轴。左侧公司导航和右侧待清仍可打开，但只临时覆盖，不把排期表挤窄。搜索、日期完整性及活跃／已完成／归档筛选按需展开，已启用的筛选不会无提示地隐藏记录。图例与说明移到表格下方。

新建首期时，选择“成立日（DOI）→ 年结日”，在“首期结束日建议”中选择年结日、12个月或18个月，或直接填写实际报告结束日。比如 2025-01-01 成立、首期到 2026-06-30，是同一个18个月期间，不是两个独立年度。实际工作可以排在 2026-08-01 至 2026-10-31；排期条不会从 DOI 开始。

下个期间按上次真实结束日衔接。上述例子的下一期为 2026-07-01 至 2027-06-30。公司主档 DOI 的后续修改不改写已经保存的首期；需要纠正报告期间时，在具体项目中明确编辑。首期长于18个月会提示核对适用规则，提示不是合规结论，也不会偷偷截短输入。

## Release verification

Use fictional isolated data only. Verify the same default schedule at fixed 800/1024/1280/1440/1920 CSS widths, actual date-edit actions, explicit filter opening/clearing, saved preference restoration, and three languages. Restore an actual downloaded first-period backup into a clean context and compare complete canonical records. Include prior priority controls at repeated narrow-width transitions, preserving the ≤90px gate that blocked the preceding release; do not substitute a retry for a fix. Then run full final-build regression, CI, Pages and post-publication verification against matching asset bytes.

### Release follow-up: actual regression causes

The Linux WebKit failure screenshot showed a docked company column at an 800px viewport, leaving the quick-update toolbar too narrow. A controlled dual-engine reproduction suppresses breakpoint `MediaQueryList` notifications and confirms the previous implementation retained that column. Viewport width now uses React's external-store subscription to the real layout viewport, read during rendering as well as on resize. Wide-screen preferences are kept separately and restored.

The schedule accessibility journey explicitly opens the new temporary company drawer before selecting its next record; its accessibility assertions remain intact. Day view remains exact for ordinary multi-year plans up to roughly ten years. Only larger ranges are aggregated, with the notice and extreme-range bound retained. An 800-day regression now verifies that choosing Day actually produces day ticks.
