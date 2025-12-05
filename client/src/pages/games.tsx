import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Gamepad2, Target, Zap, Trophy, Star, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function GamesPage() {
  const [, setLocation] = useLocation();
  const { patient } = useAuth();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [gameProgress, setGameProgress] = useState(0);
  const [currentPower, setCurrentPower] = useState(0);
  const [targetReached, setTargetReached] = useState(false);

  useEffect(() => {
    if (!patient) {
      setLocation("/");
    }
  }, [patient, setLocation]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeGame) {
      interval = setInterval(() => {
        // Simulate power fluctuations for game
        const newPower = Math.max(0, Math.round(75 + (Math.random() - 0.5) * 30));
        setCurrentPower(newPower);
        
        if (activeGame === 'powerTarget' && newPower >= 90) {
          setGameProgress(prev => Math.min(prev + 2, 100));
          if (gameProgress >= 95) setTargetReached(true);
        } else if (activeGame === 'enduranceChallenge') {
          setGameProgress(prev => Math.min(prev + 0.5, 100));
        } else if (activeGame === 'virtualJourney') {
          setGameProgress(prev => Math.min(prev + 1, 100));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeGame, gameProgress]);

  const games = [
    {
      id: 'powerTarget',
      title: 'Power Target Challenge',
      description: 'Maintain 90+ watts for 30 seconds to unlock rewards',
      icon: <Target className="w-6 h-6" />,
      color: 'bg-blue-100 text-blue-600',
      difficulty: 'Medium',
      reward: '+50 XP',
    },
    {
      id: 'enduranceChallenge',
      title: 'Endurance Marathon',
      description: 'Complete a 20-minute session without stopping',
      icon: <Zap className="w-6 h-6" />,
      color: 'bg-green-100 text-green-600',
      difficulty: 'Hard',
      reward: '+100 XP',
    },
    {
      id: 'virtualJourney',
      title: 'Virtual Scenic Route',
      description: 'Cycle through beautiful virtual landscapes',
      icon: <MapPin className="w-6 h-6" />,
      color: 'bg-purple-100 text-purple-600',
      difficulty: 'Easy',
      reward: '+25 XP',
    },
  ];

  const achievements = [
    { title: 'First Steps', description: 'Complete your first game', unlocked: true },
    { title: 'Power Player', description: 'Reach 100W in a game', unlocked: false },
    { title: 'Marathon Runner', description: 'Complete 45-minute session', unlocked: false },
    { title: 'Consistency King', description: 'Play games 5 days in a row', unlocked: true },
  ];

  const startGame = (gameId: string) => {
    setActiveGame(gameId);
    setGameProgress(0);
    setTargetReached(false);
    setCurrentPower(0);
  };

  const endGame = () => {
    setActiveGame(null);
    setGameProgress(0);
    setTargetReached(false);
    setCurrentPower(0);
  };

  if (activeGame) {
    const game = games.find(g => g.id === activeGame);
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Game Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Button variant="ghost" onClick={endGame} className="mr-4">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <h1 className="text-xl font-semibold text-gray-900">{game?.title}</h1>
              </div>
              <span className="text-sm text-gray-600">Current Power: {currentPower}W</span>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Game Progress */}
          <Card className="mb-8">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${game?.color}`}>
                  {game?.icon}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{game?.title}</h2>
                <p className="text-gray-600">{game?.description}</p>
              </div>

              <div className="mb-6">
                <Progress value={gameProgress} className="w-full max-w-md mx-auto h-4" />
                <div className="text-lg font-semibold text-gray-900 mt-2">
                  {Math.round(gameProgress)}% Complete
                </div>
              </div>

              {targetReached && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="text-green-800 font-semibold">🎉 Congratulations!</div>
                  <div className="text-green-700">You've completed the challenge and earned {game?.reward}!</div>
                </div>
              )}

              <Button onClick={endGame} variant="outline" size="lg">
                End Game
              </Button>
            </CardContent>
          </Card>

          {/* Game-specific UI */}
          {activeGame === 'powerTarget' && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Power Target Challenge</h3>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">{currentPower}W</div>
                  <div className="text-gray-600 mb-4">Target: 90W</div>
                  <div className={`w-full h-4 rounded-full mb-4 ${currentPower >= 90 ? 'bg-green-200' : 'bg-gray-200'}`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${currentPower >= 90 ? 'bg-green-600' : 'bg-blue-600'}`}
                      style={{ width: `${Math.min((currentPower / 120) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {currentPower >= 90 ? 'Great job! Keep it up!' : 'Pedal harder to reach the target!'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeGame === 'virtualJourney' && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Virtual Scenic Route</h3>
                <div className="bg-gradient-to-b from-blue-400 to-green-400 h-48 rounded-lg mb-4 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="text-2xl mb-2">🏔️ Mountain Trail</div>
                    <div>Distance: {(gameProgress * 0.5).toFixed(1)} miles</div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 text-center">
                  Enjoy the peaceful mountain scenery as you pedal through winding trails.
                </p>
              </CardContent>
            </Card>
          )}

          {activeGame === 'enduranceChallenge' && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Endurance Marathon</h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {Math.round((gameProgress / 100) * 20)} / 20 minutes
                  </div>
                  <div className="text-gray-600 mb-4">Keep a steady pace!</div>
                  <div className="flex justify-center space-x-4 text-sm">
                    <div>Current: {currentPower}W</div>
                    <div>Avg: {Math.round(75 + gameProgress * 0.2)}W</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => setLocation("/dashboard")} className="mr-4">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">Recovery Games</h1>
            </div>
            <span className="text-sm text-gray-600">Welcome, {patient?.firstName} {patient?.lastName}</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Games Introduction */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                <Gamepad2 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Make Recovery Fun</h2>
                <p className="text-gray-600">Turn your exercise sessions into engaging games and challenges</p>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-800">
                <strong>How it works:</strong> Start a game, then begin your exercise session. 
                The game will respond to your pedaling power and duration to create an interactive experience.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Games */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {games.map((game) => (
            <Card key={game.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${game.color}`}>
                    {game.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{game.title}</h3>
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-gray-600">{game.difficulty}</span>
                      <span className="text-orange-600">{game.reward}</span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 mb-4 text-sm">{game.description}</p>
                <Button 
                  onClick={() => startGame(game.id)}
                  className="w-full"
                  variant="outline"
                >
                  Start Game
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Achievements */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-yellow-600" />
              Game Achievements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((achievement, index) => (
                <div 
                  key={index}
                  className={`flex items-center space-x-3 p-3 rounded-lg border ${
                    achievement.unlocked 
                      ? 'bg-yellow-50 border-yellow-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    achievement.unlocked 
                      ? 'bg-yellow-500' 
                      : 'bg-gray-300'
                  }`}>
                    {achievement.unlocked ? (
                      <Star className="text-white text-xs" size={16} />
                    ) : (
                      <span className="text-gray-600 text-xs">?</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{achievement.title}</div>
                    <div className="text-sm text-gray-600">{achievement.description}</div>
                  </div>
                  {achievement.unlocked && (
                    <div className="text-sm text-yellow-600 font-medium">Unlocked!</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}