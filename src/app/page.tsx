import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-green-100">
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-10 bg-white/80 rounded-3xl shadow-xl p-10">
        <h1 className="text-5xl font-bold text-gray-900 mb-2 tracking-tight text-center">
          Letter Games
        </h1>
        <p className="text-lg text-gray-500 mb-6 text-center">
          Choose a game and test your skills!
        </p>
        <div className="flex flex-col gap-8 w-full">
          <Link href="/catch-the-letters" className="w-full">
            <button className="w-full py-6 px-8 rounded-2xl bg-blue-600 text-white text-2xl font-semibold shadow-lg hover:bg-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400">
              Catch the Letters
            </button>
          </Link>
          <Link href="/type-the-letters" className="w-full">
            <button className="w-full py-6 px-8 rounded-2xl bg-green-600 text-white text-2xl font-semibold shadow-lg hover:bg-green-700 transition-all focus:outline-none focus:ring-2 focus:ring-green-400">
              Type the Letters
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}
