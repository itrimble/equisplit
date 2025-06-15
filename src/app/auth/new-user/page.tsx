import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function NewUserPage() {
  const session = await auth()
  
  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Welcome to EquiSplit! 🎉</CardTitle>
          <CardDescription>
            Your account has been created successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">What you can do with EquiSplit:</h3>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li>• Calculate property division for all 50 US states</li>
                <li>• Generate court-ready legal documents</li>
                <li>• Save and track multiple calculations</li>
                <li>• Upload financial documents for analysis</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 p-4 rounded">
              <h4 className="font-medium text-blue-900">Getting Started</h4>
              <p className="mt-1 text-sm text-blue-800">
                Start by entering your personal information and marriage details, 
                then add your assets and debts to get an accurate property division calculation.
              </p>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
              <h4 className="font-medium text-yellow-900">Legal Disclaimer</h4>
              <p className="mt-1 text-sm text-yellow-800">
                EquiSplit provides educational calculations only and does not constitute legal advice. 
                Always consult with a qualified attorney for specific legal guidance.
              </p>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button asChild className="flex-1">
              <a href="/calculator">Start Calculator</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/dashboard">Go to Dashboard</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}