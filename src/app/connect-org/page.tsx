import { copy } from "@/lib/copy";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900";

export default async function ConnectOrgPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="max-w-lg">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">{copy.connectOrg.title}</h1>
      <p className="mb-6 text-sm text-zinc-500">{copy.connectOrg.intro}</p>
      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
          {error === "name" ? "Give the org a name first." : error === "domain" ? "That doesn't look like a Salesforce domain." : error}
        </p>
      )}
      {/* Plain GET form → /api/orgs/connect starts the Salesforce login redirect */}
      <form action="/api/orgs/connect" method="GET" className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <label className="mb-1 block text-sm font-medium">{copy.connectOrg.nameLabel}</label>
          <input name="name" placeholder="Jane's dev sandbox" className={inputCls} required />
          <p className="mt-1 text-xs text-zinc-500">{copy.connectOrg.nameHint}</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{copy.connectOrg.typeLabel}</label>
          <select name="orgType" className={inputCls} defaultValue="sandbox">
            <option value="sandbox">{copy.connectOrg.typeSandbox}</option>
            <option value="production">{copy.connectOrg.typeProduction}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{copy.connectOrg.domainLabel}</label>
          <input name="domain" placeholder="mycompany--dev.sandbox.my.salesforce.com" className={inputCls} />
          <p className="mt-1 text-xs text-zinc-500">{copy.connectOrg.domainHint}</p>
        </div>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500">
          {copy.connectOrg.submit}
        </button>
        <p className="text-xs text-zinc-500">{copy.connectOrg.security}</p>
        <p className="rounded-lg bg-zinc-100 p-2 text-xs text-zinc-500 dark:bg-zinc-800">
          {copy.connectOrg.preAuthHint}
        </p>
      </form>
    </div>
  );
}
