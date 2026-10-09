$ErrorActionPreference = "Continue"

# The folder this script lives in, so it always validates the copy it belongs to.
$Root = Split-Path -Parent $PSScriptRoot
$Learner = "$Root\apps\learner"
$RuntimeLog = "$Root\scripts\learner-runtime.log"
$RuntimeErrorLog = "$Root\scripts\learner-runtime-error.log"
$SessionScriptPath = "$Root\scripts\create-runtime-session.ts"

Set-Location $Root

$failed = $false

Write-Host ""
Write-Host "========================================"
Write-Host " FILUMIRE AUTOMATED VALIDATION"
Write-Host "========================================"

$tests = @(
    "tests/adaptive-learning-loop.test.ts",
    "tests/competency-003-adaptive-loop.test.ts",
    "tests/adaptive-content-intervention-integration.test.ts",
    "tests/complete-intervention-loop.test.ts",
    "tests/intervention-adaptive-integration.test.ts",
    "tests/intervention-lifecycle.test.ts",
    "tests/intervention-persistence.test.ts",
    "tests/content-selection.test.ts",
    "tests/content-language-selection.test.ts",
    "tests/governed-instructional-engine.test.ts",
"tests/four-subject-filu-v1.test.ts",
    "tests/learner-intelligence-policy.test.ts",
    "tests/adaptive-learner-intelligence.test.ts",
    "tests/retention-transfer-policy.test.ts",
    "tests/retention-transfer.test.ts",
    "tests/api-assessment-security.test.ts",
    "tests/api-identity-security.test.ts",
    "tests/production-learner-journey.test.ts",
    "tests/production-curriculum-foundation.test.ts",
    "tests/curriculum-framework.test.ts",
"tests/b4-curriculum-integrity.test.ts",
"tests/b4-science-curriculum-integrity.test.ts",
"tests/b4-science-adaptive-slice.test.ts",
"tests/b4-science-adaptive-coverage.test.ts",
"tests/b4-mathematics-adaptive-coverage.test.ts",
"tests/b4-computing-curriculum-integrity.test.ts",
"tests/b4-computing-adaptive-coverage.test.ts",
"tests/b4-english-adaptive-coverage.test.ts",
"tests/four-subject-adaptive-intelligence.test.ts",
    "tests/learner-learning-context-persistence.test.ts",
    "tests/production-curriculum-resolution.test.ts",
    "tests/production-learner-product-experience.test.ts",
"tests/learner-ui-runtime-integrity.test.ts",
    "tests/adult-supervision.test.ts",
    "tests/ghana-pilot-context.test.ts",
    "tests/low-connectivity-sync.test.ts",
    "tests/pending-submission-client.test.ts",
    "tests/pilot-concurrency-hardening.test.ts",
    "tests/pilot-session-hardening.test.ts",
    "tests/pilot-storage-hardening.test.ts",
    "tests/pilot-smoke-journey.test.ts",
    "tests/payment-service-config.test.ts",
    "tests/payment-service.test.ts",
    "tests/paystack-adapter.test.ts",
    "tests/payment-lifecycle.test.ts",
    "tests/payment-obligation-contracts.test.ts",
    "tests/payment-obligation-ledger.test.ts",
    "tests/evidence-context-v1.test.ts",
    "tests/misconception-evidence-v1.test.ts",
    "tests/offline-shell-v1.test.ts",
    "tests/learner-path-v1.test.ts",
    "tests/learner-path-curriculum-v1.test.ts",
    "tests/time-aware-retention-v1.test.ts",
    "tests/time-aware-retention-engine-v1.test.ts",
    "tests/b5-science-v1.test.ts",
    "tests/b6-science-v1.test.ts",
    "tests/b5-computing-v1.test.ts",
    "tests/b6-computing-v1.test.ts",
    "tests/b5-mathematics-v1.test.ts",
    "tests/b6-mathematics-v1.test.ts",
    "tests/b5-english-v1.test.ts",
    "tests/b6-english-v1.test.ts",
    "tests/b5-b6-english-runtime.test.ts",
    "tests/b5-b6-english-adaptive-loop.test.ts",
    "tests/grade-aware-subject-selection.test.ts",
    "tests/adaptive-selection-4b.test.ts",
    "tests/card-acknowledgement-4b.test.ts",
    "tests/mastery-reuse-4b.test.ts",
    "tests/whole-subject-progression-4b.test.ts",
    "tests/full-adaptive-progression.test.ts",
    "tests/no-premature-advancement.test.ts",
    "tests/needs-support-4c.test.ts",
    "tests/b4-number-patterns-content-4c.test.ts",
    "tests/pilot-measures-4c.test.ts",
    "tests/prerequisite-repair-4d.test.ts",
    "tests/option-order-4e.test.ts",
    "tests/content-integrity-4e.test.ts",
    "tests/route-advance-4g.test.ts",
    "tests/learner-journey-route-4h.test.ts",
    "tests/interface-completion.test.ts"
)

foreach ($test in $tests) {
    Write-Host ""
    Write-Host "----------------------------------------"
    Write-Host $test
    Write-Host "----------------------------------------"

    & npm exec -- tsx --env-file=.env.local $test

    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED: $test" -ForegroundColor Red
        $failed = $true
    }
    else {
        Write-Host "PASS: $test" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "----------------------------------------"
Write-Host "LEARNER PRODUCTION BUILD"
Write-Host "----------------------------------------"

if ($env:FILUMIRE_SKIP_BUILD -eq "1") {
    Write-Host "Skipped: FILUMIRE_SKIP_BUILD=1"
}
else {
    & npm run build:learner

    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED: learner production build" -ForegroundColor Red
        $failed = $true
    }
    else {
        Write-Host "PASS: learner production build" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "----------------------------------------"
Write-Host "LIVE LEARNER RUNTIME"
Write-Host "----------------------------------------"

if (Test-Path $RuntimeLog) {
    Remove-Item $RuntimeLog -Force
}

if (Test-Path $RuntimeErrorLog) {
    Remove-Item $RuntimeErrorLog -Force
}

if (Test-Path $SessionScriptPath) {
    Remove-Item $SessionScriptPath -Force
}

$runtimeLearnerId = "learner-runtime-validation-001"
$runtimeSessionId = "session-runtime-validation-$(Get-Date -Format yyyyMMddHHmmssfff)"

$server = $null

try {

    Write-Host "Creating runtime validation session..."

    $sessionScript = @"
import { createSession } from "../services/session/index.ts";

const learnerId = "$runtimeLearnerId";
const sessionId = "$runtimeSessionId";

await createSession(sessionId, learnerId);

console.log(JSON.stringify({
  learnerId,
  sessionId,
  result: "PASS"
}));
"@

    Set-Content `
        -Path $SessionScriptPath `
        -Value $sessionScript `
        -Encoding UTF8

    & npm exec -- tsx --env-file=.env.local $SessionScriptPath

    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED: could not create runtime validation session" -ForegroundColor Red
        $failed = $true
    }
    else {
        Write-Host "PASS: runtime validation session created" -ForegroundColor Green
    }

    $skipRuntime = ($env:FILUMIRE_SKIP_RUNTIME -eq "1")

    if ($skipRuntime) {
        Write-Host "Skipped: FILUMIRE_SKIP_RUNTIME=1"
    }

    if ((-not $failed) -and (-not $skipRuntime)) {

        Write-Host "Starting learner server..."

        $server = Start-Process `
            -FilePath "cmd.exe" `
            -ArgumentList "/c","npm run dev" `
            -WorkingDirectory $Learner `
            -RedirectStandardOutput $RuntimeLog `
            -RedirectStandardError $RuntimeErrorLog `
            -PassThru

        Write-Host "Learner server process started. PID: $($server.Id)"

        $ready = $false

        for ($i = 1; $i -le 30; $i++) {
            Start-Sleep -Seconds 1

            try {
                $response = Invoke-WebRequest `
                    -Uri "http://localhost:3000/learn" `
                    -UseBasicParsing `
                    -TimeoutSec 3

                if ($response.StatusCode -eq 200) {
                    $ready = $true
                    break
                }
            }
            catch {
            }
        }

        if (-not $ready) {
            Write-Host "FAILED: learner server did not become ready" -ForegroundColor Red
            $failed = $true

            if (Test-Path $RuntimeLog) {
                Write-Host ""
                Write-Host "LEARNER SERVER OUTPUT:"
                Get-Content $RuntimeLog
            }

            if (Test-Path $RuntimeErrorLog) {
                Write-Host ""
                Write-Host "LEARNER SERVER ERRORS:"
                Get-Content $RuntimeErrorLog
            }
        }
        else {

            Write-Host "PASS: /learn returned 200" -ForegroundColor Green

            Write-Host ""
            Write-Host "Checking authenticated learning route..."

            try {

                $headers = @{
                    "x-filumire-learner-id" = $runtimeLearnerId
                }

                # Tranche 4E (decision, 7 Oct): one untimed warm-up request lets Next dev compile
                # /api/learning first. Its time is the cold start and is reported, never a failure;
                # the checked requests below keep their 10 s timeout.
                $warmupTimer = [System.Diagnostics.Stopwatch]::StartNew()

                try {
                    $null = Invoke-WebRequest `
                        -Uri "http://localhost:3000/api/learning?sessionId=$runtimeSessionId" `
                        -Headers $headers `
                        -UseBasicParsing `
                        -TimeoutSec 120
                    $warmupTimer.Stop()
                    Write-Host "TIMING: cold start (untimed warm-up, dev compile + first run) $($warmupTimer.ElapsedMilliseconds) ms"
                }
                catch {
                    $warmupTimer.Stop()
                    Write-Host "TIMING: warm-up request did not succeed after $($warmupTimer.ElapsedMilliseconds) ms: $($_.Exception.Message)"
                }

                # Tranche 4B: timing of the checked request is reported (timeout unchanged).
                $coldTimer = [System.Diagnostics.Stopwatch]::StartNew()

                $learningResponse = Invoke-WebRequest `
                    -Uri "http://localhost:3000/api/learning?sessionId=$runtimeSessionId" `
                    -Headers $headers `
                    -UseBasicParsing `
                    -TimeoutSec 10

                $coldTimer.Stop()
                Write-Host "TIMING: first checked learning request $($coldTimer.ElapsedMilliseconds) ms"

                for ($warm = 1; $warm -le 2; $warm++) {
                    try {
                        $warmTimer = [System.Diagnostics.Stopwatch]::StartNew()
                        $null = Invoke-WebRequest `
                            -Uri "http://localhost:3000/api/learning?sessionId=$runtimeSessionId" `
                            -Headers $headers `
                            -UseBasicParsing `
                            -TimeoutSec 10
                        $warmTimer.Stop()
                        Write-Host "TIMING: warm learning request $warm $($warmTimer.ElapsedMilliseconds) ms"
                    }
                    catch {
                        Write-Host "TIMING: warm learning request $warm failed: $($_.Exception.Message)"
                    }
                }

                if ($learningResponse.StatusCode -eq 200) {

                    Write-Host "PASS: authenticated learning route returned 200" -ForegroundColor Green

                    try {

                        $learningJson = $learningResponse.Content | ConvertFrom-Json

                        if ($null -ne $learningJson) {
                            Write-Host "PASS: learning route returned valid JSON" -ForegroundColor Green
                        }
                        else {
                            Write-Host "FAILED: learning route returned empty JSON" -ForegroundColor Red
                            $failed = $true
                        }

                    }
                    catch {

                        Write-Host "FAILED: learning route returned invalid JSON" -ForegroundColor Red
                        $failed = $true

                    }

                }
                else {

                    Write-Host "FAILED: authenticated learning route returned HTTP $($learningResponse.StatusCode)" -ForegroundColor Red
                    $failed = $true

                }

            }
            catch {

                Write-Host "FAILED: authenticated learning route request" -ForegroundColor Red
                Write-Host $_.Exception.Message
                $failed = $true

            }

            Write-Host ""
            Write-Host "Checking unauthenticated security boundary..."

            try {

                $unauthenticatedResponse = Invoke-WebRequest `
                    -Uri "http://localhost:3000/api/learning" `
                    -UseBasicParsing `
                    -TimeoutSec 10

                Write-Host "FAILED: unauthenticated request unexpectedly returned HTTP $($unauthenticatedResponse.StatusCode)" -ForegroundColor Red
                $failed = $true

            }
            catch {

                if ($null -ne $_.Exception.Response) {

                    $statusCode = [int]$_.Exception.Response.StatusCode

                    if ($statusCode -eq 401) {
                        Write-Host "PASS: unauthenticated learning route returned 401" -ForegroundColor Green
                    }
                    else {
                        Write-Host "FAILED: unauthenticated learning route returned HTTP $statusCode" -ForegroundColor Red
                        $failed = $true
                    }

                }
                else {

                    Write-Host "FAILED: could not evaluate unauthenticated security boundary" -ForegroundColor Red
                    Write-Host $_.Exception.Message
                    $failed = $true

                }

            }
        }
    }
}
finally {

    if ($null -ne $server) {

        Write-Host ""
        Write-Host "Stopping learner server..."

        try {
            & taskkill.exe /PID $server.Id /T /F | Out-Null
        }
        catch {
        }

        Start-Sleep -Seconds 2

        Write-Host "Learner server stopped."
    }

    if (Test-Path $SessionScriptPath) {
        Remove-Item $SessionScriptPath -Force
    }
}

Write-Host ""
Write-Host "========================================"

if ($failed) {

    Write-Host "FILUMIRE VALIDATION: FAIL" -ForegroundColor Red
    Write-Host "========================================"
    exit 1

}

Write-Host "FILUMIRE VALIDATION: PASS" -ForegroundColor Green
Write-Host "========================================"
exit 0





