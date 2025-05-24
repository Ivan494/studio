
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { translateText as customizeTranslationFlow } from "@/ai/flows/customize-translation-prompt";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { HotkeyModifier } from "./LinguaLensApp"; // Import the type

interface HoverTranslatorProps {
  targetLanguage: string;
  customPrompt?: string;
  translateHotkeyKey: string;
  undoHotkeyKey: string;
  hotkeyModifier: HotkeyModifier;
}

const ALLOWED_ELEMENTS = ['P', 'SPAN', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TD', 'TH', 'LI', 'A', 'BLOCKQUOTE', 'LABEL', 'DT', 'DD', 'BUTTON'];
const MIN_TEXT_LENGTH = 2; 
const MAX_TEXT_LENGTH = 500; 

export default function HoverTranslator({ 
  targetLanguage, 
  customPrompt,
  translateHotkeyKey,
  undoHotkeyKey,
  hotkeyModifier
}: HoverTranslatorProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const currentHoverTargetRef = useRef<HTMLElement | null>(null);
  const currentHoverTextRef = useRef<string | null>(null);
  const lastModifiedElementRef = useRef<HTMLElement | null>(null);
  const lastOriginalTextRef = useRef<string | null>(null);
  
  const isProcessingRef = useRef<boolean>(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  const clearPendingHoverState = useCallback(() => {
    currentHoverTargetRef.current = null;
    currentHoverTextRef.current = null;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const triggerTranslation = useCallback(async (textToTranslate: string, targetElement: HTMLElement) => {
    if (isProcessingRef.current || !textToTranslate || !targetElement) return;

    isProcessingRef.current = true;
    setIsLoading(true);
    
    const originalTextContent = targetElement.textContent; 

    try {
      toast({ title: "Translating...", description: `Translating: "${textToTranslate.substring(0,30)}..."`, duration: 2000 });
      const result = await customizeTranslationFlow({
        text: textToTranslate,
        targetLanguage: targetLanguage,
        customPrompt: customPrompt || undefined,
      });

      if (targetElement) { 
        lastModifiedElementRef.current = targetElement;
        lastOriginalTextRef.current = originalTextContent; 
        targetElement.textContent = result.translatedText;
        toast({ title: "Text Translated", description: `Original: "${textToTranslate.substring(0,30)}..."` });
      }
    } catch (error) {
      console.error("Inline translation error:", error);
      toast({ title: "Translation Failed", description: "Could not translate the text.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
      clearPendingHoverState(); 
    }
  }, [targetLanguage, customPrompt, toast, clearPendingHoverState]);

  const handleRevertLastTranslation = useCallback(() => {
    if (isProcessingRef.current) return;

    if (lastModifiedElementRef.current && lastOriginalTextRef.current !== null) {
      isProcessingRef.current = true; 
      try {
        lastModifiedElementRef.current.textContent = lastOriginalTextRef.current;
        toast({ title: "Translation Reverted", description: "The last translation has been undone." });
        lastModifiedElementRef.current = null;
        lastOriginalTextRef.current = null;
      } catch (error) {
        console.error("Revert error:", error);
        toast({ title: "Revert Failed", description: "Could not revert the text.", variant: "destructive" });
      } finally {
        isProcessingRef.current = false;
      }
    } else {
      toast({ title: "Nothing to Revert", description: "No previous translation to undo.", variant: "default" });
    }
  }, [toast]);
  
  const prepareForTranslation = useCallback((element: HTMLElement, text: string) => {
    if (element.closest('[data-no-hover-translate="true"]')) {
      clearPendingHoverState();
      return;
    }
    currentHoverTargetRef.current = element;
    currentHoverTextRef.current = text;
  }, [clearPendingHoverState]);


  const handleMouseOver = useCallback((event: MouseEvent) => {
    if (isProcessingRef.current) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    const target = event.target as HTMLElement;
    
    hoverTimeoutRef.current = setTimeout(() => {
      if (!target || typeof target.closest !== 'function' || target.closest('[data-no-hover-translate="true"]')) {
        if (target !== currentHoverTargetRef.current) {
             clearPendingHoverState();
        }
        return;
      }

      let text = target.textContent?.trim() || "";

      if (text && text.length >= MIN_TEXT_LENGTH && text.length <= MAX_TEXT_LENGTH && /\S/.test(text)) {
          if (target !== currentHoverTargetRef.current || text !== currentHoverTextRef.current) {
            prepareForTranslation(target, text);
          }
      } else {
         if (target !== currentHoverTargetRef.current) {
            clearPendingHoverState();
        }
      }
    }, 200); 
  }, [prepareForTranslation, clearPendingHoverState]);


  const handleMouseUp = useCallback(() => {
    if (isProcessingRef.current) return;
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText && selectedText.length >= MIN_TEXT_LENGTH && selectedText.length <= MAX_TEXT_LENGTH) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current); 
      }
      let parentElement = selection?.anchorNode?.parentElement;
      if(selection?.anchorNode?.nodeType === Node.TEXT_NODE && selection.anchorNode.parentElement){
        parentElement = selection.anchorNode.parentElement;
      }

      if (parentElement && ALLOWED_ELEMENTS.includes(parentElement.tagName) && !parentElement.closest('[data-no-hover-translate="true"]')) {
        prepareForTranslation(parentElement, selectedText);
      } else {
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            let commonAncestor = range.commonAncestorContainer;
            if (commonAncestor.nodeType === Node.TEXT_NODE) {
                commonAncestor = commonAncestor.parentElement!;
            }
            if (commonAncestor instanceof HTMLElement && ALLOWED_ELEMENTS.includes(commonAncestor.tagName) && !commonAncestor.closest('[data-no-hover-translate="true"]')) {
                 prepareForTranslation(commonAncestor as HTMLElement, selectedText);
            } else {
                clearPendingHoverState(); 
            }
        }
      }
    }
  }, [prepareForTranslation, clearPendingHoverState]);


  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isModifierPressed = event[hotkeyModifier];

    if (isModifierPressed && event.key.toLowerCase() === translateHotkeyKey.toLowerCase()) {
      if (currentHoverTargetRef.current && currentHoverTextRef.current && !isLoading) {
        event.preventDefault();
        triggerTranslation(currentHoverTextRef.current, currentHoverTargetRef.current);
      }
    } else if (isModifierPressed && event.key.toLowerCase() === undoHotkeyKey.toLowerCase()) {
      event.preventDefault();
      handleRevertLastTranslation();
    }
  }, [isLoading, triggerTranslation, handleRevertLastTranslation, translateHotkeyKey, undoHotkeyKey, hotkeyModifier]);

  useEffect(() => {
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [handleMouseOver, handleMouseUp, handleKeyDown]);

  return null;
}

