import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, UserX, Shield, Eye, Settings, ArrowLeft, UserPlus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

export default function ProviderAccessPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [showAddProviderDialog, setShowAddProviderDialog] = useState(false);
  const [newProviderData, setNewProviderData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    credentials: "",
    specialty: "",
    licenseNumber: ""
  });

  // Get available providers
  const { data: providers } = useQuery({
    queryKey: ['/api/providers'],
    enabled: !!user,
  });

  // Get current provider relationships
  const { data: providerRelationships, refetch: refetchRelationships } = useQuery({
    queryKey: ['/api/provider-relationships', { patientId: user?.id }],
    queryFn: async () => {
      if (!user?.id) return [];
      return await apiRequest(`/api/provider-relationships?patientId=${user.id}`);
    },
    enabled: !!user,
  });

  // Grant access mutation
  const grantAccessMutation = useMutation({
    mutationFn: async (providerId: string) => {
      if (!user?.id) {
        throw new Error('Patient ID is required');
      }
      return await apiRequest('/api/provider-relationships', {
        method: 'POST',
        body: JSON.stringify({
          providerId: parseInt(providerId),
          patientId: user.id
        }),
      });
    },
    onSuccess: async () => {
      // Force immediate refresh with delay to ensure backend consistency
      await new Promise(resolve => setTimeout(resolve, 100));
      await refetchRelationships();
      await queryClient.invalidateQueries({ queryKey: ['/api/provider-relationships', { patientId: user?.id }] });

      toast({
        title: "Access Granted",
        description: "Your provider can now view your progress and adjust your goals",
      });
      setShowGrantDialog(false);
      setSelectedProvider("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Grant Access",
        description: error.message || "Provider may already have access",
        variant: "destructive"
      });
    },
  });

  // Revoke access mutation
  const revokeAccessMutation = useMutation({
    mutationFn: async (relationshipId: number) => {
      return await apiRequest(`/api/provider-relationships/${relationshipId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: async () => {
      // Force immediate refresh with delay to ensure backend consistency
      await new Promise(resolve => setTimeout(resolve, 100));
      await refetchRelationships();
      await queryClient.invalidateQueries({ queryKey: ['/api/provider-relationships', { patientId: user?.id }] });

      toast({
        title: "Access Revoked",
        description: "Provider access has been removed",
        variant: "destructive"
      });
    },
  });

  // Add new provider mutation
  const addProviderMutation = useMutation({
    mutationFn: async (providerData: typeof newProviderData) => {
      return await apiRequest('/api/providers', {
        method: 'POST',
        body: JSON.stringify({
          ...providerData,
          userType: 'provider',
          providerRole: 'clinician',
          isActive: true
        }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/providers'] });
      
      toast({
        title: "Provider Added",
        description: "New provider has been added to the system. You can now grant them access.",
      });
      setShowAddProviderDialog(false);
      setNewProviderData({
        email: "",
        firstName: "",
        lastName: "",
        credentials: "",
        specialty: "",
        licenseNumber: ""
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Provider",
        description: error.message || "An error occurred while adding the provider",
        variant: "destructive"
      });
    },
  });

  const hasProviders = Array.isArray(providerRelationships) && providerRelationships.length > 0;
  
  // Filter out providers who already have access
  const availableProviders = Array.isArray(providers) && Array.isArray(providerRelationships) 
    ? providers.filter(provider => 
        !providerRelationships.some(rel => rel.providerId === provider.id)
      )
    : providers;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/dashboard")}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Provider Access</h1>
            <p className="text-lg text-gray-600">Manage who can view your progress and set your goals</p>
          </div>
        </div>

        {/* Current Provider Access */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Current Access Status
            </CardTitle>
            <div className="flex gap-2">
              {/* Add Provider Access Button - Always visible */}
              <Dialog open={showAddProviderDialog} onOpenChange={setShowAddProviderDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-green-50 border-green-200 hover:bg-green-100">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Provider Access
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Provider Access</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Search Healthcare Providers
                      </label>
                      {Array.isArray(availableProviders) && availableProviders.length === 0 && (
                        <div className="text-sm text-amber-600 mb-2 p-2 bg-amber-50 rounded border border-amber-200">
                          All available providers already have access to your account.
                        </div>
                      )}
                      <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            Array.isArray(availableProviders) && availableProviders.length === 0 
                              ? "No additional providers available" 
                              : "Choose a provider to add..."
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(availableProviders) && availableProviders.length > 0 ? (
                            availableProviders.map((provider: any) => (
                              <SelectItem key={provider.id} value={provider.id.toString()}>
                                {provider.firstName} {provider.lastName}, {provider.credentials} - {provider.specialty}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-providers" disabled>
                              No additional providers available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">What access will they have?</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• View your exercise progress and statistics</li>
                        <li>• Set and adjust your daily goals</li>
                        <li>• View your risk assessments</li>
                        <li>• Monitor your consistency and achievements</li>
                      </ul>
                    </div>

                    <div className="flex space-x-3">
                      <Button 
                        onClick={() => grantAccessMutation.mutate(selectedProvider)}
                        disabled={!selectedProvider || selectedProvider === "no-providers" || grantAccessMutation.isPending}
                        className="flex-1"
                      >
                        {grantAccessMutation.isPending ? "Adding Access..." : "Add Access"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowAddProviderDialog(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {hasProviders ? (
              <div className="space-y-4">
                {Array.isArray(providerRelationships) && providerRelationships.map((relationship: any) => (
                  <div key={relationship.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                        <UserCheck className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-green-900">
                          {relationship.providerFirstName} {relationship.providerLastName}, {relationship.providerCredentials}
                        </h3>
                        <p className="text-green-700">{relationship.providerSpecialty}</p>
                        <p className="text-sm text-green-600">
                          Granted access on {new Date(relationship.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <Eye className="w-3 h-3 mr-1" />
                        Full Access
                      </Badge>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => revokeAccessMutation.mutate(relationship.id)}
                        disabled={revokeAccessMutation.isPending}
                      >
                        <UserX className="w-4 h-4 mr-1" />
                        {revokeAccessMutation.isPending ? "Revoking..." : "Revoke Access"}
                      </Button>
                    </div>
                  </div>
                ))}
                
                {/* Always show grant access option if there are available providers */}
                {Array.isArray(availableProviders) && availableProviders.length > 0 && (
                  <div className="flex items-center justify-center p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
                    <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                          <UserCheck className="w-4 h-4 mr-2" />
                          Grant Access to Another Provider
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Grant Provider Access</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Select Your Healthcare Provider
                            </label>
                            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a provider..." />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.isArray(availableProviders) && availableProviders.map((provider: any) => (
                                  <SelectItem key={provider.id} value={provider.id.toString()}>
                                    {provider.firstName} {provider.lastName}, {provider.credentials} - {provider.specialty}
                                  </SelectItem>
                                )) || []}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-blue-900 mb-2">What access will they have?</h4>
                            <ul className="text-sm text-blue-800 space-y-1">
                              <li>• View your exercise progress and statistics</li>
                              <li>• Set and adjust your daily goals</li>
                              <li>• View your risk assessments</li>
                              <li>• Monitor your consistency and achievements</li>
                            </ul>
                          </div>

                          <div className="flex space-x-3">
                            <Button 
                              onClick={() => {
                                if (selectedProvider) {
                                  grantAccessMutation.mutate(selectedProvider);
                                }
                              }}
                              disabled={!selectedProvider || grantAccessMutation.isPending}
                              className="flex-1"
                            >
                              {grantAccessMutation.isPending ? "Granting Access..." : "Grant Full Access"}
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setShowGrantDialog(false)}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-900">No Provider Access</h3>
                    <p className="text-yellow-700">You haven't granted access to any healthcare providers yet</p>
                  </div>
                </div>
                <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <UserCheck className="w-4 h-4 mr-2" />
                      Grant Access
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Grant Provider Access</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Select Your Healthcare Provider
                        </label>
                        <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a provider..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(providers) && providers.map((provider: any) => (
                              <SelectItem key={provider.id} value={provider.id.toString()}>
                                {provider.firstName} {provider.lastName}, {provider.credentials} - {provider.specialty}
                              </SelectItem>
                            )) || []}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">What access will they have?</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• View your exercise progress and statistics</li>
                          <li>• Set and adjust your daily goals</li>
                          <li>• View your risk assessments</li>
                          <li>• Monitor your consistency and achievements</li>
                        </ul>
                      </div>

                      <div className="flex space-x-3">
                        <Button 
                          onClick={() => {
                            if (selectedProvider) {
                              grantAccessMutation.mutate(selectedProvider);
                            }
                          }}
                          disabled={!selectedProvider || grantAccessMutation.isPending}
                          className="flex-1"
                        >
                          {grantAccessMutation.isPending ? "Granting Access..." : "Grant Full Access"}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowGrantDialog(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Privacy Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Privacy & Control
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">You're Always In Control</h4>
                <ul className="text-blue-800 space-y-2">
                  <li>• You can revoke provider access at any time</li>
                  <li>• Providers can only see exercise data, not personal information</li>
                  <li>• You'll receive notifications when providers make goal changes</li>
                  <li>• Your data is never shared without your explicit permission</li>
                </ul>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Benefits of Provider Access</h4>
                <ul className="text-green-800 space-y-2">
                  <li>• Personalized goals based on your medical needs</li>
                  <li>• Professional guidance on exercise progression</li>
                  <li>• Better coordination with your healthcare team</li>
                  <li>• Improved recovery and mobility outcomes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}