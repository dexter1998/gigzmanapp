import { NewCampaignForm } from "./NewCampaignForm";

export default function NewCampaignPage() {
  return (
    <>
      <div className="page-header d-print-none"><div className="container-xl">
        <h1>New campaign</h1>
      </div></div>
      <NewCampaignForm />
    </>
  );
}
