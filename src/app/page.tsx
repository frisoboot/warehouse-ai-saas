import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white">
      <div className="text-center space-y-6 p-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-green-800 sm:text-6xl">
            EcoGiving
          </h1>
          <p className="text-lg text-muted-foreground">
            Warehouse Management System
          </p>
        </div>
        <p className="max-w-md text-muted-foreground mx-auto">
          Manage inventory, track shipments, and assemble sustainable gift packages
          for your corporate clients.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center justify-center rounded-md bg-green-600 px-8 text-sm font-medium text-white ring-offset-background transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
