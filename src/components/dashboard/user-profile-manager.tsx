'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { 
  UserCircleIcon, 
  ShieldCheckIcon, 
  KeyIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

interface UserProfileManagerProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function UserProfileManager({ user }: UserProfileManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
  });

  // Mock user data - replace with actual API calls
  const mockUserData = {
    role: 'USER',
    subscriptionTier: 'FREE',
    mfaEnabled: false,
    emailVerified: true,
    createdAt: new Date('2024-05-15'),
    lastLoginAt: new Date('2024-06-14'),
    loginCount: 23,
    calculationsCount: 12,
    documentsCount: 5,
  };

  const handleSave = async () => {
    // TODO: Implement API call to update user profile
    console.log('Saving profile:', formData);
    setIsEditing(false);
  };

  const handleEnableMFA = async () => {
    // TODO: Implement MFA setup flow
    console.log('Enabling MFA...');
  };

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircleIcon className="h-5 w-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              {user.image ? (
                <img src={user.image} alt={user.name || 'User'} />
              ) : (
                <UserCircleIcon className="h-full w-full text-gray-400" />
              )}
            </Avatar>
            
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleSave}>
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {user.name || 'Unnamed User'}
                  </h2>
                  <p className="text-gray-600">{user.email}</p>
                  
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">
                      {mockUserData.subscriptionTier === 'FREE' ? 'Free Plan' : mockUserData.subscriptionTier}
                    </Badge>
                    <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">
                      {mockUserData.role}
                    </Badge>
                    {mockUserData.emailVerified && (
                      <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  
                  <Button variant="outline" onClick={() => setIsEditing(true)} className="mt-4">
                    Edit Profile
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5" />
            Security & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* MFA Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <KeyIcon className="h-5 w-5 text-gray-400" />
              <div>
                <h3 className="font-medium text-gray-900">
                  Two-Factor Authentication
                </h3>
                <p className="text-sm text-gray-500">
                  Add an extra layer of security to your account
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {mockUserData.mfaEnabled ? (
                <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">
                  <CheckCircleIcon className="h-3 w-3 mr-1" />
                  Enabled
                </Badge>
              ) : (
                <Badge variant="outline" className="text-yellow-700 bg-yellow-50 border-yellow-200">
                  <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                  Disabled
                </Badge>
              )}
              
              <Button
                variant={mockUserData.mfaEnabled ? "outline" : "default"}
                size="sm"
                onClick={handleEnableMFA}
              >
                {mockUserData.mfaEnabled ? 'Manage' : 'Enable MFA'}
              </Button>
            </div>
          </div>

          {/* Password Change */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <KeyIcon className="h-5 w-5 text-gray-400" />
              <div>
                <h3 className="font-medium text-gray-900">
                  Password
                </h3>
                <p className="text-sm text-gray-500">
                  Change your account password
                </p>
              </div>
            </div>
            
            <Button variant="outline" size="sm">
              Change Password
            </Button>
          </div>

          {/* Data Export */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
              <div>
                <h3 className="font-medium text-gray-900">
                  Data Export
                </h3>
                <p className="text-sm text-gray-500">
                  Download your data and calculation history
                </p>
              </div>
            </div>
            
            <Button variant="outline" size="sm">
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Account Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {mockUserData.calculationsCount}
              </div>
              <p className="text-sm text-gray-500">Calculations</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {mockUserData.documentsCount}
              </div>
              <p className="text-sm text-gray-500">Documents</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {mockUserData.loginCount}
              </div>
              <p className="text-sm text-gray-500">Logins</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Math.floor((Date.now() - mockUserData.createdAt.getTime()) / (1000 * 60 * 60 * 24))}
              </div>
              <p className="text-sm text-gray-500">Days Active</p>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t text-sm text-gray-500 space-y-1">
            <p>Member since: {mockUserData.createdAt.toLocaleDateString()}</p>
            <p>Last login: {mockUserData.lastLoginAt.toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}