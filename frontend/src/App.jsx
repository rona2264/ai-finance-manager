import React, { useState, useEffect } from 'react';
import { SignedIn, SignedOut, SignIn, useUser, useAuth } from '@clerk/clerk-react';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Chat from './pages/Chat';
import { getProfileStatus } from './services/api';

export default function App() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [view, setView] = useState('landing');
  const [onboardingData, setOnboardingData] = useState({});
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);

  useEffect(() => {
    const checkUserProfile = async () => {
      if (isSignedIn && user) {
        setIsCheckingProfile(true);
        try {
          const token = await getToken();
          const profileData = await getProfileStatus(user.id, token);
          
          if (profileData.exists) {
            setView('chat');
          } else {
            setView('onboarding');
          }
        } catch (error) {
          console.error("Error al verificar perfil:", error);
          setView('onboarding');
        } finally {
          setIsCheckingProfile(false);
        }
      }
    };
    checkUserProfile();
  }, [isSignedIn, user, getToken]);

  const handleOnboardingComplete = ({ onboardingData: data }) => {
    setOnboardingData(data);
    setView('chat');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-emerald-500">
        Cargando...
      </div>
    );
  }

  return (
    <>
      <SignedOut>
        {view === 'landing' ? (
          <Landing onStart={() => setView('login')} />
        ) : (
          <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
            <SignIn routing="hash" />
          </div>
        )}
      </SignedOut>

      <SignedIn>
        {isCheckingProfile ? (
          <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-emerald-500">
            Verificando perfil...
          </div>
        ) : view === 'chat' ? (
          <Chat onboardingData={onboardingData} />
        ) : (
          <Onboarding onComplete={handleOnboardingComplete} />
        )}
      </SignedIn>
    </>
  );
}