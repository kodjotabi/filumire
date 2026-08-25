const fs = require("fs");

const p = "tests/competency-003-adaptive-loop.test.ts";

let s = fs.readFileSync(p, "utf8");

const old = `  learnerState =
    await addNextCompetency(
      result003.state,
      "competency-test-004",
    );`;

const neu = `  const state003Completed = {
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

if (!s.includes(old)) {
  console.error("TARGET BLOCK NOT FOUND. NO CHANGES MADE.");
  process.exit(1);
}

s = s.replace(old, neu);

fs.writeFileSync(p, s, "utf8");

console.log("EDIT COMPLETE");