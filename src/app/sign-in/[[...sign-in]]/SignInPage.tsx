import { SignIn } from "@clerk/nextjs";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await params;
  await searchParams;
  return (
    <div className="flex min-h-dvh justify-center overflow-y-auto bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="my-auto">
        <SignIn forceRedirectUrl="/dashboard" signUpUrl="/sign-up" />
      </div>
    </div>
  );
}
