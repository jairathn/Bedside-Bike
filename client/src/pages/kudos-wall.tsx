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
import { Heart, MessageCircle, Settings, Zap, Target, Award, ThumbsUp, Trophy, TrendingUp, Gift, Clock, Flame } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";

export default function KudosWall() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedReaction, setSelectedReaction] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");

  const patientId = user?.id;

  // Get patient preferences
  const { data: preferences, refetch: refetchPreferences } = useQuery({
    queryKey: [`/api/kudos/preferences?patientId=${patientId}`],
    enabled: !!patientId,
  });

  // Get feed items
  const { data: feedItems, isLoading } = useQuery({
    queryKey: [`/api/kudos/feed?patientId=${patientId}`],
    enabled: !!patientId,
  });

  // Get nudge opportunities (patients who could use encouragement)
  const { data: nudgeTargets } = useQuery({
    queryKey: [`/api/kudos/nudge-targets?patientId=${patientId}`],
    enabled: !!patientId,
  });

  // Get leaderboard
  const { data: leaderboard } = useQuery({
    queryKey: [`/api/kudos/leaderboard?patientId=${patientId}`],
    enabled: !!patientId,
  });

  // Get received kudos/nudges
  const { data: receivedKudos } = useQuery({
    queryKey: [`/api/kudos/received?patientId=${patientId}`],
    enabled: !!patientId,
  });

  // Update preferences mutation (silent for real-time updates)
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: any) => {
      return await apiRequest(`/api/kudos/preferences?patientId=${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/kudos/preferences?patientId=${patientId}`] });
      refetchPreferences();
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated",
      });
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
      return await apiRequest(`/api/kudos/react?patientId=${patientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedItemId, reactionType: reaction }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/kudos/feed?patientId=${patientId}`] });
    },
  });

  // Send nudge mutation
  const nudgeMutation = useMutation({
    mutationFn: async ({ recipientId, templateType, metadata }: any) => {
      return await apiRequest(`/api/kudos/nudge?patientId=${patientId}`, {
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
      queryClient.invalidateQueries({ queryKey: [`/api/kudos/nudge-targets?patientId=${patientId}`] });
    },
  });

  const reactionEmojis = ["👏", "💪", "🎉", "❤️", "🔥", "⭐"];
  const avatarEmojis = ["👤", "🦸", "🧑‍⚕️", "🏃", "💪", "🎯", "⚡", "🌟"];

  // Check if user is already on the leaderboard (already participating)
  const isOnLeaderboard = leaderboard?.todayLeaders?.some((e: any) => e.isCurrentUser) ||
                          leaderboard?.goalCrushers?.some((e: any) => e.isCurrentUser);

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

        {/* Opt-in prompt - hide if user is already on leaderboard */}
        {!preferences?.optInKudos && !preferences?.optInNudges && !isOnLeaderboard && (
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
          {/* Main Feed and Leaderboard */}
          <div className="lg:col-span-2 space-y-6">
            {/* Leaderboards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                  Leaderboards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="today" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="today" className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Today's Leaders
                    </TabsTrigger>
                    <TabsTrigger value="goals" className="flex items-center gap-1">
                      <Flame className="w-4 h-4" />
                      Goal Crushers
                    </TabsTrigger>
                  </TabsList>

                  {/* Today's Leaders - based on minutes today */}
                  <TabsContent value="today">
                    {leaderboard?.todayLeaders?.length > 0 ? (
                      <div className="space-y-2">
                        {leaderboard.todayLeaders.map((entry: any) => (
                          <div
                            key={entry.id}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              entry.isCurrentUser
                                ? 'bg-blue-50 border-2 border-blue-200'
                                : 'bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className={`font-bold w-6 ${
                                entry.rank === 1 ? 'text-yellow-500' :
                                entry.rank === 2 ? 'text-gray-400' :
                                entry.rank === 3 ? 'text-amber-600' : 'text-gray-600'
                              }`}>
                                {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                              </span>
                              <span className="text-xl">{entry.avatarEmoji}</span>
                              <div>
                                <span className="font-medium">{entry.displayName}</span>
                                {entry.isCurrentUser && <Badge className="ml-2 text-xs">You</Badge>}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-blue-600">{entry.todayMinutes} min</div>
                              <div className="text-xs text-gray-500">today</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No activity today yet</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Goal Crushers - based on % of daily goal achieved */}
                  <TabsContent value="goals">
                    {leaderboard?.goalCrushers?.length > 0 ? (
                      <div className="space-y-2">
                        {leaderboard.goalCrushers.map((entry: any) => (
                          <div
                            key={entry.id}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              entry.isCurrentUser
                                ? 'bg-green-50 border-2 border-green-200'
                                : 'bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className={`font-bold w-6 ${
                                entry.rank === 1 ? 'text-yellow-500' :
                                entry.rank === 2 ? 'text-gray-400' :
                                entry.rank === 3 ? 'text-amber-600' : 'text-gray-600'
                              }`}>
                                {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                              </span>
                              <span className="text-xl">{entry.avatarEmoji}</span>
                              <div>
                                <span className="font-medium">{entry.displayName}</span>
                                {entry.isCurrentUser && <Badge className="ml-2 text-xs">You</Badge>}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${entry.goalPercent >= 100 ? 'text-green-600' : 'text-orange-500'}`}>
                                {entry.goalPercent}%
                              </div>
                              <div className="text-xs text-gray-500">{entry.todayMinutes}/{entry.dailyGoal} min</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Target className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No goal data yet</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Recent Achievements Feed */}
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

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Received Kudos & Nudges */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <Gift className="w-5 h-5 mr-2 text-purple-500" />
                  Your Received Encouragement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {receivedKudos?.nudges?.length > 0 ? (
                  receivedKudos.nudges.slice(0, 5).map((nudge: any) => (
                    <div key={nudge.id} className="border rounded-lg p-3 bg-purple-50">
                      <div className="flex items-start space-x-2">
                        <span className="text-lg">{nudge.senderEmoji}</span>
                        <div>
                          <p className="text-sm text-gray-700">{nudge.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            from {nudge.senderName}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <Gift className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No nudges received yet</p>
                  </div>
                )}
                {receivedKudos?.summary && (
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total nudges received</span>
                      <Badge variant="secondary">{receivedKudos.summary.totalNudgesReceived}</Badge>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Reactions on your posts</span>
                      <Badge variant="secondary">{receivedKudos.summary.totalReactionsReceived}</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Send Encouragement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Send Encouragement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {nudgeTargets?.length > 0 ? (
                  nudgeTargets.map((target: any) => (
                    <div key={target.id} className="border rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{target.avatarEmoji}</span>
                        <span className="font-medium text-sm">{target.displayName}</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        {target.todayMinutes}/{target.dailyTarget} min • <span className="text-orange-600">{target.minutesLeft} left</span>
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
                        disabled={nudgeMutation.isPending || !target.optedIn}
                        variant={target.optedIn ? "default" : "outline"}
                      >
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        {target.optedIn ? 'Send Nudge' : 'Not accepting nudges'}
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <MessageCircle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">
                      Everyone's on track today! 🎉
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Community Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Patients on track</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {(leaderboard?.todayLeaders?.length || 0) - (nudgeTargets?.length || 0)}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Need encouragement</span>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      {nudgeTargets?.length || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Active in community</span>
                    <Badge variant="secondary">{leaderboard?.todayLeaders?.length || 0}</Badge>
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