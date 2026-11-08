import Link from "next/link";
import { DEMO_CART_ID } from "@/lib/data/ids";

// Launcher for the three surfaces (handy at the booth and while developing).
const SURFACES = [
  { href: `/cart/${DEMO_CART_ID}`, title: "Cart Screen", note: "Tablet or laptop on the cart" },
  { href: "/app", title: "Customer App", note: "The shopper's phone" },
  { href: "/control", title: "Demo Control", note: "Second phone, PIN protected" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-10 px-6 py-16">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">YUNEX 2026</p>
        <h1 className="mt-2 text-headline font-semibold">
          Si<span className="text-brand-500">Cart</span>
        </h1>
        <p className="mt-3 max-w-xl text-lg text-ink-muted">
          The smart shopping cart: no checkout queues, personal offers, in-store navigation, a voice assistant and an
          accessibility mode.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {SURFACES.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="block rounded-card bg-surface p-5 shadow-soft transition-shadow duration-300 ease-spring hover:shadow-lift"
            >
              <span className="block text-lg font-semibold">{s.title}</span>
              <span className="mt-1 block text-sm text-ink-muted">{s.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
