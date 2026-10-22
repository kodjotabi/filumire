import fs from "node:fs";
import crypto from "node:crypto";
const documents = [
  ["english", "https://nacca.gov.gh/wp-content/uploads/2019/06/ENGLISH-B4-B6.pdf"],
  ["mathematics", "https://nacca.gov.gh/wp-content/uploads/2019/04/MATHS-UPPER-PRIMARY-B4-B6.pdf"],
  ["science", "https://nacca.gov.gh/wp-content/uploads/2019/04/SCIENCE-UPPER-PRIMARY-B4-B6.pdf"],
  ["computing", "https://nacca.gov.gh/wp-content/uploads/2019/04/COMPUTING-B4-B6.pdf"],
];
const results = await Promise.all(documents.map(async ([subject, url]) => {
  const localPath = `docs/curriculum-sources/ghana/2019/${new URL(url).pathname.split("/").pop()}`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw Error("Not a PDF");
    if (!fs.existsSync(localPath)) fs.writeFileSync(localPath, bytes);
    else if (!fs.readFileSync(localPath).equals(bytes)) throw Error("Existing bytes differ; source was not overwritten");
    return { subject, url, localPath, status: "retrieved_https_official_host", bytes: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") };
  } catch (error) { return { subject, url, status: "unavailable", error: String(error) }; }
}));
fs.writeFileSync("docs/audits/basic4-6-completion/source-retrieval.json", JSON.stringify({ retrievedAt: new Date().toISOString(), documents: results }, null, 2) + "\n");
console.log(JSON.stringify(results));
if (results.some((r) => r.status === "unavailable")) process.exitCode = 1;
