"use client";

import { useState, useEffect } from "react";
import type { Language } from "@/lib/languages";
import { supportedLanguages } from "@/lib/languages";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import LanguageSelector from "./LanguageSelector";
import { useToast } from "@/hooks/use-toast";

export interface Settings {
  defaultLanguage: string;
  customPrompt: string;
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: Settings;
  onSettingsSave: (newSettings: Settings) => void;
}

export default function SettingsPanel({
  isOpen,
  onClose,
  currentSettings,
  onSettingsSave,
}: SettingsPanelProps) {
  const [defaultLanguage, setDefaultLanguage] = useState(currentSettings.defaultLanguage);
  const [customPrompt, setCustomPrompt] = useState(currentSettings.customPrompt);
  const { toast } = useToast();

  useEffect(() => {
    setDefaultLanguage(currentSettings.defaultLanguage);
    setCustomPrompt(currentSettings.customPrompt);
  }, [currentSettings, isOpen]);

  const handleSave = () => {
    onSettingsSave({ defaultLanguage, customPrompt });
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md bg-card">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-semibold">Settings</SheetTitle>
          <SheetDescription className="text-sm">
            Customize your translation preferences.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="default-language" className="text-base font-medium">Default Target Language</Label>
            <LanguageSelector
              languages={supportedLanguages}
              selectedLanguage={defaultLanguage}
              onLanguageChange={setDefaultLanguage}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-prompt" className="text-base font-medium">Custom Translation Prompt</Label>
            <Textarea
              id="custom-prompt"
              placeholder="e.g., Translate the following text to {{targetLanguage}} with a formal tone: {{text}}"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="min-h-[120px] text-sm bg-input"
            />
            <p className="text-xs text-muted-foreground">
              Use <code>{"{{text}}"}</code> for the input text and <code>{"{{targetLanguage}}"}</code> for the target language.
            </p>
          </div>
        </div>
        <SheetFooter className="mt-8">
          <SheetClose asChild>
            <Button variant="outline" className="text-sm">Cancel</Button>
          </SheetClose>
          <Button onClick={handleSave} className="text-sm">Save Changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
