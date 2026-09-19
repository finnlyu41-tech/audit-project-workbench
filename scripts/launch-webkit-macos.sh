#!/bin/sh
set -eu
: "${APW_WEBKIT_EXECUTABLE:?Expected the Playwright-managed WebKit launcher}"
# Avoid AppKit animation-thread exhaustion without writing any macOS preference.
# Preserve Playwright's original arguments and inherited inspector pipe descriptors.
exec "$APW_WEBKIT_EXECUTABLE" "$@" -NSAutomaticWindowAnimationsEnabled NO
