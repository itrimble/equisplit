import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const getErrorMessage = (error: string) => {
    switch (error) {
      case "Configuration":
        return "There is a problem with the server configuration."
      case "AccessDenied":
        return "Access denied. You may not have permission to sign in."
      case "Verification":
        return "The verification token has expired or has already been used."
      case "Default":
      default:
        return "An unexpected error occurred during authentication."
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600">Authentication Error</CardTitle>
          <CardDescription>
            {getErrorMessage(searchParams.error || "Default")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            If this problem persists, please contact our support team for assistance.
          </p>
          <div className="flex space-x-2">
            <Button asChild>
              <Link href="/auth/signin">Try signing in again</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Return to home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}