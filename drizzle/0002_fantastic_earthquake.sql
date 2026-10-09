ALTER TABLE "learning_evidence" ADD COLUMN "error_pattern" text;--> statement-breakpoint
ALTER TABLE "learning_evidence" ADD COLUMN "diagnostic_state" text;--> statement-breakpoint
ALTER TABLE "learning_evidence" ADD COLUMN "diagnostic_confidence" real;--> statement-breakpoint
ALTER TABLE "learning_evidence" ADD COLUMN "intervention_type" text;--> statement-breakpoint
ALTER TABLE "learning_evidence" ADD COLUMN "intervention_id" text;