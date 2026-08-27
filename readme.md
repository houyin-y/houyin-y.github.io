# 👑 Clash Royale Card Level Calculator

A lightweight, responsive web app that helps Clash Royale players calculate the maximum level their cards can reach based on their current card inventory and extra cards available.

---

## ✨ Features

* **Rarity-Aware Progression:** Automatically adjusts minimum starting levels based on card rarity (Common, Rare, Epic, Legendary, Champion).
* **Accurate Upgrade Tracking:** Computes achievable level, leftover card count, and remaining cards needed for the next upgrade step.
* **Clash Royale UI Theme:** Styled with custom dark-mode aesthetics, gold accents, cyan highlights, and clean typography.
* **Battle Log (History Storage):** Stores up to 10 recent calculations in browser `localStorage` with a discreet slide-out panel to review past entries.
* **Card Name Labeling:** Tag your calculations with card names for clear tracking in your history log.

---

## 📁 File Structure

```text
├── index.html   # Main HTML layout & application structure
├── styles.css   # Custom Clash Royale-themed styles and animations
└── script.js    # Upgrade logic, dynamic UI updates, and LocalStorage history