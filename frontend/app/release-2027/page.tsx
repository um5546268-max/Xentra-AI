
import Link from "next/link";

export default function Release2027Page() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_45%)]" />

        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center sm:py-32">
          <div className="mb-6 inline-flex items-center rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-sm font-medium text-blue-300">
            Coming in 2027
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
            Xentra AI — AI Software Release in 2027
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
            Xentra AI is an upcoming AI software platform planned for release
            in 2027. Xentra is being developed to bring AI-powered tools for
            learning, coding, communication, productivity, and everyday
            digital work into one platform.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="https://xentra-marketing.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-white px-7 py-3.5 font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Explore Xentra AI
            </a>

            <a
              href="#release-information"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 px-7 py-3.5 font-semibold text-white transition hover:bg-slate-800"
            >
              Learn About the 2027 Release
            </a>
          </div>
        </div>
      </section>

      {/* Main information */}
      <section
        id="release-information"
        className="mx-auto max-w-6xl px-6 py-20"
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
            Xentra AI 2027
          </p>

          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            What is Xentra AI?
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-300">
            Xentra AI is an upcoming AI software platform designed to provide
            multiple AI-powered experiences from one place. The platform is
            being developed with a focus on useful tools for students,
            developers, creators, and everyday users.
          </p>
        </div>

        {/* Product areas */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-7">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-xl">
              💬
            </div>

            <h3 className="text-xl font-semibold">Xentra Connect</h3>

            <p className="mt-3 leading-7 text-slate-400">
              A planned Xentra experience focused on AI-powered communication
              and interaction.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-7">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-xl">
              📚
            </div>

            <h3 className="text-xl font-semibold">Xentra Learning</h3>

            <p className="mt-3 leading-7 text-slate-400">
              A planned learning-focused experience designed to help users
              organize study, learning activities, and AI-assisted education.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-7">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-xl">
              💻
            </div>

            <h3 className="text-xl font-semibold">Xentra Code</h3>

            <p className="mt-3 leading-7 text-slate-400">
              A planned AI-powered coding experience for developers and people
              learning software development.
            </p>
          </article>
        </div>
      </section>

      {/* Release information */}
      <section className="border-y border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
                Release information
              </p>

              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                Xentra AI planned release for 2027
              </h2>

              <p className="mt-6 leading-8 text-slate-300">
                Xentra AI is currently being prepared for a planned 2027
                release. The exact availability of individual features may
                change as development continues.
              </p>

              <p className="mt-4 leading-8 text-slate-400">
                Follow the Xentra AI countdown and official website for future
                announcements, updates, and release information.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-8">
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-slate-500">Product</p>
                  <p className="mt-1 text-xl font-semibold">Xentra AI</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Category</p>
                  <p className="mt-1 text-xl font-semibold">
                    AI Software Platform
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Planned release</p>
                  <p className="mt-1 text-xl font-semibold">2027</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Platform</p>
                  <p className="mt-1 text-xl font-semibold">Web</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Xentra */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
            Built for everyday AI use
          </p>

          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            What Xentra AI is being built for
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-300">
            Xentra AI is being developed around practical AI use cases,
            including learning, coding, communication, productivity, and
            creative digital work.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Learning",
              text: "AI-assisted study and learning workflows.",
            },
            {
              title: "Coding",
              text: "Tools designed to support software development.",
            },
            {
              title: "Communication",
              text: "AI-powered interaction and communication experiences.",
            },
            {
              title: "Productivity",
              text: "AI tools intended to help with everyday digital work.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
            >
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 leading-7 text-slate-400">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ-style visible content */}
      <section className="border-t border-slate-800 bg-slate-900/30">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
              Xentra AI FAQ
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Questions about Xentra AI and its 2027 release
            </h2>
          </div>

          <div className="mt-10 space-y-5">
            <article className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
              <h3 className="text-lg font-semibold">
                What AI software is planned for release in 2027?
              </h3>

              <p className="mt-3 leading-7 text-slate-400">
                Xentra AI is an upcoming AI software platform planned for
                release in 2027. Its planned product experiences include
                Xentra Connect, Xentra Learning, and Xentra Code.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
              <h3 className="text-lg font-semibold">
                When is Xentra AI releasing?
              </h3>

              <p className="mt-3 leading-7 text-slate-400">
                Xentra AI is planned for release in 2027. Visit the Xentra AI
                countdown website for the latest release information.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
              <h3 className="text-lg font-semibold">
                What is Xentra AI?
              </h3>

              <p className="mt-3 leading-7 text-slate-400">
                Xentra AI is an upcoming AI software platform being developed
                for learning, coding, communication, productivity, and other
                digital tasks.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
              <h3 className="text-lg font-semibold">
                Where can I follow the Xentra AI 2027 release?
              </h3>

              <p className="mt-3 leading-7 text-slate-400">
                You can follow the Xentra AI countdown and future release
                updates through the official Xentra AI website.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <div className="rounded-3xl border border-blue-400/20 bg-blue-500/5 p-10 sm:p-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
            Xentra AI
          </p>

          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            Follow the Xentra AI 2027 release
          </h2>

          <p className="mx-auto mt-5 max-w-2xl leading-7 text-slate-400">
            Check the countdown website for the latest information about the
            planned Xentra AI release in 2027.
          </p>

          <div className="mt-8">
            <a
              href="https://xentra-marketing.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-3.5 font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Explore Xentra AI
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Xentra AI. Xentra AI is planned for
          release in 2027.
        </div>
      </footer>
    </main>
  );
}