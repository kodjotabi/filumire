$ErrorActionPreference = "Continue"

$Root = "C:\Users\tabi\Desktop\filumire\FILUMIRE_CORE"
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
    "tests/learner-intelligence-policy.test.ts",
    "tests/retention-transfer-policy.test.ts",
    "tests/retention-transfer.test.ts",
    "tests/api-assessment-security.test.ts",
    "tests/api-identity-security.test.ts",
    "tests/payment-service-config.test.ts",
    "tests/payment-service.test.ts",
    "tests/paystack-adapter.test.ts"
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

& npm run build:learner

if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED: learner production build" -ForegroundColor Red
    $failed = $true
}
else {
    Write-Host "PASS: learner production build" -ForegroundColor Green
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

    if (-not $failed) {

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

                $learningResponse = Invoke-WebRequest `
                    -Uri "http://localhost:3000/api/learning?sessionId=$runtimeSessionId" `
                    -Headers $headers `
                    -UseBasicParsing `
                    -TimeoutSec 10

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