# Working-day schedule estimates / 按工作日估算排期

## Use

Open an engagement's schedule editor from the timeline date action, or the annual creation/edit form. Select **Estimate working days**, choose the requested start date and enter a whole number of working days. The preview recalculates immediately; the existing Save button applies the resulting start/end pair. Ordinary manual date entry remains the default and is unrestricted by holiday-data coverage.

The initial working week is Monday–Friday. Monday–Saturday is an explicit alternative. Both exclude **Hong Kong general/public holidays**, not just the statutory labour-holiday subset. This release does not infer another jurisdiction from a company name.

The effective start counts as working day 1. A one-day engagement starts and ends on that same working date. A requested weekend/holiday start moves forward with a visible explanation. Skipped dates can be expanded, showing official holiday names or Weekend. A date that is both a weekend and a holiday is counted only once. Observed holidays use the gazetted dates; no extra substitute day is invented.

Example: 30 September 2026 + 3 working days with a five-day week ends on 5 October 2026. 1 October is a public holiday and 3–4 October are the weekend. The six-day option ends on 3 October instead. A requested 3 April 2026 start moves to 8 April after the Easter/Ching Ming holidays and Sunday.

## Calendar provenance and coverage

The bundled snapshot was checked on **2026-09-08**. It covers **2025-01-01 through 2027-12-31**, with 17 gazetted non-Sunday general holidays per year. Sundays are excluded by the working-week calculation. The 51 dates in the three language versions of 1823 iCal were cross-checked against GovHK's individual year tables, not copied from an unofficial lunar-date algorithm. Source URLs and SHA-256 hashes are retained in `src/dashboard/hk-holidays.js`.

- https://www.1823.gov.hk/en/hong-kong-public-holidays-ical
- https://www.1823.gov.hk/common/ical/en.ics
- https://www.1823.gov.hk/common/ical/tc.ics
- https://www.1823.gov.hk/common/ical/sc.ics
- https://www.gov.hk/en/about/abouthk/holiday/2025.htm
- https://www.gov.hk/en/about/abouthk/holiday/2026.htm
- https://www.gov.hk/en/about/abouthk/holiday/2027.htm

Calculation is local, with no runtime calendar fetch or transmission of company/project data. Once the workbench is loaded it works offline. If the requested start or completion would leave the covered years, estimation stops with an explanation; no partial/stale preview can be saved. Switch to manual dates or use a released, verified calendar update. Holiday data is a versioned snapshot, not a live subscription.

## Save, cancel and persistence

Estimates are part of the current editor's unsaved draft. Cancelling or Escape uses the existing discard guard; dismissing the guard keeps the estimate. Invalid input or unknown coverage cannot fall back to the previous end date. A valid estimate can be switched to Manual dates for explicit adjustment before saving. Switching away from an untouched estimate preserves the original manual dates.

Only the resulting `startDate` and `dueDate` are stored. There is no new required business field or schema migration, and reopening the editor defaults to manual dates. Backup and linked-file serialization use the existing ordinary date fields. Updating a future holiday snapshot will not silently reschedule projects already saved. No DOI, reporting periods, audit conditions, tax dates, project priorities, historical group components, other projects or saved order is changed.

This is consecutive working-day duration, not effort/person-days, daily working hours, staffing capacity or a dependency scheduler. It does not account for personal leave, sick leave, half-days, weather closures, client-specific calendars, other jurisdictions or mainland make-up working weekends. Use manual dates for those exceptions.

## 中文操作

在项目排期的编辑窗口，或新建／编辑年度项目中的“项目排期”，选择“按工作日估算”，填写预计开始日和工作天数，系统即预览实际开始日与预计结束日。默认周一至周五工作；有周六工作的情况可明确选择周一至周六。两种工作周都跳过香港公众假期。

开始日算第1个工作日；只需1天的项目同日结束。开始日落在不工作日期时，会先显示顺延说明，保存后才采用。可以展开“跳过的日期”查看具体假期，不需要自己逐日在日历中数。原来的“手动日期”仍保留。

本版内置2025–2027年官方假期，之后的年份资料未核对时不会猜测结束日；会提示改用手动日期或更新到已核对的新版本。假期更新也不会改写已经保存的项目。估算设置本身只在本次编辑保留，保存的是实际起止日期。

## Calendar maintenance and testing

Before extending coverage, retrieve all three official 1823 calendars and the GovHK table for every added year; compare the complete date sets, preserve the language labels and update `checkedAt`, coverage and source hashes. Review the published observed-day rule, rather than computing an additional substitute day. Update the independently reviewed date-digest test only after checking those sources. Calendar updates go through the normal release gate, not a background fetch in a client workspace.

Tests cover all supported starting dates against an independently enumerated working-day sequence for both workweeks, plus holiday collisions, cross-year boundaries, invalid dates, unknown years, timezone independence, date-only saving, draft cancellation, annual/group/DOI boundaries, actual download/restore and offline operation. Browser validation uses isolated fictional data; it does not inspect customers' saved workspaces or prove every native device was tested.
