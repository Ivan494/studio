
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LanguageSelector from "./LanguageSelector";
import { supportedLanguages, type Language } from "@/lib/languages";
import HoverTranslator from "./HoverTranslator";
import { useToast } from "@/hooks/use-toast";

export type HotkeyModifier = 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey';

export interface AppSettings {
  defaultLanguage: string;
  customPrompt: string;
  enableHoverTranslate: boolean;
  translateHotkeyKey: string;
  undoHotkeyKey: string;
  hotkeyModifier: HotkeyModifier;
}

const LS_SETTINGS_KEY = "linguaLens_settings_v3"; // Incremented version for new settings

const modifierDisplayNames: Record<HotkeyModifier, string> = {
  altKey: "Alt",
  ctrlKey: "Ctrl",
  metaKey: "Cmd/Win",
  shiftKey: "Shift",
};

export default function LinguaLensApp() {
  const [settings, setSettings] = useState<AppSettings>({
    defaultLanguage: "es",
    customPrompt: "",
    enableHoverTranslate: true,
    translateHotkeyKey: "t",
    undoHotkeyKey: "u",
    hotkeyModifier: "altKey",
  });
  
  const [currentDefaultLanguage, setCurrentDefaultLanguage] = useState(settings.defaultLanguage);
  const [currentCustomPrompt, setCurrentCustomPrompt] = useState(settings.customPrompt);
  const [currentEnableHoverTranslate, setCurrentEnableHoverTranslate] = useState(settings.enableHoverTranslate);
  const [currentTranslateHotkeyKey, setCurrentTranslateHotkeyKey] = useState(settings.translateHotkeyKey);
  const [currentUndoHotkeyKey, setCurrentUndoHotkeyKey] = useState(settings.undoHotkeyKey);
  const [currentHotkeyModifier, setCurrentHotkeyModifier] = useState<HotkeyModifier>(settings.hotkeyModifier);

  const { toast } = useToast();

  useEffect(() => {
    const storedSettings = localStorage.getItem(LS_SETTINGS_KEY);
    if (storedSettings) {
      try {
        const parsedSettings = JSON.parse(storedSettings) as Partial<AppSettings>; // Use Partial for graceful migration
        const newSettings: AppSettings = {
          defaultLanguage: parsedSettings.defaultLanguage || "es",
          customPrompt: parsedSettings.customPrompt || "",
          enableHoverTranslate: typeof parsedSettings.enableHoverTranslate === 'boolean' ? parsedSettings.enableHoverTranslate : true,
          translateHotkeyKey: parsedSettings.translateHotkeyKey || "t",
          undoHotkeyKey: parsedSettings.undoHotkeyKey || "u",
          hotkeyModifier: parsedSettings.hotkeyModifier || "altKey",
        };
        setSettings(newSettings);
        // Initialize form state with loaded settings
        setCurrentDefaultLanguage(newSettings.defaultLanguage);
        setCurrentCustomPrompt(newSettings.customPrompt);
        setCurrentEnableHoverTranslate(newSettings.enableHoverTranslate);
        setCurrentTranslateHotkeyKey(newSettings.translateHotkeyKey);
        setCurrentUndoHotkeyKey(newSettings.undoHotkeyKey);
        setCurrentHotkeyModifier(newSettings.hotkeyModifier);
      } catch (error) {
        console.error("Failed to parse settings from localStorage", error);
        localStorage.removeItem(LS_SETTINGS_KEY); 
      }
    }
  }, []);

  useEffect(() => {
    setCurrentDefaultLanguage(settings.defaultLanguage);
    setCurrentCustomPrompt(settings.customPrompt);
    setCurrentEnableHoverTranslate(settings.enableHoverTranslate);
    setCurrentTranslateHotkeyKey(settings.translateHotkeyKey);
    setCurrentUndoHotkeyKey(settings.undoHotkeyKey);
    setCurrentHotkeyModifier(settings.hotkeyModifier);
  }, [settings]);


  const handleSettingsSave = () => {
    const newSettings: AppSettings = {
      defaultLanguage: currentDefaultLanguage,
      customPrompt: currentCustomPrompt,
      enableHoverTranslate: currentEnableHoverTranslate,
      translateHotkeyKey: currentTranslateHotkeyKey.trim().toLowerCase() || "t",
      undoHotkeyKey: currentUndoHotkeyKey.trim().toLowerCase() || "u",
      hotkeyModifier: currentHotkeyModifier,
    };
    setSettings(newSettings);
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(newSettings));
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
  };

  const formattedModifier = modifierDisplayNames[settings.hotkeyModifier] || settings.hotkeyModifier;

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
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-center text-muted-foreground">
            Hover over text on any webpage or select text, then press{" "}
            <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">{formattedModifier}</kbd> + <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">{settings.translateHotkeyKey.toUpperCase()}</kbd> to translate.
            Press <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">{formattedModifier}</kbd> + <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">{settings.undoHotkeyKey.toUpperCase()}</kbd> to undo the last translation.
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hotkey-modifier" className="text-base font-medium">Modifier Key</Label>
                <Select value={currentHotkeyModifier} onValueChange={(value) => setCurrentHotkeyModifier(value as HotkeyModifier)}>
                  <SelectTrigger id="hotkey-modifier">
                    <SelectValue placeholder="Select Modifier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="altKey">Alt</SelectItem>
                    <SelectItem value="ctrlKey">Ctrl</SelectItem>
                    <SelectItem value="metaKey">Cmd/Win</SelectItem>
                    <SelectItem value="shiftKey">Shift</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="translate-hotkey" className="text-base font-medium">Translate Key</Label>
                <Input 
                  id="translate-hotkey" 
                  type="text" 
                  value={currentTranslateHotkeyKey}
                  onChange={(e) => setCurrentTranslateHotkeyKey(e.target.value.slice(0,1))} // Allow only 1 char
                  maxLength={1}
                  className="bg-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="undo-hotkey" className="text-base font-medium">Undo Key</Label>
                <Input 
                  id="undo-hotkey" 
                  type="text" 
                  value={currentUndoHotkeyKey}
                  onChange={(e) => setCurrentUndoHotkeyKey(e.target.value.slice(0,1))} // Allow only 1 char
                  maxLength={1}
                  className="bg-input"
                />
              </div>
            </div>
             <p className="text-xs text-muted-foreground">
                Set your preferred hotkey combination for translations. Single character for Translate/Undo Key.
            </p>

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
                Translate text by hover/selection using your configured hotkeys.
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
          translateHotkeyKey={settings.translateHotkeyKey}
          undoHotkeyKey={settings.undoHotkeyKey}
          hotkeyModifier={settings.hotkeyModifier}
        />
      )}
    </div>
  );
}

