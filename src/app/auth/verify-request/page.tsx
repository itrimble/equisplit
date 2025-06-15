import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            A sign-in link has been sent to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Click the link in the email to sign in to your account.
            </p>
            <p className="text-sm text-gray-600">
              The link will expire in 24 hours for security reasons.
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 p-3 rounded">
            <p className="text-sm text-blue-800">
              <strong>Didn't receive the email?</strong> Check your spam folder or try signing in again.
            </p>
          </div>

          <div className="flex space-x-2">
            <Button asChild>
              <a href="/auth/signin">Sign in again</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/">Return to home</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}