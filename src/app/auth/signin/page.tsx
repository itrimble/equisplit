import { auth, signIn } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string }
}) {
  const session = await auth()
  
  if (session) {
    redirect(searchParams.callbackUrl || "/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to EquiSplit
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Community property calculation made simple
          </p>
        </div>
        
        {searchParams.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {searchParams.error === "OAuthSignin" && "Error in signing in with OAuth provider"}
            {searchParams.error === "OAuthCallback" && "Error in OAuth callback"}
            {searchParams.error === "OAuthCreateAccount" && "Error creating OAuth account"}
            {searchParams.error === "EmailCreateAccount" && "Error creating email account"}
            {searchParams.error === "Callback" && "Error in callback"}
            {searchParams.error === "OAuthAccountNotLinked" && "OAuth account not linked to existing account"}
            {searchParams.error === "EmailSignin" && "Error sending email"}
            {searchParams.error === "CredentialsSignin" && "Invalid credentials"}
            {searchParams.error === "SessionRequired" && "Please sign in to access this page"}
          </div>
        )}

        <div className="space-y-4">
          {/* OAuth Providers */}
          <Card>
            <CardHeader>
              <CardTitle>Continue with your account</CardTitle>
              <CardDescription>
                Choose your preferred sign-in method
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form
                action={async () => {
                  "use server"
                  await signIn("google", { redirectTo: searchParams.callbackUrl || "/dashboard" })
                }}
              >
                <Button type="submit" variant="outline" className="w-full">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
              </form>

              <form
                action={async () => {
                  "use server"
                  await signIn("apple", { redirectTo: searchParams.callbackUrl || "/dashboard" })
                }}
              >
                <Button type="submit" variant="outline" className="w-full">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  Continue with Apple
                </Button>
              </form>

              <form
                action={async () => {
                  "use server"
                  await signIn("microsoft-entra-id", { redirectTo: searchParams.callbackUrl || "/dashboard" })
                }}
              >
                <Button type="submit" variant="outline" className="w-full">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                  </svg>
                  Continue with Microsoft
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Email Sign In */}
          <Card>
            <CardHeader>
              <CardTitle>Sign in with email</CardTitle>
              <CardDescription>
                Enter your email address to receive a sign-in link
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={async (formData: FormData) => {
                  "use server"
                  const email = formData.get("email") as string
                  await signIn("email", { 
                    email,
                    redirectTo: searchParams.callbackUrl || "/dashboard" 
                  })
                }}
                className="space-y-3"
              >
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="mt-1"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Send sign-in link
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-gray-600">
            By signing in, you agree to our{" "}
            <a href="/terms" className="text-blue-600 hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}