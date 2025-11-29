import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-sage-900 mb-4">
            Tava Health
          </h1>
          <p className="text-xl text-sage-600">
            AI-powered treatment plans for modern therapy practice
          </p>
        </div>

        <p className="text-sage-600 mb-8 leading-relaxed">
          Generate structured treatment plans from session transcripts with 
          tailored views for therapists and clients. Save time on documentation 
          while maintaining clinical accuracy.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="btn-primary"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="btn-outline"
          >
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}

