import { auth, signOut } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function SignOutPage() {
  const session = await auth()

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card>
          <CardHeader>
            <CardTitle>Already signed out</CardTitle>
            <CardDescription>You are not currently signed in.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/">Return to home</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card>
        <CardHeader>
          <CardTitle>Sign out of EquiSplit</CardTitle>
          <CardDescription>
            Are you sure you want to sign out of your account?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            You are currently signed in as <strong>{session.user?.email}</strong>
          </p>
          <div className="flex space-x-2">
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/" })
              }}
            >
              <Button type="submit" variant="destructive">
                Sign out
              </Button>
            </form>
            <Button variant="outline" asChild>
              <a href="/dashboard">Cancel</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}