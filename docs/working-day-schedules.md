# Working-day schedules / 按工作天数排期

## Use
Choose **Working days / 按工作天数** in the annual-engagement form or the timeline's schedule editor. Enter a whole-number estimate (1–1000) and a requested start date. The end date is calculated immediately and is read-only in this mode. Manual dates remain the default for existing records without an estimate.

The first working day counts as day 1. A weekend/public-holiday start moves to the next working day; both the requested start and the actual start are shown/preserved. Weekends that are also holidays are skipped once, not twice. Switch back to Manual dates to edit the last valid calculated dates directly.

选择「按工作天数」，输入预计天数和开始日，即时得出结束日。开始当天若为工作日即算第 1 天；遇休息日，实际开始日顺延。原有手动日期模式保留，可直接修改计算出的日期。

## Calendar and boundaries
- Initial calendar: **Hong Kong**, Monday–Friday working week. Saturdays and Sundays are excluded, plus gazetted public holidays. This is not the narrower statutory-holiday list, and not a statutory filing-deadline calculator.
- Official dataset: [Digital Policy Office / 1823](https://data.gov.hk/en-data/dataset/hk-dpo-statistic-cal), [source JSON](https://www.1823.gov.hk/common/ical/en.json). Verified 2026-09-08. Snapshot version: `HK-2025-2027-20260908`; 17 listed public holidays in each of 2025, 2026 and 2027.
- Computation must remain inside **2025-01-01 through 2027-12-31**. Every traversed date is checked, including cross-year weekends. Missing years produce an explicit error and prevent automatic-mode save; never assume an unknown day is a working day. Manual dates remain available.
- Dates and the official snapshot are local: no runtime holiday API, user data transfer, geolocation or new dependency. UTC date-only arithmetic avoids browser timezone/DST errors.
- Whole days only. Personal leave, extra company holidays, alternative workweeks, other jurisdictions, workload conflicts and task dependencies are not included in this first mode.

## Persistence and safety
The optional `schedulePlan` stores the estimate, requested start, HK calendar/workweek and calendar version. Operational `startDate` / `dueDate` remain ordinary stored dates. Existing records without a plan remain structurally unchanged. Reopening or loading a backup preserves the saved dates and version; explicit estimate/start edits recalculate against the bundled calendar. Switching to manual removes only the plan, not the dates.

New annual engagements do not inherit prior-year dates/estimates. Quick owner/framework changes must not touch schedules. Financial-report periods, tax deadlines, company records, workstreams and archived-record permissions retain their existing boundaries. Cancel is guarded by the existing unsaved-draft mechanism.

## Maintenance and regression examples
When 1823 publishes another year, verify the full official list (including substitution days), extend both the snapshot and coverage limits, update the visible coverage text/translations and version, then rerun calculation, restore, browser and production tests. Do not recalculate saved plans during the update.

Examples: 2026-09-30 + 3 working days ends 2026-10-05; 2026-04-02 + 2 ends 2026-04-08 (both 6 and 7 April are official replacement holidays); 2026-04-03 + 1 starts/ends 2026-04-08; 2026-12-31 + 2 ends 2027-01-04. Request: issue #71.
