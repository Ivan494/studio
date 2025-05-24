"use client";

import type { Language } from "@/lib/languages";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LanguageSelectorProps {
  languages: Language[];
  selectedLanguage: string;
  onLanguageChange: (languageCode: string) => void;
  disabled?: boolean;
}

export default function LanguageSelector({
  languages,
  selectedLanguage,
  onLanguageChange,
  disabled = false,
}: LanguageSelectorProps) {
  return (
    <Select
      value={selectedLanguage}
      onValueChange={onLanguageChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-full md:w-[180px] text-sm h-10">
        <SelectValue placeholder="Select language" />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code} className="text-sm">
            {lang.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
