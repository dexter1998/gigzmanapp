import { NewCampaignForm } from "./NewCampaignForm";

export default function NewCampaignPage() {
  return (
    <>
      <div className="page-header d-print-none"><div className="mx-auto w-full max-w-[1400px]">
        <h1>New campaign</h1>
      </div></div>
      <NewCampaignForm />
    </>
  );
}
