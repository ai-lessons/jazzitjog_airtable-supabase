"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const airtable = __importStar(require("../airtable/fetch"));
function pickFetch(mod) {
    const names = ["fetchAirtableRows", "fetchAllRows", "fetchAll", "fetch", "default"];
    for (const n of names)
        if (typeof mod[n] === "function")
            return mod[n];
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
        const v = fields[k];
        const s = String(v).slice(0, 200).replace(/\s+/g, " ");
        if (/https?:\/\//i.test(s) || /date|published|link|url/i.test(k)) {
            console.log(`Sample [${k}]:`, s);
        }
    }
}
main().catch(err => { console.error(err); process.exit(1); });
//# sourceMappingURL=airtable_print_fields.js.map