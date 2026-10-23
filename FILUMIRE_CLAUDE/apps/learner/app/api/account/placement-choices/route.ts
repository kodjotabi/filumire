import { resolveSignedInSession } from '../../../../../../services/identity';
import { getPlacementChoices } from '../../../../../../services/learner-context/placement';
import { errorResponse, json } from '../http';

/** The classes the add-learner form may offer. Signed-in only; nothing learner-specific. */
export async function GET(request: Request) {
  try {
    await resolveSignedInSession(request);
    return json({ choices: getPlacementChoices() });
  } catch (error) {
    return errorResponse(error, 'curriculum placement choices');
  }
}
