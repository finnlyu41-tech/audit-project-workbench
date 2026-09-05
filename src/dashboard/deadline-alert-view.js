import { taxDeadlineCategoryLabel } from "./model.js";

export function deadlineAlertTitle(alert, language = "en") {
  if (alert.scope !== "tax") return alert.recordName;
  const title = taxDeadlineCategoryLabel(alert.taxDeadline, language);
  return alert.taxDeadline?.taxYear ? `${title} · ${alert.taxDeadline.taxYear}` : title;
}

export function deadlineAlertActionName(alert, language = "en") {
  const title = deadlineAlertTitle(alert, language);
  return alert.scope === "tax" ? `${alert.recordName} · ${title}` : title;
}

// Existing project alerts omit urgency and are overdue. Never recalculate dates here.
export const deadlineAlertUrgency = (alert) => alert.urgency || "overdue";
const normalize = (text) => String(text || "").normalize("NFKC").toLocaleLowerCase();

// View-only filtering. Do not index notes, references, revision reasons or hidden fields.
export function filterDeadlineAlerts(alerts, language = "en", { query = "", scope = "all", urgency = "all" } = {}) {
  const tokens = normalize(query).trim().split(/\s+/u).filter(Boolean);
  return alerts.filter((alert) => {
    if (scope === "tax" && alert.scope !== "tax" || scope === "delivery" && alert.scope === "tax") return false;
    if (urgency !== "all" && deadlineAlertUrgency(alert) !== urgency) return false;
    const text = normalize([alert.recordName, alert.owner, alert.dueDate, deadlineAlertTitle(alert, language),
      ...(alert.scope === "tax" ? ["en", "zh-Hans", "zh-Hant"].map((locale) => taxDeadlineCategoryLabel(alert.taxDeadline, locale)) : [])].join(" "));
    return tokens.every((token) => text.includes(token));
  });
}
