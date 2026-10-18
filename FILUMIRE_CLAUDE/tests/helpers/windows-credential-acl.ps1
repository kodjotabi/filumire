# Offline test metadata only. Never read or emit file contents, and never change ACLs.
param([Parameter(Mandatory=$true)][string]$Directory, [string]$File)
$ErrorActionPreference = 'Stop'
$parent = Get-Acl -LiteralPath $Directory
$result = @{ parentSddl = $parent.Sddl; parentRules = @($parent.Access | ForEach-Object {
    @{ sid = $_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value;
       inherited = $_.IsInherited; inheritable = $_.InheritanceFlags.ToString(); rights = $_.FileSystemRights.ToString() }
}); currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value }
if ($File) {
    $acl = Get-Acl -LiteralPath $File
    $result.file = @{ owner = $acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value;
        protected = $acl.AreAccessRulesProtected; rules = @($acl.Access | ForEach-Object {
            @{ sid = $_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value;
               inherited = $_.IsInherited; type = $_.AccessControlType.ToString(); rights = $_.FileSystemRights.ToString() }
        }) }
}
$result | ConvertTo-Json -Compress -Depth 5
