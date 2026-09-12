\"use client\";

import React, { useState } from "react";
import { GripVertical, RefreshCw, X } from "lucide-react";

// ---------- Design tokens (colors only - sizing lives in CSS classes below) ----------
const C = {
  bg: "#0A0A0B",
  panel: "#161617",
  panelAlt: "#1E1E20",
  line: "#2C2C2E",
  red: "#D2232C",
  gold: "#F2B705",
  white: "#F5F3EC",
  grey: "#8D8D91",
  green: "#39D98A",
};

const PLATFORM_COLORS = {
  espn: "#D2232C",
  sleeper: "#2F6FED",
  yahoo: "#7C2AE8",
};

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');

.fd-body { font-family: 'Inter', sans-serif; }
.fd-display { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.01em; }

/* ---- board: ALWAYS 4 columns x 4 shared rows (colhead / you-card / vs / opp-card).
   Real CSS Grid rows - not nested boxes - so "you-card" row height is the max
   across ALL leagues independently of the opponent card's own height. That's
   what makes every opponent card start at the same row, with zero JS. ---- */
.fd-board {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: auto auto auto auto;
  align-items: start;
  gap: 2px;
  padding: 4px;
}
@media (min-width: 640px) {
  .fd-board { gap: 8px; padding: 14px; }
}
@media (min-width: 1024px) {
  .fd-board { gap: 14px; padding: 18px; max-width: 1280px; margin: 0 auto; }
}

/* purely decorative: spans all 4 rows of its column to draw the "one rectangle
   per league" border, regardless of how tall that league's own content is.
   Only top/bottom get a border - the gold rail is the only side divider needed,
   the next league's own rail already separates it from this one on the right. */
.fd-league-box {
  align-self: stretch;
  min-width: 0;
  border-top: 1px solid #2C2C2E;
  border-bottom: 1px solid #2C2C2E;
  border-left: 2px solid #F2B705;
  pointer-events: none;
}

.fd-col-head { display: flex; flex-direction: column; gap: 1px; padding: 3px 4px 0 6px; min-width: 0; }
@media (min-width: 640px) { .fd-col-head { padding: 6px 8px 0 10px; } }
@media (min-width: 1024px) { .fd-col-head { padding: 8px 10px 0 12px; } }

.fd-plat-tag {
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 5px;
  letter-spacing: 0.2px;
  line-height: 1;
  color: #F5F3EC;
  padding: 1.5px 2.5px;
  flex-shrink: 0;
  align-self: flex-start;
}
@media (min-width: 640px) { .fd-plat-tag { font-size: 7px; padding: 2px 4px; } }
@media (min-width: 1024px) { .fd-plat-tag { font-size: 8px; } }

.fd-league-name {
  display: block;
  font-family: 'Oswald', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-size: 6px;
  color: #8D8D91;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}
@media (min-width: 640px) { .fd-league-name { font-size: 10px; } }
@media (min-width: 1024px) { .fd-league-name { font-size: 12px; } }

/* ---- team card ---- */
.fd-card {
  position: relative;
  box-sizing: border-box;
  margin: 0 2px 1px 4px;
  padding: 5px 3px;
}
@media (min-width: 640px) { .fd-card { margin: 0 6px 2px 8px; padding: 9px 7px; } }
@media (min-width: 1024px) { .fd-card { margin: 0 8px 3px 10px; padding: 13px 11px; } }

.fd-card-you { }

/* name and score stack vertically now - there's vertical room to spare */
.fd-team-name {
  font-size: 9px;
  color: #F5F3EC;
  line-height: 1.15;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  margin-bottom: 2px;
}
@media (min-width: 640px) { .fd-team-name { font-size: 13px; } }
@media (min-width: 1024px) { .fd-team-name { font-size: 16px; } }

.fd-score-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 3px; }

.fd-score {
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
}
@media (min-width: 640px) { .fd-score { font-size: 23px; } }
@media (min-width: 1024px) { .fd-score { font-size: 30px; } }

.fd-record { font-size: 7px; color: #8D8D91; }
@media (min-width: 640px) { .fd-record { font-size: 10px; } }
@media (min-width: 1024px) { .fd-record { font-size: 11px; } }

.fd-proj-inline { display: inline-flex; align-items: baseline; gap: 3px; }
.fd-proj-label { font-size: 7px; color: #8D8D91; }
@media (min-width: 640px) { .fd-proj-label { font-size: 9px; } }
@media (min-width: 1024px) { .fd-proj-label { font-size: 10px; } }
.fd-proj-value { font-size: 12px; line-height: 1; }
@media (min-width: 640px) { .fd-proj-value { font-size: 16px; } }
@media (min-width: 1024px) { .fd-proj-value { font-size: 19px; } }


/* ---- starter rows ---- */
.fd-row {
  display: grid;
  grid-template-columns: 12px 1fr 22px;
  align-items: center;
  column-gap: 2px;
  padding: 1.5px 0;
  border-bottom: 1px solid #2C2C2E;
  cursor: pointer;
}
.fd-row:last-child { border-bottom: none; }
.fd-row:hover .fd-name { text-decoration: underline; }
.fd-row-tall { row-gap: 1px; padding-bottom: 3px; }
.fd-row-game {
  grid-column: 1 / -1;
  font-size: 6px;
  color: #6B6B6F;
  padding-left: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
@media (min-width: 640px) { .fd-row-game { font-size: 9px; padding-left: 19px; } }
@media (min-width: 1024px) { .fd-row-game { font-size: 10px; padding-left: 25px; } }
@media (min-width: 640px) {
  .fd-row { grid-template-columns: 18px 1fr 34px; column-gap: 6px; padding: 3.5px 0; }
}
@media (min-width: 1024px) {
  .fd-row { grid-template-columns: 24px 1fr 40px; column-gap: 8px; padding: 5px 0; }
}

.fd-pos {
  font-size: 6.5px;
  font-weight: 700;
  color: #8D8D91;
}
@media (min-width: 640px) { .fd-pos { font-size: 9px; } }
@media (min-width: 1024px) { .fd-pos { font-size: 10px; } }

.fd-name {
  font-size: 7.5px;
  color: #F5F3EC;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
@media (min-width: 640px) { .fd-name { font-size: 11px; } }
@media (min-width: 1024px) { .fd-name { font-size: 13px; } }

.fd-pts {
  font-size: 7.5px;
  font-weight: 700;
  text-align: right;
}
@media (min-width: 640px) { .fd-pts { font-size: 11px; } }
@media (min-width: 1024px) { .fd-pts { font-size: 13px; } }

/* green = outperforming projection, red = underperforming, grey = hasn't played yet */
.fd-pts-over { color: #39D98A; }
.fd-pts-under { color: #D2232C; }
.fd-pts-even { color: #F5F3EC; }
.fd-pts-pre { color: #8D8D91; font-weight: 500; }

/* ---- vs divider: symmetric margin so it sits centered between the two cards ---- */
.fd-vs { display: flex; align-items: center; gap: 3px; margin: 0; padding: 0 4px 0 6px; }
.fd-vs-line { flex: 1; height: 1px; background: #D2232C; }
.fd-vs-label { font-size: 6.5px; color: #D2232C; flex-shrink: 0; }
@media (min-width: 640px) { .fd-vs-label { font-size: 9px; } .fd-vs { margin: 1px 0; } }
@media (min-width: 1024px) { .fd-vs { margin: 1px 0; } }

/* live/week badge + add-leagues button: same height, grouped together on the right */
.fd-live-badge {
  display: flex; align-items: center; gap: 4px;
  font-family: 'Inter', sans-serif;
  font-size: 8px; font-weight: 700; letter-spacing: 0.5px;
  background: none;
  border: 1px solid currentColor; border-radius: 0;
  padding: 3px 6px;
  line-height: 1;
  cursor: pointer;
  margin-left: auto;
}
@media (min-width: 640px) { .fd-live-badge { font-size: 11px; padding: 4px 9px; } }
@media (min-width: 1024px) { .fd-live-badge { font-size: 12px; padding: 4px 9px; } }

.fd-total { font-size: 7px; color: #8D8D91; }
@media (min-width: 640px) { .fd-total { font-size: 10px; } }
@media (min-width: 1024px) { .fd-total { font-size: 12px; } }

.fd-sync-group { display: flex; align-items: center; gap: 5px; }
.fd-resync-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #8D8D91;
  padding: 2px;
  cursor: pointer;
  line-height: 0;
}
.fd-resync-btn:active { color: #F2B705; }

.fd-logo { font-size: 22px; }
@media (min-width: 640px) { .fd-logo { font-size: 30px; } }
@media (min-width: 1024px) { .fd-logo { font-size: 36px; } }

/* ---- week picker grid (inside the shared modal styling) ---- */
.fd-week-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}
.fd-week-btn {
  background: #1E1E20;
  border: 1px solid #2C2C2E;
  padding: 8px 0;
  font-size: 14px;
  cursor: pointer;
}
.fd-week-btn.active { background: #F2B705; border-color: #F2B705; }

/* ---- bench toggle + dropdown (drops below its OWN card only, not the whole column) ---- */
.fd-bench-toggle {
  display: block;
  box-sizing: border-box;
  width: 100%;
  text-align: center;
  background: none;
  border: none;
  border-top: 1px dashed #2C2C2E;
  color: #8D8D91;
  font-size: 6px;
  line-height: 1.4;
  letter-spacing: 0.5px;
  padding: 2px 0 0;
  margin: 1px 0 0;
  cursor: pointer;
}
@media (min-width: 640px) { .fd-bench-toggle { font-size: 9px; padding: 3px 0 0; margin-top: 2px; } }
@media (min-width: 1024px) { .fd-bench-toggle { font-size: 10px; } }

.fd-bench-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 30;
  background: #0A0A0B;
  border: 1px solid #F2B705;
  border-top: none;
  padding: 3px;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 0 6px 10px rgba(0,0,0,0.5);
}
@media (min-width: 640px) { .fd-bench-dropdown { padding: 6px; max-height: 300px; } }
@media (min-width: 1024px) { .fd-bench-dropdown { padding: 9px; max-height: 400px; } }

.fd-bench-head { display: flex; justify-content: space-between; align-items: center; gap: 4px; margin-bottom: 3px; }
.fd-bench-title {
  font-size: 7.5px;
  color: #F2B705;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
@media (min-width: 640px) { .fd-bench-title { font-size: 11px; } }
@media (min-width: 1024px) { .fd-bench-title { font-size: 13px; } }

.fd-bench-close {
  flex-shrink: 0;
  background: none;
  border: 1px solid #2C2C2E;
  color: #8D8D91;
  font-size: 9px;
  line-height: 1;
  padding: 2px 5px;
  cursor: pointer;
}

/* ---- player stat modal ---- */
.fd-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow-y: auto;
}
.fd-modal {
  width: 100%;
  max-width: 320px;
  max-height: 85vh;
  overflow-y: auto;
  background: #161617;
  border: 1px solid #F2B705;
  padding: 18px;
}
.fd-modal-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 14px; }
.fd-modal-pos { font-size: 11px; color: #8D8D91; letter-spacing: 0.5px; margin-bottom: 3px; }
.fd-modal-name { font-size: 22px; color: #F5F3EC; line-height: 1.05; }
.fd-modal-score-row { display: flex; gap: 24px; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid #2C2C2E; }
.fd-modal-label { font-size: 9px; color: #8D8D91; letter-spacing: 0.5px; display: block; margin-bottom: 3px; }
.fd-modal-pts { font-size: 28px; line-height: 1; }
.fd-modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fd-modal-grid > div { display: flex; flex-direction: column; }
.fd-modal-val { font-size: 13px; color: #F5F3EC; }
.fd-modal-section-label { font-size: 9px; color: #F2B705; letter-spacing: 1px; margin-bottom: 8px; }
.fd-modal-divider { height: 1px; background: #2C2C2E; margin: 14px 0; }

.fd-modal-game {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  background: #1E1E20;
  border: 1px solid #2C2C2E;
  padding: 8px 10px;
  margin-bottom: 14px;
}
.fd-modal-game-score { font-size: 14px; color: #F5F3EC; }
.fd-modal-game-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #8D8D91;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}
.fd-modal-game-time.live { color: #39D98A; }

/* ---- persistent app header (brand + page nav), sticky together as one unit ---- */
.fd-app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #0A0A0B;
}
.fd-brand-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 10px 2px;
  border-bottom: 1px solid #2C2C2E;
}
@media (min-width: 640px) { .fd-brand-row { padding: 6px 20px 2px; } }
@media (min-width: 1024px) { .fd-brand-row { padding: 8px 32px 3px; } }

.fd-topnav {
  background: #0A0A0B;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 0 10px 3px;
}
@media (min-width: 640px) { .fd-topnav { padding: 0 20px 5px; gap: 6px; } }

.fd-topnav-tab {
  font-family: 'Oswald', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #8D8D91;
  font-size: 10px;
  padding: 4px 6px;
  cursor: pointer;
}
.fd-topnav-tab.active { color: #F5F3EC; border-bottom-color: #D2232C; }
@media (min-width: 640px) { .fd-topnav-tab { font-size: 12px; padding: 5px 9px; } }

.fd-add-leagues-btn {
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  letter-spacing: 0.3px;
  background: none;
  border: 1px solid #F2B705;
  color: #F2B705;
  font-size: 8px;
  padding: 3px 6px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}
@media (min-width: 640px) { .fd-add-leagues-btn { font-size: 11px; padding: 4px 9px; } }
@media (min-width: 1024px) { .fd-add-leagues-btn { font-size: 12px; padding: 4px 9px; } }

/* ---- reorder list (drag to set Scoreboard order, in Add Leagues) ---- */
.fd-reorder-list {
  display: flex;
  flex-direction: column;
  border: 1px solid #2C2C2E;
  touch-action: none;
  overscroll-behavior: contain;
}
.fd-reorder-row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 10px;
  background: #161617;
  border-bottom: 1px solid #2C2C2E;
  touch-action: none;
  cursor: grab;
  user-select: none;
}
.fd-reorder-row:last-child { border-bottom: none; }
.fd-reorder-row.dragging {
  position: relative;
  z-index: 10;
  background: #1E1E20;
  box-shadow: 0 6px 14px rgba(0,0,0,0.5);
  cursor: grabbing;
}
.fd-reorder-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: #F5F3EC;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fd-reorder-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: none;
  border: none;
  color: #8D8D91;
  padding: 4px;
  cursor: pointer;
}
.fd-reorder-remove:active { color: #D2232C; }

/* ---- help me root ---- */
.fd-root-mode-row { display: flex; gap: 5px; margin-bottom: 10px; flex-wrap: wrap; }
.fd-root-mode-btn {
  flex: 1;
  min-width: 100px;
  background: none;
  border: 1px solid #2C2C2E;
  color: #8D8D91;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  padding: 7px 6px;
  cursor: pointer;
}
.fd-root-mode-btn.active { color: #0A0A0B; background: #F2B705; border-color: #F2B705; }
@media (min-width: 640px) { .fd-root-mode-btn { font-size: 12px; } }

.fd-root-picker {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 5px;
  margin-bottom: 14px;
}
.fd-root-pick-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  background: #161617;
  border: 1px solid #2C2C2E;
  color: #F5F3EC;
  padding: 6px 9px;
  cursor: pointer;
  text-align: left;
}
.fd-root-pick-btn.active { border-color: #F2B705; background: #1E1E20; }
.fd-root-pick-matchup { font-size: 13px; }
.fd-root-pick-slot { font-size: 9px; color: #8D8D91; font-family: 'Inter', sans-serif; }

/* game buttons carry two lines of info, so they run smaller/denser than the
   single-line day/timeslot buttons even though both share the same display font */
.fd-root-picker-games { grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 4px; }
.fd-root-pick-btn-game { padding: 5px 7px; gap: 1px; }
.fd-root-pick-btn-game .fd-root-pick-matchup { font-size: 11px; }
.fd-root-pick-btn-game .fd-root-pick-slot { font-size: 8px; }
.fd-root-pick-btn-all.active { border-color: #F2B705; }
.fd-root-pick-btn-all.active .fd-root-pick-matchup { color: #F2B705; }
.fd-root-pick-btn-slot .fd-root-pick-matchup { font-size: 13px; }

.fd-root-results {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
@media (min-width: 900px) {
  .fd-root-results { grid-template-columns: 1fr 1fr 1fr; align-items: start; }
}

.fd-root-col-head {
  font-family: 'Oswald', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 12px;
  margin-bottom: 5px;
  padding-bottom: 4px;
  border-bottom: 1px solid #2C2C2E;
}
.fd-root-col-conflict { background: #14120a; padding: 8px; border: 1px dashed #F2B705; }

.fd-root-empty { font-size: 11px; color: #8D8D91; }

.fd-root-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 4px 6px;
  padding: 2.5px 0;
}
.fd-root-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.fd-root-name {
  font-size: 11px;
  color: #F5F3EC;
  flex: 1 1 68px;
  min-width: 68px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fd-root-tag { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.fd-root-tag-label { font-size: 8px; font-weight: 700; letter-spacing: 0.5px; }
.fd-root-tags { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; }
.fd-root-tag-pts { font-size: 10.5px; font-weight: 700; }
.fd-root-league {
  font-family: 'Inter', sans-serif;
  font-size: 7.5px;
  font-weight: 700;
  letter-spacing: 0.3px;
  color: #F5F3EC;
  padding: 1px 4px;
}

.fd-root-conflict-block { margin-bottom: 10px; }
.fd-root-conflict-entry .fd-root-name { margin-bottom: 4px; display: block; }
`;

// ---------- Mock unified data ----------
const PLATFORM_LABEL = { sleeper: "SLEEPER", espn: "ESPN", yahoo: "YAHOO" };

const rawLeagues = [
  {
    id: "l1",
    platform: "sleeper",
    name: "Gridiron Gurus",
    week: 2,
    you: {
      team: "Marsh Motors",
      record: "1-0",
      total: 84.2,
      starters: [
        { pos: "QB", name: "J. Allen", pts: 24.6, status: "live" },
        { pos: "RB", name: "B. Robinson", pts: 11.2, status: "live" },
        { pos: "RB", name: "D. Henry", pts: 18.4, status: "final" },
        { pos: "WR", name: "A. St. Brown", pts: 9.8, status: "live" },
        { pos: "WR", name: "D. London", pts: 6.1, status: "live" },
        { pos: "TE", name: "T. Kelce", pts: 7.4, status: "final" },
        { pos: "FLX", realPos: "WR", name: "R. Odunze", pts: 4.9, status: "live" },
      ],
      bench: [
        { pos: "RB", name: "A. Jones", pts: 6.2, status: "live" },
        { pos: "WR", name: "K. Coleman", pts: 0.0, status: "pre" },
        { pos: "QB", name: "W. Levis", pts: 0.0, status: "pre" },
        { pos: "RB", name: "D. Achane", pts: 3.5, status: "live" },
        { pos: "TE", name: "T. McBride", pts: 2.0, status: "pre" },
      ],
    },
    opp: {
      team: "The Blitzkriegs",
      record: "0-1",
      total: 79.8,
      starters: [
        { pos: "QB", name: "L. Jackson", pts: 19.3, status: "final" },
        { pos: "RB", name: "S. Barkley", pts: 22.0, status: "final" },
        { pos: "RB", name: "J. Cook", pts: 8.7, status: "live" },
        { pos: "WR", name: "G. Wilson", pts: 12.1, status: "live" },
        { pos: "WR", name: "C. Lamb", pts: 5.5, status: "live" },
        { pos: "TE", name: "S. LaPorta", pts: 6.0, status: "live" },
        { pos: "FLX", realPos: "RB", name: "J. Jacobs", pts: 0.0, status: "pre" },
      ],
      bench: [
        { pos: "RB", name: "Z. Charbonnet", pts: 3.4, status: "live" },
        { pos: "WR", name: "J. Palmer", pts: 2.1, status: "final" },
        { pos: "TE", name: "C. Otton", pts: 0.0, status: "pre" },
        { pos: "RB", name: "J. Warren", pts: 2.0, status: "live" },
        { pos: "WR", name: "C. Sutton", pts: 5.0, status: "final" },
      ],
    },
  },
  {
    id: "l2",
    platform: "espn",
    name: "Office League",
    week: 2,
    you: {
      team: "Marsh's Marauders",
      record: "2-0",
      total: 102.6,
      starters: [
        { pos: "QB", name: "P. Mahomes", pts: 21.8, status: "final" },
        { pos: "RB", name: "C. McCaffrey", pts: 26.4, status: "final" },
        { pos: "RB", name: "K. Walker", pts: 9.1, status: "live" },
        { pos: "WR", name: "T. Hill", pts: 14.2, status: "live" },
        { pos: "WR", name: "R. Odunze", pts: 10.9, status: "live" },
        { pos: "TE", name: "M. Andrews", pts: 8.3, status: "live" },
        { pos: "FLX", realPos: "WR", name: "J. Meyers", pts: 5.6, status: "final" },
        { pos: "K", name: "J. Bates", pts: 8.0, status: "final" },
        { pos: "DST", name: "49ers D/ST", pts: 6.3, status: "final" },
      ],
      bench: [
        { pos: "RB", name: "T. Pollard", pts: 4.0, status: "final" },
        { pos: "WR", name: "R. Rice", pts: 0.0, status: "pre" },
        { pos: "QB", name: "B. Purdy", pts: 0.0, status: "pre" },
        { pos: "K", name: "J. Sanders", pts: 6.0, status: "final" },
        { pos: "TE", name: "D. Kincaid", pts: 3.0, status: "live" },
      ],
    },
    opp: {
      team: "Cubicle Crushers",
      record: "0-2",
      total: 95.1,
      starters: [
        { pos: "QB", name: "J. Burrow", pts: 18.9, status: "final" },
        { pos: "RB", name: "J. Gibbs", pts: 15.7, status: "live" },
        { pos: "RB", name: "A. Jones", pts: 7.8, status: "live" },
        { pos: "WR", name: "J. Chase", pts: 20.1, status: "final" },
        { pos: "WR", name: "D. Adams", pts: 9.4, status: "live" },
        { pos: "TE", name: "D. Njoku", pts: 5.2, status: "live" },
        { pos: "FLX", realPos: "RB", name: "R. Stevenson", pts: 0.0, status: "pre" },
        { pos: "K", name: "B. McManus", pts: 7.0, status: "final" },
        { pos: "DST", name: "Bills D/ST", pts: 10.0, status: "final" },
      ],
      bench: [
        { pos: "RB", name: "Z. Charbonnet", pts: 3.0, status: "live" },
        { pos: "WR", name: "D. Johnson", pts: 4.5, status: "final" },
        { pos: "TE", name: "T. Higbee", pts: 0.0, status: "pre" },
        { pos: "K", name: "Y. Koo", pts: 7.0, status: "final" },
        { pos: "WR", name: "K. Allen", pts: 4.0, status: "live" },
      ],
    },
  },
  {
    id: "l3",
    platform: "yahoo",
    name: "Dynasty Warriors",
    week: 2,
    you: {
      team: "Marsh Madness",
      record: "1-1",
      total: 61.0,
      starters: [
        { pos: "QB", name: "C. Stroud", pts: 15.2, status: "final" },
        { pos: "RB", name: "T. Etienne", pts: 6.4, status: "live" },
        { pos: "RB", name: "N. Harris", pts: 4.8, status: "live" },
        { pos: "WR", name: "R. Odunze", pts: 8.9, status: "live" },
        { pos: "WR", name: "C. Ridley", pts: 0.0, status: "pre" },
        { pos: "WR", name: "J. Jefferson", pts: 12.0, status: "final" },
        { pos: "TE", name: "E. Engram", pts: 5.5, status: "final" },
        { pos: "FLX", realPos: "WR", name: "T. Higgins", pts: 9.1, status: "live" },
      ],
      bench: [
        { pos: "RB", name: "J. Ford", pts: 2.0, status: "final" },
        { pos: "WR", name: "R. Shaheed", pts: 0.0, status: "pre" },
        { pos: "QB", name: "S. Darnold", pts: 0.0, status: "pre" },
        { pos: "RB", name: "C. Brooks", pts: 3.0, status: "live" },
        { pos: "RB", name: "E. Mitchell", pts: 1.5, status: "pre" },
        { pos: "WR", name: "M. Evans", pts: 6.0, status: "final" },
        { pos: "WR", name: "D. Hopkins", pts: 4.0, status: "live" },
        { pos: "TE", name: "Z. Ertz", pts: 2.5, status: "live" },
        { pos: "QB", name: "D. Prescott", pts: 0.0, status: "pre" },
        { pos: "WR", name: "L. McConkey", pts: 3.5, status: "final" },
      ],
    },
    opp: {
      team: "Endzone Enforcers",
      record: "1-1",
      total: 70.2,
      starters: [
        { pos: "QB", name: "T. Lawrence", pts: 12.8, status: "final" },
        { pos: "RB", name: "J. Mixon", pts: 13.4, status: "final" },
        { pos: "RB", name: "A. Kamara", pts: 7.7, status: "live" },
        { pos: "WR", name: "A. St. Brown", pts: 6.2, status: "live" },
        { pos: "WR", name: "T. McLaurin", pts: 11.0, status: "final" },
        { pos: "WR", name: "B. Thomas", pts: 7.0, status: "live" },
        { pos: "TE", name: "D. Goedert", pts: 4.4, status: "live" },
        { pos: "FLX", realPos: "RB", name: "R. White", pts: 9.7, status: "final" },
      ],
      bench: [
        { pos: "RB", name: "K. Hunt", pts: 5.0, status: "final" },
        { pos: "WR", name: "J. Addison", pts: 3.3, status: "live" },
        { pos: "TE", name: "L. Musgrave", pts: 0.0, status: "pre" },
        { pos: "RB", name: "R. Mostert", pts: 2.0, status: "final" },
        { pos: "RB", name: "C. Akers", pts: 1.0, status: "pre" },
        { pos: "WR", name: "T. Diggs", pts: 3.0, status: "live" },
        { pos: "WR", name: "R. Pearsall", pts: 2.0, status: "live" },
        { pos: "TE", name: "H. Henry", pts: 3.0, status: "final" },
        { pos: "QB", name: "G. Smith", pts: 0.0, status: "pre" },
        { pos: "WR", name: "X. Worthy", pts: 4.0, status: "live" },
      ],
    },
  },
  {
    id: "l4",
    platform: "sleeper",
    name: "Friends & Family",
    week: 2,
    you: {
      team: "Marsh Attack",
      total: 77.4,
      record: "1-1",
      starters: [
        { pos: "QB", name: "J. Goff", pts: 17.6, status: "live" },
        { pos: "RB", name: "D. Henry", pts: 5.9, status: "live" },
        { pos: "RB", name: "J. Conner", pts: 10.2, status: "final" },
        { pos: "WR", name: "A. Brown", pts: 13.1, status: "final" },
        { pos: "WR", name: "D. Samuel", pts: 6.6, status: "live" },
        { pos: "TE", name: "K. Pitts", pts: 3.0, status: "live" },
        { pos: "FLX", realPos: "RB", name: "Z. Charbonnet", pts: 0.0, status: "pre" },
        { pos: "K", name: "H. Butker", pts: 8.0, status: "final" },
        { pos: "DST", name: "Steelers D/ST", pts: 14.0, status: "final" },
      ],
      bench: [
        { pos: "RB", name: "A. Ekeler", pts: 4.5, status: "live" },
        { pos: "WR", name: "R. Rice", pts: 0.0, status: "pre" },
        { pos: "TE", name: "N. Fant", pts: 0.0, status: "pre" },
        { pos: "K", name: "W. Lutz", pts: 5.0, status: "final" },
        { pos: "RB", name: "D. Pierce", pts: 2.0, status: "pre" },
        { pos: "WR", name: "J. Reed", pts: 3.0, status: "live" },
      ],
    },
    opp: {
      team: "Waiver Wire Wizards",
      record: "2-0",
      total: 60.0,
      starters: [
        { pos: "QB", name: "K. Murray", pts: 14.0, status: "final" },
        { pos: "RB", name: "R. Stevenson", pts: 8.0, status: "live" },
        { pos: "RB", name: "A. Ekeler", pts: 4.5, status: "live" },
        { pos: "WR", name: "D. Moore", pts: 9.9, status: "final" },
        { pos: "WR", name: "J. Downs", pts: 0.0, status: "pre" },
        { pos: "TE", name: "T. Kelce", pts: 5.0, status: "live" },
        { pos: "FLX", realPos: "RB", name: "T. Allgeier", pts: 6.0, status: "final" },
        { pos: "K", name: "B. Aubrey", pts: 5.0, status: "final" },
        { pos: "DST", name: "Broncos D/ST", pts: 9.0, status: "final" },
      ],
      bench: [
        { pos: "RB", name: "K. Vidal", pts: 1.0, status: "final" },
        { pos: "WR", name: "J. Palmer", pts: 2.1, status: "final" },
        { pos: "TE", name: "I. Likely", pts: 0.0, status: "pre" },
        { pos: "K", name: "D. Carlson", pts: 6.0, status: "final" },
        { pos: "WR", name: "M. Pittman", pts: 3.0, status: "live" },
        { pos: "TE", name: "C. Kmet", pts: 2.0, status: "pre" },
      ],
    },
  },
];

// Attach a deterministic mock "projection" to every player so points can be colored
// green (outperforming) / red (underperforming) once they've started playing.
// Real data would pull this straight from each platform's projected-points field.
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function addProjections(list) {
  return list.map((p) => {
    const delta = ((hashStr(p.name) % 9) - 4) * 0.9; // spread of roughly -3.6 to +3.6
    const proj = Math.max(0.5, +(p.pts - delta).toFixed(1));
    return { ...p, proj };
  });
}
const leagues = rawLeagues.map((l) => ({
  ...l,
  you: { ...l.you, starters: addProjections(l.you.starters), bench: addProjections(l.you.bench) },
  opp: { ...l.opp, starters: addProjections(l.opp.starters), bench: addProjections(l.opp.bench) },
}));

// ---------- Building blocks ----------

// A real weekly NFL schedule (mock) so every player's team maps to one consistent
// game - real data would come from each platform's schedule/live-scoring feed.
const GAMES = [
  { id: "g1", away: "NYJ", home: "BUF", slot: "thu", slotLabel: "Thursday", kickoff: "Thu 8:15 PM ET", date: "9/11", timeShort: "8:15" },
  { id: "g2", away: "CIN", home: "MIA", slot: "sunEarly", slotLabel: "Sunday Early", kickoff: "Sun 1:00 PM ET", date: "9/14", timeShort: "1:00" },
  { id: "g3", away: "BAL", home: "KC", slot: "sunEarly", slotLabel: "Sunday Early", kickoff: "Sun 1:00 PM ET", date: "9/14", timeShort: "1:00" },
  { id: "g4", away: "PHI", home: "DAL", slot: "sunEarly", slotLabel: "Sunday Early", kickoff: "Sun 1:00 PM ET", date: "9/14", timeShort: "1:00" },
  { id: "g5", away: "CLE", home: "PIT", slot: "sunEarly", slotLabel: "Sunday Early", kickoff: "Sun 1:00 PM ET", date: "9/14", timeShort: "1:00" },
  { id: "g6", away: "SEA", home: "SF", slot: "sunLate", slotLabel: "Sunday Afternoon", kickoff: "Sun 4:25 PM ET", date: "9/14", timeShort: "4:25" },
  { id: "g7", away: "MIN", home: "GB", slot: "sunLate", slotLabel: "Sunday Afternoon", kickoff: "Sun 4:05 PM ET", date: "9/14", timeShort: "4:05" },
  { id: "g8", away: "LAR", home: "DET", slot: "sunLate", slotLabel: "Sunday Afternoon", kickoff: "Sun 4:25 PM ET", date: "9/14", timeShort: "4:25" },
  { id: "g9", away: "LAC", home: "NE", slot: "sunNight", slotLabel: "Sunday Night", kickoff: "Sun 8:20 PM ET", date: "9/14", timeShort: "8:20" },
  { id: "g10", away: "JAX", home: "HOU", slot: "mon", slotLabel: "Monday Night", kickoff: "Mon 8:15 PM ET", date: "9/15", timeShort: "8:15" },
];
const SLOTS = [
  { id: "thu", label: "Thursday" },
  { id: "sunEarly", label: "Sunday Early" },
  { id: "sunLate", label: "Sunday Afternoon" },
  { id: "sunNight", label: "Sunday Night" },
  { id: "mon", label: "Monday Night" },
];

const TEAM_INFO = {};
GAMES.forEach((g) => {
  TEAM_INFO[g.home] = { opp: g.away, game: g };
  TEAM_INFO[g.away] = { opp: g.home, game: g };
});
const NFL_TEAMS = Object.keys(TEAM_INFO);

// Fallback for any real NFL team not in our small mock schedule above (real
// rosters cover all 32 teams, our mock schedule only covers 20 fake-mapped
// ones). Keeps the app from crashing on real data; the schedule/opponent
// info here is still a placeholder until real NFL schedule data is wired in.
const UNKNOWN_GAME = {
  id: "unknown",
  home: "?",
  away: "?",
  slot: "unknown",
  slotLabel: "Schedule TBD",
  kickoff: "TBD",
  date: "-",
  timeShort: "-",
};
function getTeamInfo(team) {
  return TEAM_INFO[team] || { opp: "?", game: UNKNOWN_GAME };
}

// Real data (from Sleeper etc.) carries the player's actual NFL team on
// p.team - use that when present. Mock data has no such field, so it falls
// back to a deterministic fake assignment for demo purposes only.
function getPlayerTeam(p) {
  if (p.team) return p.team;
  return NFL_TEAMS[hashStr(p.name) % NFL_TEAMS.length];
}

function getPtsClass(p) {
  if (p.status === "pre") return "fd-pts-pre";
  if (p.pts > p.proj) return "fd-pts-over";
  if (p.pts < p.proj) return "fd-pts-under";
  return "fd-pts-even";
}

// Reshapes a player for a non-current week. Past weeks show as final (using the
// same mock numbers as a stand-in for "historical" data). Future weeks haven't
// been played, so they show as pre-game with projected points instead of live
// ones. Real data would swap in that week's actual box score / schedule / matchup
// projection instead of reusing week 2's numbers.
function transformPlayerForWeek(p, week) {
  if (week === CURRENT_WEEK) return p;
  if (week < CURRENT_WEEK) return { ...p, status: "final" };
  return { ...p, status: "pre", pts: p.proj };
}

function applyWeekView(team, week) {
  const starters = team.starters.map((p) => transformPlayerForWeek(p, week));
  const bench = team.bench.map((p) => transformPlayerForWeek(p, week));
  const total = week === CURRENT_WEEK ? team.total : +starters.reduce((s, p) => s + p.pts, 0).toFixed(1);
  return { ...team, starters, bench, total };
}

// Deterministic mock game context - real data would pull live score/clock straight
// from each platform's live scoring feed instead of being derived like this.
function mockGame(p) {
  const team = getPlayerTeam(p);
  const { opp, game } = getTeamInfo(team);
  const seasonAvg = Math.max(0, +(p.proj + (((hashStr(p.name) % 7) - 3) * 0.5)).toFixed(1));
  const lastWeek = Math.max(0, +(p.proj + ((((hashStr(p.name) >> 2) % 9) - 4) * 0.7)).toFixed(1));
  // score/clock derived from the GAME, not the player, so every player sharing a
  // game sees the same live state
  const gh = hashStr(game.id);
  const quarter = 1 + (gh % 4);
  const clock = `${(gh >> 5) % 15}:${String((gh >> 2) % 60).padStart(2, "0")}`;
  const homeScore = 3 * (gh % 8);
  const awayScore = 3 * ((gh >> 3) % 8);
  const teamScore = team === game.home ? homeScore : awayScore;
  const oppScore = team === game.home ? awayScore : homeScore;
  return { team, opp, seasonAvg, lastWeek, kickoff: game.kickoff, quarter, clock, teamScore, oppScore, game };
}

// One-line matchup summary shown under a player's name on the Scoreboard.
function gameLine(p) {
  const g = mockGame(p);
  if (p.status === "pre") {
    return `${g.team} vs. ${g.opp}  ${g.game.date} ${g.game.timeShort} EDT`;
  }
  if (p.status === "live") {
    return `${g.team} ${g.teamScore} - ${g.opp} ${g.oppScore}  ${g.quarter}Q ${g.clock}`;
  }
  return `${g.team} ${g.teamScore} - ${g.opp} ${g.oppScore}  FINAL`;
}

function StarterRow({ p, onSelect, showGame }) {
  const ptsClass = getPtsClass(p);
  return (
    <div className={`fd-row ${showGame ? "fd-row-tall" : ""}`} onClick={() => onSelect(p)}>
      <span className="fd-pos fd-body">{p.pos}</span>
      <span className="fd-name fd-body">{p.name}</span>
      <span className={`fd-pts fd-body ${ptsClass}`}>{p.pts.toFixed(1)}</span>
      {showGame && <span className="fd-row-game fd-body">{gameLine(p)}</span>}
    </div>
  );
}

function computeProjectedTotal(team) {
  return team.starters.reduce((sum, p) => sum + p.proj, 0);
}

function TeamCard({ team, isYou, isWinning, isProjWinning, onSelectPlayer, gridColumn, gridRow, showProjected }) {
  const [benchOpen, setBenchOpen] = useState(false);
  const projectedTotal = computeProjectedTotal(team);
  return (
    <div
      className={`fd-card ${isYou ? "fd-card-you" : ""}`}
      style={{ backgroundColor: isYou ? C.panelAlt : C.panel, gridColumn, gridRow }}
    >
      <div className="fd-team-name fd-display">{team.team}</div>
      <div className="fd-score-row">
        <span className="fd-score fd-display" style={{ color: isWinning ? C.gold : C.white }}>
          {team.total.toFixed(1)}
        </span>
        {showProjected && (
          <span className="fd-proj-inline fd-body">
            <span className="fd-proj-label">Proj</span>{" "}
            <span
              className="fd-proj-value fd-display"
              style={{ color: isProjWinning ? C.gold : C.grey }}
            >
              {projectedTotal.toFixed(1)}
            </span>
          </span>
        )}
      </div>
      <div>
        {team.starters.map((p, i) => (
          <StarterRow key={i} p={p} onSelect={onSelectPlayer} showGame />
        ))}
      </div>
      <button className="fd-bench-toggle fd-body" onClick={() => setBenchOpen((v) => !v)}>
        {benchOpen ? "COLLAPSE" : `BENCH (${team.bench.length})`}
      </button>

      {benchOpen && (
        <div className="fd-bench-dropdown">
          <div className="fd-bench-head">
            <span className="fd-bench-title fd-display">{team.team} · Bench</span>
            <button className="fd-bench-close fd-body" onClick={() => setBenchOpen(false)}>
              ×
            </button>
          </div>
          <div>
            {team.bench.map((p, i) => (
              <StarterRow key={i} p={p} onSelect={onSelectPlayer} showGame />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Renders 5 flat grid items (border box + colhead + you-card + vs + opp-card),
// all explicitly placed in this league's column, across 4 SHARED grid rows.
// Because the rows are shared across all 4 leagues, row 2 (you-card) auto-sizes
// to the tallest one, and row 3/4 (vs, opponent) then start at the same Y for
// every league automatically - no JS, no manual spacer.
function LeagueColumn({ league, onSelectPlayer, colIndex, showProjected }) {
  const youWinning = league.you.total > league.opp.total;
  const oppWinning = league.opp.total > league.you.total;
  const youProj = computeProjectedTotal(league.you);
  const oppProj = computeProjectedTotal(league.opp);
  const youProjWinning = youProj > oppProj;
  const oppProjWinning = oppProj > youProj;
  const col = colIndex + 1;
  return (
    <React.Fragment>
      <div className="fd-league-box" style={{ gridColumn: col, gridRow: "1 / span 4" }} />
      <div className="fd-col-head" style={{ gridColumn: col, gridRow: 1 }}>
        <span
          className="fd-plat-tag"
          style={{ backgroundColor: PLATFORM_COLORS[league.platform] }}
        >
          {PLATFORM_LABEL[league.platform]}
        </span>
        <span className="fd-league-name">{league.name}</span>
      </div>
      <TeamCard
        team={league.you}
        isYou
        isWinning={youWinning}
        isProjWinning={youProjWinning}
        onSelectPlayer={onSelectPlayer}
        gridColumn={col}
        gridRow={2}
        showProjected={showProjected}
      />
      <div className="fd-vs" style={{ gridColumn: col, gridRow: 3 }}>
        <div className="fd-vs-line" />
        <span className="fd-vs-label fd-display">VS</span>
        <div className="fd-vs-line" />
      </div>
      <TeamCard
        team={league.opp}
        isYou={false}
        isWinning={oppWinning}
        isProjWinning={oppProjWinning}
        onSelectPlayer={onSelectPlayer}
        gridColumn={col}
        gridRow={4}
        showProjected={showProjected}
      />
    </React.Fragment>
  );
}

// Deterministic mock box score - the actual stats that make up the fantasy points.
// Real data would pull this from each platform's boxscore/player-stats endpoint.
function mockBoxScore(p) {
  const cat = p.realPos || p.pos;
  const h = hashStr(p.name);
  const scale = Math.max(p.pts, p.proj, 1);
  if (cat === "QB") {
    return [
      { label: "PASS YDS", value: Math.round(scale * 9 + (h % 40)) },
      { label: "PASS TD", value: scale > 15 ? 1 + (h % 2) : h % 2 },
      { label: "INT", value: h % 5 === 0 ? 1 : 0 },
      { label: "RUSH YDS", value: (h >> 3) % 28 },
    ];
  }
  if (cat === "RB") {
    return [
      { label: "RUSH YDS", value: Math.round(scale * 6 + (h % 25)) },
      { label: "RUSH TD", value: h % 3 === 0 ? 1 : 0 },
      { label: "REC", value: h % 6 },
      { label: "REC YDS", value: (h >> 2) % 35 },
    ];
  }
  if (cat === "WR" || cat === "TE") {
    const rec = Math.max(1, h % 9);
    return [
      { label: "REC", value: rec },
      { label: "REC YDS", value: Math.round(scale * 7 + (h % 30)) },
      { label: "REC TD", value: h % 4 === 0 ? 1 : 0 },
      { label: "TARGETS", value: rec + (h % 4) },
    ];
  }
  if (cat === "K") {
    const fgMade = h % 4;
    return [
      { label: "FG MADE", value: `${fgMade}/${fgMade + (h % 2)}` },
      { label: "XP MADE", value: h % 5 },
    ];
  }
  if (cat === "DST") {
    return [
      { label: "SACKS", value: h % 5 },
      { label: "INT", value: h % 3 },
      { label: "FUM REC", value: h % 2 },
      { label: "PTS ALLOWED", value: h % 28 },
    ];
  }
  return [];
}

function GameStrip({ player, game }) {
  if (player.status === "pre") {
    return (
      <div className="fd-modal-game">
        <span className="fd-modal-game-score fd-display">
          {game.team} <span style={{ color: C.grey }}>at</span> {game.opp}
        </span>
        <span className="fd-modal-game-time fd-body">{game.kickoff}</span>
      </div>
    );
  }
  if (player.status === "live") {
    return (
      <div className="fd-modal-game">
        <span className="fd-modal-game-score fd-display">
          {game.team} {game.teamScore} – {game.opp} {game.oppScore}
        </span>
        <span className="fd-modal-game-time fd-body live">
          <span
            style={{
              display: "inline-block",
              width: 5,
              height: 5,
              borderRadius: "50%",
              backgroundColor: C.green,
            }}
          />
          Q{game.quarter} {game.clock}
        </span>
      </div>
    );
  }
  return (
    <div className="fd-modal-game">
      <span className="fd-modal-game-score fd-display">
        {game.team} {game.teamScore} – {game.opp} {game.oppScore}
      </span>
      <span className="fd-modal-game-time fd-body">FINAL</span>
    </div>
  );
}

function PlayerModal({ player, onClose }) {
  if (!player) return null;
  const game = mockGame(player);
  const boxScore = mockBoxScore(player);
  const ptsClass = getPtsClass(player);
  return (
    <div className="fd-modal-backdrop" onClick={onClose}>
      <div className="fd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fd-modal-head">
          <div>
            <div className="fd-modal-pos fd-body">
              {player.realPos || player.pos} · {game.team}
            </div>
            <div className="fd-modal-name fd-display">{player.name}</div>
          </div>
          <button className="fd-bench-close fd-body" onClick={onClose}>
            ×
          </button>
        </div>

        <GameStrip player={player} game={game} />

        <div className="fd-modal-score-row">
          <div>
            <span className="fd-modal-label fd-body">POINTS</span>
            <span className={`fd-modal-pts fd-display ${ptsClass}`}>{player.pts.toFixed(1)}</span>
          </div>
          <div>
            <span className="fd-modal-label fd-body">PROJECTED</span>
            <span className="fd-modal-pts fd-display" style={{ color: C.grey }}>
              {player.proj.toFixed(1)}
            </span>
          </div>
        </div>

        {boxScore.length > 0 && (
          <>
            <div className="fd-modal-section-label fd-body">THIS WEEK</div>
            <div className="fd-modal-grid" style={{ marginBottom: 14 }}>
              {boxScore.map((s) => (
                <div key={s.label}>
                  <span className="fd-modal-label fd-body">{s.label}</span>
                  <span className="fd-modal-val fd-body">{s.value}</span>
                </div>
              ))}
            </div>
            <div className="fd-modal-divider" />
          </>
        )}

        <div className="fd-modal-grid">
          <div>
            <span className="fd-modal-label fd-body">SEASON AVG</span>
            <span className="fd-modal-val fd-body">{game.seasonAvg.toFixed(1)}</span>
          </div>
          <div>
            <span className="fd-modal-label fd-body">LAST WEEK</span>
            <span className="fd-modal-val fd-body">{game.lastWeek.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Help Me Root ----------

// Builds the FOR / AGAINST / CONFLICT breakdown for a given set of game ids.
// This is about the actual PLAYER, not the NFL team they play for:
//   FOR       = a player who is a starter on at least one of your rosters, and is
//               NOT a starter on any opponent's roster.
//   CONFLICT  = a player who is a starter on at least one of your rosters AND is
//               also a starter on at least one opponent's roster (you own them
//               somewhere and are facing them somewhere else).
//   AGAINST   = a player who isn't a starter on any of your rosters, but is a
//               starter on at least one opponent's roster.
// Only starters count on both sides.
function buildRootingGuide(scopeGameIds, leaguesData) {
  const scope = new Set(scopeGameIds);
  const yourMap = {};
  const oppMap = {};

  function inScope(p) {
    const team = getPlayerTeam(p);
    return scope.has(getTeamInfo(team).game.id) ? team : null;
  }

  leaguesData.forEach((l) => {
    l.you.starters.forEach((p) => {
      const team = inScope(p);
      if (!team) return;
      (yourMap[p.name] = yourMap[p.name] || []).push({ ...p, team, league: l });
    });
    l.opp.starters.forEach((p) => {
      const team = inScope(p);
      if (!team) return;
      (oppMap[p.name] = oppMap[p.name] || []).push({ ...p, team, league: l });
    });
  });

  const allNames = new Set([...Object.keys(yourMap), ...Object.keys(oppMap)]);
  const forOnly = [];
  const againstOnly = [];
  const conflicts = [];

  allNames.forEach((name) => {
    const yours = yourMap[name];
    const opps = oppMap[name];
    if (yours && opps) {
      conflicts.push({ name, yourEntries: yours, oppEntries: opps });
    } else if (yours) {
      forOnly.push({ name, entries: yours });
    } else if (opps) {
      againstOnly.push({ name, entries: opps });
    }
  });

  return { forOnly, againstOnly, conflicts };
}

function RootRow({ group, tone }) {
  const first = group.entries[0];
  return (
    <div className="fd-root-row">
      <span className="fd-root-dot" style={{ backgroundColor: tone === "for" ? C.green : C.red }} />
      <span className="fd-root-name fd-body">
        {first.pos} · {first.name} <span style={{ color: C.grey }}>({first.team})</span>
      </span>
      {group.entries.map((e, i) => (
        <span key={i} className="fd-root-tag">
          <span
            className="fd-root-league"
            style={{ backgroundColor: PLATFORM_COLORS[e.league.platform] }}
          >
            {e.league.name}
          </span>
          <span className={`fd-root-tag-pts fd-body ${getPtsClass(e)}`}>{e.pts.toFixed(1)}</span>
        </span>
      ))}
    </div>
  );
}

function ConflictEntry({ c }) {
  return (
    <div className="fd-root-conflict-entry">
      <div className="fd-root-name fd-body">
        {c.yourEntries[0].pos} · {c.name}{" "}
        <span style={{ color: C.grey }}>({c.yourEntries[0].team})</span>
      </div>
      <div className="fd-root-tags">
        {c.yourEntries.map((p, i) => (
          <span key={`y${i}`} className="fd-root-tag">
            <span className="fd-root-tag-label fd-body" style={{ color: C.green }}>FOR</span>
            <span className="fd-root-dot" style={{ backgroundColor: C.green }} />
            <span
              className="fd-root-league"
              style={{ backgroundColor: PLATFORM_COLORS[p.league.platform] }}
            >
              {p.league.name}
            </span>
            <span className={`fd-root-tag-pts fd-body ${getPtsClass(p)}`}>{p.pts.toFixed(1)}</span>
          </span>
        ))}
        {c.oppEntries.map((p, i) => (
          <span key={`o${i}`} className="fd-root-tag">
            <span className="fd-root-tag-label fd-body" style={{ color: C.red }}>AGAINST</span>
            <span className="fd-root-dot" style={{ backgroundColor: C.red }} />
            <span
              className="fd-root-league"
              style={{ backgroundColor: PLATFORM_COLORS[p.league.platform] }}
            >
              {p.league.name}
            </span>
            <span className={`fd-root-tag-pts fd-body ${getPtsClass(p)}`}>{p.pts.toFixed(1)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function HelpMeRootScreen({ leaguesData }) {
  const [mode, setMode] = useState("games"); // 'games' | 'slot'
  const [selectedGames, setSelectedGames] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const scopeGameIds =
    mode === "slot" ? GAMES.filter((g) => g.slot === selectedSlot).map((g) => g.id) : selectedGames;

  const guide = scopeGameIds.length > 0 ? buildRootingGuide(scopeGameIds, leaguesData) : null;

  function toggleGame(id) {
    setSelectedGames((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  const allSelected = selectedGames.length === GAMES.length;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "14px 14px 30px" }}>
      <div className="fd-root-mode-row">
        {[
          { id: "games", label: "GAMES" },
          { id: "slot", label: "DAY / TIMESLOT" },
        ].map((m) => (
          <button
            key={m.id}
            className={`fd-root-mode-btn fd-body ${mode === m.id ? "active" : ""}`}
            onClick={() => {
              setMode(m.id);
              setSelectedGames([]);
              setSelectedSlot(null);
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "slot" && (
        <div className="fd-root-picker">
          {SLOTS.map((s) => (
            <button
              key={s.id}
              className={`fd-root-pick-btn fd-root-pick-btn-slot ${selectedSlot === s.id ? "active" : ""}`}
              onClick={() => setSelectedSlot(s.id)}
            >
              <span className="fd-root-pick-matchup fd-display">{s.label}</span>
            </button>
          ))}
        </div>
      )}

      {mode === "games" && (
        <div className="fd-root-picker fd-root-picker-games">
          <button
            className={`fd-root-pick-btn fd-root-pick-btn-game fd-root-pick-btn-all ${allSelected ? "active" : ""}`}
            onClick={() => setSelectedGames(allSelected ? [] : GAMES.map((g) => g.id))}
          >
            <span className="fd-root-pick-matchup fd-display">ALL</span>
            <span className="fd-root-pick-slot">Every game</span>
          </button>
          {GAMES.map((g) => (
            <button
              key={g.id}
              className={`fd-root-pick-btn fd-root-pick-btn-game ${selectedGames.includes(g.id) ? "active" : ""}`}
              onClick={() => toggleGame(g.id)}
            >
              <span className="fd-root-pick-matchup fd-display">
                {g.away} @ {g.home}
              </span>
              <span className="fd-root-pick-slot">{g.slotLabel}</span>
            </button>
          ))}
        </div>
      )}

      {guide && (
        <div className="fd-root-results">
          <div className="fd-root-col">
            <div className="fd-root-col-head" style={{ color: C.green }}>
              ROOTING FOR
            </div>
            {guide.forOnly.length === 0 && <div className="fd-root-empty fd-body">Nothing here</div>}
            {guide.forOnly.map((g, i) => (
              <RootRow key={i} group={g} tone="for" />
            ))}
          </div>

          <div className="fd-root-col fd-root-col-conflict">
            <div className="fd-root-col-head" style={{ color: C.gold }}>
              CONFLICTS
            </div>
            {guide.conflicts.length === 0 && <div className="fd-root-empty fd-body">None</div>}
            {guide.conflicts.map((c) => (
              <div key={c.name} className="fd-root-conflict-block">
                <ConflictEntry c={c} />
              </div>
            ))}
          </div>

          <div className="fd-root-col">
            <div className="fd-root-col-head" style={{ color: C.red }}>
              ROOTING AGAINST
            </div>
            {guide.againstOnly.length === 0 && (
              <div className="fd-root-empty fd-body">Nothing here</div>
            )}
            {guide.againstOnly.map((g, i) => (
              <RootRow key={i} group={g} tone="against" />
            ))}
          </div>
        </div>
      )}

      {!guide && (
        <div className="fd-root-empty fd-body" style={{ marginTop: 16 }}>
          Pick {mode === "slot" ? "a timeslot" : "one or more games"} to see your rooting guide.
        </div>
      )}
    </div>
  );
}

// ---------- Reorder list (drag to set Scoreboard order) ----------

const REORDER_ROW_H = 40;

function ReorderRow({ league, index, dragState, onPointerDown, onRemove }) {
  const isDragging = dragState.id === league.id;
  return (
    <div
      className={`fd-reorder-row ${isDragging ? "dragging" : ""}`}
      style={isDragging ? { transform: `translateY(${dragState.dy}px)` } : undefined}
      onPointerDown={(e) => onPointerDown(e, league.id, index)}
    >
      <GripVertical size={14} color={C.grey} style={{ flexShrink: 0 }} />
      <span className="fd-plat-tag" style={{ backgroundColor: PLATFORM_COLORS[league.platform] }}>
        {PLATFORM_LABEL[league.platform]}
      </span>
      <span className="fd-reorder-name fd-body">{league.name}</span>
      <button
        className="fd-reorder-remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(league.id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={`Remove ${league.name}`}
      >
        <X size={14} />
      </button>
    </div>
  );
}

function ReorderList({ order, leaguesData, onReorder, onRemove }) {
  const [dragState, setDragState] = useState({ id: null, startIndex: 0, dy: 0, startY: 0 });
  const items = order.map((id) => leaguesData.find((l) => l.id === id)).filter(Boolean);

  function handlePointerDown(e, id, index) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragState({ id, startIndex: index, startY: e.clientY, dy: 0 });
  }
  function handlePointerMove(e) {
    if (!dragState.id) return;
    e.preventDefault();
    setDragState((s) => ({ ...s, dy: e.clientY - s.startY }));
  }
  function handlePointerUp() {
    if (!dragState.id) return;
    const rawIndex = dragState.startIndex + Math.round(dragState.dy / REORDER_ROW_H);
    const newIndex = Math.max(0, Math.min(order.length - 1, rawIndex));
    if (newIndex !== dragState.startIndex) {
      const newOrder = [...order];
      const [moved] = newOrder.splice(dragState.startIndex, 1);
      newOrder.splice(newIndex, 0, moved);
      onReorder(newOrder);
    }
    setDragState({ id: null, startIndex: 0, dy: 0, startY: 0 });
  }

  return (
    <div
      className="fd-reorder-list"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {items.length === 0 && (
        <div className="fd-body" style={{ padding: 12, fontSize: 12, color: C.grey }}>
          No leagues left. Add one below.
        </div>
      )}
      {items.map((league, i) => (
        <ReorderRow
          key={league.id}
          league={league}
          index={i}
          dragState={dragState}
          onPointerDown={handlePointerDown}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

// ---------- Setup screen ----------

const PLATFORMS = ["sleeper", "espn", "yahoo"];

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 10px",
  fontSize: 13,
  color: C.white,
  backgroundColor: C.bg,
  border: `1px solid ${C.line}`,
  outline: "none",
};

function LeagueSlot({ index, slot, onChange }) {
  return (
    <div style={{ border: `1px solid ${C.line}`, backgroundColor: C.panel, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span className="fd-display" style={{ fontSize: 12, color: C.red }}>
          LEAGUE {String(index + 1).padStart(2, "0")}
        </span>
        <div style={{ flex: 1, height: 1, backgroundColor: C.line }} />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => onChange({ ...slot, platform: p })}
            className="fd-body"
            style={{
              flex: 1,
              padding: "8px 0",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              color: slot.platform === p ? C.bg : C.grey,
              backgroundColor: slot.platform === p ? C.gold : "transparent",
              border: `1px solid ${slot.platform === p ? C.gold : C.line}`,
              cursor: "pointer",
            }}
          >
            {p.toUpperCase()}
          </button>
        ))}
      </div>

      {slot.platform === "sleeper" && (
        <input className="fd-body" placeholder="Sleeper username or league ID" style={inputStyle} />
      )}
      {slot.platform === "espn" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input className="fd-body" placeholder="League ID" style={inputStyle} />
          <input className="fd-body" placeholder="espn_s2 (private leagues only)" style={inputStyle} />
        </div>
      )}
      {slot.platform === "yahoo" && (
        <button
          className="fd-body"
          style={{
            width: "100%",
            padding: "10px 0",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            color: C.bg,
            backgroundColor: C.white,
            border: "none",
            cursor: "pointer",
          }}
        >
          CONNECT WITH YAHOO
        </button>
      )}
    </div>
  );
}

function SetupScreen({ onGoLive, leagueOrder, onReorderLeagues, leaguesData, onRemoveLeague }) {
  const [slots, setSlots] = useState([
    { platform: "sleeper" },
    { platform: "espn" },
    { platform: "yahoo" },
    { platform: "sleeper" },
  ]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 20px 80px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <button
          onClick={onGoLive}
          className="fd-display"
          style={{
            padding: "8px 18px",
            fontSize: 13,
            color: C.bg,
            backgroundColor: C.red,
            border: "none",
            cursor: "pointer",
          }}
        >
          Go Live
        </button>
      </div>

      <div style={{ marginBottom: 40 }}>
        <div style={{ backgroundColor: C.bg, padding: "4px 0" }}>
          <div className="fd-display" style={{ fontSize: 40, color: C.white, lineHeight: 0.98 }}>
            All Your Leagues,
          </div>
        </div>
        <div style={{ backgroundColor: C.gold, padding: "4px 12px", display: "inline-block", marginTop: 4 }}>
          <div className="fd-display" style={{ fontSize: 40, color: C.bg, lineHeight: 0.98 }}>
            One Scoreboard.
          </div>
        </div>
        <div style={{ borderTop: `4px solid ${C.red}`, marginTop: 20, paddingTop: 12 }}>
          <p className="fd-body" style={{ fontSize: 14, color: C.grey, maxWidth: 480, margin: 0 }}>
            Link up your leagues from Sleeper, ESPN, and Yahoo. We'll pull your
            starters into one live view, updated all game day. Add as many as
            you want, then scroll right on the Scoreboard to see the rest.
          </p>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div className="fd-display" style={{ fontSize: 14, color: C.gold, letterSpacing: 1, marginBottom: 4 }}>
          REORDER
        </div>
        <p className="fd-body" style={{ fontSize: 12, color: C.grey, margin: "0 0 10px" }}>
          Drag to set the order your leagues appear on the Scoreboard.
        </p>
        <ReorderList
          order={leagueOrder}
          leaguesData={leaguesData}
          onReorder={onReorderLeagues}
          onRemove={onRemoveLeague}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {slots.map((slot, i) => (
          <LeagueSlot
            key={i}
            index={i}
            slot={slot}
            onChange={(next) => {
              const copy = [...slots];
              copy[i] = next;
              setSlots(copy);
            }}
          />
        ))}
      </div>

      <button
        onClick={onGoLive}
        className="fd-display"
        style={{
          width: "100%",
          marginTop: 24,
          padding: "16px 0",
          fontSize: 18,
          color: C.bg,
          backgroundColor: C.red,
          border: "none",
          cursor: "pointer",
        }}
      >
        Go Live
      </button>
    </div>
  );
}

// ---------- Live dashboard screen ----------

function LiveScreen({ orderedLeagues, selectedWeek, isRealData }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const isCurrentWeek = selectedWeek === CURRENT_WEEK;

  // Real data for the selected week is already correct as-is, no need to run
  // it through the mock past/future simulation. Only mock data gets that.
  const viewLeagues = React.useMemo(() => {
    if (isRealData) return orderedLeagues;
    return orderedLeagues.map((l) => ({
      ...l,
      you: applyWeekView(l.you, selectedWeek),
      opp: applyWeekView(l.opp, selectedWeek),
    }));
  }, [orderedLeagues, selectedWeek, isRealData]);

  return (
    <div>
      <div
        className="fd-board"
        style={{
          gridTemplateColumns: `repeat(${viewLeagues.length}, minmax(0, 1fr))`,
          // Fewer than 4 leagues: cap the grid's width proportionally and
          // center it, so 2 leagues don't stretch huge or sit stranded on
          // the left. 4 or more: let it use the full width as normal.
          maxWidth: viewLeagues.length < 4 ? `${(viewLeagues.length / 4) * 100}%` : undefined,
          margin: viewLeagues.length < 4 ? "0 auto" : undefined,
        }}
      >
        {viewLeagues.map((l, i) => (
          <LeagueColumn
            key={l.id}
            league={l}
            onSelectPlayer={setSelectedPlayer}
            colIndex={i}
            showProjected={isCurrentWeek}
          />
        ))}
      </div>

      <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
    </div>
  );
}

// ---------- Persistent app header + top-level nav ----------

const CURRENT_WEEK = 1;
const ALL_WEEKS = Array.from({ length: 18 }, (_, i) => i + 1);

function weekBadgeInfo(week) {
  if (week === CURRENT_WEEK) return { label: `LIVE · WK${week}`, color: C.green, dot: true };
  if (week < CURRENT_WEEK) return { label: `FINAL · WK${week}`, color: C.grey, dot: false };
  return { label: `PROJECTED · WK${week}`, color: C.gold, dot: false };
}

function WeekPickerModal({ selectedWeek, onSelect, onClose }) {
  return (
    <div className="fd-modal-backdrop" onClick={onClose}>
      <div className="fd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fd-modal-head">
          <div className="fd-modal-name fd-display">Select Week</div>
          <button className="fd-bench-close fd-body" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="fd-body" style={{ fontSize: 11, color: C.grey, margin: "0 0 12px" }}>
          Past weeks show final scores. Future weeks show projections based on your
          current starters.
        </p>
        <div className="fd-week-grid">
          {ALL_WEEKS.map((w) => {
            const info = weekBadgeInfo(w);
            return (
              <button
                key={w}
                className={`fd-week-btn fd-display ${w === selectedWeek ? "active" : ""}`}
                style={{ color: w === selectedWeek ? C.bg : info.color }}
                onClick={() => {
                  onSelect(w);
                  onClose();
                }}
              >
                {w}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AppHeader({ page, screen, setPage, onGoToScoreboard, onAddLeagues, secondsAgo, onResync, selectedWeek, setSelectedWeek }) {
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const info = weekBadgeInfo(selectedWeek);
  const scoreboardActive = page === "scoreboard" && screen !== "setup";

  return (
    <div className="fd-app-header">
      <div className="fd-brand-row">
        <span className="fd-logo fd-display" style={{ color: C.white }}>
          League'd <span style={{ color: C.gold }}>Up</span>
        </span>
        <span className="fd-sync-group">
          <span className="fd-total fd-body">Synced {secondsAgo}s ago</span>
          <button className="fd-resync-btn" onClick={onResync} aria-label="Resync now">
            <RefreshCw size={11} />
          </button>
        </span>
      </div>
      <div className="fd-topnav">
        <button
          className={`fd-topnav-tab ${scoreboardActive ? "active" : ""}`}
          onClick={onGoToScoreboard}
        >
          Scoreboard
        </button>
        <button
          className={`fd-topnav-tab ${page === "root" ? "active" : ""}`}
          onClick={() => setPage("root")}
        >
          Help Me Root
        </button>
        <button
          className="fd-live-badge fd-body"
          style={{ color: info.color, borderColor: info.color }}
          onClick={() => setWeekPickerOpen(true)}
        >
          {info.dot && (
            <span
              style={{
                display: "inline-block",
                width: 5,
                height: 5,
                borderRadius: "50%",
                backgroundColor: info.color,
              }}
            />
          )}
          {info.label}
        </button>
        <button className="fd-add-leagues-btn fd-body" onClick={onAddLeagues}>
          + Add Leagues
        </button>
      </div>

      {weekPickerOpen && (
        <WeekPickerModal
          selectedWeek={selectedWeek}
          onSelect={setSelectedWeek}
          onClose={() => setWeekPickerOpen(false)}
        />
      )}
    </div>
  );
}

// ---------- Root ----------

// TEMPORARY: hardcoded username until the Add Leagues screen actually saves
// your Sleeper username. Swap this for a real user-entered value once
// that's built.
const SLEEPER_USERNAME = "andrewzoss";

export default function LeaguedUpApp() {
  const [page, setPage] = useState("scoreboard");
  const [screen, setScreen] = useState("live");
  const [selectedWeek, setSelectedWeek] = useState(CURRENT_WEEK);
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Real Sleeper data, fetched once here and shared by the Scoreboard, Help
  // Me Root, and the Add Leagues reorder list, so all three are always
  // looking at the same actual leagues instead of Scoreboard alone.
  const [realLeagues, setRealLeagues] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [removedIds, setRemovedIds] = useState([]);
  const [leagueOrder, setLeagueOrder] = useState(leagues.map((l) => l.id));

  React.useEffect(() => {
    let cancelled = false;
    setRealLeagues(null);
    setLoadError(null);
    fetch(`/api/sleeper/all?username=${SLEEPER_USERNAME}&week=${selectedWeek}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setLoadError(data.error);
        else setRealLeagues(data.leagues);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not reach the Sleeper API route.");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedWeek]);

  const sourceLeagues = realLeagues || leagues; // real once loaded, mock fallback otherwise
  const isRealData = !!realLeagues;
  const activeLeagues = sourceLeagues.filter((l) => !removedIds.includes(l.id));
  const activeIdsKey = activeLeagues.map((l) => l.id).join(",");

  // Keeps leagueOrder in sync whenever the active league set changes (real
  // data arriving, or a league being removed): keeps existing order for ids
  // still present, appends any new ones, drops any that disappeared.
  React.useEffect(() => {
    setLeagueOrder((prevOrder) => {
      const activeIds = activeLeagues.map((l) => l.id);
      const kept = prevOrder.filter((id) => activeIds.includes(id));
      const added = activeIds.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdsKey]);

  const orderedLeagues = leagueOrder
    .map((id) => activeLeagues.find((l) => l.id === id))
    .filter(Boolean);

  React.useEffect(() => {
    const tick = setInterval(() => {
      setSecondsAgo((s) => (s >= 30 ? 0 : s + 1)); // simulates a 30s auto-refresh cycle
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  return (
    <div style={{ backgroundColor: C.bg, minHeight: "100vh" }}>
      <style>{styles}</style>
      <AppHeader
        page={page}
        screen={screen}
        setPage={setPage}
        onGoToScoreboard={() => {
          setPage("scoreboard");
          setScreen("live");
        }}
        onAddLeagues={() => {
          setPage("scoreboard");
          setScreen("setup");
        }}
        secondsAgo={secondsAgo}
        onResync={() => setSecondsAgo(0)}
        selectedWeek={selectedWeek}
        setSelectedWeek={setSelectedWeek}
      />
      {loadError && (
        <div className="fd-body" style={{ color: C.red, fontSize: 12, padding: 10 }}>
          Couldn't load real Sleeper data ({loadError}), showing mock leagues instead.
        </div>
      )}
      {!realLeagues && !loadError && (
        <div className="fd-body" style={{ color: C.grey, fontSize: 12, padding: 10 }}>
          Loading your real Sleeper leagues...
        </div>
      )}
      {page === "root" ? (
        <HelpMeRootScreen leaguesData={orderedLeagues} />
      ) : screen === "setup" ? (
        <SetupScreen
          onGoLive={() => setScreen("live")}
          leagueOrder={leagueOrder}
          onReorderLeagues={setLeagueOrder}
          leaguesData={activeLeagues}
          onRemoveLeague={(id) => setRemovedIds((prev) => [...prev, id])}
        />
      ) : (
        <LiveScreen orderedLeagues={orderedLeagues} selectedWeek={selectedWeek} isRealData={isRealData} />
      )}
    </div>
  );
}
