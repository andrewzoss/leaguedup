"use client";

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

// Grabs espn_s2/SWID cookies from a logged-in ESPN browser session and
// hands them to LeagueUp via a URL fragment (fragments never reach the
// server, so this stays entirely client-side). Meant to be saved as a
// bookmark's URL, not run directly - see the setup steps in the Add
// Leagues screen. Update the domain below if the deployed URL changes.
const ESPN_BOOKMARKLET =
  'javascript:(function(){function g(n){var m=document.cookie.match(new RegExp("(?:^|; )"+n+"=([^;]*)"));return m?m[1]:null;}var s=g("espn_s2"),w=g("SWID");if(!s||!w){alert("Could not find ESPN login cookies. Make sure you\'re logged into ESPN Fantasy Football in this browser tab, then tap the bookmark again.");return;}location.href="https://leaguedup.vercel.app/#espn_connect=1&espn_s2="+encodeURIComponent(s)+"&swid="+encodeURIComponent(w);})();';

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
  grid-auto-flow: column;
  grid-template-rows: auto auto auto auto;
  align-items: start;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x proximity;
  gap: 2px;
  padding: 4px;
}
@media (min-width: 640px) {
  .fd-board { gap: 8px; padding: 14px; }
}
@media (min-width: 1024px) {
  .fd-board { gap: 14px; padding: 18px; max-width: 1280px; margin: 0 auto; }
}

/* Note: row layout (pos/name/pts) switched from CSS Grid to flexbox - see
   .fd-row/.fd-row-main below. With flexbox, the points side sizes itself to
   its own content naturally instead of needing a hand-tuned pixel width per
   per-page setting, so the old per-perpage width rules that used to live
   here are gone; data-perpage is kept on the board element for any other
   per-density styling that might want it later. */

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
  display: flex;
  flex-direction: column;
  padding: 1.5px 0;
  border-bottom: 1px solid #2C2C2E;
  cursor: pointer;
}
.fd-row-main {
  display: flex;
  align-items: center;
  gap: 2px;
}
.fd-row:last-child { border-bottom: none; }
.fd-row:hover .fd-name { text-decoration: underline; }
.fd-row-tall { gap: 1px; padding-bottom: 3px; }
.fd-pos { flex: 0 0 12px; }
.fd-name { flex: 1 1 0%; min-width: 0; }
.fd-pts-wrap { flex: 0 0 auto; }
.fd-row-game {
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
  .fd-row-main { gap: 6px; }
  .fd-row { padding: 3.5px 0; }
  .fd-pos { flex-basis: 18px; }
}
@media (min-width: 1024px) {
  .fd-pos { flex-basis: 24px; }
}

.fd-pos {
  font-size: 6.5px;
  font-weight: 700;
  color: #8D8D91;
  white-space: nowrap;
  overflow: hidden;
}
@media (min-width: 640px) { .fd-pos { font-size: 9px; } }
@media (min-width: 1024px) { .fd-pos { font-size: 10px; } }

.fd-name {
  font-size: 7.5px;
  color: #F5F3EC;
  overflow: hidden;
  white-space: nowrap;
  min-width: 0;
  padding-right: 3px;
  box-sizing: border-box;
}
@media (min-width: 640px) { .fd-name { font-size: 11px; padding-right: 5px; } }
@media (min-width: 1024px) { .fd-name { font-size: 13px; padding-right: 6px; } }

.fd-pts {
  font-size: 7.5px;
  font-weight: 700;
  text-align: right;
}
@media (min-width: 640px) { .fd-pts { font-size: 11px; } }
@media (min-width: 1024px) { .fd-pts { font-size: 13px; } }

.fd-pts-wrap { display: flex; flex-direction: row; align-items: baseline; justify-content: flex-end; gap: 3px; line-height: 1; }
.fd-proj-mini { font-size: 5.5px; color: #6B6B6F; font-weight: 500; }
@media (min-width: 640px) { .fd-proj-mini { font-size: 8px; } }
@media (min-width: 1024px) { .fd-proj-mini { font-size: 9px; } }

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
.fd-modal-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 8px; }
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
  padding: 2px 10px 0;
}
@media (min-width: 640px) { .fd-brand-row { padding: 3px 20px 0; } }
@media (min-width: 1024px) { .fd-brand-row { padding: 4px 32px 0; } }

.fd-brand-caption-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 1px 10px 2px;
  border-bottom: 1px solid #2C2C2E;
}
@media (min-width: 640px) { .fd-brand-caption-row { padding: 1px 20px 2px; } }
@media (min-width: 1024px) { .fd-brand-caption-row { padding: 1px 32px 3px; } }

.fd-topnav {
  background: #0A0A0B;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 0 10px 1px;
}
@media (min-width: 640px) { .fd-topnav { padding: 0 20px 3px; gap: 6px; } }

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

// ---------- Real data helpers ----------
const PLATFORM_LABEL = { sleeper: "SLEEPER", espn: "ESPN", yahoo: "YAHOO" };

// No mock leagues anymore - this only exists as a safe empty default before
// any real Sleeper/ESPN data has loaded.
const leagues = [];

// ---------- Building blocks ----------

// Real weekly NFL schedule, fetched from /api/nfl/schedule (see
// setRealSchedule, called from the root component's fetch effect). Starts
// empty - "schedule not loaded yet" is a real, honest state, not something
// to paper over with fake games.
const SLOTS = [
  { id: "thu", label: "Thursday" },
  { id: "sunEarly", label: "Sunday Early" },
  { id: "sunLate", label: "Sunday Afternoon" },
  { id: "sunNight", label: "Sunday Night" },
  { id: "mon", label: "Monday Night" },
];

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

// CURRENT_GAMES/CURRENT_TEAM_INFO start empty and get filled in once the
// real NFL schedule loads (see setRealSchedule). Everything that needs "the
// schedule" reads through these.
let CURRENT_GAMES = [];
let CURRENT_TEAM_INFO = {};

function setRealSchedule(games) {
  CURRENT_GAMES = games;
  const info = {};
  games.forEach((g) => {
    info[g.home] = { opp: g.away, game: g };
    info[g.away] = { opp: g.home, game: g };
  });
  CURRENT_TEAM_INFO = info;
}

function getTeamInfo(team) {
  return CURRENT_TEAM_INFO[team] || { opp: "?", game: UNKNOWN_GAME };
}

// Every real player (Sleeper or ESPN) carries their actual NFL team on
// p.team already.
function getPlayerTeam(p) {
  return p.team || null;
}

// Estimates what fraction of a 60-minute NFL game has elapsed, from the
// real quarter + clock. Used to judge whether a player is "on pace" for
// their projection rather than just comparing raw current points to the
// full-game projection (which unfairly reads as "under" for anyone whose
// game just started).
function getGameFraction(p) {
  if (p.status === "pre") return 0;
  if (p.status === "final") return 1;
  const g = mockGame(p);
  if (!g.game.isReal || !g.quarter) return null; // unknown - schedule not loaded, can't judge pace
  const [clockMin, clockSec] = (g.clock || "15:00").split(":").map((n) => Number(n) || 0);
  const minutesLeftInQuarter = clockMin + clockSec / 60;
  const elapsedInQuarter = Math.max(0, 15 - minutesLeftInQuarter);
  const elapsedMinutes = (g.quarter - 1) * 15 + elapsedInQuarter;
  return Math.min(1, Math.max(0, elapsedMinutes / 60));
}

// Pace-adjusted target: "at this point in the game, a player on track to
// hit their projection would have this many points." Early in a game this
// is intentionally not held to the full projection - a WR with 0 points
// two minutes in isn't "underperforming," they just haven't touched the
// ball yet. A small floor avoids that early-game noise; a small tolerance
// band avoids color flickering right at the boundary.
function getPtsClass(p) {
  if (p.status === "pre") return "fd-pts-pre";
  const fraction = getGameFraction(p);
  if (fraction === null) return "fd-pts-even"; // schedule unknown yet - no fair basis for a call
  const paceTarget = p.proj * Math.max(fraction, 0.15);
  if (p.pts > paceTarget * 1.1) return "fd-pts-over";
  if (p.pts < paceTarget * 0.9) return "fd-pts-under";
  return "fd-pts-even";
}

// Ties up a loose end: Sleeper has no real "has this game started/ended"
// field, so each player arrives with a rough guess (points > 0 = "live").
// Once the real NFL schedule has loaded, this replaces that guess with the
// player's own real game state (pre/in/post -> pre/live/final), so the
// point coloring and game-info line are both driven by the same real data.
function syncPlayerStatusWithSchedule(p) {
  const team = getPlayerTeam(p);
  const { game } = getTeamInfo(team);
  if (!game.isReal) return p; // schedule hasn't loaded yet, or team unknown - leave the guess
  const status = game.state === "pre" ? "pre" : game.state === "post" ? "final" : "live";
  return { ...p, status };
}

function syncTeamStatusWithSchedule(team) {
  return {
    ...team,
    starters: team.starters.map(syncPlayerStatusWithSchedule),
    bench: team.bench.map(syncPlayerStatusWithSchedule),
  };
}

// Game context for a player: real live score/clock/status once the real NFL
// schedule has loaded. Before that (or for a team the schedule doesn't
// recognize), this is an honest "unknown yet" state - zeros, not a fake
// invented score.
function mockGame(p) {
  const team = getPlayerTeam(p);
  const { opp, game } = getTeamInfo(team);

  if (!game.isReal) {
    return { team, opp, kickoff: game.kickoff, quarter: 0, clock: "", teamScore: 0, oppScore: 0, game };
  }

  const homeScore = game.homeScore || 0;
  const awayScore = game.awayScore || 0;
  const teamScore = team === game.home ? homeScore : awayScore;
  const oppScore = team === game.home ? awayScore : homeScore;
  return {
    team,
    opp,
    kickoff: game.kickoff,
    quarter: game.period || 0,
    clock: game.clock || "",
    teamScore,
    oppScore,
    game,
  };
}

// One-line matchup summary shown under a player's name on the Scoreboard.
// Uses the real game's own state (pre/in/post) once real data has loaded.
// Before that, shows an honest "schedule loading" line instead of guessing.
function gameLine(p) {
  const g = mockGame(p);
  if (!g.game.isReal) return "Schedule loading...";
  if (g.game.state === "pre") {
    return `${g.team} vs. ${g.opp}  ${g.game.date} ${g.game.timeShort} EDT`;
  }
  if (g.game.state === "post") {
    return `${g.team} ${g.teamScore} - ${g.opp} ${g.oppScore}  FINAL`;
  }
  return `${g.team} ${g.teamScore} - ${g.opp} ${g.oppScore}  ${g.quarter}Q ${g.clock}`;
}

function StarterRow({ p, onSelect, showGame }) {
  const ptsClass = getPtsClass(p);
  return (
    <div className={`fd-row ${showGame ? "fd-row-tall" : ""}`} onClick={() => onSelect(p)}>
      <div className="fd-row-main">
        <span className="fd-pos fd-body">{p.pos}</span>
        <span className="fd-name fd-body">{p.name}</span>
        <span className="fd-pts-wrap">
          <span className={`fd-pts fd-body ${ptsClass}`}>{p.pts.toFixed(1)}</span>
          <span className="fd-proj-mini fd-body">({p.proj.toFixed(1)})</span>
        </span>
      </div>
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
function LeagueColumn({ league, onSelectPlayer, showProjected, colIndex }) {
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

// Real box score only. If the platform hasn't given us real stats yet (game
// hasn't happened, or that position isn't mapped for that platform), this is
// just empty - the "THIS WEEK" section on the player modal simply doesn't
// show rather than displaying invented numbers.
function mockBoxScore(p) {
  return p.boxScore || [];
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
            <div className="fd-modal-grid">
              {boxScore.map((s) => (
                <div key={s.label}>
                  <span className="fd-modal-label fd-body">{s.label}</span>
                  <span className="fd-modal-val fd-body">{s.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
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
    mode === "slot"
      ? CURRENT_GAMES.filter((g) => g.slot === selectedSlot).map((g) => g.id)
      : selectedGames;

  const guide = scopeGameIds.length > 0 ? buildRootingGuide(scopeGameIds, leaguesData) : null;

  function toggleGame(id) {
    setSelectedGames((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  const allSelected = selectedGames.length === CURRENT_GAMES.length;

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
            onClick={() => setSelectedGames(allSelected ? [] : CURRENT_GAMES.map((g) => g.id))}
          >
            <span className="fd-root-pick-matchup fd-display">ALL</span>
            <span className="fd-root-pick-slot">Every game</span>
          </button>
          {CURRENT_GAMES.map((g) => (
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

function ReorderRow({ league, index, dragState, onPointerDown, onRemove, onRename }) {
  const isDragging = dragState.id === league.id;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(league.name);

  function commitRename() {
    onRename(league.id, draft);
    setEditing(false);
  }

  return (
    <div
      className={`fd-reorder-row ${isDragging ? "dragging" : ""}`}
      style={isDragging ? { transform: `translateY(${dragState.dy}px)` } : undefined}
      onPointerDown={(e) => {
        if (editing) return; // don't start a drag while the name field is open
        onPointerDown(e, league.id, index);
      }}
    >
      <GripVertical size={14} color={C.grey} style={{ flexShrink: 0 }} />
      <span className="fd-plat-tag" style={{ backgroundColor: PLATFORM_COLORS[league.platform] }}>
        {PLATFORM_LABEL[league.platform]}
      </span>
      {editing ? (
        <input
          autoFocus
          className="fd-body"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setDraft(league.name);
              setEditing(false);
            }
          }}
          onBlur={commitRename}
          style={{
            flex: 1,
            minWidth: 0,
            background: C.bg,
            border: `1px solid ${C.gold}`,
            color: C.white,
            fontSize: 12,
            padding: "3px 6px",
          }}
        />
      ) : (
        <span
          className="fd-reorder-name fd-body"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setDraft(league.name);
            setEditing(true);
          }}
          style={{ cursor: "text" }}
        >
          {league.name}
        </span>
      )}
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

function ReorderList({ order, leaguesData, onReorder, onRemove, onRename }) {
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
          onRename={onRename}
        />
      ))}
    </div>
  );
}

// ---------- Setup screen ----------

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

function PlatformBox({ label, color, children }) {
  return (
    <div style={{ border: `1px solid ${C.line}`, backgroundColor: C.panel, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span className="fd-display" style={{ fontSize: 12, color }}>
          {label}
        </span>
        <div style={{ flex: 1, height: 1, backgroundColor: C.line }} />
      </div>
      {children}
    </div>
  );
}

function CopyCodeButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="fd-display"
      onClick={() => {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => {
            setCopied(false);
          });
      }}
      style={{
        width: "100%",
        padding: "10px 0",
        fontSize: 12,
        letterSpacing: 1,
        color: copied ? C.bg : C.white,
        backgroundColor: copied ? C.green : C.panelAlt,
        border: `1px solid ${copied ? C.green : C.line}`,
        cursor: "pointer",
      }}
    >
      {copied ? "COPIED" : "COPY CODE"}
    </button>
  );
}

function SetupScreen({
  onGoLive,
  leagueOrder,
  onReorderLeagues,
  leaguesData,
  onRemoveLeague,
  onRenameLeague,
  sleeperUsername,
  onChangeSleeperUsername,
  espnCookies,
  espnLeagueIds,
  onAddEspnLeagueId,
  onRemoveEspnLeagueId,
  selectedWeek,
}) {
  const [usernameDraft, setUsernameDraft] = useState(sleeperUsername || "");
  const [espnLeagueIdDraft, setEspnLeagueIdDraft] = useState("");
  const [showBookmarklet, setShowBookmarklet] = useState(false);
  const [showLeagueIdHelp, setShowLeagueIdHelp] = useState(false);

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
          Drag to set the order your leagues appear on the Scoreboard. Tap a
          league's name to rename it.
        </p>
        <ReorderList
          order={leagueOrder}
          leaguesData={leaguesData}
          onReorder={onReorderLeagues}
          onRemove={onRemoveLeague}
          onRename={onRenameLeague}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <PlatformBox label="ADD SLEEPER LEAGUES" color={PLATFORM_COLORS.sleeper}>
          <p className="fd-body" style={{ fontSize: 12, color: C.grey, margin: "0 0 10px" }}>
            Pulls in every league tied to this username. Removed one below and
            want it back? Hit Save again, it resets your Sleeper list.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="fd-body"
              value={usernameDraft}
              onChange={(e) => setUsernameDraft(e.target.value)}
              placeholder="Your Sleeper username"
              style={inputStyle}
            />
            <button
              className="fd-display"
              onClick={() => onChangeSleeperUsername(usernameDraft.trim())}
              style={{
                padding: "0 18px",
                fontSize: 13,
                color: C.bg,
                backgroundColor: C.gold,
                border: "none",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              Save
            </button>
          </div>
        </PlatformBox>

        <PlatformBox label="ADD ESPN LEAGUE" color={PLATFORM_COLORS.espn}>
          {!espnCookies ? (
            <>
              <p className="fd-body" style={{ fontSize: 12, color: C.grey, margin: "0 0 10px" }}>
                ESPN has no direct login for outside apps, so this uses a
                one-time bookmarklet that grabs your login from a browser
                tab where you're already signed into ESPN. Works entirely on
                your phone, nothing to install.
              </p>
              <button
                className="fd-body"
                onClick={() => setShowBookmarklet((v) => !v)}
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
                {showBookmarklet ? "HIDE SETUP STEPS" : "SET UP ESPN CONNECTION"}
              </button>
              {showBookmarklet && (
                <div style={{ marginTop: 12 }}>
                  <ol className="fd-body" style={{ fontSize: 12, color: C.grey, paddingLeft: 18, margin: "0 0 10px" }}>
                    <li style={{ marginBottom: 6 }}>
                      Bookmark any page in your phone's browser (any page works, you'll overwrite the address next).
                    </li>
                    <li style={{ marginBottom: 6 }}>
                      Edit that bookmark. Rename it "Connect ESPN" and replace its saved address with the code below (copy it exactly, including "javascript:").
                    </li>
                    <li style={{ marginBottom: 6 }}>
                      Log into espn.com/fantasy in that same browser.
                    </li>
                    <li style={{ marginBottom: 6 }}>
                      While on an ESPN page, open your bookmarks and tap "Connect ESPN." You'll be sent back here, connected.
                    </li>
                  </ol>
                  <CopyCodeButton text={ESPN_BOOKMARKLET} />
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: C.green }} />
                <span className="fd-body" style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>
                  ESPN CONNECTED
                </span>
                <button
                  className="fd-body"
                  onClick={() => setShowBookmarklet((v) => !v)}
                  style={{
                    marginLeft: "auto",
                    fontSize: 10,
                    color: C.grey,
                    background: "none",
                    border: `1px solid ${C.line}`,
                    padding: "3px 6px",
                    cursor: "pointer",
                  }}
                >
                  Reconnect
                </button>
              </div>
              {showBookmarklet && (
                <div style={{ marginBottom: 12 }}>
                  <p className="fd-body" style={{ fontSize: 11, color: C.grey, margin: "0 0 6px" }}>
                    Login expired? Log into espn.com/fantasy again, then tap
                    your "Connect ESPN" bookmark again.
                  </p>
                  <CopyCodeButton text={ESPN_BOOKMARKLET} />
                </div>
              )}
              {espnLeagueIds.length > 0 && (
                <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {espnLeagueIds.map((id) => (
                    <div
                      key={id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 10px",
                        border: `1px solid ${C.line}`,
                        backgroundColor: C.bg,
                      }}
                    >
                      <span className="fd-body" style={{ fontSize: 12, color: C.white, flex: 1 }}>
                        League {id}
                      </span>
                      <a
                        href={`/api/espn/league?league_id=${id}&espn_s2=${encodeURIComponent(
                          espnCookies.s2
                        )}&swid=${encodeURIComponent(espnCookies.swid)}&week=${selectedWeek}&year=2026`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fd-body"
                        style={{ fontSize: 10, color: C.gold, textDecoration: "underline" }}
                      >
                        View raw data
                      </a>
                      <button
                        onClick={() => onRemoveEspnLeagueId(id)}
                        style={{ background: "none", border: "none", color: C.grey, cursor: "pointer" }}
                        aria-label={`Remove ESPN league ${id}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                className="fd-body"
                onClick={() => setShowLeagueIdHelp((v) => !v)}
                style={{
                  background: "none",
                  border: "none",
                  color: C.grey,
                  fontSize: 11,
                  textDecoration: "underline",
                  padding: 0,
                  marginBottom: 8,
                  cursor: "pointer",
                }}
              >
                {showLeagueIdHelp ? "Hide" : "Where do I find my League ID?"}
              </button>
              {showLeagueIdHelp && (
                <div
                  className="fd-body"
                  style={{ fontSize: 11, color: C.grey, marginBottom: 10, lineHeight: 1.5 }}
                >
                  <strong style={{ color: C.white }}>In the ESPN Fantasy app:</strong> open your
                  league, tap "More" in the bottom nav, then "League," then
                  "Settings." The League ID is shown near the top, under
                  General settings.
                  <br />
                  <br />
                  Can't find it there? Tap the share/invite option instead
                  (often under "Members" or a person-plus icon) and generate
                  an invite link, the League ID is the number after
                  "leagueId=" in that link, even if you don't send it to
                  anyone.
                  <br />
                  <br />
                  <strong style={{ color: C.white }}>On the website:</strong> open your league at
                  fantasy.espn.com, the League ID is the number after
                  "leagueId=" in your browser's address bar.
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="fd-body"
                  value={espnLeagueIdDraft}
                  onChange={(e) => setEspnLeagueIdDraft(e.target.value)}
                  placeholder="ESPN League ID"
                  style={inputStyle}
                />
                <button
                  className="fd-display"
                  onClick={() => {
                    const id = espnLeagueIdDraft.trim();
                    if (id) {
                      onAddEspnLeagueId(id);
                      setEspnLeagueIdDraft("");
                    }
                  }}
                  style={{
                    padding: "0 18px",
                    fontSize: 13,
                    color: C.bg,
                    backgroundColor: C.gold,
                    border: "none",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Add
                </button>
              </div>
            </>
          )}
        </PlatformBox>

        <PlatformBox label="ADD YAHOO LEAGUE" color={PLATFORM_COLORS.yahoo}>
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
        </PlatformBox>
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

function LiveScreen({ orderedLeagues, selectedWeek, leaguesPerPage }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const viewLeagues = orderedLeagues;
  const boardRef = React.useRef(null);
  const [colWidthPx, setColWidthPx] = useState(null);

  // Measures the board's actual rendered width and divides it directly into
  // pixel widths - explicit numbers from the real DOM, not CSS percentage/
  // calc math (which repeatedly proved unreliable here). Re-measures on
  // resize and whenever the per-page count changes.
  React.useEffect(() => {
    function measure() {
      if (!boardRef.current) return;
      const totalWidth = boardRef.current.clientWidth;
      const style = window.getComputedStyle(boardRef.current);
      const gap = parseFloat(style.columnGap || style.gap || "0") || 0;
      const width = (totalWidth - gap * (leaguesPerPage - 1)) / leaguesPerPage;
      setColWidthPx(Math.floor(width));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [leaguesPerPage]);

  // Always start scrolled all the way to the first league - without this,
  // the horizontal scroll container can render already scrolled into the
  // middle of the list on load.
  React.useEffect(() => {
    if (boardRef.current) boardRef.current.scrollLeft = 0;
  }, [viewLeagues.length]);

  return (
    <div>
      <div
        className="fd-board"
        ref={boardRef}
        data-perpage={leaguesPerPage}
        style={{
          gridTemplateColumns: colWidthPx
            ? `repeat(${viewLeagues.length}, ${colWidthPx}px)`
            : `repeat(${viewLeagues.length}, minmax(0, 1fr))`,
        }}
      >
        {viewLeagues.map((l, i) => (
          <LeagueColumn
            key={l.id}
            league={l}
            onSelectPlayer={setSelectedPlayer}
            showProjected
            colIndex={i}
          />
        ))}
      </div>

      <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
    </div>
  );
}

// ---------- Persistent app header + top-level nav ----------

const ALL_WEEKS = Array.from({ length: 18 }, (_, i) => i + 1);

// currentWeek is now determined dynamically (see the root component's fetch
// to /api/nfl/current-week) rather than a hardcoded number that would need
// updating for every new season. weekHasStarted distinguishes "this is the
// real current week, but no games have kicked off yet" (still projected)
// from "this week is actually underway" (live) - both cases have
// week === currentWeek, so the label needs that extra signal to tell them
// apart. Before the real current week is known yet (briefly, on first
// load) or the schedule hasn't loaded, currentWeek/weekHasStarted just fall
// back to sensible defaults below.
function weekBadgeInfo(week, currentWeek, weekHasStarted) {
  if (week === currentWeek) {
    if (weekHasStarted) return { label: `LIVE · WK${week}`, color: C.green, dot: true };
    return { label: `PROJECTED · WK${week}`, color: C.gold, dot: false };
  }
  if (week < currentWeek) return { label: `FINAL · WK${week}`, color: C.grey, dot: false };
  return { label: `PROJECTED · WK${week}`, color: C.gold, dot: false };
}

function WeekPickerModal({ selectedWeek, onSelect, onClose, currentWeek, weekHasStarted }) {
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
            const info = weekBadgeInfo(w, currentWeek, weekHasStarted);
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

function AppHeader({
  page,
  screen,
  setPage,
  onGoToScoreboard,
  onAddLeagues,
  secondsAgo,
  onResync,
  selectedWeek,
  setSelectedWeek,
  leaguesPerPage,
  onChangeLeaguesPerPage,
  showPerPagePicker,
  currentWeek,
  weekHasStarted,
}) {
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const info = weekBadgeInfo(selectedWeek, currentWeek, weekHasStarted);
  const scoreboardActive = page === "scoreboard" && screen !== "setup";

  return (
    <div className="fd-app-header">
      <div className="fd-brand-row">
        <span className="fd-logo fd-display" style={{ color: C.white }}>
          League'd <span style={{ color: C.gold }}>Up</span>
        </span>
        {showPerPagePicker && (
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => onChangeLeaguesPerPage(n)}
                className="fd-body"
                style={{
                  width: 16,
                  height: 16,
                  fontSize: 9,
                  lineHeight: 1,
                  fontWeight: 700,
                  padding: 0,
                  color: leaguesPerPage === n ? C.bg : C.grey,
                  backgroundColor: leaguesPerPage === n ? C.gold : "transparent",
                  border: `1px solid ${leaguesPerPage === n ? C.gold : C.line}`,
                  cursor: "pointer",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="fd-brand-caption-row">
        <span className="fd-sync-group">
          <span className="fd-total fd-body">Synced {secondsAgo}s ago</span>
          <button className="fd-resync-btn" onClick={onResync} aria-label="Resync now">
            <RefreshCw size={11} />
          </button>
        </span>
        {showPerPagePicker && (
          <span className="fd-body" style={{ fontSize: 8, color: C.grey, letterSpacing: 0.3 }}>
            LEAGUES PER SCREEN (SCROLL RIGHT)
          </span>
        )}
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
          currentWeek={currentWeek}
          weekHasStarted={weekHasStarted}
        />
      )}
    </div>
  );
}

// ---------- Root ----------

const LS_KEYS = {
  username: "leagueup_sleeper_username",
  order: "leagueup_league_order",
  removed: "leagueup_removed_ids",
  espnS2: "leagueup_espn_s2",
  espnSwid: "leagueup_espn_swid",
  espnLeagueIds: "leagueup_espn_league_ids",
  nameOverrides: "leagueup_league_name_overrides",
  perPage: "leagueup_leagues_per_page",
};

export default function LeaguedUpApp() {
  const [page, setPage] = useState("scoreboard");
  const [screen, setScreen] = useState("live");
  const [selectedWeek, setSelectedWeek] = useState(1); // updated to the real current week below, once known
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [currentWeek, setCurrentWeek] = useState(1);

  // Finds out which week is actually "now" (per ESPN's own current-week
  // designation - see /api/nfl/current-week) and jumps the initial
  // selection there, instead of always defaulting to week 1. Runs once on
  // mount, so it never overrides a week the person picks manually later.
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/nfl/current-week")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.week) return;
        setCurrentWeek(data.week);
        setSelectedWeek(data.week);
      })
      .catch(() => {}); // fine to just stay on the week-1 fallback if this fails
    return () => {
      cancelled = true;
    };
  }, []);

  // Sleeper username, ESPN cookies/league ids, retry counter, and per-device
  // saved order/removals. Start at safe defaults (matches server render),
  // then load whatever was saved on this device once mounted in the
  // browser, avoiding a hydration mismatch between server and client.
  const [sleeperUsername, setSleeperUsernameState] = useState("");
  const [espnCookies, setEspnCookiesState] = useState(null); // { s2, swid } | null
  const [espnLeagueIds, setEspnLeagueIdsState] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  const [removedIds, setRemovedIds] = useState([]);
  const [leagueOrder, setLeagueOrder] = useState(leagues.map((l) => l.id));
  const [leagueNameOverrides, setLeagueNameOverrides] = useState({}); // league id -> custom display name
  const [leaguesPerPage, setLeaguesPerPageState] = useState(2);

  // Picks up cookies handed off by the ESPN bookmarklet (see the bookmarklet
  // setup instructions), which lands back here as a URL fragment like
  // #espn_connect=1&espn_s2=...&swid=.... Fragments never hit the server, so
  // this stays entirely client-side.
  React.useEffect(() => {
    if (!window.location.hash.includes("espn_connect=1")) return;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const s2 = params.get("espn_s2");
    const swid = params.get("swid");
    if (s2 && swid) {
      const cookies = { s2, swid };
      setEspnCookiesState(cookies);
      try {
        localStorage.setItem(LS_KEYS.espnS2, s2);
        localStorage.setItem(LS_KEYS.espnSwid, swid);
      } catch {}
      setPage("scoreboard");
      setScreen("setup"); // show them the "connected" state right away
    }
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  React.useEffect(() => {
    try {
      const savedUsername = localStorage.getItem(LS_KEYS.username);
      const savedOrder = JSON.parse(localStorage.getItem(LS_KEYS.order) || "null");
      const savedRemoved = JSON.parse(localStorage.getItem(LS_KEYS.removed) || "null");
      const savedEspnS2 = localStorage.getItem(LS_KEYS.espnS2);
      const savedEspnSwid = localStorage.getItem(LS_KEYS.espnSwid);
      const savedEspnLeagueIds = JSON.parse(localStorage.getItem(LS_KEYS.espnLeagueIds) || "null");
      const savedNameOverrides = JSON.parse(localStorage.getItem(LS_KEYS.nameOverrides) || "null");
      const savedPerPage = Number(localStorage.getItem(LS_KEYS.perPage));
      if (savedUsername) setSleeperUsernameState(savedUsername);
      if (savedEspnS2 && savedEspnSwid) setEspnCookiesState({ s2: savedEspnS2, swid: savedEspnSwid });
      if (savedEspnLeagueIds) setEspnLeagueIdsState(savedEspnLeagueIds);
      if (savedNameOverrides) setLeagueNameOverrides(savedNameOverrides);
      if ([2, 3, 4].includes(savedPerPage)) setLeaguesPerPageState(savedPerPage);
      if (!savedUsername && !(savedEspnS2 && savedEspnSwid)) {
        setScreen("setup"); // no leagues connected yet - start on Add Leagues, not an empty Scoreboard
      }
      if (savedOrder) setLeagueOrder(savedOrder);
      if (savedRemoved) setRemovedIds(savedRemoved);
    } catch {
      setScreen("setup"); // localStorage unavailable - safest to just let them add leagues
    }
  }, []);

  function setLeaguesPerPage(n) {
    setLeaguesPerPageState(n);
    try {
      localStorage.setItem(LS_KEYS.perPage, String(n));
    } catch {}
  }

  function renameLeague(id, newName) {
    setLeagueNameOverrides((prev) => {
      const next = { ...prev };
      const trimmed = newName.trim();
      if (trimmed) next[id] = trimmed;
      else delete next[id]; // empty name = revert to the platform's real name
      try {
        localStorage.setItem(LS_KEYS.nameOverrides, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function setSleeperUsername(name) {
    setSleeperUsernameState(name);
    try {
      localStorage.setItem(LS_KEYS.username, name);
    } catch {}
    // Hitting Save is an explicit "give me everything again" action, so it
    // brings back any Sleeper leagues you'd previously removed. Leagues from
    // other platforms you've removed stay removed - this only resets Sleeper.
    setRemovedIds((prev) =>
      prev.filter((id) => {
        const league = allRealLeagues.find((l) => l.id === id);
        return league ? league.platform !== "sleeper" : true;
      })
    );
  }

  function addEspnLeagueId(id) {
    setEspnLeagueIdsState((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(LS_KEYS.espnLeagueIds, JSON.stringify(next));
      } catch {}
      return next;
    });
  }
  function removeEspnLeagueId(id) {
    setEspnLeagueIdsState((prev) => {
      const next = prev.filter((x) => x !== id);
      try {
        localStorage.setItem(LS_KEYS.espnLeagueIds, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  React.useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.order, JSON.stringify(leagueOrder));
    } catch {}
  }, [leagueOrder]);
  React.useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.removed, JSON.stringify(removedIds));
    } catch {}
  }, [removedIds]);

  // Real Sleeper data, fetched once here and shared by the Scoreboard, Help
  // Me Root, and the Add Leagues reorder list, so all three are always
  // looking at the same actual leagues instead of Scoreboard alone.
  const [sleeperLeagues, setSleeperLeagues] = useState(null);
  const [sleeperError, setSleeperError] = useState(null);

  React.useEffect(() => {
    if (!sleeperUsername) {
      setSleeperLeagues(null);
      setSleeperError(null);
      return;
    }
    let cancelled = false;
    setSleeperLeagues(null);
    setSleeperError(null);
    fetch(`/api/sleeper/all?username=${sleeperUsername}&week=${selectedWeek}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setSleeperError(data.error);
        else setSleeperLeagues(data.leagues);
      })
      .catch(() => {
        if (!cancelled) setSleeperError("Could not reach the Sleeper API route.");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedWeek, sleeperUsername, retryCount]);

  // Real ESPN data, one league at a time (ESPN has no "give me every league"
  // endpoint like Sleeper does, each league id is fetched separately).
  const [espnLeagues, setEspnLeagues] = useState([]);
  const [espnErrors, setEspnErrors] = useState({}); // league_id -> error string

  React.useEffect(() => {
    if (!espnCookies || espnLeagueIds.length === 0) {
      setEspnLeagues([]);
      setEspnErrors({});
      return;
    }
    let cancelled = false;
    Promise.all(
      espnLeagueIds.map((id) =>
        fetch(
          `/api/espn/league?league_id=${id}&espn_s2=${encodeURIComponent(espnCookies.s2)}&swid=${encodeURIComponent(
            espnCookies.swid
          )}&week=${selectedWeek}&year=2026`
        )
          .then((res) => res.json())
          .then((data) => ({ id, data }))
          .catch(() => ({ id, data: { error: "Could not reach the ESPN API route." } }))
      )
    ).then((results) => {
      if (cancelled) return;
      const okLeagues = [];
      const errors = {};
      results.forEach(({ id, data }) => {
        if (data.error) errors[id] = data.error;
        else okLeagues.push(data);
      });
      setEspnLeagues(okLeagues);
      setEspnErrors(errors);
    });
    return () => {
      cancelled = true;
    };
  }, [espnCookies, espnLeagueIds, selectedWeek, retryCount]);

  // Real NFL schedule/live scores, shared by the Scoreboard's per-player
  // matchup line, the player modal, and Help Me Root's game/timeslot picker.
  // CURRENT_GAMES is a module-level variable (not React state), so a dummy
  // counter is used here just to force everything to re-render once it's
  // been swapped for real data.
  const [scheduleVersion, setScheduleVersion] = useState(0);
  const [scheduleError, setScheduleError] = useState(null);
  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/nfl/schedule?week=${selectedWeek}&year=2026`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error || !data.games?.length) {
          setScheduleError(data.error || "No games returned");
          return;
        }
        setRealSchedule(data.games);
        setScheduleVersion((v) => v + 1);
      })
      .catch(() => {
        if (!cancelled) setScheduleError("Could not reach the NFL schedule API route.");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedWeek]);

  // Sleeper + ESPN combined. No silent mock fallback anymore - leagues that
  // haven't loaded or failed just aren't in this list, that's a real
  // "not connected" state, not a fake demo of leagues that aren't yours.
  // Name overrides applied right here, at the source, so every screen that
  // reads league.name (Scoreboard, Help Me Root, the reorder list) sees the
  // renamed value automatically.
  const allRealLeagues = [...(sleeperLeagues || []), ...espnLeagues].map((l) =>
    leagueNameOverrides[l.id] ? { ...l, name: leagueNameOverrides[l.id] } : l
  );
  const activeLeagues = allRealLeagues.filter((l) => !removedIds.includes(l.id));
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

  // Corrects each player's pre/live/final status against the real schedule
  // once it's loaded, so the Scoreboard and Help Me Root both work off the
  // same corrected data instead of each platform's rough points>0 guess.
  const syncedLeagues = React.useMemo(
    () =>
      orderedLeagues.map((l) => ({
        ...l,
        you: syncTeamStatusWithSchedule(l.you),
        opp: syncTeamStatusWithSchedule(l.opp),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orderedLeagues, scheduleVersion]
  );

  // Whether the real current week's games have actually kicked off yet -
  // distinguishes "it's the current week, but still Tuesday" (projected)
  // from "the week is underway" (live). Reads CURRENT_GAMES directly since
  // it's already the real schedule for whichever week is selected;
  // scheduleVersion in the dependency isn't read here but is what signals
  // this needs recomputing once schedule data has (re)loaded.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const weekHasStarted = React.useMemo(
    () => selectedWeek === currentWeek && CURRENT_GAMES.some((g) => g.state && g.state !== "pre"),
    [selectedWeek, currentWeek, scheduleVersion]
  );

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
        leaguesPerPage={leaguesPerPage}
        onChangeLeaguesPerPage={setLeaguesPerPage}
        showPerPagePicker={page === "scoreboard" && screen === "live" && orderedLeagues.length > 1}
        currentWeek={currentWeek}
        weekHasStarted={weekHasStarted}
      />
      {!sleeperUsername && !espnCookies && screen !== "setup" && (
        <div style={{ padding: "30px 20px", textAlign: "center" }}>
          <div className="fd-body" style={{ color: C.grey, fontSize: 13, marginBottom: 12 }}>
            No leagues connected yet.
          </div>
          <button
            className="fd-display"
            onClick={() => {
              setPage("scoreboard");
              setScreen("setup");
            }}
            style={{
              padding: "8px 18px",
              fontSize: 13,
              color: C.bg,
              backgroundColor: C.gold,
              border: "none",
              cursor: "pointer",
            }}
          >
            Add Leagues
          </button>
        </div>
      )}
      {sleeperUsername && sleeperError && (
        <div style={{ padding: "30px 20px", textAlign: "center" }}>
          <div className="fd-display" style={{ color: C.red, fontSize: 16, marginBottom: 4 }}>
            League Connection Error
          </div>
          <div className="fd-body" style={{ color: C.grey, fontSize: 11, marginBottom: 12 }}>
            {sleeperError}
          </div>
          <button
            className="fd-display"
            onClick={() => setRetryCount((c) => c + 1)}
            style={{
              padding: "8px 18px",
              fontSize: 13,
              color: C.bg,
              backgroundColor: C.red,
              border: "none",
              cursor: "pointer",
            }}
          >
            Reconnect
          </button>
        </div>
      )}
      {sleeperUsername && !sleeperLeagues && !sleeperError && (
        <div className="fd-body" style={{ color: C.grey, fontSize: 12, padding: 10, textAlign: "center" }}>
          Loading your real Sleeper leagues...
        </div>
      )}
      {Object.keys(espnErrors).length > 0 && (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <div className="fd-display" style={{ color: C.red, fontSize: 14, marginBottom: 4 }}>
            ESPN Connection Error
          </div>
          {Object.entries(espnErrors).map(([id, err]) => (
            <div key={id} className="fd-body" style={{ color: C.grey, fontSize: 11, marginBottom: 4 }}>
              League {id}: {err}
            </div>
          ))}
          <button
            className="fd-display"
            onClick={() => setRetryCount((c) => c + 1)}
            style={{
              padding: "8px 18px",
              fontSize: 13,
              color: C.bg,
              backgroundColor: C.red,
              border: "none",
              cursor: "pointer",
              marginTop: 8,
            }}
          >
            Reconnect
          </button>
        </div>
      )}
      {scheduleError && (
        <div className="fd-body" style={{ color: C.red, fontSize: 12, padding: 10 }}>
          Couldn't load the real NFL schedule ({scheduleError}), matchup info will look fake.
        </div>
      )}
      {page === "root" ? (
        <HelpMeRootScreen leaguesData={syncedLeagues} />
      ) : screen === "setup" ? (
        <SetupScreen
          onGoLive={() => setScreen("live")}
          leagueOrder={leagueOrder}
          onReorderLeagues={setLeagueOrder}
          leaguesData={activeLeagues}
          onRemoveLeague={(id) => setRemovedIds((prev) => [...prev, id])}
          onRenameLeague={renameLeague}
          sleeperUsername={sleeperUsername}
          onChangeSleeperUsername={setSleeperUsername}
          espnCookies={espnCookies}
          espnLeagueIds={espnLeagueIds}
          onAddEspnLeagueId={addEspnLeagueId}
          onRemoveEspnLeagueId={removeEspnLeagueId}
          selectedWeek={selectedWeek}
        />
      ) : (
        <LiveScreen
          orderedLeagues={syncedLeagues}
          selectedWeek={selectedWeek}
          leaguesPerPage={leaguesPerPage}
        />
      )}
    </div>
  );
}
