import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Haptics } from '@capacitor/haptics';
import * as storage from './lib/storage.js';
import {
  scheduleAllNotifications,
  cancelAllNotifications,
  WARNING_POINTS,
} from './lib/notifications.js';
import { startOrUpdateTimerNotification, stopTimerNotification } from './lib/timerNotification.js';
import {
  onAuthChange,
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  checkGoogleRedirectResult,
  logout as firebaseLogout,
  deleteAccount as firebaseDeleteAccount,
  fetchCloudState,
  saveCloudState,
  authErrorMessage,
  googleSignInAvailable,
} from './lib/firebase.js';

/* ============ DATA ============ */

// tiempoMinimoMinutos = minutos de estudio ACUMULADOS HISTÓRICOS (stats.totalStudyMinutes)
// necesarios para desbloquear cada especie. Escalonado dentro de cada rareza,
// ordenado de menor a mayor. Validado con el usuario antes de implementar.
const SPECIES = [
  // comunes (20) — 5 a 135 min
  { id:'rabbit', name:'Conejo', emoji:'🐰', rarity:'common', habitat:'bosque', tiempoMinimoMinutos:5 },
  { id:'mouse', name:'Ratón', emoji:'🐭', rarity:'common', habitat:'bosque', tiempoMinimoMinutos:10 },
  { id:'squirrel', name:'Ardilla', emoji:'🐿️', rarity:'common', habitat:'bosque', tiempoMinimoMinutos:15 },
  { id:'hamster', name:'Hámster', emoji:'🐹', rarity:'common', habitat:'bosque', tiempoMinimoMinutos:20 },
  { id:'pigeon', name:'Paloma', emoji:'🕊️', rarity:'common', habitat:'bosque', tiempoMinimoMinutos:26 },
  { id:'chicken', name:'Gallina', emoji:'🐔', rarity:'common', habitat:'granja', tiempoMinimoMinutos:32 },
  { id:'duck', name:'Pato', emoji:'🦆', rarity:'common', habitat:'granja', tiempoMinimoMinutos:38 },
  { id:'frog', name:'Rana', emoji:'🐸', rarity:'common', habitat:'selva', tiempoMinimoMinutos:44 },
  { id:'turtle', name:'Tortuga', emoji:'🐢', rarity:'common', habitat:'oceano', tiempoMinimoMinutos:50 },
  { id:'cat', name:'Gato', emoji:'🐱', rarity:'common', habitat:'granja', tiempoMinimoMinutos:57 },
  { id:'goat', name:'Cabra', emoji:'🐐', rarity:'common', habitat:'granja', tiempoMinimoMinutos:64 },
  { id:'pig', name:'Cerdo', emoji:'🐷', rarity:'common', habitat:'granja', tiempoMinimoMinutos:71 },
  { id:'sheep', name:'Oveja', emoji:'🐑', rarity:'common', habitat:'granja', tiempoMinimoMinutos:78 },
  { id:'cow', name:'Vaca', emoji:'🐄', rarity:'common', habitat:'granja', tiempoMinimoMinutos:86 },
  { id:'horse', name:'Caballo', emoji:'🐴', rarity:'common', habitat:'granja', tiempoMinimoMinutos:94 },
  { id:'donkey', name:'Burro', emoji:'🫏', rarity:'common', habitat:'granja', tiempoMinimoMinutos:102 },
  { id:'turkey', name:'Pavo', emoji:'🦃', rarity:'common', habitat:'granja', tiempoMinimoMinutos:110 },
  { id:'hedgehog', name:'Erizo', emoji:'🦔', rarity:'common', habitat:'bosque', tiempoMinimoMinutos:118 },
  { id:'crab', name:'Cangrejo', emoji:'🦀', rarity:'common', habitat:'oceano', tiempoMinimoMinutos:126 },
  { id:'seal', name:'Foca', emoji:'🦭', rarity:'common', habitat:'polar', tiempoMinimoMinutos:135 },
  // poco comunes (14) — 150 a 550 min
  { id:'fox', name:'Zorro', emoji:'🦊', rarity:'uncommon', habitat:'bosque', tiempoMinimoMinutos:150 },
  { id:'raccoon', name:'Mapache', emoji:'🦝', rarity:'uncommon', habitat:'bosque', tiempoMinimoMinutos:175 },
  { id:'owl', name:'Búho', emoji:'🦉', rarity:'uncommon', habitat:'bosque', tiempoMinimoMinutos:200 },
  { id:'zebra', name:'Cebra', emoji:'🦓', rarity:'uncommon', habitat:'sabana', tiempoMinimoMinutos:230 },
  { id:'giraffe', name:'Jirafa', emoji:'🦒', rarity:'uncommon', habitat:'sabana', tiempoMinimoMinutos:260 },
  { id:'pelican', name:'Pelícano', emoji:'🦤', rarity:'uncommon', habitat:'oceano', tiempoMinimoMinutos:290 },
  { id:'koala', name:'Koala', emoji:'🐨', rarity:'uncommon', habitat:'selva', tiempoMinimoMinutos:320 },
  { id:'otter', name:'Nutria', emoji:'🦦', rarity:'uncommon', habitat:'oceano', tiempoMinimoMinutos:350 },
  { id:'bison', name:'Bisonte', emoji:'🦬', rarity:'uncommon', habitat:'sabana', tiempoMinimoMinutos:385 },
  { id:'camel', name:'Camello', emoji:'🐫', rarity:'uncommon', habitat:'desierto', tiempoMinimoMinutos:420 },
  { id:'llama', name:'Llama', emoji:'🦙', rarity:'uncommon', habitat:'montana', tiempoMinimoMinutos:455 },
  { id:'parrot', name:'Loro', emoji:'🦜', rarity:'uncommon', habitat:'selva', tiempoMinimoMinutos:490 },
  { id:'flamingo', name:'Flamenco', emoji:'🦩', rarity:'uncommon', habitat:'sabana', tiempoMinimoMinutos:520 },
  { id:'bat', name:'Murciélago', emoji:'🦇', rarity:'uncommon', habitat:'bosque', tiempoMinimoMinutos:550 },
  // raros (9) — 600 a 1230 min
  { id:'lion', name:'León', emoji:'🦁', rarity:'rare', habitat:'sabana', tiempoMinimoMinutos:600 },
  { id:'wolf', name:'Lobo', emoji:'🐺', rarity:'rare', habitat:'bosque', tiempoMinimoMinutos:675 },
  { id:'tiger', name:'Tigre', emoji:'🐯', rarity:'rare', habitat:'selva', tiempoMinimoMinutos:750 },
  { id:'penguin', name:'Pingüino', emoji:'🐧', rarity:'rare', habitat:'polar', tiempoMinimoMinutos:830 },
  { id:'dolphin', name:'Delfín', emoji:'🐬', rarity:'rare', habitat:'oceano', tiempoMinimoMinutos:910 },
  { id:'polarbear', name:'Oso Polar', emoji:'🐻‍❄️', rarity:'rare', habitat:'polar', tiempoMinimoMinutos:990 },
  { id:'jaguar', name:'Jaguar', emoji:'🐆', rarity:'rare', habitat:'selva', tiempoMinimoMinutos:1070 },
  { id:'orca', name:'Orca', emoji:'🐋', rarity:'rare', habitat:'oceano', tiempoMinimoMinutos:1150 },
  { id:'chameleon', name:'Camaleón', emoji:'🦎', rarity:'rare', habitat:'selva', tiempoMinimoMinutos:1230 },
  // épicos (5) — 1350 a 2200 min
  { id:'elephant', name:'Elefante', emoji:'🐘', rarity:'epic', habitat:'sabana', tiempoMinimoMinutos:1350 },
  { id:'shark', name:'Tiburón', emoji:'🦈', rarity:'epic', habitat:'oceano', tiempoMinimoMinutos:1550 },
  { id:'redpanda', name:'Panda Rojo', emoji:'🐼', rarity:'epic', habitat:'selva', tiempoMinimoMinutos:1750 },
  { id:'eagle', name:'Águila Real', emoji:'🦅', rarity:'epic', habitat:'polar', tiempoMinimoMinutos:1950 },
  { id:'rhino', name:'Rinoceronte', emoji:'🦏', rarity:'epic', habitat:'sabana', tiempoMinimoMinutos:2200 },
  // legendarios (2) — 2700 y 3800 min
  { id:'dragon', name:'Dragón', emoji:'🐉', rarity:'legendary', habitat:'fantasia', tiempoMinimoMinutos:2700 },
  { id:'unicorn', name:'Unicornio', emoji:'🦄', rarity:'legendary', habitat:'fantasia', tiempoMinimoMinutos:3800 },
];

const HABITATS = [
  { id:'bosque',   label:'Bosque',   emoji:'🌲' },
  { id:'granja',   label:'Granja',   emoji:'🚜' },
  { id:'selva',    label:'Selva',    emoji:'🌴' },
  { id:'sabana',   label:'Sabana',   emoji:'🌾' },
  { id:'oceano',   label:'Océano',   emoji:'🌊' },
  { id:'polar',    label:'Polar',    emoji:'❄️' },
  { id:'desierto', label:'Desierto', emoji:'🏜️' },
  { id:'montana',  label:'Montaña',  emoji:'⛰️' },
  { id:'fantasia', label:'Fantasía', emoji:'✨' },
];

// Central config for the playable Zoo Tycoon-style map (etapa 3). Kept
// together for easy rebalancing, same pattern as SHOP_* tables.
const MAP_COLS = 6;
const MAP_ROWS_TOTAL = 12;
const MAP_STARTING_ROWS = 2;
const MAP_MINUTES_PER_ROW_UNLOCK = 60; // cada 60 min de estudio acumulados desbloquea una fila más

function getUnlockedMapRows(totalStudyMinutes){
  return Math.min(MAP_ROWS_TOTAL, MAP_STARTING_ROWS + Math.floor(totalStudyMinutes / MAP_MINUTES_PER_ROW_UNLOCK));
}

const RARITY_META = {
  common:    { label:'Común',      color:'var(--common)'    },
  uncommon:  { label:'Poco común', color:'var(--uncommon)'  },
  rare:      { label:'Raro',       color:'var(--rare)'      },
  epic:      { label:'Épico',      color:'var(--epic)'      },
  legendary: { label:'Legendario', color:'var(--legendary)' },
};

const FOOD_PER_5MIN = 1;

// ---- Zoo economy: "Huellitas" (coins), earned 1 per minute studied
// (every minute, not just extra — separate from the food/extra-minutes
// system above). Central pricing table so balance tweaks live in one
// place instead of scattered through the shop UI.
const COIN_NAME = 'Huellita';
const COIN_NAME_PLURAL = 'Huellitas';
const COIN_EMOJI = '🐾';
const COINS_PER_STUDY_MINUTE = 1;

const SHOP_FOOD_BUNDLES = [
  { id:'small', label:'Fardo Pequeño', emoji:'🌾', foodAmount:3, price:15 },
  { id:'medium', label:'Fardo Mediano', emoji:'🌾', foodAmount:8, price:35 },
  { id:'large', label:'Fardo Grande', emoji:'🌾', foodAmount:20, price:80 },
];

const SHOP_ANIMAL_PRICE_BY_RARITY = {
  common: 120,
  uncommon: 320,
  rare: 750,
  epic: 1800,
  legendary: 5000,
};

// Cosmetic only — no habitat restriction, placeable on any unlocked empty
// tile regardless of terrain.
const SHOP_DECORATIONS = [
  { id:'flowers', label:'Flores',          emoji:'🌸', price:25 },
  { id:'rock',    label:'Roca',            emoji:'🪨', price:30 },
  { id:'tree',    label:'Árbol',           emoji:'🌳', price:40 },
  { id:'lantern', label:'Farolito',        emoji:'🏮', price:60 },
  { id:'fountain',label:'Fuente',          emoji:'⛲', price:90 },
  { id:'cabin',   label:'Cabañita',        emoji:'🛖', price:150 },
  { id:'tent',    label:'Carpa de feria',  emoji:'🎪', price:220 },
  { id:'statue',  label:'Estatua',         emoji:'🗿', price:300 },
];

/* ============ STORAGE ============ */

const STORAGE_KEY = 'study-zoo-state-v1';

function defaultState(){
  return {
    config: {
      studyMin: 25, breakMin: 5, autoTransition: true,
      progressWarnEnabled: true, progressWarnThresholdSec: 10,
      theme: 'dark', timerLayout: 'circular', completionSound: 'clasico', soundMuted: false,
      vibrationEnabled: true,
    },
    timer: { phase: 'study', status: 'idle', endTime: null, remainingMs: 25*60*1000, extraMs: 0 },
    stats: {
      sessionsToday: 0, lastSessionDateKey: null, streak: 0,
      totalStudyMinutes: 0, totalSessions: 0,
      totalFoodEarned: 0, totalFoodUsed: 0,
      totalCoinsEarned: 0, totalCoinsSpent: 0,
    },
    food: 0,
    coins: 0,
    animals: [],
    unlockedSpeciesIds: [], // time-threshold reached, purchasable in the shop but not yet owned
    sessionLog: [], // { ts, dateKey, minutes }
    decorationInventory: {}, // decorationId -> total count owned (placed + unplaced)
    map: {
      tiles: {},        // "x_y" -> habitatId painted on that tile (absent = no terrain yet)
      placements: {},   // "x_y" -> animal instance id placed on that tile
      decorations: {},  // "x_y" -> decorationId placed on that tile
    },
  };
}

// Shared by both the local-storage loader and the Firestore loader (same
// state shape either way) so old/partial saves always end up with every
// field the current version of the app expects.
function normalizeState(parsed){
  const base = defaultState();
  return {
    ...base,
    ...parsed,
    config: { ...base.config, ...(parsed.config||{}) },
    timer: { ...base.timer, ...(parsed.timer||{}) },
    stats: { ...base.stats, ...(parsed.stats||{}) },
    sessionLog: parsed.sessionLog || [],
    unlockedSpeciesIds: parsed.unlockedSpeciesIds || [],
    decorationInventory: parsed.decorationInventory || {},
    map: {
      tiles: (parsed.map && parsed.map.tiles) || {},
      placements: (parsed.map && parsed.map.placements) || {},
      decorations: (parsed.map && parsed.map.decorations) || {},
    },
  };
}

async function loadState(){
  try{
    const raw = await storage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    return normalizeState(JSON.parse(raw));
  }catch(e){ return defaultState(); }
}

/* ============ HELPERS ============ */

function dateKey(d = new Date()){
  return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
}

function daysBetween(key1, key2){
  if(!key1 || !key2) return Infinity;
  const [y1,m1,d1] = key1.split('-').map(Number);
  const [y2,m2,d2] = key2.split('-').map(Number);
  const t1 = Date.UTC(y1,m1-1,d1);
  const t2 = Date.UTC(y2,m2-1,d2);
  return Math.round((t2 - t1) / 86400000);
}

function fmtTime(ms){
  const totalSec = Math.max(0, Math.ceil(ms/1000));
  const m = Math.floor(totalSec/60);
  const s = totalSec%60;
  return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}

// Species whose time threshold `totalMinutes` has now crossed, that aren't
// already owned AND aren't already sitting in the shop as purchasable —
// i.e. species that should newly become available to buy. Sorted so the
// lowest threshold reveals first (toast queue order).
function getNewlyAvailableSpecies(totalMinutes, ownedAnimals, unlockedSpeciesIds){
  const knownIds = new Set([...ownedAnimals.map(a => a.speciesId), ...unlockedSpeciesIds]);
  return SPECIES
    .filter(s => s.tiempoMinimoMinutos <= totalMinutes && !knownIds.has(s.id))
    .sort((a, b) => a.tiempoMinimoMinutos - b.tiempoMinimoMinutos);
}

// Defaults to the species' own name (e.g. "Conejo") rather than a random
// pet name — the user names their own animals via AnimalDetailModal.
function makeAnimalInstance(species){
  const now = Date.now();
  return {
    id: 'a_' + now + '_' + Math.floor(Math.random()*100000),
    speciesId: species.id,
    name: species.name,
    obtainedAt: now,
    lastFed: now,
    feedCount: 0,
    salud: 100,
    lastCleaned: now,
    lastPetted: now,
  };
}

// ---- Extra care (etapa "cuidados"), on top of hambre: limpieza (suciedad
// builds up over time, tap "Limpiar" to reset it) and cariño (atención
// drains over time, tap "Acariciar" to reset it). Both free/no-cooldown —
// tapping when already at 0/100 is just a harmless no-op — deliberately
// kept to two simple time-decayed stats instead of a bigger system, per
// the brief ("sin sobrecargar la mecánica").
function computeSuciedad(animal){
  const hoursSince = (Date.now() - (animal.lastCleaned ?? animal.obtainedAt)) / 3600000;
  const suciedad = (hoursSince / 24) * 25; // +25 puntos cada 24h
  return Math.max(0, Math.min(100, Math.round(suciedad)));
}

function computeAtencion(animal){
  const hoursSince = (Date.now() - (animal.lastPetted ?? animal.obtainedAt)) / 3600000;
  const atencion = 100 - (hoursSince / 24) * 25; // -25 puntos cada 24h
  return Math.max(0, Math.min(100, Math.round(atencion)));
}

// Overall well-being combining every care stat — this is what actually
// dims the animal's appearance on the map, not any single stat on its
// own, so a couple of neglected axes read as "not doing great" rather
// than needing to check four separate bars.
function computeHappiness(animal){
  const hunger = computeHunger(animal);
  const suciedad = computeSuciedad(animal);
  const atencion = computeAtencion(animal);
  const salud = animal.salud ?? 100;
  return Math.round((hunger + (100 - suciedad) + atencion + salud) / 4);
}

// ---- Health (etapa "cuidados"): a placed animal on the wrong terrain
// loses salud over time instead of being blocked from placement outright —
// the player makes the call, with a warning first. Central so the pacing
// is easy to rebalance later, same pattern as the shop's price tables.
const HEALTH_TICK_MS = 10000;       // how often placed animals' salud is settled
const HEALTH_DECAY_PER_TICK = 1;    // salud lost per tick in the wrong habitat (~16-17 min to 0 from full)
const HEALTH_RECOVERY_PER_TICK = 1; // salud regained per tick once moved back to the right habitat

// Which map tile (if any) an animal is currently placed on, or null if
// it's still unplaced in the tray.
function findAnimalPlacementKey(mapState, animalId){
  return Object.keys(mapState.placements).find(k => mapState.placements[k] === animalId) || null;
}

function isAnimalInWrongHabitat(animal, mapState){
  const key = findAnimalPlacementKey(mapState, animal.id);
  if(!key) return false;
  const terrain = mapState.tiles[key];
  const species = SPECIES.find(s => s.id === animal.speciesId);
  return terrain !== species.habitat;
}

function healthState(salud){
  if(salud >= 60) return { label:'Sana', emoji:'', color:'var(--accent-2)' };
  if(salud >= 25) return { label:'Débil', emoji:'😷', color:'var(--rare)' };
  return { label:'Grave', emoji:'🚨', color:'var(--danger)' };
}

// Etapas de crecimiento visual según cuántas veces se alimentó al animal.
// Reutiliza el sistema de comida existente — no agrega ninguna mecánica nueva.
const GROWTH_ADULT_FEEDS = 3;
const GROWTH_SHINY_FEEDS = 8;

function growthStage(animal){
  const count = animal.feedCount || 0;
  if(count >= GROWTH_SHINY_FEEDS) return { key:'shiny', label:'Brillante', emoji:'✨', feedsToNext:null };
  if(count >= GROWTH_ADULT_FEEDS) return { key:'adult', label:'Adulto', emoji:'', feedsToNext: GROWTH_SHINY_FEEDS - count };
  return { key:'baby', label:'Bebé', emoji:'🍼', feedsToNext: GROWTH_ADULT_FEEDS - count };
}

function computeHunger(animal){
  const hoursSince = (Date.now() - animal.lastFed) / 3600000;
  const hunger = 100 - (hoursSince / 24) * 20; // -20 puntos cada 24h
  return Math.max(0, Math.min(100, Math.round(hunger)));
}

function hungerState(hunger){
  if(hunger >= 70) return { label:'Feliz', emoji:'😄', color:'var(--accent-2)' };
  if(hunger >= 35) return { label:'Normal', emoji:'🙂', color:'var(--accent)' };
  return { label:'Triste', emoji:'🥺', color:'var(--text-dim)' };
}

function phaseDurationMs(phase, cfg, extraMs){
  const base = (phase === 'study' ? cfg.studyMin : cfg.breakMin) * 60000;
  return base + (extraMs || 0);
}

function getRemainingMs(timer){
  if(timer.status === 'running' && timer.endTime){
    return timer.endTime - Date.now();
  }
  return timer.remainingMs;
}

/* ============ APP ============ */

export default function App(){
  const [state, setState] = useState(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('timer');
  const [unlockQueue, setUnlockQueue] = useState([]); // [{ species, instance }] shown one at a time
  const [selectedAnimalId, setSelectedAnimalId] = useState(null);
  const [toast, setToast] = useState(null);
  const [authUser, setAuthUser] = useState(null); // null = guest
  const [authChecking, setAuthChecking] = useState(false);
  const audioCtxRef = useRef(null);
  const [, forceTick] = useState(0);

  const finishLoading = useCallback((s) => {
    // Catches up any species whose threshold is already covered by
    // previously accumulated minutes (e.g. thresholds changed, migrating
    // from an older save, or just-downloaded cloud progress) — added to
    // the shop's purchasable list silently, no toast, since it's not tied
    // to a just-completed session.
    const newlyAvailable = getNewlyAvailableSpecies(s.stats.totalStudyMinutes, s.animals, s.unlockedSpeciesIds);
    const patched = newlyAvailable.length > 0
      ? { ...s, unlockedSpeciesIds: [...s.unlockedSpeciesIds, ...newlyAvailable.map(sp => sp.id)] }
      : s;
    setState(patched);
    setReady(true);
  }, []);

  // Auth state drives where progress loads from: guest → local storage
  // (Preferences/localStorage), logged in → Firestore. On login, cloud
  // progress wins if it exists; if the account has no cloud doc yet (a
  // brand-new account, or the guest just registered), the current local
  // progress is uploaded as its starting point — that's the "migrate
  // guest progress into the new account" behavior, with no special-casing
  // needed beyond this one load path.
  useEffect(() => {
    let cancelled = false;
    const unsub = onAuthChange(async (user) => {
      if(cancelled) return;
      // Set together (both before the first await) so React batches them
      // into one update — the persist effect below must see authChecking
      // flip to true in the SAME render as authUser changes, or it can
      // slip in one write of the still-stale local state to the new
      // account's cloud doc before the real cloud/local load below finishes.
      setAuthChecking(true);
      setAuthUser(user);
      try{
        if(user){
          const cloud = await fetchCloudState(user.uid);
          if(cloud){
            finishLoading(normalizeState(cloud));
          } else {
            const localRaw = await storage.getItem(STORAGE_KEY);
            const seed = localRaw ? normalizeState(JSON.parse(localRaw)) : defaultState();
            await saveCloudState(user.uid, seed);
            finishLoading(seed);
          }
        } else {
          finishLoading(await loadState());
        }
      } catch(e){
        // Firestore unreachable/misconfigured (e.g. security rules not set
        // up yet) shouldn't strand the user on a loading screen forever —
        // fall back to local progress so the app is still usable.
        finishLoading(await loadState());
      } finally {
        if(!cancelled) setAuthChecking(false);
      }
    });
    return () => { cancelled = true; unsub(); };
  }, [finishLoading]);

  // Mobile web signs in via a full-page redirect (see loginWithGoogle in
  // firebase.js) instead of a popup, so there's no login modal left open on
  // the page load that comes back from Google to show an inline error the
  // way the popup/email flows do — surface it as a toast here instead. A
  // successful result doesn't need handling: onAuthChange above already
  // picks up the signed-in user on its own.
  useEffect(() => {
    checkGoogleRedirectResult().catch(e => showToast(authErrorMessage(e)));
  }, []);

  // Persist on every change, once the initial load has completed: always
  // to the local cache (so the app still works offline / as a fallback),
  // and additionally to Firestore when signed in. Skipped while an auth
  // transition is in flight (see above) to avoid writing stale state.
  useEffect(() => {
    if(!ready || !state || authChecking) return;
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    if(authUser){
      saveCloudState(authUser.uid, state);
    }
  }, [state, ready, authUser, authChecking]);

  // Theme is applied as a class on <body> so every CSS custom property
  // (--bg, --card, --primary, …) resolves to the selected palette.
  useEffect(() => {
    if(!state) return;
    document.body.className = 'theme-' + (state.config.theme || 'dark');
  }, [state && state.config.theme]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const playTone = useCallback((freq, durationSec, peakGain) => {
    try{
      if(!audioCtxRef.current){
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(peakGain, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + durationSec + 0.05);
    }catch(e){ /* audio not available */ }
  }, []);

  // "Phase complete" sound — user picks one of a few variants in Config.
  const playCompletionSound = useCallback((soundKey) => {
    switch(soundKey){
      case 'campana':
        playTone(1046, 0.3, 0.22);
        setTimeout(() => playTone(1568, 0.4, 0.2), 140);
        break;
      case 'suave':
        playTone(523, 0.8, 0.15);
        break;
      case 'alerta':
        playTone(1000, 0.12, 0.22);
        setTimeout(() => playTone(1000, 0.12, 0.22), 160);
        setTimeout(() => playTone(1000, 0.12, 0.22), 320);
        break;
      case 'clasico':
      default:
        playTone(880, 0.5, 0.25);
    }
  }, [playTone]);

  // Subtler, shorter tick used for the progressive countdown warning —
  // deliberately different from the completion sounds so the two are
  // distinguishable regardless of which completion sound is selected.
  const playWarningTick = useCallback(() => playTone(1400, 0.12, 0.15), [playTone]);

  // Finishing a full STUDY session is the moment that matters most, so it
  // gets its own louder, busier three-note chime instead of whichever of
  // the four regular completionSound options is selected — replaces it
  // rather than layering on top, so the user hears one clear signal, not
  // two overlapping sounds.
  const playStudyCompleteSound = useCallback(() => {
    playTone(784, 0.18, 0.36);
    setTimeout(() => playTone(988, 0.18, 0.36), 130);
    setTimeout(() => playTone(1318, 0.55, 0.38), 260);
  }, [playTone]);

  // Works reliably in the native Android app (real vibration motor via the
  // native bridge, unaffected by browser policy). On the web/PWA build,
  // browsers require "transient activation" (a recent tap) for the
  // Vibration API — since the timer finishes minutes after the last tap
  // that started it, mobile browsers will usually silently block this
  // there. That's an inherent browser limitation, not something fixable
  // from here, hence the silent catch.
  const triggerStudyCompleteHaptics = useCallback(async () => {
    try{ await Haptics.vibrate({ duration: 400 }); }
    catch(e){ /* vibration not available/blocked on this device/browser */ }
  }, []);

  // newlyAvailableSpeciesIds are species whose time threshold this session
  // just crossed — they become purchasable in the shop, not owned outright
  // (buying them is a separate step, see buyAnimal below).
  const registerCompletedSession = useCallback((extraMinutes, newlyAvailableSpeciesIds) => {
    setState(prev => {
      if(!prev) return prev;
      const todayKey = dateKey();
      const minutes = prev.config.studyMin + extraMinutes;
      let streak = prev.stats.streak;
      let sessionsToday = prev.stats.sessionsToday;
      if(prev.stats.lastSessionDateKey === todayKey){
        sessionsToday += 1;
      } else {
        const diff = daysBetween(prev.stats.lastSessionDateKey, todayKey);
        streak = (diff === 1) ? streak + 1 : 1;
        sessionsToday = 1;
      }
      const coinsEarned = minutes * COINS_PER_STUDY_MINUTE;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          sessionsToday,
          streak,
          lastSessionDateKey: todayKey,
          totalStudyMinutes: prev.stats.totalStudyMinutes + minutes,
          totalSessions: prev.stats.totalSessions + 1,
          totalCoinsEarned: prev.stats.totalCoinsEarned + coinsEarned,
        },
        coins: prev.coins + coinsEarned,
        sessionLog: [...prev.sessionLog, { ts: Date.now(), dateKey: todayKey, minutes }],
        unlockedSpeciesIds: [...prev.unlockedSpeciesIds, ...newlyAvailableSpeciesIds],
      };
    });
  }, []);

  /* ---- Timer tick ---- */
  const timerStatus = state ? state.timer.status : null;
  useEffect(() => {
    if(timerStatus !== 'running') return;
    const id = setInterval(() => forceTick(t => t+1), 250);
    return () => clearInterval(id);
  }, [timerStatus]);

  // Re-render immediately when the app comes back to the foreground so the
  // countdown doesn't look frozen after the OS suspended JS execution.
  useEffect(() => {
    if(!Capacitor.isNativePlatform()) return;
    const sub = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if(isActive) forceTick(t => t+1);
    });
    return () => { sub.remove(); };
  }, []);

  // Persistent countdown notification (Android only — a no-op elsewhere,
  // see lib/timerNotification.js). Re-fires on phase change too since the
  // effect depends on timer.phase — that pushes a fresh label + endTime,
  // which restarts the notification's native chronometer for the new
  // phase. Stopped whenever the timer isn't actively running (paused,
  // reset, or idle after a manual stop) per the spec: the notification
  // must disappear the moment the user stops the timer themselves.
  useEffect(() => {
    if(!state) return;
    if(state.timer.status === 'running' && state.timer.endTime){
      startOrUpdateTimerNotification(
        state.timer.phase === 'study' ? 'Estudio' : 'Descanso',
        state.timer.endTime
      );
    } else {
      stopTimerNotification();
    }
  }, [state && state.timer.status, state && state.timer.phase, state && state.timer.endTime]);

  // Intentionally not memoized: must recompute every tick (every 250ms while
  // running) against Date.now(), even though state.timer itself doesn't change.
  const remainingMs = state ? getRemainingMs(state.timer) : 0;

  // Progressive countdown warning (foreground). Tracks which WARNING_POINTS
  // have already played for the current phase run, so each point only
  // fires once even though this checks on every 250ms tick.
  const firedWarningPointsRef = useRef(new Set());
  useEffect(() => {
    firedWarningPointsRef.current = new Set();
  }, [state && state.timer.endTime]);

  useEffect(() => {
    if(!state) return;
    if(state.timer.status !== 'running') return;
    if(state.config.progressWarnEnabled === false) return;
    const threshold = state.config.progressWarnThresholdSec || 10;
    const secondsRemaining = Math.ceil(remainingMs / 1000);
    if(secondsRemaining <= 0) return;
    if(!WARNING_POINTS.includes(secondsRemaining)) return;
    if(secondsRemaining > threshold) return;
    if(firedWarningPointsRef.current.has(secondsRemaining)) return;
    firedWarningPointsRef.current.add(secondsRemaining);
    if(!state.config.soundMuted) playWarningTick();
  }, [remainingMs, state && state.timer.status]);

  // handle natural completion
  useEffect(() => {
    if(!state) return;
    if(state.timer.status === 'running' && remainingMs <= 0){
      const finishedPhase = state.timer.phase;
      const extraMinutes = Math.round((state.timer.extraMs || 0) / 60000);
      if(!state.config.soundMuted){
        if(finishedPhase === 'study') playStudyCompleteSound();
        else playCompletionSound(state.config.completionSound || 'clasico');
      }
      if(finishedPhase === 'study' && state.config.vibrationEnabled !== false) triggerStudyCompleteHaptics();
      cancelAllNotifications();
      if(finishedPhase === 'study'){
        const minutes = state.config.studyMin + extraMinutes;
        const newTotal = state.stats.totalStudyMinutes + minutes;
        const newlyAvailableSpecies = getNewlyAvailableSpecies(newTotal, state.animals, state.unlockedSpeciesIds);
        registerCompletedSession(extraMinutes, newlyAvailableSpecies.map(sp => sp.id));
        if(newlyAvailableSpecies.length === 1){
          showToast(`🛒 ¡${newlyAvailableSpecies[0].name} ya está disponible en la tienda!`);
        } else if(newlyAvailableSpecies.length > 1){
          showToast(`🛒 ¡${newlyAvailableSpecies.length} animales nuevos disponibles en la tienda!`);
        } else {
          showToast('¡Sesión de estudio completada!');
        }
      } else {
        showToast('Descanso terminado. ¡A seguir!');
      }
      const nextPhase = finishedPhase === 'study' ? 'break' : 'study';
      setState(prev => {
        if(!prev) return prev;
        const nextDuration = phaseDurationMs(nextPhase, prev.config, 0);
        const autoRun = prev.config.autoTransition !== false;
        if(autoRun){
          const nextEndTime = Date.now() + nextDuration;
          scheduleAllNotifications(nextEndTime, nextPhase, prev.config);
          return {
            ...prev,
            timer: { phase: nextPhase, status: 'running', endTime: nextEndTime, remainingMs: nextDuration, extraMs: 0 },
          };
        }
        return {
          ...prev,
          timer: { phase: nextPhase, status: 'idle', endTime: null, remainingMs: nextDuration, extraMs: 0 },
        };
      });
    }
  }, [remainingMs, state && state.timer.status]);

  // Health ticks independently of the study timer — a placed animal loses
  // salud on a wrong-habitat tile (or recovers it back on a correct one)
  // in the background regardless of whether a study/break session is
  // running. Reads/writes via stateRef instead of depending on `state`
  // directly so the interval isn't torn down and recreated every render
  // (which happens often — e.g. every 250ms while the study timer ticks).
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => {
    const id = setInterval(() => {
      const s = stateRef.current;
      if(!s) return;
      const deaths = [];
      let anyChange = false;
      const updatedAnimals = [];
      for(const a of s.animals){
        const key = findAnimalPlacementKey(s.map, a.id);
        if(!key){ updatedAnimals.push(a); continue; }
        const terrain = s.map.tiles[key];
        const species = SPECIES.find(sp => sp.id === a.speciesId);
        const current = a.salud ?? 100;
        const mismatched = terrain !== species.habitat;
        let next = current;
        if(mismatched) next = Math.max(0, current - HEALTH_DECAY_PER_TICK);
        else if(current < 100) next = Math.min(100, current + HEALTH_RECOVERY_PER_TICK);
        if(next !== current) anyChange = true;
        if(next <= 0){ deaths.push(a); continue; }
        updatedAnimals.push(next === current ? a : { ...a, salud: next });
      }
      if(!anyChange && deaths.length === 0) return;
      const deadIds = deaths.map(a => a.id);
      const deadSpeciesIds = deaths.map(a => a.speciesId);
      const placements = { ...s.map.placements };
      Object.keys(placements).forEach(k => { if(deadIds.includes(placements[k])) delete placements[k]; });
      setState({
        ...s,
        animals: updatedAnimals,
        map: { ...s.map, placements },
        unlockedSpeciesIds: s.unlockedSpeciesIds.filter(id => !deadSpeciesIds.includes(id)),
      });
      deaths.forEach(a => {
        const species = SPECIES.find(sp => sp.id === a.speciesId);
        showToast(`💀 ${a.name} (${species.name}) murió por estar en el hábitat equivocado. Vas a tener que volver a conseguirlo.`);
      });
    }, HEALTH_TICK_MS);
    return () => clearInterval(id);
  }, []);

  /* ---- Timer controls ---- */
  const startTimer = () => {
    setState(prev => {
      if(!prev) return prev;
      const endTime = Date.now() + prev.timer.remainingMs;
      scheduleAllNotifications(endTime, prev.timer.phase, prev.config);
      return { ...prev, timer: { ...prev.timer, status:'running', endTime } };
    });
  };
  const pauseTimer = () => {
    cancelAllNotifications();
    setState(prev => {
      if(!prev || prev.timer.status !== 'running') return prev;
      const rem = prev.timer.endTime - Date.now();
      return { ...prev, timer: { ...prev.timer, status:'paused', remainingMs: Math.max(0,rem), endTime: null } };
    });
  };
  const resetPhase = () => {
    cancelAllNotifications();
    setState(prev => {
      if(!prev) return prev;
      return {
        ...prev,
        timer: {
          phase: prev.timer.phase,
          status: 'idle',
          endTime: null,
          remainingMs: phaseDurationMs(prev.timer.phase, prev.config, 0),
          extraMs: 0,
        },
      };
    });
  };
  const skipPhase = () => {
    cancelAllNotifications();
    setState(prev => {
      if(!prev) return prev;
      const next = prev.timer.phase === 'study' ? 'break' : 'study';
      return {
        ...prev,
        timer: { phase: next, status:'idle', endTime:null, remainingMs: phaseDurationMs(next, prev.config, 0), extraMs: 0 },
      };
    });
  };
  const extendSession = (minutes) => {
    setState(prev => {
      if(!prev || prev.timer.phase !== 'study') return prev;
      const addMs = minutes * 60000;
      const foodGain = Math.floor(minutes / 5) * FOOD_PER_5MIN;
      const t = prev.timer;
      let newTimer;
      if(t.status === 'running' && t.endTime){
        const newEndTime = t.endTime + addMs;
        newTimer = { ...t, endTime: newEndTime, extraMs: (t.extraMs||0) + addMs };
        cancelAllNotifications();
        scheduleAllNotifications(newEndTime, t.phase, prev.config);
      } else {
        newTimer = { ...t, remainingMs: t.remainingMs + addMs, extraMs: (t.extraMs||0) + addMs };
      }
      return {
        ...prev,
        timer: newTimer,
        food: prev.food + foodGain,
        stats: { ...prev.stats, totalFoodEarned: prev.stats.totalFoodEarned + foodGain },
      };
    });
    if(Math.floor(minutes/5) > 0) showToast('+' + Math.floor(minutes/5) + ' 🍖 comida por estudiar extra');
  };

  const updateConfig = (studyMin, breakMin) => {
    setState(prev => {
      if(!prev) return prev;
      const timerIsDefault = prev.timer.status === 'idle';
      return {
        ...prev,
        config: { ...prev.config, studyMin, breakMin },
        timer: timerIsDefault
          ? { ...prev.timer, remainingMs: phaseDurationMs(prev.timer.phase, {studyMin, breakMin}, 0), extraMs:0 }
          : prev.timer,
      };
    });
  };

  // Generic setter for standalone preferences (autoTransition, theme, sounds…)
  // that shouldn't touch the timer's current remaining time.
  const patchConfig = (patch) => {
    setState(prev => {
      if(!prev) return prev;
      return { ...prev, config: { ...prev.config, ...patch } };
    });
  };

  const feedAnimal = (animalId) => {
    setState(prev => {
      if(!prev || prev.food <= 0) return prev;
      return {
        ...prev,
        food: prev.food - 1,
        animals: prev.animals.map(a => a.id === animalId
          ? { ...a, lastFed: Date.now(), feedCount: (a.feedCount||0) + 1 }
          : a),
        stats: { ...prev.stats, totalFoodUsed: prev.stats.totalFoodUsed + 1 },
      };
    });
    showToast('¡Animal alimentado! 🍖');
  };

  const cleanAnimal = (animalId) => {
    setState(prev => {
      if(!prev) return prev;
      return {
        ...prev,
        animals: prev.animals.map(a => a.id === animalId ? { ...a, lastCleaned: Date.now() } : a),
      };
    });
    showToast('¡Animal limpiado! 🧼');
  };

  const petAnimal = (animalId) => {
    setState(prev => {
      if(!prev) return prev;
      return {
        ...prev,
        animals: prev.animals.map(a => a.id === animalId ? { ...a, lastPetted: Date.now() } : a),
      };
    });
    showToast('¡Le encantó! 🥰');
  };

  const renameAnimal = (animalId, newName) => {
    const trimmed = newName.trim();
    if(!trimmed) return;
    setState(prev => {
      if(!prev) return prev;
      return {
        ...prev,
        animals: prev.animals.map(a => a.id === animalId ? { ...a, name: trimmed } : a),
      };
    });
  };

  // Affordability is decided from the `state` already rendered on screen
  // (not from inside the setState updater) because the timer tick effect
  // fires setState very frequently — when a tick update is already pending,
  // React defers the updater instead of running it eagerly, so reading a
  // `bought` flag set inside the updater right after calling setState is
  // unreliable and can silently show the wrong toast / skip the modal.
  const buyFoodBundle = (bundleId) => {
    const bundle = SHOP_FOOD_BUNDLES.find(b => b.id === bundleId);
    if(!bundle) return;
    if(state.coins < bundle.price){
      showToast(`Te faltan ${COIN_NAME_PLURAL.toLowerCase()} para eso`);
      return;
    }
    setState(prev => {
      if(!prev || prev.coins < bundle.price) return prev;
      return {
        ...prev,
        coins: prev.coins - bundle.price,
        food: prev.food + bundle.foodAmount,
        stats: {
          ...prev.stats,
          totalFoodEarned: prev.stats.totalFoodEarned + bundle.foodAmount,
          totalCoinsSpent: prev.stats.totalCoinsSpent + bundle.price,
        },
      };
    });
    showToast(`+${bundle.foodAmount} 🍖 comida comprada`);
  };

  const buyAnimal = (speciesId) => {
    const species = SPECIES.find(s => s.id === speciesId);
    if(!species || !state.unlockedSpeciesIds.includes(speciesId)) return;
    const price = SHOP_ANIMAL_PRICE_BY_RARITY[species.rarity];
    if(state.coins < price){
      showToast(`Te faltan ${COIN_NAME_PLURAL.toLowerCase()} para eso`);
      return;
    }
    const newInstance = makeAnimalInstance(species);
    setState(prev => {
      if(!prev || !prev.unlockedSpeciesIds.includes(speciesId) || prev.coins < price) return prev;
      return {
        ...prev,
        coins: prev.coins - price,
        animals: [...prev.animals, newInstance],
        unlockedSpeciesIds: prev.unlockedSpeciesIds.filter(id => id !== speciesId),
        stats: { ...prev.stats, totalCoinsSpent: prev.stats.totalCoinsSpent + price },
      };
    });
    setUnlockQueue(q => [...q, { species, instance: newInstance }]);
  };

  // Playable map (etapa 3/4). x/y are validated against the currently
  // unlocked area (derived from totalStudyMinutes, see getUnlockedMapRows)
  // so a stale/replayed click can't paint or place outside it. A tile can
  // hold terrain plus at most one occupant (an animal OR a decoration).
  const paintMapTerrain = (x, y, habitatId) => {
    const key = `${x}_${y}`;
    if(state.map.placements[key]){
      showToast('Sacá al animal de esta casilla antes de cambiar el terreno');
      return;
    }
    const unlockedRows = getUnlockedMapRows(state.stats.totalStudyMinutes);
    if(y >= unlockedRows) return;
    setState(prev => {
      if(!prev) return prev;
      return { ...prev, map: { ...prev.map, tiles: { ...prev.map.tiles, [key]: habitatId } } };
    });
  };

  const clearMapTerrain = (x, y) => {
    const key = `${x}_${y}`;
    if(state.map.placements[key]){
      showToast('Sacá al animal de esta casilla antes de cambiar el terreno');
      return;
    }
    setState(prev => {
      if(!prev) return prev;
      const tiles = { ...prev.map.tiles };
      delete tiles[key];
      return { ...prev, map: { ...prev.map, tiles } };
    });
  };

  const placeAnimalOnMap = (x, y, animalId) => {
    const key = `${x}_${y}`;
    const unlockedRows = getUnlockedMapRows(state.stats.totalStudyMinutes);
    if(y >= unlockedRows) return;
    if(state.map.placements[key] || state.map.decorations[key]){
      showToast('Esa casilla ya está ocupada');
      return;
    }
    const animal = state.animals.find(a => a.id === animalId);
    if(!animal) return;
    const species = SPECIES.find(s => s.id === animal.speciesId);
    const terrainHere = state.map.tiles[key];
    if(!terrainHere){
      showToast('Esta casilla no tiene terreno. ¡Pintá un hábitat primero!');
      return;
    }
    if(terrainHere !== species.habitat){
      const habitatNeeded = HABITATS.find(h => h.id === species.habitat);
      const ok = confirm(
        `⚠️ A ${species.name} no le gusta este hábitat — necesita ${habitatNeeded.label.toLowerCase()} ${habitatNeeded.emoji}. ` +
        `Su salud empezará a bajar mientras esté acá. ¿Seguro que querés dejarlo?`
      );
      if(!ok) return;
    }
    setState(prev => {
      if(!prev) return prev;
      return { ...prev, map: { ...prev.map, placements: { ...prev.map.placements, [key]: animalId } } };
    });
  };

  const removeAnimalFromMap = (x, y) => {
    const key = `${x}_${y}`;
    setState(prev => {
      if(!prev) return prev;
      const placements = { ...prev.map.placements };
      delete placements[key];
      return { ...prev, map: { ...prev.map, placements } };
    });
  };

  // Moving an already-placed animal to another tile (drag & drop, etapa 4)
  // re-runs the same habitat/occupancy checks as a fresh placement.
  const moveAnimalOnMap = (fromX, fromY, toX, toY) => {
    if(fromX === toX && fromY === toY) return;
    const fromKey = `${fromX}_${fromY}`;
    const toKey = `${toX}_${toY}`;
    const unlockedRows = getUnlockedMapRows(state.stats.totalStudyMinutes);
    if(toY >= unlockedRows) return;
    const animalId = state.map.placements[fromKey];
    if(!animalId) return;
    if(state.map.placements[toKey] || state.map.decorations[toKey]){
      showToast('Esa casilla ya está ocupada');
      return;
    }
    const animal = state.animals.find(a => a.id === animalId);
    const species = SPECIES.find(s => s.id === animal.speciesId);
    const terrainHere = state.map.tiles[toKey];
    if(!terrainHere){
      showToast('Esa casilla no tiene terreno. ¡Pintá un hábitat primero!');
      return;
    }
    if(terrainHere !== species.habitat){
      const habitatNeeded = HABITATS.find(h => h.id === species.habitat);
      const ok = confirm(
        `⚠️ A ${species.name} no le gusta este hábitat — necesita ${habitatNeeded.label.toLowerCase()} ${habitatNeeded.emoji}. ` +
        `Su salud empezará a bajar mientras esté acá. ¿Seguro que querés dejarlo?`
      );
      if(!ok) return;
    }
    setState(prev => {
      if(!prev) return prev;
      const placements = { ...prev.map.placements };
      delete placements[fromKey];
      placements[toKey] = animalId;
      return { ...prev, map: { ...prev.map, placements } };
    });
  };

  const buyDecoration = (decorationId) => {
    const decoration = SHOP_DECORATIONS.find(d => d.id === decorationId);
    if(!decoration) return;
    if(state.coins < decoration.price){
      showToast(`Te faltan ${COIN_NAME_PLURAL.toLowerCase()} para eso`);
      return;
    }
    setState(prev => {
      if(!prev || prev.coins < decoration.price) return prev;
      return {
        ...prev,
        coins: prev.coins - decoration.price,
        decorationInventory: {
          ...prev.decorationInventory,
          [decorationId]: (prev.decorationInventory[decorationId] || 0) + 1,
        },
        stats: { ...prev.stats, totalCoinsSpent: prev.stats.totalCoinsSpent + decoration.price },
      };
    });
    showToast(`${decoration.emoji} ${decoration.label} comprada`);
  };

  const placeDecorationOnMap = (x, y, decorationId) => {
    const key = `${x}_${y}`;
    const unlockedRows = getUnlockedMapRows(state.stats.totalStudyMinutes);
    if(y >= unlockedRows) return;
    if(state.map.placements[key] || state.map.decorations[key]){
      showToast('Esa casilla ya está ocupada');
      return;
    }
    const owned = state.decorationInventory[decorationId] || 0;
    const placedCount = Object.values(state.map.decorations).filter(id => id === decorationId).length;
    if(placedCount >= owned) return;
    setState(prev => {
      if(!prev) return prev;
      return { ...prev, map: { ...prev.map, decorations: { ...prev.map.decorations, [key]: decorationId } } };
    });
  };

  const removeDecorationFromMap = (x, y) => {
    const key = `${x}_${y}`;
    setState(prev => {
      if(!prev) return prev;
      const decorations = { ...prev.map.decorations };
      delete decorations[key];
      return { ...prev, map: { ...prev.map, decorations } };
    });
  };

  const moveDecorationOnMap = (fromX, fromY, toX, toY) => {
    if(fromX === toX && fromY === toY) return;
    const fromKey = `${fromX}_${fromY}`;
    const toKey = `${toX}_${toY}`;
    const unlockedRows = getUnlockedMapRows(state.stats.totalStudyMinutes);
    if(toY >= unlockedRows) return;
    const decorationId = state.map.decorations[fromKey];
    if(!decorationId) return;
    if(state.map.placements[toKey] || state.map.decorations[toKey]){
      showToast('Esa casilla ya está ocupada');
      return;
    }
    setState(prev => {
      if(!prev) return prev;
      const decorations = { ...prev.map.decorations };
      delete decorations[fromKey];
      decorations[toKey] = decorationId;
      return { ...prev, map: { ...prev.map, decorations } };
    });
  };

  const resetAllData = () => {
    cancelAllNotifications();
    setState(defaultState());
    showToast('Datos reiniciados');
  };

  // Auth actions. All of them just call Firebase and let the onAuthChange
  // listener (above) react — it already knows how to load the right state
  // for whichever user (or lack thereof) comes back. They return an error
  // message string on failure, or null on success, so the modal can show
  // it inline instead of throwing.
  const handleRegister = async (email, password) => {
    try{ await registerWithEmail(email, password); return null; }
    catch(e){ return authErrorMessage(e); }
  };
  const handleLogin = async (email, password) => {
    try{ await loginWithEmail(email, password); return null; }
    catch(e){ return authErrorMessage(e); }
  };
  const handleGoogleLogin = async () => {
    try{ await loginWithGoogle(); return null; }
    catch(e){ return authErrorMessage(e); }
  };
  // For the one-tap "Continuar con Google" button in Config's Cuenta
  // section — no modal is open there to show an inline error the way
  // AuthModal does, so surface failures as a toast instead.
  const handleGoogleLoginDirect = async () => {
    const err = await handleGoogleLogin();
    if(err) showToast(err);
  };
  const handleLogout = async () => {
    await firebaseLogout();
    showToast('Sesión cerrada');
  };
  const handleDeleteAccount = async () => {
    if(!confirm('¿Eliminar tu cuenta y todo tu progreso en la nube? Esta acción no se puede deshacer.')) return;
    try{
      await firebaseDeleteAccount();
      showToast('Cuenta eliminada');
    }catch(e){
      showToast(authErrorMessage(e));
    }
  };

  if(!ready || !state){
    return <div className="loading-screen">Cargando…</div>;
  }

  // Derived from live state (not a stored snapshot) so the detail modal
  // reflects feedCount/hunger changes immediately after feeding, without
  // needing to close and reopen it.
  const selectedAnimal = selectedAnimalId
    ? state.animals.find(a => a.id === selectedAnimalId) || null
    : null;

  return (
    <React.Fragment>
      <header className="app-header">
        <h1>🌴 Study Zoo</h1>
        <div className="header-pills">
          <div className="coin-pill">{COIN_EMOJI} <b>{state.coins}</b></div>
          <div className="streak-pill">🔥 <b>{state.stats.streak}</b> días</div>
        </div>
      </header>

      <main>
        {tab === 'timer' && (
          <TimerScreen
            state={state}
            remainingMs={Math.max(0, remainingMs)}
            onStart={startTimer}
            onPause={pauseTimer}
            onReset={resetPhase}
            onSkip={skipPhase}
            onExtend={extendSession}
          />
        )}
        {tab === 'zoo' && (
          <ZooScreen
            state={state}
            onSelect={(animal) => setSelectedAnimalId(animal.id)}
            onPaintTerrain={paintMapTerrain}
            onClearTerrain={clearMapTerrain}
            onPlaceAnimal={placeAnimalOnMap}
            onRemoveAnimal={removeAnimalFromMap}
            onMoveAnimal={moveAnimalOnMap}
            onPlaceDecoration={placeDecorationOnMap}
            onRemoveDecoration={removeDecorationFromMap}
            onMoveDecoration={moveDecorationOnMap}
          />
        )}
        {tab === 'shop' && (
          <ShopScreen
            state={state}
            onBuyFoodBundle={buyFoodBundle}
            onBuyAnimal={buyAnimal}
            onBuyDecoration={buyDecoration}
          />
        )}
        {tab === 'stats' && (
          <StatsScreen state={state} />
        )}
        {tab === 'config' && (
          <ConfigScreen
            state={state}
            onUpdateConfig={updateConfig}
            onPatchConfig={patchConfig}
            onPreviewSound={playCompletionSound}
            onResetAll={resetAllData}
            authUser={authUser}
            onRegister={handleRegister}
            onLogin={handleLogin}
            onGoogleLogin={handleGoogleLogin}
            onGoogleLoginDirect={handleGoogleLoginDirect}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
          />
        )}
      </main>

      <nav className="bottom-nav">
        <button className={tab==='timer'?'active':''} onClick={()=>setTab('timer')}>
          <span className="ic">⏱️</span> Temporizador
        </button>
        <button className={tab==='zoo'?'active':''} onClick={()=>setTab('zoo')}>
          <span className="ic">🦁</span> Zoológico
        </button>
        <button className={tab==='shop'?'active':''} onClick={()=>setTab('shop')}>
          <span className="ic">🛒</span> Tienda
        </button>
        <button className={tab==='stats'?'active':''} onClick={()=>setTab('stats')}>
          <span className="ic">📊</span> Estadísticas
        </button>
        <button className={tab==='config'?'active':''} onClick={()=>setTab('config')}>
          <span className="ic">⚙️</span> Config
        </button>
      </nav>

      {unlockQueue.length > 0 && (
        <NewAnimalModal data={unlockQueue[0]} onClose={() => setUnlockQueue(q => q.slice(1))} />
      )}
      {selectedAnimal && (
        <AnimalDetailModal
          animal={selectedAnimal}
          food={state.food}
          mapState={state.map}
          onFeed={feedAnimal}
          onClean={cleanAnimal}
          onPet={petAnimal}
          onRename={renameAnimal}
          onClose={() => setSelectedAnimalId(null)}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </React.Fragment>
  );
}

/* ============ TIMER SCREEN ============ */

function timerStatusLabel(timer){
  if(timer.status === 'running') return timer.phase==='study' ? 'Enfocándote…' : 'Descansando…';
  if(timer.status === 'paused') return 'Pausado';
  return timer.phase === 'study' ? 'Listo para estudiar' : 'Listo para descansar';
}

function CircularTimerVisual({ remainingMs, progress, phase, statusLabel }){
  const radius = 116;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(1, Math.max(0, progress)));
  return (
    <div className="timer-ring-wrap">
      <div className="timer-ring">
        <svg width="260" height="260">
          <circle className="bg" cx="130" cy="130" r={radius}/>
          <circle
            className={'fg ' + phase}
            cx="130" cy="130" r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="timer-center">
          <div className="timer-time">{fmtTime(remainingMs)}</div>
          <div className="timer-sub">{statusLabel}</div>
        </div>
      </div>
    </div>
  );
}

function BarTimerVisual({ remainingMs, progress, phase, statusLabel }){
  const pct = Math.min(1, Math.max(0, progress)) * 100;
  return (
    <div className="timer-bar-wrap">
      <div className="timer-bar-time">{fmtTime(remainingMs)}</div>
      <div className="timer-sub" style={{marginBottom:14}}>{statusLabel}</div>
      <div className="timer-bar-track">
        <div className={'timer-bar-fill ' + phase} style={{width: pct + '%'}}></div>
      </div>
    </div>
  );
}

function MinimalTimerVisual({ remainingMs, statusLabel }){
  return (
    <div className="timer-minimal-wrap">
      <div className="timer-minimal-time">{fmtTime(remainingMs)}</div>
      <div className="timer-sub">{statusLabel}</div>
    </div>
  );
}

function TimerScreen({ state, remainingMs, onStart, onPause, onReset, onSkip, onExtend }){
  const { timer, config, stats, food } = state;
  const totalMs = (timer.phase === 'study' ? config.studyMin : config.breakMin) * 60000 + (timer.extraMs||0);
  const progress = totalMs > 0 ? 1 - (remainingMs / totalMs) : 0;
  const statusLabel = timerStatusLabel(timer);
  const layout = config.timerLayout || 'circular';

  return (
    <React.Fragment>
      <div className="phase-toggle">
        <span className={'phase-chip study ' + (timer.phase==='study' ? 'active study' : '')}>📚 Estudio</span>
        <span className={'phase-chip break ' + (timer.phase==='break' ? 'active break' : '')}>☕ Descanso</span>
      </div>

      {layout === 'bar' ? (
        <BarTimerVisual remainingMs={remainingMs} progress={progress} phase={timer.phase} statusLabel={statusLabel} />
      ) : layout === 'minimal' ? (
        <MinimalTimerVisual remainingMs={remainingMs} statusLabel={statusLabel} />
      ) : (
        <CircularTimerVisual remainingMs={remainingMs} progress={progress} phase={timer.phase} statusLabel={statusLabel} />
      )}

      <div className="timer-controls">
        {timer.status !== 'running' ? (
          <button className="btn primary" onClick={onStart}>▶ Iniciar</button>
        ) : (
          <button className="btn primary" onClick={onPause}>⏸ Pausar</button>
        )}
        <button className="btn" onClick={onReset}>↺ Reiniciar</button>
        <button className="btn ghost" onClick={onSkip}>⏭ Saltar fase</button>
      </div>

      {timer.phase === 'study' && (
        <div className="extend-row">
          <button className="btn small" onClick={() => onExtend(5)}>+5 min extra (🍖 comida)</button>
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card">
          <div className="val">{stats.sessionsToday}</div>
          <div className="lbl">Sesiones hoy</div>
        </div>
        <div className="stat-card">
          <div className="val">{stats.streak}</div>
          <div className="lbl">Racha (días)</div>
        </div>
        <div className="stat-card">
          <div className="val">{stats.totalSessions}</div>
          <div className="lbl">Total sesiones</div>
        </div>
      </div>

      <div className="food-banner">
        <div className="left">
          <span className="emoji">🍖</span>
          <div>
            <div style={{fontWeight:700}}>{food} comida disponible</div>
            <div style={{fontSize:'0.75rem', color:'var(--text-dim)'}}>Estudia tiempo extra para conseguir más</div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============ ZOO SCREEN ============ */

function AnimalCard({ animal, species, onSelect }){
  const hunger = computeHunger(animal);
  const stage = growthStage(animal);
  const salud = animal.salud ?? 100;
  const sick = salud < 60;
  // General neglect (any mix of hunger/dirt/attention/health being low)
  // dims the sprite even outside the habitat-mismatch "sick" state, which
  // stays reserved for the more urgent red-outline treatment.
  const happiness = computeHappiness(animal);
  const neglected = !sick && happiness < 50;
  return (
    <div className={'animal-card stage-' + stage.key + (sick ? ' sick' : '') + (neglected ? ' neglected' : '')} onClick={() => onSelect(animal)}>
      <span className="rarity-dot" style={{background: RARITY_META[species.rarity].color}}></span>
      {stage.emoji && <span className="stage-badge">{stage.emoji}</span>}
      {sick && <span className="sick-badge" title="Salud baja">{healthState(salud).emoji || '⚠️'}</span>}
      {neglected && <span className="sick-badge" title="Necesita cuidados">😢</span>}
      <span className="emoji">{species.emoji}</span>
      <div className="nm">{animal.name}</div>
      <div className="hunger-bar">
        <div className="hunger-fill" style={{width: hunger+'%', background: hungerState(hunger).color}}></div>
      </div>
      {salud < 100 && (
        <div className="hunger-bar" style={{marginTop:3}}>
          <div className="hunger-fill" style={{width: salud+'%', background: healthState(salud).color}}></div>
        </div>
      )}
    </div>
  );
}

function LockedCard({ species, totalStudyMinutes }){
  const remaining = Math.max(0, species.tiempoMinimoMinutos - totalStudyMinutes);
  return (
    <div className="animal-card locked" title="Todavía no desbloqueado">
      <span className="map-lock lock-badge">🔒</span>
      <span className="rarity-dot dim" style={{background: RARITY_META[species.rarity].color}}></span>
      <span className="emoji dim">{species.emoji}</span>
      <div className="nm">{species.name}</div>
      <div className="lock-remaining">Faltan {remaining} min</div>
    </div>
  );
}

function AvailableCard({ species }){
  const price = SHOP_ANIMAL_PRICE_BY_RARITY[species.rarity];
  return (
    <div className="animal-card available" title="Disponible en la tienda">
      <span className="rarity-dot" style={{background: RARITY_META[species.rarity].color}}></span>
      <span className="emoji">{species.emoji}</span>
      <div className="nm">{species.name}</div>
      <div className="lock-remaining">🛒 {COIN_EMOJI} {price}</div>
    </div>
  );
}

function ZooScreen({
  state, onSelect, onPaintTerrain, onClearTerrain, onPlaceAnimal, onRemoveAnimal, onMoveAnimal,
  onPlaceDecoration, onRemoveDecoration, onMoveDecoration,
}){
  const [rarityFilter, setRarityFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [speciesQuery, setSpeciesQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  const uniqueSpeciesCount = useMemo(() => {
    return new Set(state.animals.map(a => a.speciesId)).size;
  }, [state.animals]);

  const query = speciesQuery.trim().toLowerCase();

  const matchesFilters = useCallback((a) => {
    const sp = SPECIES.find(s=>s.id===a.speciesId);
    if(rarityFilter !== 'all' && sp.rarity !== rarityFilter) return false;
    if(query && !sp.name.toLowerCase().includes(query)) return false;
    if(stateFilter !== 'all'){
      const h = computeHunger(a);
      const st = hungerState(h).label.toLowerCase();
      if(stateFilter === 'happy' && st !== 'feliz') return false;
      if(stateFilter === 'sad' && st === 'feliz') return false;
    }
    return true;
  }, [rarityFilter, stateFilter, query]);

  const filtered = useMemo(() => {
    return state.animals.filter(matchesFilters).sort((a,b) => b.obtainedAt - a.obtainedAt);
  }, [state.animals, matchesFilters]);

  const viewToggle = (
    <div className="filters">
      <span className={'filter-chip ' + (viewMode==='grid'?'active':'')} onClick={()=>setViewMode('grid')}>🔲 Grilla</span>
      <span className={'filter-chip ' + (viewMode==='habitat'?'active':'')} onClick={()=>setViewMode('habitat')}>🗺️ Hábitats</span>
      <span className={'filter-chip ' + (viewMode==='map'?'active':'')} onClick={()=>setViewMode('map')}>🎮 Mapa</span>
    </div>
  );

  const filters = (
    <React.Fragment>
      {viewToggle}
      <input
        className="species-search"
        type="search"
        placeholder="Buscar por especie (ej. León, Zorro…)"
        value={speciesQuery}
        onChange={e => setSpeciesQuery(e.target.value)}
      />
      <div className="filters">
        <span className={'filter-chip ' + (rarityFilter==='all'?'active':'')} onClick={()=>setRarityFilter('all')}>Todas</span>
        {Object.entries(RARITY_META).map(([key, meta]) => (
          <span key={key} className={'filter-chip ' + (rarityFilter===key?'active':'')} onClick={()=>setRarityFilter(key)}>{meta.label}</span>
        ))}
      </div>
      <div className="filters">
        <span className={'filter-chip ' + (stateFilter==='all'?'active':'')} onClick={()=>setStateFilter('all')}>Todos los estados</span>
        <span className={'filter-chip ' + (stateFilter==='happy'?'active':'')} onClick={()=>setStateFilter('happy')}>😄 Felices</span>
        <span className={'filter-chip ' + (stateFilter==='sad'?'active':'')} onClick={()=>setStateFilter('sad')}>🥺 Necesitan comida</span>
      </div>
    </React.Fragment>
  );

  if(viewMode === 'map'){
    return (
      <React.Fragment>
        <div className="zoo-header">
          <div className="zoo-count">{uniqueSpeciesCount} de {SPECIES.length} especies · {state.animals.length} animales</div>
        </div>
        {viewToggle}
        <MapScreen
          state={state}
          onPaintTerrain={onPaintTerrain}
          onClearTerrain={onClearTerrain}
          onPlaceAnimal={onPlaceAnimal}
          onRemoveAnimal={onRemoveAnimal}
          onMoveAnimal={onMoveAnimal}
          onPlaceDecoration={onPlaceDecoration}
          onRemoveDecoration={onRemoveDecoration}
          onMoveDecoration={onMoveDecoration}
        />
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      <div className="zoo-header">
        <div className="zoo-count">{uniqueSpeciesCount} de {SPECIES.length} especies · {state.animals.length} animales</div>
      </div>

      {filters}

      {viewMode === 'grid' ? (
        state.animals.length === 0 ? (
          <div className="empty-state">
            <div className="big">🐣</div>
            <div>Tu zoológico está vacío todavía.</div>
            <div>Completa una sesión de estudio para conseguir tu primer animal.</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="big">🔍</div>
            <div>Ningún animal coincide con estos filtros.</div>
          </div>
        ) : (
          <div className="animal-grid">
            {filtered.map(a => (
              <AnimalCard key={a.id} animal={a} species={SPECIES.find(s=>s.id===a.speciesId)} onSelect={onSelect} />
            ))}
          </div>
        )
      ) : (
        // Hábitats always shows the full 50-species catalog (owned,
        // purchasable, or locked) regardless of how many animals you own —
        // that's the whole point of it: seeing what's still ahead of you.
        <HabitatView state={state} rarityFilter={rarityFilter} speciesQuery={query} matchesFilters={matchesFilters} onSelect={onSelect} />
      )}
    </React.Fragment>
  );
}

function HabitatView({ state, rarityFilter, speciesQuery, matchesFilters, onSelect }){
  const sections = useMemo(() => {
    return HABITATS.map(hab => {
      const speciesInHabitat = SPECIES.filter(s =>
        s.habitat === hab.id &&
        (rarityFilter==='all' || s.rarity===rarityFilter) &&
        (!speciesQuery || s.name.toLowerCase().includes(speciesQuery))
      );
      if(speciesInHabitat.length === 0) return null;

      let anyOwnedInHabitat = false;
      const visibleCards = [];
      speciesInHabitat.forEach(sp => {
        const allOwnedOfSpecies = state.animals.filter(a => a.speciesId === sp.id);
        if(allOwnedOfSpecies.length > 0) anyOwnedInHabitat = true;
        const matching = allOwnedOfSpecies.filter(matchesFilters);
        if(matching.length > 0){
          matching.forEach(a => visibleCards.push(<AnimalCard key={a.id} animal={a} species={sp} onSelect={onSelect} />));
        } else if(allOwnedOfSpecies.length === 0){
          if(state.unlockedSpeciesIds.includes(sp.id)){
            visibleCards.push(<AvailableCard key={sp.id} species={sp} />);
          } else {
            visibleCards.push(<LockedCard key={sp.id} species={sp} totalStudyMinutes={state.stats.totalStudyMinutes} />);
          }
        }
      });

      const ownedCount = speciesInHabitat.filter(sp => state.animals.some(a => a.speciesId === sp.id)).length;
      const emptyMessage = anyOwnedInHabitat
        ? 'Ningún animal de este hábitat coincide con los filtros.'
        : 'Ningún animal descubierto aquí todavía.';
      return { hab, speciesInHabitat, ownedCount, visibleCards, emptyMessage };
    }).filter(Boolean);
  }, [state.animals, state.stats.totalStudyMinutes, state.unlockedSpeciesIds, rarityFilter, matchesFilters]);

  return (
    <React.Fragment>
      {sections.map(({ hab, speciesInHabitat, ownedCount, visibleCards, emptyMessage }) => (
        <div key={hab.id} className="habitat-section">
          <div className="habitat-title">
            <span>{hab.emoji} {hab.label}</span>
            <span className="habitat-count">{ownedCount} de {speciesInHabitat.length}</span>
          </div>
          {visibleCards.length > 0 ? (
            <div className="animal-grid">{visibleCards}</div>
          ) : (
            <div className="habitat-empty">{emptyMessage}</div>
          )}
        </div>
      ))}
    </React.Fragment>
  );
}

/* ============ MAP SCREEN (etapa 3: modo jugable) ============ */

function MapScreen({
  state, onPaintTerrain, onClearTerrain, onPlaceAnimal, onRemoveAnimal, onMoveAnimal,
  onPlaceDecoration, onRemoveDecoration, onMoveDecoration,
}){
  // { kind:'terrain', habitatId } | { kind:'eraser' } | { kind:'animal', animalId } | { kind:'decoration', decorationId }
  const [mode, setMode] = useState(null);
  const [dragPos, setDragPos] = useState(null); // { clientX, clientY, emoji } while dragging an occupant to reposition it
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);

  const unlockedRows = getUnlockedMapRows(state.stats.totalStudyMinutes);
  const minutesForNextRow = (unlockedRows - MAP_STARTING_ROWS + 1) * MAP_MINUTES_PER_ROW_UNLOCK;
  const minutesToNextRow = Math.max(0, minutesForNextRow - state.stats.totalStudyMinutes);

  const placedAnimalIds = useMemo(() => new Set(Object.values(state.map.placements)), [state.map.placements]);
  const unplacedAnimals = useMemo(
    () => state.animals.filter(a => !placedAnimalIds.has(a.id)),
    [state.animals, placedAnimalIds]
  );

  const unplacedDecorations = useMemo(() => {
    const placedCounts = {};
    Object.values(state.map.decorations).forEach(id => { placedCounts[id] = (placedCounts[id] || 0) + 1; });
    return SHOP_DECORATIONS
      .map(d => ({ ...d, unplacedCount: (state.decorationInventory[d.id] || 0) - (placedCounts[d.id] || 0) }))
      .filter(d => d.unplacedCount > 0);
  }, [state.decorationInventory, state.map.decorations]);

  // Reposition drag & drop for already-placed animals/decorations (etapa 4).
  // Pointer Events cover mouse and touch alike. A short movement threshold
  // tells a real drag apart from a plain tap so tapping to unplace (below)
  // keeps working; when a drag *does* complete, the click that browsers
  // synthesize right after pointerup is swallowed via suppressClickRef so
  // it doesn't also fire the tap-to-unplace handler on the drop tile.
  useEffect(() => {
    const handleMove = (e) => {
      const d = dragRef.current;
      if(!d) return;
      if(!d.moved && (Math.abs(e.clientX - d.startClientX) > 8 || Math.abs(e.clientY - d.startClientY) > 8)){
        d.moved = true;
      }
      if(d.moved) setDragPos({ clientX: e.clientX, clientY: e.clientY, emoji: d.emoji });
    };
    const handleUp = (e) => {
      const d = dragRef.current;
      dragRef.current = null;
      setDragPos(null);
      if(!d || !d.moved) return;
      suppressClickRef.current = true;
      setTimeout(() => { suppressClickRef.current = false; }, 0);
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const tileEl = el ? el.closest('.map-tile') : null;
      if(!tileEl) return;
      const toX = Number(tileEl.dataset.x);
      const toY = Number(tileEl.dataset.y);
      if(Number.isNaN(toX) || Number.isNaN(toY)) return;
      if(d.kind === 'animal') onMoveAnimal(d.fromX, d.fromY, toX, toY);
      else onMoveDecoration(d.fromX, d.fromY, toX, toY);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [onMoveAnimal, onMoveDecoration]);

  const toggleTerrainBrush = (habitatId) => {
    setMode(m => (m && m.kind === 'terrain' && m.habitatId === habitatId) ? null : { kind: 'terrain', habitatId });
  };
  const toggleEraser = () => {
    setMode(m => (m && m.kind === 'eraser') ? null : { kind: 'eraser' });
  };
  const toggleAnimal = (animalId) => {
    setMode(m => (m && m.kind === 'animal' && m.animalId === animalId) ? null : { kind: 'animal', animalId });
  };
  const toggleDecoration = (decorationId) => {
    setMode(m => (m && m.kind === 'decoration' && m.decorationId === decorationId) ? null : { kind: 'decoration', decorationId });
  };

  const handleTilePointerDown = (x, y, kind, emoji, e) => {
    if(mode) return; // a placement/terrain brush is active — this tap places/paints, it doesn't start a drag
    dragRef.current = { kind, fromX: x, fromY: y, startClientX: e.clientX, startClientY: e.clientY, moved: false, emoji };
  };

  const handleTileClick = (x, y, locked) => {
    if(suppressClickRef.current){ suppressClickRef.current = false; return; }
    if(locked) return;
    const key = `${x}_${y}`;
    if(mode && mode.kind === 'animal'){
      onPlaceAnimal(x, y, mode.animalId);
      setMode(null);
      return;
    }
    if(mode && mode.kind === 'decoration'){
      onPlaceDecoration(x, y, mode.decorationId);
      setMode(null);
      return;
    }
    if(mode && mode.kind === 'terrain'){
      onPaintTerrain(x, y, mode.habitatId);
      return;
    }
    if(mode && mode.kind === 'eraser'){
      onClearTerrain(x, y);
      return;
    }
    if(state.map.placements[key]) onRemoveAnimal(x, y);
    else if(state.map.decorations[key]) onRemoveDecoration(x, y);
  };

  const rows = [];
  for(let y = 0; y < MAP_ROWS_TOTAL; y++){
    const cols = [];
    for(let x = 0; x < MAP_COLS; x++){
      const key = `${x}_${y}`;
      const locked = y >= unlockedRows;
      const terrainId = state.map.tiles[key];
      const terrain = terrainId ? HABITATS.find(h => h.id === terrainId) : null;
      const placedAnimalId = state.map.placements[key];
      const placedAnimal = placedAnimalId ? state.animals.find(a => a.id === placedAnimalId) : null;
      const placedSpecies = placedAnimal ? SPECIES.find(s => s.id === placedAnimal.speciesId) : null;
      const placedDecorationId = state.map.decorations[key];
      const placedDecoration = placedDecorationId ? SHOP_DECORATIONS.find(d => d.id === placedDecorationId) : null;
      const occupantEmoji = placedSpecies ? placedSpecies.emoji : (placedDecoration ? placedDecoration.emoji : null);
      const animalSalud = placedAnimal ? (placedAnimal.salud ?? 100) : null;
      const animalSick = animalSalud !== null && animalSalud < 60;
      const animalNeglected = !animalSick && placedAnimal && computeHappiness(placedAnimal) < 50;
      const animalDim = animalSick || animalNeglected;
      cols.push(
        <div
          key={key}
          className={'map-tile' + (locked ? ' locked' : '') + (terrain ? '' : ' empty') + (animalDim ? ' sick' : '')}
          data-x={x}
          data-y={y}
          onClick={() => handleTileClick(x, y, locked)}
          onPointerDown={!locked && occupantEmoji ? (e) => handleTilePointerDown(x, y, placedSpecies ? 'animal' : 'decoration', occupantEmoji, e) : undefined}
          title={locked ? 'Fila todavía bloqueada — seguí estudiando para desbloquearla' : (animalSick ? `Salud baja (${animalSalud}%) — está en el hábitat equivocado` : (animalNeglected ? 'Necesita cuidados (comida, limpieza o cariño)' : undefined))}
          style={occupantEmoji ? {touchAction: 'none'} : undefined}
        >
          {locked ? (
            <span className="map-lock">🔒</span>
          ) : (
            <React.Fragment>
              {terrain && <span className="map-terrain-emoji">{terrain.emoji}</span>}
              {occupantEmoji && <span className={'map-animal-emoji' + (animalDim ? ' sick' : '')}>{occupantEmoji}</span>}
              {animalSick && <span className="map-sick-badge">🚨</span>}
              {animalNeglected && <span className="map-sick-badge">😢</span>}
            </React.Fragment>
          )}
        </div>
      );
    }
    rows.push(<div className="map-row" key={y}>{cols}</div>);
  }

  return (
    <React.Fragment>
      <div style={{fontSize:'0.78rem', color:'var(--text-dim)', marginBottom:10}}>
        {mode && mode.kind === 'terrain' && `Tocá una casilla desbloqueada para pintar ${HABITATS.find(h=>h.id===mode.habitatId).label.toLowerCase()}.`}
        {mode && mode.kind === 'eraser' && 'Tocá una casilla para borrar su terreno.'}
        {mode && mode.kind === 'animal' && `Tocá una casilla con el hábitat correcto para ubicar a ${state.animals.find(a=>a.id===mode.animalId)?.name}.`}
        {mode && mode.kind === 'decoration' && `Tocá una casilla vacía para ubicar ${SHOP_DECORATIONS.find(d=>d.id===mode.decorationId).label.toLowerCase()}.`}
        {!mode && 'Elegí un terreno, un animal o una decoración, o arrastrá algo ya ubicado para moverlo.'}
      </div>

      <div className="map-toolbar">
        <div className="map-toolbar-label">Terrenos</div>
        <div className="map-palette">
          {HABITATS.map(hab => (
            <span
              key={hab.id}
              className={'filter-chip ' + (mode && mode.kind==='terrain' && mode.habitatId===hab.id ? 'active' : '')}
              onClick={() => toggleTerrainBrush(hab.id)}
            >
              {hab.emoji} {hab.label}
            </span>
          ))}
          <span
            className={'filter-chip ' + (mode && mode.kind==='eraser' ? 'active' : '')}
            onClick={toggleEraser}
          >
            🧹 Borrar
          </span>
        </div>
      </div>

      <div className="map-toolbar">
        <div className="map-toolbar-label">Tus animales sin ubicar ({unplacedAnimals.length})</div>
        {unplacedAnimals.length === 0 ? (
          <div style={{fontSize:'0.75rem', color:'var(--text-dim)'}}>
            {state.animals.length === 0 ? 'Todavía no tenés animales. Comprá alguno en la Tienda.' : '¡Ya ubicaste a todos tus animales en el mapa!'}
          </div>
        ) : (
          <div className="map-palette">
            {unplacedAnimals.map(a => {
              const sp = SPECIES.find(s => s.id === a.speciesId);
              return (
                <span
                  key={a.id}
                  className={'filter-chip ' + (mode && mode.kind==='animal' && mode.animalId===a.id ? 'active' : '')}
                  onClick={() => toggleAnimal(a.id)}
                >
                  {sp.emoji} {a.name}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="map-toolbar">
        <div className="map-toolbar-label">Tus decoraciones sin ubicar ({unplacedDecorations.reduce((sum,d)=>sum+d.unplacedCount,0)})</div>
        {unplacedDecorations.length === 0 ? (
          <div style={{fontSize:'0.75rem', color:'var(--text-dim)'}}>Comprá decoraciones en la Tienda para embellecer tu mapa.</div>
        ) : (
          <div className="map-palette">
            {unplacedDecorations.map(d => (
              <span
                key={d.id}
                className={'filter-chip ' + (mode && mode.kind==='decoration' && mode.decorationId===d.id ? 'active' : '')}
                onClick={() => toggleDecoration(d.id)}
              >
                {d.emoji} {d.label} ×{d.unplacedCount}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="map-grid">{rows}</div>

      {unlockedRows < MAP_ROWS_TOTAL && (
        <div style={{fontSize:'0.72rem', color:'var(--text-dim)', marginTop:10, textAlign:'center'}}>
          🔒 Estudiá {minutesToNextRow} min más para desbloquear la próxima fila del mapa
        </div>
      )}

      {dragPos && (
        <div
          className="map-drag-ghost"
          style={{ left: dragPos.clientX, top: dragPos.clientY }}
        >
          {dragPos.emoji}
        </div>
      )}
    </React.Fragment>
  );
}

/* ============ SHOP SCREEN ============ */

function ShopScreen({ state, onBuyFoodBundle, onBuyAnimal, onBuyDecoration }){
  const purchasableSpecies = state.unlockedSpeciesIds
    .map(id => SPECIES.find(s => s.id === id))
    .filter(Boolean)
    .sort((a, b) => SHOP_ANIMAL_PRICE_BY_RARITY[a.rarity] - SHOP_ANIMAL_PRICE_BY_RARITY[b.rarity]);

  return (
    <React.Fragment>
      <div className="zoo-header">
        <div className="zoo-count">Tu saldo: {COIN_EMOJI} {state.coins} {COIN_NAME_PLURAL}</div>
      </div>
      <div style={{fontSize:'0.78rem', color:'var(--text-dim)', marginBottom:16}}>
        Ganás {COINS_PER_STUDY_MINUTE} {COIN_NAME.toLowerCase()}{COINS_PER_STUDY_MINUTE===1?'':'s'} por cada minuto de estudio completado.
      </div>

      <div className="config-section" style={{marginTop:0}}>
        <h3>🌾 Fardos de comida</h3>
        <div className="shop-grid">
          {SHOP_FOOD_BUNDLES.map(bundle => {
            const canAfford = state.coins >= bundle.price;
            return (
              <div key={bundle.id} className="shop-card">
                <div className="shop-card-emoji">{bundle.emoji}</div>
                <div className="shop-card-label">{bundle.label}</div>
                <div className="shop-card-detail">+{bundle.foodAmount} comida</div>
                <button
                  className="btn primary small"
                  disabled={!canAfford}
                  onClick={() => onBuyFoodBundle(bundle.id)}
                >
                  {COIN_EMOJI} {bundle.price}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="config-section">
        <h3>🐘 Animales</h3>
        {purchasableSpecies.length === 0 ? (
          <div style={{fontSize:'0.8rem', color:'var(--text-dim)'}}>
            Seguí estudiando para desbloquear animales que después podrás comprar acá.
          </div>
        ) : (
          <div className="shop-grid">
            {purchasableSpecies.map(sp => {
              const price = SHOP_ANIMAL_PRICE_BY_RARITY[sp.rarity];
              const canAfford = state.coins >= price;
              return (
                <div key={sp.id} className="shop-card">
                  <span className="rarity-dot" style={{background: RARITY_META[sp.rarity].color}}></span>
                  <div className="shop-card-emoji">{sp.emoji}</div>
                  <div className="shop-card-label">{sp.name}</div>
                  <div className="shop-card-detail">{RARITY_META[sp.rarity].label}</div>
                  <button
                    className="btn primary small"
                    disabled={!canAfford}
                    onClick={() => onBuyAnimal(sp.id)}
                  >
                    {COIN_EMOJI} {price}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="config-section">
        <h3>🌳 Decoraciones</h3>
        <div className="shop-grid">
          {SHOP_DECORATIONS.map(dec => {
            const canAfford = state.coins >= dec.price;
            const owned = state.decorationInventory[dec.id] || 0;
            return (
              <div key={dec.id} className="shop-card">
                <div className="shop-card-emoji">{dec.emoji}</div>
                <div className="shop-card-label">{dec.label}</div>
                <div className="shop-card-detail">{owned > 0 ? `Tenés ${owned}` : 'Cosmética'}</div>
                <button
                  className="btn primary small"
                  disabled={!canAfford}
                  onClick={() => onBuyDecoration(dec.id)}
                >
                  {COIN_EMOJI} {dec.price}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============ STATS SCREEN ============ */

function StatsScreen({ state }){
  const [range, setRange] = useState(7);

  const dailyData = useMemo(() => {
    const days = [];
    const now = new Date();
    for(let i = range - 1; i >= 0; i--){
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push({ key: dateKey(d), date: d });
    }
    const minutesByKey = {};
    state.sessionLog.forEach(s => { minutesByKey[s.dateKey] = (minutesByKey[s.dateKey] || 0) + s.minutes; });
    return days.map(d => ({ ...d, minutes: minutesByKey[d.key] || 0 }));
  }, [state.sessionLog, range]);

  const maxMinutes = Math.max(1, ...dailyData.map(d => d.minutes));
  const totalRangeMinutes = dailyData.reduce((sum, d) => sum + d.minutes, 0);

  const sessionsThisWeek = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000;
    return state.sessionLog.filter(s => s.ts >= cutoff).length;
  }, [state.sessionLog]);

  const totalHours = Math.floor(state.stats.totalStudyMinutes / 60);
  const totalMins = state.stats.totalStudyMinutes % 60;
  const todayKey = dateKey();

  const weekdayLabel = (d) => d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
  const dayLabel = (d) => d.getDate();

  return (
    <React.Fragment>
      <div className="config-section" style={{marginTop:10}}>
        <h3>Resumen general</h3>
        <div className="stats-row">
          <div className="stat-card">
            <div className="val">{totalHours}h {totalMins}m</div>
            <div className="lbl">Tiempo total estudiado</div>
          </div>
        </div>
        <div className="stats-row" style={{marginTop:10}}>
          <div className="stat-card">
            <div className="val">{state.stats.totalSessions}</div>
            <div className="lbl">Sesiones totales</div>
          </div>
          <div className="stat-card">
            <div className="val">{sessionsThisWeek}</div>
            <div className="lbl">Últimos 7 días</div>
          </div>
          <div className="stat-card">
            <div className="val">{state.stats.streak}</div>
            <div className="lbl">Racha actual</div>
          </div>
        </div>
      </div>

      <div className="config-section">
        <h3>Comida</h3>
        <div className="stats-row">
          <div className="stat-card">
            <div className="val">{state.stats.totalFoodEarned}</div>
            <div className="lbl">Ganada</div>
          </div>
          <div className="stat-card">
            <div className="val">{state.stats.totalFoodUsed}</div>
            <div className="lbl">Usada</div>
          </div>
          <div className="stat-card">
            <div className="val">{state.food}</div>
            <div className="lbl">Disponible</div>
          </div>
        </div>
      </div>

      <div className="config-section">
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <h3 style={{marginBottom:0}}>Estudio por día</h3>
          <div style={{display:'flex', gap:6}}>
            <span className={'filter-chip ' + (range===7?'active':'')} onClick={()=>setRange(7)}>7 días</span>
            <span className={'filter-chip ' + (range===30?'active':'')} onClick={()=>setRange(30)}>30 días</span>
          </div>
        </div>
        <div style={{fontSize:'0.78rem', color:'var(--text-dim)', margin:'8px 0'}}>
          {Math.floor(totalRangeMinutes/60)}h {totalRangeMinutes%60}m en los últimos {range} días
        </div>
        <div className="chart-scroll">
          <div className="chart" style={{minWidth: range===30 ? 620 : 'auto'}}>
            {dailyData.map(d => (
              <div key={d.key} className="chart-col" title={d.minutes + ' min'}>
                <div className="chart-bar-track">
                  <div
                    className={'chart-bar' + (d.key===todayKey ? ' today' : '')}
                    style={{height: Math.max(4, (d.minutes/maxMinutes)*100) + '%'}}
                  ></div>
                </div>
                <div className="chart-lbl">{range===7 ? weekdayLabel(d.date) : dayLabel(d.date)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============ CONFIG SCREEN ============ */

const PRESETS = [
  { studyMin:25, breakMin:5, label:'Clásico' },
  { studyMin:50, breakMin:10, label:'Largo' },
  { studyMin:15, breakMin:3, label:'Corto' },
];

const WARN_THRESHOLD_OPTIONS = [
  { value:2, label:'2s' },
  { value:5, label:'5s' },
  { value:10, label:'10s' },
  { value:15, label:'15s' },
  { value:30, label:'30s' },
  { value:60, label:'1 min' },
];

const THEME_OPTIONS = [
  { value:'dark', label:'Oscuro', emoji:'🌙' },
  { value:'light', label:'Claro', emoji:'☀️' },
  { value:'selva', label:'Selva', emoji:'🌴' },
  { value:'sabana', label:'Sabana', emoji:'🌾' },
];

const LAYOUT_OPTIONS = [
  { value:'circular', label:'Circular', emoji:'⭕' },
  { value:'bar', label:'Barra', emoji:'▬' },
  { value:'minimal', label:'Minimalista', emoji:'🔢' },
];

const SOUND_OPTIONS = [
  { value:'clasico', label:'Clásico' },
  { value:'campana', label:'Campana' },
  { value:'suave', label:'Suave' },
  { value:'alerta', label:'Alerta' },
];

function ConfigScreen({
  state, onUpdateConfig, onPatchConfig, onPreviewSound, onResetAll,
  authUser, onRegister, onLogin, onGoogleLogin, onGoogleLoginDirect, onLogout, onDeleteAccount,
}){
  const { config } = state;
  const isPresetActive = (p) => p.studyMin===config.studyMin && p.breakMin===config.breakMin;
  const isCustomActive = !PRESETS.some(isPresetActive);
  const [authModalMode, setAuthModalMode] = useState(null); // 'login' | 'register' | null

  const [customStudy, setCustomStudy] = useState(String(config.studyMin));
  const [customBreak, setCustomBreak] = useState(String(config.breakMin));

  useEffect(() => { setCustomStudy(String(config.studyMin)); setCustomBreak(String(config.breakMin)); }, [config.studyMin, config.breakMin]);

  const clamp = (raw, min, max, fallback) => {
    const n = parseInt(raw, 10);
    if(isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  };

  const saveCustom = () => {
    const study = clamp(customStudy, 1, 180, config.studyMin);
    const brk = clamp(customBreak, 1, 60, config.breakMin);
    setCustomStudy(String(study));
    setCustomBreak(String(brk));
    onUpdateConfig(study, brk);
  };

  return (
    <React.Fragment>
      <div className="config-section">
        <h3>Cuenta</h3>
        {authUser ? (
          <div className="account-card">
            <div>
              <div style={{fontWeight:700}}>{authUser.email || 'Cuenta de Google'}</div>
              <div style={{fontSize:'0.75rem', color:'var(--text-dim)'}}>Tu progreso se sincroniza en la nube</div>
            </div>
            <button className="btn small" onClick={onLogout}>Cerrar sesión</button>
          </div>
        ) : (
          <React.Fragment>
            <div style={{fontSize:'0.8rem', color:'var(--text-dim)', marginBottom:10}}>
              Estás jugando como invitado — tu progreso se guarda solo en este dispositivo.
              Creá una cuenta para no perderlo y sincronizarlo entre dispositivos.
            </div>
            {googleSignInAvailable && (
              <button className="btn primary block" style={{marginBottom:8}} onClick={onGoogleLoginDirect}>
                Continuar con Google
              </button>
            )}
            <div style={{display:'flex', gap:8}}>
              <button className="btn" style={{flex:1}} onClick={() => setAuthModalMode('register')}>Crear cuenta</button>
              <button className="btn" style={{flex:1}} onClick={() => setAuthModalMode('login')}>Iniciar sesión</button>
            </div>
          </React.Fragment>
        )}
      </div>

      {authModalMode && (
        <AuthModal
          mode={authModalMode}
          onModeChange={setAuthModalMode}
          onRegister={onRegister}
          onLogin={onLogin}
          onGoogleLogin={onGoogleLogin}
          onClose={() => setAuthModalMode(null)}
        />
      )}

      <div className="config-section">
        <h3>Duración de sesión</h3>
        <div className="preset-grid">
          {PRESETS.map(p => (
            <div key={p.label} className={'preset-btn ' + (isPresetActive(p)?'active':'')} onClick={() => onUpdateConfig(p.studyMin, p.breakMin)}>
              <div className="big">{p.studyMin}/{p.breakMin}</div>
              <div className="small">{p.label}</div>
            </div>
          ))}
          <div className={'preset-btn ' + (isCustomActive?'active':'')} onClick={saveCustom}>
            <div className="big">Custom</div>
            <div className="small">Personalizado</div>
          </div>
        </div>

        <div className="custom-row">
          <div className="field">
            <label>Estudio (min)</label>
            <input type="number" min="1" max="180" value={customStudy}
              onChange={e => setCustomStudy(e.target.value)}
              onBlur={() => setCustomStudy(String(clamp(customStudy, 1, 180, config.studyMin)))} />
          </div>
          <div className="field">
            <label>Descanso (min)</label>
            <input type="number" min="1" max="60" value={customBreak}
              onChange={e => setCustomBreak(e.target.value)}
              onBlur={() => setCustomBreak(String(clamp(customBreak, 1, 60, config.breakMin)))} />
          </div>
        </div>
        <div style={{marginTop:10}}>
          <button className="btn primary block" onClick={saveCustom}>Guardar personalizado</button>
        </div>
      </div>

      <div className="config-section">
        <h3>Comportamiento</h3>
        <label className="switch-row">
          <div>
            <div style={{fontWeight:600}}>Iniciar siguiente fase automáticamente</div>
            <div style={{fontSize:'0.75rem', color:'var(--text-dim)'}}>
              Al terminar estudio o descanso, arranca solo la fase siguiente
            </div>
          </div>
          <input
            type="checkbox"
            checked={config.autoTransition !== false}
            onChange={e => onPatchConfig({ autoTransition: e.target.checked })}
          />
        </label>
      </div>

      <div className="config-section">
        <h3>Aviso antes de terminar</h3>
        <label className="switch-row">
          <div>
            <div style={{fontWeight:600}}>Avisos progresivos</div>
            <div style={{fontSize:'0.75rem', color:'var(--text-dim)'}}>
              Tics cortos que se aceleran cerca del final de cada fase
            </div>
          </div>
          <input
            type="checkbox"
            checked={config.progressWarnEnabled !== false}
            onChange={e => onPatchConfig({ progressWarnEnabled: e.target.checked })}
          />
        </label>

        {config.progressWarnEnabled !== false && (
          <div style={{marginTop:10}}>
            <div style={{fontSize:'0.78rem', color:'var(--text-dim)', marginBottom:8}}>
              Empezar a avisar desde:
            </div>
            <div className="filters">
              {WARN_THRESHOLD_OPTIONS.map(opt => (
                <span
                  key={opt.value}
                  className={'filter-chip ' + ((config.progressWarnThresholdSec || 10) === opt.value ? 'active' : '')}
                  onClick={() => onPatchConfig({ progressWarnThresholdSec: opt.value })}
                >
                  {opt.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="config-section">
        <h3>Tema</h3>
        <div className="preset-grid">
          {THEME_OPTIONS.map(opt => (
            <div
              key={opt.value}
              className={'preset-btn ' + ((config.theme || 'dark') === opt.value ? 'active' : '')}
              onClick={() => onPatchConfig({ theme: opt.value })}
            >
              <div className="big">{opt.emoji}</div>
              <div className="small">{opt.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="config-section">
        <h3>Diseño del temporizador</h3>
        <div className="preset-grid">
          {LAYOUT_OPTIONS.map(opt => (
            <div
              key={opt.value}
              className={'preset-btn ' + ((config.timerLayout || 'circular') === opt.value ? 'active' : '')}
              onClick={() => onPatchConfig({ timerLayout: opt.value })}
            >
              <div className="big">{opt.emoji}</div>
              <div className="small">{opt.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="config-section">
        <h3>Sonido de notificación</h3>
        <label className="switch-row">
          <div style={{fontWeight:600}}>Silenciar sonidos</div>
          <input
            type="checkbox"
            checked={!!config.soundMuted}
            onChange={e => onPatchConfig({ soundMuted: e.target.checked })}
          />
        </label>

        {!config.soundMuted && (
          <div style={{marginTop:10}}>
            <div className="filters">
              {SOUND_OPTIONS.map(opt => (
                <span
                  key={opt.value}
                  className={'filter-chip ' + ((config.completionSound || 'clasico') === opt.value ? 'active' : '')}
                  onClick={() => onPatchConfig({ completionSound: opt.value })}
                >
                  {opt.label}
                </span>
              ))}
            </div>
            <button
              className="btn small"
              style={{marginTop:10}}
              onClick={() => onPreviewSound(config.completionSound || 'clasico')}
            >
              🔊 Probar sonido
            </button>
          </div>
        )}

        <label className="switch-row" style={{marginTop:14}}>
          <div>
            <div style={{fontWeight:600}}>Vibrar al terminar de estudiar</div>
            <div style={{fontSize:'0.75rem', color:'var(--text-dim)'}}>Solo al completar una sesión de estudio, no en el descanso</div>
          </div>
          <input
            type="checkbox"
            checked={config.vibrationEnabled !== false}
            onChange={e => onPatchConfig({ vibrationEnabled: e.target.checked })}
          />
        </label>
      </div>

      <div className="danger-zone">
        <h3 style={{color:'var(--danger)'}}>Zona de peligro</h3>
        <button className="btn block" style={{borderColor:'var(--danger)', color:'var(--danger)'}}
          onClick={() => { if(confirm('¿Borrar todo tu progreso? Esta acción no se puede deshacer.')) onResetAll(); }}>
          Reiniciar todos los datos
        </button>
        {authUser && (
          <button className="btn block" style={{marginTop:10, borderColor:'var(--danger)', color:'var(--danger)'}}
            onClick={onDeleteAccount}>
            Eliminar cuenta
          </button>
        )}
      </div>
    </React.Fragment>
  );
}

function AuthModal({ mode, onModeChange, onRegister, onLogin, onGoogleLogin, onClose }){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  const submit = async () => {
    setError(null);
    if(!email || !password){ setError('Completá email y contraseña.'); return; }
    if(isRegister && password !== confirmPassword){ setError('Las contraseñas no coinciden.'); return; }
    setBusy(true);
    const err = isRegister ? await onRegister(email, password) : await onLogin(email, password);
    setBusy(false);
    if(err) setError(err);
    else onClose();
  };

  const submitGoogle = async () => {
    setError(null);
    setBusy(true);
    const err = await onGoogleLogin();
    setBusy(false);
    if(err) setError(err);
    else onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div style={{fontSize:'1.2rem', fontWeight:700, marginBottom:16}}>
          {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
        </div>

        <div style={{textAlign:'left', display:'flex', flexDirection:'column', gap:10}}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'} />
          </div>
          {isRegister && (
            <div className="field">
              <label>Confirmar contraseña</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            </div>
          )}
        </div>

        {error && <div style={{color:'var(--danger)', fontSize:'0.8rem', marginTop:10, textAlign:'left'}}>{error}</div>}

        <div className="modal-actions" style={{flexDirection:'column'}}>
          <button className="btn primary block" disabled={busy} onClick={submit}>
            {busy ? 'Un momento…' : (isRegister ? 'Crear cuenta' : 'Iniciar sesión')}
          </button>
          {googleSignInAvailable && (
            <button className="btn block" disabled={busy} onClick={submitGoogle} style={{marginTop:8}}>
              Continuar con Google
            </button>
          )}
          <button className="btn ghost block" style={{marginTop:8}}
            onClick={() => onModeChange(isRegister ? 'login' : 'register')}>
            {isRegister ? '¿Ya tenés cuenta? Iniciar sesión' : '¿No tenés cuenta? Crear una'}
          </button>
          <button className="btn ghost block" style={{marginTop:4}} onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ============ MODALS ============ */

function NewAnimalModal({ data, onClose }){
  const { species, instance } = data;
  const meta = RARITY_META[species.rarity];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div style={{color:'var(--text-dim)', fontSize:'0.85rem'}}>¡Nuevo animal desbloqueado!</div>
        <div className="big-emoji">{species.emoji}</div>
        <div style={{fontSize:'1.3rem', fontWeight:700}}>{instance.name}</div>
        <span className="rarity-badge" style={{background: meta.color + '33', color: meta.color}}>{meta.label}</span>
        <div style={{fontSize:'0.75rem', color:'var(--text-dim)', marginTop:8}}>Podés ponerle otro nombre desde el Zoológico ✏️</div>
        <div className="modal-actions">
          <button className="btn primary block" onClick={onClose}>¡Genial!</button>
        </div>
      </div>
    </div>
  );
}

function AnimalDetailModal({ animal, food, mapState, onFeed, onClean, onPet, onRename, onClose }){
  const sp = SPECIES.find(s => s.id === animal.speciesId);
  const meta = RARITY_META[sp.rarity];
  const hunger = computeHunger(animal);
  const hs = hungerState(hunger);
  const stage = growthStage(animal);
  const feedCount = animal.feedCount || 0;
  const obtainedDate = new Date(animal.obtainedAt).toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' });
  const salud = animal.salud ?? 100;
  const hlState = healthState(salud);
  const mismatched = mapState ? isAnimalInWrongHabitat(animal, mapState) : false;
  const suciedad = computeSuciedad(animal);
  const limpieza = 100 - suciedad; // shown as "cleanliness", the intuitive direction for a filling bar
  const atencion = computeAtencion(animal);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(animal.name);

  const saveName = () => {
    onRename(animal.id, nameInput);
    setEditingName(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className={'big-emoji stage-' + stage.key}>{sp.emoji}</div>
        {editingName ? (
          <div style={{display:'flex', gap:6, alignItems:'center', justifyContent:'center'}}>
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if(e.key === 'Enter') saveName(); if(e.key === 'Escape') setEditingName(false); }}
              maxLength={20}
              style={{fontSize:'1.1rem', fontWeight:700, textAlign:'center', width:140}}
            />
            <button className="btn primary small" onClick={saveName}>Guardar</button>
          </div>
        ) : (
          <div style={{fontSize:'1.3rem', fontWeight:700, display:'flex', gap:6, alignItems:'center', justifyContent:'center'}}>
            {animal.name}
            <span
              onClick={() => { setNameInput(animal.name); setEditingName(true); }}
              style={{cursor:'pointer', fontSize:'0.85rem'}}
              title="Cambiar nombre"
            >
              ✏️
            </span>
          </div>
        )}
        <div style={{color:'var(--text-dim)'}}>{sp.name}</div>
        <span className="rarity-badge" style={{background: meta.color + '33', color: meta.color}}>{meta.label}</span>

        <div style={{marginTop:16, textAlign:'left', fontSize:'0.85rem', color:'var(--text-dim)'}}>
          <div>Obtenido: {obtainedDate}</div>
          <div style={{marginTop:8, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <span>Etapa: {stage.emoji} {stage.label}</span>
            <span>Alimentado {feedCount}×</span>
          </div>
          {stage.feedsToNext !== null && (
            <div style={{fontSize:'0.75rem', marginTop:2}}>
              Faltan {stage.feedsToNext} alimentadas más para la próxima etapa
            </div>
          )}
          <div style={{marginTop:12, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <span>Hambre: {hs.emoji} {hs.label}</span>
            <span>{hunger}%</span>
          </div>
          <div className="hunger-bar" style={{marginTop:6}}>
            <div className="hunger-fill" style={{width: hunger+'%', background: hs.color}}></div>
          </div>

          <div style={{marginTop:12, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <span>Salud: {hlState.emoji} {hlState.label}</span>
            <span>{salud}%</span>
          </div>
          <div className="hunger-bar" style={{marginTop:6}}>
            <div className="hunger-fill" style={{width: salud+'%', background: hlState.color}}></div>
          </div>
          {mismatched && (
            <div style={{fontSize:'0.72rem', color:'var(--danger)', marginTop:6}}>
              🚨 Está en el hábitat equivocado — su salud está bajando. Movelo a {HABITATS.find(h=>h.id===sp.habitat).label.toLowerCase()} {HABITATS.find(h=>h.id===sp.habitat).emoji} para que se recupere.
            </div>
          )}

          <div style={{marginTop:12, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <span>Limpieza: {limpieza >= 60 ? '✨' : '🧹'} {limpieza >= 60 ? 'Limpio' : 'Sucio'}</span>
            <span>{limpieza}%</span>
          </div>
          <div className="hunger-bar" style={{marginTop:6}}>
            <div className="hunger-fill" style={{width: limpieza+'%', background: limpieza >= 60 ? 'var(--accent-2)' : 'var(--rare)'}}></div>
          </div>

          <div style={{marginTop:12, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <span>Cariño: {atencion >= 60 ? '🥰' : '💤'} {atencion >= 60 ? 'Contento' : 'Extraña atención'}</span>
            <span>{atencion}%</span>
          </div>
          <div className="hunger-bar" style={{marginTop:6}}>
            <div className="hunger-fill" style={{width: atencion+'%', background: atencion >= 60 ? 'var(--accent-2)' : 'var(--rare)'}}></div>
          </div>
        </div>

        <div className="modal-actions" style={{flexWrap:'wrap'}}>
          <button className="btn ghost" onClick={onClose}>Cerrar</button>
          <button className="btn primary" disabled={food<=0} onClick={() => onFeed(animal.id)}>
            🍖 Alimentar {food<=0 ? '(sin comida)' : ''}
          </button>
          <button className="btn" onClick={() => onClean(animal.id)}>🧼 Limpiar</button>
          <button className="btn" onClick={() => onPet(animal.id)}>🥰 Acariciar</button>
        </div>
      </div>
    </div>
  );
}
