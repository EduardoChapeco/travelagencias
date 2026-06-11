import { useState, useCallback } from "react";
import { PortalBlock, PortalBlockType, BLOCK_DEFAULTS } from "@/lib/cms-types";

export function useBlockEditor(initialBlocks: PortalBlock[] = []) {
  const [blocks, setBlocks] = useState<PortalBlock[]>(initialBlocks);

  const setInitialBlocks = useCallback((newBlocks: PortalBlock[]) => {
    setBlocks(newBlocks || []);
  }, []);

  const addBlock = useCallback((type: PortalBlockType) => {
    const id = Math.random().toString(36).slice(2, 8);
    const newBlock: PortalBlock = { id, ...BLOCK_DEFAULTS[type] } as PortalBlock;
    setBlocks((prev) => [...prev, newBlock]);
  }, []);

  const updateBlock = useCallback((id: string, updates: Partial<PortalBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...updates } as PortalBlock) : b)));
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const moveBlock = useCallback((index: number, direction: -1 | 1) => {
    setBlocks((prev) => {
      const newBlocks = [...prev];
      if (index + direction < 0 || index + direction >= newBlocks.length) return prev;
      const temp = newBlocks[index];
      newBlocks[index] = newBlocks[index + direction];
      newBlocks[index + direction] = temp;
      return newBlocks;
    });
  }, []);

  return {
    blocks,
    setBlocks,
    setInitialBlocks,
    addBlock,
    updateBlock,
    removeBlock,
    moveBlock,
  };
}
