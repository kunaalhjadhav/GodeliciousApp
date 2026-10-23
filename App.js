import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { CartProvider } from "./src/context/CartContext";
import { FavoritesProvider } from "./src/context/FavoritesContext";
import { LanguageProvider } from "./src/i18n";
import RootNavigator from "./src/navigation/RootNavigator";
import OnboardingScreen from "./src/screens/OnboardingScreen";

const ONBOARDING_KEY = "godelicious_onboarding_seen";

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((seen) => setShowOnboarding(!seen))
      .catch(() => setShowOnboarding(false))
      .finally(() => setCheckedOnboarding(true));
  }, []);

  function dismissOnboarding() {
    AsyncStorage.setItem(ONBOARDING_KEY, "true").catch(() => {});
    setShowOnboarding(false);
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <FavoritesProvider>
            <CartProvider>
              <RootNavigator />
              {checkedOnboarding && showOnboarding && <OnboardingScreen onDone={dismissOnboarding} />}
            </CartProvider>
          </FavoritesProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
