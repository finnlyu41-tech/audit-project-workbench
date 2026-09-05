import { companyOverviewFixture } from "./company-overview.js";
import { canonicalStorePayload, normalizeStore } from "../../src/dashboard/model.js";

// Fictional long labels and duplicate item IDs across separate source engagements.
export function outstandingCenterFixture() {
  const store = companyOverviewFixture();
  const source = store.engagements.find((entry) => entry.id === "overview-combined");
  const group = store.engagements.find((entry) => entry.id === "overview-group");
  store.outstandingStatuses.push({ id: "long-review", label: "Awaiting independent review and supporting documentation",
    color: "#386641", closed: false });
  source.outstandingItems = [
    { id: "shared-item", title: "Review the signed confirmation and all supporting schedules " + "LONGREFERENCE".repeat(8),
      status: "long-review", note: "NONINDEXEDCONFIDENTIALNOTE".repeat(14), workstreamId: source.workstreams[0].id },
    { id: "next-item", title: "Follow up on the final confirmation", status: "missing_document", note: "", workstreamId: null },
    { id: "cleared-item", title: "Previously resolved confirmation", status: "resolved", note: "", workstreamId: null },
  ];
  group.owner = "Morgan Parent";
  group.outstandingItems = [{ id: "shared-item", title: "Parent approval confirmation", status: "missing_document", note: "", workstreamId: null }];
  return canonicalStorePayload(normalizeStore(store));
}
