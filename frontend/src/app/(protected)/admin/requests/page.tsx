import { PageHeader, SectionCard } from "@/components/page-layout";
import { EmptyState } from "@/components/state-views";

export default function AdminRequestsPage() {
  return (
    <>
      <PageHeader
        breadcrumb={["Approval", "Requisition Requests"]}
        title="Requisition Requests"
        description="Review, approve or reject equipment requests from employees."
      />
      <SectionCard title="Requests">
        <div className="p-5">
          <EmptyState
            title="Not available yet"
            description="The request list will be added in feat/admin-request-list."
          />
        </div>
      </SectionCard>
    </>
  );
}
