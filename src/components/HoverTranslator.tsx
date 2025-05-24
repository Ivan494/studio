
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { translateText as customizeTranslationFlow } from "@/ai/flows/customize-translation-prompt";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface HoverTranslatorProps {
  targetLanguage: string;
  customPrompt?: string;
}

const ALLOWED_ELEMENTS = ['P', 'SPAN', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TD', 'TH', 'LI', 'A', 'BLOCKQUOTE', 'LABEL', 'DT', 'DD', 'BUTTON'];
const MIN_TEXT_LENGTH = 2; 
const MAX_TEXT_LENGTH = 500; 
const TRANSLATE_HOTKEY_KEY = 't';
const UNDO_HOTKEY_KEY = 'u';
const HOTKEY_MODIFIER = 'altKey'; // 'altKey', 'ctrlKey', 'metaKey', 'shiftKey'

export default function HoverTranslator({ targetLanguage, customPrompt }: HoverTranslatorProps) {
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
    
    const originalTextContent = targetElement.textContent; // Capture just before modification

    try {
      toast({ title: "Translating...", description: `Translating: "${textToTranslate.substring(0,30)}..."`, duration: 2000 });
      const result = await customizeTranslationFlow({
        text: textToTranslate,
        targetLanguage: targetLanguage,
        customPrompt: customPrompt || undefined,
      });

      if (targetElement) { // Check if targetElement is still valid (e.g., not removed from DOM)
        lastModifiedElementRef.current = targetElement;
        lastOriginalTextRef.current = originalTextContent; // Store original text content
        targetElement.textContent = result.translatedText;
        toast({ title: "Text Translated", description: `Original: "${textToTranslate.substring(0,30)}..."` });
      }
    } catch (error) {
      console.error("Inline translation error:", error);
      toast({ title: "Translation Failed", description: "Could not translate the text.", variant: "destructive" });
      // Do not revert here, user can use undo if they wish
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
      clearPendingHoverState(); // Clear the pending state after attempting translation
    }
  }, [targetLanguage, customPrompt, toast, clearPendingHoverState]);

  const handleRevertLastTranslation = useCallback(() => {
    if (isProcessingRef.current) return;

    if (lastModifiedElementRef.current && lastOriginalTextRef.current !== null) {
      isProcessingRef.current = true; // Prevent other actions during revert
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
    // No visual indication here, translation happens on hotkey
  }, [clearPendingHoverState]);


  const handleMouseOver = useCallback((event: MouseEvent) => {
    if (isProcessingRef.current) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    const target = event.target as HTMLElement;
    
    hoverTimeoutRef.current = setTimeout(() => {
      if (!target || typeof target.closest !== 'function' || target.closest('[data-no-hover-translate="true"]')) {
        // If it's not a valid target or inside a "no translate" zone, and not currently focused for translation, clear.
        if (target !== currentHoverTargetRef.current) {
             clearPendingHoverState();
        }
        return;
      }

      let textSourceElement = target;
      let text = target.textContent?.trim() || "";

      // Try to get more specific text if hovering over a large container
      if (ALLOWED_ELEMENTS.includes(target.tagName) ) {
        // If the target itself is a general container, look for a more specific child if possible
        // This part can be complex. For now, we mostly rely on the direct target.
        // A more advanced version might iterate children to find the smallest element containing the mouse pointer.
      }


      // A simple heuristic: if the element itself has text, use it.
      // Otherwise, if it's a container, it might be too broad.
      // For now, we take what we get from target.textContent
      if (text && text.length >= MIN_TEXT_LENGTH && text.length <= MAX_TEXT_LENGTH && /\S/.test(text)) {
          // Only update if the target or text is different
          if (target !== currentHoverTargetRef.current || text !== currentHoverTextRef.current) {
            prepareForTranslation(target, text);
          }
      } else {
        // If text is too short/long or target changes, and not currently focused for translation, clear.
         if (target !== currentHoverTargetRef.current) {
            clearPendingHoverState();
        }
      }
    }, 200); // A small delay to stabilize hover target
  }, [prepareForTranslation, clearPendingHoverState]);


  const handleMouseUp = useCallback(() => {
    if (isProcessingRef.current) return;
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText && selectedText.length >= MIN_TEXT_LENGTH && selectedText.length <= MAX_TEXT_LENGTH) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current); // Clear any pending hover action
      }
      let parentElement = selection?.anchorNode?.parentElement;
      if(selection?.anchorNode?.nodeType === Node.TEXT_NODE && selection.anchorNode.parentElement){
        parentElement = selection.anchorNode.parentElement;
      }

      if (parentElement && ALLOWED_ELEMENTS.includes(parentElement.tagName) && !parentElement.closest('[data-no-hover-translate="true"]')) {
        prepareForTranslation(parentElement, selectedText);
      } else {
        // If a valid parent element for selection cannot be determined, try to use the range's common ancestor
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            let commonAncestor = range.commonAncestorContainer;
            if (commonAncestor.nodeType === Node.TEXT_NODE) {
                commonAncestor = commonAncestor.parentElement!;
            }
            if (commonAncestor instanceof HTMLElement && ALLOWED_ELEMENTS.includes(commonAncestor.tagName) && !commonAncestor.closest('[data-no-hover-translate="true"]')) {
                 prepareForTranslation(commonAncestor as HTMLElement, selectedText);
            } else {
                clearPendingHoverState(); // Selection is not in an allowed element
            }
        }
      }
    }
  }, [prepareForTranslation, clearPendingHoverState]);


  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isModifierPressed = event[HOTKEY_MODIFIER as 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'];

    if (isModifierPressed && event.key.toLowerCase() === TRANSLATE_HOTKEY_KEY) {
      if (currentHoverTargetRef.current && currentHoverTextRef.current && !isLoading) {
        event.preventDefault();
        triggerTranslation(currentHoverTextRef.current, currentHoverTargetRef.current);
      }
    } else if (isModifierPressed && event.key.toLowerCase() === UNDO_HOTKEY_KEY) {
      event.preventDefault();
      handleRevertLastTranslation();
    }
  }, [isLoading, triggerTranslation, handleRevertLastTranslation]);

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

  // This component no longer renders any UI itself
  return null;
}
