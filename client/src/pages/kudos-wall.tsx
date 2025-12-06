import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Heart, MessageCircle, Settings, Zap, Target, Award, ThumbsUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function KudosWall() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedReaction, setSelectedReaction] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");

  // Get patient preferences
  const { data: preferences } = useQuery({
    queryKey: ['/api/kudos/preferences'],
    enabled: !!user,
  });

  // Get feed items
  const { data: feedItems, isLoading } = useQuery({
    queryKey: ['/api/kudos/feed'],
    enabled: !!user,
  });

  // Get nudge opportunities (patients who could use encouragement)
  const { data: nudgeTargets } = useQuery({
    queryKey: ['/api/kudos/nudge-targets'],
    enabled: !!user,
  });

  // Update preferences mutation (silent for real-time updates)
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: any) => {
      return await apiRequest('/api/kudos/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kudos/preferences'] });
      // Silent update - no toast spam
    },
  });

  // Debounced display name update
  const debouncedUpdateDisplayName = useCallback((value: string) => {
    const timer = setTimeout(() => {
      updatePreferencesMutation.mutate({ displayName: value });
    }, 500);
    return () => clearTimeout(timer);
  }, [updatePreferencesMutation]);

  // Send reaction mutation
  const reactionMutation = useMutation({
    mutationFn: async ({ feedItemId, reaction }: { feedItemId: number; reaction: string }) => {
      return await apiRequest('/api/kudos/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedItemId, reactionType: reaction }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kudos/feed'] });
    },
  });

  // Send nudge mutation
  const nudgeMutation = useMutation({
    mutationFn: async ({ recipientId, templateType, metadata }: any) => {
      return await apiRequest('/api/kudos/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId, templateType, metadata }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Nudge Sent!",
        description: "Your encouragement has been delivered",
      });
    },
  });

  const reactionEmojis = ["👏", "💪", "🎉", "❤️", "🔥", "⭐"];
  const avatarEmojis = ["👤", "🦸", "🧑‍⚕️", "🏃", "💪", "🎯", "⚡", "🌟"];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Kudos Wall...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kudos & Nudge Wall</h1>
            <p className="text-gray-600">Celebrate achievements and encourage your fellow patients</p>
          </div>
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Kudos Wall Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Display Name</Label>
                  <Input
                    value={displayName || preferences?.displayName || ""}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      debouncedUpdateDisplayName(e.target.value);
                    }}
                    placeholder="Choose how others see you"
                  />
                </div>
                <div>
                  <Label>Avatar Emoji</Label>
                  <Select
                    defaultValue={preferences?.avatarEmoji || "👤"}
                    onValueChange={(value) => {
                      updatePreferencesMutation.mutate({ avatarEmoji: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {avatarEmojis.map(emoji => (
                        <SelectItem key={emoji} value={emoji}>{emoji}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Share my achievements</Label>
                    <Switch
                      checked={preferences?.optInKudos || false}
                      onCheckedChange={(checked) => {
                        updatePreferencesMutation.mutate({ optInKudos: checked });
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Receive nudges</Label>
                    <Switch
                      checked={preferences?.optInNudges || false}
                      onCheckedChange={(checked) => {
                        updatePreferencesMutation.mutate({ optInNudges: checked });
                      }}
                    />
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Opt-in prompt */}
        {!preferences?.optInKudos && !preferences?.optInNudges && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <Heart className="w-8 h-8 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-900">Join the Kudos Wall!</h3>
                  <p className="text-blue-700 mb-4">
                    Connect with fellow patients, celebrate achievements, and give encouragement. 
                    All sharing is optional and anonymous.
                  </p>
                  <Button
                    onClick={() => setShowSettings(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Get Started
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  Recent Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {feedItems?.length > 0 ? (
                  feedItems.map((item: any) => (
                    <div key={item.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-start space-x-3">
                        <div className="text-2xl">{item.avatarEmoji}</div>
                        <div className="flex-1">
                          <p className="text-gray-900">{item.message}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-sm text-gray-500">
                              {new Date(item.createdAt).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                            <div className="flex space-x-1">
                              {reactionEmojis.slice(0, 4).map(emoji => (
                                <Button
                                  key={emoji}
                                  variant="ghost"
                                  size="sm"
                                  className="p-1 h-auto"
                                  onClick={() => {
                                    reactionMutation.mutate({
                                      feedItemId: item.id,
                                      reaction: emoji
                                    });
                                  }}
                                >
                                  {emoji}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No recent achievements to display</p>
                    <p className="text-sm text-gray-400">
                      Complete your goals to see celebrations here!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Nudge Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Send Encouragement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {nudgeTargets?.length > 0 ? (
                  nudgeTargets.map((target: any) => (
                    <div key={target.id} className="border rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{target.avatarEmoji}</span>
                        <span className="font-medium">{target.displayName}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {target.minutesLeft} minutes left today
                      </p>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          nudgeMutation.mutate({
                            recipientId: target.id,
                            templateType: 'gentle_reminder',
                            metadata: { minutesLeft: target.minutesLeft }
                          });
                        }}
                        disabled={nudgeMutation.isPending}
                      >
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        Send Nudge
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Everyone's caught up!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Today's Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Kudos given</span>
                    <Badge variant="secondary">5</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Nudges sent</span>
                    <Badge variant="secondary">2</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Active patients</span>
                    <Badge variant="secondary">{nudgeTargets?.length || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}