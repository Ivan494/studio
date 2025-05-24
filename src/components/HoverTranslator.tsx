
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Zap } from 'lucide-react'; // Added Zap for hotkey indication
import { translateText as customizeTranslationFlow } from "@/ai/flows/customize-translation-prompt";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface HoverTranslatorProps {
  targetLanguage: string;
  customPrompt?: string;
}

const ALLOWED_ELEMENTS = ['P', 'SPAN', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TD', 'TH', 'LI', 'A', 'BLOCKQUOTE', 'LABEL', 'DT', 'DD'];
const MIN_TEXT_LENGTH = 3; // Minimum characters to trigger translation
const MAX_TEXT_LENGTH = 300; // Maximum characters to avoid overly long requests
const TRANSLATE_HOTKEY_KEY = 't';
const TRANSLATE_HOTKEY_MODIFIER = 'altKey'; // 'altKey', 'ctrlKey', 'metaKey', 'shiftKey'

export default function HoverTranslator({ targetLanguage, customPrompt }: HoverTranslatorProps) {
  const [originalText, setOriginalText] = useState<string | null>(null);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTargetRef = useRef<EventTarget | null>(null);
  const isTranslatingRef = useRef<boolean>(false); // To prevent multiple triggers

  const clearTooltip = useCallback(() => {
    setShowTooltip(false);
    setOriginalText(null);
    setTranslatedText(null);
    setIsLoading(false);
    isTranslatingRef.current = false;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);
  
  const triggerTranslation = useCallback(async (textToTranslate: string) => {
    if (isLoading || !textToTranslate || isTranslatingRef.current) return;

    isTranslatingRef.current = true;
    setIsLoading(true);
    setTranslatedText(null); 
    try {
      const result = await customizeTranslationFlow({
        text: textToTranslate,
        targetLanguage: targetLanguage,
        customPrompt: customPrompt || undefined,
      });
      setTranslatedText(result.translatedText);
    } catch (error) {
      console.error("Hover translation error:", error);
      // toast({ title: "Hover Translate Failed", description: "Could not translate hovered text.", variant: "destructive" });
      // Clear tooltip on error, but only if it's still relevant to the current original text
      if(originalText === textToTranslate) {
        clearTooltip(); 
      }
    } finally {
      setIsLoading(false);
      isTranslatingRef.current = false;
    }
  }, [targetLanguage, customPrompt, toast, clearTooltip, isLoading, originalText]);

  const prepareForTranslation = useCallback((text: string, eventX: number, eventY: number) => {
    setOriginalText(text);
    setTranslatedText(null); // Clear previous translation
    setIsLoading(false); // Not loading yet, waiting for hotkey
    setTooltipPosition({ x: eventX, y: eventY });
    setShowTooltip(true);
    isTranslatingRef.current = false;
  }, []);

  const handleMouseOver = useCallback((event: MouseEvent) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    currentTargetRef.current = event.target;

    hoverTimeoutRef.current = setTimeout(() => {
      const target = currentTargetRef.current as HTMLElement;
      if (!target || typeof target.closest !== 'function') return;

      if (target.closest('[data-no-hover-translate="true"]') || target.closest('.hover-translate-tooltip')) {
        clearTooltip();
        return;
      }

      if (ALLOWED_ELEMENTS.includes(target.tagName) || (target.childNodes.length === 1 && target.childNodes[0].nodeType === Node.TEXT_NODE)) {
        let text = target.textContent?.trim() || "";
        
        if (!text && target.childNodes.length > 0) {
            for(let i=0; i < target.childNodes.length; i++) {
                const childNode = target.childNodes[i];
                if(childNode.nodeType === Node.TEXT_NODE && childNode.textContent?.trim()){
                    text = childNode.textContent.trim();
                    break;
                }
            }
        }

        if (text && text.length >= MIN_TEXT_LENGTH && text.length <= MAX_TEXT_LENGTH && /\S/.test(text)) {
          // Only prepare if the text is different from current, or if tooltip is hidden
          if (text !== originalText || !showTooltip) {
            prepareForTranslation(text, event.clientX, event.clientY);
          }
        } else {
          if(!isTranslatingRef.current) clearTooltip();
        }
      } else {
         if(!isTranslatingRef.current) clearTooltip();
      }
    }, 300); 
  }, [prepareForTranslation, clearTooltip, originalText, showTooltip]);

  const handleMouseOut = useCallback((event: MouseEvent) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (relatedTarget && (relatedTarget.closest('.hover-translate-tooltip'))) {
      return; 
    }
    if (!currentTargetRef.current?.contains(relatedTarget) && !isTranslatingRef.current && !isLoading) {
         clearTooltip();
    }
  }, [clearTooltip, isLoading]);

  const handleMouseUp = useCallback(() => {
    if (isTranslatingRef.current) return; // Don't interfere if a translation is active
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText && selectedText.length >= MIN_TEXT_LENGTH && selectedText.length <= MAX_TEXT_LENGTH) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      let rect;
      if (selection && selection.rangeCount > 0) {
        rect = selection.getRangeAt(0).getBoundingClientRect();
      }
      
      const posX = rect && rect.left && rect.width ? rect.left + (rect.width / 2) : (tooltipPosition?.x || 0);
      const posY = rect && rect.bottom ? rect.bottom : (tooltipPosition?.y || 0);
      prepareForTranslation(selectedText, posX, posY);
    }
  }, [prepareForTranslation, tooltipPosition]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isModifierPressed = event[TRANSLATE_HOTKEY_MODIFIER as 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'];

    if (showTooltip && originalText && !isLoading && !isTranslatingRef.current && isModifierPressed && event.key.toLowerCase() === TRANSLATE_HOTKEY_KEY) {
      event.preventDefault();
      triggerTranslation(originalText);
    }
  }, [showTooltip, originalText, isLoading, triggerTranslation]);

  useEffect(() => {
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [handleMouseOver, handleMouseOut, handleMouseUp, handleKeyDown]);


  if (!showTooltip || !originalText || !tooltipPosition) {
    return null;
  }

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    top: `${tooltipPosition.y + 15}px`,
    left: `${tooltipPosition.x + 15}px`,
    zIndex: 1000,
    maxWidth: '300px',
    pointerEvents: 'auto',
  };

  if (typeof window !== 'undefined') {
    if (tooltipPosition.x + 15 + 300 > window.innerWidth) {
        tooltipStyle.left = `${window.innerWidth - 300 - 5}px`;
    }
    if (tooltipPosition.y + 15 + 150 > window.innerHeight) {
        tooltipStyle.top = `${tooltipPosition.y - 150 - 15}px`;
    }
     if (parseInt(tooltipStyle.left as string) < 0) tooltipStyle.left = '5px';
     if (parseInt(tooltipStyle.top as string) < 0) tooltipStyle.top = '5px';
  }

  let hotkeyDisplay = '';
  if (TRANSLATE_HOTKEY_MODIFIER === 'altKey') hotkeyDisplay = 'Alt';
  else if (TRANSLATE_HOTKEY_MODIFIER === 'ctrlKey') hotkeyDisplay = 'Ctrl';
  else if (TRANSLATE_HOTKEY_MODIFIER === 'metaKey') hotkeyDisplay = 'Cmd';
  else if (TRANSLATE_HOTKEY_MODIFIER === 'shiftKey') hotkeyDisplay = 'Shift';
  hotkeyDisplay += ` + ${TRANSLATE_HOTKEY_KEY.toUpperCase()}`;

  return (
    <div style={tooltipStyle} className="hover-translate-tooltip">
      <Card className="shadow-xl bg-card/90 backdrop-blur-md border-primary/50">
        <CardContent className="p-3 space-y-1">
          <p className="text-xs text-muted-foreground truncate max-w-[280px]">
            Original: {originalText}
          </p>
          {isLoading && (
            <div className="flex items-center text-sm text-primary">
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Translating...
            </div>
          )}
          {translatedText && !isLoading && (
            <p className="text-sm font-semibold text-foreground">
              {translatedText}
            </p>
          )}
          {!translatedText && !isLoading && originalText && (
             <div className="flex items-center text-xs text-accent">
               <Zap className="mr-1 h-3 w-3" /> Press {hotkeyDisplay} to translate
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

