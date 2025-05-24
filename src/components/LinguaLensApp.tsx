
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Languages, Undo2, Loader2 } from "lucide-react";
import LanguageSelector from "./LanguageSelector";
import SettingsPanel, { type Settings as AppSettings } from "./SettingsPanel";
import HoverTranslator from "./HoverTranslator"; // Added import
import { supportedLanguages } from "@/lib/languages";
import { useToast } from "@/hooks/use-toast";
import { translateText as customizeTranslationFlow } from "@/ai/flows/customize-translation-prompt";
import { revertTranslation as revertTranslationFlow } from "@/ai/flows/revert-translation";

const LS_SETTINGS_KEY = "linguaLens_settings_v2"; // Updated key to prevent conflicts with old settings

export default function LinguaLensApp() {
  const [text, setText] = useState<string>("");
  const [originalTextBeforeLastTranslation, setOriginalTextBeforeLastTranslation] = useState<string | null>(null);
  const [isTranslated, setIsTranslated] = useState<boolean>(false);
  
  const [settings, setSettings] = useState<AppSettings>({
    defaultLanguage: "es", // Default to Spanish
    customPrompt: "",
    enableHoverTranslate: false, // Default for new setting
  });
  
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    const storedSettings = localStorage.getItem(LS_SETTINGS_KEY);
    if (storedSettings) {
      try {
        const parsedSettings = JSON.parse(storedSettings);
        // Ensure new settings have defaults if not present in localStorage
        setSettings(prevSettings => ({
          ...prevSettings,
          ...parsedSettings,
          enableHoverTranslate: typeof parsedSettings.enableHoverTranslate === 'boolean' ? parsedSettings.enableHoverTranslate : false,
        }));
      } catch (error) {
        console.error("Failed to parse settings from localStorage", error);
        localStorage.removeItem(LS_SETTINGS_KEY); // Clear corrupted data
      }
    }
  }, []);

  const handleSettingsSave = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(newSettings));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (isTranslated) {
      setIsTranslated(false); 
      setOriginalTextBeforeLastTranslation(null); 
    }
  };
  
  const handleTranslate = useCallback(async () => {
    if (!text.trim()) {
      toast({ title: "Input Required", description: "Please enter text to translate.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setOriginalTextBeforeLastTranslation(text);
    try {
      const result = await customizeTranslationFlow({
        text: text,
        targetLanguage: settings.defaultLanguage,
        customPrompt: settings.customPrompt || undefined,
      });
      setText(result.translatedText);
      setIsTranslated(true);
      toast({ title: "Translation Successful", description: `Text translated to ${supportedLanguages.find(l => l.code === settings.defaultLanguage)?.name || settings.defaultLanguage}.` });
    } catch (error) {
      console.error("Translation error:", error);
      toast({ title: "Translation Failed", description: "Could not translate text. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [text, settings, toast]);

  const handleRevert = useCallback(async () => {
    if (!isTranslated || originalTextBeforeLastTranslation === null) {
      toast({ title: "Cannot Revert", description: "No previous translation to revert to.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await revertTranslationFlow({
        originalText: originalTextBeforeLastTranslation,
        translatedText: text, 
        shouldRevert: true,
      });
      setText(result.displayedText);
      setIsTranslated(false);
      toast({ title: "Reverted", description: "Text reverted to original." });
    } catch (error) {
      console.error("Revert error:", error);
      toast({ title: "Revert Failed", description: "Could not revert text. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [isTranslated, originalTextBeforeLastTranslation, text, toast]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (!isLoading) handleTranslate();
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'r') {
      event.preventDefault();
      if (isTranslated && !isLoading) handleRevert();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card 
        className="shadow-2xl bg-card/80 backdrop-blur-sm"
        data-no-hover-translate="true" // Prevent hover translator from translating this card
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
          <Textarea
            placeholder="Enter text to translate (Ctrl+Enter or Cmd+Enter to translate)"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            className="min-h-[200px] text-base p-4 rounded-lg shadow-inner focus:ring-2 focus:ring-primary transition-shadow"
            disabled={isLoading}
          />
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <LanguageSelector
              languages={supportedLanguages}
              selectedLanguage={settings.defaultLanguage}
              onLanguageChange={(langCode) => handleSettingsSave({ ...settings, defaultLanguage: langCode })}
              disabled={isLoading}
            />
            <div className="flex gap-3 w-full sm:w-auto">
              <Button 
                onClick={handleTranslate} 
                disabled={isLoading || !text.trim()} 
                className="w-full sm:w-auto text-sm flex-grow sm:flex-none"
                aria-label="Translate text"
              >
                {isLoading && !isTranslated ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}
                Translate
              </Button>
              <Button 
                variant="outline" 
                onClick={handleRevert} 
                disabled={isLoading || !isTranslated || originalTextBeforeLastTranslation === null}
                className="w-full sm:w-auto text-sm flex-grow sm:flex-none"
                aria-label="Revert to original text"
              >
                {isLoading && isTranslated ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Undo2 className="mr-2 h-4 w-4" />}
                Revert
              </Button>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Hotkeys: Translate (Ctrl/Cmd + Enter), Revert (Ctrl/Cmd + Shift + R)
          </p>
        </CardContent>
      </Card>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSettings={settings}
        onSettingsSave={handleSettingsSave}
      />
      
      {/* Render HoverTranslator conditionally based on settings */}
      {settings.enableHoverTranslate && (
        <HoverTranslator
          targetLanguage={settings.defaultLanguage}
          customPrompt={settings.customPrompt}
        />
      )}
    </div>
  );
}
