export interface EduTutorRequest {
  learnerId: string;
  sessionId: string;
  competencyId: string;
  action: string;
  instructionalContext: string;
}

export interface EduTutorResponse {
  content: string;
  modelId: string;
  generatedAt: string;
}

export interface EduTutorModel {
  generate(request: EduTutorRequest): Promise<EduTutorResponse>;
}

export class MockEduTutor implements EduTutorModel {
  async generate(request: EduTutorRequest): Promise<EduTutorResponse> {
    return {
      content: `FILUMIRE instructional response for ${request.action} on competency ${request.competencyId}.`,
      modelId: "mock-edututor-0.1",
      generatedAt: new Date().toISOString(),
    };
  }
}