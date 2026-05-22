import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';

export default function Settings() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[#111827] mb-1">Settings</h2>
        <p className="text-[#6B7280]">Manage your account and application preferences</p>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="Agent" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Smith" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="agent@tekumma.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" placeholder="+251 911 234567" />
            </div>
            <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white">
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>Manage how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[#111827]">New Ride Alerts</p>
                <p className="text-sm text-[#6B7280]">Get notified when a new ride is created</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[#111827]">Driver Status Updates</p>
                <p className="text-sm text-[#6B7280]">Receive updates when drivers change status</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[#111827]">Low Coupon Warnings</p>
                <p className="text-sm text-[#6B7280]">Alert when driver coupon balance is low</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[#111827]">Email Notifications</p>
                <p className="text-sm text-[#6B7280]">Receive notifications via email</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>Configure application behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[#111827]">Auto-assign Closest Driver</p>
                <p className="text-sm text-[#6B7280]">Automatically assign rides to nearest available driver</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[#111827]">Sound Alerts</p>
                <p className="text-sm text-[#6B7280]">Play sound for new ride requests</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mapKey">Google Maps API Key</Label>
              <Input id="mapKey" placeholder="Enter your API key" type="password" />
              <p className="text-xs text-[#6B7280]">
                Required for map functionality. Get your key from Google Cloud Console.
              </p>
            </div>
            <Button 
              className="bg-[#00BDC3] hover:bg-[#009EA3] text-white"
              onClick={() => toast.success('Settings saved successfully')}
            >
              Save System Settings
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" />
            </div>
            <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white">
              Change Password
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
