import React from "react";
import { useUiLanguage } from "./i18n.jsx";
import { hasRequiredText, REQUIRED_TEXT_PATTERN } from "./required-text.js";

// Use inside a label with a stable accessible name. Validation never mutates the draft.
export function RequiredTextInput({ value, onInvalid, "aria-describedby": describedBy, ...props }) {
  const { t } = useUiLanguage();
  const errorId = React.useId();
  const [validated, setValidated] = React.useState(false);
  const invalid = validated && !hasRequiredText(value);
  const description = [describedBy, invalid ? errorId : ""].filter(Boolean).join(" ");
  return <>
    <input {...props} value={value} required pattern={REQUIRED_TEXT_PATTERN}
      aria-invalid={invalid || undefined} aria-describedby={description || undefined}
      onInvalid={(event) => { setValidated(true); onInvalid?.(event); }} />
    {invalid && <small id={errorId} className="field-validation" role="alert">
      {t("请填写内容，不能只输入空格。")}</small>}
  </>;
}
