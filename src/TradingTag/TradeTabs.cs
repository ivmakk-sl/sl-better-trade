using System;
using System.Collections.Generic;
using GameCore.HotUpdate;
using GameCore.HotUpdate.Battle.Logic;
using HarmonyLib;

namespace BetterTrade
{
    // Adds a container tab to the trade window for each trade storage: a home storage with the trading tag that the
    // game does not already list. CollectTradeContainers lists the fridges, the tool cabinets, and the docked drone
    // hub of the home (AgentManager.GetFurnituresWithBag(home, true, true, false), without the storages of
    // IsExcludedFromCostPool), sorted by owner id. Both of its callers use the result: the tabs of each mode
    // (OnTradeContainerTabsRequest) and the source items of Deliver Supplies and Deliver Request
    // (AidPlatformManager.CollectDispatchOwners). So a trade storage appended here is a tab and a source in each mode.
    [HarmonyPatch(typeof(ItemManager), nameof(ItemManager.CollectTradeContainers))]
    internal static class TradeTabs
    {
        private static bool warned;

        private static void Postfix(Il2CppSystem.Collections.Generic.List<TradeContainerInfo> __result)
        {
            if (__result == null || TagRow.Disabled) return;
            try
            {
                var agents = BaseSingleton<BattleLogicWorld>.Instance?._AgentManager;
                if (agents == null) return;

                var gameOwners = new List<long>(__result.Count);
                for (var i = 0; i < __result.Count; i++) gameOwners.Add(__result[i].OwnerId);

                var tagged = new List<TradingTagLogic.Storage>();
                var storages = agents.GetFurnituresWithBag(agents.GetHomeMapId(), true, true, false);
                for (var i = 0; storages != null && i < storages.Count; i++)
                {
                    var f = storages[i];
                    if (f == null || ItemManager.IsExcludedFromCostPool(f.InstanceId)) continue;
                    var tags = AgentTools.GetAgentComponent<FurnitureTagComponent>(f)?.TagIds;
                    if (tags == null) continue;
                    var ids = new List<int>(tags.Count);
                    for (var j = 0; j < tags.Count; j++) ids.Add(tags[j]);
                    if (TradingTagLogic.LinksToTrading(ids))
                        tagged.Add(new TradingTagLogic.Storage(f.InstanceId, f.AgentConfigId));
                }
                if (tagged.Count == 0) return;

                foreach (var tab in TradingTagLogic.ExtraTabs(gameOwners, tagged))
                {
                    __result.Add(new TradeContainerInfo { OwnerId = tab.OwnerId, FurnitureConfigId = tab.ConfigId, IsFridge = false, Pinned = false });
                    if (Plugin.Verbose.Value)
                    {
                        var name = ConfigManager.Instance?.Get_Config_Furniture(tab.ConfigId)?.Name;
                        Plugin.Log.LogDebug($"trade tab added {tab.OwnerId} {(name == null ? tab.ConfigId.ToString() : ConfigManager.Instance.GetLocalTxt(name))} after {gameOwners.Count} game tabs");
                    }
                }
            }
            catch (Exception e)
            {
                if (warned) return;
                warned = true;
                Plugin.Log.LogWarning($"Better Trade: the trade storage tabs could not be added, the trade window shows only the game's tabs: {e.Message}");
            }
        }
    }
}
