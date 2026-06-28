import { useState, useCallback } from "react";
import { PortalBlock, PortalBlockType, BLOCK_DEFAULTS } from "@/lib/cms-types";

export function useBlockEditor(initialBlocks: PortalBlock[] = []) {
  const [blocks, setBlocks] = useState<PortalBlock[]>(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const setInitialBlocks = useCallback((newBlocks: PortalBlock[]) => {
    setBlocks(newBlocks || []);
  }, []);

  const addBlock = useCallback((type: PortalBlockType) => {
    const id = crypto.randomUUID();
    const defaults = BLOCK_DEFAULTS[type];
    const deepCopiedDefaults = JSON.parse(JSON.stringify(defaults));
    const newBlock: PortalBlock = { id, ...deepCopiedDefaults } as PortalBlock;
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedBlockId(id);
  }, []);

  const updateBlock = useCallback((id: string, updates: Partial<PortalBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...updates } as PortalBlock) : b)));
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedBlockId((prev) => (prev === id ? null : prev));
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
    selectedBlockId,
    setSelectedBlockId,
  };
}
