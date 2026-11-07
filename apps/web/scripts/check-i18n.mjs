// CI: en.json and bn.json must have identical keys (blueprint M0).
import fs from "node:fs";
const en = Object.keys(JSON.parse(fs.readFileSync(new URL("../messages/en.json", import.meta.url)))).sort();
const bn = Object.keys(JSON.parse(fs.readFileSync(new URL("../messages/bn.json", import.meta.url)))).sort();
const miss = en.filter((k) => !bn.includes(k)), extra = bn.filter((k) => !en.includes(k));
if (miss.length || extra.length) { console.error("i18n mismatch", { missingInBn: miss, extraInBn: extra }); process.exit(1); }
console.log(`i18n ok: ${en.length} keys`);
