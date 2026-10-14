import {resolveSignedInSession} from '../../../../../../../../services/identity';
import {recoverAssessmentContext} from '../../../../../../../../services/edututor/assessment-recovery';
import {BadRequestError,checkRateLimits,errorResponse,json,readJsonBody} from '../../../http';

export async function POST(request:Request,{params}:{params:Promise<{learnerId:string}>}){
 try{
  const body=await readJsonBody(request);
  if(body.confirmPreserveHistory!==true||typeof body.requestId!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(body.requestId))throw new BadRequestError('Confirm history preservation and supply a request identity.');
  const identity=await resolveSignedInSession(request),{learnerId}=await params;
  const limited=await checkRateLimits(request,'tutor-recovery',[{key:`principal:${identity.principalId}`,limit:10,windowMs:60*60_000}]);if(limited)return limited;
  return json(await recoverAssessmentContext(identity.principalId,learnerId,identity.sessionId,body.requestId));
 }catch(error){return errorResponse(error,'tutoring recovery');}
}
