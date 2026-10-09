const fs = require("fs");

const path = "tests/competency-003-adaptive-loop.test.ts";

let text = fs.readFileSync(path, "utf8");

const pattern =
  /  learnerState\s*=\s*await addNextCompetency\(\s*result003\.state,\s*"competency-test-004",\s*\);/s;

const replacement = `  const state003Completed = {
    ...result003.state,
    competencies:
      result003.state.competencies.map(
        (item) =>
          item.competencyId ===
          "competency-test-003"
            ? {
                ...item,
                retentionState: {
                  status: "retained",
                  confidence: 1,
                  evidenceIds: [],
                },
                transferState: {
                  status: "demonstrated",
                  confidence: 1,
                  evidenceIds: [],
                },
              }
            : item,
      ),
  };

  learnerState =
    await addNextCompetency(
      state003Completed,
      "competency-test-004",
    );`;

if (!pattern.test(text)) {
  console.error("TARGET NOT FOUND. NO CHANGES MADE.");
  process.exit(1);
}

text = text.replace(pattern, replacement);

fs.writeFileSync(path, text, "utf8");

console.log("EDIT COMPLETE");