// One-off build script: parses docs/{year}.md into PAST_EXAMS JS data literal.
// Run: node scripts/build-pastexam-data.js
// Prints `var PAST_EXAMS = {...};` to stdout (paste into index.html <script>).

const fs = require("fs");
const path = require("path");

const YEARS = ["2022", "2023", "2024", "2025"];
const DOCS_DIR = path.join(__dirname, "..", "docs");

function parseYear(year) {
  const text = fs.readFileSync(path.join(DOCS_DIR, year + ".md"), "utf8");
  const lines = text.split("\n");

  // ---- pass 1: answers + explanations from "## 정답 및 해설" ----
  var explainStart = lines.findIndex(function (l) { return l.trim() === "## 정답 및 해설"; });
  var explainEnd = lines.findIndex(function (l, i) { return i > explainStart && l.trim() === "## 이 세트의 참고 출처"; });
  if (explainEnd === -1) explainEnd = lines.length;
  var explainBlock = lines.slice(explainStart + 1, explainEnd);

  var answers = {}; // no -> {answer (1-based), explain}
  var curNo = null, curAnswer = null, curBuf = [];
  function flush() {
    if (curNo != null) {
      answers[curNo] = { answer: curAnswer, explain: curBuf.join("\n").trim() };
    }
  }
  explainBlock.forEach(function (line) {
    var m = line.match(/^### (\d+)\. (\d)번$/);
    if (m) {
      flush();
      curNo = parseInt(m[1], 10);
      curAnswer = parseInt(m[2], 10);
      curBuf = [];
    } else if (curNo != null) {
      curBuf.push(line);
    }
  });
  flush();

  // ---- pass 2: questions from "## 문제" ----
  var qStart = lines.findIndex(function (l) { return l.trim() === "## 문제"; });
  var qEnd = lines.findIndex(function (l, i) { return i > qStart && l.trim() === "## 정답표"; });
  var qBlock = lines.slice(qStart + 1, qEnd);

  var questions = [];
  var subject = null;
  var cur = null;
  qBlock.forEach(function (line) {
    var subjM = line.match(/^### (\d)과목/);
    if (subjM) { subject = parseInt(subjM[1], 10); return; }

    var qM = line.match(/^#### (\d+)\. \[난이도 (.+?)\] (.+)$/);
    if (qM) {
      if (cur) questions.push(cur);
      cur = {
        no: parseInt(qM[1], 10),
        subject: subject,
        difficulty: qM[2],
        q: qM[3].trim(),
        choices: []
      };
      return;
    }
    var cM = line.match(/^([1-5])\. (.+)$/);
    if (cM && cur) {
      cur.choices.push(cM[2].trim());
    }
  });
  if (cur) questions.push(cur);

  return questions.map(function (q) {
    var a = answers[q.no];
    if (!a) throw new Error(year + ": missing answer for question " + q.no);
    if (q.choices.length !== 5) throw new Error(year + ": question " + q.no + " has " + q.choices.length + " choices");
    return {
      no: q.no,
      subject: q.subject,
      difficulty: q.difficulty,
      q: q.q,
      choices: q.choices,
      answer: a.answer - 1,
      explain: a.explain
    };
  });
}

var out = {};
YEARS.forEach(function (year) {
  var qs = parseYear(year);
  if (qs.length !== 50) throw new Error(year + ": expected 50 questions, got " + qs.length);
  out[year] = qs;
});

process.stdout.write("  var PAST_EXAMS = " + JSON.stringify(out) + ";\n");
