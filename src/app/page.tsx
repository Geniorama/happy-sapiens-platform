import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white sm:items-start">
        <Image
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight text-black">
            Bienvenido a Happy Sapiens
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600">
            Una plataforma moderna con autenticación completa usando NextAuth,
            PostgreSQL y múltiples providers OAuth.
          </p>
          {session ? (
            <div className="flex flex-col gap-3 w-full">
              <p className="text-zinc-600">
                ¡Hola, <span className="font-semibold">{session.user?.name}</span>!
              </p>
              <Link
                href="/dashboard"
                className="flex h-12 items-center justify-center rounded-full bg-primary px-6 text-white font-medium transition-colors hover:bg-primary/90"
              >
                Ir al Dashboard
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3 text-sm text-zinc-600">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                <span>Suscripción mensual</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                <span>Acceso completo a la plataforma</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                <span>Cancela cuando quieras</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                <span>Pago seguro con Mercado Pago</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row w-full">
          {!session ? (
            <>
              <Link
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-white transition-colors hover:bg-primary/90 sm:w-auto sm:min-w-[158px]"
                href="/auth/login"
              >
                Iniciar Sesión
              </Link>
              <Link
                className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/8 px-5 transition-colors hover:border-transparent hover:bg-black/4 sm:w-auto sm:min-w-[158px]"
                href="/subscribe"
              >
                Suscribirse
              </Link>
            </>
          ) : (
            <form
              action={async () => {
                "use server";
                const { signOut } = await import("@/lib/auth");
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-red-600 px-5 text-red-600 transition-colors hover:bg-red-600 hover:text-white sm:w-auto sm:min-w-[158px]"
              >
                Cerrar Sesión
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
