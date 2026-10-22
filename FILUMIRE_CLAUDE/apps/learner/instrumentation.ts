export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { seedContent } = await import('../../services/content-store/seed');
    seedContent();
  }
}
