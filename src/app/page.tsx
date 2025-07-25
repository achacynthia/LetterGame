import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 p-8">
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
          Letter Games
        </h1>
        <p className="text-lg text-gray-500 mb-6 text-center">
          Choose a game and test your skills!
        </p>
        <div className="flex flex-col gap-6 w-full">
          <Link href="/catch-the-letters" className="w-full">
            <button className="w-full py-5 px-6 rounded-xl bg-white border border-gray-200 text-blue-700 text-xl font-semibold shadow-sm hover:bg-blue-50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400">
              Catch the Letters
            </button>
          </Link>
          <Link href="/type-the-letters" className="w-full">
            <button className="w-full py-5 px-6 rounded-xl bg-white border border-gray-200 text-green-700 text-xl font-semibold shadow-sm hover:bg-green-50 transition-all focus:outline-none focus:ring-2 focus:ring-green-400">
              Type the Letters
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}
