import { NEEDED_TO_UNLOCK_BOSS, TOTAL_NON_BOSS, TOTAL_ITEMS } from "../../config/constants.js";

export const rules = {
  needed: NEEDED_TO_UNLOCK_BOSS,
  totalNonBoss: TOTAL_NON_BOSS,
  totalItems: TOTAL_ITEMS,
  canUnlockBoss(score: number) {
    return score >= NEEDED_TO_UNLOCK_BOSS;
  },
  isBossIndex(index: number) {
    return index > TOTAL_NON_BOSS && index <= TOTAL_ITEMS;
  },
};
