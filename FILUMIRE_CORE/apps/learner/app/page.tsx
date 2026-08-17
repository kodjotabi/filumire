import Link from "next/link";

export default function LearnerHome() {
  return (
    <main>
      <header>
        <p>FILUMIRE EduTutor</p>
        <h1>Adaptive learning for every learner.</h1>
        <p>
          FILUMIRE adapts the learning experience as the learner demonstrates
          what they know.
        </p>
      </header>

      <section>
        <h2>Ready to learn?</h2>
        <p>Your learning journey will adapt as you learn.</p>

        <Link href="/learn">
          <button type="button">Start Learning</button>
        </Link>
      </section>
    </main>
  );
}