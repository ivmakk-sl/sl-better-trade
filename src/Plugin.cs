using System;
using System.Collections.Generic;
using BepInEx;
using BepInEx.Configuration;
using BepInEx.Logging;
using BepInEx.Unity.IL2CPP;
using HarmonyLib;

namespace BetterTrade
{
    [BepInPlugin(PluginGuid, "Better Trade", "1.0.1")]
    [BepInProcess("SurvivalLog.exe")]
    public sealed class Plugin : BasePlugin
    {
        public const string PluginGuid = "com.ivmakk.survivallog.bettertrade";

        internal static new ManualLogSource Log;
        internal static Harmony Harmony;
        internal static ConfigEntry<bool> Verbose;
        internal static ConfigEntry<bool> TradeStorages;
        internal static ConfigEntry<bool> DeliveryRequestList;
        internal static ConfigEntry<bool> DeliveryRequestRewards;

        public override void Load()
        {
            Log = base.Log;
            Verbose = Config.Bind(
                "General", "Verbose", false,
                "Log the trade numbers and the page-script detail at Debug level. Keep off in normal play.");
            TradeStorages = Config.Bind(
                "Features", "TradeStorages", true,
                "The Trading tag, and the storages with the Trading tag as tabs of the trade window. Off works like an uninstall of this part: the game drops the Trading tag from each storage on the next save, a storage with only the Trading tag keeps an empty rule, and turning it on again does not bring the tag back. Needs a game restart.");
            DeliveryRequestList = Config.Bind(
                "Features", "DeliveryRequestList", true,
                "The request demand bars in the delivery request list of Deliver Request, with the item icons, the item tooltip on a hover, and the item window on a click of an item bar. Off shows the game's request demands; the numbers of the cells stay. Needs a game restart.");
            DeliveryRequestRewards = Config.Bind(
                "Features", "DeliveryRequestRewards", true,
                "The delivery request rewards in the delivery request list of Deliver Request. Off shows no reward, so the rewards are not known in advance. Needs a game restart.");
            SlShared.ModTags.ModTagIcon.Setup(TradingTagLogic.IconKey, typeof(Plugin).Assembly, "BetterTrade.trade-tag.alpha",
                text => Log.LogWarning("Better Trade: " + text), text => { if (Verbose.Value) Log.LogDebug(text); });
            Harmony = new Harmony(PluginGuid);
            var patches = new List<Type>
            {
                typeof(ValuesOnRefresh),
                typeof(PageTick),
                typeof(PageTickOnCallShowAction),
                typeof(WebOnHandleMessageEmitted),
            };
            if (TradeStorages.Value)
            {
                patches.Add(typeof(TagRow));
                patches.Add(typeof(TagMatchOnEvaluate));
                patches.Add(typeof(TagMatchOnTryGetMatchRank));
                patches.Add(typeof(TagMatchOnTryGetPutRank));
                patches.Add(typeof(TradeTabs));
                patches.Add(typeof(PageTickOnStorageShow));
                patches.Add(typeof(SlShared.ModTags.ModTagIconLoad));
                patches.Add(typeof(SlShared.ModTags.ModTagIconPreload));
            }
            // Each patch target is attached on its own, so a target missing after a game update turns
            // off only its own feature.
            foreach (var type in patches)
            {
                try { Harmony.CreateClassProcessor(type).Patch(); }
                catch (Exception e) { Log.LogWarning($"patch {type.Name} failed, its target method is missing: {e.Message}"); }
            }

            Log.LogInfo("Better Trade loaded.");
        }
    }
}
