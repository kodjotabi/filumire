# Source-backed public curriculum register

This register belongs to FILUMIRE_WEBSITE. The learner and CORE are not runtime dependencies. The copied official PDFs are unchanged; sources.json records SHA-256 hashes and physical PDF page numbers.

## Files
- requirements.json: class-specific printed requirements and hierarchy. Codes are preserved, including malformed codes; class ownership follows the document section. English text is an extraction of the official source, not a French official translation.
- sources.json: source identities, hashes, editions and PDF locations.
- inventory.json: unresolved extraction, printed-code and hierarchy exceptions. These are visible in the explorer.
- printed-code-index.json: independent inventory of five-part codes from the positioned PDF text, including references. Integrity tests ensure each is represented.
- verified-exceptions.json: manually inspected malformed codes and table associations, with source pages. Never invent replacement official codes.
- alignment.json: local adaptive specifications and authored-content evidence; public availability is unverified.

## Status policy
Available requires a verified accessible lesson, approved access, identified language and a dated functional test. No entry currently meets that publication threshold.
In Development identifies actual local adaptive specifications linked to authored learning content. Local files do not prove public delivery.
Planned requires an explicit recorded development plan; missing mappings are not automatically labelled Planned.
Official requirements, mapping evidence and public availability must remain separate. No NaCCA endorsement or accreditation is asserted.

## Updating sources
Run node scripts/extract-curriculum.mjs with GHOSTSCRIPT_PATH set to an installed Ghostscript executable. It reads only website-owned official PDFs and writes website-owned JSON. Review inventory.json and manually compare page references before claiming complete verified coverage.
Run node --test tests/*.test.mjs and npm run typecheck after changes. Recheck mappings against the read-only learner source; never import learner or CORE execution into this website.

## Outstanding verification
The extractor covers the independently inventoried printed indicators across all twelve combinations, plus an inspected malformed four-part indicator. Missing source headings, differing repeated statements, and printed-code inconsistencies remain explicitly flagged. This is a comprehensive navigable source extraction, not a fully adjudicated curriculum transcription. The French interface explains that official quotations remain in English.

Run node scripts/extract-alignment.mjs to refresh mapping evidence from read-only FILUMIRE_CLAUDE sources. Authored activities are recognised by explicit competency declarations and bilingual activity metadata, rather than incidental string references. Evidence records include file hashes. unmatched-mappings.json records adaptive references not found in the printed-source register; do not convert them into invented official requirements.
