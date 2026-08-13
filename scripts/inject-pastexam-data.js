// Splices the generated PAST_EXAMS data line into index.html right after
// the UPLOADED_MC concat line. Run once: node scripts/inject-pastexam-data.js
const fs = require("fs");
const path = require("path");

const indexPath = path.join(__dirname, "..", "index.html");
const dataPath = process.argv[2];
if (!dataPath) throw new Error("usage: node inject-pastexam-data.js <data-file>");

const html = fs.readFileSync(indexPath, "utf8");
const dataLine = fs.readFileSync(dataPath, "utf8").trimEnd();

const marker = "QUESTIONS = QUESTIONS.concat(UPLOADED_MC);";
const markerIdx = html.indexOf(marker);
if (markerIdx === -1) throw new Error("anchor not found");
if (html.indexOf("var PAST_EXAMS") !== -1) throw new Error("PAST_EXAMS already present");

const lineEnd = html.indexOf("\n", markerIdx) + 1;
const out = html.slice(0, lineEnd) + dataLine + "\n" + html.slice(lineEnd);
fs.writeFileSync(indexPath, out, "utf8");
console.log("inserted", dataLine.length, "chars at offset", lineEnd);
