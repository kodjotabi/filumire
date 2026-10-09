$ErrorActionPreference = "Stop"

$Root = "C:\Users\tabi\Desktop\filumire\FILUMIRE_CORE"

$path = "$Root\tests\complete-intervention-loop.test.ts"

$content = Get-Content $path -Raw

$needle = @'
state =
  applyEvidence(
    state,
    recoveryAssessment.evidence,
  );
'@

$replacement = @'
console.log({
  DEBUG_RECOVERY_EVIDENCE:
    recoveryAssessment.evidence,
});

state =
  applyEvidence(
    state,
    recoveryAssessment.evidence,
  );

console.log({
  DEBUG_INTERVENTION_HISTORY_AFTER_APPLY:
    state.competencies[0].interventionHistory,
});
'@

if (-not $content.Contains($needle)) {
    throw "Expected recovery applyEvidence block was not found."
}

$content = $content.Replace(
    $needle,
    $replacement,
)

Set-Content `
  $path `
  $content `
  -Encoding UTF8

Write-Host ""
Write-Host "Diagnostic logging installed."
Write-Host ""
Write-Host "Run:"
Write-Host "npx tsx --env-file=.env.local ./tests/complete-intervention-loop.test.ts"