using System;
using GameCore.HotUpdate.ReduxUI;
using HarmonyLib;

namespace BetterTrade
{
    // Reducer_Web_TradeUI.Refresh rebuilds the trade window after each change (an open, a drag, a pick, a tab switch, a
    // target, Auto Organize). It has direct callers only, so this Postfix runs after each. It only sets the push
    // request; the next frame tick reads the state once (PageTick, StateReader).
    [HarmonyPatch(typeof(Reducer_Web_TradeUI), "Refresh")]
    internal static class ValuesOnRefresh
    {
        private static void Postfix(State_Web_TradeUI state)
        {
            try
            {
                if (state == null || state.OwnerId == 0) return;
                PageTick.Request();
            }
            catch (Exception e)
            {
                Plugin.Log.LogError($"Better Trade refresh failed: {e}");
            }
        }
    }
}
