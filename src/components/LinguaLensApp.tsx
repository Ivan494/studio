
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import LanguageSelector from "./LanguageSelector";
import { supportedLanguages, type Language } from "@/lib/languages";
import HoverTranslator from "./HoverTranslator";
import { useToast } from "@/hooks/use-toast";

export interface AppSettings {
  defaultLanguage: string;
  customPrompt: string;
  enableHoverTranslate: boolean;
}

const LS_SETTINGS_KEY = "linguaLens_settings_v2";

export default function LinguaLensApp() {
  const [settings, setSettings] = useState<AppSettings>({
    defaultLanguage: "es",
    customPrompt: "",
    enableHoverTranslate: true,
  });
  
  // Temporary state for unsaved changes in the form
  const [currentDefaultLanguage, setCurrentDefaultLanguage] = useState(settings.defaultLanguage);
  const [currentCustomPrompt, setCurrentCustomPrompt] = useState(settings.customPrompt);
  const [currentEnableHoverTranslate, setCurrentEnableHoverTranslate] = useState(settings.enableHoverTranslate);

  const { toast } = useToast();

  useEffect(() => {
    const storedSettings = localStorage.getItem(LS_SETTINGS_KEY);
    if (storedSettings) {
      try {
        const parsedSettings = JSON.parse(storedSettings) as AppSettings;
        setSettings(prevSettings => ({
          ...prevSettings,
          ...parsedSettings,
          enableHoverTranslate: typeof parsedSettings.enableHoverTranslate === 'boolean' ? parsedSettings.enableHoverTranslate : true,
        }));
        // Initialize form state with loaded settings
        setCurrentDefaultLanguage(parsedSettings.defaultLanguage);
        setCurrentCustomPrompt(parsedSettings.customPrompt);
        setCurrentEnableHoverTranslate(parsedSettings.enableHoverTranslate);
      } catch (error) {
        console.error("Failed to parse settings from localStorage", error);
        localStorage.removeItem(LS_SETTINGS_KEY); 
      }
    }
  }, []);

  // Update form fields if settings prop changes (e.g., after initial load)
  useEffect(() => {
    setCurrentDefaultLanguage(settings.defaultLanguage);
    setCurrentCustomPrompt(settings.customPrompt);
    setCurrentEnableHoverTranslate(settings.enableHoverTranslate);
  }, [settings]);


  const handleSettingsSave = () => {
    const newSettings: AppSettings = {
      defaultLanguage: currentDefaultLanguage,
      customPrompt: currentCustomPrompt,
      enableHoverTranslate: currentEnableHoverTranslate,
    };
    setSettings(newSettings);
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(newSettings));
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
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
          {/* Settings button removed */}
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-center text-muted-foreground">
            Hover over text on any webpage or select text, then press{" "}
            <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">Alt</kbd> + <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">T</kbd> to translate.
            Press <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">Alt</kbd> + <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">U</kbd> to undo the last translation.
          </p>

          <div className="border-t border-border pt-6 space-y-6">
            <h3 className="text-xl font-semibold text-center">Settings</h3>
            <div className="space-y-2">
              <Label htmlFor="default-language" className="text-base font-medium">Default Target Language</Label>
              <LanguageSelector
                languages={supportedLanguages}
                selectedLanguage={currentDefaultLanguage}
                onLanguageChange={setCurrentDefaultLanguage}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-prompt" className="text-base font-medium">Custom Translation Prompt</Label>
              <Textarea
                id="custom-prompt"
                placeholder="e.g., Translate the following text to {{targetLanguage}} with a formal tone: {{text}}"
                value={currentCustomPrompt}
                onChange={(e) => setCurrentCustomPrompt(e.target.value)}
                className="min-h-[100px] text-sm bg-input"
              />
              <p className="text-xs text-muted-foreground">
                Use <code>{"{{text}}"}</code> for the input text and <code>{"{{targetLanguage}}"}</code> for the target language.
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="enable-hover-translate"
                checked={currentEnableHoverTranslate}
                onCheckedChange={setCurrentEnableHoverTranslate}
                aria-labelledby="enable-hover-translate-label"
              />
              <Label htmlFor="enable-hover-translate" id="enable-hover-translate-label" className="text-base font-medium">
                Enable Hover/Selection Translate
              </Label>
            </div>
            <p className="text-xs text-muted-foreground pl-8">
                Translate text by hover/selection.
                Press Alt+T to translate, Alt+U to undo last translation.
            </p>
            <div className="flex justify-end">
              <Button onClick={handleSettingsSave} className="text-sm">Save Settings</Button>
            </div>
          </div>

        </CardContent>
      </Card>
      
      {settings.enableHoverTranslate && (
        <HoverTranslator
          targetLanguage={settings.defaultLanguage}
          customPrompt={settings.customPrompt}
        />
      )}
    </div>
  );
}
