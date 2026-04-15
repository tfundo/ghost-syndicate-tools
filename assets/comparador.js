/* ===================================================
   GHOST SYNDICATE TOOLS — Ship & Weapon Comparator
   Star Citizen Companion — SC 4.7.0
   Namespace: Comp
   =================================================== */

'use strict';

(function (global) {

  // ============================================================
  // DATA
  // ============================================================

  const SHIPS = [
    { name:"100i", mfr:"Origin", role:"Starter", size:"Small", scm:210, nav:1000, pitch:48, yaw:48, roll:135, hp:4500, armorHp:2000, cargo:2 },
    { name:"125a", mfr:"Origin", role:"Combat", size:"Small", scm:230, nav:1150, pitch:52, yaw:52, roll:145, hp:4800, armorHp:2500, cargo:2 },
    { name:"135c", mfr:"Origin", role:"Transport", size:"Small", scm:190, nav:950, pitch:45, yaw:45, roll:125, hp:4500, armorHp:2000, cargo:6 },
    { name:"300i", mfr:"Origin", role:"Touring", size:"Small", scm:204, nav:1100, pitch:48, yaw:48, roll:130, hp:6000, armorHp:2800, cargo:8 },
    { name:"315p", mfr:"Origin", role:"Pathfinder", size:"Small", scm:210, nav:1100, pitch:48, yaw:48, roll:130, hp:6000, armorHp:2800, cargo:12 },
    { name:"325a", mfr:"Origin", role:"Combat", size:"Small", scm:225, nav:1200, pitch:50, yaw:50, roll:140, hp:6800, armorHp:3500, cargo:4 },
    { name:"350r", mfr:"Origin", role:"Racing", size:"Small", scm:258, nav:1350, pitch:55, yaw:55, roll:160, hp:5500, armorHp:2200, cargo:0 },
    { name:"400i", mfr:"Origin", role:"Pathfinder", size:"Large", scm:184, nav:1250, pitch:32, yaw:32, roll:95, hp:45000, armorHp:28000, cargo:42 },
    { name:"600i Explorer", mfr:"Origin", role:"Expedition", size:"Large", scm:145, nav:980, pitch:26, yaw:26, roll:65, hp:85000, armorHp:42000, cargo:40 },
    { name:"600i Touring", mfr:"Origin", role:"Touring", size:"Large", scm:145, nav:980, pitch:26, yaw:26, roll:65, hp:85000, armorHp:42000, cargo:16 },
    { name:"85X", mfr:"Origin", role:"Touring", size:"Snub", scm:255, nav:1150, pitch:50, yaw:50, roll:130, hp:3000, armorHp:1200, cargo:0 },
    { name:"890 Jump", mfr:"Origin", role:"Capital Touring", size:"Capital", scm:80, nav:900, pitch:12, yaw:12, roll:25, hp:450000, armorHp:150000, cargo:484 },
    { name:"A2 Hercules", mfr:"Crusader", role:"Gunship/Bomber", size:"Large", scm:135, nav:950, pitch:22, yaw:22, roll:45, hp:120000, armorHp:65000, cargo:216 },
    { name:"Apollo Medivac", mfr:"RSI", role:"Medical", size:"Medium", scm:195, nav:1100, pitch:35, yaw:35, roll:90, hp:25000, armorHp:12000, cargo:28 },
    { name:"Ares Inferno", mfr:"Crusader", role:"Heavy Fighter", size:"Medium", scm:170, nav:1150, pitch:38, yaw:38, roll:105, hp:18000, armorHp:12500, cargo:0 },
    { name:"Ares Ion", mfr:"Crusader", role:"Heavy Fighter", size:"Medium", scm:170, nav:1150, pitch:38, yaw:38, roll:105, hp:18000, armorHp:12500, cargo:0 },
    { name:"Arrow", mfr:"Anvil", role:"Light Fighter", size:"Small", scm:270, nav:1235, pitch:58, yaw:58, roll:180, hp:3500, armorHp:1800, cargo:0 },
    { name:"Aurora CL", mfr:"RSI", role:"Freight", size:"Small", scm:185, nav:1050, pitch:42, yaw:42, roll:105, hp:4000, armorHp:1500, cargo:6 },
    { name:"Aurora ES", mfr:"RSI", role:"Starter", size:"Small", scm:190, nav:1050, pitch:44, yaw:44, roll:110, hp:4000, armorHp:1500, cargo:3 },
    { name:"Aurora LN", mfr:"RSI", role:"Combat", size:"Small", scm:185, nav:1050, pitch:44, yaw:44, roll:110, hp:4500, armorHp:2000, cargo:3 },
    { name:"Aurora LX", mfr:"RSI", role:"Pathfinder", size:"Small", scm:190, nav:1050, pitch:44, yaw:44, roll:110, hp:4000, armorHp:1600, cargo:3 },
    { name:"Aurora MR", mfr:"RSI", role:"Interdiction", size:"Small", scm:195, nav:1060, pitch:44, yaw:44, roll:110, hp:4200, armorHp:1800, cargo:3 },
    { name:"Avenger Stalker", mfr:"Aegis", role:"Interdiction", size:"Small", scm:250, nav:1300, pitch:48, yaw:48, roll:130, hp:8000, armorHp:4000, cargo:0 },
    { name:"Avenger Titan", mfr:"Aegis", role:"Freight", size:"Small", scm:188, nav:1115, pitch:48, yaw:48, roll:130, hp:8000, armorHp:4000, cargo:8 },
    { name:"Avenger Warlock", mfr:"Aegis", role:"EMP", size:"Small", scm:240, nav:1280, pitch:48, yaw:48, roll:130, hp:8000, armorHp:4000, cargo:0 },
    { name:"Ballista", mfr:"Anvil", role:"Ground AA", size:"Ground", scm:35, nav:0, pitch:0, yaw:0, roll:0, hp:15000, armorHp:10000, cargo:0 },
    { name:"Blade", mfr:"Esperia", role:"Light Fighter", size:"Small", scm:290, nav:1300, pitch:62, yaw:62, roll:190, hp:3800, armorHp:2200, cargo:0 },
    { name:"Buccaneer", mfr:"Drake", role:"Interdiction", size:"Small", scm:280, nav:1290, pitch:54, yaw:54, roll:165, hp:3200, armorHp:1500, cargo:0 },
    { name:"C1 Spirit", mfr:"Crusader", role:"Freight", size:"Medium", scm:204, nav:1120, pitch:32, yaw:32, roll:105, hp:22000, armorHp:11000, cargo:64 },
    { name:"C2 Hercules", mfr:"Crusader", role:"Transport", size:"Large", scm:135, nav:960, pitch:22, yaw:22, roll:45, hp:100000, armorHp:55000, cargo:696 },
    { name:"C8 Pisces", mfr:"Anvil", role:"Snub", size:"Snub", scm:140, nav:1050, pitch:50, yaw:50, roll:130, hp:3000, armorHp:1200, cargo:4 },
    { name:"C8R Pisces Rescue", mfr:"Anvil", role:"Medical", size:"Snub", scm:164, nav:1100, pitch:50, yaw:50, roll:130, hp:3000, armorHp:1200, cargo:0 },
    { name:"Carrack", mfr:"Anvil", role:"Exploration", size:"Large", scm:152, nav:1050, pitch:20, yaw:20, roll:40, hp:98000, armorHp:62000, cargo:456 },
    { name:"Caterpillar", mfr:"Drake", role:"Transport", size:"Large", scm:90, nav:900, pitch:18, yaw:18, roll:30, hp:85000, armorHp:45000, cargo:576 },
    { name:"Centurion", mfr:"Anvil", role:"Ground AA", size:"Ground", scm:30, nav:0, pitch:0, yaw:0, roll:0, hp:18000, armorHp:14000, cargo:0 },
    { name:"Constellation Andromeda", mfr:"RSI", role:"Gunship", size:"Large", scm:140, nav:911, pitch:25, yaw:25, roll:60, hp:55000, armorHp:28000, cargo:96 },
    { name:"Constellation Aquila", mfr:"RSI", role:"Exploration", size:"Large", scm:140, nav:911, pitch:25, yaw:25, roll:60, hp:55000, armorHp:28000, cargo:96 },
    { name:"Constellation Phoenix", mfr:"RSI", role:"Touring", size:"Large", scm:140, nav:911, pitch:25, yaw:25, roll:60, hp:52000, armorHp:26000, cargo:80 },
    { name:"Constellation Taurus", mfr:"RSI", role:"Freight", size:"Large", scm:140, nav:911, pitch:25, yaw:25, roll:60, hp:55000, armorHp:28000, cargo:174 },
    { name:"Corsair", mfr:"Drake", role:"Exploration", size:"Large", scm:150, nav:950, pitch:28, yaw:28, roll:55, hp:48000, armorHp:22000, cargo:72 },
    { name:"Cutlass Black", mfr:"Drake", role:"Medium Fighter", size:"Medium", scm:165, nav:1115, pitch:36, yaw:36, roll:90, hp:18500, armorHp:8500, cargo:46 },
    { name:"Cutlass Blue", mfr:"Drake", role:"Police", size:"Medium", scm:175, nav:1150, pitch:36, yaw:36, roll:90, hp:21000, armorHp:11000, cargo:12 },
    { name:"Cutlass Red", mfr:"Drake", role:"Medical", size:"Medium", scm:165, nav:1115, pitch:36, yaw:36, roll:90, hp:18500, armorHp:8500, cargo:12 },
    { name:"Cutlass Steel", mfr:"Drake", role:"Dropship", size:"Medium", scm:160, nav:1100, pitch:36, yaw:36, roll:90, hp:22000, armorHp:12000, cargo:0 },
    { name:"Cutter", mfr:"Drake", role:"Starter", size:"Small", scm:165, nav:1050, pitch:38, yaw:38, roll:85, hp:4500, armorHp:2000, cargo:4 },
    { name:"Cyclone", mfr:"Tumbril", role:"Ground", size:"Ground", scm:45, nav:0, pitch:0, yaw:0, roll:0, hp:2000, armorHp:800, cargo:1 },
    { name:"Defender", mfr:"Banu", role:"Light Fighter", size:"Small", scm:205, nav:1200, pitch:52, yaw:52, roll:140, hp:4500, armorHp:2000, cargo:0 },
    { name:"Dragonfly Black", mfr:"Drake", role:"Hover", size:"Snub", scm:55, nav:0, pitch:40, yaw:40, roll:60, hp:800, armorHp:300, cargo:0 },
    { name:"Eclipse", mfr:"Aegis", role:"Stealth Bomber", size:"Medium", scm:235, nav:1250, pitch:40, yaw:40, roll:110, hp:8500, armorHp:4000, cargo:0 },
    { name:"F7C Hornet", mfr:"Anvil", role:"Medium Fighter", size:"Small", scm:225, nav:1225, pitch:50, yaw:50, roll:135, hp:7500, armorHp:4500, cargo:2 },
    { name:"F7C-M Super Hornet", mfr:"Anvil", role:"Medium Fighter", size:"Small", scm:220, nav:1220, pitch:48, yaw:48, roll:130, hp:8500, armorHp:5500, cargo:0 },
    { name:"F7C-R Tracker", mfr:"Anvil", role:"Pathfinder", size:"Small", scm:225, nav:1225, pitch:50, yaw:50, roll:135, hp:7500, armorHp:4500, cargo:0 },
    { name:"F7C-S Ghost", mfr:"Anvil", role:"Stealth", size:"Small", scm:225, nav:1225, pitch:50, yaw:50, roll:135, hp:7000, armorHp:4000, cargo:0 },
    { name:"F8C Lightning", mfr:"Anvil", role:"Heavy Fighter", size:"Medium", scm:240, nav:1300, pitch:45, yaw:45, roll:120, hp:15000, armorHp:9000, cargo:0 },
    { name:"Freelancer", mfr:"MISC", role:"Freight", size:"Medium", scm:175, nav:1000, pitch:30, yaw:30, roll:65, hp:28000, armorHp:14000, cargo:66 },
    { name:"Freelancer DUR", mfr:"MISC", role:"Exploration", size:"Medium", scm:175, nav:1000, pitch:30, yaw:30, roll:65, hp:28000, armorHp:14000, cargo:28 },
    { name:"Freelancer MAX", mfr:"MISC", role:"Freight", size:"Medium", scm:165, nav:980, pitch:28, yaw:28, roll:60, hp:32000, armorHp:16000, cargo:120 },
    { name:"Freelancer MIS", mfr:"MISC", role:"Gunship", size:"Medium", scm:170, nav:1000, pitch:30, yaw:30, roll:65, hp:30000, armorHp:18000, cargo:36 },
    { name:"Fury", mfr:"Mirai", role:"Snub Fighter", size:"Snub", scm:240, nav:1200, pitch:60, yaw:60, roll:180, hp:1500, armorHp:600, cargo:0 },
    { name:"Fury LX", mfr:"Mirai", role:"Racing", size:"Snub", scm:280, nav:1300, pitch:65, yaw:65, roll:190, hp:1200, armorHp:500, cargo:0 },
    { name:"Gladiator", mfr:"Anvil", role:"Bomber", size:"Medium", scm:185, nav:1100, pitch:42, yaw:42, roll:110, hp:18000, armorHp:9500, cargo:0 },
    { name:"Gladius", mfr:"Aegis", role:"Light Fighter", size:"Small", scm:280, nav:1235, pitch:58, yaw:58, roll:160, hp:5500, armorHp:2800, cargo:0 },
    { name:"Glaive", mfr:"Esperia", role:"Medium Fighter", size:"Medium", scm:240, nav:1250, pitch:52, yaw:52, roll:140, hp:12000, armorHp:6500, cargo:0 },
    { name:"Hammerhead", mfr:"Aegis", role:"Gunship", size:"Large", scm:105, nav:900, pitch:18, yaw:18, roll:40, hp:185000, armorHp:110000, cargo:40 },
    { name:"Hawk", mfr:"Anvil", role:"Light Fighter", size:"Small", scm:220, nav:1200, pitch:54, yaw:54, roll:150, hp:3800, armorHp:1900, cargo:0 },
    { name:"Herald", mfr:"Drake", role:"Data", size:"Small", scm:295, nav:1360, pitch:55, yaw:55, roll:140, hp:4500, armorHp:2000, cargo:0 },
    { name:"Hull A", mfr:"MISC", role:"Freight", size:"Small", scm:160, nav:950, pitch:35, yaw:35, roll:70, hp:8000, armorHp:4500, cargo:64 },
    { name:"Hull C", mfr:"MISC", role:"Freight", size:"Large", scm:110, nav:900, pitch:15, yaw:15, roll:25, hp:65000, armorHp:32000, cargo:4608 },
    { name:"Hurricane", mfr:"Anvil", role:"Heavy Fighter", size:"Small", scm:235, nav:1225, pitch:45, yaw:45, roll:130, hp:6000, armorHp:3200, cargo:0 },
    { name:"Khartu-Al", mfr:"Xi'an", role:"Light Fighter", size:"Small", scm:260, nav:1320, pitch:65, yaw:65, roll:200, hp:2800, armorHp:1200, cargo:0 },
    { name:"M2 Hercules", mfr:"Crusader", role:"Transport", size:"Large", scm:135, nav:960, pitch:22, yaw:22, roll:45, hp:115000, armorHp:62000, cargo:522 },
    { name:"M50", mfr:"Origin", role:"Racing", size:"Small", scm:285, nav:1345, pitch:60, yaw:60, roll:180, hp:1800, armorHp:800, cargo:0 },
    { name:"Mantis", mfr:"RSI", role:"Interdiction", size:"Medium", scm:245, nav:1220, pitch:50, yaw:50, roll:140, hp:6500, armorHp:3500, cargo:0 },
    { name:"Merchantman", mfr:"Banu", role:"Heavy Freight", size:"Capital", scm:95, nav:900, pitch:15, yaw:15, roll:30, hp:220000, armorHp:120000, cargo:2880 },
    { name:"Mercury Star Runner", mfr:"Crusader", role:"Data/Freight", size:"Medium", scm:215, nav:1285, pitch:42, yaw:42, roll:90, hp:32000, armorHp:16000, cargo:114 },
    { name:"Mole", mfr:"Argo", role:"Mining", size:"Medium", scm:95, nav:900, pitch:22, yaw:22, roll:40, hp:45000, armorHp:28000, cargo:96 },
    { name:"MPUV Cargo", mfr:"Argo", role:"Snub Transport", size:"Snub", scm:120, nav:900, pitch:40, yaw:40, roll:80, hp:2000, armorHp:1100, cargo:2 },
    { name:"MPUV Personnel", mfr:"Argo", role:"Snub Transport", size:"Snub", scm:120, nav:900, pitch:40, yaw:40, roll:80, hp:2000, armorHp:1100, cargo:0 },
    { name:"Mustang Alpha", mfr:"Consolidated Outland", role:"Starter", size:"Small", scm:215, nav:1160, pitch:52, yaw:52, roll:145, hp:3800, armorHp:1600, cargo:4 },
    { name:"Mustang Beta", mfr:"Consolidated Outland", role:"Pathfinder", size:"Small", scm:215, nav:1160, pitch:52, yaw:52, roll:145, hp:3800, armorHp:1600, cargo:0 },
    { name:"Mustang Delta", mfr:"Consolidated Outland", role:"Light Fighter", size:"Small", scm:220, nav:1200, pitch:54, yaw:54, roll:150, hp:4200, armorHp:2100, cargo:0 },
    { name:"Mustang Gamma", mfr:"Consolidated Outland", role:"Racing", size:"Small", scm:255, nav:1300, pitch:58, yaw:58, roll:165, hp:3500, armorHp:1400, cargo:0 },
    { name:"Nomad", mfr:"Consolidated Outland", role:"Freight", size:"Small", scm:195, nav:1170, pitch:40, yaw:40, roll:110, hp:8500, armorHp:4200, cargo:24 },
    { name:"Nova Tank", mfr:"Tumbril", role:"Ground", size:"Ground", scm:35, nav:0, pitch:0, yaw:0, roll:0, hp:25000, armorHp:18000, cargo:0 },
    { name:"Nox", mfr:"Aopoa", role:"Hover", size:"Snub", scm:65, nav:0, pitch:45, yaw:45, roll:70, hp:600, armorHp:250, cargo:0 },
    { name:"P-52 Merlin", mfr:"Kruger", role:"Snub Fighter", size:"Snub", scm:245, nav:1200, pitch:60, yaw:60, roll:160, hp:1200, armorHp:600, cargo:0 },
    { name:"P-72 Archimedes", mfr:"Kruger", role:"Snub Racer", size:"Snub", scm:275, nav:1300, pitch:65, yaw:65, roll:170, hp:1000, armorHp:500, cargo:0 },
    { name:"Prowler", mfr:"Esperia", role:"Dropship", size:"Medium", scm:185, nav:1115, pitch:38, yaw:38, roll:115, hp:18000, armorHp:9000, cargo:0 },
    { name:"Prospector", mfr:"MISC", role:"Mining", size:"Small", scm:145, nav:1000, pitch:35, yaw:35, roll:85, hp:8500, armorHp:4200, cargo:32 },
    { name:"Raft", mfr:"Argo", role:"Freight", size:"Medium", scm:130, nav:950, pitch:25, yaw:25, roll:60, hp:35000, armorHp:18000, cargo:96 },
    { name:"Razor", mfr:"MISC", role:"Racing", size:"Small", scm:275, nav:1345, pitch:62, yaw:62, roll:175, hp:2000, armorHp:900, cargo:0 },
    { name:"Razor EX", mfr:"MISC", role:"Stealth", size:"Small", scm:265, nav:1300, pitch:60, yaw:60, roll:170, hp:1800, armorHp:800, cargo:0 },
    { name:"Razor LX", mfr:"MISC", role:"Racing", size:"Small", scm:290, nav:1360, pitch:64, yaw:64, roll:180, hp:1600, armorHp:750, cargo:0 },
    { name:"Reclaimer", mfr:"Aegis", role:"Salvage", size:"Capital", scm:85, nav:920, pitch:12, yaw:12, roll:20, hp:150000, armorHp:85000, cargo:180 },
    { name:"Redeemer", mfr:"Aegis", role:"Gunship", size:"Medium", scm:140, nav:960, pitch:28, yaw:28, roll:65, hp:55000, armorHp:32000, cargo:2 },
    { name:"Reliant Kore", mfr:"MISC", role:"Freight", size:"Small", scm:175, nav:1140, pitch:40, yaw:40, roll:120, hp:4500, armorHp:2200, cargo:6 },
    { name:"Reliant Mako", mfr:"MISC", role:"Media", size:"Small", scm:175, nav:1140, pitch:40, yaw:40, roll:120, hp:4500, armorHp:2200, cargo:0 },
    { name:"Reliant Sen", mfr:"MISC", role:"Science", size:"Small", scm:175, nav:1140, pitch:40, yaw:40, roll:120, hp:4500, armorHp:2200, cargo:0 },
    { name:"Reliant Tana", mfr:"MISC", role:"Combat", size:"Small", scm:175, nav:1140, pitch:40, yaw:40, roll:120, hp:5200, armorHp:2800, cargo:0 },
    { name:"Retaliator", mfr:"Aegis", role:"Bomber", size:"Large", scm:125, nav:980, pitch:24, yaw:24, roll:50, hp:68000, armorHp:38000, cargo:0 },
    { name:"ROC", mfr:"Greycat", role:"Ground Mining", size:"Ground", scm:30, nav:0, pitch:0, yaw:0, roll:0, hp:1500, armorHp:700, cargo:0.8 },
    { name:"Sabre", mfr:"Aegis", role:"Stealth Fighter", size:"Medium", scm:220, nav:1235, pitch:48, yaw:48, roll:145, hp:7500, armorHp:4200, cargo:0 },
    { name:"Sabre Comet", mfr:"Aegis", role:"Stealth Fighter", size:"Medium", scm:220, nav:1235, pitch:48, yaw:48, roll:145, hp:7800, armorHp:4400, cargo:0 },
    { name:"San'tok.yāi", mfr:"Aopoa", role:"Medium Fighter", size:"Medium", scm:240, nav:1250, pitch:58, yaw:58, roll:190, hp:8000, armorHp:4100, cargo:0 },
    { name:"Scorpius", mfr:"RSI", role:"Heavy Fighter", size:"Medium", scm:205, nav:1220, pitch:42, yaw:42, roll:120, hp:16000, armorHp:8500, cargo:0 },
    { name:"Scythe", mfr:"Vanduul", role:"Medium Fighter", size:"Medium", scm:235, nav:1250, pitch:55, yaw:55, roll:150, hp:11000, armorHp:5800, cargo:0 },
    { name:"Spartan", mfr:"Anvil", role:"Ground APC", size:"Ground", scm:32, nav:0, pitch:0, yaw:0, roll:0, hp:16000, armorHp:11000, cargo:0 },
    { name:"Starfarer", mfr:"MISC", role:"Refuel", size:"Large", scm:105, nav:900, pitch:18, yaw:18, roll:35, hp:85000, armorHp:48000, cargo:291 },
    { name:"Starfarer Gemini", mfr:"MISC", role:"Refuel", size:"Large", scm:105, nav:900, pitch:16, yaw:16, roll:32, hp:98000, armorHp:55000, cargo:291 },
    { name:"SRV", mfr:"Argo", role:"Tractor", size:"Medium", scm:125, nav:1000, pitch:28, yaw:28, roll:60, hp:28000, armorHp:14000, cargo:10 },
    { name:"Talon", mfr:"Esperia", role:"Light Fighter", size:"Small", scm:260, nav:1250, pitch:56, yaw:56, roll:160, hp:3500, armorHp:1800, cargo:0 },
    { name:"Talon Shrike", mfr:"Esperia", role:"Light Fighter", size:"Small", scm:260, nav:1250, pitch:56, yaw:56, roll:160, hp:3500, armorHp:1800, cargo:0 },
    { name:"Terrapin", mfr:"Anvil", role:"Pathfinder", size:"Small", scm:165, nav:1050, pitch:35, yaw:35, roll:90, hp:35000, armorHp:22000, cargo:0 },
    { name:"Ursa Rover", mfr:"RSI", role:"Ground", size:"Ground", scm:35, nav:0, pitch:0, yaw:0, roll:0, hp:2500, armorHp:1400, cargo:4 },
    { name:"Valkyrie", mfr:"Anvil", role:"Dropship", size:"Large", scm:155, nav:1000, pitch:28, yaw:28, roll:75, hp:45000, armorHp:25000, cargo:30 },
    { name:"Vanguard Harbinger", mfr:"Aegis", role:"Bomber", size:"Medium", scm:185, nav:1100, pitch:32, yaw:32, roll:85, hp:32000, armorHp:18000, cargo:0 },
    { name:"Vanguard Hoplite", mfr:"Aegis", role:"Dropship", size:"Medium", scm:195, nav:1115, pitch:35, yaw:35, roll:90, hp:32000, armorHp:18000, cargo:0 },
    { name:"Vanguard Sentinel", mfr:"Aegis", role:"E-War", size:"Medium", scm:195, nav:1115, pitch:35, yaw:35, roll:90, hp:31000, armorHp:17000, cargo:0 },
    { name:"Vanguard Warden", mfr:"Aegis", role:"Heavy Fighter", size:"Medium", scm:195, nav:1115, pitch:35, yaw:35, roll:90, hp:32000, armorHp:18000, cargo:0 },
    { name:"Vulture", mfr:"Drake", role:"Salvage", size:"Medium", scm:165, nav:1000, pitch:30, yaw:30, roll:80, hp:12500, armorHp:6500, cargo:12 }
  ];

  function buildWeapons() {
    const w = [];
    const cfNames = ["Bulldog","Badger","Panther","Rhino","Galdereen"];
    cfNames.forEach((n,i) => w.push({name:`CF-${117+(i*110)} ${n}`,type:"Laser Repeater",size:i+1,dps:200*(i+1),alpha:40*(i+1),range:1200+(i*400),armorPen:2}));
    [1,2,3,4,5,6].forEach(s => w.push({name:`Attrition-${s}`,type:"Laser Repeater",size:s,dps:220*s,alpha:35*s,range:600+(s*300),armorPen:3}));
    ["M3A","M4A","M5A","M6A","M7A"].forEach((n,i) => w.push({name:n,type:"Laser Cannon",size:i+1,dps:180*(i+1),alpha:90*(i+1),range:1800+(i*600),armorPen:5}));
    ["III","VI","IX","XII","XV"].forEach((n,i) => w.push({name:`Omnisky ${n}`,type:"Laser Cannon",size:i+1,dps:190*(i+1),alpha:100*(i+1),range:1900+(i*500),armorPen:5}));
    ["GT-215 Scorpion","GT-220 Mantis","AD4B","AD5B"].forEach((n,i) => {const sz=i+2; w.push({name:n,type:"Ballistic Gatling",size:sz,dps:350*sz,alpha:25*sz,range:1500+(sz*200),armorPen:50});});
    w.push({name:"C-788 Combine",type:"Ballistic Cannon",size:4,dps:450,alpha:280,range:2500,armorPen:55});
    [1,2,3].forEach(s => w.push({name:`Sledge ${s} Mass Driver`,type:"Mass Driver",size:s,dps:150*s,alpha:180*s,range:2200,armorPen:60}));
    ["Suckerpunch","Suckerpunch-XL"].forEach((n,i) => w.push({name:n,type:"Distortion Cannon",size:i+1,dps:0,alpha:0,range:1000+(i*500),armorPen:0,note:"Subsistemas"}));
    return w;
  }

  const WEAPONS = buildWeapons();

  // ============================================================
  // STATE
  // ============================================================

  const compState = {
    tab: 'ships',
    searchShips: '',
    searchWeapons: '',
    filterRole: '',
    filterMfr: '',
    filterType: '',
    selected: [],  // [{type:'ship'|'weapon', name:string}]
    shipImages: {},
    _imagesLoaded: false
  };

  // ============================================================
  // HELPERS
  // ============================================================

  function escComp(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function isSelected(type, name) {
    return compState.selected.some(s => s.type === type && s.name === name);
  }

  function getShip(name) { return SHIPS.find(s => s.name === name); }
  function getWeapon(name) { return WEAPONS.find(w => w.name === name); }

  function fmtNum(n) {
    if (n === 0) return '—';
    if (n >= 1000) return n.toLocaleString('es');
    return String(n);
  }

  function showToast(msg) {
    let toast = document.getElementById('comp-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'comp-toast';
      toast.style.cssText = [
        'position:fixed',
        'bottom:2rem',
        'left:50%',
        'transform:translateX(-50%)',
        'background:rgba(12,10,9,0.97)',
        'border:1px solid rgba(245,158,11,0.6)',
        'color:#fef3c7',
        'font-family:\'Rajdhani\',sans-serif',
        'font-size:0.95rem',
        'padding:0.7rem 1.5rem',
        'border-radius:4px',
        'z-index:5000',
        'box-shadow:0 4px 20px rgba(0,0,0,0.6),0 0 12px rgba(245,158,11,0.15)',
        'pointer-events:none',
        'transition:opacity 0.3s ease'
      ].join(';');
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
  }

  // ============================================================
  // TAB SWITCHING
  // ============================================================

  function switchTab(tab) {
    compState.tab = tab;
    render();
  }

  // ============================================================
  // SELECTION
  // ============================================================

  function toggleSelect(type, name) {
    const idx = compState.selected.findIndex(s => s.type === type && s.name === name);
    if (idx !== -1) {
      compState.selected.splice(idx, 1);
    } else {
      if (compState.selected.length >= 4) {
        showToast('Máximo 4 elementos para comparar');
        return;
      }
      compState.selected.push({ type, name });
    }
    render();
  }

  function clearSelection() {
    compState.selected = [];
    render();
  }

  // ============================================================
  // MAIN RENDER DISPATCHER
  // ============================================================

  function render() {
    const root = document.getElementById('compContentArea');
    if (!root) return;
    root.innerHTML = buildLayout();
    attachEventListeners();
    updateFloatingBtn();
  }

  function updateFloatingBtn() {
    let fab = document.getElementById('comp-fab');
    const count = compState.selected.length;

    if (count === 0) {
      if (fab) fab.style.opacity = '0';
      return;
    }

    if (!fab) {
      fab = document.createElement('button');
      fab.id = 'comp-fab';
      fab.style.cssText = [
        'position:fixed',
        'bottom:1.8rem',
        'right:1.8rem',
        'z-index:4000',
        'display:flex',
        'align-items:center',
        'gap:0.5rem',
        'padding:0.8rem 1.4rem',
        'background:var(--accent)',
        'color:#0c0a09',
        'font-family:var(--font-hud)',
        'font-size:0.82rem',
        'font-weight:700',
        'letter-spacing:0.1em',
        'text-transform:uppercase',
        'border:none',
        'border-radius:4px',
        'cursor:pointer',
        'box-shadow:0 4px 20px rgba(245,158,11,0.5),0 0 40px rgba(245,158,11,0.2)',
        'transition:all 0.25s ease',
        'white-space:nowrap',
      ].join(';');
      fab.addEventListener('click', () => {
        compState.tab = 'compare';
        render();
        document.querySelector('#compContentArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      fab.addEventListener('mouseenter', () => {
        fab.style.background = 'var(--accent-light)';
        fab.style.transform = 'translateY(-2px)';
        fab.style.boxShadow = '0 6px 28px rgba(245,158,11,0.65),0 0 50px rgba(245,158,11,0.25)';
      });
      fab.addEventListener('mouseleave', () => {
        fab.style.background = 'var(--accent)';
        fab.style.transform = '';
        fab.style.boxShadow = '0 4px 20px rgba(245,158,11,0.5),0 0 40px rgba(245,158,11,0.2)';
      });
      document.body.appendChild(fab);
    }

    fab.innerHTML = `⚖ Comparar <span style="background:#0c0a09;color:var(--accent);border-radius:50%;width:1.3rem;height:1.3rem;display:inline-flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:900;">${count}</span>`;
    fab.style.opacity = '1';
    fab.style.pointerEvents = 'auto';
  }

  // Remove FAB when leaving comparador
  function destroyFloatingBtn() {
    const fab = document.getElementById('comp-fab');
    if (fab) fab.remove();
  }

  // ============================================================
  // LAYOUT SHELL
  // ============================================================

  function buildLayout() {
    const selCount = compState.selected.length;
    const tabShips    = compState.tab === 'ships'   ? 'comp-tab-btn active' : 'comp-tab-btn';
    const tabWeapons  = compState.tab === 'weapons' ? 'comp-tab-btn active' : 'comp-tab-btn';
    const tabCompare  = compState.tab === 'compare' ? 'comp-tab-btn active' : 'comp-tab-btn';

    const badge = selCount > 0
      ? `<span class="comp-sel-badge">${selCount}</span>`
      : '';

    const selectionBar = selCount > 0 ? buildSelectionBar() : '';

    let content = '';
    if (compState.tab === 'ships')   content = buildShipsPane();
    if (compState.tab === 'weapons') content = buildWeaponsPane();
    if (compState.tab === 'compare') content = buildComparePane();

    return `
      <div class="page-header">
        <h1 class="page-title">◈ Comparador</h1>
        <p class="page-subtitle">Naves y armas · SC 4.7.0</p>
      </div>

      <div class="comp-tabs">
        <button class="${tabShips}"    onclick="Comp.switchTab('ships')">Naves</button>
        <button class="${tabWeapons}"  onclick="Comp.switchTab('weapons')">Armas</button>
        <button class="${tabCompare}"  onclick="Comp.switchTab('compare')">
          Comparar ${badge}
        </button>
        ${selCount > 0 ? `<button class="comp-clear-btn" onclick="Comp.clearSelection()" title="Limpiar selección">✕ Limpiar</button>` : ''}
      </div>

      ${selectionBar}
      ${content}
    `;
  }

  // ============================================================
  // SELECTION BAR (chips of selected items)
  // ============================================================

  function buildSelectionBar() {
    const chips = compState.selected.map(s => {
      const label = escComp(s.name);
      const typeLabel = s.type === 'ship' ? 'Nave' : 'Arma';
      return `<div class="comp-chip">
        <span class="comp-chip-type">${typeLabel}</span>
        <span class="comp-chip-name">${label}</span>
        <button class="comp-chip-remove"
          onclick="Comp.toggleSelect('${escComp(s.type)}','${escComp(s.name).replace(/'/g,"\\'")}')"
          title="Quitar">✕</button>
      </div>`;
    }).join('');

    return `<div class="comp-selection-bar">${chips}</div>`;
  }

  // ============================================================
  // SHIPS PANE
  // ============================================================

  function buildShipsPane() {
    // Build filter options
    const roles = [...new Set(SHIPS.map(s => s.role))].sort();
    const mfrs  = [...new Set(SHIPS.map(s => s.mfr))].sort();

    const roleOpts = roles.map(r =>
      `<option value="${escComp(r)}" ${compState.filterRole === r ? 'selected' : ''}>${escComp(r)}</option>`
    ).join('');

    const mfrOpts = mfrs.map(m =>
      `<option value="${escComp(m)}" ${compState.filterMfr === m ? 'selected' : ''}>${escComp(m)}</option>`
    ).join('');

    // Filter ships
    let ships = SHIPS.filter(s => {
      const q = compState.searchShips.toLowerCase();
      if (q && !s.name.toLowerCase().includes(q) && !s.mfr.toLowerCase().includes(q) && !s.role.toLowerCase().includes(q)) return false;
      if (compState.filterRole && s.role !== compState.filterRole) return false;
      if (compState.filterMfr  && s.mfr  !== compState.filterMfr)  return false;
      return true;
    });

    const cards = ships.map(s => buildShipCard(s)).join('');
    const empty = ships.length === 0
      ? `<div class="comp-empty"><div class="comp-empty-icon">◈</div><p>Sin resultados para este filtro</p></div>`
      : '';

    return `
      <div class="controls-bar">
        <div class="search-box">
          <span class="search-icon">&#128269;</span>
          <input type="text" id="compSearchShips" class="comp-search-input"
            placeholder="Buscar nave, fabricante o rol..."
            value="${escComp(compState.searchShips)}" autocomplete="off" />
          ${compState.searchShips ? `<button class="search-clear visible" id="compClearShips" onclick="Comp._clearSearchShips()">✕</button>` : ''}
        </div>
        <div class="filters">
          <select class="filter-select" id="compRoleFilter">
            <option value="">Todos los roles</option>
            ${roleOpts}
          </select>
          <select class="filter-select" id="compMfrFilter">
            <option value="">Todos los fabricantes</option>
            ${mfrOpts}
          </select>
        </div>
      </div>
      <div class="comp-results-bar">
        <span class="comp-count">${ships.length} nave${ships.length !== 1 ? 's' : ''}</span>
        <span class="comp-hint">Selecciona hasta 4 para comparar</span>
      </div>
      <div class="comp-grid">
        ${cards}
        ${empty}
      </div>
    `;
  }

  function buildShipCard(ship) {
    const sel = isSelected('ship', ship.name);
    const selClass = sel ? ' comp-selected' : '';
    const nameEncoded = escComp(ship.name).replace(/'/g, "\\'");

    const sizeColor = {
      'Small':   '#10b981',
      'Medium':  '#3b82f6',
      'Large':   '#f59e0b',
      'Capital': '#ef4444',
      'Snub':    '#8b5cf6',
      'Ground':  '#6b7280'
    }[ship.size] || '#a88b4a';

    const roleColor = getRoleColor(ship.role);
    const mfrColor  = MFR_COLOR[ship.mfr] || '#8a7048';

    const imgUrl = compState.shipImages && compState.shipImages[ship.name];
    const bannerHtml = imgUrl
      ? `<div class="comp-ship-banner">
          <img src="${escComp(imgUrl)}" alt="${escComp(ship.name)}" loading="lazy"
               onerror="this.parentElement.style.background='linear-gradient(135deg,${mfrColor}15 0%,transparent 80%)';this.remove()">
        </div>`
      : `<div class="comp-ship-banner comp-banner-placeholder"
             style="background:linear-gradient(135deg,${mfrColor}15 0%,transparent 80%)">
          <span class="comp-banner-mfr" style="color:${mfrColor}">${escComp(ship.mfr)}</span>
        </div>`;

    return `
      <div class="bp-card comp-card${selClass}"
           onclick="Comp.toggleSelect('ship','${nameEncoded}')"
           title="${sel ? 'Quitar de comparación' : 'Añadir a comparación'}">
        ${bannerHtml}
        ${sel ? '<div class="comp-selected-mark">&#10003;</div>' : ''}
        <div class="comp-card-header">
          <div class="comp-ship-name">${escComp(ship.name)}</div>
          <div class="comp-mfr">${escComp(ship.mfr)}</div>
        </div>
        <div class="comp-badges">
          <span class="comp-badge comp-badge-role" style="background:${roleColor}20;border-color:${roleColor}60;color:#1a0f00">${escComp(ship.role)}</span>
          <span class="comp-badge comp-badge-size" style="background:${sizeColor}20;border-color:${sizeColor}60;color:#1a0f00">${escComp(ship.size)}</span>
        </div>
        <div class="comp-stats-row">
          <div class="comp-stat">
            <span class="comp-stat-label">SCM</span>
            <span class="comp-stat-val">${ship.scm} <span class="comp-stat-unit">m/s</span></span>
          </div>
          <div class="comp-stat">
            <span class="comp-stat-label">NAV</span>
            <span class="comp-stat-val">${fmtNum(ship.nav)} <span class="comp-stat-unit">m/s</span></span>
          </div>
          <div class="comp-stat">
            <span class="comp-stat-label">HP</span>
            <span class="comp-stat-val">${fmtNum(ship.hp)}</span>
          </div>
          <div class="comp-stat">
            <span class="comp-stat-label">Cargo</span>
            <span class="comp-stat-val">${ship.cargo > 0 ? ship.cargo + ' <span class="comp-stat-unit">SCU</span>' : '—'}</span>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================
  // WEAPONS PANE
  // ============================================================

  function buildWeaponsPane() {
    const types = [...new Set(WEAPONS.map(w => w.type))].sort();

    const typeOpts = types.map(t =>
      `<option value="${escComp(t)}" ${compState.filterType === t ? 'selected' : ''}>${escComp(t)}</option>`
    ).join('');

    let weapons = WEAPONS.filter(w => {
      const q = compState.searchWeapons.toLowerCase();
      if (q && !w.name.toLowerCase().includes(q) && !w.type.toLowerCase().includes(q)) return false;
      if (compState.filterType && w.type !== compState.filterType) return false;
      return true;
    });

    const cards = weapons.map(w => buildWeaponCard(w)).join('');
    const empty = weapons.length === 0
      ? `<div class="comp-empty"><div class="comp-empty-icon">◈</div><p>Sin resultados para este filtro</p></div>`
      : '';

    return `
      <div class="controls-bar">
        <div class="search-box">
          <span class="search-icon">&#128269;</span>
          <input type="text" id="compSearchWeapons" class="comp-search-input"
            placeholder="Buscar arma o tipo..."
            value="${escComp(compState.searchWeapons)}" autocomplete="off" />
          ${compState.searchWeapons ? `<button class="search-clear visible" id="compClearWeapons" onclick="Comp._clearSearchWeapons()">✕</button>` : ''}
        </div>
        <div class="filters">
          <select class="filter-select" id="compTypeFilter">
            <option value="">Todos los tipos</option>
            ${typeOpts}
          </select>
        </div>
      </div>
      <div class="comp-results-bar">
        <span class="comp-count">${weapons.length} arma${weapons.length !== 1 ? 's' : ''}</span>
        <span class="comp-hint">Selecciona hasta 4 para comparar</span>
      </div>
      <div class="comp-grid">
        ${cards}
        ${empty}
      </div>
    `;
  }

  function buildWeaponCard(weapon) {
    const sel = isSelected('weapon', weapon.name);
    const selClass = sel ? ' comp-selected' : '';
    const nameEncoded = escComp(weapon.name).replace(/'/g, "\\'");

    const typeColor = getWeaponTypeColor(weapon.type);
    const sizeDots = '●'.repeat(Math.min(weapon.size, 6)) + '○'.repeat(Math.max(0, 6 - weapon.size));

    return `
      <div class="bp-card comp-card comp-weapon-card${selClass}"
           onclick="Comp.toggleSelect('weapon','${nameEncoded}')"
           title="${sel ? 'Quitar de comparación' : 'Añadir a comparación'}">
        ${sel ? '<div class="comp-selected-mark">&#10003;</div>' : ''}
        <div class="comp-card-header">
          <div class="comp-ship-name">${escComp(weapon.name)}</div>
          <div class="comp-mfr comp-weapon-size" title="Tamaño ${weapon.size}">${sizeDots}</div>
        </div>
        <div class="comp-badges">
          <span class="comp-badge" style="background:${typeColor}20;border-color:${typeColor}60;color:#1a0f00">${escComp(weapon.type)}</span>
          <span class="comp-badge comp-badge-size" style="color:#1a0f00;border-color:var(--border)">S${weapon.size}</span>
        </div>
        ${weapon.note ? `<div class="comp-weapon-note">${escComp(weapon.note)}</div>` : ''}
        <div class="comp-stats-row">
          <div class="comp-stat">
            <span class="comp-stat-label">DPS</span>
            <span class="comp-stat-val">${fmtNum(weapon.dps)}</span>
          </div>
          <div class="comp-stat">
            <span class="comp-stat-label">Alpha</span>
            <span class="comp-stat-val">${fmtNum(weapon.alpha)}</span>
          </div>
          <div class="comp-stat">
            <span class="comp-stat-label">Alcance</span>
            <span class="comp-stat-val">${fmtNum(weapon.range)} <span class="comp-stat-unit">m</span></span>
          </div>
          <div class="comp-stat">
            <span class="comp-stat-label">Pen. Arm.</span>
            <span class="comp-stat-val">${weapon.armorPen}%</span>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================
  // COMPARE PANE
  // ============================================================

  function buildComparePane() {
    if (compState.selected.length === 0) {
      return `
        <div class="comp-empty comp-empty-compare">
          <div class="comp-empty-icon">◈</div>
          <p class="comp-empty-title">Sin elementos seleccionados</p>
          <p class="comp-empty-sub">Selecciona hasta 4 naves o armas para comparar</p>
          <div class="comp-empty-actions">
            <button class="btn-primary" onclick="Comp.switchTab('ships')">Ver Naves</button>
            <button class="btn-ghost"  onclick="Comp.switchTab('weapons')">Ver Armas</button>
          </div>
        </div>
      `;
    }

    // Resolve items
    const items = compState.selected.map(s => {
      if (s.type === 'ship')   return { type: 'ship',   data: getShip(s.name) };
      if (s.type === 'weapon') return { type: 'weapon', data: getWeapon(s.name) };
      return null;
    }).filter(Boolean);

    // Separate ships and weapons for per-category maxima
    const ships   = items.filter(i => i.type === 'ship').map(i => i.data);
    const weapons = items.filter(i => i.type === 'weapon').map(i => i.data);

    // Compute maxima across ALL selected items of same type
    const shipMaxima   = computeMaxima(ships,   SHIP_STAT_KEYS);
    const weaponMaxima = computeMaxima(weapons, WEAPON_STAT_KEYS);

    const cards = items.map(item => {
      if (item.type === 'ship')   return buildCompareShipCard(item.data, shipMaxima);
      if (item.type === 'weapon') return buildCompareWeaponCard(item.data, weaponMaxima);
      return '';
    }).join('');

    const cols = Math.min(items.length, 4);

    return `
      <div class="comp-compare-area" style="--comp-cols:${cols}">
        ${cards}
      </div>
    `;
  }

  const SHIP_STAT_KEYS   = ['scm','nav','pitch','yaw','roll','hp','armorHp','cargo'];
  const WEAPON_STAT_KEYS = ['dps','alpha','range','armorPen'];

  function computeMaxima(items, keys) {
    const maxima = {};
    keys.forEach(k => {
      maxima[k] = Math.max(...items.map(i => i[k] || 0), 1);
    });
    return maxima;
  }

  function buildCompareShipCard(ship, maxima) {
    const sizeColor = {
      'Small':   '#10b981',
      'Medium':  '#3b82f6',
      'Large':   '#f59e0b',
      'Capital': '#ef4444',
      'Snub':    '#8b5cf6',
      'Ground':  '#6b7280'
    }[ship.size] || '#a88b4a';

    const roleColor = getRoleColor(ship.role);
    const mfrColor  = MFR_COLOR[ship.mfr] || '#8a7048';

    const imgUrl = compState.shipImages && compState.shipImages[ship.name];
    const cmpBannerHtml = imgUrl
      ? `<div class="comp-cmp-banner">
          <img src="${escComp(imgUrl)}" alt="${escComp(ship.name)}" loading="lazy"
               onerror="this.parentElement.style.background='linear-gradient(135deg,${mfrColor}18 0%,transparent 80%)';this.remove()">
        </div>`
      : `<div class="comp-cmp-banner comp-banner-placeholder"
             style="background:linear-gradient(135deg,${mfrColor}18 0%,transparent 80%)">
          <span class="comp-banner-mfr" style="color:${mfrColor}">${escComp(ship.mfr)}</span>
        </div>`;

    const stats = [
      { label: 'SCM Speed',    key: 'scm',     unit: 'm/s', higher: true },
      { label: 'NAV Speed',    key: 'nav',     unit: 'm/s', higher: true },
      { label: 'Pitch (°/s)',  key: 'pitch',   unit: '°/s', higher: true },
      { label: 'Yaw (°/s)',    key: 'yaw',     unit: '°/s', higher: true },
      { label: 'Roll (°/s)',   key: 'roll',    unit: '°/s', higher: true },
      { label: 'Hull HP',      key: 'hp',      unit: '',    higher: true },
      { label: 'Armor HP',     key: 'armorHp', unit: '',    higher: true },
      { label: 'Cargo',        key: 'cargo',   unit: 'SCU', higher: true }
    ];

    const rows = stats.map(s => buildStatRow(ship[s.key], maxima[s.key], s.label, s.unit, s.higher)).join('');

    return `
      <div class="comp-compare-card">
        ${cmpBannerHtml}
        <div class="comp-cmp-header">
          <div class="comp-cmp-name">${escComp(ship.name)}</div>
          <div class="comp-cmp-sub">${escComp(ship.mfr)}</div>
          <div class="comp-cmp-badges">
            <span class="comp-badge" style="background:${roleColor}20;border-color:${roleColor}60;color:#1a0f00">${escComp(ship.role)}</span>
            <span class="comp-badge" style="background:${sizeColor}20;border-color:${sizeColor}60;color:#1a0f00">${escComp(ship.size)}</span>
          </div>
        </div>
        <div class="comp-cmp-stats">
          ${rows}
        </div>
        <button class="comp-cmp-remove"
          onclick="Comp.toggleSelect('ship','${escComp(ship.name).replace(/'/g,"\\'")}')">
          ✕ Quitar
        </button>
      </div>
    `;
  }

  function buildCompareWeaponCard(weapon, maxima) {
    const typeColor = getWeaponTypeColor(weapon.type);

    const stats = [
      { label: 'DPS',             key: 'dps',      unit: '',  higher: true },
      { label: 'Alpha Damage',    key: 'alpha',    unit: '',  higher: true },
      { label: 'Range',           key: 'range',    unit: 'm', higher: true },
      { label: 'Armor Pen.',      key: 'armorPen', unit: '%', higher: true }
    ];

    const rows = stats.map(s => buildStatRow(weapon[s.key], maxima[s.key], s.label, s.unit, s.higher)).join('');

    return `
      <div class="comp-compare-card">
        <div class="comp-cmp-header">
          <div class="comp-cmp-name">${escComp(weapon.name)}</div>
          <div class="comp-cmp-sub">S${weapon.size} · ${escComp(weapon.type)}</div>
          <div class="comp-cmp-badges">
            <span class="comp-badge" style="background:${typeColor}20;border-color:${typeColor}60;color:#1a0f00">${escComp(weapon.type)}</span>
          </div>
        </div>
        <div class="comp-cmp-stats">
          ${rows}
        </div>
        <button class="comp-cmp-remove"
          onclick="Comp.toggleSelect('weapon','${escComp(weapon.name).replace(/'/g,"\\'")}')">
          ✕ Quitar
        </button>
      </div>
    `;
  }

  function buildStatRow(value, max, label, unit, higher) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    // Bar color: top value gets amber, rest scale toward dim
    const barColor = pct >= 100
      ? 'var(--accent)'
      : pct >= 66
        ? 'var(--accent-dim)'
        : 'rgba(180,83,9,0.4)';

    const displayVal = value > 0
      ? `${fmtNum(value)}${unit ? ' <span class="comp-stat-unit">' + escComp(unit) + '</span>' : ''}`
      : '—';

    return `
      <div class="comp-stat-row">
        <div class="comp-stat-row-label">${escComp(label)}</div>
        <div class="comp-stat-row-bar-wrap">
          <div class="comp-stat-row-bar" style="width:${pct}%;background:${barColor}"></div>
        </div>
        <div class="comp-stat-row-val">${displayVal}</div>
      </div>
    `;
  }

  // ============================================================
  // COLOR HELPERS
  // ============================================================

  const MFR_COLOR = {
    'Aegis':                 '#4a9eff',
    'Anvil':                 '#22c55e',
    'Aopoa':                 '#8b5cf6',
    'Banu':                  '#d97706',
    'Consolidated Outland':  '#ef4444',
    'Crusader':              '#f59e0b',
    'Drake':                 '#dc2626',
    'Esperia':               '#8b5cf6',
    'Gatac':                 '#22c55e',
    'Greycat':               '#78716c',
    'Kruger':                '#60a5fa',
    'MISC':                  '#10b981',
    'Mirai':                 '#a855f7',
    'NDC':                   '#6b7280',
    'Origin':                '#e2e8f0',
    'RSI':                   '#3b82f6',
    'Tumbril':               '#92400e',
    'Willsop':               '#6b7280'
  };

  function getRoleColor(role) {
    const r = (role || '').toLowerCase();
    if (r.includes('fighter') || r.includes('combat') || r.includes('bomber') || r.includes('gunship')) return '#ef4444';
    if (r.includes('freight') || r.includes('transport') || r.includes('cargo'))  return '#f59e0b';
    if (r.includes('explor') || r.includes('pathfind') || r.includes('expedition')) return '#10b981';
    if (r.includes('mining') || r.includes('salvage')) return '#8b5cf6';
    if (r.includes('medical') || r.includes('rescue'))  return '#06b6d4';
    if (r.includes('racing'))  return '#f97316';
    if (r.includes('touring') || r.includes('starter')) return '#a78bfa';
    if (r.includes('stealth')) return '#6366f1';
    return '#a88b4a';
  }

  function getWeaponTypeColor(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('laser repeater'))  return '#f59e0b';
    if (t.includes('laser cannon'))    return '#fbbf24';
    if (t.includes('ballistic gatling')) return '#ef4444';
    if (t.includes('ballistic cannon')) return '#dc2626';
    if (t.includes('mass driver'))     return '#8b5cf6';
    if (t.includes('distortion'))      return '#06b6d4';
    return '#a88b4a';
  }

  // ============================================================
  // EVENT LISTENERS (attached after render)
  // ============================================================

  function attachEventListeners() {
    // Ships search
    const shipSearch = document.getElementById('compSearchShips');
    if (shipSearch) {
      shipSearch.addEventListener('input', e => {
        compState.searchShips = e.target.value;
        render();
      });
    }

    // Ships role filter
    const roleFilter = document.getElementById('compRoleFilter');
    if (roleFilter) {
      roleFilter.addEventListener('change', e => {
        compState.filterRole = e.target.value;
        render();
      });
    }

    // Ships mfr filter
    const mfrFilter = document.getElementById('compMfrFilter');
    if (mfrFilter) {
      mfrFilter.addEventListener('change', e => {
        compState.filterMfr = e.target.value;
        render();
      });
    }

    // Weapons search
    const weapSearch = document.getElementById('compSearchWeapons');
    if (weapSearch) {
      weapSearch.addEventListener('input', e => {
        compState.searchWeapons = e.target.value;
        render();
      });
    }

    // Weapons type filter
    const typeFilter = document.getElementById('compTypeFilter');
    if (typeFilter) {
      typeFilter.addEventListener('change', e => {
        compState.filterType = e.target.value;
        render();
      });
    }
  }

  // ============================================================
  // CSS INJECTION
  // ============================================================

  function injectStyles() {
    if (document.getElementById('comp-styles')) return;
    const style = document.createElement('style');
    style.id = 'comp-styles';
    style.textContent = `
      /* ===== COMPARATOR TABS ===== */
      .comp-tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
        border-bottom: 1px solid var(--border);
        padding-bottom: 0;
        align-items: center;
        flex-wrap: wrap;
      }
      .comp-tab-btn {
        font-family: var(--font-hud);
        font-size: 1rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--text-secondary);
        padding: 0.7rem 1.4rem;
        border-bottom: 2px solid transparent;
        border-radius: 0;
        transition: all var(--transition);
        position: relative;
      }
      .comp-tab-btn:hover {
        color: var(--text-primary);
        background: rgba(180,83,9,0.1);
      }
      .comp-tab-btn.active {
        color: var(--accent);
        border-bottom-color: var(--accent);
        background: rgba(245,158,11,0.06);
      }
      .comp-sel-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.2rem;
        height: 1.2rem;
        border-radius: 50%;
        background: var(--accent);
        color: #0c0a09;
        font-size: 0.6rem;
        font-weight: 900;
        margin-left: 0.4rem;
        line-height: 1;
        font-family: var(--font-mono);
      }
      .comp-clear-btn {
        margin-left: auto;
        font-family: var(--font-hud);
        font-size: 0.62rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--text-muted);
        border: 1px solid var(--border);
        border-radius: 3px;
        padding: 0.4rem 0.8rem;
        transition: all var(--transition);
      }
      .comp-clear-btn:hover {
        color: var(--red);
        border-color: rgba(239,68,68,0.4);
        background: rgba(239,68,68,0.08);
      }

      /* ===== SELECTION BAR ===== */
      .comp-selection-bar {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 1rem;
        padding: 0.6rem 0.75rem;
        background: rgba(18,15,8,0.7);
        border: 1px solid rgba(180,83,9,0.2);
        border-radius: 4px;
        border-left: 3px solid var(--accent-dim);
      }
      .comp-chip {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        background: rgba(245,158,11,0.08);
        border: 1px solid rgba(245,158,11,0.3);
        border-radius: 3px;
        padding: 0.25rem 0.4rem 0.25rem 0.6rem;
        font-size: 0.82rem;
        font-family: var(--font-body);
      }
      .comp-chip-type {
        font-family: var(--font-mono);
        font-size: 0.6rem;
        color: var(--accent-dim);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        border-right: 1px solid rgba(180,83,9,0.3);
        padding-right: 0.4rem;
      }
      .comp-chip-name { color: var(--text-primary); }
      .comp-chip-remove {
        color: var(--text-muted);
        font-size: 0.7rem;
        padding: 0.1rem 0.2rem;
        line-height: 1;
        transition: color var(--transition);
        border-radius: 2px;
      }
      .comp-chip-remove:hover { color: var(--red); background: rgba(239,68,68,0.1); }

      /* ===== RESULTS BAR ===== */
      .comp-results-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
        padding: 0 0.1rem;
      }
      .comp-count {
        font-family: var(--font-mono);
        font-size: 1rem;
        color: var(--accent);
        letter-spacing: 0.06em;
      }
      .comp-hint {
        font-size: 0.96rem;
        color: var(--text-muted);
        font-style: italic;
      }

      /* ===== CARD GRID ===== */
      .comp-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
      }

      /* ===== COMP CARD ===== */
      .comp-card {
        cursor: pointer;
        position: relative;
        padding: 1rem 1rem 0.85rem;
        border-left: 3px solid transparent;
        transition: all var(--transition);
        user-select: none;
      }
      .comp-card:hover {
        border-left-color: var(--accent-dim);
      }
      .comp-card.comp-selected {
        border-left-color: var(--accent) !important;
        background: rgba(245,158,11,0.06) !important;
        box-shadow: 0 0 20px rgba(245,158,11,0.12) !important;
      }
      .comp-selected-mark {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        width: 1.25rem;
        height: 1.25rem;
        border-radius: 50%;
        background: var(--accent);
        color: #0c0a09;
        font-size: 0.72rem;
        font-weight: 900;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
      }

      .comp-card-header { margin-bottom: 0.6rem; }
      .comp-ship-name {
        font-family: var(--font-hud);
        font-size: 1.2rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--text-primary);
        line-height: 1.2;
        margin-bottom: 0.2rem;
      }
      .comp-mfr {
        font-family: var(--font-mono);
        font-size: 0.92rem;
        color: var(--text-muted);
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      .comp-weapon-size {
        font-size: 0.72rem;
        color: var(--accent-dim);
        letter-spacing: 0.02em;
        font-family: var(--font-mono);
        text-transform: none;
      }
      .comp-weapon-note {
        font-size: 0.72rem;
        color: var(--stanton);
        font-family: var(--font-mono);
        margin-bottom: 0.4rem;
        letter-spacing: 0.04em;
      }

      /* ===== SHIP IMAGE BANNERS ===== */
      .comp-ship-banner {
        height: 100px;
        margin: -1rem -1rem 0.8rem;
        overflow: hidden;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        border-bottom: 1px solid var(--border);
        background: rgba(0,0,0,0.35);
        flex-shrink: 0;
      }
      .comp-ship-banner img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center 40%;
        display: block;
        transition: transform 0.4s ease;
      }
      .comp-card:hover .comp-ship-banner img { transform: scale(1.05); }
      .comp-cmp-banner {
        height: 140px;
        overflow: hidden;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        border-bottom: 1px solid var(--border);
        background: rgba(0,0,0,0.35);
        flex-shrink: 0;
      }
      .comp-cmp-banner img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center 40%;
        display: block;
      }
      .comp-banner-mfr {
        font-family: var(--font-hud);
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.28em;
        text-transform: uppercase;
        opacity: 0.35;
      }

      /* ===== BADGES ===== */
      .comp-badges {
        display: flex;
        gap: 0.35rem;
        flex-wrap: wrap;
        margin-bottom: 0.75rem;
      }
      .comp-badge {
        font-family: var(--font-mono);
        font-size: 0.84rem;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        border: 1px solid;
        border-radius: 2px;
        padding: 0.18rem 0.55rem;
        white-space: nowrap;
      }

      /* ===== STAT ROW IN CARDS ===== */
      .comp-stats-row {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.4rem 0.6rem;
      }
      .comp-stat {
        display: flex;
        flex-direction: column;
        gap: 0.05rem;
      }
      .comp-stat-label {
        font-family: var(--font-mono);
        font-size: 0.84rem;
        color: var(--text-muted);
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .comp-stat-val {
        font-family: var(--font-mono);
        font-size: 1.08rem;
        color: var(--text-primary);
        font-weight: 600;
      }
      .comp-stat-unit {
        font-size: 0.8rem;
        color: var(--text-muted);
      }

      /* ===== EMPTY STATE ===== */
      .comp-empty {
        grid-column: 1 / -1;
        text-align: center;
        padding: 3rem 1rem;
        color: var(--text-secondary);
      }
      .comp-empty-compare {
        padding: 4rem 1rem;
      }
      .comp-empty-icon {
        font-size: 2.5rem;
        color: var(--text-muted);
        margin-bottom: 1rem;
        opacity: 0.5;
      }
      .comp-empty-title {
        font-family: var(--font-hud);
        font-size: 1rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--text-secondary);
        margin-bottom: 0.5rem;
      }
      .comp-empty-sub {
        font-size: 0.9rem;
        color: var(--text-muted);
        margin-bottom: 1.5rem;
      }
      .comp-empty-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
      }

      /* ===== COMPARE AREA ===== */
      .comp-compare-area {
        display: grid;
        grid-template-columns: repeat(var(--comp-cols, 2), 1fr);
        gap: 1rem;
        margin-bottom: 2rem;
        align-items: start;
      }
      @media (max-width: 900px) {
        .comp-compare-area { grid-template-columns: repeat(2, 1fr); }
      }
      @media (max-width: 560px) {
        .comp-compare-area { grid-template-columns: 1fr; }
      }

      .comp-compare-card {
        background: var(--bg-glass);
        border: 1px solid var(--border);
        border-radius: 4px;
        overflow: hidden;
        backdrop-filter: blur(8px);
        display: flex;
        flex-direction: column;
      }

      .comp-cmp-header {
        padding: 1rem 1rem 0.75rem;
        border-bottom: 1px solid var(--border);
        background: rgba(18,15,8,0.6);
      }
      .comp-cmp-name {
        font-family: var(--font-hud);
        font-size: 1.25rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--text-primary);
        margin-bottom: 0.2rem;
      }
      .comp-cmp-sub {
        font-family: var(--font-mono);
        font-size: 0.92rem;
        color: var(--text-muted);
        letter-spacing: 0.05em;
        text-transform: uppercase;
        margin-bottom: 0.5rem;
      }
      .comp-cmp-badges { display: flex; gap: 0.35rem; flex-wrap: wrap; }

      /* ===== STAT ROWS WITH BARS ===== */
      .comp-cmp-stats { padding: 0.75rem 1rem; flex: 1; }
      .comp-stat-row {
        display: grid;
        grid-template-columns: 7rem 1fr 4.5rem;
        gap: 0.5rem;
        align-items: center;
        padding: 0.3rem 0;
        border-bottom: 1px solid rgba(180,83,9,0.08);
      }
      .comp-stat-row:last-child { border-bottom: none; }
      .comp-stat-row-label {
        font-family: var(--font-mono);
        font-size: 0.92rem;
        color: var(--text-muted);
        letter-spacing: 0.05em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .comp-stat-row-bar-wrap {
        height: 4px;
        background: rgba(180,83,9,0.12);
        border-radius: 2px;
        overflow: hidden;
      }
      .comp-stat-row-bar {
        height: 100%;
        border-radius: 2px;
        transition: width 0.4s ease;
        min-width: 2px;
      }
      .comp-stat-row-val {
        font-family: var(--font-mono);
        font-size: 1rem;
        color: var(--text-primary);
        text-align: right;
        white-space: nowrap;
      }

      .comp-cmp-remove {
        display: block;
        width: 100%;
        padding: 0.5rem;
        font-family: var(--font-hud);
        font-size: 0.58rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--text-muted);
        border-top: 1px solid var(--border);
        transition: all var(--transition);
        text-align: center;
      }
      .comp-cmp-remove:hover {
        color: var(--red);
        background: rgba(239,68,68,0.08);
      }

      /* ===== PAGE SUBTITLE ===== */
      .page-subtitle {
        font-family: var(--font-mono);
        font-size: 0.7rem;
        color: var(--text-muted);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin-top: 0.3rem;
      }

      /* ===== BUTTONS (reuse existing but ensure available) ===== */
      .btn-primary {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--accent);
        color: #0c0a09;
        font-family: var(--font-hud);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        padding: 0.75rem 1.5rem;
        border-radius: 3px;
        transition: all var(--transition);
        cursor: pointer;
      }
      .btn-primary:hover {
        background: var(--accent-light);
        box-shadow: 0 0 20px rgba(245,158,11,0.3);
      }

      /* ===== RESPONSIVE ===== */
      @media (max-width: 640px) {
        .comp-grid { grid-template-columns: 1fr; }
        .comp-stats-row { grid-template-columns: repeat(2, 1fr); }
        .comp-stat-row { grid-template-columns: 6rem 1fr 3.5rem; }
        .comp-tabs { gap: 0.25rem; }
        .comp-tab-btn { padding: 0.5rem 0.75rem; font-size: 0.65rem; }
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================================
  // PUBLIC INIT
  // ============================================================

  function init() {
    injectStyles();
    render();
    if (!compState._imagesLoaded) {
      compState._imagesLoaded = true;
      fetch('data/ship_images.json')
        .then(r => r.ok ? r.json() : {})
        .then(imgs => { compState.shipImages = imgs; render(); })
        .catch(() => {});
    }
  }

  // ============================================================
  // NAMESPACE EXPORT
  // ============================================================

  global.Comp = {
    init,
    switchTab,
    toggleSelect,
    clearSelection,
    destroy: destroyFloatingBtn,
    // Internal helpers exposed for inline onclick handlers
    _clearSearchShips: function () {
      compState.searchShips = '';
      render();
    },
    _clearSearchWeapons: function () {
      compState.searchWeapons = '';
      render();
    }
  };

}(window));
