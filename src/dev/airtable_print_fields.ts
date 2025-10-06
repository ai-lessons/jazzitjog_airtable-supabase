import "dotenv/config";
import * as airtable from "../airtable/fetch";

function pickFetch(mod: Record<string, any>) {
  const names = ["fetchAirtableRows","fetchAllRows","fetchAll","fetch","default"];
  for (const n of names) if (typeof (mod as any)[n] === "function") return (mod as any)[n] as () => Promise<any[]>;
  throw new Error(`No fetch fn in ../airtable/fetch. Exports: ${Object.keys(mod).join(", ")}`);
}

const fetchRows = pickFetch(airtable);

async function main() {
  const rows = await fetchRows();
  const rec = rows?.[0];
  const fields = rec?.fields ?? rec ?? {};
  console.log("Known field names:", Object.keys(fields));
  // покажем кандидатов по URL/дате
  for (const k of Object.keys(fields)) {
    const v = (fields as any)[k];
    const s = String(v).slice(0, 200).replace(/\s+/g, " ");
    if (/https?:\/\//i.test(s) || /date|published|link|url/i.test(k)) {
      console.log(`Sample [${k}]:`, s);
    }
  }
}
main().catch(err => { console.error(err); process.exit(1); });
