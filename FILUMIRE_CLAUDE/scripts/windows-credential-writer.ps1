# W4 only. No secret arguments, environment variables, temporary files or transcript output.
# The first stdin line contains only the target path. Text is accepted only AFTER
# atomic protected-DACL creation and verification through the exclusively held handle.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$stream = $null
$phase = 'request_invalid'

function Send-Event($value) {
    [Console]::Out.WriteLine(($value | ConvertTo-Json -Compress -Depth 4))
    [Console]::Out.Flush()
}

function Assert-FileSecurity($security, $userSid) {
    if (-not $security.AreAccessRulesProtected) { throw 'acl_not_protected' }
    if ($security.GetOwner([System.Security.Principal.SecurityIdentifier]).Value -ne $userSid.Value) { throw 'owner_mismatch' }
    $rules = @($security.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]))
    if ($rules.Count -ne 2) { throw 'unexpected_rules' }
    $seen = @{}
    foreach ($rule in $rules) {
        $sid = $rule.IdentityReference.Value
        if (($sid -ne $userSid.Value -and $sid -ne 'S-1-5-18') -or $seen.ContainsKey($sid) -or
            $rule.IsInherited -or $rule.AccessControlType -ne [System.Security.AccessControl.AccessControlType]::Allow -or
            $rule.FileSystemRights -ne [System.Security.AccessControl.FileSystemRights]::FullControl -or
            $rule.InheritanceFlags -ne [System.Security.AccessControl.InheritanceFlags]::None -or
            $rule.PropagationFlags -ne [System.Security.AccessControl.PropagationFlags]::None) { throw 'unexpected_rule' }
        $seen[$sid] = $true
    }
}

try {
    $request = [Console]::In.ReadLine() | ConvertFrom-Json
    if (@($request.PSObject.Properties.Name).Count -ne 1 -or -not ($request.path -is [string])) { throw 'request_invalid' }
    $path = [System.IO.Path]::GetFullPath($request.path)
    if ($path -cne $request.path -or $path -notmatch '^[A-Za-z]:\\' -or
        $path.Substring(2).Contains(':') -or [System.IO.Path]::GetFileName($path) -cnotmatch '^\.env\.[a-z0-9-]+\.local$') { throw 'path_invalid' }
    foreach ($part in $path.Substring(3).Split('\')) {
        if ($part.EndsWith('.') -or $part.EndsWith(' ')) { throw 'path_invalid' }
    }
    $parent = [System.IO.DirectoryInfo]::new([System.IO.Path]::GetDirectoryName($path))
    if (-not $parent.Exists) { throw 'parent_missing' }
    $ancestor = $parent
    while ($null -ne $ancestor) {
        if (($ancestor.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'reparse_parent' }
        $ancestor = $ancestor.Parent
    }
    $user = [System.Security.Principal.WindowsIdentity]::GetCurrent()
    $userSid = $user.User
    # A sandbox/service identity must not silently become the credential owner.
    if ($user.IsSystem -or $parent.GetAccessControl().GetOwner([System.Security.Principal.SecurityIdentifier]).Value -ne $userSid.Value) { throw 'intended_owner_mismatch' }
    $security = [System.Security.AccessControl.FileSecurity]::new()
    $security.SetOwner($userSid)
    $security.SetAccessRuleProtection($true, $false)
    foreach ($sid in @($userSid, [System.Security.Principal.SecurityIdentifier]::new('S-1-5-18'))) {
        $security.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new(
            $sid, [System.Security.AccessControl.FileSystemRights]::FullControl, [System.Security.AccessControl.AccessControlType]::Allow))
    }
    Assert-FileSecurity $security $userSid
    $phase = 'credential_create_failed'
    # This constructor supplies the security descriptor to file creation itself.
    # CreateNew refuses existing files/links. There is no create-then-chmod window.
    $stream = [System.IO.FileStream]::new($path, [System.IO.FileMode]::CreateNew,
        [System.Security.AccessControl.FileSystemRights]::FullControl, [System.IO.FileShare]::None,
        4096, [System.IO.FileOptions]::WriteThrough, $security)
    Send-Event @{ event = 'created' }
    $phase = 'credential_acl_verification_failed'
    Assert-FileSecurity $stream.GetAccessControl() $userSid
    if ($stream.Length -ne 0) { throw 'not_empty' }
    Send-Event @{ event = 'ready'; protected = $true; ownerSid = $userSid.Value; principals = @($userSid.Value, 'S-1-5-18') }
    $phase = 'credential_payload_invalid'
    $payload = [Console]::In.ReadLine() | ConvertFrom-Json
    if (@($payload.PSObject.Properties.Name).Count -ne 1 -or -not ($payload.text -is [string]) -or $payload.text.Length -gt 16384) { throw 'payload_invalid' }
    $phase = 'credential_acl_verification_failed'
    Assert-FileSecurity $stream.GetAccessControl() $userSid
    $phase = 'credential_write_failed'
    $bytes = [System.Text.UTF8Encoding]::new($false, $true).GetBytes($payload.text)
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Flush($true)
    $phase = 'credential_acl_verification_failed'
    Assert-FileSecurity $stream.GetAccessControl() $userSid
    $phase = 'credential_close_failed'
    $stream.Dispose()
    $stream = $null
    Send-Event @{ event = 'complete'; protected = $true; ownerSid = $userSid.Value; principals = @($userSid.Value, 'S-1-5-18') }
    exit 0
} catch {
    # The caller owns rollback/cleanup. Never delete an existing or uncertain file here.
    $closeFailed = $false
    if ($null -ne $stream) { try { $stream.Dispose() } catch { $closeFailed = $true } }
    Send-Event @{ event = 'failed'; code = $phase; closeFailed = $closeFailed }
    exit 1
}
