
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
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

export default function HoverTranslator({ targetLanguage, customPrompt }: HoverTranslatorProps) {
  const [originalText, setOriginalText] = useState<string | null>(null);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTargetRef = useRef<EventTarget | null>(null);

  const clearTooltip = useCallback(() => {
    setShowTooltip(false);
    setOriginalText(null);
    setTranslatedText(null);
    setIsLoading(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);
  
  const triggerTranslation = useCallback(async (textToTranslate: string) => {
    if (isLoading || !textToTranslate) return;

    setIsLoading(true);
    setTranslatedText(null); // Clear previous translation
    try {
      const result = await customizeTranslationFlow({
        text: textToTranslate,
        targetLanguage: targetLanguage,
        customPrompt: customPrompt || undefined,
      });
      setTranslatedText(result.translatedText);
    } catch (error) {
      console.error("Hover translation error:", error);
      // Do not show toast for hover translation errors to avoid being too noisy
      // toast({ title: "Hover Translate Failed", description: "Could not translate hovered text.", variant: "destructive" });
      clearTooltip(); // Clear tooltip on error
    } finally {
      setIsLoading(false);
    }
  }, [targetLanguage, customPrompt, isLoading, toast, clearTooltip]);

  const handleMouseOver = useCallback((event: MouseEvent) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    currentTargetRef.current = event.target;

    hoverTimeoutRef.current = setTimeout(() => {
      const target = currentTargetRef.current as HTMLElement;
      if (!target || typeof target.closest !== 'function') return;

      // Prevent translating self or elements marked to be ignored
      if (target.closest('[data-no-hover-translate="true"]') || target.closest('.hover-translate-tooltip')) {
        clearTooltip();
        return;
      }

      if (ALLOWED_ELEMENTS.includes(target.tagName) || (target.childNodes.length === 1 && target.childNodes[0].nodeType === Node.TEXT_NODE)) {
        let text = target.textContent?.trim() || "";
        
        // If the target itself has no text, try its first text node child if it's a simple wrapper
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
          setOriginalText(text);
          setTooltipPosition({ x: event.clientX, y: event.clientY });
          setShowTooltip(true);
          triggerTranslation(text);
        } else {
          clearTooltip();
        }
      } else {
         clearTooltip();
      }
    }, 300); // 300ms delay before triggering
  }, [triggerTranslation, clearTooltip]);

  const handleMouseOut = useCallback((event: MouseEvent) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
     // Check if mouse is moving to the tooltip itself or related target
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (relatedTarget && (relatedTarget.closest('.hover-translate-tooltip'))) {
      return; // Don't hide if moving to tooltip
    }
    if (!currentTargetRef.current?.contains(relatedTarget)) {
         clearTooltip();
    }
  }, [clearTooltip]);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText && selectedText.length >= MIN_TEXT_LENGTH && selectedText.length <= MAX_TEXT_LENGTH) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      // Try to get position from selection range
      let rect;
      if (selection && selection.rangeCount > 0) {
        rect = selection.getRangeAt(0).getBoundingClientRect();
      }
      
      setOriginalText(selectedText);
      // Position tooltip near the selection, or fallback to last mouse position if rect is not useful
      setTooltipPosition(rect && rect.bottom && rect.left ? { x: rect.left + (rect.width / 2) , y: rect.bottom } : tooltipPosition || {x:0, y:0}); // Fallback needed for x,y
      setShowTooltip(true);
      triggerTranslation(selectedText);
    }
  }, [triggerTranslation, tooltipPosition]); // Added tooltipPosition to dependencies

  useEffect(() => {
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('mouseup', handleMouseUp);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [handleMouseOver, handleMouseOut, handleMouseUp]);


  if (!showTooltip || !originalText || !tooltipPosition) {
    return null;
  }

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    top: `${tooltipPosition.y + 15}px`, // Offset below cursor
    left: `${tooltipPosition.x + 15}px`, // Offset right of cursor
    zIndex: 1000,
    maxWidth: '300px',
    pointerEvents: 'auto', // Allow interaction with tooltip if needed later
  };

  // Adjust position if tooltip goes off-screen
  if (typeof window !== 'undefined') {
    if (tooltipPosition.x + 15 + 300 > window.innerWidth) { // 300 is maxWidth
        tooltipStyle.left = `${window.innerWidth - 300 - 5}px`; // Adjust to stay in screen, with some padding
    }
    if (tooltipPosition.y + 15 + 150 > window.innerHeight) { // 150 is an estimated height
        tooltipStyle.top = `${tooltipPosition.y - 150 - 15}px`; // Show above cursor
    }
     if (parseInt(tooltipStyle.left as string) < 0) tooltipStyle.left = '5px';
     if (parseInt(tooltipStyle.top as string) < 0) tooltipStyle.top = '5px';
  }


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
             <p className="text-xs text-muted-foreground">Hover or select text to translate.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
