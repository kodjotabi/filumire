import { isPrivateJhsEnabled, PRIVATE_JHS_SCOPE } from '../../../../../packages/curriculum/jhs-private-policy';
import { CCP_SOURCE_REGISTRATIONS } from '../../../../../packages/curriculum/ghana-ccp-runtime';
import { json } from '../account/http';

/*
 * Public, non-personal disclosure of the private presentation scope.
 * Read at request time so pages stay static while the server setting decides.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return isPrivateJhsEnabled()
    ? json({ enabled: true, authored: PRIVATE_JHS_SCOPE.length, mapped: CCP_SOURCE_REGISTRATIONS.length })
    : json({ enabled: false });
}
