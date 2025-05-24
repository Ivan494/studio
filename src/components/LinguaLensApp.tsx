
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import SettingsPanel, { type Settings as AppSettings } from "./SettingsPanel";
import HoverTranslator from "./HoverTranslator";
import { useToast } from "@/hooks/use-toast"; // Keep for potential settings save toast

const LS_SETTINGS_KEY = "linguaLens_settings_v2";

export default function LinguaLensApp() {
  const [settings, setSettings] = useState<AppSettings>({
    defaultLanguage: "es",
    customPrompt: "",
    enableHoverTranslate: true, // Default hover translate to true now it's the main feature
  });
  
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  // isLoading and toast might still be useful for settings or future additions, but not for textbox
  // const { toast } = useToast(); // Only if settings save needs it, SettingsPanel has its own.

  useEffect(() => {
    const storedSettings = localStorage.getItem(LS_SETTINGS_KEY);
    if (storedSettings) {
      try {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings(prevSettings => ({
          ...prevSettings,
          ...parsedSettings,
          enableHoverTranslate: typeof parsedSettings.enableHoverTranslate === 'boolean' ? parsedSettings.enableHoverTranslate : true,
        }));
      } catch (error) {
        console.error("Failed to parse settings from localStorage", error);
        localStorage.removeItem(LS_SETTINGS_KEY); 
      }
    }
  }, []);

  const handleSettingsSave = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(newSettings));
    // Toast for settings save is handled within SettingsPanel
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card 
        className="shadow-2xl bg-card/80 backdrop-blur-sm"
        data-no-hover-translate="true" 
      >
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            LinguaLens
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} aria-label="Open settings">
            <Settings className="h-6 w-6 text-muted-foreground hover:text-foreground transition-colors" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-center text-muted-foreground p-4">
            Hover over text on any webpage or select text, then press{" "}
            <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">Alt</kbd> + <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">T</kbd> to translate.
            Press <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">Alt</kbd> + <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">U</kbd> to undo the last translation.
            <br/>
            Configure target language and custom prompts in settings.
          </p>
        </CardContent>
      </Card>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSettings={settings}
        onSettingsSave={handleSettingsSave}
      />
      
      {settings.enableHoverTranslate && (
        <HoverTranslator
          targetLanguage={settings.defaultLanguage}
          customPrompt={settings.customPrompt}
        />
      )}
    </div>
  );
}
