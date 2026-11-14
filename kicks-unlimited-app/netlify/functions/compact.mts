// Every minute: fold the small change files into the main studio data file (see "saving without losing anyone's changes" in lib/state.mts).
import { compact } from "../lib/state.mts";
export const config = { schedule: "* * * * *" };
export default async () => { const n = await compact(); if (n) console.log(`folded ${n} change files`); };
